/**
 * A result in a card: the table named by its title (said, not shown twice),
 * figures at the end with a total row, the card as the only frame, a foot of
 * utilities that fetch each export on its press, and a long result shortened
 * to its first rows with "Show all".
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { ButtonLink } from '../Button/index.js';
import { ResultTableCard } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ROWS = [
  ['Agent SWE', '2,960,000', '38%'],
  ['Agent CTO', '860,000', '11%'],
];

test('is a section with a table named by its title, figures at the end and a total row', () => {
  const { container } = render(
    <ResultTableCard
      title="Token spend by agent"
      window="This week, from Monday"
      headers={['Agent', 'Tokens', 'Share']}
      rows={ROWS}
      align={['start', 'end', 'end']}
      total={['Total', '7,840,000', '100%']}
    />,
  );
  expect(screen.getByRole('region', { name: 'Token spend by agent' })).toBeTruthy();
  const table = screen.getByRole('table', { name: 'Token spend by agent' });
  expect(within(table).getByRole('rowheader', { name: 'Total' })).toBeTruthy();
  expect(container.querySelector('.crewlet-table--flush')).not.toBeNull();
  expect(container.querySelector('.crewlet-card__subtitle')!.textContent).toBe('This week, from Monday');
});

test('a text cell breaks between words, never inside one, and a figure never wraps', () => {
  const uninstall = installSheets('Table/Table.css', 'ResultTableCard/ResultTableCard.css');
  try {
    const { container } = render(
      <ResultTableCard
        title="Seats by role"
        headers={['Agent', 'Role', 'Tokens', 'Last run']}
        rows={[['Agent PM', 'Product Manager, Growth and Retention', '2,960,000', 'Oct 24, 2026, 9:41 PM']]}
        align={['start', 'start', 'end', 'end']}
      />,
    );
    const [first, role, tokens, date] = [...container.querySelectorAll<HTMLElement>('tbody tr:first-child > *')];
    // Not Table's own `anywhere`, which let an auto layout shrink a column to one letter.
    expect(getComputedStyle(role!).overflowWrap).toBe('break-word');
    expect(getComputedStyle(tokens!).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(date!).whiteSpace).toBe('nowrap');
    // The first column's name breaks between words as the role does.
    expect(getComputedStyle(first!).overflowWrap).toBe('break-word');
  } finally {
    uninstall();
  }
});

test('the first column wraps a long name between words rather than cutting it', () => {
  // A name cut with an ellipsis could not be read in full: a result's row is
  // not a link and its cell has no title. In a 358px panel "Write the MVP
  // plan" read "Write the MVP ...".
  const uninstall = installSheets('Table/Table.css', 'ResultTableCard/ResultTableCard.css');
  try {
    const { container } = render(
      <ResultTableCard
        title="Tasks"
        headers={['Title', 'Status', 'Assignee', 'Due']}
        rows={[['Write the MVP plan and the first sprint for FairSplit', 'To do', 'pm', 'Oct 31, 2026']]}
        align={['start', 'start', 'start', 'end']}
      />,
    );
    const [name, status, , due] = [...container.querySelectorAll<HTMLElement>('tbody tr:first-child > *')];
    const style = getComputedStyle(name!);
    expect(style.whiteSpace).not.toBe('nowrap');
    expect(style.textOverflow).not.toBe('ellipsis');
    expect(style.overflow).not.toBe('hidden');
    expect(style.overflowWrap).toBe('break-word');
    // No width of its own, so the auto layout shares the room by content and
    // the columns beside it are not squeezed to their longest word.
    expect(style.width).toBe('auto');
    expect(style.maxWidth).not.toBe('0px');
    expect(getComputedStyle(status!).whiteSpace).not.toBe('nowrap');
    // A date stays on one line.
    expect(getComputedStyle(due!).whiteSpace).toBe('nowrap');
  } finally {
    uninstall();
  }
});

test('the foot starts with the downloads, each fetched on its press, and ends with the link', () => {
  const csv = vi.fn(() => new Promise<Blob>(() => {}));
  const { container } = render(
    <ResultTableCard
      title="Token spend by agent"
      headers={['Agent', 'Tokens']}
      rows={ROWS.map((row) => row.slice(0, 2))}
      downloads={[
        { label: 'CSV', filename: 'token-spend.csv', file: csv },
        { label: 'XLSX', filename: 'token-spend.xlsx', file: () => new Promise<Blob>(() => {}) },
      ]}
      link={
        <ButtonLink href="#/spend" variant="ghost" size="small">
          Open in Spend
        </ButtonLink>
      }
    />,
  );
  const foot = container.querySelector('.crewlet-status-card__actions--start')!;
  expect(within(foot as HTMLElement).getAllByRole('button').map((button) => button.textContent)).toEqual(['CSV', 'XLSX']);
  expect(within(foot as HTMLElement).getByRole('link', { name: 'Open in Spend' }).getAttribute('href')).toBe('#/spend');
  expect(csv).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
  expect(csv).toHaveBeenCalledTimes(1);
});

test('a folding result keeps its downloads where they are when it opens', () => {
  // OPENING THE CARD NEVER MOVES A CONTROL UNDER THE POINTER: the downloads
  // stand in the head, folded or open, so a reader who pressed the title to
  // open it does not find the CSV button arriving where they pressed.
  const { container } = render(
    <ResultTableCard
      title="Tasks"
      collapsible
      summary="2 rows"
      headers={['Agent', 'Tokens']}
      rows={ROWS.map((row) => row.slice(0, 2))}
      downloads={[{ label: 'CSV', filename: 'tasks.csv', file: () => new Promise<Blob>(() => {}) }]}
    />,
  );
  const head = () => container.querySelector('.crewlet-card__header-actions');
  const before = within(head() as HTMLElement).getByRole('button', { name: 'CSV' });
  fireEvent.click(screen.getByRole('button', { name: 'Tasks, 2 rows' }));
  expect(within(head() as HTMLElement).getByRole('button', { name: 'CSV' })).toBe(before);
  expect(container.querySelector('.crewlet-status-card__actions')).toBeNull();
});

test('a long result shows its first rows and "Show all", which shows the rest in place', () => {
  const many = Array.from({ length: 48 }, (_, index) => [`Agent ${index + 1}`, String(index)]);
  render(<ResultTableCard title="Spend" headers={['Agent', 'Tokens']} rows={many} />);
  expect(screen.getAllByRole('row').length).toBe(11);
  fireEvent.click(screen.getByRole('button', { name: 'Show all 48' }));
  expect(screen.getAllByRole('row').length).toBe(49);
  expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
});

test('an empty result says so', () => {
  render(<ResultTableCard title="Spend" headers={['Agent', 'Tokens']} rows={[]} />);
  expect(screen.getByText('No rows match.')).toBeTruthy();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ResultTableCard
        title="Token spend by agent"
        headers={['Agent', 'Tokens']}
        rows={ROWS.map((row) => row.slice(0, 2))}
        total={['Total', '3,820,000']}
        downloads={[{ label: 'CSV', filename: 'spend.csv', file: () => Promise.resolve(new Blob([''])) }]}
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});

test('a folding result keeps its downloads and its link at the end of its head', () => {
  const { container } = render(
    <ResultTableCard
      title="Tasks"
      collapsible
      summary="2 rows"
      headers={['Task', 'Status']}
      rows={[
        ['Fix the sign-in test', 'Blocked'],
        ['Ship the drawer', 'Done'],
      ]}
      downloads={[{ label: 'CSV', filename: 'tasks.csv', file: () => Promise.resolve(new Blob([''])) }]}
      link={<a href="#/tasks">Open in Tasks</a>}
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Tasks, 2 rows' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  const head = container.querySelector('.crewlet-card__header-actions')!;
  expect(within(head as HTMLElement).getByRole('button', { name: /CSV/ })).toBeTruthy();
  expect(within(head as HTMLElement).getByRole('link', { name: 'Open in Tasks' })).toBeTruthy();
  expect(container.querySelector('table')!.closest('[hidden]')).not.toBeNull();
  fireEvent.click(toggle);
  expect(container.querySelector('table')!.closest('[hidden]')).toBeNull();
  // Open, they stay where they were.
  expect(within(container.querySelector('.crewlet-card__header-actions') as HTMLElement).getByRole('link', { name: 'Open in Tasks' })).toBeTruthy();
});
