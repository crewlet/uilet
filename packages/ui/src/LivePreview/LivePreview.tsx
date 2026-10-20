import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { createLivePreviewBudget, LIVE_PREVIEW_MAX, LIVE_PREVIEW_MAX_FRAMES, perFrame, type LivePreviewBudget, type LivePreviewSlot } from './budget.js';

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
 * DRAWN BEFORE IT IS SEEN, AND ONLY SO MANY AT ONCE. The content is mounted
 * once the box comes within `rootMargin` of what its scroll container shows
 * and the shared budget (`LivePreviewBudgetProvider`: thirty-two by default,
 * no more than twelve of them pages in a frame) grants it a slot. The margin is measured against the NEAREST SCROLL
 * CONTAINER, not the window: a page that scrolls inside a frame clips its
 * content at the frame's edge, and an observer rooted at the window never
 * saw a box until it was already on screen, so every card was drawn as the
 * reader looked at it.
 *
 * WHAT HAS DRAWN STAYS DRAWN. A preview that leaves keeps its content and
 * parks its slot (`budget.ts`); only when another preview needs the slot is
 * it taken back, and then what it drew is kept as a still copy, so a reader
 * scrolling back finds every card as they left it rather than its stand-in
 * fading back into content. A still copy is the drawn DOM, cloned; content
 * with a frame in it cannot be cloned (a frame's page lives in another
 * document) and shows its stand-in instead.
 *
 * Until the content says it has drawn (`useLivePreview().ready()`), while it
 * waits for a slot, when it failed (`fail()`) and in a browser with no
 * IntersectionObserver, the box shows `fallback` (or the still copy). The
 * content fades in over it, and the stand-in is hidden once the fade is done:
 * fading the stand-in out at the same time showed both at half strength
 * halfway through, a double exposure on every card.
 *
 * NEVER INTERACTIVE, NEVER ANNOUNCED. The live layer is `inert`, takes no
 * pointer and is hidden from assistive technology: nothing in it can be
 * focused or clicked, and whatever surrounds the preview (a card's link)
 * names what it shows. Under `prefers-reduced-motion` nothing fades.
 */

/**
 * How long a box stays near the viewport before its content is asked for: a
 * card a reader scrolls to rests longer than this, and one a fling carries
 * past does not.
 */
export const LIVE_PREVIEW_DWELL_MS = 120;

const DefaultBudget = createLivePreviewBudget(LIVE_PREVIEW_MAX, perFrame);
const BudgetContext = createContext<LivePreviewBudget>(DefaultBudget);

/** Gives the previews under it a budget of their own: `max` live at once, `maxFrames` of them in a frame. */
export function LivePreviewBudgetProvider({
  max = LIVE_PREVIEW_MAX,
  maxFrames = Math.min(max, LIVE_PREVIEW_MAX_FRAMES),
  children,
}: {
  max?: number | undefined;
  maxFrames?: number | undefined;
  children: ReactNode;
}) {
  const budget = useMemo(() => createLivePreviewBudget(max, perFrame, maxFrames), [max, maxFrames]);
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
  /** How near what its scroll container shows the box comes before its content is mounted. */
  rootMargin?: string | undefined;
  /** Nothing live is drawn: the stand-in only (no content to show, or a host that has turned previews off). */
  disabled?: boolean | undefined;
  /**
   * The content runs a page in a frame: it counts against the budget's
   * frames as well, and what it drew cannot be kept as a still copy.
   */
  frame?: boolean | undefined;
  /** How long the box stays near the viewport before its content is asked for, in ms. */
  dwellMs?: number | undefined;
  /** Told each time the state moves, for a host that measures. */
  onStateChange?: ((state: LivePreviewState) => void) | undefined;
  className?: string | undefined;
}

/**
 * The element a box is scrolled by: the nearest ancestor that scrolls, or
 * null for the window. An observer's margin grows its root and nothing else,
 * and every scroller between the box and the root clips it at its own edge.
 */
export function scrollRoot(el: Element): Element | null {
  for (let at = el.parentElement; at; at = at.parentElement) {
    const style = getComputedStyle(at);
    if (/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflowX}`)) return at;
  }
  return null;
}

/**
 * A still copy of what a live layer drew, or null where none can be made: a
 * frame's page is another document, which a clone would load again from the
 * start rather than copy.
 */
function stillOf(live: HTMLElement | null): Node[] | null {
  if (!stillable(live)) return null;
  return [...live.childNodes].map((node) => node.cloneNode(true));
}

/** Whether a live layer's drawing can be kept as a still copy. */
function stillable(live: HTMLElement | null): live is HTMLElement {
  return live !== null && live.querySelector('iframe, canvas, video') === null;
}

/** How long a still copy stays under content drawn again: longer than the fade the content arrives with. */
const STILL_OUTLASTS_FADE_MS = 1000;

export function LivePreview({ children, fallback, width, rootMargin = '200px 0px', disabled = false, frame = false, dwellMs = LIVE_PREVIEW_DWELL_MS, onStateChange, className }: LivePreviewProps) {
  const budget = useContext(BudgetContext);
  const box = useRef<HTMLSpanElement>(null);
  const liveLayer = useRef<HTMLSpanElement>(null);
  const slot = useRef<LivePreviewSlot | null>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<LivePreviewState>('idle');
  const current = useRef(state);
  current.current = state;
  const [failed, setFailed] = useState(false);
  const [still, setStill] = useState<Node[] | null>(null);

  // NEAR WHAT THE SCROLLER SHOWS. No observer, no preview: a browser without
  // one, a server render and a suite all draw the stand-in.
  useEffect(() => {
    const el = box.current;
    if (!el || disabled || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { root: scrollRoot(el), rootMargin });
    seen.observe(el);
    return () => seen.disconnect();
  }, [disabled, rootMargin]);

  // TAKEN BACK WHILE PARKED: what was drawn is kept as a still copy, made
  // before the content unmounts, in the same commit as the unmount, so no
  // frame shows the stand-in between them.
  const reclaim = useCallback(() => {
    slot.current = null;
    if (current.current === 'ready') setStill(stillOf(liveLayer.current));
    setState('idle');
  }, []);

  // WHETHER A RECLAIM WOULD GO UNSEEN: drawn, and drawn as DOM a still copy
  // can be made of.
  const keeps = useCallback(() => current.current === 'ready' && stillable(liveLayer.current), []);

  // GIVEN BACK FOR GOOD on unmount.
  useEffect(
    () => () => {
      slot.current?.release();
      slot.current = null;
    },
    [],
  );

  // A SLOT WHILE NEAR, parked on leaving. A preview that failed never asks
  // again in this life: it would fail again and hold a slot to do it.
  useEffect(() => {
    if (disabled || failed) {
      slot.current?.release();
      slot.current = null;
      setState(failed ? 'failed' : 'idle');
      return undefined;
    }
    if (!near) return undefined;
    // BACK BEFORE ANYBODY NEEDED THE SLOT: nothing to do, it is still drawn.
    if (slot.current?.resume()) {
      const held = slot.current;
      return () => held.park(keeps());
    }
    setState('waiting');
    let asked: LivePreviewSlot | null = null;
    let granted = false;
    // A BOX THAT ONLY FLIES PAST asks for nothing: a fling through a gallery
    // brings dozens of cards near for a frame or two each, and a preview
    // mounted for one of them is work thrown away the moment it leaves.
    const dwell = setTimeout(() => {
      asked = budget.request(() => {
        granted = true;
        setState('live');
      }, reclaim, frame);
      slot.current = asked;
    }, dwellMs);
    return () => {
      clearTimeout(dwell);
      if (asked && granted) {
        asked.park(keeps());
        return;
      }
      asked?.release();
      if (slot.current === asked) slot.current = null;
      setState('idle');
    };
  }, [near, disabled, failed, frame, budget, dwellMs, reclaim, keeps]);

  // A STILL COPY IS LET GO once the content has drawn over it again, and
  // dropped when the box changes size, since it is drawn at the old one.
  useEffect(() => {
    if (!still || state !== 'ready') return undefined;
    const t = setTimeout(() => setStill(null), STILL_OUTLASTS_FADE_MS);
    return () => clearTimeout(t);
  }, [still, state]);
  useEffect(() => {
    const el = box.current;
    if (!el || !still || typeof ResizeObserver === 'undefined') return undefined;
    let first = true;
    const watch = new ResizeObserver(() => {
      if (first) first = false;
      else setStill(null);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, [still]);

  useEffect(() => onStateChange?.(state), [state, onStateChange]);

  const mounted = state === 'live' || state === 'ready';

  const signals = useMemo<LivePreviewSignals>(
    () => ({
      ready: () => setState((s) => (s === 'live' ? 'ready' : s)),
      fail: () => setFailed(true),
    }),
    [],
  );

  const placeStill = useCallback(
    (el: HTMLSpanElement | null) => {
      if (el && still) el.replaceChildren(...still);
    },
    [still],
  );

  return (
    <span ref={box} className={cx('crewlet-live-preview', className)} data-state={state} data-still={still ? '' : undefined} aria-hidden="true">
      <span className="crewlet-live-preview__fallback">{fallback}</span>
      {still ? <span ref={placeStill} className="crewlet-live-preview__still" inert /> : null}
      {mounted ? (
        <span ref={liveLayer} className="crewlet-live-preview__live" inert>
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
