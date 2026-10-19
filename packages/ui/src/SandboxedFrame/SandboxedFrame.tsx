import { useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '../Button/index.js';
import { Callout } from '../Callout/index.js';
import {
  checkFrameSandbox,
  externalUrl,
  FRAME_MESSAGE,
  frameFragment,
  frameOriginMatches,
  frameThemeMessage,
  httpOrigin,
  isFocusExit,
  isFrameNonce,
  negotiateBridge,
  portTargetOrigin,
  readFrameHello,
  readOpenLink,
  type FrameBridgeRange,
  type FrameHello,
  type FrameOriginMode,
  type FramePortMessage,
  type FrameTheme,
} from '../FrameProtocol/index.js';
import { Skeleton } from '../Skeleton/index.js';
import { cx } from '../utils/cx.js';

/**
 * Where the frame is in its life.
 *
 * `loading` until the document has said hello, `ready` once it holds a port,
 * and four ends, each torn down rather than left showing a document nobody
 * vouched for: `failed` (it never said hello), `navigated` (a document that did
 * not say hello replaced one that had), `refused` (the policy it arrived with
 * is not one this host embeds) and `outdated` (it speaks no bridge version
 * this host does).
 */
export type SandboxedFrameState = 'loading' | 'ready' | 'failed' | 'navigated' | 'refused' | 'outdated';

/**
 * Something the host turned away, reported so the page around the frame can
 * record it. None of these is shown to the reader as more than the frame's
 * own state: they are evidence for whoever reads the logs.
 */
export type FrameRefusal =
  /** The engine's sandbox attribute carried tokens this host never sets. */
  | { kind: 'sandbox'; tokens: string[] }
  /** The frame URL is not http or https, or is not served from the origin it was given. */
  | { kind: 'src' }
  /** The nonce handed to the frame is not the shape the engine mints. */
  | { kind: 'nonce' }
  /** The embedded window said hello from the wrong origin. */
  | { kind: 'origin'; origin: string }
  /** The embedded window said hello with a nonce that is not this frame's. */
  | { kind: 'hello-nonce' }
  /** A second hello without a document load between, or any second hello on the shared host. */
  | { kind: 'rehello' }
  /** The runtime speaks no bridge version this host does. */
  | { kind: 'bridge'; offered: FrameBridgeRange }
  /** The page asked to open something that is not an external http, https or mailto link. */
  | { kind: 'link'; url: string };

export interface SandboxedFrameLabels {
  /** The loading line, said once to a screen reader and drawn under the placeholder. */
  loading: (title: string) => string;
  failed: string;
  failedDetail: string;
  navigated: string;
  navigatedDetail: string;
  refused: string;
  refusedDetail: string;
  outdated: string;
  outdatedDetail: string;
  reload: string;
}

const LABELS: SandboxedFrameLabels = {
  loading: (title) => `Loading ${title}`,
  failed: 'This page failed to load',
  failedDetail: 'It did not finish starting. Reload it, and if it fails again, ask its owner to republish it.',
  navigated: 'This page left its frame, so it was closed',
  navigatedDetail: 'An artifact may only show its own pages. Reload it to open it again.',
  refused: 'This page cannot be shown safely',
  refusedDetail: 'It arrived with a frame policy this dashboard does not accept.',
  outdated: 'This page needs a newer dashboard',
  outdatedDetail: 'Reload the dashboard to update it, then open the page again.',
  reload: 'Reload',
};

/** How long a document has to say hello after the frame mounts, or after a load, before it is torn down. */
export const FRAME_HELLO_TIMEOUT_MS = 10_000;

type FrameDivAttributes = Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onMessage' | 'children' | 'role' | 'aria-label'>;

export interface SandboxedFrameProps extends FrameDivAttributes {
  /** The engine's ticketed frame URL (`Frame.frame_url`). The host appends the fragment. */
  src: string;
  /**
   * The origin the document is served from (`Frame.origin`). Per artifact, the
   * hello must come from exactly this origin. On the shared host the document
   * is opaque, its hello comes from `"null"`, and this may be that host's
   * origin or `"null"` itself.
   */
  origin: string;
  /** How the engine isolated the artifact (`Frame.mode`). */
  mode: FrameOriginMode;
  /** The engine's sandbox attribute (`Frame.sandbox`), set verbatim once it passes the host's own check. */
  sandbox: string;
  /** The engine's permissions attribute (`Frame.allow`), set verbatim. */
  allow?: string | undefined;
  /** The artifact's title. It names the frame, and the region around it, to assistive technology. */
  title: string;
  /**
   * The reader's appearance. The value at mount goes in the fragment, so the
   * first paint is already right; later values are posted on the port.
   */
  theme: FrameTheme;
  /** The handshake nonce minted with the ticket (`Frame.nonce`). */
  nonce: string;
  /** The document said hello and holds its port. Called again for each document that does. */
  onReady?: ((port: MessagePort, hello: FrameHello) => void) | undefined;
  /** Every port message the frame does not handle itself. UNTRUSTED input: decide every call. */
  onMessage?: ((data: unknown, port: MessagePort) => void) | undefined;
  /**
   * The page asked to open an external link. The frame never opens a window
   * itself: the page around it shows the destination first (`LinkInterstitial`).
   */
  onOpenLink?: ((url: URL) => void) | undefined;
  /**
   * The page asked to give focus back, which is how a reader leaves a page
   * that traps Tab. Without a handler, focus moves to the frame's region.
   */
  onFocusExit?: (() => void) | undefined;
  onStateChange?: ((state: SandboxedFrameState) => void) | undefined;
  onRefusal?: ((refusal: FrameRefusal) => void) | undefined;
  /** Offered on every end state as the Reload action. Mint a fresh frame, then re-render with it. */
  onReload?: (() => void) | undefined;
  helloTimeoutMs?: number | undefined;
  labels?: Partial<SandboxedFrameLabels> | undefined;
}

type FramePolicy =
  | { ok: true; url: string; sandbox: string; origin: string }
  | { ok: false; refusal: FrameRefusal };

/** Decides, before anything is mounted, whether this frame may be embedded at all, and with what. */
function framePolicy(src: string, origin: string, mode: FrameOriginMode, sandbox: string, nonce: string, theme: FrameTheme): FramePolicy {
  const verdict = checkFrameSandbox(sandbox, mode);
  if (!verdict.ok) return { ok: false, refusal: { kind: 'sandbox', tokens: verdict.refused } };
  const served = httpOrigin(src);
  if (served === null) return { ok: false, refusal: { kind: 'src' } };
  const named = mode === 'per_artifact' ? origin === served : origin === served || origin === 'null';
  if (!named) return { ok: false, refusal: { kind: 'src' } };
  if (!isFrameNonce(nonce)) return { ok: false, refusal: { kind: 'nonce' } };
  const url = new URL(src);
  url.hash = frameFragment(nonce, theme);
  return { ok: true, url: url.href, sandbox: verdict.value, origin: served };
}

/**
 * An artifact's document, embedded in a sandboxed frame and spoken to over one
 * transferred `MessagePort`.
 *
 * THE HANDSHAKE IS THE WHOLE SECURITY OF THE BRIDGE. A hello is accepted only
 * from this iframe's own window, carrying the nonce minted with its ticket,
 * and, per artifact, from the artifact's own origin. Only then is a fresh
 * port transferred, in the same task, to the window that was checked. Every
 * later call travels on that port, which no other window can address, and a
 * document that navigates away loses it.
 *
 * A DOCUMENT THAT DOES NOT ANNOUNCE ITSELF IS TORN DOWN. The engine's runtime
 * says hello on every load, so a load with no hello means the frame now holds
 * a document the engine did not serve, and the frame is removed rather than
 * left on screen. On the shared host, where origins are opaque, a document
 * gets one handshake per ticket; a second document needs a fresh ticket.
 *
 * The frame never opens a window: an external link reaches `onOpenLink`, and
 * the page around the frame decides.
 *
 * A new `src` or `nonce` is a new frame: everything is torn down and started
 * again, as if the component had been remounted.
 */
export function SandboxedFrame(props: SandboxedFrameProps) {
  const { src, nonce, origin, mode, sandbox } = props;
  return <FrameInstance key={[src, nonce, origin, mode, sandbox].join('\n')} {...props} />;
}

function FrameInstance(props: SandboxedFrameProps) {
  const {
    src,
    origin,
    mode,
    sandbox,
    allow,
    title,
    theme,
    nonce,
    onReady: _onReady,
    onMessage: _onMessage,
    onOpenLink: _onOpenLink,
    onFocusExit: _onFocusExit,
    onStateChange: _onStateChange,
    onRefusal: _onRefusal,
    onReload,
    helloTimeoutMs = FRAME_HELLO_TIMEOUT_MS,
    labels,
    className,
    ...rest
  } = props;
  const text = { ...LABELS, ...labels };

  // The fragment carries the appearance at mount; later changes ride the port.
  const [initialTheme] = useState(theme);
  const policy = useMemo(
    () => framePolicy(src, origin, mode, sandbox, nonce, initialTheme),
    [src, origin, mode, sandbox, nonce, initialTheme],
  );
  const [state, setState] = useState<SandboxedFrameState>(policy.ok ? 'loading' : 'refused');

  // Read through a ref, so the listeners are registered once per frame rather
  // than once per render of whatever holds it.
  const latest = useRef(props);
  latest.current = props;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const portRef = useRef<MessagePort | null>(null);

  useEffect(() => {
    if (!policy.ok) latest.current.onRefusal?.(policy.refusal);
  }, [policy]);

  useEffect(() => {
    latest.current.onStateChange?.(state);
  }, [state]);

  useEffect(() => {
    if (!policy.ok) return undefined;
    const frame = frameRef.current;
    if (!frame) return undefined;

    let ended = false;
    let greeted = 0;
    // A hello whose document's load has not been seen yet: it may arrive first.
    let credit = false;
    // A load whose document has not said hello yet.
    let owed = false;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;

    const refuse = (refusal: FrameRefusal) => latest.current.onRefusal?.(refusal);
    const closePort = () => {
      portRef.current?.close();
      portRef.current = null;
    };
    const end = (next: 'failed' | 'navigated' | 'outdated') => {
      ended = true;
      clearTimeout(mountTimer);
      clearTimeout(loadTimer);
      closePort();
      setState(next);
    };

    const onPortMessage = (port: MessagePort, event: MessageEvent) => {
      if (ended || portRef.current !== port) return;
      const data: unknown = event.data;
      const raw = readOpenLink(data);
      if (raw !== null) {
        const url = externalUrl(raw);
        if (url) latest.current.onOpenLink?.(url);
        else refuse({ kind: 'link', url: raw });
        return;
      }
      if (isFocusExit(data)) {
        const exit = latest.current.onFocusExit;
        if (exit) exit();
        else regionRef.current?.focus();
        return;
      }
      latest.current.onMessage?.(data, port);
    };

    const onWindowMessage = (event: MessageEvent) => {
      // Not this frame's window: some other frame or extension, and none of
      // this frame's business, so it is not even reported.
      if (ended || event.source === null || event.source !== frame.contentWindow) return;
      const hello = readFrameHello(event.data);
      if (!hello) return;
      if (!frameOriginMatches(mode, policy.origin, event.origin)) {
        refuse({ kind: 'origin', origin: event.origin });
        return;
      }
      if (hello.nonce !== nonce) {
        refuse({ kind: 'hello-nonce' });
        return;
      }
      if (greeted > 0 && (mode === 'shared' || credit)) {
        refuse({ kind: 'rehello' });
        if (mode === 'shared') end('navigated');
        return;
      }
      const bridge = negotiateBridge(hello.bridge);
      if (bridge === null) {
        refuse({ kind: 'bridge', offered: hello.bridge });
        end('outdated');
        return;
      }

      const channel = new MessageChannel();
      const message: FramePortMessage = { type: FRAME_MESSAGE.port, bridge };
      // Posted to the window that was just checked, in this same task.
      (event.source as Window).postMessage(message, {
        targetOrigin: portTargetOrigin(mode, policy.origin),
        transfer: [channel.port2],
      });
      closePort();
      const port = channel.port1;
      portRef.current = port;
      port.onmessage = (portEvent) => onPortMessage(port, portEvent);
      port.postMessage(frameThemeMessage(latest.current.theme));

      greeted += 1;
      clearTimeout(mountTimer);
      if (owed) {
        owed = false;
        clearTimeout(loadTimer);
      } else {
        credit = true;
      }
      setState('ready');
      latest.current.onReady?.(port, hello);
    };

    const onLoad = () => {
      if (ended) return;
      if (credit) {
        credit = false;
        return;
      }
      owed = true;
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => end(greeted > 0 ? 'navigated' : 'failed'), helloTimeoutMs);
    };

    window.addEventListener('message', onWindowMessage);
    frame.addEventListener('load', onLoad);
    // Read by the handlers above, which only run once the effect has returned.
    const mountTimer = setTimeout(() => {
      if (greeted === 0) end('failed');
    }, helloTimeoutMs);

    return () => {
      ended = true;
      window.removeEventListener('message', onWindowMessage);
      frame.removeEventListener('load', onLoad);
      clearTimeout(mountTimer);
      clearTimeout(loadTimer);
      closePort();
    };
  }, [policy, mode, nonce, helloTimeoutMs]);

  // The appearance follows the reader live, on the port.
  const { mode: themeMode, palette, density } = theme;
  useEffect(() => {
    portRef.current?.postMessage(frameThemeMessage({ mode: themeMode, palette, density }));
  }, [themeMode, palette, density]);

  const live = policy.ok && (state === 'loading' || state === 'ready');
  const ending = END_TEXT[state];
  // `credentialless` is not in React's iframe type; it is a further guarantee
  // where a browser supports it, and an ignored attribute where it does not.
  const credentialless = { credentialless: '' } as Record<string, string>;

  return (
    <div
      {...rest}
      ref={regionRef}
      role="region"
      aria-label={title}
      aria-busy={state === 'loading' || undefined}
      tabIndex={-1}
      data-state={state}
      className={cx('crewlet-sandboxed-frame', className)}
    >
      {live ? (
        <iframe
          ref={frameRef}
          className="crewlet-sandboxed-frame__frame"
          src={policy.url}
          sandbox={policy.sandbox}
          allow={allow ?? ''}
          title={title}
          referrerPolicy="no-referrer"
          {...credentialless}
        />
      ) : null}
      {state === 'loading' ? <FrameLoading label={text.loading(title)} /> : null}
      {ending ? (
        <FrameEnd
          heading={text[ending.title]}
          action={
            onReload ? (
              <Button variant="outline" size="small" onClick={onReload}>
                {text.reload}
              </Button>
            ) : undefined
          }
        >
          {text[ending.detail]}
        </FrameEnd>
      ) : null}
    </div>
  );
}

