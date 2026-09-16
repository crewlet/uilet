/**
 * The whole list screen, and the rules that only exist BETWEEN its parts.
 *
 * Each case is one of those: the toolbar raising a chip the chip row renders,
 * a removal putting a value back rather than emptying it, the archived toggle
 * deciding both which rows and which columns are drawn, and the panel holding
 * the table and nothing after it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { DataView } from './DataView.js';
import type { DataViewColumn } from './columns.js';
import type { FilterDef, FilterValues } from './filters.js';

afterEach(cleanup);

interface Seat {
  id: string;
  handle: string;
  role: string;
  archivedAt: string | null;
}

const SEATS: Seat[] = [
  { id: '1', handle: 'ada', role: 'owner', archivedAt: null },
  { id: '2', handle: 'grace', role: 'admin', archivedAt: null },
  { id: '3', handle: 'linus', role: 'admin', archivedAt: '2026-02-01T09:00:00Z' },
];

const COLUMNS: DataViewColumn<Seat>[] = [
  { key: 'handle', header: 'Handle', sortable: true },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    filterable: true,
    filterKind: 'select',
    filterMultiple: true,
    filterOptions: [
      { value: 'owner', label: 'Owner' },
      { value: 'admin', label: 'Admin' },
    ],
  },
];

const SEARCH: FilterDef<Seat> = { name: 'search', label: 'Search seats', role: 'search' };

function Screen({
  filters = [SEARCH],
  initial = { search: '' },
  ...rest
}: {
  filters?: FilterDef<Seat>[];
  initial?: FilterValues;
  rows?: Seat[];
  archivedPredicate?: (row: Seat) => boolean;
  archivedTimestamp?: (row: Seat) => string | null;
  onApplyFilters?: () => void;
  showSettings?: boolean;
}) {
  const [values, setValues] = useState<FilterValues>(initial);
  const { rows, ...view } = rest;
  return (
    <>
      <DataView<Seat>
        title="People"
        columns={COLUMNS}
        rows={rows ?? SEATS}
        rowKey="id"
        filters={filters}
        filterValues={values}
        onFilterValuesChange={setValues}
        {...view}
      />
      <pre data-testid="values">{JSON.stringify(values)}</pre>
    </>
  );
}

const held = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as FilterValues;
const handles = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

test('an axis picked from the menu becomes a chip before it has a value, with its editor open', () => {
  render(<Screen />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Role' }));

  // The chip is on screen although nothing has been ticked, which is the whole
  // point: without it, picking Role from the menu looked like a control that
  // did nothing.
  expect(screen.getByRole('button', { name: /^Role:/ }).textContent).toContain('any');
  expect(screen.getByRole('listbox', { name: 'Role options' })).toBeDefined();
  /*
   * And the menu no longer offers what is already on the list. Role was the
   * only axis this screen has beyond its search box, so the button itself is
   * gone rather than opening onto nothing.
   */
  fireEvent.keyDown(screen.getByRole('listbox', { name: 'Role options' }), { key: 'Escape' });
  expect(screen.queryByRole('button', { name: 'Filter' })).toBe(null);
});

test('a column filter narrows the rows it hands the table', () => {
  render(<Screen />);
  expect(handles()).toEqual(['ada', 'grace', 'linus']);

  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Role' }));
  const list = screen.getByRole('listbox', { name: 'Role options' });
  fireEvent.keyDown(list, { key: 'ArrowDown' });
  fireEvent.keyDown(list, { key: 'Enter' });

  expect(held().role).toEqual(['admin']);
  expect(handles()).toEqual(['grace', 'linus']);
});

test('a filter the screen declares is the screen own, and is never applied to the rows here', () => {
  // `search` is not a field on a row. Applied in the browser it would match
  // nothing and hand back an empty table; the screen fetches with it instead.
  render(<Screen initial={{ search: 'nobody' }} />);
  expect(handles()).toEqual(['ada', 'grace', 'linus']);
});

test('removing a chip puts the filter back to its blank answer and reports it', () => {
  const applied = vi.fn();
  render(<Screen initial={{ search: '', role: ['admin'] }} onApplyFilters={applied} />);
  expect(handles()).toEqual(['grace', 'linus']);

  fireEvent.click(screen.getByRole('button', { name: 'Remove the Role filter' }));
  expect(held().role).toEqual([]);
  expect(applied).toHaveBeenCalled();
  expect(handles()).toEqual(['ada', 'grace', 'linus']);
  expect(screen.queryByRole('button', { name: /^Role:/ })).toBe(null);
});

