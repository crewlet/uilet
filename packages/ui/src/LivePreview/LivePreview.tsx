import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { createLivePreviewBudget, LIVE_PREVIEW_MAX, perFrame, type LivePreviewBudget } from './budget.js';

/**
 * Real content drawn small: a live, scaled-down snapshot of a page, a grid or
 * a frame inside a fixed box, the way a gallery card previews what it opens.
 *
 * LAID OUT AT FULL SIZE, THEN SCALED. The content is given `width` CSS pixels
 * to lay itself out in, exactly as it would on its own page, and the whole is
 * scaled down to the box with a CSS transform, so the preview is the page
 * itself at a smaller size and never a second layout of it. Left out, the
 * content fills the box unscaled (a slide stage that scales itself).
 *
 * DRAWN ONLY WHEN IT CAN BE SEEN, AND ONLY SO MANY AT ONCE. The content is
 * mounted while the box is within `rootMargin` of the viewport and the
 * shared budget (`LivePreviewBudgetProvider`, twelve by default) grants it a
 * slot, and unmounted when it scrolls away, giving the slot back. Until the
 * content says it has drawn (`useLivePreview().ready()`), while it waits for a
 * slot, when it failed (`fail()`) and in a browser with no
 * IntersectionObserver, the box shows `fallback`.
 *
 * NEVER INTERACTIVE, NEVER ANNOUNCED. The live layer is `inert`, takes no
 * pointer and is hidden from assistive technology: nothing in it can be
 * focused or clicked, and whatever surrounds the preview (a card's link)
 * names what it shows. The swap from the stand-in to the content is a short
 * fade, and none under `prefers-reduced-motion`.
 */

/**
 * How long a box stays near the viewport before its content is asked for: a
 * card a reader scrolls to rests longer than this, and one a fling carries
 * past does not.
 */
export const LIVE_PREVIEW_DWELL_MS = 120;

const DefaultBudget = createLivePreviewBudget(LIVE_PREVIEW_MAX, perFrame);
const BudgetContext = createContext<LivePreviewBudget>(DefaultBudget);

/** Gives the previews under it a budget of their own, `max` live at once. */
export function LivePreviewBudgetProvider({ max = LIVE_PREVIEW_MAX, children }: { max?: number | undefined; children: ReactNode }) {
  const budget = useMemo(() => createLivePreviewBudget(max, perFrame), [max]);
  return <BudgetContext.Provider value={budget}>{children}</BudgetContext.Provider>;
}

export interface LivePreviewSignals {
  /** The content has drawn: the stand-in gives way to it. */
  ready: () => void;
  /** The content has nothing to draw or could not draw: the stand-in stays, and the slot is given back. */
  fail: () => void;
}

const NOOP: LivePreviewSignals = { ready: () => {}, fail: () => {} };
const SignalContext = createContext<LivePreviewSignals>(NOOP);

/** What live content tells the preview around it. Outside one, both do nothing. */
export function useLivePreview(): LivePreviewSignals {
  return useContext(SignalContext);
}

/** Where a preview is in its life. */
export type LivePreviewState = 'idle' | 'waiting' | 'live' | 'ready' | 'failed';

export interface LivePreviewProps {
  /** What is drawn small. Mounted only while the preview is live. */
  children: ReactNode;
  /** The stand-in, drawn whenever the content is not. */
  fallback: ReactNode;
  /** The width, in CSS pixels, the content lays itself out at before it is scaled to the box. */
  width?: number | undefined;
  /** How near the viewport the box comes before its content is mounted. */
  rootMargin?: string | undefined;
  /** Nothing live is drawn: the stand-in only (no content to show, or a host that has turned previews off). */
  disabled?: boolean | undefined;
  /** How long the box stays near the viewport before its content is asked for, in ms. */
  dwellMs?: number | undefined;
  /** Told each time the state moves, for a host that measures. */
  onStateChange?: ((state: LivePreviewState) => void) | undefined;
  className?: string | undefined;
}

