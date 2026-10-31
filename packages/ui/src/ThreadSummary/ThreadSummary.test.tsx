/**
 * The line under a message with replies: the repliers' faces, the count in
 * the accent's ink, how many are new and when the last came, named once for
 * a screen reader, and "View thread" in the time's cell under the pointer.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets, userAction } from '../../../../apps/ui-tests/src/cascade.js';
import { ThreadSummary, type ThreadSummaryProps } from './index.js';

afterEach(cleanup);

const people = [
  { name: 'Product Manager', kind: 'human' as const },
  { name: 'Senior Backend Engineer', id: 'swe' },
  { name: 'Designer', kind: 'human' as const },
  { name: 'CTO', id: 'cto' },
];

function Summary(props: Partial<ThreadSummaryProps>) {
  return <ThreadSummary replies={4} participants={people} last="12m ago" onOpen={() => {}} {...props} />;
}

test('is one button named by what it shows, which opens the thread', () => {
  const onOpen = vi.fn();
  render(<Summary unread={2} onOpen={onOpen} />);
  const line = screen.getByRole('button', { name: '4 replies, 2 new, Last reply 12m ago' });
  expect(line.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(line);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(line.textContent).toContain('2 new');
});

test('one reply is a reply, and nothing is new unless told', () => {
  render(<Summary replies={1} participants={people.slice(0, 1)} />);
  expect(screen.getByRole('button', { name: '1 reply, Last reply 12m ago' })).toBeTruthy();
  expect(document.querySelector('.crewlet-tag')).toBeNull();
});

test('draws at most three faces, said by nothing (the count says it)', () => {
  render(<Summary />);
  const stack = document.querySelector('.crewlet-avatar-stack')!;
  expect(stack.getAttribute('aria-hidden')).toBe('true');
  expect(stack.querySelectorAll('.crewlet-avatar-stack__member:not(.crewlet-avatar-stack__more)')).toHaveLength(3);
  expect(stack.querySelector('.crewlet-avatar-stack__more')!.textContent).toBe('+1');
});

test('says the thread is open while it is', () => {
  render(<Summary open />);
  const line = screen.getByRole('button', { name: '4 replies, Last reply 12m ago' });
  expect(line.getAttribute('aria-expanded')).toBe('true');
  expect(line.classList.contains('is-open')).toBe(true);
  expect(line.querySelector('.crewlet-thread-summary__view')!.textContent).toBe('Thread open');
});

test('draws the working line under it', () => {
  render(<Summary working={<p>Senior Backend Engineer is writing a reply</p>} />);
  expect(screen.getByText('Senior Backend Engineer is writing a reply').parentElement!.classList.contains('crewlet-thread-summary-wrap')).toBe(true);
});

// "View thread" takes the time's place in the same cell under the pointer,
// so the line keeps its width. Mutation: show both, or neither.
test('swaps the last reply time for View thread under the pointer, and sets the count at the medium weight', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ThreadSummary/ThreadSummary.css');
  try {
    render(<Summary />);
    const line = screen.getByRole('button');
    const last = line.querySelector<HTMLElement>('.crewlet-thread-summary__last')!;
    const view = line.querySelector<HTMLElement>('.crewlet-thread-summary__view')!;
    expect(getComputedStyle(line.querySelector('.crewlet-thread-summary__count')!).fontWeight).toBe('500');
    expect(getComputedStyle(last).visibility).toBe('visible');
    expect(getComputedStyle(view).visibility).toBe('hidden');
    const release = userAction(line, 'hover');
    expect(getComputedStyle(last).visibility).toBe('hidden');
    expect(getComputedStyle(view).visibility).toBe('visible');
    release();
    expect(getComputedStyle(last).gridArea).toBe(getComputedStyle(view).gridArea);
  } finally {
    uninstall();
  }
});

test('takes its words from the caller', () => {
  render(<Summary labels={{ replies: (n) => `${n} Antworten`, last: (when) => `Zuletzt ${when}` }} />);
  expect(screen.getByRole('button', { name: '4 Antworten, Zuletzt 12m ago' })).toBeTruthy();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Summary unread={1} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
