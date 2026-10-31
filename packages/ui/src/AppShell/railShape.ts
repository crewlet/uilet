/**
 * Which shape the shell's rail is drawn in, for the pieces that stand in it
 * and are also used outside a shell: the brand lockup and the account row.
 *
 * A CONTEXT OF ITS OWN, AND ONE THAT NEVER THROWS, because those pieces are
 * drawn on screens with no shell at all (a sign-in page draws the lockup), and
 * there the answer is simply the full shape. `useAppShell().rail` is the same
 * answer for code that is always inside a shell.
 */

import { createContext, useContext } from 'react';

/**
 * The rail's two shapes: `full`, the navigation's rows under their headings,
 * and `compact`, the same places folded to a column of glyphs (`CompactNav`).
 */
export type AppShellRailShape = 'full' | 'compact';

export const RailShapeContext = createContext<AppShellRailShape>('full');

/** The shape the rail around this component is drawn in now: `full` outside a shell, and in the drawer. */
export function useRailShape(): AppShellRailShape {
  return useContext(RailShapeContext);
}
