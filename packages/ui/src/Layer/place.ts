/**
 * Where a floating surface goes beside the thing it belongs to.
 *
 * KEPT PURE, and separate from every component that calls it, because none of
 * it can be observed in jsdom: there is no layout, so a menu that placed
 * itself off the bottom of a canvas or lost its last item past an edge nobody
 * can scroll would pass any component suite. As arithmetic over numbers it has
 * a suite of its own, and each component is left with the wiring.
 *
 * All four values are in the SAME coordinate space, whichever one the caller
 * picks: viewport coordinates for a surface positioned against the window,
 * container coordinates for one inside a `LayerHost`. The function does no
 * conversion, so a caller that mixes the two gets an answer in neither.
 */

/** The slice of a DOMRect these functions read, so a plain object works too. */
export interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementSize {
  width: number;
  height: number;
}

export interface Placement {
  left: number;
  top: number;
  /** Which side of the anchor the surface ended up on. */
  side: 'below' | 'above';
}

/**
 * The event a layer receives when the content beneath it moves.
 *
 * A surface positioned from an anchor's rectangle has to follow that anchor
 * through a pan, a zoom or a scroll, and listening on the layer it was
 * rendered into is the whole contract: it never needs to know what kind of
 * surface drew the layer.
 */
export const LAYER_REPOSITION_EVENT = 'crewlet:viewchange';

/** Space between a surface and its anchor, and between a surface and an edge. */
export const LAYER_GAP = 4;

/**
 * Where a surface of `size` goes beside `anchor`, inside `bounds`.
 *
 * On the preferred side of the anchor and aligned to its start; on the other
 * side when the preferred one has not room and the other has more; and slid
 * back inside the bounds on both axes, so a menu opened from a card at the
 * edge of a canvas is never cut off by the edge it opened near. Where neither
 * side has room for the whole surface it overlaps its anchor rather than
 * losing its last items past an edge nobody can scroll; one larger than the
 * bounds keeps its START in view, which is where its first item is.
 *
 * `prefer` exists because the caller sometimes knows better than the geometry:
 * a picker at the foot of a form opens upward by design, and a panel that
 * flipped only when it ran out of room would jump between sides as the page
 * scrolled.
 */
export function placePopup(
  anchor: PlacementRect,
  size: PlacementSize,
  bounds: PlacementRect,
  gap: number = LAYER_GAP,
  prefer: 'below' | 'above' = 'below',
): Placement {
  const below = anchor.y + anchor.height + gap;
  const above = anchor.y - gap - size.height;
  const roomBelow = bounds.y + bounds.height - below;
  const roomAbove = anchor.y - gap - bounds.y;
  const takesPreferred =
    prefer === 'below'
      ? roomBelow >= size.height || roomBelow >= roomAbove
      : roomAbove >= size.height || roomAbove >= roomBelow;
  const side = takesPreferred ? prefer : prefer === 'below' ? 'above' : 'below';
  const wanted = side === 'below' ? below : above;
  const maxY = bounds.y + bounds.height - size.height;
  const top = Math.max(bounds.y, Math.min(wanted, maxY));
  const maxX = bounds.x + bounds.width - size.width;
  const left = Math.max(bounds.x, Math.min(anchor.x, maxX));
  return { left, top, side };
}

/** The rectangle of the window itself, for a surface with no layer host. */
export function viewportBounds(): PlacementRect {
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
}

/** Whether an anchor has been carried entirely outside its bounds. */
export function outsideBounds(anchor: PlacementRect, bounds: PlacementRect): boolean {
  return (
    anchor.x + anchor.width < bounds.x ||
    anchor.y + anchor.height < bounds.y ||
    anchor.x > bounds.x + bounds.width ||
    anchor.y > bounds.y + bounds.height
  );
}
