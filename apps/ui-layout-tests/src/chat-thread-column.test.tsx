/**
 * A CONVERSATION IN A WIDE PANE READS IN ONE COLUMN (`ChatThread`'s
 * `column`): the items are held to the column's width and centred on the
 * thread, the reader's own bubble ends on the column's end edge, an answer
 * starts on its start edge, and a composer under the thread centred at the same
 * width shares both edges. A thread narrower than the column keeps its inset.
 */
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { CSSProperties } from 'react';
import { drawColumn, type Column } from './chatThreadColumn';

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function draw(width: number, style?: CSSProperties, column = true): Promise<Column> {
  await page.viewport(width, 900);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  return drawColumn(root, { exchanges: 2, style, column });
}

for (const width of [1440, 2000]) {
  test(`at ${String(width)} wide the items are one column of the wide measure, centred on the thread`, async () => {
    const at = await draw(width);
    expect(at.items.width).toBeCloseTo(at.measure, 0);
    expect(at.items.left - at.thread.left).toBeCloseTo(at.thread.right - at.items.right, 0);
    // The bubble ends on the column's end edge and the answer starts on its start edge.
    expect(at.bubble.right).toBeCloseTo(at.items.right, 0);
    expect(at.answer.left).toBeCloseTo(at.items.left, 0);
    // A composer centred at the same width shares both edges.
    expect(at.composer.left).toBeCloseTo(at.items.left, 0);
    expect(at.composer.right).toBeCloseTo(at.items.right, 0);
    expect(at.overflows).toBe(false);
  });
}

test('an ancestor sets the column through --crewlet-chat-thread-column', async () => {
  const at = await draw(1440, { '--crewlet-chat-thread-column': '600px' } as CSSProperties);
  expect(at.items.width).toBeCloseTo(600, 0);
  expect(at.composer.right).toBeCloseTo(at.items.right, 0);
});

test('a thread narrower than the column keeps its 16px inset', async () => {
  const at = await draw(390);
  expect(at.items.left - at.thread.left).toBeCloseTo(16, 0);
  expect(at.thread.right - at.items.right).toBeCloseTo(16, 0);
  expect(at.overflows).toBe(false);
});

// Mutation: without `column` the bubble stands at the thread's far end, nowhere
// near the answer's column, which is the layout the prop exists to end.
test('without the column the bubble and the answer stand at the thread\'s two edges', async () => {
  const at = await draw(2000, undefined, false);
  expect(at.thread.right - at.bubble.right).toBeCloseTo(16, 0);
  expect(at.answer.left - at.thread.left).toBeCloseTo(16, 0);
});
