import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { createLivePreviewBudget, LIVE_PREVIEW_MAX, LIVE_PREVIEW_MAX_FRAMES, perFrame, type LivePreviewBudget, type LivePreviewSlot } from './budget.js';
import { copyOf, createLivePreviewStills, LIVE_PREVIEW_STILLS_KEPT, type LivePreviewStill, type LivePreviewStills } from './stills.js';

/**
 * Real content drawn small, once: a scaled-down snapshot of a page, a grid or
 * a slide, rendered by the content's own renderer from its real data and
 * then frozen, the way a gallery card previews what it opens.
 *
 * LAID OUT AT FULL SIZE, THEN SCALED. The content is given `width` CSS pixels
 * to lay itself out in, exactly as it would on its own page, and the whole is
 * scaled down to the box with a CSS transform, so the preview is the page
 * itself at a smaller size and never a second layout of it. Left out, the
 * content fills the box unscaled.
 *
 * RENDERED ONCE, THEN A STILL COPY. The content is mounted once the box has
 * stayed within `rootMargin` (a screen, by default) of what its scroll
 * container shows for `dwellMs` and the shared budget
 * (`LivePreviewBudgetProvider`) grants it one of the renders it allows at
 * once. It reads what it needs and draws, out of sight behind the stand-in.
 * When it says it has drawn (`useLivePreview().ready()`) its render is given
 * to the next box, and once the page's fonts have loaded and the layout has
 * settled, what it drew is copied (its DOM, cloned: `stills.ts`), the copy
 * fades in over the stand-in, and the content is unmounted in the same
 * commit. From then on the preview holds nothing live: no React tree under
 * it, no subscription, no observer of its own and no timer, and it never
 * reads, polls or redraws again. A copy laid out at `width` is scaled to its
 * box by one observer the provider's copies share, so a resized window
 * rescales it rather than drawing it again; one with no `width` is drawn
 * again only if its box changes size.
 *
 * KEPT FOR THE PAGE. With a `snapshot` key, the copy is kept by the provider
 * under that key, and a preview mounted again under it (a card back after a
 * filter, a change of shape or a page of results) shows the same copy at
 * once, with nothing read. A page loaded afresh draws afresh.
 *
 * A FRAME CANNOT BE COPIED. Content that runs a page in a frame (`frame`)
 * lives in another document: there is nothing in this one to clone, and a
 * clone of the frame would load the page again. So a framed preview keeps its
 * frame once drawn, fading it in over the stand-in. Kept frames are capped
 * apart; one the reader has left is taken back only when a frame coming near
 * needs its place, and shows its stand-in until it is drawn again.
 *
 * Until it has drawn, while it waits for a render, when it failed (`fail()`,
 * or no drawing within `LIVE_PREVIEW_RENDER_MS`), and in a browser with no
 * IntersectionObserver, the box shows `fallback`. What has drawn is shown
 * over it, and the stand-in is hidden once the fade is done: fading the
 * stand-in out at the same time showed both at half strength halfway through.
 *
 * NEVER INTERACTIVE, NEVER ANNOUNCED. The live layer and the copy are
 * `inert`, take no pointer and are hidden from assistive technology: nothing
 * in them can be focused or clicked, and whatever surrounds the preview (a
 * card's link) names what it shows. Under `prefers-reduced-motion` nothing
 * fades.
 */

/**
 * How long a box stays near the viewport before its content is asked for: a
 * card a reader scrolls to rests longer than this, and one a fling carries
 * past does not.
 */
export const LIVE_PREVIEW_DWELL_MS = 120;

/**
 * How far ahead of what its scroll container shows a box starts rendering: a
 * whole screen in each direction. A snapshot costs nothing once it is taken,
 * so drawing a screen ahead is paid once, and it is what lets a reader
 * scrolling at any pace meet every card already drawn. Measured on a gallery
 * of 44 cards at 1440 by 900 with the CPU slowed fourfold, 200 pixels ahead
 * left cards on screen before their first draw in about sixty samples of a
 * scroll down and back; a screen ahead left none, and the first screen was
 * drawn within a frame or two of the time it took before.
 */
