/**
 * A DRAWN SCROLLBAR MOVES NOTHING in a column thread: the bar comes out of the
 * column's end margin alone, so the column stays centred on the thread and on
 * the composer centred under it. Runs on the browser that draws scrollbars in
 * the layout (vitest.config.ts).
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { drawColumn } from './chatThreadColumn';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

// Mutation: centre the items on the scroller (100% for 100cqi) and the column
// stands half a bar towards the start, off the composer's edges.
test('a conversation long enough to scroll keeps its column on the composer\'s edges', async () => {
  await page.viewport(1440, 600);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const at = await drawColumn(root, { exchanges: 12, column: true });
  expect(at.bar).toBeGreaterThan(0);
  expect(at.items.width).toBeCloseTo(at.measure, 0);
  expect(at.items.left).toBeCloseTo(at.composer.left, 0);
  expect(at.items.right).toBeCloseTo(at.composer.right, 0);
  expect(at.bubble.right).toBeCloseTo(at.composer.right, 0);
  expect(at.overflows).toBe(false);
});
