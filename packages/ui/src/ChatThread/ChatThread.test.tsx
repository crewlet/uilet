/**
 * A conversation as it grows: a focusable log with its live region off, busy
 * while a request runs; it follows the end only while the reader is at it,
 * lets them leave with the first move up, holds their place while what is
 * above it changes, counts what arrives once they scroll away, returns with
 * Jump to latest (unless the host leaves that row out), and reveals an item in
 * the middle of the view, or its head when the whole of it does not fit.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { createRef } from 'react';
import { afterEach, expect, test } from 'vitest';
import { installSheets, installThemed } from '../../../../apps/ui-tests/src/cascade.js';
import { Tag } from '../Tag/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { ChatThread, type ChatThreadHandle } from './index.js';

afterEach(cleanup);

/** Gives the log a layout jsdom does not compute: a 400px view over `content` pixels. */
function layout(log: HTMLElement, content: number) {
  Object.defineProperty(log, 'clientHeight', { configurable: true, value: 400 });
  Object.defineProperty(log, 'scrollHeight', { configurable: true, value: content });
}

/**
 * Lays the log out and lets the thread follow its end, as its size observer
 * does in a browser (jsdom has none): the reader starts at the latest.
 */
function laidOut(log: HTMLElement, content: number) {
  layout(log, content);
  log.scrollTop = content - 400;
  fireEvent.scroll(log);
}

const items = (n: number) => Array.from({ length: n }, (_, index) => <p key={index}>Message {index + 1}</p>);

test('is a focusable log, named, with its live region off and busy while a request runs', () => {
  const { rerender } = render(<ChatThread label="Conversation">{items(2)}</ChatThread>);
  const log = screen.getByRole('log', { name: 'Conversation' });
  expect(log.getAttribute('aria-live')).toBe('off');
  expect(log.tabIndex).toBe(0);
  expect(log.hasAttribute('aria-busy')).toBe(false);
  rerender(
    <ChatThread label="Conversation" busy>
      {items(2)}
    </ChatThread>,
  );
  expect(log.getAttribute('aria-busy')).toBe('true');
});

test('follows the end while the reader is at it, and stays put once they scroll away', () => {
  const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  layout(log, 1000);
  rerender(<ChatThread label="Conversation">{items(4)}</ChatThread>);
  expect(log.scrollTop).toBe(600);
  // Scrolling back down to within 48px of the end counts as at the end.
  log.scrollTop = 300;
  fireEvent.scroll(log);
  log.scrollTop = 560;
  fireEvent.scroll(log);
  layout(log, 1200);
  rerender(<ChatThread label="Conversation">{items(5)}</ChatThread>);
  expect(log.scrollTop).toBe(800);
  // Scrolled up: nothing pulls the reader down.
  log.scrollTop = 100;
  fireEvent.scroll(log);
  layout(log, 1400);
  rerender(<ChatThread label="Conversation">{items(6)}</ChatThread>);
  expect(log.scrollTop).toBe(100);
});

// THE FIRST MOVE UP LEAVES THE END. Within 48px of it counted as the end, and
// the next render pulled the reader back, so a slow wheel or a trackpad near
// the end could not scroll up at all. Mutation: read the 48px as the end on
// the way up, and the render puts the reader back at 600.
test('a reader who scrolls up near the end leaves it, and no render pulls them back', () => {
  const following: boolean[] = [];
  const thread = (n: number) => (
    <ChatThread label="Conversation" onFollowChange={(f) => following.push(f)}>
      {items(n)}
    </ChatThread>
  );
  const { rerender } = render(thread(3));
  const log = screen.getByRole('log');
  layout(log, 1000);
  rerender(thread(3));
  expect(log.scrollTop).toBe(600);
  log.scrollTop = 590;
  fireEvent.scroll(log);
  rerender(thread(3));
  expect(log.scrollTop).toBe(590);
  layout(log, 1200);
  rerender(thread(4));
  expect(log.scrollTop).toBe(590);
  expect(following).toEqual([false]);
  fireEvent.click(screen.getByRole('button', { name: 'Jump to latest, 1 new item' }));
  expect(log.scrollTop).toBe(800);
  expect(following).toEqual([false, true]);
});