export const LIVE_PREVIEW_MARGIN = '100% 0px';

/**
 * The longest a render may take before it gives up and keeps its stand-in.
 * A preview is a glimpse: content that has not drawn in fifteen seconds is
 * waiting on a read that is failing slowly, and holding one of the budget's
 * few renders for it would hold the rest of a gallery up behind it. Fifteen
 * is past the ten seconds a page in a frame is given to answer at all
 * (`FRAME_HELLO_TIMEOUT_MS`) and its grace after, so a frame settles itself
 * first.
 */
export const LIVE_PREVIEW_RENDER_MS = 15_000;

interface Shared {
  budget: LivePreviewBudget;
  stills: LivePreviewStills;
}

const DefaultShared: Shared = { budget: createLivePreviewBudget(LIVE_PREVIEW_MAX, perFrame), stills: createLivePreviewStills() };
const SharedContext = createContext<Shared>(DefaultShared);

/**
 * Gives the previews under it a budget and a store of their own: `max`
 * rendering at once, `maxFrames` frames kept, and up to `kept` still copies
 * kept by key for as long as the provider is mounted.
 */
export function LivePreviewBudgetProvider({
  max = LIVE_PREVIEW_MAX,
  maxFrames = LIVE_PREVIEW_MAX_FRAMES,
  kept = LIVE_PREVIEW_STILLS_KEPT,
  children,
}: {
  max?: number | undefined;
  maxFrames?: number | undefined;
  kept?: number | undefined;
  children: ReactNode;
}) {
  const budget = useMemo(() => createLivePreviewBudget(max, perFrame, maxFrames), [max, maxFrames]);
  const stills = useMemo(() => createLivePreviewStills(kept), [kept]);
  const shared = useMemo(() => ({ budget, stills }), [budget, stills]);
  return <SharedContext.Provider value={shared}>{children}</SharedContext.Provider>;
}

export interface LivePreviewSignals {
  /** The content has drawn: it is copied and the copy shown, or for a frame, the frame is shown. */
  ready: () => void;
  /** The content has nothing to draw or could not draw: the stand-in stays, and the render is given back. */
  fail: () => void;
}

const NOOP: LivePreviewSignals = { ready: () => {}, fail: () => {} };
const SignalContext = createContext<LivePreviewSignals>(NOOP);

/** What live content tells the preview around it. Outside one, both do nothing. */
export function useLivePreview(): LivePreviewSignals {
  return useContext(SignalContext);
}

/**
 * Where a preview is in its life: `idle` (not asked for), `waiting` (asked,
 * no render yet), `live` (rendering), `ready` (drawn: a still copy, or a kept
 * frame) and `failed` (the stand-in for good).
 */
export type LivePreviewState = 'idle' | 'waiting' | 'live' | 'ready' | 'failed';

