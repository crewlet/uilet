/**
 * One message in a transcript: a named, focusable article with a face, a head
 * line and the words; a continuation with its time in the gutter; the
 * mention, flash, sending and failed states; a toolbar that stands over the
 * row above unless the scroller's edge would cut it; and the arrow keys that
 * walk from row to row.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { createRef, type ReactNode, type Ref } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installHover, installMotion, installSheets, userAction } from '../../../../apps/ui-tests/src/cascade.js';
import { ChatThread } from '../ChatThread/index.js';
import { ChatMessage, ChatMessageFailure, type ChatMessageProps } from './index.js';

afterEach(cleanup);

const SHEETS = ['ChatMessage/ChatScale.css', 'ChatMessage/ChatMessage.css'] as const;

/** A row with every required prop filled in; `ref` reaches the article, as ChatMessage forwards it. */
function Row(props: Partial<ChatMessageProps> & { children?: ReactNode; ref?: Ref<HTMLElement> }) {
  return (
    <ChatMessage
      id="m1"
      label="Product Manager, 11:02 AM"
      avatar={<span data-testid="face">PM</span>}
      author={<button type="button">Product Manager</button>}
      time="11:02 AM"
      gutterTime="11:02"
      timeTitle="Thursday, October 30, 11:02 AM"
      dateTime="2026-10-30T11:02:00Z"
      {...props}
    >
      {props.children ?? 'The release notes are ready for review.'}
    </ChatMessage>
  );
}

const tray = <div role="toolbar" aria-label="Message actions" style={{ height: 40 }} />;

test('is an article named for who wrote it and when, focusable out of the tab order, carrying its id', () => {
  const ref = createRef<HTMLElement>();
  render(<Row ref={ref} badges={<span>Agent</span>} />);
  const row = screen.getByRole('article', { name: 'Product Manager, 11:02 AM' });
  expect(ref.current).toBe(row);
  expect(row.tabIndex).toBe(-1);
  expect(row.dataset['messageId']).toBe('m1');
  expect(screen.getByTestId('face')).toBeTruthy();
  const time = row.querySelector('.crewlet-chat-message__head time')!;
  expect(time.textContent).toBe('11:02 AM');
  expect(time.getAttribute('title')).toBe('Thursday, October 30, 11:02 AM');
  expect(time.getAttribute('datetime')).toBe('2026-10-30T11:02:00Z');
  // The name, the badge and the time on one head line, in that order.
  const head = row.querySelector('.crewlet-chat-message__head')!;
  expect([...head.children].map((part) => part.textContent)).toEqual(['Product Manager', 'Agent', '11:02 AM']);
});

test('a continuation draws no face and no head, and its gutter holds the face-wide time', () => {
  render(<Row continuation />);
  const row = screen.getByRole('article');
  expect(row.classList.contains('is-continuation')).toBe(true);
  expect(screen.queryByTestId('face')).toBeNull();
  expect(row.querySelector('.crewlet-chat-message__head')).toBeNull();
  const gutter = row.querySelector('.crewlet-chat-message__gutter time')!;
  expect(gutter.textContent).toBe('11:02');
  expect(gutter.getAttribute('title')).toBe('Thursday, October 30, 11:02 AM');
});

test("a continuation's gutter shows the short time when no face-wide one is given", () => {
  render(<Row continuation gutterTime={undefined} />);
  expect(screen.getByRole('article').querySelector('.crewlet-chat-message__gutter time')!.textContent).toBe('11:02 AM');
});

// The gutter's time is for the row being read: hidden at rest, shown under
// the pointer. Mutation: show it at rest, and a run of continuations reads as
// a column of clocks.
test("shows a continuation's gutter time only while the row is pointed at", () => {
  const uninstall = installSheets(...SHEETS);
  try {
    render(<Row continuation />);
    const row = screen.getByRole('article');
    const time = row.querySelector<HTMLElement>('.crewlet-chat-message__gutter-time')!;
    expect(getComputedStyle(time).visibility).toBe('hidden');
    const release = userAction(row, 'hover');
    expect(getComputedStyle(time).visibility).toBe('visible');
    release();
  } finally {
    uninstall();
  }
});

