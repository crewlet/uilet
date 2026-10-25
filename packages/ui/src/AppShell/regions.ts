/**
 * Where a component stands in the shell: the aside, or the peek slot.
 *
 * Its own module, so a panel that asks (`SidePanel`, `PeekRail`) carries the
 * question and not the whole shell.
 */

import { createContext, useContext } from 'react';

/**
 * The shape the aside takes, decided by the host from its own arithmetic.
 *
 * - `column`: a track of the frame's grid beside the sheet, a complementary
 *   region; the page reflows narrower and stays reachable with Tab.
 * - `overlay`: over the page's end edge, behind a veil, a modal dialog: Tab
 *   stays in it, Escape and a press on the veil close it, focus returns.
 * - `sheet`: the whole window, for a phone; modal in the same way.
 */
export type AppShellAsideShape = 'column' | 'overlay' | 'sheet';

/** The shape a peek takes beside the scroller: a column of the sheet, or a drawer over the page. */
export type AppShellPeekShape = 'column' | 'drawer';

/** What a component inside the aside or the peek is told about where it stands. */
export interface AppShellRegionValue<Shape extends string> {
  shape: Shape;
}

export const AsideContext = createContext<AppShellRegionValue<AppShellAsideShape> | null>(null);
export const PeekContext = createContext<AppShellRegionValue<AppShellPeekShape> | null>(null);

/**
 * The aside this component stands in, or null outside one.
 *
 * Null rather than a throw, unlike `useAppShell`: a side panel is drawn in
 * the shell's aside and in a frame of its own, and it asks which so it can
 * leave the landmark, the width and the grip to the shell when it is here.
 */
export function useAppShellAside(): AppShellRegionValue<AppShellAsideShape> | null {
  return useContext(AsideContext);
}

/** The peek slot this component stands in, or null outside one. */
export function useAppShellPeek(): AppShellRegionValue<AppShellPeekShape> | null {
  return useContext(PeekContext);
}
