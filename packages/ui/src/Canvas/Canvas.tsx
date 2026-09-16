/**
 * A bounded, pannable and zoomable viewport over positioned content.
 *
 * WHY IT EXISTS. A hierarchy drawn as a chart grows wider than any screen, and
 * the page's own scroller is the wrong instrument for it: an application shell
 * usually has exactly one element allowed to scroll, and a chart that scrolled
 * it sideways would fight the router's scroll memory and every other screen's
 * layout. So the chart lives in its own viewport, the geometry of moving
 * around it is `geometry.ts`, and this component is the wiring from pointers,
 * wheels and keys to that geometry.
 *
 * THE RULES IT KEEPS.
 *
 * - IT FILLS THE HEIGHT ITS CONTAINER GIVES IT and never grows the page. A
 *   screen that wants a full height canvas gives it a full height box.
 * - THE PAGE STILL SCROLLS. A plain wheel pans the canvas only while focus is
 *   inside it; otherwise the wheel belongs to the page, so a reader scrolling
 *   down is never caught by a chart passing under the pointer. Ctrl or Command
 *   with the wheel zooms toward the cursor wherever the pointer is, which is
 *   also what a trackpad pinch sends.
 * - TOUCH IS OPT IN. Until the canvas is tapped, one finger scrolls the page
 *   (`touch-action: pan-y`); a tap activates it, one finger then pans, and a
 *   visible Done control hands the finger back to the page. Two fingers pinch
 *   toward their midpoint at any time, because two fingers are never a scroll.
 * - THE ZOOM KEYS ARE THE CANVAS'S, WHEREVER FOCUS IS INSIDE IT: `+`, `-` and
 *   `0` (and Ctrl or Command with `=`, `-` and `0`) work on an item as well as
 *   on the viewport, because the tab stop a chart hands out is an ITEM and a
 *   reader who has navigated the content is exactly the reader who wants to
 *   zoom it. They are in no other keyboard pattern here, so there is nothing
 *   for them to collide with. The PAN keys are the viewport's own: the arrows
 *   belong to whatever holds focus, so a tree's navigation and a listbox's
 *   selection are never eaten. A text field inside keeps every key it is sent.
 * - HOW FAR IT ZOOMS IS THE CONTENT'S ANSWER: out as far as the fit, because
 *   there is nothing beyond the whole chart to see, and in until the largest
 *   item fills the pane, because that is what a reader pressing Zoom in is
 *   asking for. See `zoomLimits`.
 * - THE ZOOM SAYS WHAT IT IS, between the two steppers, and a reader can type
 *   one. A zoom has a value as well as a direction, and two chevrons say only
 *   the direction: without the readout, getting back to actual size from a
 *   stray pinch is pressing a chevron until it looks right. What is typed goes
 *   through the same clamp as every other zoom.
 * - A FOCUSED ITEM IS NEVER SCROLLED INTO VIEW BEHIND THE TRANSFORM'S BACK.
 *   The viewport clips rather than scrolls, but a browser still scrolls a
 *   clipping box to show a focused descendant; that scroll is converted into a
 *   pan and reset, so the transform stays the one source of truth.
 * - ITS CHROME IS ONE GROUP IN ONE CORNER: the zoom bar, whatever the caller
 *   adds to the end of it, and whatever bars it stacks under it. Everything in
 *   that group acts on the canvas, so it is drawn beside the canvas rather
 *   than in the page's own toolbar.
 * - ITS OVERLAY IS A LayerHost. The untransformed layer over the viewport is
 *   the portal target for every menu, popover and picker opened from an item
 *   inside, so each is placed from its anchor's viewport rectangle rather than
 *   scaled by the zoom or clipped inside a card. The host receives
 *   `LAYER_REPOSITION_EVENT` whenever the content moves beneath it, which is
 *   how an open surface follows its anchor through a pan or a zoom.
 * - FIT HAPPENS ONCE, on the first layout that has both a measured viewport
 *   and content bounds, and again only on request. A data push that changes
 *   the content never moves the operator's view, and nothing is shown before
 *   that first fit.
 * - MOTION ONLY ON REQUEST. A fit, a zoom button or a reveal eases; a drag, a
 *   pinch, a wheel and a relayout anchor never do, and under reduced motion
 *   nothing does. An easing lasts as long as its transition: a clamp that
 *   arrives while one runs (a data push) rides along with it, and one that
 *   arrives after it has settled moves at once, as any move nobody asked for
 *   must. A request that moves nothing starts no easing.
 *
 * Pointer capture is used where the browser has it and the drag is tracked on
 * the window either way, so a drag that leaves the viewport keeps panning.
 * Fullscreen is not this component's concern: a surface that goes fullscreen
 * must take its dialogs and toasts with it, so the screen that owns those
 * decides.
 *
 * Ported from the engine dashboard's `ui/Canvas.tsx`, with its suite.
 */

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type TransitionEvent as ReactTransitionEvent,
} from 'react';
import { FitScreenGlyph, ZoomInGlyph, ZoomOutGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { IconButton } from '../IconButton/index.js';
import { LAYER_REPOSITION_EVENT, LayerHost } from '../Layer/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { LayerNodeBridge } from './layerNode.js';
import {
  CANVAS_PAN_STEP,
  CANVAS_ZOOM_STEP,
  IDENTITY_VIEW,
  anchorView,
  beyondSlop,
  clampPan,
  fitView,
  panBy,
  pinchView,
  regionView,
  revealView,
  screenRect,
  wheelPixels,
  wheelZoomFactor,
  zoomAt,
  zoomLimits,
  type CanvasPoint,
  type CanvasRect,
  type CanvasSize,
  type CanvasView,
  type PinchStart,
} from './geometry.js';

/**
 * How a view change moves: a correction to where the reader already is, or the
 * chart travelling somewhere else. See the state that holds it, below.
 */
export type CanvasEase = 'near' | 'travel';

/** What a screen can ask of a canvas it holds a ref to. */
export interface CanvasHandle {
  /** Show all of the content. Eases, unless reduced motion is set. */
  fit(): void;
  /** Zoom about the viewport centre. */
  zoomBy(factor: number): void;
  /** Pan the least distance that brings a world rectangle into view. */
  reveal(target: CanvasRect): void;
  /** Keep a node still on screen across a relayout: see `anchorView`. */
  anchor(before: CanvasPoint, after: CanvasPoint): void;
  /**
   * Ease onto one world rectangle, remembering the view it left.
   *
   * For a surface that is about one item and has to say WHERE that item is:
   * the chart moves to it, leaves room around it (`regionView`), and gives the
   * reader their own view back on [restoreView]. Calling it twice remembers
   * only the first view, so a second region is still left by one restore.
   *
   * `context` is how many times the region's own width the visible width comes
   * to: [CANVAS_FOCUS_CONTEXT] unless it is named, and
   * [CANVAS_COMPOSE_CONTEXT] for a region a reader has to type into rather
   * than merely look at. `ceiling` is how far in the ease may zoom, for a
   * region with a size of its own to respect: see [regionView].
   */
  focusRegion(target: CanvasRect, context?: number, ceiling?: number): void;
  /**
   * Remember the view the reader is on NOW, as the one [restoreView] gives
   * back, without moving anything.
   *
   * FOR A REGION THAT DOES NOT EXIST YET. [focusRegion] remembers the view it
   * leaves, which is the right moment whenever the thing being eased onto was
   * already on the chart. A node being COMPOSED is not: its card has to be
   * added to the content and measured before there is a rectangle to ease
   * onto, and the content growing is itself a change the canvas answers by
   * keeping what it holds reachable. So by the time `focusRegion` could be
   * called, the view is no longer the one the reader was on, and what came
   * back afterwards was the chart as the GHOST had left it. Measured on the
   * engine's own builder: 198px sideways, every time an add was cancelled.
   *
   * Calling it twice keeps the first view, as [focusRegion] does.
   */
  rememberView(): void;
  /** Ease back to the view [focusRegion] left, if it has not been given back already. */
  restoreView(): void;
  /** A world rectangle in viewport coordinates, for positioning an overlay. */
  screenRect(target: CanvasRect): CanvasRect;
}

/** Every string the canvas renders on its own. */
export interface CanvasLabels {
  zoomIn: string;
  zoomOut: string;
  fit: string;
  /**
   * The zoom readout, given the zoom as a whole percentage. It is also what
   * opens the box a reader types one into, so it says both.
   */
  zoom: (percent: number) => string;
  /** The box a reader types a zoom into. */
  zoomLevel: string;
  /** The control that hands one finger back to the page. */
  done: string;
  /** Read after the canvas's name, so a keyboard reader learns its keys. */
  keys: string;
}

const LABELS: CanvasLabels = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit to view',
  zoom: (percent) => `Zoom is ${percent} percent. Set a zoom level`,
  zoomLevel: 'Zoom level, percent',
  done: 'Done',
  keys: 'Plus and minus zoom this canvas and zero fits everything in view. With the canvas itself focused, the arrow keys pan it.',
};

