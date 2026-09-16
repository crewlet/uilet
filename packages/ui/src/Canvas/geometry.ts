/**
 * The geometry of a pannable, zoomable viewport, as pure functions.
 *
 * WHY IT IS SEPARATE FROM THE COMPONENT. Every rule here is arithmetic a
 * browser-free suite cannot otherwise reach: jsdom has no layout, no pointer
 * capture and no `DOMMatrix`, so a zoom that drifted off the cursor or a fit
 * that cropped the root would pass any component suite. Kept pure, each rule
 * is a function of numbers with a suite of its own, and the component is left
 * with the wiring. `placePopup` in the Layer module is the same idea for the
 * surfaces that float over a canvas.
 *
 * THE MODEL. A view is `{ x, y, k }`: a world point `p` lands on screen at
 * `p * k + (x, y)`, with the origin at the viewport's top left corner. Every
 * function returns a new view and never mutates one.
 *
 * THE RULES IT KEEPS.
 *
 * - A ZOOM KEEPS ITS FOCUS STILL. The world point under the cursor (or the
 *   pinch midpoint, or the viewport centre for a key) stays where it was,
 *   including when the zoom is clamped at a limit.
 * - CONTENT CANNOT BE LOST. A pan leaves at least a margin of the content on
 *   screen on each axis, so nobody drags the chart away and has nothing left
 *   to drag it back by.
 * - A FIT NEVER ENLARGES past one to one, and when the content is too tall to
 *   fit even at the smallest zoom it aligns to the TOP, where a tree's root
 *   is, rather than centring the root off screen.
 * - A REVEAL MOVES AS LITTLE AS IT CAN: nothing when the target is already in
 *   view, otherwise just enough to bring it inside the padding.
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
 * The smallest zoom a canvas with no content to measure will go to. At a
 * quarter size body text is about three pixels tall: past reading, but the
 * shape of the structure and where a card sits in it are still legible.
 *
 * IT IS A BACKSTOP, NOT THE FLOOR. Once the content has been measured the
 * floor is the FIT itself ([zoomLimits]): there is nothing to see past the
 * whole chart, and a reader who has shrunk it to a quarter of that has a
 * screen of grey and no way to tell which way is back. It is what the console
 * chart does, where zooming out lerps toward the fit and snaps to it.
 */
export const CANVAS_MIN_ZOOM = 0.25;

/**
 * The smallest a canvas's largest zoom may be, for content whose own items
 * were never measured.
 *
 * THE CEILING IS NORMALLY THE CONTENT'S ([zoomLimits]): one item filling the
 * viewport, which is the console chart's own ceiling and the answer to "let me
 * look at THIS one". Double size was the ceiling for every chart once, which
 * on a 180px node in a 1267px viewport is a fifth of the magnification a
 * reader can ask for there.
 */
export const CANVAS_MAX_ZOOM = 2;

/**
 * The largest zoom any canvas will go to, however small its largest item.
 *
 * A chart whose widest card is a few dozen pixels would otherwise let a reader
 * zoom to twenty times, where a pan of one wheel notch crosses the whole
 * content and nothing on screen says where they are.
 */
export const CANVAS_ZOOM_CEILING = 8;

/**
 * How much of the viewport a region focused with [regionView] is given: the
 * visible width is this many times the region's own.
 *
 * Three, because the point of easing onto a region is to say where it is as
 * well as what it is: the region fills the middle third and its surroundings
 * are still drawn either side of it. The console chart's own ghost is 280
 * units wide and it eases to a visible width between 660 and 1040, which is
 * 2.4 to 3.7 times.
 */
export const CANVAS_FOCUS_CONTEXT = 3;

/**
 * How much of the viewport a region a reader has to TYPE INTO is given: the
 * visible width is one and a half times the region's own, so it takes two
 * thirds of the pane rather than a third.
 *
 * A region focused because a surface is ABOUT it is being pointed at, and the
 * point is as much where it is as what it is. A node being COMPOSED in the
 * chart is the other thing: its card holds the form, so what is drawn there
 * has to be read and typed into at a size a pointer can hit. Measured on this
 * build, the builder's add form is 320 by 400 and the pane 900 by 700: at
 * [CANVAS_FOCUS_CONTEXT] it is drawn at 0.58 of its own size, with a 24px
 * target landing on 14 screen pixels. At this step it is drawn at 1.16.
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
 * Wheel zoom per pixel of wheel delta, chosen so that one notch of a mouse
 * wheel (which browsers report as about 100 pixels) is exactly one
 * `CANVAS_ZOOM_STEP`: a wheel notch and a key press do the same thing. A
 * trackpad pinch reports small deltas many times a second, which this turns
 * into a smooth zoom.
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
 * How far this content, in this viewport, may be zoomed.
 *
 * THE FLOOR IS THE FIT. Everything there is to see is on screen at the fit, so
 * zooming out past it only shrinks the chart away from the reader; the console
 * chart refuses it outright, and this is that refusal. Before the content has
 * been measured there is no fit to floor at, so the backstop stands.
 *
 * THE CEILING IS ONE ITEM FILLING THE VIEWPORT, which is what a reader asking
 * for more zoom is asking for: to look at THIS card. `largestItem` is the
 * width in world units of the widest one, which the chart above this knows
 * because it measured every card; with none given the fixed ceiling stands. It
 * never goes below that fixed ceiling and never above [CANVAS_ZOOM_CEILING].
 */
