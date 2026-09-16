import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleFillGlyph, CloseGlyph, ErrorFillGlyph, InfoFillGlyph, WarningFillGlyph } from '@crewlethq/icons/glyphs';
import { useLayerContainer } from '../Layer/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/** The four the component knows. Any other string is a variant of the caller's own. */
export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Open an external href in a new tab. */
  external?: boolean;
}

export interface Toast<TVariant extends string = string> {
  /** Stable id, which the consumer maps a dismissal back to. */
  id: string | number;
  /**
   * What happened, and how loudly. `info`, `success`, `warning` and `danger`
   * come with a glyph and a default title; any other string, `'quota'`
   * included, has neither, so pass `icon` and `title`, or `renderBody`.
   */
  variant?: TVariant;
  title?: ReactNode;
  message?: ReactNode;
  /**
   * Milliseconds before it goes. 0 is sticky. Left unset, it is the variant's
   * own default: 4s for a success or an item of information, and sticky for a
   * warning or a failure.
   */
  duration?: number;
  /** Bump on a dedup-replace to start the countdown again. */
  version?: number;
  /** An inline action. A full ReactNode is accepted for anything the shape does not cover. */
  action?: ToastAction | ReactNode;
  /** A glyph replacing the variant's own. A component, not a name. */
  icon?: ReactNode;
  /** Replace the body, for a shape the standard layout does not cover. */
  renderBody?: (ctx: { onDismiss: () => void; toast: Toast<TVariant> }) => ReactNode;
}

export interface ToasterProps<TVariant extends string = string> {
  toasts: Toast<TVariant>[];
  onDismiss: (id: string | number) => void;
  /** Render an action with an `href` through a router-aware link. */
  renderAction?: ((action: ToastAction, ctx: { onDismiss: () => void }) => ReactNode) | undefined;
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' | undefined;
  /** Names the polite region for a reader browsing landmarks. */
  politeLabel?: string | undefined;
  /** Names the assertive region. */
  assertiveLabel?: string | undefined;
  dismissLabel?: string | undefined;
  /** Replaces the lead-in a variant falls back to. See [ToastTitles]. */
  titles?: ToastTitles | undefined;
  className?: string | undefined;
}

/*
 * The FILLED drawing of each status glyph. A toast is a small mark on a tinted
 * strip, where an outlined glyph at 16px is mostly its own hole; the filled one
 * reads as the shape it is at that size, which is what the contrast floor for a
 * mark is measured against.
 */
const ICONS: Record<ToastVariant, ReactNode> = {
  info: <InfoFillGlyph size="md" />,
  success: <CheckCircleFillGlyph size="md" />,
  warning: <WarningFillGlyph size="md" />,
  danger: <ErrorFillGlyph size="md" />,
};

/**
 * The lead-in each known variant falls back to when a toast brings no title
 * and no message.
 *
 * `info` has none on purpose: "Information" above a sentence says nothing the
 * sentence does not. They are replaceable per Toaster, because every string a
 * component renders on its own is a prop in this package, and these three are
 * the only English it writes into a screen by itself.
 */
export type ToastTitles = Partial<Record<ToastVariant, string | null>>;

const TITLES: Record<ToastVariant, string | null> = {
  info: null,
  success: 'Success',
  warning: 'Heads up',
  danger: 'Something went wrong',
};

/**
 * How long each kind stays, unset.
 *
 * A FAILURE DOES NOT AUTO-DISMISS. A success confirms something the reader
 * already knows they asked for; a failure is news, and news that removes
 * itself is news somebody misses while reading the form they were about to
 * fix. 4s is long enough to read one line and short enough not to sit over the
 * row they are looking at next.
 */
const DURATIONS: Record<ToastVariant, number> = {
  info: 4000,
  success: 4000,
  warning: 0,
  danger: 0,
};

const KNOWN = new Set<string>(['info', 'success', 'warning', 'danger']);
const isKnown = (variant: string): variant is ToastVariant => KNOWN.has(variant);

