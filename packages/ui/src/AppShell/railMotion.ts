/**
 * How the rail moves between its two shapes.
 *
 * THE STYLESHEET MOVES IT, THIS DECIDES THE ORDER. The rail's width eases
 * between the full rail and the compact column (AppShell.css), and its
 * content is laid out at the width of the shape drawn, clipped by the moving
 * edge, so nothing in it rewraps at a width it will never rest at. What the
 * stylesheet cannot decide is WHEN the content changes shape, because the
 * application draws a different tree for each one:
 *
 * - UNFOLDING, the full rail is drawn at once, and the moving edge uncovers
 *   it while its words fade in (`unfold`).
 * - FOLDING, the full rail stays drawn, inert, while the edge narrows over it
 *   and its words fade out (`fold`), and the compact column is drawn once the
 *   rail's motion has ended, fading in (`folded`). Drawn at once instead, the
 *   column would replace the words before the reader saw them go.
 *
 * ONE MECHANISM FOR EVERY COLUMN THAT EASES. Both shapes are a `usePresence`
 * each, waiting on the motion actually running on the rail, as a
 * `DockColumn` waits on its own: no duration is written again here, nothing
 * waits under reduced motion, and where nothing moves the new shape is drawn
 * in the same commit, before any paint.
 */

import { useState, type RefObject } from 'react';
import { usePresence } from '../Presence/index.js';
import type { AppShellRailShape } from './railShape.js';

/**
 * Where a change of shape is: `fold` while the rail narrows over the full
 * rail's fading words, `folded` while the compact column fades in after it,
 * and `unfold` while the rail widens and the full rail's words fade in.
 */
export type AppShellRailMotion = 'fold' | 'folded' | 'unfold';

/**
 * The rail's own motion, which a change of shape waits for: its width, on the
 * rail itself, and the keyframes its words fade by (AppShell.css), wherever
 * they run inside it. Named, so that nothing else moving inside the rail (a
 * meter filling, a badge arriving, a paused animation) holds a fold.
 */
export const RAIL_MOTION = {
  transitions: ['width'],
  animations: ['crewlet-app-shell-rail-fade', 'crewlet-app-shell-rail-unfold', 'crewlet-app-shell-rail-settle'],
} as const;

/**
 * The shape to draw the rail's content in, the phase of the change under
 * way, and whether the content drawn is only leaving (and so inert), for a
 * rail whose chosen shape is `target`.
 *
 * `moves` is whether a change may animate at all: never in the drawer, where
 * the rail is always the full list and a shape is not a width. A change that
 * arrives WITH the window crossing into the wide layout does not animate
 * either: the reader resized a window, they did not fold a rail.
 */
export function useRailMotion(
  target: AppShellRailShape,
  moves: boolean,
  rail: RefObject<HTMLElement | null>,
): { drawn: AppShellRailShape; motion: AppShellRailMotion | null; leaving: boolean } {
  const [moved, setMoved] = useState(moves);
  if (moved !== moves) setMoved(moves);
  const instant = !moves || !moved;

  // The rail's words fade inside it while its edge moves, so both are the
  // motion a phase waits out, and nothing else is.
  const full = usePresence(target === 'full', rail, { ...RAIL_MOTION, instant });
  const compact = usePresence(target === 'compact' && !full.leaving, rail, { ...RAIL_MOTION, instant });

  let motion: AppShellRailMotion | null = null;
  if (full.leaving) motion = 'fold';
  else if (full.entering) motion = 'unfold';
  else if (compact.entering) motion = 'folded';

  return { drawn: full.present ? 'full' : 'compact', motion, leaving: full.leaving };
}
