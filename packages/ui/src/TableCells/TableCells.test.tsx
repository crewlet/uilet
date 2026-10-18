/**
 * The read-only table cells: an absent value says what kind of absence it is,
 * a long value keeps to one line with its whole text on hover, and a mark is
 * never the only carrier of a fact.
 */

import { cleanup, render, screen } from '@testing-library/react';
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
  render(<TableKeyCell value="work:task:0b4c6f0e-1111" text="work:task:0b4c" href="#/work/0b4c" />);
  const link = screen.getByRole('link', { name: 'work:task:0b4c' });
  expect(link.getAttribute('href')).toBe('#/work/0b4c');
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
