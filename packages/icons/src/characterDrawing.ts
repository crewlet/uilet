/**
 * What a character draws, derived from its geometry: the frame it sits in,
 * and at each detail its body with the face and holes cut through it and its
 * keyline ring. Each is worked out the first time it is drawn and kept.
 *
 * TWO RULES, held by `test/characters.test.mjs`:
 *
 * - OPTICAL CENTRING. A character is framed on the point halfway between the
 *   middle of its bounding box and the centre of area of its silhouette, in
 *   the smallest square round that point that holds everything it draws. On a
 *   symmetric silhouette the two points are one, and the rule is the plain
 *   geometric centring it replaced. Where the mass sits off the box (a heart
 *   whose lobes stand on thin legs, a speech bubble over its tail, a triangle
 *   over its apex) the box's middle put the mass up to 11% of the frame off
 *   centre, three pixels at 40px. Half the way, rather than all of it,
 *   because a centroid overcorrects a shape that tapers to a point (the
 *   triangle rose too far) and because the square has to grow by twice the
 *   pull to hold the drawing: all the way drew the heart 18% smaller than
 *   its neighbours, half the way 10%.
 * - A HOLE IS CUT, NEVER PAINTED. The face (the slits, the crown notch, the
 *   visor gap) and every hole are taken out of the body's geometry (see
 *   region.ts), so the path that remains is the one thing painted and a hole
 *   shows whatever the character stands on: an avatar's plate, a chart's
 *   card, a hovered row, in every hue and theme. A mask did this before and
 *   failed two ways. A host stylesheet that repaints the paths in its zone
 *   (OrgLabel's and AddPill's set `fill: currentColor`) repainted the mask's
 *   black too, filling each hole with a share of the ink that changed with
 *   the hue and the theme. And a mask is found by id across the whole page,
 *   so two copies of a character rendered apart (each server render counts
 *   its ids from the start) drew one another's faces. Cut geometry has no
 *   paint to repaint and no id to share. A cut as fine as a HAIRLINE is drawn
 *   at full detail only, as the keyline and the visor gap always were.
 */

import type { CrewletCharacterDetail } from './CrewletCharacter.js';
import {
  CREWLET_CHARACTER_GEOMETRY,
  EYE,
  HAIRLINE,
  KEYLINE_GAP,
  MARK_CENTROID,
  NOTCH,
  VISOR_GAP,
  keylineReachOf,
  ringsOf,
  silhouetteOf,
  type CharacterBox,
  type CrewletCharacterId,
  type DrawnCharacter,
} from './crewletCharacters.js';
import { centroidOf, pathOfRings, region, strokeBand, type Point, type Ring } from './region.js';

/** How far a frame moves from the box's middle toward the silhouette's centre of area. */
export const OPTICAL_PULL = 0.5;

/** A rectangle as a ring, clockwise on screen. */
const rect = (x: number, y: number, width: number, height: number): Ring => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
];

/** The narrowest a convex ring is across: the least, over its edges, of its depth away from that edge. */
function widthOf(ring: Ring): number {
  let least = Infinity;
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!;
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (length === 0) return;
    const depth = Math.max(
      ...ring.map((r) => Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / length),
    );
    least = Math.min(least, depth);
  });
  return least;
}

/** What is cut out of a drawn character's body: its slits, notch and holes, and the visor gap at full detail. */
function cutsOf(geometry: DrawnCharacter, detail: CrewletCharacterDetail): Ring[] {
  const { visor, notch } = geometry;
  const full = detail === 'full';
  const eye = full ? EYE.full : EYE.compact;
  const eyeWidth = visor.width * eye.width;
  const eyeHeight = visor.height * eye.height;
  const eyeTop = visor.y + (visor.height - eyeHeight) / 2;
  const middle = visor.x + visor.width / 2;
  const offset = visor.width * EYE.offset;
  const cuts: Ring[] = [middle - offset, middle + offset].map((centre) =>
    rect(centre - eyeWidth / 2, eyeTop, eyeWidth, eyeHeight),
  );
  if (notch) {
    // It starts a unit above the crown, so the cut opens through the crown's edge.
    cuts.push([
      [notch[0] - NOTCH.half, notch[1] - 1],
      [notch[0] + NOTCH.half, notch[1] - 1],
      [notch[0], notch[1] + NOTCH.depth],
    ]);
  }
  for (const hole of ringsOf(geometry).holes) if (full || widthOf(hole) > HAIRLINE) cuts.push(hole);
  if (full) {
    // The gap is a band straddling the visor's edge, so its outer side winds
    // with the cuts and its inner side against them.
    const half = VISOR_GAP / 2;
    cuts.push(rect(visor.x - half, visor.y - half, visor.width + VISOR_GAP, visor.height + VISOR_GAP));
    cuts.push([...rect(visor.x + half, visor.y + half, visor.width - VISOR_GAP, visor.height - VISOR_GAP)].reverse());
  }
  return cuts;
}

/** The square a character is framed in: centred optically, holding everything it draws. */
export function frameOf(bounds: CharacterBox, centroid: Point): CharacterBox {
  const boxX = bounds.x + bounds.width / 2;
  const boxY = bounds.y + bounds.height / 2;
  const x = boxX + OPTICAL_PULL * (centroid[0] - boxX);
  const y = boxY + OPTICAL_PULL * (centroid[1] - boxY);
  const side = Math.max(bounds.width + 2 * Math.abs(x - boxX), bounds.height + 2 * Math.abs(y - boxY));
  return { x: x - side / 2, y: y - side / 2, width: side, height: side };
}

interface Drawing {
  /** The square it is framed in. */
  readonly frame: CharacterBox;
  /** The paths it paints in the current colour at a detail, in order. */
  paths(detail: CrewletCharacterDetail): readonly string[];
}

function drawnDrawing(geometry: DrawnCharacter): Drawing {
  const { parts } = ringsOf(geometry);
  const silhouette = silhouetteOf(geometry);
  const made: Partial<Record<CrewletCharacterDetail, readonly string[]>> = {};
  const body = (detail: CrewletCharacterDetail) => pathOfRings(region(parts, cutsOf(geometry, detail)));
  // What the keyline reaches, less the outline grown by the keyline's gap.
  const keyline = () =>
    pathOfRings(
      region([...silhouette, ...keylineReachOf(geometry)], [...silhouette, ...strokeBand(silhouette, KEYLINE_GAP)]),
    );
  return {
    frame: frameOf(geometry.bounds, centroidOf(silhouette)),
    paths: (detail) => (made[detail] ??= detail === 'full' ? [keyline(), body('full')] : [body('compact')]),
  };
}

const drawings = new Map<CrewletCharacterId, Drawing>();

/**
 * What a character draws. The original Crewlet is the mark, drawn from its own
 * paths (in its own units, see `MarkCharacter.transform`) with their own cuts,
 * so only its frame is worked out here.
 */
export function drawingOf(character: CrewletCharacterId): Drawing {
  let drawing = drawings.get(character);
  if (drawing) return drawing;
  const geometry = CREWLET_CHARACTER_GEOMETRY[character];
  if (geometry.kind === 'mark') {
    const full = [geometry.keyline, ...geometry.body];
    drawing = {
      frame: frameOf(geometry.bounds, MARK_CENTROID),
      paths: (detail) => (detail === 'full' ? full : geometry.body),
    };
  } else {
    drawing = drawnDrawing(geometry);
  }
  drawings.set(character, drawing);
  return drawing;
}
