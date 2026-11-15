/**
 * A pannable, zoomable viewport's geometry as pure functions, so jsdom suites
 * can test it. A world point `p` is drawn at `p * k + (x, y)`, and a fit too
 * tall for the viewport aligns to the top, where a tree's root is.
 */

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasRect extends CanvasPoint, CanvasSize {}

/** A world point `p` is drawn at `p * k + (x, y)`. */
export interface CanvasView {
  x: number;
  y: number;
  k: number;
}

/** No pan and no zoom: what a canvas shows before it has been fitted. */
export const IDENTITY_VIEW: CanvasView = { x: 0, y: 0, k: 1 };

/**
 * The smallest zoom for content not yet measured; once it is measured, the
 * floor is the fit itself ([zoomLimits]).
 */
export const CANVAS_MIN_ZOOM = 0.25;

/**
 * The smallest a canvas's largest zoom may be, for content whose items were
 * never measured; normally one item filling the viewport sets it.
 */
export const CANVAS_MAX_ZOOM = 2;

/**
 * The largest zoom any canvas will go to, however small its largest item, so a
 * wheel notch never pans across the whole content.
 */
export const CANVAS_ZOOM_CEILING = 8;

/**
 * The visible width, as a multiple of the region's own, that [regionView] gives
 * a focused region: it fills the middle third with its surroundings in view.
 */
export const CANVAS_FOCUS_CONTEXT = 3;

/**
 * The visible width for a region a reader types into (a node being composed):
 * one and a half times its own, so its form is drawn near actual size.
 */
export const CANVAS_COMPOSE_CONTEXT = 1.5;

/** A fit shows everything at no more than actual size: a small tree is not blown up. */
export const CANVAS_FIT_MAX_ZOOM = 1;

/**
 * One zoom step, for a key press or a button: a fifth. Small enough that two
 * presses are a deliberate change rather than a jump, large enough that going
 * from the smallest zoom to actual size takes eight presses, not twenty.
 */
export const CANVAS_ZOOM_STEP = 1.2;

/**
 * Wheel zoom per pixel of delta, so one mouse-wheel notch (about 100 pixels)
 * is exactly one `CANVAS_ZOOM_STEP`.
 */
export const CANVAS_WHEEL_ZOOM_PER_PIXEL = Math.log2(CANVAS_ZOOM_STEP) / 100;

/** What a wheel "line" is in pixels, for devices that report lines. */
export const CANVAS_WHEEL_LINE_PX = 16;

/**
 * How much content stays on screen however far it is panned: about one card
 * edge, which is enough to see where the chart went and to grab it back.
 */
export const CANVAS_PAN_MARGIN = 48;

/** Space kept around the content by a fit, so the outermost cards do not touch the edge. */
export const CANVAS_FIT_PADDING = 24;

/** Space kept around a revealed item, so focus never lands on a card cut by the edge. */
export const CANVAS_REVEAL_PADDING = 24;

/** How far an arrow key pans a focused viewport: roughly half a card, so a press is visible. */
export const CANVAS_PAN_STEP = 64;

/**
 * How far a press may travel and still be a click or a tap rather than a drag.
 * A mouse is precise; a finger rolls several pixels while it rests, and a slop
 * sized for a mouse would turn every tap into a tiny pan.
 */
export const CANVAS_TAP_SLOP = { mouse: 4, pen: 4, touch: 10 } as const;

/** How far a canvas may be zoomed out and in: see [zoomLimits]. */
export interface CanvasZoomLimits {
  min: number;
  max: number;
}

/** What a canvas allows before its content has been measured. */
export const CANVAS_ZOOM_LIMITS: CanvasZoomLimits = { min: CANVAS_MIN_ZOOM, max: CANVAS_MAX_ZOOM };

/**
 * How far this content may be zoomed: out to its fit ([fitView] with `floor`,
 * or `floor` itself unmeasured) and in until its widest item (`largestItem`)
 * fills the viewport, between [CANVAS_MAX_ZOOM] and [CANVAS_ZOOM_CEILING].
 */
export function zoomLimits(
  content: CanvasRect | null,
  viewport: CanvasSize,
  largestItem?: number,
  padding: number = CANVAS_FIT_PADDING,
  floor: number = CANVAS_MIN_ZOOM,
): CanvasZoomLimits {
  const measured = content !== null && viewport.width > 0 && viewport.height > 0;
  const min = measured ? fitView(content, viewport, padding, floor).k : floor;
  const room = viewport.width - 2 * padding;
  const wanted =
    largestItem !== undefined && largestItem > 0 && room > 0 ? room / largestItem : CANVAS_MAX_ZOOM;
  const max = Math.min(CANVAS_ZOOM_CEILING, Math.max(CANVAS_MAX_ZOOM, wanted));
  // A floor above the ceiling is not a range: a viewport too small for its own
  // content at the ceiling keeps the ceiling, because the fit is what it can
  // actually draw.
  return { min: Math.min(min, max), max };
}

