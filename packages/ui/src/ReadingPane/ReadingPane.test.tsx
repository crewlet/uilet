/**
 * One item read in full: an article named by its title, a byline with its
 * note, the reasoning, what the reader did, and the conversation a level
 * deeper in the outline.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { HeadingLevelProvider } from '../utils/headingLevel.js';
import {
  ReadingPane,
  ReadingPaneByline,
  ReadingPaneLead,
  ReadingPaneOutcome,
  ReadingPaneQuote,
  ReadingPaneReasoning,
  ReadingPaneSection,
  ReadingPaneTitle,
  READING_PANE_ENTER,
} from './index.js';

afterEach(cleanup);

function Item() {
  return (
    <ReadingPane>
      <ReadingPaneByline
        leading={<span aria-hidden="true">PM</span>}
        note="you follow this task"
      >
        <strong>Crewlet-PM</strong> asks for your approval on <a href="#/worklet/FAIR-3">FAIR-3</a>
      </ReadingPaneByline>
      <ReadingPaneTitle>Which settlement should the ledger use?</ReadingPaneTitle>
      <ReadingPaneLead>
        <p>Two strategies pass the tests.</p>
      </ReadingPaneLead>
      <ReadingPaneReasoning
        title={
          <>
            Crewlet-PM recommends <strong>Exact search</strong>
          </>
        }
        footer={<a href="#/doclet/p-1">Settlement notes</a>}
      >
        <p>It needs the fewest transfers.</p>
      </ReadingPaneReasoning>
      <ReadingPaneOutcome>
        Answered <strong>Exact search</strong>
      </ReadingPaneOutcome>
      <ReadingPaneSection label="Replies to this question">
        <p>No replies yet.</p>
      </ReadingPaneSection>
    </ReadingPane>
  );
}

test('the article is named by its title', () => {
  render(<Item />);
  expect(screen.getByRole('article', { name: 'Which settlement should the ledger use?' })).toBeTruthy();
});

test('the title is a heading at the level the pane sits at, and a section is one deeper', () => {
  render(
    <HeadingLevelProvider level={3}>
      <Item />
    </HeadingLevelProvider>,
  );
  expect(screen.getByRole('heading', { name: 'Which settlement should the ledger use?' }).tagName).toBe('H3');
  expect(screen.getByRole('heading', { name: 'Replies to this question' }).tagName).toBe('H4');
  expect(screen.getByRole('region', { name: 'Replies to this question' })).toBeTruthy();
});

test('the byline note is set apart, and its separator is not read', () => {
  const { container } = render(<Item />);
  const note = container.querySelector('.crewlet-reading-pane__note')!;
  expect(note.textContent).toBe('· you follow this task');
  expect(note.querySelector('[aria-hidden="true"]')!.textContent).toBe('· ');
});

test('what the reader did is a status line, announced when it appears', () => {
  render(<Item />);
  expect(screen.getByRole('status').textContent).toBe('Answered Exact search');
});

test('a machine wrote it: the quote is set verbatim', () => {
  const { container } = render(
    <ReadingPane>
      <ReadingPaneTitle>Run asks</ReadingPaneTitle>
      <ReadingPaneQuote verbatim>Should I delete the fixture directory?</ReadingPaneQuote>
    </ReadingPane>,
  );
  expect(container.querySelector('blockquote')!.className).toContain('crewlet-reading-pane__quote--verbatim');
});

test('a part drawn outside a pane says so rather than naming nothing', () => {
  expect(() => render(<ReadingPaneTitle>Alone</ReadingPaneTitle>)).toThrow(/inside a ReadingPane/);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Inbox</h1>
      <Item />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('a pending outcome is a status without the success check', () => {
  const { container } = render(
    <ReadingPaneOutcome tone="pending">
      Sent <strong>Yes</strong>
    </ReadingPaneOutcome>,
  );
  const line = screen.getByRole('status');
  expect(line.getAttribute('data-tone')).toBe('pending');
  expect(line.classList.contains('crewlet-reading-pane__outcome--pending')).toBe(true);
  cleanup();
  const done = render(<ReadingPaneOutcome>Answered</ReadingPaneOutcome>).container;
  const mark = (c: HTMLElement) => c.querySelector('.crewlet-reading-pane__outcome-mark')?.outerHTML;
  expect(mark(done)).not.toBe(mark(container));
  expect(screen.getByRole('status').getAttribute('data-tone')).toBe('done');
});

// ---- A new item: played in, and focus follows it where it was the item's ----

function Pane({ item, focusTarget }: { item: string; focusTarget?: () => HTMLElement | null }) {
  return (
    <>
      <button type="button">In the list</button>
      <ReadingPane contentKey={item} focusTarget={focusTarget}>
        <ReadingPaneTitle>Question {item}</ReadingPaneTitle>
        <button type="button">Answer {item}</button>
      </ReadingPane>
    </>
  );
}

test('a new item plays in, and focus left in the pane moves to its title without scrolling', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  const { container, rerender } = render(<Pane item="1" />);
  const column = () => container.querySelector('.crewlet-reading-pane__column')!;
  // The first item is not played in: the page opened on it.
  expect(column().classList.contains('crewlet-reading-pane__column--entering')).toBe(false);
  screen.getByRole('button', { name: 'Answer 1' }).focus();
  rerender(<Pane item="2" />);
  expect(column().classList.contains('crewlet-reading-pane__column--entering')).toBe(true);
  const title = screen.getByRole('heading', { name: 'Question 2' });
  expect(document.activeElement).toBe(title);
  expect(title.getAttribute('tabindex')).toBe('-1');
  expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  focus.mockRestore();
});

test('focus a reader left in the list stays there, and a host can name where focus goes', () => {
  const { rerender } = render(<Pane item="1" />);
  const list = screen.getByRole('button', { name: 'In the list' });
  list.focus();
  rerender(<Pane item="2" />);
  expect(document.activeElement).toBe(list);

  screen.getByRole('button', { name: 'Answer 2' }).focus();
  rerender(<Pane item="3" focusTarget={() => screen.getByRole('button', { name: 'Answer 3' })} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Answer 3' }));
});

test('the entrance is the kit\'s motion, and nothing moves under reduced motion', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ReadingPane.css'), 'utf8');
  expect(css).toContain(
    `animation: ${READING_PANE_ENTER.animations[0]} var(--motion-duration-moderate) var(--motion-easing-out);`,
  );
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  expect(reduced).toMatch(/\.crewlet-reading-pane__column--entering\s*\{\s*animation: none;/);
});