export interface LivePreviewProps {
  /** What is drawn small. Mounted only while it renders, or for a frame while it is kept. */
  children: ReactNode;
  /** The stand-in, drawn whenever nothing else is. */
  fallback: ReactNode;
  /** The width, in CSS pixels, the content lays itself out at before it is scaled to the box. */
  width?: number | undefined;
  /** How near what its scroll container shows the box comes before its content is rendered (`LIVE_PREVIEW_MARGIN`). */
  rootMargin?: string | undefined;
  /** Nothing is drawn: the stand-in only (no content to show, or a host that has turned previews off). */
  disabled?: boolean | undefined;
  /**
   * The content runs a page in a frame: it is kept rather than copied, and
   * counts against the budget's frames for as long as it is.
   */
  frame?: boolean | undefined;
  /**
   * What is drawn, as a key: previews under one provider with the same key
   * share one still copy, so a preview mounted again shows it at once and
   * renders nothing. A key names a version of the content; content that has
   * changed takes a new key and is drawn afresh.
   */
  snapshot?: string | undefined;
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
 * Runs `then` once the page's fonts have loaded and two frames have painted,
 * and answers how to call it off. The content says it has drawn from an
 * effect, and what it measures from the layout that render produced (a
 * column fitted to its text, a stage scaled to its box) settles in the frame
 * after: a copy taken at once would freeze the first layout, not the last.
 */
function afterDrawn(then: () => void): () => void {
  let off = false;
  let frame = 0;
  const paint = (left: number) => {
    if (off) return;
    if (left === 0 || typeof requestAnimationFrame === 'undefined') then();
    else frame = requestAnimationFrame(() => paint(left - 1));
  };
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (fonts) void fonts.ready.then(() => paint(2));
  else paint(2);
  return () => {
    off = true;
    if (frame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame);
  };
}

/** How a layer laid out at a size of its own is fitted to its box (`PreviewScaleProps.fit`). */
export type PreviewFit = 'width' | 'contain' | 'fill';

/**
 * The most of a filled layer's content that may fall outside its box, on
 * either axis, before `fill` contains it instead: a fifth. A laptop's board
 * (16:10) in a card's 16:9 loses a tenth of its foot; a phone's board would
 * lose four fifths of itself, and is shown whole.
 */
export const PREVIEW_FILL_MAX_CUT = 0.2;

/**
 * The layout a layer is given to fit a box: laid out at `width` (and
 * `height`, or as tall as the box allows at the scale its width sets) and
 * scaled to the box's width from its top, to fit inside it whole and
 * centred, or to fill it (see `PreviewScaleProps.fit`).
 */
function fitTo(size: { w: number; h: number }, width: number, height: number | undefined, fit: PreviewFit) {
  if (!height || fit === 'width') {
    const k = size.w / width;
    return { width, height: height ?? size.h / k, transform: `translate(0px, 0px) scale(${k})` };
  }
  const contain = Math.min(size.w / width, size.h / height);
  const cover = Math.max(size.w / width, size.h / height);
  // FILLED WHERE LITTLE IS LOST: the cut is what the covering scale puts
  // outside the box, as a share of the scaled content on the axis it spills.
  const cut = 1 - contain / cover;
  if (fit === 'fill' && cut <= PREVIEW_FILL_MAX_CUT) {
    // CENTRED ACROSS AND HELD AT THE TOP, where a board or a page says what
    // it is: what falls outside is its foot, or an even sliver of each side.
    const left = (size.w - width * cover) / 2;
    return { width, height, transform: `translate(${left}px, 0px) scale(${cover})` };
  }
  const left = (size.w - width * contain) / 2;
  const top = (size.h - height * contain) / 2;
  return { width, height, transform: `translate(${left}px, ${top}px) scale(${contain})` };
}

/** What a live layer drew, as a still copy, at the box's size now. */
function stillOf(live: HTMLElement, width: number | undefined, box: HTMLElement): LivePreviewStill {
  const rect = box.getBoundingClientRect();
  // LAID OUT AT A WIDTH, the copy is of the content inside the scaled layer,
  // and scaled again wherever it is placed; otherwise of what fills the box.
  const from = width === undefined ? live : (live.querySelector(':scope > .crewlet-preview-scale > .crewlet-preview-scale__layer') ?? live);
  return { nodes: copyOf([...from.childNodes]), width, size: { w: rect.width, h: rect.height } };
}

/**
 * A preview whose `snapshot` key changes is another preview: what it holds
 * belongs to the content it drew, so it starts again under the new key.
 */
export function LivePreview(props: LivePreviewProps) {
  return <Preview key={props.snapshot ?? ''} {...props} />;
}

function Preview({ children, fallback, width, rootMargin = LIVE_PREVIEW_MARGIN, disabled = false, frame = false, snapshot, dwellMs = LIVE_PREVIEW_DWELL_MS, onStateChange, className }: LivePreviewProps) {
  const { budget, stills } = useContext(SharedContext);
  const box = useRef<HTMLSpanElement>(null);
  const liveLayer = useRef<HTMLSpanElement>(null);
  const stillLayer = useRef<HTMLSpanElement>(null);
  const slot = useRef<LivePreviewSlot | null>(null);
  const granted = useRef(false);

  // WHAT THE STORE ALREADY HOLDS for this key, read once as the preview
  // mounts: a copy drawn before, or a preview that had nothing to draw.
  const [kept] = useState(() => (snapshot !== undefined && !frame && !disabled ? stills.get(snapshot) : undefined));
  const [state, setState] = useState<LivePreviewState>(kept === 'failed' ? 'failed' : kept ? 'ready' : 'idle');
  const current = useRef(state);
  current.current = state;
  const [still, setStill] = useState<{ drawing: LivePreviewStill; fresh: boolean } | null>(kept && kept !== 'failed' ? { drawing: kept, fresh: false } : null);
  const [near, setNear] = useState(false);

  // NOTHING LEFT TO DO: a copy holds no slot and watches nothing, and a
  // failure asks again only on a page loaded afresh. A kept frame is still
  // watched, so that it parks when the reader leaves it.
  const done = state === 'failed' || (state === 'ready' && !frame);

  const settle = useCallback((next: 'ready' | 'failed') => {
    slot.current?.release();
    slot.current = null;
    granted.current = false;
    setState(next);
  }, []);

  // NEAR WHAT THE SCROLLER SHOWS. No observer, no preview: a browser without
  // one, a server render and a suite all draw the stand-in.
  useEffect(() => {
    const el = box.current;
    if (!el || disabled || done || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { root: scrollRoot(el), rootMargin });
    seen.observe(el);
    return () => seen.disconnect();
  }, [disabled, done, rootMargin]);

  // A KEPT FRAME TAKEN BACK while parked: its page is torn down and the
  // stand-in shows until it is drawn again.
  const reclaim = useCallback(() => {
    slot.current = null;
    granted.current = false;
    setState('idle');
  }, []);

  // A RENDER WHILE NEAR. One that has been granted runs on to its end
  // wherever the box goes, since what it is drawing is about to be kept; a
  // kept frame parks when its box leaves, and is found again when it comes
  // back. An ask not yet granted is withdrawn when the box leaves.
  useEffect(() => {
    if (disabled || done) return undefined;
    const held = slot.current;
    if (!near) {
      if (held && granted.current) held.park();
      else if (held) {
        held.release();
        slot.current = null;
      }
      setState((s) => (s === 'waiting' ? 'idle' : s));
      return undefined;
    }
    if (held) {
      if (granted.current) held.resume();
      return undefined;
    }
    setState('waiting');
    // A BOX THAT ONLY FLIES PAST asks for nothing: a fling through a gallery
    // brings dozens of cards near for a frame or two each.
    const dwell = setTimeout(() => {
      granted.current = false;
      slot.current = budget.request(
        () => {
          granted.current = true;
          setState('live');
        },
        reclaim,
        frame,
      );
    }, dwellMs);
    return () => clearTimeout(dwell);
  }, [near, disabled, done, frame, budget, dwellMs, reclaim]);

  // TURNED OFF: everything is given back, and the stand-in shows.
  useEffect(() => {
    if (!disabled) return;
    slot.current?.release();
    slot.current = null;
    granted.current = false;
    setStill(null);
    setState((s) => (s === 'failed' ? s : 'idle'));
  }, [disabled]);

  // GIVEN BACK FOR GOOD on unmount.
  useEffect(
    () => () => {
      slot.current?.release();
      slot.current = null;
    },
    [],
  );

  // A RENDER THAT NEVER DRAWS gives up, rather than hold a render for the
  // rest of the page's life. It is not remembered as having nothing to draw:
  // a page loaded afresh asks again.
  useEffect(() => {
    if (state !== 'live') return undefined;
    const t = setTimeout(() => settle('failed'), LIVE_PREVIEW_RENDER_MS);
    return () => clearTimeout(t);
  }, [state, settle]);

  // THE COPY. Taken once the content has drawn and settled, then shown and
  // the content unmounted in the same commit, so no frame shows the stand-in
  // between them.
  const capture = useRef<(() => void) | null>(null);
  useEffect(() => () => capture.current?.(), []);
  const signals = useMemo<LivePreviewSignals>(
    () => ({
      ready: () => {
        if (current.current !== 'live' || capture.current) return;
        // DRAWN IS THE END OF THE RENDER: what is left is waiting for a copy,
        // which takes no work, so the next render starts now.
        slot.current?.drawn();
        if (frame) {
          setState('ready');
          return;
        }
        capture.current = afterDrawn(() => {
          capture.current = null;
          const live = liveLayer.current;
          const el = box.current;
          if (current.current !== 'live' || !live || !el) return;
          const drawing = stillOf(live, width, el);
          if (snapshot !== undefined) stills.put(snapshot, drawing);
          setStill({ drawing, fresh: true });
          settle('ready');
        });
      },
      fail: () => {
        if (current.current === 'failed') return;
        capture.current?.();
        capture.current = null;
        if (snapshot !== undefined && !frame) stills.put(snapshot, 'failed');
        settle('failed');
      },
    }),
    [frame, width, snapshot, stills, settle],
  );

  // THE COPY IN ITS BOX: placed (or, where another preview shows the same
  // copy, a copy of it), and scaled to the box by the page's one shared
  // observer (`LivePreviewStills.watch`). A copy with no layout width is good at the size it was drawn
  // at only, so a box that changes size draws it again.
  useLayoutEffect(() => {
    const target = stillLayer.current;
    const el = box.current;
    if (!still || !target || !el) return undefined;
    const { drawing } = still;
    const placed = drawing.nodes.some((n) => n.isConnected) ? copyOf(drawing.nodes) : drawing.nodes;
    if (drawing.width === undefined) {
      target.replaceChildren(...placed);
      return stills.watch(el, (size) => {
        if (Math.abs(size.w - drawing.size.w) < 1 && Math.abs(size.h - drawing.size.h) < 1) return;
        if (snapshot !== undefined) stills.forget(snapshot);
        setStill(null);
        setState('idle');
      });
    }
    const outer = target.ownerDocument.createElement('span');
    outer.className = 'crewlet-preview-scale';
    const layer = target.ownerDocument.createElement('span');
    layer.className = 'crewlet-preview-scale__layer';
    layer.append(...placed);
    outer.append(layer);
    target.replaceChildren(outer);
    const scale = (size: { w: number; h: number }) => {
      if (size.w <= 0) return;
      const fitted = fitTo(size, drawing.width!, undefined, 'width');
      layer.style.width = `${fitted.width}px`;
      layer.style.height = `${fitted.height}px`;
      layer.style.transform = fitted.transform;
    };
    const rect = el.getBoundingClientRect();
    scale({ w: rect.width, h: rect.height });
    return stills.watch(el, scale);
  }, [still, snapshot, stills]);

  useEffect(() => onStateChange?.(state), [state, onStateChange]);

  const mounted = state === 'live' || (frame && state === 'ready');

  return (
    <span
      ref={box}
      className={cx('crewlet-live-preview', className)}
      data-state={state}
      data-still={still ? '' : undefined}
      data-fresh={still?.fresh ? '' : undefined}
      data-frame={frame ? '' : undefined}
      aria-hidden="true"
    >
      <span className="crewlet-live-preview__fallback">{fallback}</span>
      {still ? <span ref={stillLayer} className="crewlet-live-preview__still" inert /> : null}
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
   * page); `contain` scales it to fit inside the box whole, centred; `fill`
   * covers the box edge to edge, centred across and held at the top, wherever
   * that leaves at most [PREVIEW_FILL_MAX_CUT] of the content outside it, and
   * contains it otherwise (a design's board, which may be a laptop's screen
   * or a phone's). `contain` and `fill` need a `height`.
   */
  fit?: PreviewFit | undefined;
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
  const layer: CSSProperties = size ? fitTo(size, width, height, fit) : { width, visibility: 'hidden' };
  return (
    <span ref={box} className="crewlet-preview-scale">
      <span className="crewlet-preview-scale__layer" style={layer}>
        {children}
      </span>
    </span>
  );
}
