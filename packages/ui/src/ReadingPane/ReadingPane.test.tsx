/**
 * One item read in full: an article named by its title, a byline with its
 * note, the reasoning, what the reader did, and the conversation a level
 * deeper in the outline.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
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
} from './index.js';

afterEach(cleanup);

function Item() {
  return (
    <ReadingPane>
      <ReadingPaneByline
        leading={<span aria-hidden="true">PM</span>}
        note="you follow this task"
      >
        <strong>Crewlet-PM</strong> asks for your approval on <a href="#/work/FAIR-3">FAIR-3</a>
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
        footer={<a href="#/knowledge/p-1">Settlement notes</a>}
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
