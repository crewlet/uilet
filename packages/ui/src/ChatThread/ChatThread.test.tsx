/**
 * A conversation as it grows: a focusable log with its live region off, busy
 * while a request runs; it follows the end only while the reader is within
 * 48px of it, counts what arrives once they scroll away, returns with Jump to
 * latest, and reveals a decision's head when the whole card does not fit.
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
  // Within 48px of the end still counts as at the end.
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

test('counts what arrived since the reader scrolled away, and Jump to latest returns them', () => {
  const { rerender } = render(<ChatThread label="Conversation">{items(3)}</ChatThread>);
  const log = screen.getByRole('log');
  layout(log, 1000);
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

test('reveals a decision whole when it fits, and its head at the top when it does not', () => {
  const handle = createRef<ChatThreadHandle>();
  render(
    <ChatThread ref={handle} label="Conversation">
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
  expect(log.scrollTop).toBe(800);
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
  layout(log, 1000);
  log.scrollTop = 0;
  fireEvent.scroll(log);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