// THE READER'S PLACE HOLDS while what is above it changes height: an older
// page landing, a row drawn at its real height. The item at the top of the
// view stays where it stood, before the paint. Mutation: drop the hold, and
// the view slides down by the 200px that landed above it.
test("holds the reader's place while what is above them changes", () => {
  const tops = new Map<string, number>([
    ['Message 1', 0],
    ['Message 2', 300],
    ['Message 3', 600],
  ]);
  const rect = (top: number, height: number) =>
    ({ x: 0, y: top, top, bottom: top + height, left: 0, right: 400, width: 400, height, toJSON: () => ({}) }) as DOMRect;
  const placed = (log: HTMLElement) => {
    log.getBoundingClientRect = () => rect(0, 400);
    for (const p of Array.from(log.querySelectorAll('p'))) {
      p.getBoundingClientRect = () => rect((tops.get(p.textContent ?? '') ?? 0) - log.scrollTop, 300);
    }
  };
  const older = <p key="older">Message 0</p>;
  const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  layout(log, 900);
  placed(log);
  rerender(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  expect(log.scrollTop).toBe(500);
  log.scrollTop = 350;
  fireEvent.scroll(log);
  // An older item 200px tall lands above everything.
  for (const [text, top] of tops) tops.set(text, top + 200);
  tops.set('Message 0', 0);
  layout(log, 1100);
  rerender(<ChatThread label="Conversation">{[older, ...items(3)]}</ChatThread>);
  expect(log.scrollTop).toBe(550);
});

// A PART THE HOST MARKS `overflow-anchor: none` IS NEVER THE ANCHOR, as the
// browser's own anchoring skips it: a head that older items land under stays
// put while the item the reader was at moves down by what landed. Mutation:
// let the head be the anchor, and the view stays on the head as the items land.
test('steps over a part the host marks overflow-anchor: none', () => {
  const tops = new Map<string, number>([
    ['Head', 0],
    ['Message 1', 100],
    ['Message 2', 400],
  ]);
  const rect = (top: number, height: number) =>
    ({ x: 0, y: top, top, bottom: top + height, left: 0, right: 400, width: 400, height, toJSON: () => ({}) }) as DOMRect;
  const placed = (log: HTMLElement) => {
    log.getBoundingClientRect = () => rect(0, 400);
    for (const p of Array.from(log.querySelectorAll('p'))) {
      p.getBoundingClientRect = () => rect((tops.get(p.textContent ?? '') ?? 0) - log.scrollTop, 300);
    }
  };
  const head = (
    <p key="head" style={{ overflowAnchor: 'none' }}>
      Head
    </p>
  );
  const { rerender } = render(<ChatThread label="Conversation">{[head, ...items(2)]}</ChatThread>);
  const log = screen.getByRole('log');
  layout(log, 700);
  placed(log);
  rerender(<ChatThread label="Conversation">{[head, ...items(2)]}</ChatThread>);
  expect(log.scrollTop).toBe(300);
  log.scrollTop = 50;
  fireEvent.scroll(log);
  // Two older items, 300px between them, land under the head.
  tops.set('Message 1', 400);
  tops.set('Message 2', 700);
  layout(log, 1000);
  rerender(
    <ChatThread label="Conversation">{[head, <p key="o1">Older 1</p>, <p key="o2">Older 2</p>, ...items(2)]}</ChatThread>,
  );
  expect(log.scrollTop).toBe(350);
});

// A DAY THAT RUNS PAST THE VIEW IS LOOKED INTO for the row at the top, as the
// browser's anchoring looks into what it holds only part of: older rows land
// at the start of the same day, and the day's own top does not move. Mutation:
// take the first item in view whole, and the view stays on the day's top.
test('looks into an item the view holds only part of for the row at its top', () => {
  const tops = new Map<string, number>([
    ['Message 1', 0],
    ['Message 2', 300],
    ['Message 3', 600],
  ]);
  const rect = (top: number, height: number) =>
    ({ x: 0, y: top, top, bottom: top + height, left: 0, right: 400, width: 400, height, toJSON: () => ({}) }) as DOMRect;
  const day = (rows: JSX.Element[]) => <section key="day">{rows}</section>;
  const placed = (log: HTMLElement, height: number) => {
    log.getBoundingClientRect = () => rect(0, 400);
    log.querySelector('section')!.getBoundingClientRect = () => rect(-log.scrollTop, height);
    for (const p of Array.from(log.querySelectorAll('p'))) {
      p.getBoundingClientRect = () => rect((tops.get(p.textContent ?? '') ?? 0) - log.scrollTop, 300);
    }
  };
  const { rerender } = render(<ChatThread label="Conversation">{day(items(3))}</ChatThread>);
  const log = screen.getByRole('log');
  layout(log, 900);
  placed(log, 900);
  rerender(<ChatThread label="Conversation">{day(items(3))}</ChatThread>);
  expect(log.scrollTop).toBe(500);
  log.scrollTop = 250;
  fireEvent.scroll(log);
  for (const [text, top] of tops) tops.set(text, top + 300);
  layout(log, 1200);
  rerender(<ChatThread label="Conversation">{day([<p key="older">Older</p>, ...items(3)])}</ChatThread>);
  placed(log, 1200);
  expect(log.scrollTop).toBe(550);
});

// A VIEW THAT SHRINKS UNDER A READER AT THE END keeps the latest in sight: a
// composer growing a line took the last line of the conversation with it.
test('keeps the latest in sight when the view shrinks under a reader at the end', () => {
  // An observer stands in for the browser's, firing for what it watches.
  const watching = new Map<Element, (() => void)[]>();
  const Real = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    private readonly fire: () => void;
    constructor(fire: () => void) {
      this.fire = fire;
    }
    observe(target: Element) {
      watching.set(target, [...(watching.get(target) ?? []), this.fire]);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  try {
    const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
    const log = screen.getByRole('log');
    layout(log, 1000);
    rerender(<ChatThread label="Conversation">{items(3)}</ChatThread>);
    expect(log.scrollTop).toBe(600);
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 350 });
    act(() => (watching.get(log) ?? []).forEach((fire) => fire()));
    expect(log.scrollTop).toBe(650);
  } finally {
    globalThis.ResizeObserver = Real;
  }
});