export function clampZoom(k: number, limits: CanvasZoomLimits = CANVAS_ZOOM_LIMITS): number {
  return Math.min(limits.max, Math.max(limits.min, k));
}

/** Where a world point is drawn, in viewport coordinates. */
export function toScreen(view: CanvasView, point: CanvasPoint): CanvasPoint {
  return { x: point.x * view.k + view.x, y: point.y * view.k + view.y };
}

/** Which world point a viewport coordinate sits over. */
export function toWorld(view: CanvasView, point: CanvasPoint): CanvasPoint {
  return { x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k };
}

/** A world rectangle as it is drawn, in viewport coordinates. */
export function screenRect(view: CanvasView, rect: CanvasRect): CanvasRect {
  const at = toScreen(view, rect);
  return { x: at.x, y: at.y, width: rect.width * view.k, height: rect.height * view.k };
}

export function panBy(view: CanvasView, dx: number, dy: number): CanvasView {
  return { x: view.x + dx, y: view.y + dy, k: view.k };
}

/** Zoom by `factor` about `focus` (a viewport point), which stays still. */
export function zoomAt(
  view: CanvasView,
  factor: number,
  focus: CanvasPoint,
  limits: CanvasZoomLimits = CANVAS_ZOOM_LIMITS,
): CanvasView {
  const k = clampZoom(view.k * factor, limits);
  const ratio = k / view.k;
  return {
    x: focus.x - (focus.x - view.x) * ratio,
    y: focus.y - (focus.y - view.y) * ratio,
    k,
  };
}

/**
 * The same view, panned no further than leaves `margin` of the content on
 * screen on each axis. A view that already satisfies it comes back unchanged.
 */
export function clampPan(
  view: CanvasView,
  content: CanvasRect,
  viewport: CanvasSize,
  margin: number = CANVAS_PAN_MARGIN,
): CanvasView {
  const axis = (offset: number, start: number, length: number, room: number): number => {
    const drawn = length * view.k;
    // Never demand more margin than the content or the viewport has.
    const kept = Math.max(0, Math.min(margin, drawn, room));
    const lowest = kept - (start + length) * view.k;
    const highest = room - kept - start * view.k;
    return Math.min(highest, Math.max(lowest, offset));
  };
  return {
    x: axis(view.x, content.x, content.width, viewport.width),
    y: axis(view.y, content.y, content.height, viewport.height),
    k: view.k,
  };
}

/**
 * The view that shows all of `content`, centred, at no more than actual size
 * and no less than `floor`: a chart of cards keeps [CANVAS_MIN_ZOOM], a canvas
 * of wide pages names a lower one.
 */
export function fitView(
  content: CanvasRect,
  viewport: CanvasSize,
  padding: number = CANVAS_FIT_PADDING,
  floor: number = CANVAS_MIN_ZOOM,
): CanvasView {
  if (viewport.width <= 0 || viewport.height <= 0) return IDENTITY_VIEW;
  const roomX = Math.max(0, viewport.width - 2 * padding);
  const roomY = Math.max(0, viewport.height - 2 * padding);
  const scaleX = content.width > 0 ? roomX / content.width : Infinity;
  const scaleY = content.height > 0 ? roomY / content.height : Infinity;
  const k = Math.max(floor, Math.min(CANVAS_FIT_MAX_ZOOM, scaleX, scaleY));
  const drawnHeight = content.height * k;
  const x = (viewport.width - content.width * k) / 2 - content.x * k;
  // TOP ALIGNED when it cannot fit: see the module doc.
  const y =
    drawnHeight <= roomY ? (viewport.height - drawnHeight) / 2 - content.y * k : padding - content.y * k;
  return { x, y, k };
}

/**
 * The smallest pan that brings `target` inside the padded viewport, at the same
 * zoom. A target wholly outside lands just inside the edge it came in by
 * (`edge`) or in the middle (`centre`, for a reader sent there from elsewhere).
 */