export function zoomLimits(
  content: CanvasRect | null,
  viewport: CanvasSize,
  largestItem?: number,
  padding: number = CANVAS_FIT_PADDING,
): CanvasZoomLimits {
  const measured = content !== null && viewport.width > 0 && viewport.height > 0;
  const min = measured ? fitView(content, viewport, padding).k : CANVAS_MIN_ZOOM;
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

/** The view that shows all of `content`, centred, at no more than actual size. */
export function fitView(
  content: CanvasRect,
  viewport: CanvasSize,
  padding: number = CANVAS_FIT_PADDING,
): CanvasView {
  if (viewport.width <= 0 || viewport.height <= 0) return IDENTITY_VIEW;
  const roomX = Math.max(0, viewport.width - 2 * padding);
  const roomY = Math.max(0, viewport.height - 2 * padding);
  const scaleX = content.width > 0 ? roomX / content.width : Infinity;
  const scaleY = content.height > 0 ? roomY / content.height : Infinity;
  const k = Math.max(CANVAS_MIN_ZOOM, Math.min(CANVAS_FIT_MAX_ZOOM, scaleX, scaleY));
  const drawnHeight = content.height * k;
  const x = (viewport.width - content.width * k) / 2 - content.x * k;
  // TOP ALIGNED when it cannot fit: see the module doc.
  const y =
    drawnHeight <= roomY ? (viewport.height - drawnHeight) / 2 - content.y * k : padding - content.y * k;
  return { x, y, k };
}

/** The smallest pan that brings world rectangle `target` inside the padded viewport. */
export function revealView(
  view: CanvasView,
  target: CanvasRect,
  viewport: CanvasSize,
  padding: number = CANVAS_REVEAL_PADDING,
): CanvasView {
  const drawn = screenRect(view, target);
  const axis = (offset: number, start: number, length: number, room: number): number => {
    const low = padding;
    const high = room - padding;
    // Larger than the room: show its start, which is where its label is.
    if (length > high - low) return offset + (low - start);
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
 * The view that draws world point `after` where `before` was drawn.
 *
 * What keeps a node still on screen when a relayout moves it in the world: a
 * card grows, its siblings shift, and the one the operator just acted on stays
 * under their eyes instead of jumping away.
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
 * The view for a pinch whose pointers have moved from `start` to `a` and `b`.
 *
 * The spread scales the zoom, and the world point under the starting midpoint
 * follows the current midpoint, so one gesture zooms and pans together the way
 * every touch map does.
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
 * The view that brings one world rectangle to the middle of the viewport, with
 * room around it.
 *
 * WHAT IT IS FOR: a surface that is about ONE node (a form for the child about
 * to be added under it, say) has to be able to say WHERE that node is, and the
 * chart is the only thing that can say it. Easing onto the region is the
 * console chart's own answer, and it saves the view it left so the reader is
 * put back exactly where they were when the surface closes.
 *
 * THE ZOOM IS THE REGION'S, NOT THE READER'S: the region is given the middle
 * third of the viewport ([CANVAS_FOCUS_CONTEXT]), clamped to what this content
 * allows, so a small region is enlarged and a huge one is shrunk to fit.
 *
 * `ceiling` is how far that may go IN, for a region that has a size of its own
 * to respect. A node being pointed AT has none, so the default is no ceiling
 * and a small chart's node fills the pane; a region holding a FORM was drawn
 * at the size its controls were designed at, and enlarging it is a page zoom
 * nobody asked for. Measured on a two-node company: the engine's add form was
 * drawn at 233%, its 16px labels at 37px and its buttons past a finger's
 * width, with the chart around it off screen. [CANVAS_FIT_MAX_ZOOM] is the
 * ceiling such a caller passes, which is the same "never blown up" this
 * module's fit already keeps.
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
