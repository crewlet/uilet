/**
 * The line under a message with replies: the repliers' faces, the count in
 * the accent's ink, how many are new and when the last came, as long as what
 * it says and named once for a screen reader; open is a state, not words.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets, installThemed, px, userAction } from '../../../../apps/ui-tests/src/cascade.js';
import { ThreadSummary, type ThreadSummaryProps } from './index.js';

afterEach(cleanup);

const people = [
  { name: 'Product Manager', kind: 'human' as const },
  { name: 'Senior Backend Engineer', id: 'swe' },
  { name: 'Designer', kind: 'human' as const },
  { name: 'CTO', id: 'cto' },
];

/** What the line says in words, part by part: the faces' initials left out. */
function words(line: HTMLElement): string {
  return [...line.querySelectorAll('.crewlet-thread-summary__count, .crewlet-tag, .crewlet-thread-summary__last')]
    .map((part) => part.textContent)
    .join(' ');
}

function Summary(props: Partial<ThreadSummaryProps>) {
  return <ThreadSummary replies={4} participants={people} last="12m ago" onOpen={() => {}} {...props} />;
}

test('is one button named by what it shows, which opens the thread', () => {
  const onOpen = vi.fn();
  render(<Summary unread={2} onOpen={onOpen} />);
  const line = screen.getByRole('button', { name: '4 replies, 2 new, last reply 12m ago' });
  expect(line.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(line);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(line.textContent).toContain('2 new');
});

test('one reply is a reply, and nothing is new unless told', () => {
  render(<Summary replies={1} participants={people.slice(0, 1)} />);
  expect(screen.getByRole('button', { name: '1 reply, last reply 12m ago' })).toBeTruthy();
  expect(document.querySelector('.crewlet-tag')).toBeNull();
});

test('draws three faces and counts the rest, said by nothing (the count says it), a fourth drawn rather than "+1"', () => {
  const { rerender } = render(<Summary />);
  const stack = () => document.querySelector('.crewlet-avatar-stack')!;
  const faces = () => stack().querySelectorAll('.crewlet-avatar-stack__member:not(.crewlet-avatar-stack__more)');
  expect(stack().getAttribute('aria-hidden')).toBe('true');
  expect(faces()).toHaveLength(4);
  expect(stack().querySelector('.crewlet-avatar-stack__more')).toBeNull();
  rerender(<Summary participants={[...people, { name: 'SRE', id: 'sre' }]} />);
  expect(faces()).toHaveLength(3);
  expect(stack().querySelector('.crewlet-avatar-stack__more')!.textContent).toBe('+2');
});

// OPEN IS A STATE, NOT WORDS: the button says it through aria-expanded and
// the line's class, and adds no word to the line. Mutation: print "Thread
// open" again, and the line grows and reads differently open and shut.
test('says the thread is open as its state, with no words added', () => {
  const { rerender } = render(<Summary />);
  const shut = screen.getByRole('button').textContent;
  rerender(<Summary open />);
  const line = screen.getByRole('button', { name: '4 replies, last reply 12m ago' });
  expect(line.getAttribute('aria-expanded')).toBe('true');
  expect(line.classList.contains('is-open')).toBe(true);
  expect(line.textContent).toBe(shut);
  expect(line.textContent).not.toMatch(/open|view/i);
});

test('draws the working line under it', () => {
  render(<Summary working={<p>Senior Backend Engineer is writing a reply</p>} />);
  expect(screen.getByText('Senior Backend Engineer is writing a reply').parentElement!.classList.contains('crewlet-thread-summary-wrap')).toBe(true);
});

// SHORT AND ALWAYS THE SAME: the count and when the last reply came are
// shown at rest, after a middle dot, and only the chevron comes in under the
// pointer, its place laid out all along. Mutation: hide the time at rest
// again, or print "View thread" at the end.
test('shows "4 replies · 12m ago" at rest, and only the chevron under the pointer', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ThreadSummary/ThreadSummary.css');
  try {
    render(<Summary />);
    const line = screen.getByRole('button');
    const last = line.querySelector<HTMLElement>('.crewlet-thread-summary__last')!;
    const chevron = line.querySelector<SVGElement>('.crewlet-thread-summary__chevron')!;
    expect(getComputedStyle(line.querySelector('.crewlet-thread-summary__count')!).fontWeight).toBe('500');
    expect(last.textContent).toBe('12m ago');
    expect(getComputedStyle(last).opacity).not.toBe('0');
    expect(words(line)).toBe('4 replies 12m ago');
    expect(getComputedStyle(chevron).opacity).toBe('0');
    expect(getComputedStyle(chevron).display).not.toBe('none');
    const release = userAction(line, 'hover');
    expect(getComputedStyle(chevron).opacity).toBe('1');
    expect(getComputedStyle(last).opacity).not.toBe('0');
    release();
  } finally {
    uninstall();
  }
});