test('marks a mention, a flash, an outbox row and an edit by class', () => {
  const { rerender } = render(<Row highlight="mention" />);
  const row = screen.getByRole('article');
  expect(row.classList.contains('is-mention')).toBe(true);
  rerender(<Row flash pending="sending" />);
  expect(row.classList.contains('is-mention')).toBe(false);
  expect(row.classList.contains('is-flash')).toBe(true);
  expect(row.classList.contains('is-sending')).toBe(true);
  rerender(<Row pending="failed" editing />);
  expect(row.classList.contains('is-failed')).toBe(true);
  expect(row.classList.contains('is-editing')).toBe(true);
});

// No bold: the name is the medium weight.
test('sets the name at the medium weight and the time in the meta step', () => {
  const uninstall = installSheets(...SHEETS);
  try {
    render(<Row />);
    const row = screen.getByRole('article');
    expect(getComputedStyle(row.querySelector('.crewlet-chat-message__author')!).fontWeight).toBe('500');
    expect(getComputedStyle(row.querySelector('.crewlet-chat-message__time')!).fontVariantNumeric).toBe('tabular-nums');
  } finally {
    uninstall();
  }
});

test('the flash fades out, and stands still under reduced motion', () => {
  const moving = installMotion('no-preference', ...SHEETS);
  try {
    render(<Row flash />);
    expect(getComputedStyle(screen.getByRole('article')).animation).toMatch(/crewlet-chat-message-flash/);
  } finally {
    moving();
    cleanup();
  }
  const still = installMotion('reduce', ...SHEETS);
  try {
    render(<Row flash />);
    expect(getComputedStyle(screen.getByRole('article')).animation).toBe('none');
  } finally {
    still();
  }
});

test('the toolbar is hidden at rest and shown under the pointer, while active, and never while editing', () => {
  const uninstall = installSheets(...SHEETS);
  try {
    const { rerender } = render(<Row actions={tray} />);
    const row = screen.getByRole('article');
    const actions = row.querySelector<HTMLElement>('.crewlet-chat-message__actions')!;
    expect(getComputedStyle(actions).opacity).toBe('0');
    expect(getComputedStyle(actions).pointerEvents).toBe('none');
    const release = userAction(row, 'hover');
    expect(getComputedStyle(actions).opacity).toBe('1');
    release();
    rerender(<Row actions={tray} active />);
    expect(getComputedStyle(row.querySelector('.crewlet-chat-message__actions')!).opacity).toBe('1');
    rerender(<Row actions={tray} editing />);
    expect(row.querySelector('.crewlet-chat-message__actions')).toBeNull();
    expect(screen.queryByRole('toolbar')).toBeNull();
  } finally {
    uninstall();
  }
});

// A TOUCH SCREEN HAS NO HOVER: the tap that focuses the row shows its
// toolbar. Mutation: drop the (hover: none) rule, and touch has no way to
// reply, save or open More.
test('on a touch screen a tapped (focused) row shows its toolbar', () => {
  const uninstall = installHover('none', ...SHEETS);
  try {
    render(<Row actions={tray} />);
    const row = screen.getByRole('article');
    const actions = row.querySelector<HTMLElement>('.crewlet-chat-message__actions')!;
    expect(getComputedStyle(actions).opacity).toBe('0');
    row.focus();
    expect(getComputedStyle(actions).opacity).toBe('1');
  } finally {
    uninstall();
  }
});

function geometry(row: HTMLElement, top: number, scrollerTop: number) {
  row.getBoundingClientRect = () => ({ top, height: 60 }) as DOMRect;
  const scroller = row.closest<HTMLElement>('[role="log"]')!;
  // jsdom does not expand the sheet's `overflow` shorthand into its longhands.
  scroller.style.overflowY = 'auto';
  scroller.getBoundingClientRect = () => ({ top: scrollerTop, height: 400 }) as DOMRect;
  const bar = row.querySelector<HTMLElement>('.crewlet-chat-message__actions')!;
  Object.defineProperty(bar, 'offsetHeight', { configurable: true, value: 40 });
}

