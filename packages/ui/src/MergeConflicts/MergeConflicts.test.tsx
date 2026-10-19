/**
 * Settling a merge: every clash shows both sides, nothing is chosen for the
 * person, and Apply reports one choice per clash once each has one.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { MergeConflicts } from './index.js';

afterEach(cleanup);

const CLASHES = [
  { theirs: ['Page the lead within five minutes.'], mine: ['Page the lead within ten minutes.'] },
  { theirs: [], mine: ['Escalate after an hour.'] },
];

test('shows both sides of every clash, and a removed passage as removed', () => {
  render(<MergeConflicts clashes={CLASHES} theirs="version 4" onApply={() => {}} onCancel={() => {}} />);
  expect(screen.getByRole('heading', { name: 'You and version 4 changed the same lines in 2 places' })).toBeDefined();
  expect(screen.getByText('Page the lead within five minutes.')).toBeDefined();
  expect(screen.getByText('Page the lead within ten minutes.')).toBeDefined();
  expect(screen.getByText('(removed)')).toBeDefined();
  expect(screen.getAllByText('Theirs · version 4')).toHaveLength(2);
});

test('applies nothing until every clash has an answer, then reports them in order', () => {
  const onApply = vi.fn();
  render(<MergeConflicts clashes={CLASHES} theirs="version 4" onApply={onApply} onCancel={() => {}} />);
  const apply = screen.getByRole('button', { name: /Apply to my draft/ });
  fireEvent.click(apply);
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.getByText('2 places still to settle.')).toBeDefined();
  const [first, second] = screen.getAllByRole('radiogroup');
  fireEvent.click(within(first!).getByRole('radio', { name: 'Yours' }));
  fireEvent.click(within(second!).getByRole('radio', { name: 'Both' }));
  fireEvent.click(apply);
  expect(onApply).toHaveBeenCalledWith(['mine', 'both']);
});

test('moves focus to its heading, and Not now cancels', () => {
  const onCancel = vi.fn();
  render(<MergeConflicts clashes={CLASHES.slice(0, 1)} theirs="revision 3" onApply={() => {}} onCancel={onCancel} />);
  expect(document.activeElement?.textContent).toBe('You and revision 3 changed the same lines');
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  expect(onCancel).toHaveBeenCalled();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <MergeConflicts clashes={CLASHES} theirs="version 4" onApply={() => {}} onCancel={() => {}} />
    </main>,
  );
  const result = await axe.run(container, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
