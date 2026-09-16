/**
 * A table's promise is that a cell knows which column it is in. The grid of
 * divs this replaced could not say, so every assertion here is about the
 * elements rather than the look.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Table } from './index.js';

afterEach(cleanup);

const headers = ['What', 'When you started', 'Saved now'];
const rows = [
  ['Role', 'Planner', 'Reviewer'],
  ['Model', 'sonnet', 'opus'],
];

test('every cell is associated with its column header', () => {
  render(<Table headers={headers} data={rows} />);

  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(headers);
  for (const header of within(table).getAllByRole('columnheader')) {
    expect(header.getAttribute('scope')).toBe('col');
  }
  // Header row plus one row per datum.
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  expect(within(table).getAllByRole('cell')).toHaveLength(6);
});

test('a caption names the table, and can be named without being drawn', () => {
  const { rerender } = render(<Table headers={headers} data={rows} caption="Draft conflicts" />);
  expect(screen.getByRole('table', { name: 'Draft conflicts' })).toBeTruthy();
  expect(screen.getByText('Draft conflicts').className).toContain('crewlet-table__caption');

  rerender(<Table headers={headers} data={rows} caption="Draft conflicts" captionHidden />);
  expect(screen.getByRole('table', { name: 'Draft conflicts' })).toBeTruthy();
  expect(screen.getByText('Draft conflicts').className).toContain('crewlet-visually-hidden');
});

test('an empty table says so once, across the whole width', () => {
  render(<Table headers={headers} data={[]} emptyMessage="No conflicts" />);
  const cell = screen.getByRole('cell', { name: 'No conflicts' });
  expect(cell.getAttribute('colspan')).toBe('3');
});

test('the action control is a button that cannot submit a form', () => {
  const onClick = vi.fn();
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <Table headers={headers} data={rows} actionButton={{ label: 'View all', onClick }} />
    </form>,
  );
  const button = screen.getByRole('button', { name: 'View all' });
  expect(button.getAttribute('type')).toBe('button');
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

/*
 * A max height with no scroller CLIPS the rows it hides: they are drawn,
 * unreachable, and nothing says so. The two declarations are one decision, so
 * the component sets both or neither.
 */
test('a bounded table scrolls its own rows, and an unbounded one sets no height', () => {
  const { container, rerender } = render(<Table headers={headers} data={rows} maxHeight="20rem" />);
  const scroller = container.querySelector('.crewlet-table__container') as HTMLElement;
  expect(scroller.style.getPropertyValue('--crewlet-table-max-height')).toBe('20rem');
  expect(scroller.style.getPropertyValue('--crewlet-table-overflow-y')).toBe('auto');

  rerender(<Table headers={headers} data={rows} />);
  expect(scroller.style.getPropertyValue('--crewlet-table-max-height')).toBe('');
  expect(scroller.style.getPropertyValue('--crewlet-table-overflow-y')).toBe('');
});

test('a cell may be a node, not only a string', () => {
  render(
    <Table
      headers={headers}
      data={[[<a key="link" href="#/seat/planner">planner</a>, 'Planner', 'Reviewer']]}
    />,
  );
  expect(screen.getByRole('link', { name: 'planner' })).toBeTruthy();
});
