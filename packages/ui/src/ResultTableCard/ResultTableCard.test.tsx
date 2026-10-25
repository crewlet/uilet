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
    // The first column still ends a long name in an ellipsis on one line.
    expect(getComputedStyle(first!).whiteSpace).toBe('nowrap');
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
