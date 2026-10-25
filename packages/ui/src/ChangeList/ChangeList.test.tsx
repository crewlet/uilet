/**
 * What a change will do, as before and after: a description list under its
 * heading, a pair said in words ("Changed from X to Y"), added and removed
 * values announced as such, a word diff that shortens long unchanged runs and
 * opens the whole change as a DiffList, and a settled list that keeps its
 * record.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ChangeList, shortenUnchanged, type ChangeListRow } from './index.js';

afterEach(cleanup);

const ROWS: ChangeListRow[] = [
  { kind: 'fact', label: 'Page', value: 'On-call runbook', note: 'Version 14, read 2 min ago' },
  { kind: 'changed', label: 'Status', from: 'Any open status', to: 'Blocked' },
  { kind: 'added', label: 'Reviewer', to: 'Agent CTO', isNew: true },
  { kind: 'removed', label: 'Labels', from: 'draft' },
  {
    kind: 'text',
    label: 'Escalation',
    words: [
      { op: '=', text: 'If the incident is not resolved within ' },
      { op: '-', text: 'one hour' },
      { op: '+', text: '30 minutes' },
      { op: '=', text: ', page the on-call engineer.' },
    ],
    whole: [{ kind: 'changed', path: 'Escalation › wait', from: 'one hour', to: '30 minutes' }],
  },
];

test('is a description list named by its heading, one row per field', () => {
  render(<ChangeList heading="What will change" rows={ROWS} />);
  const list = document.querySelector('dl')!;
  expect(list.getAttribute('aria-labelledby')).toBeTruthy();
  expect(document.getElementById(list.getAttribute('aria-labelledby')!)!.textContent).toBe('What will change');
  expect(within(list).getAllByRole('term').map((term) => term.textContent)).toEqual([
    'Page',
    'Status',
    'Reviewer',
    'Labels',
    'Escalation',
  ]);
});

test('a pair is said in words, and added and removed values say so', () => {
  const { container } = render(<ChangeList rows={ROWS} />);
  const value = (kind: string) => container.querySelector(`.crewlet-change-list__row--${kind} .crewlet-change-list__value`)!;
  expect(value('changed').textContent).toBe('Changed from Any open status to Blocked');
  expect(value('changed').querySelector('del')!.textContent).toBe('Any open status');
  expect(value('changed').querySelector('ins')!.textContent).toBe('Blocked');
  expect(value('added').textContent).toBe('Added: Agent CTONew');
  expect(value('removed').textContent).toBe('Removed: draft');
  expect(value('fact').textContent).toBe('On-call runbookVersion 14, read 2 min ago');
});

test('a word diff marks each run, and opens the whole change as a DiffList', () => {
  const { container } = render(<ChangeList rows={ROWS} />);
  const words = container.querySelector('.crewlet-change-list__words')!;
  expect(words.querySelector('del')!.textContent).toBe('removed one hour');
  expect(words.querySelector('ins')!.textContent).toBe('added 30 minutes');
  const toggle = screen.getByRole('button', { name: 'Show the whole change' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const diff = container.querySelector('.crewlet-diff-list')!;
  expect(diff.classList.contains('crewlet-diff-list--auto')).toBe(true);
  expect(diff.textContent).toContain('Escalation › wait');
});

test('long unchanged runs are shortened at word boundaries, keeping the words that touch the change', () => {
  const long = 'Everyone who can open Engineering and Runbooks sees the new version as soon as it is saved by the approver ';
  expect(shortenUnchanged('short', 'first')).toBe('short');
  const first = shortenUnchanged(long, 'first', 40);
  expect(first.startsWith('… ')).toBe(true);
  expect(first.endsWith('approver ')).toBe(true);
  const last = shortenUnchanged(` ${long}`, 'last', 40);
  expect(last.startsWith(' Everyone')).toBe(true);
  expect(last.endsWith(' …')).toBe(true);
  const middle = shortenUnchanged(` ${long}`, 'middle', 40);
  expect(middle).toMatch(/^ Everyone.* … .*approver $/);
});

test('a settled list keeps every pair', () => {
  const { container } = render(<ChangeList heading="What changed" rows={ROWS} settled />);
  expect(container.querySelector('.crewlet-change-list--settled')).not.toBeNull();
  expect(container.querySelectorAll('ins').length).toBeGreaterThan(0);
});

test('carries no axe violation, closed and with the whole change open', async () => {
  const { container } = render(
    <main>
      <ChangeList heading="What will change" rows={ROWS} />
    </main>,
  );
  const run = () =>
    axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
  expect((await run()).violations).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Show the whole change' }));
  expect((await run()).violations).toEqual([]);
});