export function revealView(
  view: CanvasView,
  target: CanvasRect,
  viewport: CanvasSize,
  padding: number = CANVAS_REVEAL_PADDING,
  outside: 'edge' | 'centre' = 'edge',
): CanvasView {
  const drawn = screenRect(view, target);
  const off = (start: number, length: number, room: number) => start + length <= 0 || start >= room;
  const centre =
    outside === 'centre' && (off(drawn.x, drawn.width, viewport.width) || off(drawn.y, drawn.height, viewport.height));
  const axis = (offset: number, start: number, length: number, room: number): number => {
    const low = padding;
    const high = room - padding;
    // Larger than the room: show its start, which is where its label is.
    if (length > high - low) return offset + (low - start);
    if (centre) return offset + (room / 2 - (start + length / 2));
    if (start < low) return offset + (low - start);
    if (start + length > high) return offset - (start + length - high);
    return offset;
  };
  return {
    x: axis(view.x, drawn.x, drawn.width, viewport.width),
    y: axis(view.y, drawn.y, drawn.height, viewport.height),
    k: view.k,
  };
}

/**
 * The view that draws world point `after` where `before` was drawn, so a node
 * a relayout moves stays still on screen.
 */
export function anchorView(view: CanvasView, before: CanvasPoint, after: CanvasPoint): CanvasView {
  return panBy(view, (before.x - after.x) * view.k, (before.y - after.y) * view.k);
}

/** Where a two-pointer gesture began. */
export interface PinchStart {
  view: CanvasView;
  a: CanvasPoint;
  b: CanvasPoint;
}

/**
 * The view for a pinch moved from `start` to `a` and `b`: the spread scales the
 * zoom, and the world point under the first midpoint follows the current one.
 */
export function pinchView(
  start: PinchStart,
  a: CanvasPoint,
  b: CanvasPoint,
  limits: CanvasZoomLimits = CANVAS_ZOOM_LIMITS,
): CanvasView {
  const spread = (p: CanvasPoint, q: CanvasPoint) => Math.hypot(p.x - q.x, p.y - q.y);
  const was = spread(start.a, start.b);
  // Two pointers on one spot have no spread to scale by.
  const factor = was < 1 ? 1 : spread(a, b) / was;
  const k = clampZoom(start.view.k * factor, limits);
  const from = { x: (start.a.x + start.b.x) / 2, y: (start.a.y + start.b.y) / 2 };
  const to = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const world = toWorld(start.view, from);
  return { x: to.x - world.x * k, y: to.y - world.y * k, k };
}

/** The minimal slice of a WheelEvent these functions read. */
export interface WheelLike {
  deltaX: number;
  deltaY: number;
  /** 0 pixels, 1 lines, 2 pages. */
  deltaMode: number;
  shiftKey?: boolean;
}

/**
 * A wheel event's movement in pixels.
 *
 * Normalised across delta modes, and with Shift turning a vertical wheel into
 * a horizontal pan on platforms that do not already do that themselves.
 */
export function wheelPixels(event: WheelLike, pageHeight: number): CanvasPoint {
  const unit = event.deltaMode === 1 ? CANVAS_WHEEL_LINE_PX : event.deltaMode === 2 ? pageHeight : 1;
  const dx = event.deltaX * unit;
  const dy = event.deltaY * unit;
  if (event.shiftKey && dx === 0) return { x: dy, y: 0 };
  return { x: dx, y: dy };
}

/** The zoom factor for a vertical wheel movement of `dy` pixels (up zooms in). */
export function wheelZoomFactor(dy: number): number {
  return Math.pow(2, -dy * CANVAS_WHEEL_ZOOM_PER_PIXEL);
}

/** Whether a press that went from `a` to `b` has become a drag. */
export function beyondSlop(a: CanvasPoint, b: CanvasPoint, pointerType: string): boolean {
  const slop = CANVAS_TAP_SLOP[pointerType as keyof typeof CANVAS_TAP_SLOP] ?? CANVAS_TAP_SLOP.mouse;
  return Math.hypot(b.x - a.x, b.y - a.y) > slop;
}

/**
 * The view that centres one world rectangle with room around it: the region
 * gets 1/`context` of the visible width, clamped to `limits` and `ceiling`. A
 * region holding a form passes [CANVAS_FIT_MAX_ZOOM] so it is never enlarged.
 */
export function regionView(
  region: CanvasRect,
  viewport: CanvasSize,
  limits: CanvasZoomLimits = CANVAS_ZOOM_LIMITS,
  context: number = CANVAS_FOCUS_CONTEXT,
  ceiling: number = Infinity,
): CanvasView {
  if (viewport.width <= 0 || viewport.height <= 0 || region.width <= 0 || region.height <= 0) {
    return IDENTITY_VIEW;
  }
  const byWidth = viewport.width / (region.width * context);
  const byHeight = viewport.height / (region.height * context);
  const k = clampZoom(Math.min(byWidth, byHeight, ceiling), limits);
  return {
    x: viewport.width / 2 - (region.x + region.width / 2) * k,
    y: viewport.height / 2 - (region.y + region.height / 2) * k,
    k,
  };
}
