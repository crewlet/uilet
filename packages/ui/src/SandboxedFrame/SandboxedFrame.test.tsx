/**
 * The host end of the artifact bridge. The handshake is the whole security of
 * the bridge, so each of its checks is broken here on purpose and the frame is
 * held to refusing.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FRAME_MESSAGE, type FrameTheme } from '../FrameProtocol/index.js';
import {
  SandboxedFrame,
  SandboxedFrameNotice,
  SandboxedFramePlaceholder,
  type FrameRefusal,
  type SandboxedFrameProps,
  type SandboxedFrameState,
} from './index.js';

const ORIGIN = 'https://a1b2c3.artifacts.example.net';
const SRC = `${ORIGIN}/t/ticket-123/index.html`;
const NONCE = 'nonce-0123456789abcdef';
const THEME: FrameTheme = { mode: 'dark', palette: 'dusk', density: 'compact' };
const HELLO = { type: FRAME_MESSAGE.hello, nonce: NONCE, contract: '1.0.0', bridge: { min: 1, max: 1 } };

interface Posted {
  message: unknown;
  options: WindowPostMessageOptions;
}

let posted: Posted[] = [];
let ports: MessagePort[] = [];

beforeEach(() => {
  posted = [];
  ports = [];
  // Only the clock the frame reads: a port delivers on the event loop, which
  // has to keep turning for the port tests to hear anything.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  cleanup();
  for (const port of ports) port.close();
  vi.useRealTimers();
});

function frame(props: Partial<SandboxedFrameProps> = {}) {
  const states: SandboxedFrameState[] = [];
  const refusals: FrameRefusal[] = [];
  const onReady = vi.fn();
  const view = render(
    <div style={{ height: 400 }}>
      <SandboxedFrame
        src={SRC}
        origin={ORIGIN}
        mode="per_artifact"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Vendor scorecard"
        theme={THEME}
        nonce={NONCE}
        onReady={onReady}
        onStateChange={(state) => states.push(state)}
        onRefusal={(refusal) => refusals.push(refusal)}
        {...props}
      />
    </div>,
  );
  const iframe = view.container.querySelector('iframe');
  if (iframe?.contentWindow) {
    // jsdom does not transfer ports across windows; the spy records what the
    // host posted, and keeps the transferred end so the test can speak as the
    // frame on it.
    vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(((message: unknown, options: WindowPostMessageOptions) => {
      posted.push({ message, options });
      for (const transferred of options.transfer ?? []) {
        if (transferred instanceof MessagePort) ports.push(transferred);
      }
    }) as typeof window.postMessage);
  }
  return { ...view, iframe, states, refusals, onReady };
}

/** A message on the host window, as if from `source`. */
function say(data: unknown, source: Window | null, origin = ORIGIN) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });
}

/** Lets the port deliver what was posted on it. */
async function flush() {
  await act(async () => {
    for (let turn = 0; turn < 3; turn += 1) await new Promise((resolve) => setImmediate(resolve));
  });
}

describe('the frame it embeds', () => {
  test('sets the engine policy verbatim, names itself, and keeps the referrer', () => {
    const { iframe } = frame({ allow: 'clipboard-write' });
    expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-forms');
    expect(iframe?.getAttribute('allow')).toBe('clipboard-write');
    expect(iframe?.getAttribute('title')).toBe('Vendor scorecard');
    expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(screen.getByRole('region', { name: 'Vendor scorecard' })).toBeDefined();
  });

  test('carries the nonce and the appearance in the fragment, never the query', () => {
    const { iframe } = frame();
    const url = new URL(iframe?.getAttribute('src') ?? '');
    expect(url.search).toBe('');
    const fragment = new URLSearchParams(url.hash.slice(1));
    expect(Object.fromEntries(fragment)).toEqual({ nonce: NONCE, theme: 'dark', palette: 'dusk', density: 'compact' });
  });

  test('says it is loading until the document says hello', () => {
    frame();
    expect(screen.getByRole('status').textContent).toBe('Loading Vendor scorecard');
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('true');
  });

  test.each([
    ['a popup token', { sandbox: 'allow-scripts allow-popups' }, { kind: 'sandbox', tokens: ['allow-popups'] }],
    ['allow-same-origin on the shared host', { mode: 'shared' as const, sandbox: 'allow-scripts allow-same-origin' }, { kind: 'sandbox', tokens: ['allow-same-origin'] }],
    ['a src on another origin', { src: 'https://elsewhere.example.net/t/x/index.html' }, { kind: 'src' }],
    ['a javascript src', { src: 'javascript:alert(1)' }, { kind: 'src' }],
    ['a malformed nonce', { nonce: 'short' }, { kind: 'nonce' }],
  ])('is never mounted with %s', (_name, props, refusal) => {
    const { iframe, refusals } = frame(props as Partial<SandboxedFrameProps>);
    expect(iframe).toBeNull();
    expect(refusals).toEqual([refusal]);
    expect(screen.getByText('This page cannot be shown safely')).toBeDefined();
  });
});