/** Controls that take a press themselves, so a press on one never starts a pan. */
const INTERACTIVE = "button, a[href], input, select, textarea, [contenteditable='true'], label";

/** Where a key is a character being typed rather than an instruction to the canvas. */
const TYPING = "input, textarea, select, [contenteditable='true']";

interface Press {
  kind: 'press';
  id: number;
  type: string;
  start: CanvasPoint;
  view: CanvasView;
  dragging: boolean;
}

interface Pinching {
  kind: 'pinch';
  start: PinchStart;
  ids: [number, number];
}

export interface CanvasProps {
  /** The accessible name of the viewport, such as "Organization chart". */
  label: string;
  /** The laid out content's bounds in world units, or null until it has been measured. */
  content: CanvasRect | null;
  /** The positioned content: the layer that is panned and zoomed. */
  children: ReactNode;
  /**
   * Anything drawn over the viewport without the transform, such as a note
   * about what the chart is showing.
   *
   * THE LAYER IS INERT AND ITS CHILDREN ARE NOT. Empty space passes a press
   * through to the viewport beneath, but each child takes its own presses
   * back, because a control drawn here has to be pressable. So a note that
   * must not swallow the drag that pans the chart sets `pointer-events: none`
   * on itself.
   */
  overlay?: ReactNode;
  /** The zoom out, zoom in and fit controls. */
  controls?: boolean | undefined;
  /**
   * Which corner the controls sit in.
   *
   * `top-right` is where a chart's own toolbar belongs, and where the console
   * org chart puts it: out of the way of the content, which a tree grows
   * DOWNWARD from its root, and beside the first place a reader looks after
   * the root itself.
   */
  controlsPlacement?: 'top-right' | 'bottom-right' | undefined;
  /**
   * Anything else in the control bar, drawn after the zoom controls: a
   * fullscreen toggle, a print, a download. It is in the bar rather than in
   * the page's own toolbar because it acts on the CANVAS, and a control that
   * acts on the canvas from 800px away is a control nobody finds.
   */
  controlsExtra?: ReactNode | undefined;
  /**
   * Bars of the caller's own, stacked under the control bar in the same
   * corner: a switch between two drawings of the content, a note about a key.
   * Each is a surface of its own, as the bar is.
   */
  controlsBelow?: ReactNode | undefined;
  /**
   * A note under the controls, about a key or a state: "Press Esc to leave
   * fullscreen".
   *
   * DECORATION, AND AN ANNOUNCEMENT. It takes no press and no tab stop, so it
   * never comes between a reader and the chart; it is a `status` region, so a
   * canvas that puts one up when it enters a state a reader cannot see out of
   * says so to a reader who cannot see it either. Give it a node whose content
   * comes and goes rather than the node itself: the region stays in the
   * document while it is empty, and a live region that was already there when
   * its message arrives is a message a screen reader announces.
   */
  hint?: ReactNode | undefined;
  /**
   * The width, in world units, of the largest single item the content draws.
   *
   * It is what the largest zoom is derived from ([zoomLimits]): a reader who
   * keeps pressing Zoom in is asking to look at one item, so the ceiling is
   * the zoom that gives them one. Unset, the fixed ceiling stands.
   */
  largestItemWidth?: number | undefined;
  /**
   * Pushes the content back, for a surface opened OVER the canvas that is
   * about one part of it.
   *
   * The content is blurred and faded rather than covered, so the chart is
   * still there behind the decision being made about it, which is what the
   * console chart does while a node is being added. It is a state rather than
   * an entrance, so a reader who asked for less motion simply gets it.
   */
  dimmed?: boolean | undefined;
  /**
   * Whether one finger can pan the canvas at all.
   *
   * On by default, behind the tap that activates it. Turned off, one finger
   * always belongs to the page and only a two finger pinch reaches the canvas,
   * which is what a chart embedded in a long scrolling page wants.
   */
  touch?: boolean | undefined;
  /** Every string the canvas renders itself, for another language. */
  labels?: Partial<CanvasLabels> | undefined;
  /** Called once, when the first measured layout has been fitted. */
  onReady?: (() => void) | undefined;
  ref?: Ref<CanvasHandle> | undefined;
  className?: string | undefined;
}