// THE TOOLBAR STANDS OVER THE ROW ABOVE, unless the scroller's edge would cut
// it. Mutation: never measure, and the first row's toolbar is clipped by the
// top of the log; always draw it inside, and it covers the row's own time.
test('measures the room above the row, and draws the toolbar inside it where the scroller would cut it', () => {
  const uninstall = installSheets('ChatThread/ChatThread.css', ...SHEETS);
  try {
    render(
      <ChatThread label="Conversation">
        <Row actions={tray} />
      </ChatThread>,
    );
    const row = screen.getByRole('article');
    geometry(row, 120, 100);
    fireEvent.pointerEnter(row);
    // 20px under the scroller's top, short of the toolbar's 40.
    expect(row.classList.contains('has-actions-inside')).toBe(true);
    geometry(row, 300, 100);
    fireEvent.pointerEnter(row);
    expect(row.classList.contains('has-actions-inside')).toBe(false);
    // Focus measures too, so the keyboard and a tap see the same placement.
    geometry(row, 110, 100);
    fireEvent.focus(row);
    expect(row.classList.contains('has-actions-inside')).toBe(true);
  } finally {
    uninstall();
  }
});

test("actionsPlacement='inside' always draws the toolbar inside the row", () => {
  render(<Row actions={tray} actionsPlacement="inside" />);
  expect(screen.getByRole('article').classList.contains('has-actions-inside')).toBe(true);
});

test("the arrow keys walk from row to row within the log, and a host's own handling wins", () => {
  const onKeyDown = vi.fn((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown') event.preventDefault();
  });
  render(
    <ChatThread label="Conversation">
      <Row id="a" label="First" />
      <Row id="b" label="Second" onKeyDown={onKeyDown} />
      <Row id="c" label="Third" />
    </ChatThread>,
  );
  const [first, second, third] = screen.getAllByRole('article');
  first!.focus();
  fireEvent.keyDown(first!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(second);
  // The host took ArrowDown on this row: focus stays.
  fireEvent.keyDown(second!, { key: 'ArrowDown' });
  expect(onKeyDown).toHaveBeenCalled();
  expect(document.activeElement).toBe(second);
  fireEvent.keyDown(second!, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(first);
  // At the first row there is nowhere to go up to.
  fireEvent.keyDown(first!, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(first);
  third!.focus();
  fireEvent.keyDown(third!, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(second);
});

test('keys pressed on a control inside the row are left to that control', () => {
  render(
    <ChatThread label="Conversation">
      <Row id="a" label="First" />
      <Row id="b" label="Second" />
    </ChatThread>,
  );
  const [first] = screen.getAllByRole('article');
  const name = screen.getAllByRole('button', { name: 'Product Manager' })[0]!;
  name.focus();
  fireEvent.keyDown(name, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(name);
  expect(first).not.toBe(document.activeElement);
});

test('a failed row says why on a status line, with Retry and Discard', () => {
  const onRetry = vi.fn();
  const onDiscard = vi.fn();
  render(<ChatMessageFailure reason="The engine did not answer." onRetry={onRetry} onDiscard={onDiscard} />);
  const line = screen.getByRole('status');
  expect(line.textContent).toContain('Not sent. The engine did not answer.');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onDiscard).toHaveBeenCalledTimes(1);
});

test("a failed row's words can be replaced", () => {
  render(<ChatMessageFailure onRetry={() => {}} onDiscard={() => {}} labels={{ notSent: 'Nicht gesendet.', retry: 'Erneut' }} />);
  expect(screen.getByRole('status').textContent).toContain('Nicht gesendet.');
  expect(screen.getByRole('button', { name: 'Erneut' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Discard' })).toBeTruthy();
});

test('carries no axe violation, as a head row, a continuation and a failed row', async () => {
  const { container } = render(
    <main>
      <ChatThread label="Conversation">
        <Row actions={<div role="toolbar" aria-label="Message actions" />} />
        <Row id="m2" label="Product Manager, 11:03 AM" continuation />
        <Row
          id="m3"
          label="You, 11:04 AM"
          pending="failed"
          footer={<ChatMessageFailure onRetry={() => {}} onDiscard={() => {}} />}
        />
      </ChatThread>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