export function LivePreview({ children, fallback, width, rootMargin = '200px 0px', disabled = false, dwellMs = LIVE_PREVIEW_DWELL_MS, onStateChange, className }: LivePreviewProps) {
  const budget = useContext(BudgetContext);
  const box = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<LivePreviewState>('idle');
  const [failed, setFailed] = useState(false);

  // NEAR THE VIEWPORT. No observer, no preview: a browser without one, a
  // server render and a suite all draw the stand-in.
  useEffect(() => {
    const el = box.current;
    if (!el || disabled || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { rootMargin });
    seen.observe(el);
    return () => seen.disconnect();
  }, [disabled, rootMargin]);

  // A SLOT WHILE NEAR, given back on leaving. A preview that failed never asks
  // again in this life: it would fail again and hold a slot to do it.
  useEffect(() => {
    if (!near || disabled || failed) {
      setState(failed ? 'failed' : 'idle');
      return undefined;
    }
    setState('waiting');
    let granted = false;
    let giveBack = () => {};
    // A BOX THAT ONLY FLIES PAST asks for nothing: a fling through a gallery
    // brings dozens of cards near for a frame or two each, and a preview
    // mounted for one of them is work thrown away the moment it leaves.
    const dwell = setTimeout(() => {
      giveBack = budget.request(() => {
        granted = true;
        setState('live');
      });
    }, dwellMs);
    return () => {
      clearTimeout(dwell);
      giveBack();
      if (granted) setState('idle');
    };
  }, [near, disabled, failed, budget, dwellMs]);

  useEffect(() => onStateChange?.(state), [state, onStateChange]);

  const mounted = state === 'live' || state === 'ready';

  const signals = useMemo<LivePreviewSignals>(
    () => ({
      ready: () => setState((s) => (s === 'live' ? 'ready' : s)),
      fail: () => setFailed(true),
    }),
    [],
  );

  return (
    <span ref={box} className={cx('crewlet-live-preview', className)} data-state={state} aria-hidden="true">
      <span className="crewlet-live-preview__fallback">{fallback}</span>
      {mounted ? (
        <span className="crewlet-live-preview__live" inert>
          <SignalContext.Provider value={signals}>
            {width === undefined ? children : <PreviewScale width={width}>{children}</PreviewScale>}
          </SignalContext.Provider>
        </span>
      ) : null}
    </span>
  );
}

export interface PreviewScaleProps {
  children: ReactNode;
  /** The width, in CSS pixels, the content is laid out at. */
  width: number;
  /** The height it is laid out at. Left out, as tall as the box allows at the scale its width sets. */
  height?: number | undefined;
  /**
   * `width` scales the content to the box's width from its top (the top of a
   * page); `contain` scales it to fit inside the box whole, centred (a board
   * of its own size).
   */
  fit?: 'width' | 'contain' | undefined;
}

/**
 * Content laid out at a size of its own and scaled to the box it is drawn in,
 * with a CSS transform: the layout `LivePreview` gives a page, for content
 * that knows its own size only once it has loaded (a design's board).
 */
export function PreviewScale({ children, width, height, fit = 'width' }: PreviewScaleProps) {
  const box = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setSize((was) => (was && was.w === rect.width && was.h === rect.height ? was : { w: rect.width, h: rect.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  let layer: CSSProperties = { width, visibility: 'hidden' };
  if (size) {
    const k = fit === 'contain' && height ? Math.min(size.w / width, size.h / height) : size.w / width;
    const h = height ?? size.h / k;
    const left = fit === 'contain' ? (size.w - width * k) / 2 : 0;
    const top = fit === 'contain' ? (size.h - h * k) / 2 : 0;
    layer = { width, height: h, transform: `translate(${left}px, ${top}px) scale(${k})` };
  }
  return (
    <span ref={box} className="crewlet-preview-scale">
      <span className="crewlet-preview-scale__layer" style={layer}>
        {children}
      </span>
    </span>
  );
}