test('counts what arrived since the reader scrolled away, and Jump to latest returns them', () => {
  const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  laidOut(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  const jump = screen.getByRole('button', { name: 'Jump to latest' });
  expect(jump).toBeTruthy();
  rerender(<ChatThread label="Conversation">{items(5)}</ChatThread>);
  const counted = screen.getByRole('button', { name: 'Jump to latest, 2 new items' });
  fireEvent.click(counted);
  expect(log.scrollTop).toBe(600);
  expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
});

// A JUMP HOLDS UNTIL IT LANDS: the positions a smooth scroll passes through
// are not the reader leaving, and an answer that grows meanwhile is followed.
// Mutation: read each intermediate position as the reader's, and the pill
// comes back mid-jump and the growth is not followed.
test('a smooth jump to the latest is not undone by the positions it passes through', () => {
  const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  laidOut(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  // The browser animates; the test moves the position by hand.
  log.scrollTo = () => {};
  fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
  log.scrollTop = 300;
  fireEvent.scroll(log);
  expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  layout(log, 1400);
  rerender(<ChatThread label="Conversation">{items(4)}</ChatThread>);
  expect(log.scrollTop).toBe(1000);
});

test("the reader's own scroll ends a jump at once", () => {
  render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  laidOut(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  log.scrollTo = () => {};
  fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
  fireEvent.wheel(log);
  log.scrollTop = 100;
  fireEvent.scroll(log);
  expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeTruthy();
});

// THE PILL COVERS NOTHING: it sits in the thread's column under the log rather
// than floating over its last lines. Mutation: position it over the scroller.
test('the pill sits under the log, never over what is being read', () => {
  const uninstall = installThemed('light', 'ChatThread/ChatThread.css');
  try {
    render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
    const log = screen.getByRole('log');
    laidOut(log, 1000);
    log.scrollTop = 0;
    fireEvent.scroll(log);
    const pill = screen.getByRole('button', { name: 'Jump to latest' }).parentElement!;
    expect(getComputedStyle(pill).position).not.toBe('absolute');
    expect(pill.previousElementSibling).toBe(log);
  } finally {
    uninstall();
  }
});

test('reveals an item in the middle of the view when it fits, and its head at the top when it does not', () => {
  const handle = createRef<ChatThreadHandle>();
  render(
    <ChatThread ref={handle} label="Conversation" jump={false}>
      {items(3)}
    </ChatThread>,
  );
  const log = screen.getByRole('log');
  layout(log, 2000);
  log.scrollTop = 0;
  const card = document.createElement('section');
  log.appendChild(card);
  log.getBoundingClientRect = () => ({ top: 0, height: 400 }) as DOMRect;
  card.getBoundingClientRect = () => ({ top: 900, height: 600 }) as DOMRect;
  act(() => handle.current!.reveal(card));
  expect(log.scrollTop).toBe(900);
  log.scrollTop = 0;
  card.getBoundingClientRect = () => ({ top: 900, height: 300 }) as DOMRect;
  act(() => handle.current!.reveal(card));
  // Its middle on the view's middle: 50px of the view above it and below it.
  expect(log.scrollTop).toBe(850);
});

// A message the reader is taken to stops under the day's pinned pill, which
// it names as its scroll-margin-top. Mutation: ignore the margin, and a tall
// message's head lands under the pill.
test("reveal keeps an item's scroll margins clear", () => {
  const handle = createRef<ChatThreadHandle>();
  render(
    <ChatThread ref={handle} label="Conversation" jump={false}>
      {items(3)}
    </ChatThread>,
  );
  const log = screen.getByRole('log');
  layout(log, 2000);
  log.scrollTop = 0;
  const row = document.createElement('article');
  row.style.scrollMarginTop = '40px';
  log.appendChild(row);
  log.getBoundingClientRect = () => ({ top: 0, height: 400 }) as DOMRect;
  row.getBoundingClientRect = () => ({ top: 900, height: 500 }) as DOMRect;
  act(() => handle.current!.reveal(row));
  expect(log.scrollTop).toBe(860);
  // It fits in the 360px under the margin: centred in that.
  log.scrollTop = 0;
  row.getBoundingClientRect = () => ({ top: 900, height: 200 }) as DOMRect;
  act(() => handle.current!.reveal(row));
  expect(log.scrollTop).toBe(780);
});

// THE ROW THE MOVE BRINGS IN IS ACCOUNTED FOR. Revealing an item away from
// the end detaches the reader, and the Jump to latest row then takes 42px off
// the foot of the view. Mutation: place the item once, in the view as it was,
// and it sits 21px low, its foot closer to the row than its head to the top.
test('reveal places the item in the view the Jump to latest row leaves', () => {
  const handle = createRef<ChatThreadHandle>();
  render(
    <ChatThread ref={handle} label="Conversation">
      {items(3)}
    </ChatThread>,
  );
  const log = screen.getByRole('log');
  // The row, while it shows, takes 42px of the thread's height from the log.
  Object.defineProperty(log, 'clientHeight', {
    configurable: true,
    get: () => (document.querySelector('.crewlet-chat-thread__jump') ? 358 : 400),
  });
  Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 2000 });
  log.scrollTop = 1600;
  fireEvent.scroll(log);
  expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  const row = document.createElement('article');
  log.appendChild(row);
  log.getBoundingClientRect = () => ({ top: 0, height: 400 }) as DOMRect;
  row.getBoundingClientRect = () => ({ top: 900 - log.scrollTop, height: 300 }) as DOMRect;
  act(() => handle.current!.reveal(row));
  expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeTruthy();
  // 29px above it and 29px below it, in the 358px the row leaves.
  expect(log.scrollTop).toBe(871);
});

test('jump={false} draws no Jump to latest row, however far the reader scrolls', () => {
  render(
    <ChatThread label="Conversation" jump={false}>
      {items(3)}
    </ChatThread>,
  );
  const log = screen.getByRole('log');
  laidOut(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  expect(screen.queryByRole('button', { name: /Jump to latest/ })).toBeNull();
  expect(document.querySelector('.crewlet-chat-thread__jump')).toBeNull();
});

test('hands a host its scrolling element', () => {
  const handle = createRef<ChatThreadHandle>();
  render(
    <ChatThread ref={handle} label="Conversation">
      {items(1)}
    </ChatThread>,
  );
  expect(handle.current!.scroller()).toBe(screen.getByRole('log'));
});

test('turns the browser scroll anchoring off, and rings inside the region', () => {
  const uninstall = installThemed('light', 'ChatThread/ChatThread.css');
  render(<ChatThread label="Conversation">{items(1)}</ChatThread>);
  const log = screen.getByRole('log');
  expect(getComputedStyle(log).overflowAnchor).toBe('none');
  uninstall();
});

test('is the containing block for what is positioned inside it, so nothing escapes its clip', () => {
  // A visually hidden phrase in a tag has no positioned ancestor of its own.
  // Placed against the thread rather than the scroller, it stood at its spot
  // in the whole conversation, outside the scroller's clip, and made the
  // panel body around the thread scrollable.
  const uninstall = installSheets('ChatThread/ChatThread.css', 'Tag/Tag.css', 'VisuallyHidden/VisuallyHidden.css');
  try {
    render(
      <ChatThread label="Conversation">
        {items(3)}
        <Tag size="xs" appearance="outline">
          <VisuallyHidden>Sent with </VisuallyHidden>
          Knowledge
        </Tag>
      </ChatThread>,
    );
    const log = screen.getByRole('log');
    const hidden = screen.getByText('Sent with');
    expect(getComputedStyle(hidden).position).toBe('absolute');
    let block = hidden.parentElement;
    while (block && getComputedStyle(block).position === 'static') block = block.parentElement;
    expect(block).not.toBeNull();
    expect(log.contains(block)).toBe(true);
  } finally {
    uninstall();
  }
});

test('carries no axe violation, following and detached', async () => {
  const { container } = render(
    <main>
      <ChatThread label="Conversation">{items(3)}</ChatThread>
    </main>,
  );
  const log = screen.getByRole('log');
  laidOut(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('a short transcript rests on its foot with rest="end", and under its top by default', () => {
  const uninstall = installSheets('ChatThread/ChatThread.css');
  try {
    const { container, rerender } = render(
      <ChatThread label="Conversation">
        <p>One</p>
      </ChatThread>,
    );
    const root = container.querySelector('.crewlet-chat-thread')!;
    expect(root.className).not.toContain('crewlet-chat-thread--rest-end');
    rerender(
      <ChatThread label="Conversation" rest="end">
        <p>One</p>
      </ChatThread>,
    );
    expect(root.className).toContain('crewlet-chat-thread--rest-end');
    const scroller = getComputedStyle(container.querySelector('.crewlet-chat-thread__scroller')!);
    expect(scroller.display).toBe('flex');
    expect(scroller.flexDirection).toBe('column');
    const items = getComputedStyle(container.querySelector('.crewlet-chat-thread__items')!);
    expect(items.marginTop).toBe('auto');
  } finally {
    uninstall();
  }
});
