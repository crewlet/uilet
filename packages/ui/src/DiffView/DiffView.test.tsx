/**
 * A line diff says what changed in words as well as in colour, and says what
 * it left out.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { DiffSummary, DiffView, collapseDiff, diffLines } from './index.js';

afterEach(cleanup);

const before = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join('\n');
const after = before.replace('line 10', 'line ten');
const sections = collapseDiff(diffLines(before, after), 1);

test('a changed line carries its word, and the drawn mark is hidden', () => {
  const { container } = render(<DiffView sections={sections} />);
  expect(screen.getByText('Removed')).toBeTruthy();
  expect(screen.getByText('Added')).toBeTruthy();
  const add = container.querySelector('.crewlet-diff-view__line--add')!;
  expect(add.textContent).toContain('line ten');
  expect(add.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

test('a dropped run says how many lines it stands for', () => {
  render(<DiffView sections={sections} />);
  expect(screen.getByText('8 unchanged lines')).toBeTruthy();
});

test('the region is named, and the name can be given', () => {
  const { rerender } = render(<DiffView sections={sections} />);
  expect(screen.getByRole('group', { name: 'Line changes' })).toBeTruthy();
  rerender(<DiffView sections={sections} aria-label="Changes to Onboarding" />);
  expect(screen.getByRole('group', { name: 'Changes to Onboarding' })).toBeTruthy();
});

test('the words can be said in another language', () => {
  render(<DiffView sections={sections} labels={{ added: 'Neu', skipped: (n) => `${n} gleich` }} />);
  expect(screen.getByText('Neu')).toBeTruthy();
  expect(screen.getByText('8 gleich')).toBeTruthy();
});

test('the summary reads a sentence in place of the drawn counts', () => {
  const { container } = render(<DiffSummary added={3} removed={1} against="version 4" />);
  expect(screen.getByText('3 lines added, 1 removed')).toBeTruthy();
  expect(container.textContent).toContain('against version 4');
  expect(container.querySelector('.crewlet-diff-summary__added')!.closest('[aria-hidden="true"]')).not.toBeNull();
});

test('a diff and its summary carry no violation', async () => {
  const { container } = render(
    <main>
      <DiffSummary added={1} removed={1} />
      <DiffView sections={sections} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