export function Canvas({
  label,
  content,
  children,
  overlay,
  controls = true,
  controlsPlacement = 'bottom-right',
  controlsExtra,
  controlsBelow,
  hint,
  largestItemWidth,
  dimmed = false,
  touch = true,
  labels,
  onReady,
  ref,
  className,
}: CanvasProps) {
  const helpId = useId();
  const text = { ...LABELS, ...labels };
  const viewport = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  const [view, setView] = useState<CanvasView>(IDENTITY_VIEW);
  /*
   * WHICH EASE THE WORLD IS RUNNING, rather than whether it is running one.
   *
   * `near` is a CORRECTION to a view the reader already has: a fit, a zoom
   * step, the least pan that brings something into view. It lands quickly
   * because nothing about it is news.
   *
   * `travel` is the chart GOING SOMEWHERE ELSE, which is a gesture rather than
   * a correction: the reader asked about one node, or is composing one, and
   * what the movement says is WHERE that place is. At the near step it read as
   * a jump and the journey was lost, which is the whole of what it is for. See
   * the stylesheet for the two durations and where they come from.
   */
  const [animate, setAnimate] = useState<CanvasEase | false>(false);
  const [ready, setReady] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const [panning, setPanning] = useState(false);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  // Mirrors of state for handlers registered once. A pan runs at pointer
  // frequency, and re-registering window listeners per frame would drop moves.
  const viewNow = useRef(view);
  const sizeNow = useRef(size);
  const contentNow = useRef(content);
  const touchNow = useRef(touchActive);
  contentNow.current = content;
  touchNow.current = touchActive;
  sizeNow.current = size;

  /*
   * HOW FAR THIS CHART MAY BE ZOOMED, which is a fact about the content and
   * the viewport rather than a constant: out as far as the fit and no further,
   * in until one card fills the pane. Read through a ref for the reason every
   * other piece of state here is, and recomputed on every render because all
   * three of its inputs are already render state.
   */
  const limits = zoomLimits(content, size, largestItemWidth);
  const limitsNow = useRef(limits);
  limitsNow.current = limits;

  /* The view a `focusRegion` left, to be given back on `restoreView`. */
  const left = useRef<CanvasView | null>(null);

  // `eased` says whether this move eases; left out, the move keeps whatever
  // motion is under way, so a clamp run by a data push never cuts short the
  // easing of a fit the operator just asked for.
  const apply = useCallback((next: CanvasView, eased?: CanvasEase | false) => {
    const bounds = contentNow.current;
    const clamped = bounds ? clampPan(next, bounds, sizeNow.current) : next;
    const was = viewNow.current;
    // Unchanged is not a change: a resize or a data push that leaves the view
    // where it was must not tell the overlay that anything moved, and a
    // request that moves nothing must neither start an easing (no transition
    // would ever end it) nor cut short one already running.
    if (clamped.x === was.x && clamped.y === was.y && clamped.k === was.k) return;
    if (eased !== undefined) setAnimate(eased);
    viewNow.current = clamped;
    setView(clamped);
  }, []);

  // ---- the viewport's own size ---------------------------------------------
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- fit once, on the first layout that can be fitted ---------------------
  const announceReady = useRef(onReady);
  announceReady.current = onReady;
  useLayoutEffect(() => {
    if (ready || !content || size.width <= 0 || size.height <= 0) return;
    const first = fitView(content, size);
    viewNow.current = first;
    setView(first);
    setReady(true);
    announceReady.current?.();
  }, [ready, content, size]);

  // A resize, or content that changed shape, keeps the view and only makes
  // sure the content is still reachable: a data push never refits.
  useLayoutEffect(() => {
    if (ready) apply(viewNow.current);
  }, [ready, size, content, apply]);

  // ---- tell the overlay that the content moved ------------------------------
  useLayoutEffect(() => {
    layer?.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT, { detail: view }));
  }, [view, layer]);

  // AN EASING ENDS WITH ITS TRANSITION. Only the world's own transform counts,
  // not a transition inside a card that bubbled up. The overlay is told once
  // more, because a surface placed from an item's rectangle while the world
  // was easing measured the item where the move began, not where it came to
  // rest.
  const settled = (event: ReactTransitionEvent<HTMLDivElement>) => {
    // The world also transitions its blur and its fade when the content is
    // pushed back, and neither of those is the move this is waiting for.
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    setAnimate(false);
    layer?.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT, { detail: viewNow.current }));
  };

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        const bounds = contentNow.current;
        if (bounds) apply(fitView(bounds, sizeNow.current), 'near');
      },
      zoomBy: (factor) => {
        const { width, height } = sizeNow.current;
        apply(zoomAt(viewNow.current, factor, { x: width / 2, y: height / 2 }, limitsNow.current), 'near');
      },
      reveal: (target) => {
        const next = revealView(viewNow.current, target, sizeNow.current);
        if (next.x !== viewNow.current.x || next.y !== viewNow.current.y) apply(next, 'near');
      },
      anchor: (before, after) => apply(anchorView(viewNow.current, before, after), false),
      rememberView: () => {
        left.current ??= viewNow.current;
      },
      focusRegion: (target, context, ceiling) => {
        // The FIRST view is the one to give back: a second region while a
        // surface is open is still one surface, opened from where the reader
        // was standing before any of it.
        left.current ??= viewNow.current;
        apply(regionView(target, sizeNow.current, limitsNow.current, context, ceiling), 'travel');
      },
      restoreView: () => {
        const was = left.current;
        if (!was) return;
        left.current = null;
        apply(was, 'travel');
      },
      screenRect: (target) => screenRect(viewNow.current, target),
    }),
    [apply],
  );

  // ---- the wheel -------------------------------------------------------------
  // A native, non-passive listener: React's wheel handler is passive and
  // cannot stop the page from zooming or scrolling.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      if (!contentNow.current || !el) return;
      const rect = el.getBoundingClientRect();
      const moved = wheelPixels(event, sizeNow.current.height);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const focus = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        apply(zoomAt(viewNow.current, wheelZoomFactor(moved.y), focus, limitsNow.current), false);
        return;
      }
      if (!el.contains(document.activeElement)) return;
      event.preventDefault();
      apply(panBy(viewNow.current, -moved.x, -moved.y), false);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [apply]);

  // ---- pointers --------------------------------------------------------------
  const pointers = useRef(new Map<number, CanvasPoint>());
  const gesture = useRef<Press | Pinching | null>(null);

  const local = useCallback((event: { clientX: number; clientY: number }): CanvasPoint => {
    const rect = viewport.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }, []);

  const endGesture = useCallback(() => {
    gesture.current = null;
    setPanning(false);
  }, []);

  // CAPTURED ONLY ONCE IT IS A GESTURE. A browser dispatches the click that
  // ends a captured press at the capturing element, so capturing every press
  // on arrival would turn a plain click on an item into a click on the
  // viewport and the item would never hear it.
  const capture = useCallback((id: number) => {
    const el = viewport.current;
    if (!el || typeof el.setPointerCapture !== 'function') return;
    try {
      el.setPointerCapture(id);
    } catch {
      // A pointer the browser has already released cannot be captured; the
      // window listeners still follow it.
    }
  }, []);

  const touchAllowed = useRef(touch);
  touchAllowed.current = touch;

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!pointers.current.has(event.pointerId)) return;
      const at = local(event);
      pointers.current.set(event.pointerId, at);
      const current = gesture.current;
      if (!current) return;
      if (current.kind === 'pinch') {
        const a = pointers.current.get(current.ids[0]);
        const b = pointers.current.get(current.ids[1]);
        if (a && b) apply(pinchView(current.start, a, b, limitsNow.current), false);
        return;
      }
      if (current.id !== event.pointerId) return;
      if (!current.dragging) {
        if (!beyondSlop(current.start, at, current.type)) return;
        // An inactive canvas does not take a finger: the page is scrolling.
        if (current.type === 'touch' && !touchNow.current) {
          endGesture();
          return;
        }
        current.dragging = true;
        setPanning(true);
        capture(current.id);
        // A drag that began on a card's text has started a selection; the
        // chart is moving, so nothing is being selected.
        window.getSelection?.()?.removeAllRanges();
      }
      apply(panBy(current.view, at.x - current.start.x, at.y - current.start.y), false);
    }

    function onUp(event: PointerEvent) {
      if (!pointers.current.delete(event.pointerId)) return;
      const current = gesture.current;
      if (current?.kind === 'press' && current.id === event.pointerId) {
        if (current.dragging) {
          if (viewport.current) swallowNextClick(viewport.current);
        } else if (
          current.type === 'touch' &&
          touchAllowed.current &&
          !touchNow.current &&
          event.type === 'pointerup'
        ) {
          setTouchActive(true);
        }
        endGesture();
      } else if (current?.kind === 'pinch') {
        // One finger lifting ends the pinch rather than turning the other into
        // a pan, which would jump by however far the midpoint had travelled.
        endGesture();
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [apply, capture, endGesture, local]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!ready) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(INTERACTIVE)) return;
    const at = local(event);
    pointers.current.set(event.pointerId, at);
    const touches = [...pointers.current.entries()];
    if (event.pointerType === 'touch' && touches.length >= 2) {
      const [a, b] = touches.slice(-2) as [[number, CanvasPoint], [number, CanvasPoint]];
      capture(a[0]);
      capture(b[0]);
      gesture.current = {
        kind: 'pinch',
        ids: [a[0], b[0]],
        start: { view: viewNow.current, a: a[1], b: b[1] },
      };
      setPanning(true);
      return;
    }
    gesture.current = {
      kind: 'press',
      id: event.pointerId,
      type: event.pointerType || 'mouse',
      start: at,
      view: viewNow.current,
      dragging: false,
    };
  }

  // A tap outside hands a touch activated canvas back to the page.
  useEffect(() => {
    if (!touchActive) return;
    function onOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setTouchActive(false);
    }
    document.addEventListener('pointerdown', onOutside, true);
    return () => document.removeEventListener('pointerdown', onOutside, true);
  }, [touchActive]);

  // A canvas whose touch panning is turned off mid-session hands the finger back.
  useEffect(() => {
    if (!touch) setTouchActive(false);
  }, [touch]);

  // ---- keys -------------------------------------------------------------------
  /*
   * WHOSE KEYS ARE WHOSE.
   *
   * The ZOOM keys are the canvas's wherever focus is inside it. They used to
   * be the viewport ELEMENT's alone, and the tab stop a chart hands out is an
   * item inside the viewport, not the viewport: so a reader who had navigated
   * to a node (which is every reader, after their first arrow key) pressed `+`
   * and nothing happened, while the canvas's own description went on telling
   * them it would. `+`, `-` and `0` are in no other keyboard pattern here,
   * so there is nothing for them to collide with.
   *
   * The PAN keys stay the viewport's own. The arrows belong to whatever holds
   * focus: in a tree they walk the nodes, in a listbox they move the
   * selection, and a canvas that took them would eat both.
   *
   * A TEXT FIELD KEEPS EVERYTHING. `-` and `0` are characters, and a zoom
   * field inside the canvas is the one place both are typed.
   */
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!ready) return;
    const onViewport = event.target === event.currentTarget;
    const target = event.target instanceof Element ? event.target : null;
    if (target !== null && target.closest(TYPING) !== null) return;
    const mod = event.ctrlKey || event.metaKey;
    const { width, height } = sizeNow.current;
    const centre = { x: width / 2, y: height / 2 };
    let handled = true;
    if (event.key === '+' || (mod && event.key === '=')) {
      apply(zoomAt(viewNow.current, CANVAS_ZOOM_STEP, centre, limitsNow.current), 'near');
    } else if (event.key === '-') {
      apply(zoomAt(viewNow.current, 1 / CANVAS_ZOOM_STEP, centre, limitsNow.current), 'near');
    } else if (event.key === '0') {
      if (content) apply(fitView(content, sizeNow.current), 'near');
    } else if (!onViewport) {
      handled = false;
    } else if (!mod && !event.altKey && event.key.startsWith('Arrow')) {
      const step = {
        ArrowLeft: [CANVAS_PAN_STEP, 0],
        ArrowRight: [-CANVAS_PAN_STEP, 0],
        ArrowUp: [0, CANVAS_PAN_STEP],
        ArrowDown: [0, -CANVAS_PAN_STEP],
      }[event.key];
      if (step) apply(panBy(viewNow.current, step[0]!, step[1]!), false);
      else handled = false;
    } else {
      handled = false;
    }
    if (handled) event.preventDefault();
  }

  // ---- a browser's scroll into view becomes a pan -------------------------------
  function onScroll() {
    const el = viewport.current;
    if (!el || (el.scrollLeft === 0 && el.scrollTop === 0)) return;
    const dx = el.scrollLeft;
    const dy = el.scrollTop;
    el.scrollLeft = 0;
    el.scrollTop = 0;
    apply(panBy(viewNow.current, -dx, -dy), false);
  }

  const centreZoom = (factor: number) => {
    const { width, height } = sizeNow.current;
    apply(zoomAt(viewNow.current, factor, { x: width / 2, y: height / 2 }, limitsNow.current), 'near');
  };

  /*
   * A ZOOM SOMEBODY TYPED, as a percentage of actual size. It is applied as a
   * factor rather than set as a scale, so it goes through the one clamp every
   * other zoom goes through and lands on the same bounds: 40 on a canvas whose
   * floor is a quarter is a quarter, not a fortieth, and nothing here has to
   * know what the floor is.
   */
  const zoomToPercent = (percent: number) => {
    if (!Number.isFinite(percent) || percent <= 0) return;
    centreZoom(percent / 100 / viewNow.current.k);
  };

  return (
    <div
      className={cx('crewlet-canvas', className)}
      ref={root}
      data-dimmed={dimmed}
      data-ready={ready}
      data-animate={animate === false ? 'false' : animate}
      data-panning={panning}
      data-touch-active={touchActive}
    >
      <LayerHost className="crewlet-canvas__layer">
        {/*
         * A CANVAS VIEWPORT IS A FOCUSABLE GROUP, which is what the two rules
         * turned off here forbid of a non-interactive role. It has to be: the
         * zoom and pan keys belong to the viewport itself rather than to any
         * item in it, and an element nobody can focus can be told no keys. It
         * is announced as a canvas by aria-roledescription and says what its
         * keys do through aria-describedby, so it reads as an instrument
         * rather than as a div somebody hung handlers on.
         */}
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- see above */}
        <div
          className="crewlet-canvas__viewport"
          ref={viewport}
          tabIndex={0}
          role="group"
          aria-roledescription="canvas"
          aria-label={label}
          aria-describedby={helpId}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
          onScroll={onScroll}
        >
          <div
            className="crewlet-canvas__world"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
            onTransitionEnd={settled}
          >
            {children}
          </div>
        </div>
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        {overlay ? <div className="crewlet-canvas__overlay">{overlay}</div> : null}
        <LayerNodeBridge onNode={setLayer} />
      </LayerHost>
      {(controls || touchActive || controlsBelow || hint) && (
        /*
         * ONE GROUP IN ONE CORNER, as a column of bars: the zoom bar, then
         * whatever the caller stacks under it. The console chart's own
         * arrangement, and the reason it is a column rather than three things
         * the page places itself is that all of them act on the canvas, so
         * they belong beside the canvas and beside each other.
         */
        <div className="crewlet-canvas__controls" data-placement={controlsPlacement}>
          {(controls || touchActive) && (
            <div className="crewlet-canvas__bar">
              {touchActive && (
                <Button size="small" variant="secondary" onClick={() => setTouchActive(false)}>
                  {text.done}
                </Button>
              )}
              {controls && (
                <>
                  <IconButton
                    size="sm"
                    label={text.zoomOut}
                    icon={<ZoomOutGlyph />}
                    onClick={() => centreZoom(1 / CANVAS_ZOOM_STEP)}
                    disabled={!ready}
                  />
                  <ZoomReadout
                    zoom={view.k}
                    onZoom={zoomToPercent}
                    label={text.zoom}
                    fieldLabel={text.zoomLevel}
                    disabled={!ready}
                  />
                  <IconButton
                    size="sm"
                    label={text.zoomIn}
                    icon={<ZoomInGlyph />}
                    onClick={() => centreZoom(CANVAS_ZOOM_STEP)}
                    disabled={!ready}
                  />
                  <IconButton
                    size="sm"
                    label={text.fit}
                    icon={<FitScreenGlyph />}
                    onClick={() => content && apply(fitView(content, sizeNow.current), 'near')}
                    disabled={!ready}
                  />
                  {controlsExtra}
                </>
              )}
            </div>
          )}
          {hint === undefined ? null : (
            <div className="crewlet-canvas__hint" role="status">
              {hint}
            </div>
          )}
          {controlsBelow}
        </div>
      )}
      <VisuallyHidden id={helpId}>{text.keys}</VisuallyHidden>
    </div>
  );
}

