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
import { Avatar, ChatMessage, ChatThread } from '@crewlethq/ui';
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

// A FLUSH LOG IN A COLUMN hangs its rows' own side inset out of the column, so
// a row's face stands on the column's start edge, where a composer centred at
// the same width starts. Mutation: drop the inset from the flush rule and the
// faces stand a row inset inside the column.
test('a flush log in a column stands its rows\' faces on the column\'s edge', async () => {
  await page.viewport(1440, 900);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root!.render(
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <ChatThread label="Thread" flush column>
          <ChatMessage id="m1" author="Designer" avatar={<Avatar name="Designer" kind="human" size={36} decorative />} label="Designer, 11:04" time="11:04" timeTitle="Thursday, October 30, 11:04 AM">
            The booking screen still needs the narrow layout pass.
          </ChatMessage>
        </ChatThread>
        <div data-measure style={{ width: 'var(--size-measure-wide)', height: 0 }} />
      </div>,
    ),
  );
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const thread = host.querySelector('.crewlet-chat-thread')!.getBoundingClientRect();
  const column = host.querySelector('[data-measure]')!.getBoundingClientRect().width;
  const face = host.querySelector('.crewlet-chat-message__gutter')!.getBoundingClientRect();
  expect(face.left).toBeCloseTo(thread.left + (thread.width - column) / 2, 0);
});