describe('the handshake', () => {
  test('transfers one port to the verified window, at the artifact origin, and reports ready', () => {
    const { iframe, onReady, states } = frame();
    say(HELLO, iframe?.contentWindow ?? null);
    expect(posted).toHaveLength(1);
    expect(posted[0]?.message).toEqual({ type: FRAME_MESSAGE.port, bridge: 1 });
    expect(posted[0]?.options.targetOrigin).toBe(ORIGIN);
    expect(posted[0]?.options.transfer).toHaveLength(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toBe('ready');
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('ignores a hello from any other window, even one at the right origin with the right nonce', () => {
    const { onReady, refusals, states } = frame();
    // Another frame on the page, which could know the nonce and share the
    // origin (a second copy of the same artifact), but is not THIS frame.
    const other = document.createElement('iframe');
    document.body.append(other);
    const otherPost = vi.spyOn(other.contentWindow as Window, 'postMessage').mockImplementation(() => {});
    say(HELLO, other.contentWindow);
    say(HELLO, window);
    expect(otherPost).not.toHaveBeenCalled();
    expect(posted).toEqual([]);
    expect(onReady).not.toHaveBeenCalled();
    expect(refusals).toEqual([]);
    expect(states).toEqual(['loading']);
    other.remove();
  });

  test('refuses a hello from the frame at the wrong origin', () => {
    const { iframe, onReady, refusals } = frame();
    say(HELLO, iframe?.contentWindow ?? null, 'https://evil.example.net');
    expect(posted).toEqual([]);
    expect(onReady).not.toHaveBeenCalled();
    expect(refusals).toEqual([{ kind: 'origin', origin: 'https://evil.example.net' }]);
  });

  test('refuses a hello carrying another nonce', () => {
    const { iframe, onReady, refusals } = frame();
    say({ ...HELLO, nonce: 'nonce-fedcba9876543210' }, iframe?.contentWindow ?? null);
    expect(posted).toEqual([]);
    expect(onReady).not.toHaveBeenCalled();
    expect(refusals).toEqual([{ kind: 'hello-nonce' }]);
  });

  test('on the shared host, accepts only an opaque origin, and posts to the checked window', () => {
    const { iframe, onReady, refusals } = frame({ mode: 'shared', sandbox: 'allow-scripts allow-forms', origin: 'null' });
    say(HELLO, iframe?.contentWindow ?? null, ORIGIN);
    expect(refusals).toEqual([{ kind: 'origin', origin: ORIGIN }]);
    say(HELLO, iframe?.contentWindow ?? null, 'null');
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(posted[0]?.options.targetOrigin).toBe('*');
  });

  test('on the shared host, a second hello closes the frame: a new document needs a new ticket', () => {
    const { iframe, refusals, states } = frame({ mode: 'shared', sandbox: 'allow-scripts allow-forms' });
    say(HELLO, iframe?.contentWindow ?? null, 'null');
    say(HELLO, iframe?.contentWindow ?? null, 'null');
    expect(refusals).toEqual([{ kind: 'rehello' }]);
    expect(states.at(-1)).toBe('navigated');
    expect(document.querySelector('iframe')).toBeNull();
  });

  test('per artifact, a second hello with no load between is refused rather than handed a second port', () => {
    const { iframe, onReady, refusals } = frame();
    say(HELLO, iframe?.contentWindow ?? null);
    say(HELLO, iframe?.contentWindow ?? null);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(refusals).toEqual([{ kind: 'rehello' }]);
  });

  test('per artifact, a new document of the artifact that says hello gets a fresh port', () => {
    const { iframe, onReady } = frame();
    say(HELLO, iframe?.contentWindow ?? null);
    act(() => void iframe?.dispatchEvent(new Event('load')));
    act(() => void iframe?.dispatchEvent(new Event('load')));
    say(HELLO, iframe?.contentWindow ?? null);
    expect(onReady).toHaveBeenCalledTimes(2);
  });

  test('a runtime that speaks no bridge this host does is told to update', () => {
    const { iframe, states, refusals } = frame();
    say({ ...HELLO, bridge: { min: 7, max: 9 } }, iframe?.contentWindow ?? null);
    expect(refusals).toEqual([{ kind: 'bridge', offered: { min: 7, max: 9 } }]);
    expect(states.at(-1)).toBe('outdated');
    expect(screen.getByText('This page needs a newer dashboard')).toBeDefined();
  });
});

describe('a document that does not announce itself', () => {
  test('never saying hello fails the frame and removes it', () => {
    const { states } = frame({ helloTimeoutMs: 1000 });
    act(() => void vi.advanceTimersByTime(1000));
    expect(states.at(-1)).toBe('failed');
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByText('This page failed to load')).toBeDefined();
  });

  test('a load with no hello after a document that said one tears the frame down as navigated', () => {
    const { iframe, states } = frame({ helloTimeoutMs: 1000 });
    say(HELLO, iframe?.contentWindow ?? null);
    act(() => void iframe?.dispatchEvent(new Event('load')));
    // The hello came before its own load, which is the common order.
    act(() => void vi.advanceTimersByTime(5000));
    expect(states.at(-1)).toBe('ready');
    act(() => void iframe?.dispatchEvent(new Event('load')));
    act(() => void vi.advanceTimersByTime(1000));
    expect(states.at(-1)).toBe('navigated');
    expect(document.querySelector('iframe')).toBeNull();
  });

  test('offers Reload on an end state when the host can mint a new frame', () => {
    const onReload = vi.fn();
    frame({ helloTimeoutMs: 10, onReload });
    act(() => void vi.advanceTimersByTime(10));
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

describe('the port', () => {
  test('sends the theme on connect, and again whenever the reader changes it', async () => {
    const { iframe, rerender } = frame();
    say(HELLO, iframe?.contentWindow ?? null);
    const frameEnd = ports[0];
    const seen: unknown[] = [];
    if (frameEnd) frameEnd.onmessage = (event) => seen.push(event.data);
    await flush();
    expect(seen).toEqual([{ type: FRAME_MESSAGE.theme, ...THEME }]);

    rerender(
      <div style={{ height: 400 }}>
        <SandboxedFrame
          src={SRC}
          origin={ORIGIN}
          mode="per_artifact"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Vendor scorecard"
          theme={{ mode: 'light', palette: 'dusk', density: 'compact' }}
          nonce={NONCE}
        />
      </div>,
    );
    await flush();
    expect(seen.at(-1)).toEqual({ type: FRAME_MESSAGE.theme, mode: 'light', palette: 'dusk', density: 'compact' });
    // A theme change is a message, never a new src: the document is not reloaded.
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('theme=dark');
  });

  test('hands an external link to the host, refuses any other, and never opens a window itself', async () => {
    const onOpenLink = vi.fn();
    const open = vi.spyOn(window, 'open');
    const { iframe, refusals } = frame({ onOpenLink });
    say(HELLO, iframe?.contentWindow ?? null);
    ports[0]?.postMessage({ type: FRAME_MESSAGE.openLink, url: 'https://example.com/report' });
    ports[0]?.postMessage({ type: FRAME_MESSAGE.openLink, url: 'javascript:alert(1)' });
    await flush();
    expect(onOpenLink).toHaveBeenCalledTimes(1);
    expect((onOpenLink.mock.calls[0]?.[0] as URL).href).toBe('https://example.com/report');
    expect(refusals).toEqual([{ kind: 'link', url: 'javascript:alert(1)' }]);
    expect(open).not.toHaveBeenCalled();
  });

  test('hands every other message to the host, with the port to answer on', async () => {
    const onMessage = vi.fn();
    const { iframe } = frame({ onMessage });
    say(HELLO, iframe?.contentWindow ?? null);
    ports[0]?.postMessage({ id: 1, capability: 'db', method: 'list', args: {} });
    await flush();
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0]?.[0]).toEqual({ id: 1, capability: 'db', method: 'list', args: {} });
  });

  test('a focus exit returns focus to the region around the frame', async () => {
    const { iframe } = frame();
    say(HELLO, iframe?.contentWindow ?? null);
    ports[0]?.postMessage({ type: FRAME_MESSAGE.focusExit });
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Vendor scorecard' }));
  });
});

describe('the parts a host draws before it has a frame', () => {
  test('the placeholder is the frame\'s own loading state, in the same box', () => {
    frame();
    const loading = document.querySelector('.crewlet-sandboxed-frame__loading')!.outerHTML;
    cleanup();
    const { container } = render(<SandboxedFramePlaceholder title="Vendor scorecard" />);
    const region = screen.getByRole('region', { name: 'Vendor scorecard' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('data-state')).toBe('loading');
    expect(screen.getByRole('status').textContent).toBe('Loading Vendor scorecard');
    expect(container.querySelector('.crewlet-sandboxed-frame__loading')!.outerHTML).toBe(loading);
  });

  test('the placeholder starts at the frame\'s inset, with no margin of its own above it', () => {
    render(<SandboxedFramePlaceholder title="Vendor scorecard" />);
    const box = document.querySelector<HTMLElement>('.crewlet-skeleton--box')!;
    expect(box.style.marginTop).toBe('0px');
    expect(document.querySelector<HTMLElement>('.crewlet-skeleton__glow-box')!.style.borderRadius).toBe('var(--radius-md)');
  });

  test('the notice says what went wrong as the frame\'s end states do, with its one action', () => {
    const retry = vi.fn();
    render(
      <SandboxedFrameNotice
        title="Vendor scorecard"
        heading="This page could not be opened"
        action={<button onClick={retry}>Try again</button>}
      >
        This version has no page to open.
      </SandboxedFrameNotice>,
    );
    const region = screen.getByRole('region', { name: 'Vendor scorecard' });
    expect(region.querySelector('.crewlet-sandboxed-frame__end .crewlet-callout')).not.toBeNull();
    expect(screen.getByText('This page could not be opened')).toBeDefined();
    expect(screen.getByText('This version has no page to open.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

test('carries no axe violation, loading and failed', async () => {
  vi.useRealTimers();
  const { container } = render(
    <main>
      <h1>Vendor scorecard</h1>
      <div style={{ height: 300 }}>
        <SandboxedFrame src={SRC} origin={ORIGIN} mode="per_artifact" sandbox="allow-scripts" title="Vendor scorecard" theme={THEME} nonce={NONCE} />
      </div>
      <div style={{ height: 300 }}>
        <SandboxedFrame src={SRC} origin={ORIGIN} mode="per_artifact" sandbox="allow-popups" title="Pricing explorer" theme={THEME} nonce={NONCE} onReload={() => {}} />
      </div>
      <div style={{ height: 300 }}>
        <SandboxedFramePlaceholder title="Release notes" />
      </div>
      <div style={{ height: 300 }}>
        <SandboxedFrameNotice title="Launch plan" heading="This page could not be opened" action={<button>Try again</button>}>
          This version has no page to open.
        </SandboxedFrameNotice>
      </div>
    </main>,
  );
  const result = await axe.run(container, {
    // The embedded document is the artifact's, on another origin; axe cannot
    // and should not reach into it. The frame's own name is what is checked.
    iframes: false,
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
