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
import { ChangeList, ChangeListItems, shortenUnchanged, type ChangeListRow } from './index.js';

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
  expect(words.querySelector('del')!.textContent).toBe('removed: one hour; ');
  expect(words.querySelector('ins')!.textContent).toBe('added: 30 minutes');
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

test('two changed runs that touch are said apart, with nothing added to the drawing', () => {
  const { container } = render(
    <ChangeList
      rows={[
        {
          kind: 'text',
          label: 'Mission',
          words: [
            { op: '=', text: 'Build a good ' },
            { op: '-', text: 'relationship. test' },
            { op: '+', text: 'relationship.' },
          ],
        },
      ]}
    />,
  );
  const words = container.querySelector('.crewlet-change-list__words')!;
  expect(words.textContent).toBe('Build a good removed: relationship. test; added: relationship.');
  // Every word the reader hears and does not see is in a hidden span, so the
  // visible runs are the words alone.
  const hidden = [...words.querySelectorAll('.crewlet-visually-hidden')].map((node) => node.textContent);
  expect(hidden).toEqual(['removed: ', '; ', 'added: ']);
});

// A LIST OR PARAGRAPHS ARE DRAWN AS THEMSELVES, never joined into one run-on
// line inside a highlight: a block value takes the row's width under its
// label, its tint is the block, and a list is a list. Mutation: draw a block
// row's value inline, or join ChangeListItems' items.
test('a block value is drawn across the row, a list as a list, and said like a line', async () => {
  const { container } = render(
    <main>
      <ChangeList
        heading="What will change"
        rows={[
          {
            kind: 'added',
            label: 'Responsibilities',
            block: true,
            isNew: true,
            to: <ChangeListItems items={['Review the tests', 'Approve or send back']} />,
          },
          { kind: 'changed', label: 'Guidelines', block: true, from: 'One rule', to: <ChangeListItems items={['One rule', 'Two rules']} /> },
          { kind: 'removed', label: 'Avoid', block: true, from: 'Line one\nLine two' },
          { kind: 'fact', label: 'Page', block: true, value: 'First paragraph\n\nSecond paragraph' },
        ]}
      />
    </main>,
  );
  const rows = [...container.querySelectorAll('.crewlet-change-list__row')];
  expect(rows.every((row) => row.classList.contains('crewlet-change-list__row--block'))).toBe(true);
  const added = rows[0]!.querySelector('ins.crewlet-change-list__block')!;
  expect([...added.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Review the tests', 'Approve or send back']);
  expect(rows[0]!.querySelector('.crewlet-change-list__value')!.textContent).toBe('NewAdded: Review the testsApprove or send back');
  expect(rows[1]!.querySelector('.crewlet-change-list__value')!.textContent).toBe('Changed from One ruleto One ruleTwo rules');
  expect(rows[2]!.querySelector('del.crewlet-change-list__block')!.textContent).toBe('Removed: Line one\nLine two');
  expect(rows[3]!.querySelector('.crewlet-change-list__block--plain')!.textContent).toBe('First paragraph\n\nSecond paragraph');
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('a line value stays inline, whatever it holds', () => {
  const { container } = render(<ChangeList rows={[{ kind: 'added', label: 'Title', to: 'Fix the test' }]} />);
  expect(container.querySelector('.crewlet-change-list__row--block')).toBeNull();
  expect(container.querySelector('.crewlet-change-list__block')).toBeNull();
});
