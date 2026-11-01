/**
 * The read-only table cells: an absent value says what kind of absence it is,
 * a long value keeps to one line with its whole text on hover, and a mark is
 * never the only carrier of a fact.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import {
  TableDateCell,
  TableEntityCell,
  TableKeyCell,
  TableNumberCell,
  TableStatusCell,
  TableTagsCell,
  TableTextCell,
  TableTwoLineCell,
} from './index.js';

afterEach(cleanup);

const NOW = Date.parse('2026-10-18T12:00:00Z');

test('every absent value is a marked absence that says what it means', () => {
  render(
    <>
      <TableKeyCell value="" />
      <TableNumberCell value={null} />
      <TableDateCell value={null} />
      <TableEntityCell name={undefined} />
      <TableTagsCell tags={[]} />
      <TableNumberCell value={undefined} emptyLabel="Not measured" />
    </>,
  );
  for (const word of ['Not set', 'Nothing recorded', 'Never', 'Nobody', 'No tags', 'Not measured']) {
    expect(screen.getByText(word)).toBeTruthy();
  }
});

test('a zero is a figure, not an absence', () => {
  render(<TableNumberCell value={0} />);
  expect(screen.getByText('0')).toBeTruthy();
});

test("a figure is spelled by the host's formatter, with its suffix", () => {
  render(<TableNumberCell value={5400} format={(n) => `${(n / 1000).toFixed(1)}s`} suffix=" total" />);
  expect(screen.getByText('5.4s total')).toBeTruthy();
});

test('an identifier prints its short form and keeps its whole value on the title, as a link when given one', () => {
  render(<TableKeyCell value="work:task:0b4c6f0e-1111" text="work:task:0b4c" href="#/worklet/0b4c" />);
  const link = screen.getByRole('link', { name: 'work:task:0b4c' });
  expect(link.getAttribute('href')).toBe('#/worklet/0b4c');
  expect(link.getAttribute('title')).toBe('work:task:0b4c6f0e-1111');
});

test('a date reads relative, with the exact instant in the time element', () => {
  const { container } = render(<TableDateCell value="2026-10-18T11:56:00Z" now={NOW} />);
  expect(screen.getByText('4m ago')).toBeTruthy();
  expect(container.querySelector('time')!.getAttribute('dateTime')).toBe('2026-10-18T11:56:00.000Z');
});

test('an entity is read once, by its name, and links only when told to', () => {
  const { rerender } = render(<TableEntityCell name="Ada Lovelace" kind="human" href="#/agents/ada" />);
  expect(screen.getByRole('link', { name: 'Ada Lovelace' }).getAttribute('href')).toBe('#/agents/ada');
  rerender(<TableEntityCell name="Planner" badge={<span>P</span>} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('P').closest('[aria-hidden="true"]')).not.toBeNull();
});

test('a status prints its word, and its mark is hidden', () => {
  const { container } = render(<TableStatusCell glyph="○" label="No apply reported" tone="warning" />);
  expect(screen.getByText('No apply reported')).toBeTruthy();
  expect(container.querySelector('.crewlet-table-cell__glyph')!.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelector('.crewlet-table-cell__status--warning')).not.toBeNull();
});

test('tags past the cap are counted in words and named on the title', () => {
  const { container } = render(<TableTagsCell tags={['alpha', 'beta', 'gamma', 'delta', 'epsilon']} />);
  expect(screen.getByText('2 more tags')).toBeTruthy();
  expect(container.querySelector('.crewlet-table-cell__more')!.getAttribute('title')).toBe('delta, epsilon');
});

test("a column's icon is hidden and a row's mark is read", () => {
  const { container, rerender } = render(<TableTextCell icon={<svg data-testid="icon" />}>Memory</TableTextCell>);
  expect(container.querySelector('.crewlet-table-cell__icon')!.getAttribute('aria-hidden')).toBe('true');
  rerender(
    <TableTextCell mark={<span role="img" aria-label="Bug" />}>Login fails</TableTextCell>,
  );
  expect(screen.getByRole('img', { name: 'Bug' })).toBeTruthy();
});

test('a row of every cell carries no violation', async () => {
  const { container } = render(
    <table>
      <tbody>
        <tr>
          <td><TableKeyCell value="ENG-1" href="#/eng-1" /></td>
          <td><TableNumberCell value={12} /></td>
          <td><TableDateCell value="2026-10-18T11:00:00Z" now={NOW} /></td>
          <td><TableEntityCell name="Maya" kind="human" href="#/maya" /></td>
          <td><TableStatusCell glyph="●" label="Running" tone="success" /></td>
          <td><TableTagsCell tags={['a', 'b', 'c', 'd']} /></td>
          <td><TableTextCell icon={<svg />}>Plain</TableTextCell></td>
          <td><TableTwoLineCell value="linear" detail="api.linear.app" mark={<svg role="img" aria-label="Linear" />} /></td>
        </tr>
      </tbody>
    </table>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});

/** Lays an element out as a browser would have: jsdom measures every box as 0 by 0. */
function cutTo(element: HTMLElement, clientWidth: number, scrollWidth: number) {
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => clientWidth });
  Object.defineProperty(element, 'scrollWidth', { configurable: true, get: () => scrollWidth });
}