/**
 * What the zoom is, and where a reader says what it should be.
 *
 * TWO CONTROLS IN ONE PLACE, and the reason is that a zoom has a value as well
 * as a direction. The buttons either side of it step; between them a reader can
 * SEE where the view stands, which two chevrons never say, and go straight to a
 * number rather than pressing a chevron eight times to get back to actual size.
 *
 * IT IS A BUTTON UNTIL IT IS ASKED FOR, not a box sitting open. A number input
 * parked in a toolbar takes a tab stop on every canvas whether or not anybody
 * ever types in it, and reads as a field somebody must fill in; a button reads
 * as the fact it shows. Pressing it puts a field in its place, Enter applies
 * what was typed, Escape and blur abandon it, and either way focus comes back
 * to the button, so a keyboard reader is never left standing in a control that
 * has just been replaced.
 *
 * The input is TEXT rather than `number`: a spinner in a 4ch box is two targets
 * too small to hit, and the arrow keys belong to the canvas rather than to a
 * stepper nobody asked for. Everything but digits is dropped as it is typed, so
 * there is no such thing as an invalid value to report.
 */
function ZoomReadout({
  zoom,
  onZoom,
  label,
  fieldLabel,
  disabled,
}: {
  zoom: number;
  onZoom: (percent: number) => void;
  label: (percent: number) => string;
  fieldLabel: string;
  disabled: boolean;
}) {
  const percent = Math.round(zoom * 100);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  /*
   * FOCUS FOLLOWS THE SWAP, in the render after it: whichever of the two this
   * control is showing, focusing it inside the handler focuses nothing, because
   * the element being shown has not been put in place yet.
   *
   * Into the field whenever it opens, which is a press away and never a page
   * load, so it is a move the reader asked for rather than the `autoFocus` this
   * package forbids. Back to the button only for a KEY that finished with the
   * field: a blur closed it because the reader went somewhere else, and
   * dragging them back would make the field impossible to leave.
   */
  const returning = useRef(false);
  useLayoutEffect(() => {
    if (typing) {
      field.current?.select();
      field.current?.focus();
      return;
    }
    if (!returning.current) return;
    returning.current = false;
    button.current?.focus();
  }, [typing]);

  const close = (apply: boolean) => {
    returning.current = true;
    setTyping(false);
    if (apply) onZoom(Number.parseInt(draft, 10));
  };

  if (typing) {
    return (
      <input
        className="crewlet-canvas__zoom-field"
        ref={field}
        aria-label={fieldLabel}
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/[^0-9]/g, ''))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            close(true);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            // The canvas's own Escape must not also fire: this one is the
            // field's, and it abandons what was typed rather than anything else.
            event.stopPropagation();
            close(false);
          }
        }}
        onBlur={() => setTyping(false)}
      />
    );
  }
  return (
    <button
      type="button"
      ref={button}
      className="crewlet-canvas__zoom"
      aria-label={label(percent)}
      disabled={disabled}
      onClick={() => {
        setDraft(String(percent));
        setTyping(true);
      }}
    >
      {percent}%
    </button>
  );
}

/**
 * Swallows the click a drag ends with.
 *
 * A drag that started on an item ends in a click on that item, and opening an
 * editor because somebody moved the chart is the canvas lying about what they
 * did. Only a click inside the viewport is swallowed, and the listener goes
 * after one turn of the event loop whether or not a click came, so a later,
 * real click is never eaten.
 */
function swallowNextClick(within: HTMLElement): void {
  const swallow = (event: MouseEvent) => {
    if (!(event.target instanceof Node) || !within.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
}