/** Which region says it: a failure interrupts, everything else waits its turn. */
const politeness = (variant: string): 'polite' | 'assertive' =>
  variant === 'danger' || variant === 'quota' ? 'assertive' : 'polite';

const isToastAction = (value: unknown): value is ToastAction => {
  if (!value || typeof value !== 'object') return false;
  const shape = value as Record<string, unknown>;
  return 'label' in shape && ('onClick' in shape || 'href' in shape);
};

/**
 * What one region says about everything that arrived at once.
 *
 * Several are ended so a reader hears where one stops: "Saved The write was
 * refused" is one sentence that is true of neither toast. One is left exactly
 * as it is, because a full stop nobody wrote is a full stop a reader hears.
 */
const sentences = (parts: string[]) =>
  parts.length < 2 ? (parts[0] ?? '') : parts.map((part) => (/[.!?]$/.test(part) ? part : `${part}.`)).join(' ');

/** What a toast reads as, for the region that says it. */
function spoken<TVariant extends string>(toast: Toast<TVariant>, titles: Record<ToastVariant, string | null>): string {
  const parts = [toast.title, toast.message].filter((part) => typeof part === 'string');
  if (parts.length > 0) return parts.join('. ');
  const variant = toast.variant ?? 'info';
  return isKnown(variant) ? (titles[variant] ?? 'Notification') : 'Notification';
}

interface ToastItemProps<TVariant extends string> {
  toast: Toast<TVariant>;
  onDismiss: (id: string | number) => void;
  renderAction?: ToasterProps<TVariant>['renderAction'];
  dismissLabel: string;
  titles: Record<ToastVariant, string | null>;
}

