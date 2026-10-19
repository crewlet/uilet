/**
 * Which artboards a canvas frames at once: the visibility budget.
 *
 * WHY A BUDGET. Every live artboard is a document of its own (a sandboxed
 * frame running its own scripts), so a canvas of sixty boards zoomed out would
 * otherwise run sixty pages at once, most of them drawn smaller than a thumb.
 * A board is live only while it is on screen AND drawn wide enough to read,
 * and at most a fixed number are live together, the largest on screen first.
 * Every other board draws as a titled placeholder of its size.
 *
 * Pure arithmetic over the canvas's view, so it is tested without a layout.
 */

import type { CanvasSize, CanvasView } from '../Canvas/index.js';

/** A board's frame on the canvas, in world units. */
export interface BoardFrame {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The most boards live at once. Twelve covers a landing page's sections on
 * one screen with room, and is well under what a browser runs smoothly as
 * separate documents.
 */
export const CANVAS_BOARD_MAX_LIVE = 12;

/**
 * The narrowest a board may be drawn, in screen pixels, and still be live:
 * below it a page's text is unreadable, so running it buys nothing.
 */
export const CANVAS_BOARD_MIN_LIVE_WIDTH = 160;

/**
 * The boards to frame for a view: those on screen and at least `minWidth`
 * pixels wide there, the most visible area first, at most `max` of them,
 * answered in the order `boards` lists them.
 */
export function liveBoards(
  boards: readonly BoardFrame[],
  view: CanvasView,
  viewport: CanvasSize,
  max: number = CANVAS_BOARD_MAX_LIVE,
  minWidth: number = CANVAS_BOARD_MIN_LIVE_WIDTH,
): string[] {
  if (max <= 0 || viewport.width <= 0 || viewport.height <= 0) return [];
  const ranked: { id: string; area: number; index: number }[] = [];
  boards.forEach((b, index) => {
    const left = b.x * view.k + view.x;
    const top = b.y * view.k + view.y;
    const width = b.w * view.k;
    const height = b.h * view.k;
    if (width < minWidth) return;
    const seenW = Math.min(left + width, viewport.width) - Math.max(left, 0);
    const seenH = Math.min(top + height, viewport.height) - Math.max(top, 0);
    if (seenW <= 0 || seenH <= 0) return;
    ranked.push({ id: b.id, area: seenW * seenH, index });
  });
  ranked.sort((a, b) => b.area - a.area || a.index - b.index);
  return ranked
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((r) => r.id);
}
