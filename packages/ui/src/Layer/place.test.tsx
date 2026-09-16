/**
 * Where a floating surface lands, as arithmetic.
 *
 * None of this can be observed in jsdom, which has no layout, so every one of
 * these rules would otherwise ship on trust: a menu placed off the bottom of a
 * canvas, one cut off by the edge it opened near, one whose first item is past
 * an edge nobody can scroll.
 *
 * Ported from the engine dashboard's `ui/viewport.test.ts` placePopup cases.
 */

import { describe, expect, test } from 'vitest';
import { LAYER_GAP, LAYER_REPOSITION_EVENT, outsideBounds, placePopup } from './place.js';

const bounds = { x: 0, y: 0, width: 800, height: 600 };
const size = { width: 200, height: 160 };

describe('placePopup', () => {
  test('below the anchor and aligned to its start when there is room', () => {
    expect(placePopup({ x: 100, y: 100, width: 32, height: 24 }, size, bounds, 4)).toEqual({
      left: 100,
      top: 128,
      side: 'below',
    });
  });

  test('above the anchor when there is not room below and more room above', () => {
    expect(placePopup({ x: 100, y: 520, width: 32, height: 24 }, size, bounds, 4)).toEqual({
      left: 100,
      top: 356,
      side: 'above',
    });
  });

  test('slid back inside the bounds at the right edge', () => {
    expect(placePopup({ x: 780, y: 100, width: 20, height: 24 }, size, bounds, 4).left).toBe(600);
  });

  test('slid back inside the bounds vertically when neither side has room for all of it', () => {
    const short = { x: 0, y: 0, width: 800, height: 200 };
    // 76 pixels above, 76 below, 160 needed: it overlaps its anchor, whole.
    const spot = placePopup({ x: 100, y: 80, width: 32, height: 24 }, size, short, 4);
    expect(spot.top).toBeGreaterThanOrEqual(0);
    expect(spot.top + size.height).toBeLessThanOrEqual(short.height);
  });

  test('a surface taller than the bounds keeps its first item in view', () => {
    const tiny = { x: 0, y: 10, width: 800, height: 100 };
    expect(placePopup({ x: 100, y: 60, width: 32, height: 24 }, size, tiny, 4).top).toBe(10);
  });

  test('the gap defaults to the one every layer uses', () => {
    const anchor = { x: 100, y: 100, width: 32, height: 24 };
    expect(placePopup(anchor, size, bounds).top).toBe(100 + 24 + LAYER_GAP);
  });

  test('a caller that prefers above gets above while there is room, and flips only when there is not', () => {
    // A picker at the foot of a form opens upward by design. One that flipped
    // only when it ran out of room would change sides as the page scrolled.
    const roomy = { x: 100, y: 300, width: 32, height: 24 };
    expect(placePopup(roomy, size, bounds, 4, 'above')).toEqual({ left: 100, top: 136, side: 'above' });
    const atTheTop = { x: 100, y: 20, width: 32, height: 24 };
    expect(placePopup(atTheTop, size, bounds, 4, 'above')).toEqual({ left: 100, top: 48, side: 'below' });
  });
});

describe('outsideBounds', () => {
  test('an anchor panned off any edge is outside, and one touching an edge is not', () => {
    expect(outsideBounds({ x: -40, y: 100, width: 32, height: 24 }, bounds)).toBe(true);
    expect(outsideBounds({ x: 900, y: 100, width: 32, height: 24 }, bounds)).toBe(true);
    expect(outsideBounds({ x: 100, y: -40, width: 32, height: 24 }, bounds)).toBe(true);
    expect(outsideBounds({ x: 100, y: 700, width: 32, height: 24 }, bounds)).toBe(true);
    expect(outsideBounds({ x: -10, y: 0, width: 32, height: 24 }, bounds)).toBe(false);
  });
});

test('the reposition event keeps the name every layer already listens for', () => {
  // A surface following its anchor listens on the layer it was rendered into,
  // and the canvas that pans dispatches it. The string is the contract.
  expect(LAYER_REPOSITION_EVENT).toBe('crewlet:viewchange');
});