function ToastItem<TVariant extends string>({
  toast,
  onDismiss,
  renderAction,
  dismissLabel,
  titles,
}: ToastItemProps<TVariant>) {
  const variant = (toast.variant ?? 'info') as string;
  const known = isKnown(variant);
  const { id, version } = toast;
  const duration = toast.duration ?? (known ? DURATIONS[variant] : 0);

  const dismiss = useCallback(() => onDismiss(id), [onDismiss, id]);

  const [paused, setPaused] = useState(false);
  /*
   * What is LEFT, not when it started. A reader who hovers to read a toast is
   * reading it: restarting the full countdown when the pointer leaves would
   * hold it there for as long as they keep touching it, and dropping the pause
   * would take it away mid-sentence.
   */
  const remaining = useRef(duration);

  // Declared FIRST, so that on a dedup-replace the reset runs before the timer
  // below is scheduled: React runs every cleanup, then every setup in
  // declaration order.
  useEffect(() => {
    remaining.current = duration;
  }, [duration, version]);

  useEffect(() => {
    if (duration <= 0 || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [duration, paused, version, dismiss]);

  const icon = toast.icon ?? (known ? ICONS[variant] : null);
  // A default title only where there is nothing else to read. "Success" above
  // "Saved. The engine is applying it." says the same thing twice.
  const title = toast.title ?? (toast.message === undefined && known ? titles[variant] : null);

  const action = (): ReactNode => {
    if (toast.action === undefined || toast.action === null) return null;
    if (!isToastAction(toast.action)) return <div className="crewlet-toast__actions">{toast.action as ReactNode}</div>;
    const one = toast.action;
    if (renderAction) return <div className="crewlet-toast__actions">{renderAction(one, { onDismiss: dismiss })}</div>;
    if (one.href) {
      const external = one.external ?? /^https?:\/\//.test(one.href);
      return (
        <div className="crewlet-toast__actions">
          <a
            className="crewlet-toast__action-link"
            href={one.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            onClick={dismiss}
          >
            {one.label}
          </a>
        </div>
      );
    }
    return (
      <div className="crewlet-toast__actions">
        <button
          type="button"
          className="crewlet-toast__action-btn"
          onClick={() => {
            one.onClick?.();
            dismiss();
          }}
        >
          {one.label}
        </button>
      </div>
    );
  };

  return (
    /*
     * NO ROLE AND NO LIVE REGION HERE. The two regions at the foot of the
     * stack say what arrived; a toast that also announced itself would be a
     * live region inside a live region, which assistive technology reads
     * twice or not at all.
     */
    <div
      className={cx('crewlet-toast', `crewlet-toast--${variant}`)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {toast.renderBody ? (
        toast.renderBody({ onDismiss: dismiss, toast })
      ) : (
        <>
          {icon ? (
            <span className="crewlet-toast__icon" aria-hidden>
              {icon}
            </span>
          ) : null}
          <div className="crewlet-toast__body">
            {title ? <div className="crewlet-toast__title">{title}</div> : null}
            {toast.message ? <div className="crewlet-toast__message">{toast.message}</div> : null}
            {action()}
          </div>
        </>
      )}

      <button type="button" className="crewlet-toast__dismiss" onClick={dismiss} aria-label={dismissLabel}>
        <CloseGlyph size="sm" />
      </button>

      {/*
       * The drain is DECORATION. Its animationend used to be the dismissal
       * handshake, so a reader whose system asks for reduced motion, and every
       * application with a global rule collapsing animations, got a toast that
       * never went away. The timer above is what dismisses; this only shows
       * how long is left, and it stops under reduced motion.
       */}
      {duration > 0 ? (
        <div
          key={version ?? 0}
          className={cx('crewlet-toast__progress', paused && 'is-paused')}
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

/** One line per politeness, keyed so the same words twice are said twice. */
interface Said {
  text: string;
  n: number;
}

export function Toaster<TVariant extends string = string>({
  toasts,
  onDismiss,
  renderAction,
  position = 'bottom-right',
  politeLabel = 'Notifications',
  assertiveLabel = 'Alerts',
  dismissLabel = 'Dismiss notification',
  titles,
  className = '',
}: ToasterProps<TVariant>) {
  const container = useLayerContainer();
  /*
   * The lead-ins this Toaster draws, the caller's over the package's own. It
   * is recomputed freely: the effect below re-runs harmlessly, because what
   * stops a toast being announced twice is the set of what has been said and
   * never the dependency list.
   */
  const said = useMemo(() => ({ ...TITLES, ...titles }), [titles]);
  const [polite, setPolite] = useState<Said>({ text: '', n: 0 });
  const [assertive, setAssertive] = useState<Said>({ text: '', n: 0 });
  /** Which toasts have already been said, so a re-render does not say them again. */
  const announced = useRef(new Set<string>());
  /** Bumped per announcement, so the same words twice are read twice. */
  const nth = useRef(0);

  useEffect(() => {
    const live = new Set<string>();
    /*
     * COLLECTED, then said once per region. Two writes that land together are
     * one render, so setting the region's text per toast would leave only the
     * last of them in it and the first would never be announced at all.
     */
    const fresh: Record<'polite' | 'assertive', string[]> = { polite: [], assertive: [] };
    for (const toast of toasts) {
      // The version is part of the key: a dedup-replace is new news ("3 writes
      // failed" after "2 writes failed"), and the same id with the same
      // version is the same toast being re-rendered.
      const key = `${toast.id}:${toast.version ?? 0}`;
      live.add(key);
      if (announced.current.has(key)) continue;
      fresh[politeness(toast.variant ?? 'info')].push(spoken(toast, said));
    }
    // Forget what has gone, so an id a caller reuses is announced again.
    announced.current = live;
    if (fresh.polite.length > 0) {
      nth.current += 1;
      setPolite({ text: sentences(fresh.polite), n: nth.current });
    }
    if (fresh.assertive.length > 0) {
      nth.current += 1;
      setAssertive({ text: sentences(fresh.assertive), n: nth.current });
    }
  }, [toasts, said]);

  if (container === null) return null;

  return createPortal(
    /*
     * ALWAYS MOUNTED, which is the change from 0.2.0. The whole element used
     * to arrive with the first toast, and a live region that is inserted
     * already holding its text is a region most screen readers never announce:
     * they watch a region for changes, and a region's first appearance is not
     * one.
     */
    <div className={cx('crewlet-toaster', `crewlet-toaster--${position}`, className)}>
      {toasts.map((toast) => (
        <ToastItem<TVariant>
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          renderAction={renderAction}
          dismissLabel={dismissLabel}
          titles={said}
        />
      ))}
      <VisuallyHidden>
        <span role="status" aria-live="polite" aria-label={politeLabel}>
          <span key={polite.n}>{polite.text}</span>
        </span>
        <span role="alert" aria-live="assertive" aria-label={assertiveLabel}>
          <span key={assertive.n}>{assertive.text}</span>
        </span>
      </VisuallyHidden>
    </div>,
    container,
  );
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

export interface ToastOptions {
  title?: ReactNode;
  /** Milliseconds, or 0 for sticky. Unset takes the variant's own default. */
  duration?: number;
  action?: ToastAction | ReactNode;
  icon?: ReactNode;
  id?: string | number;
}

/** What a toast is asked for with, before the provider gives it an id. */
export type ToastRequest = Omit<Toast, 'id'> & { id?: string | number };

export interface ToastApi {
  /** A write landed. Goes by itself. */
  ok: (message: ReactNode, options?: ToastOptions) => string | number;
  /** A write was refused. Stays until it is dismissed. */
  failed: (message: ReactNode, options?: ToastOptions) => string | number;
  /** Anything else: another variant, a custom body, an action. */
  show: (toast: ToastRequest) => string | number;
  /** Take one back, for a condition the application itself has cleared. */
  dismiss: (id: string | number) => void;
}

/**
 * The no-op API, for a tree with no provider above it.
 *
 * A COMPONENT THAT REPORTS AN OUTCOME MUST NOT CRASH A TREE THAT HAS NOWHERE
 * TO PUT IT. A shared component cannot know whether the application it landed
 * in mounts a provider, and throwing here would make "this screen can say
 * saved" a hard dependency of every screen that imports it.
 */
const NONE: ToastApi = {
  ok: () => '',
  failed: () => '',
  show: () => '',
  dismiss: () => {},
};

const ToastContext = createContext<ToastApi>(NONE);

/** The hook every writing screen uses. Safe with no provider mounted. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export interface ToastProviderProps {
  children?: ReactNode;
  position?: ToasterProps['position'];
  renderAction?: ToasterProps['renderAction'];
  /** How many to keep on screen. The oldest goes when the next arrives. */
  max?: number | undefined;
}

/**
 * Holds the stack, and draws it.
 *
 * PROVIDERS NEST. A surface that goes fullscreen renders only its own subtree,
 * so a toast portalled to the document body while a builder canvas is
 * fullscreen is simply invisible: the reader presses Save and nothing happens.
 * That surface mounts a provider of its own inside its `LayerHost`, and
 * `useToast` inside it finds the nearest one.
 */
export function ToastProvider({ children, position = 'bottom-right', renderAction, max = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: string | number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastRequest) => {
      const id = toast.id ?? `crewlet-toast-${next.current++}`;
      setToasts((current) => {
        const rest = current.filter((one) => one.id !== id);
        // A repeat of an id already up is a REPLACE with its countdown
        // restarted, not a second strip saying the same thing.
        const version = (current.find((one) => one.id === id)?.version ?? 0) + 1;
        return [...rest, { ...toast, id, version }].slice(-max);
      });
      return id;
    },
    [max],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      ok: (message, options) => show({ ...options, variant: 'success', message }),
      failed: (message, options) => show({ ...options, variant: 'danger', message }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} position={position} renderAction={renderAction} />
    </ToastContext.Provider>
  );
}