/** The four end states, each with a title and a detail line among the labels. */
type FrameEnd = 'failed' | 'navigated' | 'refused' | 'outdated';

const END_TEXT: Readonly<Record<SandboxedFrameState, { title: FrameEnd; detail: `${FrameEnd}Detail` } | null>> = {
  loading: null,
  ready: null,
  failed: { title: 'failed', detail: 'failedDetail' },
  navigated: { title: 'navigated', detail: 'navigatedDetail' },
  refused: { title: 'refused', detail: 'refusedDetail' },
  outdated: { title: 'outdated', detail: 'outdatedDetail' },
};

/** The placeholder a frame shows until its document says hello: the box it will fill, inset by the frame's own margin. */
function FrameLoading({ label }: { label: string }) {
  return (
    <div className="crewlet-sandboxed-frame__loading">
      <Skeleton
        variant="box"
        width="100%"
        height="100%"
        marginTop={0}
        borderRadius="var(--radius-md)"
        label={label}
      />
    </div>
  );
}

/** Why a frame shows no document, at the top of the box the document would have filled. */
function FrameEnd({ heading, action, children }: { heading: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="crewlet-sandboxed-frame__end">
      <Callout variant="danger" title={heading} live="polite" action={action}>
        {children}
      </Callout>
    </div>
  );
}