// The message's selected surface is a `:has()` rule, which jsdom does not
// evaluate; the stories show it.
test('while its thread is open the line is the selected surface, without its chevron', () => {
  const uninstall = installThemed('light', 'ChatMessage/ChatScale.css', 'ThreadSummary/ThreadSummary.css');
  try {
    const { container, rerender } = render(<ThreadSummary replies={2} participants={[]} last="12m ago" onOpen={() => {}} />);
    const line = container.querySelector<HTMLElement>('.crewlet-thread-summary')!;
    const rest = { ground: getComputedStyle(line).backgroundColor, edge: getComputedStyle(line).borderTopColor };
    rerender(<ThreadSummary replies={2} participants={[]} last="12m ago" open onOpen={() => {}} />);
    expect(getComputedStyle(line).backgroundColor).not.toBe(rest.ground);
    expect(getComputedStyle(line).borderTopColor).not.toBe(rest.edge);
    expect(getComputedStyle(container.querySelector('.crewlet-thread-summary__chevron')!).visibility).toBe('hidden');
  } finally {
    uninstall();
  }
});

// AS LONG AS WHAT IT SAYS: the line is an inline box with no width of its
// own. Mutation: give it the old min(100%, 37.5rem) bar again.
test('hugs its content rather than running the column wide', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'ThreadSummary/ThreadSummary.css');
  try {
    render(<Summary />);
    const line = screen.getByRole('button');
    expect(getComputedStyle(line).display).toBe('inline-flex');
    expect(line.style.width).toBe('');
    expect(['', 'auto']).toContain(getComputedStyle(line).width);
  } finally {
    uninstall();
  }
});

test('takes its words from the caller', () => {
  render(<Summary labels={{ replies: (n) => `${n} Antworten`, last: (when) => `zuletzt ${when}` }} />);
  expect(screen.getByRole('button', { name: '4 Antworten, zuletzt 12m ago' })).toBeTruthy();
  expect(words(screen.getByRole('button'))).toBe('4 Antworten 12m ago');
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

// 20px FACES, OVERLAPPED, ON THE SMALL CONTROL'S LINE: a glance at who
// replied rather than a row of portraits. Mutation: draw the spread 24px
// faces again, and the line is 34px tall and wider by a face.
test('draws the repliers as an overlapped stack of 20px faces on a 26px line', () => {
  const uninstall = installSheets('ChatMessage/ChatScale.css', 'Avatar/Avatar.css', 'Avatar/AvatarStack.css', 'ThreadSummary/ThreadSummary.css');
  try {
    const { container } = render(<Summary />);
    const line = screen.getByRole('button');
    expect(px(line, 'height')).toBe(26);
    const stack = container.querySelector<HTMLElement>('.crewlet-avatar-stack')!;
    expect(stack.classList.contains('crewlet-avatar-stack--spread')).toBe(false);
    expect(stack.classList.contains('crewlet-avatar-stack--xs')).toBe(true);
    // Three faces and the count of the rest.
    const faces = [...stack.querySelectorAll<HTMLElement>('.crewlet-avatar-stack__member')];
    expect(faces).toHaveLength(4);
    expect(px(faces[1]!, 'margin-inline-start')).toBe(-2);
  } finally {
    uninstall();
  }
});