test('a two-line cell sets its value in the cell’s register over a quieter caption, each cut on one line', () => {
  render(<TableTwoLineCell value="Linear" detail="Remote, company-shared" />);
  const value = screen.getByText('Linear');
  const detail = screen.getByText('Remote, company-shared');
  // The value inherits the grid's size and ink; the line under it is a caption in the secondary ink.
  expect(value.className).toContain('crewlet-text--inherit');
  expect(detail.className).toContain('crewlet-text--caption');
  expect(detail.className).toContain('crewlet-text--tone-secondary');
  for (const line of [value, detail]) {
    expect(line.className).toContain('crewlet-text--truncate');
    expect(line.className).not.toContain('crewlet-text--mono');
  }
  // One column of the two, so the cell is exactly two lines tall.
  expect(value.parentElement).toBe(detail.parentElement);
  expect(value.parentElement!.className).toBe('crewlet-table-cell__lines');
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'TableCells.css'), 'utf8');
  const rule = /\.crewlet-table-cell__lines \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toMatch(/flex-direction:\s*column/);
  expect(rule).toMatch(/min-width:\s*0/);
});

test('either line, or both, is set in the mono face', () => {
  const { rerender } = render(<TableTwoLineCell value="backups" detail="rsync -a --delete /srv/shared /vault" mono="detail" />);
  expect(screen.getByText('backups').className).not.toContain('crewlet-text--mono');
  expect(screen.getByText('rsync -a --delete /srv/shared /vault').className).toContain('crewlet-text--mono');

  rerender(<TableTwoLineCell value="seat_01HZX" detail="Product Manager" mono="value" />);
  expect(screen.getByText('seat_01HZX').className).toContain('crewlet-text--mono');
  expect(screen.getByText('Product Manager').className).not.toContain('crewlet-text--mono');

  rerender(<TableTwoLineCell value="claude-sonnet" detail="claude-sonnet-5-5" mono="both" />);
  expect(screen.getByText('claude-sonnet').className).toContain('crewlet-text--mono');
  expect(screen.getByText('claude-sonnet-5-5').className).toContain('crewlet-text--mono');
});

test('with no detail the cell is the value’s one line', () => {
  const { container } = render(<TableTwoLineCell value="Never answered" detail={null} />);
  expect(container.querySelectorAll('.crewlet-text')).toHaveLength(1);
});

test('a cut line shows its whole words on hover, and a cell given a title speaks for both lines', () => {
  const { rerender } = render(<TableTwoLineCell value="github" detail="api.github.com/repos/production/readonly" />);
  const detail = screen.getByText('api.github.com/repos/production/readonly');
  cutTo(detail, 120, 260);
  fireEvent.mouseEnter(detail);
  expect(detail.getAttribute('title')).toBe('api.github.com/repos/production/readonly');

  rerender(
    <TableTwoLineCell value="github" detail="api.github.com/repos/production/readonly" title="GitHub, at api.github.com" />,
  );
  const lines = screen.getByTitle('GitHub, at api.github.com');
  expect(lines.className).toBe('crewlet-table-cell__lines');
  const value = screen.getByText('github');
  cutTo(value, 20, 60);
  fireEvent.mouseEnter(value);
  expect(value.hasAttribute('title')).toBe(false);
});

test('titleWhenCut={false} leaves the whole words to a tooltip around the cell', () => {
  render(<TableTwoLineCell value="postgres" detail="pg_dump --schema-only --no-owner --dbname=production" mono="detail" titleWhenCut={false} />);
  const detail = screen.getByText('pg_dump --schema-only --no-owner --dbname=production');
  cutTo(detail, 80, 300);
  fireEvent.mouseEnter(detail);
  expect(detail.hasAttribute('title')).toBe(false);
});

test('a mark stands before the two lines: a column’s icon is hidden and a row’s mark is read', () => {
  const { container, rerender } = render(
    <TableTwoLineCell value="Filesystem" detail="Local" icon={<svg data-testid="icon" />} />,
  );
  const cell = container.firstElementChild as HTMLElement;
  expect(cell.className).toBe('crewlet-table-cell__two-line');
  expect(cell.children[0]!.getAttribute('aria-hidden')).toBe('true');
  expect(cell.children[1]!.className).toBe('crewlet-table-cell__lines');

  rerender(<TableTwoLineCell value="Linear" detail="api.linear.app" mark={<svg role="img" aria-label="Linear" />} title="Linear, remote" />);
  const marked = container.firstElementChild as HTMLElement;
  expect(screen.getByRole('img', { name: 'Linear' })).toBe(marked.children[0]);
  // The title belongs to the whole cell, the mark included.
  expect(marked.getAttribute('title')).toBe('Linear, remote');
});