export interface SandboxedFramePlaceholderProps extends FrameDivAttributes {
  /** The artifact's title. It names the region, as the frame that replaces it will. */
  title: string;
  /** The loading line said to a screen reader. `Loading <title>` when absent. */
  label?: string | undefined;
}

/**
 * The frame's loading state, for a host that has no frame to mount yet: the
 * frame's ticket is still being minted, say. It is the very placeholder the
 * frame shows until its document says hello, in the same box, so the reader
 * sees one loading state from the first paint to the document, never a
 * placeholder that jumps when the frame takes over from it.
 */
export function SandboxedFramePlaceholder({ title, label, className, ...rest }: SandboxedFramePlaceholderProps) {
  return (
    <div
      {...rest}
      role="region"
      aria-label={title}
      aria-busy
      data-state="loading"
      className={cx('crewlet-sandboxed-frame', className)}
    >
      <FrameLoading label={label ?? LABELS.loading(title)} />
    </div>
  );
}

export interface SandboxedFrameNoticeProps extends FrameDivAttributes {
  /** The artifact's title. It names the region, as the frame would have. */
  title: string;
  /** What went wrong, as a short heading with no closing full stop. */
  heading: string;
  /** What the reader can do about it. */
  children: ReactNode;
  /** One control at the callout's trailing edge, such as Try again. */
  action?: ReactNode;
}

/**
 * A frame that could not be opened at all, for a host that has no frame to
 * mount: the engine refused its ticket, say. It is drawn exactly as the
 * frame's own end states are, in the same box, so a reader meets one way of
 * saying "this page is not here" whichever side found the problem.
 */
export function SandboxedFrameNotice({ title, heading, action, children, className, ...rest }: SandboxedFrameNoticeProps) {
  return (
    <div {...rest} role="region" aria-label={title} data-state="failed" className={cx('crewlet-sandboxed-frame', className)}>
      <FrameEnd heading={heading} action={action}>
        {children}
      </FrameEnd>
    </div>
  );
}
