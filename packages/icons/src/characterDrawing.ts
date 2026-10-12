/**
 * What a character draws, derived from its geometry: the frame it sits in,
 * and at each detail its body with the face and holes cut through it and its
 * keyline ring. Each is worked out the first time it is drawn and kept.
 *
 * A HOLE IS CUT, NEVER PAINTED, the rule `test/characters.test.mjs` holds.
 * The face (the slits, the crown notch, the visor gap) and every hole are
 * taken out of the body's geometry (see region.ts), so the path that remains
 * is the one thing painted and a hole shows whatever the character stands on:
 * an avatar's plate, a chart's card, a hovered row, in every hue and theme. A
 * mask did this before and failed two ways. A host stylesheet that repaints
 * the paths in its zone (OrgLabel's and AddPill's set `fill: currentColor`)
 * repainted the mask's black too, filling each hole with a share of the ink
 * that changed with the hue and the theme. And a mask is found by id across
 * the whole page, so two copies of a character rendered apart (each server
 * render counts its ids from the start) drew one another's faces. Cut
 * geometry has no paint to repaint and no id to share.
 */

import type { CrewletCharacterDetail } from './CrewletCharacter.js';
import {
  CREWLET_CHARACTER_GEOMETRY,
  EYE,
  KEYLINE_GAP,
  KEYLINE_LINE,
  NOTCH,
  VISOR_GAP,
  ringsOf,
  silhouetteOf,
  type CharacterBox,
  type CrewletCharacterId,
  type DrawnCharacter,
} from './crewletCharacters.js';
import { pathOfRings, region, strokeBand, type Ring } from './region.js';

/** A rectangle as a ring, clockwise on screen. */
const rect = (x: number, y: number, width: number, height: number): Ring => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height],
];

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
  cuts.push(...ringsOf(geometry).holes);
  if (full) {
    // The gap is a band straddling the visor's edge, so its outer side winds
    // with the cuts and its inner side against them.
    const half = VISOR_GAP / 2;
    cuts.push(rect(visor.x - half, visor.y - half, visor.width + VISOR_GAP, visor.height + VISOR_GAP));
    cuts.push([...rect(visor.x + half, visor.y + half, visor.width - VISOR_GAP, visor.height - VISOR_GAP)].reverse());
  }
  return cuts;
}

/** The square a character is framed in: centred on everything it draws, its longer side filling it. */
export function frameOf({ x, y, width, height }: CharacterBox): CharacterBox {
  const side = Math.max(width, height);
  return { x: x + width / 2 - side / 2, y: y + height / 2 - side / 2, width: side, height: side };
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
  // The band between the outline grown by the keyline's gap, and grown by its gap and its line.
  const keyline = () =>
    pathOfRings(
      region(
        [...silhouette, ...strokeBand(silhouette, KEYLINE_GAP + KEYLINE_LINE)],
        [...silhouette, ...strokeBand(silhouette, KEYLINE_GAP)],
      ),
    );
  return {
    frame: frameOf(geometry.bounds),
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
      frame: frameOf(geometry.bounds),
      paths: (detail) => (detail === 'full' ? full : geometry.body),
    };
  } else {
    drawing = drawnDrawing(geometry);
  }
  drawings.set(character, drawing);
  return drawing;
}