test('removing a single-choice chip leaves the rows it was narrowing on screen', () => {
  const columns: DataViewColumn<Seat>[] = [
    { key: 'handle', header: 'Handle' },
    {
      key: 'role',
      header: 'Role',
      filterable: true,
      filterKind: 'select',
      filterOptions: [
        { value: 'any', label: 'Any role' },
        { value: 'owner', label: 'Owner' },
        { value: 'admin', label: 'Admin' },
      ],
    },
  ];
  function Single() {
    const [values, setValues] = useState<FilterValues>({ role: 'owner' });
    return <DataView<Seat> columns={columns} rows={SEATS} rowKey="id" filterValues={values} onFilterValuesChange={setValues} />;
  }
  render(<Single />);
  expect(handles()).toEqual(['ada']);

  /*
   * The blank answer here is the word `any`, not the empty string, and the
   * rows have no role of that name. Asked whether the filter still narrows
   * anything in a second place that only knew about the empty string, it
   * compared every row against `any`, matched none, and left a table reading
   * "no data" under a chip row that had just been emptied.
   */
  fireEvent.click(screen.getByRole('button', { name: 'Remove the Role filter' }));
  expect(handles()).toEqual(['ada', 'grace', 'linus']);
});

test('Clear filters takes every chip off and leaves the search box alone', () => {
  render(<Screen initial={{ search: 'ada', role: ['admin'] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(held()).toEqual({ search: 'ada', role: [] });
  expect(screen.queryByRole('button', { name: 'Clear filters' })).toBe(null);
});

test('the search box is always drawn and is never one of the axes the menu offers', () => {
  render(<Screen />);
  expect(screen.getByRole('searchbox', { name: 'Search seats' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  expect(screen.queryByRole('menuitem', { name: 'Search seats' })).toBe(null);
});

test('Enter in the search box commits rather than submitting the form around it', () => {
  const applied = vi.fn();
  render(<Screen onApplyFilters={applied} />);
  const box = screen.getByRole('searchbox', { name: 'Search seats' });
  fireEvent.change(box, { target: { value: 'ada' } });
  expect(applied).not.toHaveBeenCalled();
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(applied).toHaveBeenCalledTimes(1);
});

test('the search box has a clear control that empties it and reports the change', () => {
  const applied = vi.fn();
  render(<Screen initial={{ search: 'ada' }} onApplyFilters={applied} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(held().search).toBe('');
  expect(applied).toHaveBeenCalledTimes(1);
  // Gone, now that there is nothing to clear.
  expect(screen.queryByRole('button', { name: 'Clear search' })).toBe(null);
});

test('the sort menu and the column headers are the same sort', () => {
  render(<Screen />);
  fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sort Handle descending' }));

  const header = screen.getByRole('columnheader', { name: /Handle/ });
  expect(header.getAttribute('aria-sort')).toBe('descending');
  expect(handles()).toEqual(['linus', 'grace', 'ada']);
  // The button says what the list is ordered by, and takes the accent state
  // that means a filter is on.
  const sortButton = screen.getByRole('button', { name: /Sort: Handle/ });
  expect(sortButton.getAttribute('aria-pressed')).toBe('true');
});

test('archived rows are hidden, their column is not drawn, and the toggle reveals both', () => {
  render(<Screen archivedPredicate={(row) => row.archivedAt !== null} archivedTimestamp={(row) => row.archivedAt} />);
  expect(handles()).toEqual(['ada', 'grace']);
  expect(screen.queryByRole('columnheader', { name: 'Archived at' })).toBe(null);

  const toggle = screen.getByRole('button', { name: /Show archived/ });
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(toggle);

  expect(handles()).toEqual(['ada', 'grace', 'linus']);
  expect(screen.getByRole('columnheader', { name: /Archived at/ })).toBeDefined();
  expect(screen.getByRole('button', { name: /Show archived/ }).getAttribute('aria-pressed')).toBe('true');
});

test('a filter and the archived toggle both apply, in that order', () => {
  render(
    <Screen
      initial={{ search: '', role: ['admin'] }}
      archivedPredicate={(row) => row.archivedAt !== null}
      archivedTimestamp={(row) => row.archivedAt}
    />,
  );
  // Admins, archived ones hidden.
  expect(handles()).toEqual(['grace']);
  fireEvent.click(screen.getByRole('button', { name: /Show archived/ }));
  // Archived admins, not every archived row.
  expect(handles()).toEqual(['grace', 'linus']);
});

test('the table keeps its settings frame, and a screen can still say no', () => {
  render(<Screen />);
  /*
   * Where a reader reorders the columns, hides the ones this job does not
   * need and turns off wrapping. It is the table's own default and what every
   * list screen has today; a composite that turned it off would have taken it
   * from every screen that adopted the composite.
   */
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.getByText('Column Order & Visibility')).toBeTruthy();
  // And the frame offers no page size, because the screen pages for itself.
  expect(screen.queryByText('Items per page')).toBeNull();
  cleanup();

  render(<Screen showSettings={false} />);
  expect(screen.queryByRole('button', { name: 'Table settings' })).toBe(null);
});

test('Reset to Default puts back the order the list opens in', () => {
  /*
   * The composite always hands the table a controlled sort, so the table's
   * own `defaultSort` seeds nothing here and was not passed at all. What it
   * still answers is the settings frame's Reset to Default: without it the
   * button offers a list opened by When descending the order its rows
   * happened to arrive in, and a screen holding the sort keeps that.
   */
  const onSortChange = vi.fn();
  render(
    <DataView<Seat>
      title="People"
      columns={COLUMNS}
      rows={SEATS}
      rowKey="id"
      defaultSort={{ key: 'handle', direction: 'desc' }}
      sort={{ key: 'role', direction: 'asc' }}
      onSortChange={onSortChange}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(onSortChange).toHaveBeenCalledWith({ key: 'handle', direction: 'desc' });
});

test('a screen pages when it asks to, and the frame offers the size with it', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    id: String(i),
    handle: `seat-${i}`,
    role: 'admin',
    archivedAt: null,
  }));
  const onPageChange = vi.fn();
  /*
   * `paginated` was a literal `false` inside the composite, so no list screen
   * could page whatever it passed, and the page-size row of the settings
   * frame was gated off with it. It still defaults to false: a list screen
   * scrolls unless it asks not to.
   */
  render(
    <DataView<Seat>
      title="People"
      columns={COLUMNS}
      rows={rows}
      rowKey="id"
      paginated
      itemsPerPage={5}
      page={2}
      onPageChange={onPageChange}
    />,
  );
  expect(handles()).toEqual(['seat-5', 'seat-6', 'seat-7', 'seat-8', 'seat-9']);
  fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
  expect(onPageChange).toHaveBeenCalledWith(3);

  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.getByText('Items per page')).toBeTruthy();
});

test('a screen with no axes and no archived rows draws no toolbar at all', () => {
  render(
    <DataView<Seat>
      title="People"
      columns={[{ key: 'handle', header: 'Handle' }]}
      rows={SEATS}
      rowKey="id"
    />,
  );
  expect(screen.queryByRole('group', { name: 'Filters' })).toBe(null);
  expect(screen.getByRole('table')).toBeDefined();
});

async function auditPage(): Promise<string[]> {
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`);
}

test('the whole screen carries no violation, with a chip open over the table', async () => {
  render(
    <main>
      <Screen initial={{ search: 'ada', role: ['admin'] }} archivedPredicate={(row) => row.archivedAt !== null} />
    </main>,
  );
  fireEvent.click(screen.getByRole('button', { name: /^Role:/ }));
  // Asserted, not assumed: an editor that never opened is one axe has nothing
  // to say about, and the case would pass for the wrong reason.
  expect(screen.getByRole('listbox', { name: 'Role options' })).toBeTruthy();
  expect(await auditPage()).toEqual([]);
});

/*
 * NOTHING FOLLOWS THE ROWS. Every list closed on a count line saying "Showing
 * 12 of 300" or "12 rows", and it is gone: how many of a thing there are is a
 * fact about the LIST, so it belongs in the screen's own header beside the
 * name of the thing counted, where one number cannot disagree with another
 * one a panel below it.
 */
test('a list screen draws no count under the rows it holds', () => {
  const { container } = render(<Screen />);
  const panel = container.querySelector('.crewlet-data-view__table')!;
  expect(panel.querySelector('.crewlet-table-footer')).toBe(null);
  // The table IS the panel: a second child is something drawn after the rows.
  expect(panel.children.length).toBe(1);
  expect(panel.firstElementChild?.className).toContain('crewlet-data-table');
  // And no sentence anywhere on the screen counts them either.
  expect(container.textContent).not.toMatch(/\d+\s+rows?\b/);
});

/* ─── A list screen is one object ───────────────────────────────────
   The screen's controls used to be a bar above the table, the chips a second
   bar under that, and the table below them with a toolbar of its own holding
   the settings cog: three strips for one list. The controls sit in the table's
   own toolbar row now, beside the table's, and the chips in the band between
   that row and the rows. */
test('the screen draws its controls in the table toolbar, not in a bar above it', () => {
  render(<Screen />);
  const table = document.querySelector('.crewlet-data-table')!;
  const slot = table.querySelector('.crewlet-data-table__toolbar-start')!;
  expect(slot.querySelector('.crewlet-data-view-toolbar')).toBeTruthy();
  // And the settings cog is in the same row, which is what makes it one row.
  const row = table.querySelector('.crewlet-data-table__toolbar')!;
  expect(within(row as HTMLElement).getByRole('button', { name: 'Table settings' })).toBeTruthy();
  // Nothing is drawn above the table any more.
  expect(document.querySelector('.crewlet-data-view > .crewlet-data-view-toolbar')).toBe(null);
  expect(document.querySelector('.crewlet-data-view > .crewlet-filter-axis-bar')).toBe(null);
});

test('the chip band is drawn only once an axis is on', () => {
  render(<Screen />);
  expect(document.querySelector('.crewlet-data-table__filter-bar')).toBe(null);

  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Role' }));

  const band = document.querySelector('.crewlet-data-table__filter-bar')!;
  expect(band).toBeTruthy();
  expect(band.querySelector('.crewlet-filter-axis-bar')).toBeTruthy();
  // Between the toolbar row and the rows, inside the same panel.
  expect(band.previousElementSibling?.className).toContain('crewlet-data-table__toolbar');
  expect(band.nextElementSibling?.className).toContain('crewlet-data-table__rail');
});
