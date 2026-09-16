/**
 * What a table promises: that its sort can be reached and is announced, that
 * an absent value is not a small one, that a row that navigates navigates
 * once, and that nothing it remembers can stop it rendering.
 *
 * The first two cases are ported from the engine dashboard: the "a sortable
 * table" case of `ui/controls.a11y.test.tsx`, and the absent-meter ordering of
 * `routes/Spend.test.tsx`, which was a screen test there and is a table rule
 * here.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Card } from '../Card/index.js';
import { DataTable, type DataTableColumn, type DataTableProps, type DataTableVariant } from './index.js';
import { reconcileOrder } from './DataTable.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

interface Seat {
  id: string;
  name: string;
  note?: string;
  live: number | null;
}

const seats: Seat[] = [
  { id: 'beta', name: 'beta', live: 5 },
  { id: 'alpha', name: 'alpha', live: 9 },
];

const nameAndNote: Record<string, DataTableColumn<Seat>> = {
  name: { label: 'Seat', sortValue: (row) => row.name },
  note: { label: 'Note', sortable: false, render: () => '' },
};

const firstCellText = () => document.querySelector('tbody tr td')?.textContent ?? '';

describe.each<DataTableVariant>(['default', 'compact'])('a sortable table (%s)', (variant) => {
  test('sorts from a button in the header, with aria-sort on the cell', () => {
    render(<DataTable<Seat> variant={variant} data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />);

    const button = screen.getByRole('button', { name: 'Seat' });
    const header = screen.getByRole('columnheader', { name: /Seat/ });
    expect(header.contains(button)).toBe(true);
    /*
     * An unsortable column carries no sort control. The engine's own case
     * asserted no button AT ALL in the header; here the column's resize
     * handle is one (named "Resize Note"), so what is asserted is the thing
     * the case was about: there is nothing named after the column to press.
     */
    const note = screen.getByRole('columnheader', { name: 'Note' });
    expect(within(note).queryByRole('button', { name: 'Note' })).toBeNull();
    expect(note.getAttribute('aria-sort')).toBeNull();

    expect(header.getAttribute('aria-sort')).toBeNull();
    fireEvent.click(button);
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    expect(firstCellText()).toBe('alpha');
    fireEvent.click(button);
    expect(header.getAttribute('aria-sort')).toBe('descending');
    expect(firstCellText()).toBe('beta');
  });
});

test('the third press hands the rows back unsorted, and asc-desc keeps sorting', () => {
  const { rerender } = render(
    <DataTable<Seat> data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />,
  );
  const press = () => fireEvent.click(screen.getByRole('button', { name: 'Seat' }));
  press();
  press();
  press();
  expect(screen.getByRole('columnheader', { name: /Seat/ }).getAttribute('aria-sort')).toBeNull();
  expect(firstCellText()).toBe('beta');

  rerender(
    <DataTable<Seat> data={seats} columns={nameAndNote} getRowKey={(row) => row.id} sortCycle="asc-desc" />,
  );
  press();
  press();
  press();
  expect(screen.getByRole('columnheader', { name: /Seat/ }).getAttribute('aria-sort')).toBe('ascending');
});

test('a seat with no live meter sorts below every measurement, zero included', () => {
  const rows: Seat[] = [
    { id: 'unmetered', name: 'Unmetered', live: null },
    { id: 'busy', name: 'Busy', live: 900 },
    { id: 'idle', name: 'Idle', live: 0 },
  ];
  render(
    <DataTable<Seat>
      data={rows}
      getRowKey={(row) => row.id}
      columns={{
        name: { label: 'Seat', sortable: false },
        live: {
          label: 'This process',
          // The engine's own first press on a spend column: largest first.
          firstDirection: 'desc',
          sortValue: (row) => row.live,
          render: (row) => (row.live === null ? '–' : row.live),
        },
      }}
    />,
  );

  const table = screen.getByRole('table');
  const order = () => within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).queryByText(/^(Unmetered|Busy|Idle)$/)?.textContent ?? '');

  fireEvent.click(within(table).getByRole('button', { name: 'This process' }));
  expect(order()).toEqual(['Busy', 'Idle', 'Unmetered']);
  // And the absence stays at the bottom when the sort turns around: a seat
  // nobody measured has not spent the least, it has not been measured.
  fireEvent.click(within(table).getByRole('button', { name: 'This process' }));
  expect(order()).toEqual(['Idle', 'Busy', 'Unmetered']);
  // The absent meter is not drawn as a zero.
  const unmetered = within(table).getByText('Unmetered').closest('tr')!;
  expect(within(unmetered).queryByText('0')).toBeNull();
});

test('a corrupt stored entry is ignored, and the table still renders', () => {
  localStorage.setItem('seats_visibleColumns', '{"name": tru');
  localStorage.setItem('seats_columnOrder', '"not an array"');
  localStorage.setItem('seats_columnWidths', '{"name": "wide"}');

  render(
    <DataTable<Seat> storageKey="seats" data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />,
  );

  expect(screen.getByRole('columnheader', { name: /Seat/ })).toBeTruthy();
  expect(screen.getAllByRole('row')).toHaveLength(3);
});

test('a press that began on a control inside the row is not the row press', () => {
  const onRowClick = vi.fn();
  render(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      columns={{
        name: {
          label: 'Seat',
          render: (row) => <a href={`#/seat/${row.id}`}>{row.name}</a>,
        },
      }}
    />,
  );

  fireEvent.click(screen.getByRole('link', { name: 'alpha' }));
  expect(onRowClick).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText('beta').closest('tr')!);
  expect(onRowClick).toHaveBeenCalledTimes(1);
});

test('a clickable row is reachable from the keyboard', () => {
  const onRowClick = vi.fn();
  render(
    <DataTable<Seat>
      data={seats}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
    />,
  );
  const row = screen.getByText('beta').closest('tr')!;
  expect(row.getAttribute('tabindex')).toBe('0');
  fireEvent.keyDown(row, { key: 'Enter' });
  fireEvent.keyDown(row, { key: ' ' });
  expect(onRowClick).toHaveBeenCalledTimes(2);
});

test('a row that navigates is a link named by its first cell', () => {
  render(
    <DataTable<Seat>
      data={seats}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `#/seat/${row.id}`}
      isSelected={(row) => row.id === 'alpha'}
    />,
  );
  const link = screen.getByRole('link', { name: 'alpha' });
  expect(link.getAttribute('href')).toBe('#/seat/alpha');
  const row = link.closest('tr')!;
  expect(row.getAttribute('aria-selected')).toBe('true');
  // One tab stop per row: the anchor, never the row as well.
  expect(row.getAttribute('tabindex')).toBeNull();
  // And the name is read ONCE: the link wraps the cell's own text.
  expect(within(row).getAllByText('alpha')).toHaveLength(1);
});

test('a toned row says which state it is in, for a reader who cannot see the rail', () => {
  render(
    <DataTable<Seat>
      data={seats}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      rowTone={(row) => (row.id === 'beta' ? 'danger' : null)}
      labels={{ tone: { info: 'Working', warning: 'Needs attention', danger: 'Failed' } }}
    />,
  );
  const failed = screen.getByText('beta').closest('tr')!;
  expect(within(failed).getByText('Failed')).toBeTruthy();
  expect(within(screen.getByText('alpha').closest('tr')!).queryByText('Failed')).toBeNull();
});

test('stableOrder holds the order a sort produced through a push', () => {
  const columns: Record<string, DataTableColumn<Seat>> = {
    name: { label: 'Seat' },
    live: { label: 'Spend', firstDirection: 'desc', sortValue: (row) => row.live },
  };
  const { rerender } = render(
    <DataTable<Seat> data={seats} columns={columns} getRowKey={(row) => row.id} stableOrder />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Spend' }));
  const names = () => screen.getAllByRole('row').slice(1).map((row) => row.querySelector('td')?.textContent);
  expect(names()).toEqual(['alpha', 'beta']);

  // beta overtakes alpha. The reader is looking at this list, so it holds.
  const pushed: Seat[] = [
    { id: 'beta', name: 'beta', live: 500 },
    { id: 'alpha', name: 'alpha', live: 9 },
  ];
  rerender(<DataTable<Seat> data={pushed} columns={columns} getRowKey={(row) => row.id} stableOrder />);
  expect(names()).toEqual(['alpha', 'beta']);

  // Until the header is pressed again.
  fireEvent.click(screen.getByRole('button', { name: 'Spend' }));
  fireEvent.click(screen.getByRole('button', { name: 'Spend' }));
  expect(names()).toEqual(['beta', 'alpha']);
});

test('the expand control is a button carrying its own state', () => {
  render(
    <DataTable<Seat>
      data={seats}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      renderExpandedRow={(row) => <p>detail for {row.name}</p>}
    />,
  );
  const toggle = screen.getAllByRole('button', { name: 'Expand row' })[0]!;
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.closest('tr')!.getAttribute('aria-expanded')).toBeNull();
  fireEvent.click(toggle);
  expect(screen.getByText('detail for beta')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Collapse row' })[0]!.getAttribute('aria-expanded')).toBe('true');
});

test('a hidden column comes back from the settings frame, and the caller is told', () => {
  /*
   * THE FRAME IS THE ONE WAY IN. The toolbar carried a Columns panel beside
   * the gear, for the caller holding the pair alone; it has gone, so this is
   * the path a reader takes to a column `defaultVisible: false` hid, and a
   * controlled caller hears about it on the same callback the panel used.
   */
  const onVisibleColumnsChange = vi.fn();
  function Screen() {
    const [visible, setVisible] = useState<Record<string, boolean>>({ name: true, note: false });
    return (
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={nameAndNote}
        getRowKey={(row) => row.id}
        visibleColumns={visible}
        onVisibleColumnsChange={(next) => {
          onVisibleColumnsChange(next);
          setVisible(next);
        }}
      />
    );
  }
  render(<Screen />);

  expect(screen.queryByRole('columnheader', { name: 'Note' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Columns/ })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Note' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(screen.getByRole('columnheader', { name: 'Note' })).toBeTruthy();
  expect(onVisibleColumnsChange).toHaveBeenCalledWith({ name: true, note: true });
});

test('with paginated={false} there are no page chevrons', () => {
  const { rerender } = render(
    <DataTable<Seat> variant="compact" data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />,
  );
  expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();

  rerender(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      paginated={false}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
});

test('the page holds through a push and resets on a filter change', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `seat ${i}`, live: i }));
  const { rerender } = render(
    <DataTable<Seat>
      variant="compact"
      data={many}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      defaultItemsPerPage={10}
      filterKey="all"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(screen.getByText('seat 10')).toBeTruthy();

  // A push adds a row. The reader stays where they were.
  rerender(
    <DataTable<Seat>
      variant="compact"
      data={[...many, { id: 's12', name: 'seat 12', live: 12 }]}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      defaultItemsPerPage={10}
      filterKey="all"
    />,
  );
  expect(screen.getByText('seat 10')).toBeTruthy();

  // A filter change is a new list, and a new list starts at the top.
  rerender(
    <DataTable<Seat>
      variant="compact"
      data={many}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      defaultItemsPerPage={10}
      filterKey="failed"
    />,
  );
  expect(screen.getByText('seat 0')).toBeTruthy();
});

test('a table with a header opens the same settings frame as one without', () => {
  /*
   * ONE FRAME. A titled table used to get a shorter one holding the page size
   * and the wrapping and nothing else, so its columns were reachable only
   * through the toolbar's Columns panel; with that panel gone the frame is
   * the way in, and a frame that cannot reach the columns is not one.
   */
  const sections = () =>
    within(screen.getByRole('dialog'))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

  render(
    <DataTable<Seat>
      variant="compact"
      title="Seats"
      description="Every seat this company runs."
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(sections()).toEqual(['Items per page', 'Column Order & Visibility']);
  expect(screen.getByRole('checkbox', { name: 'Note' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Reorder Note' })).toBeTruthy();
});

test('the settings frame reorders a column from a button', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move Note up' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim());
  expect(headers[0]).toBe('Note');
});

test('Reset to Default puts back the order the table opens in', () => {
  /*
   * ONE MEANING OF "DEFAULT". The frame's Reset used to clear the sort while
   * the header's own reset put `defaultSort` back, so a table that opens
   * ordered by spend answered Reset to Default with the order its rows
   * happened to arrive in. A caller holding the sort was told the same thing,
   * and a screen keeping it in a URL then carried that non-default forever.
   */
  const onSortChange = vi.fn();
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      defaultSort={{ key: 'name', direction: 'desc' }}
      sort={{ key: 'name', direction: 'asc' }}
      onSortChange={onSortChange}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });
});

test('Reset to Default orders by nothing only where nothing is the default', () => {
  // A table that declares no opening order is still reset to no order, which
  // is what makes the case above a restore rather than a second default.
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Seat' }));
  expect(firstCellText()).toBe('alpha');
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getByRole('columnheader', { name: /Seat/ }).getAttribute('aria-sort')).toBeNull();
});

test('a table that does not page is not offered a page size', () => {
  const settings = (props: Partial<DataTableProps<Seat>>) => (
    <DataTable<Seat> variant="compact" data={seats} columns={nameAndNote} getRowKey={(row) => row.id} {...props} />
  );

  render(settings({ paginated: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.getByText('Items per page')).toBeTruthy();
  cleanup();

  /*
   * The caller slices its own rows here, so nothing reads this number and
   * every choice in the row did nothing at all. It is the rule the chevrons
   * already keep one panel out: a control that can never do anything is one to
   * remove rather than to leave sitting there.
   */
  render(settings({ paginated: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.queryByText('Items per page')).toBeNull();
  // And the rest of the frame is still there, which is what it is opened for.
  expect(screen.getByText('Column Order & Visibility')).toBeTruthy();
  cleanup();

  /*
   * AND THE TABLE WHOSE CALLER PAGES IS. `onItemsPerPageChange` is a caller
   * saying it reads the number, which is the only thing that made the row
   * meaningless before: a screen that fetches a page from a server still has
   * to be able to ask for fifty rows instead of ten.
   */
  render(settings({ paginated: false, onItemsPerPageChange: () => {} }));
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.getByText('Items per page')).toBeTruthy();
});

test('the page, its size and the column order are the caller\'s to hold', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `seat ${i}`, live: i }));
  const onPageChange = vi.fn();
  const onItemsPerPageChange = vi.fn();
  const onColumnOrderChange = vi.fn();
  const table = (props: Partial<DataTableProps<Seat>>) => (
    <DataTable<Seat>
      variant="compact"
      data={many}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      storageKey="held-elsewhere"
      itemsPerPage={5}
      onItemsPerPageChange={onItemsPerPageChange}
      onPageChange={onPageChange}
      columnOrder={['note', 'name']}
      onColumnOrderChange={onColumnOrderChange}
      {...props}
    />
  );

  // THE CALLER'S VALUES ARE WHAT IS DRAWN: page three of five rows at a time,
  // and the order the caller holds rather than the one the columns declare.
  render(table({ page: 2 }));
  expect(screen.getByText('seat 5')).toBeTruthy();
  expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim())[0]).toBe('Note');

  // And a press reaches the caller rather than moving the table underneath it.
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(onPageChange).toHaveBeenCalledWith(3);
  expect(screen.getByText('seat 5')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: '20' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move Seat up' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(onItemsPerPageChange).toHaveBeenCalledWith(20);
  expect(onColumnOrderChange).toHaveBeenCalledWith(['name', 'note']);

  /*
   * AND NOTHING OF IT IS WRITTEN TO STORAGE. A key is still passed, because
   * the widths and the wrapping belong there; the three the caller holds do
   * not, and two places holding one choice is a disagreement on the first
   * reload.
   */
  expect(localStorage.getItem('held-elsewhere_itemsPerPage')).toBeNull();
  expect(localStorage.getItem('held-elsewhere_columnOrder')).toBeNull();

  // A link that opens on page two opens on page two: the reset a filter change
  // performs must not fire on the render that mounts the table.
  cleanup();
  onPageChange.mockClear();
  render(table({ page: 2, filterKey: 'failed' }));
  expect(onPageChange).not.toHaveBeenCalled();
});

test('a caller that fetches a page at a time keeps the page it asked for', () => {
  const onPageChange = vi.fn();
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      paginated={false}
      page={4}
      onPageChange={onPageChange}
    />,
  );
  /*
   * The rows on screen are one page of somebody else's fetch, and how many
   * pages there are is a fact this table does not hold. Clamped against the 1
   * that stands in for "not said", every such reader was sent to the first
   * page on the first render.
   */
  expect(onPageChange).not.toHaveBeenCalled();
  // And with no bound there is nothing to press, either: the chevrons are for
  // a caller that also passed `pageCount`.
  expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
});

test('a filter change still turns the page back, once', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `seat ${i}`, live: i }));
  const onPageChange = vi.fn();
  const table = (filterKey: string) => (
    <DataTable<Seat>
      variant="compact"
      data={many}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      page={2}
      onPageChange={onPageChange}
      itemsPerPage={5}
      filterKey={filterKey}
    />
  );
  const { rerender } = render(table('all'));
  expect(onPageChange).not.toHaveBeenCalled();
  rerender(table('failed'));
  expect(onPageChange).toHaveBeenCalledWith(1);
});

test('All is every row, however many rows there come to be', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `seat ${i}`, live: i }));
  const table = (rows: Seat[]) => (
    <DataTable<Seat>
      variant="compact"
      data={rows}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      defaultItemsPerPage={5}
      storageKey="all-rows"
    />
  );
  const { rerender } = render(table(twelve));
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: /^All/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getAllByRole('row')).toHaveLength(13);

  /*
   * A thirteenth row arrives. Written as `data.length`, All meant twelve, so
   * the table quietly began paging and the row that had just arrived was on a
   * page nobody was looking at.
   */
  rerender(table([...twelve, { id: 's12', name: 'seat 12', live: 12 }]));
  expect(screen.getAllByRole('row')).toHaveLength(14);
  expect(screen.queryByRole('button', { name: 'Next page' })?.hasAttribute('disabled')).toBe(true);
});

test('All chosen on an empty table does not hide the rows that arrive', () => {
  const table = (rows: Seat[]) => (
    <DataTable<Seat>
      variant="compact"
      data={rows}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      storageKey="all-empty"
    />
  );
  const { rerender } = render(table([]));
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('button', { name: /^All/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  // As a count, All on an empty table was 0, and a page of no rows hid every
  // row that came afterwards, for the life of the screen and of the key.
  expect(localStorage.getItem('all-empty_itemsPerPage')).toBe('all');

  rerender(table(seats));
  expect(screen.getAllByRole('row')).toHaveLength(3);
});

test('an identity column cannot be unticked at all', () => {
  const columns: Record<string, DataTableColumn<Seat>> = {
    name: { label: 'Seat', hideable: false },
    note: { label: 'Note', sortable: false, render: () => '' },
  };
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={columns}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));

  // The identity column says why it is fixed rather than going missing from
  // the list, which is what a reader would otherwise conclude.
  const seat = screen.getByRole('checkbox', { name: 'Seat' });
  expect(seat.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(seat);
  expect((seat as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText('This column is always shown.')).toBeTruthy();

  // Note may go, because something is still left to read the row by.
  const note = screen.getByRole('checkbox', { name: 'Note' });
  fireEvent.click(note);
  expect((note as HTMLInputElement).checked).toBe(false);
});

test('the last column standing cannot be unticked, whatever it is', () => {
  /*
   * NO COLUMN HERE IS AN IDENTITY ONE, so the only thing holding the last
   * tick is the floor itself: without it a reader unticks every column, hits
   * Apply, and the table is a spacer with a footer under it.
   */
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Note' }));
  const last = screen.getByRole('checkbox', { name: 'Seat' });
  expect(last.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(last);
  expect((last as HTMLInputElement).checked).toBe(true);
  expect(screen.getByText('At least one column stays shown.')).toBeTruthy();

  // And it is a floor, not a lock: put Note back and Seat may go again.
  fireEvent.click(screen.getByRole('checkbox', { name: 'Note' }));
  const seat = screen.getByRole('checkbox', { name: 'Seat' });
  expect(seat.getAttribute('aria-disabled')).toBeNull();
  fireEvent.click(seat);
  expect((seat as HTMLInputElement).checked).toBe(false);
});

test('a column moved from the keyboard keeps its focus and says where it went', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));

  const up = screen.getByRole('button', { name: 'Move Note up' });
  up.focus();
  fireEvent.click(up);

  /*
   * `disabled` on the button the press is on drops focus to the document
   * body, so the reader who moved the column lost their place in the list by
   * moving it. It is `aria-disabled` with a reason, and the move is said.
   */
  expect(document.activeElement).toBe(up);
  expect(up.getAttribute('aria-disabled')).toBe('true');
  const said = () => within(screen.getByRole('dialog')).getByRole('status').textContent;
  expect(said()).toContain('Note moved to position 1 of 2');
  // And pressing it again does nothing at all, rather than moving the column
  // off the top of the list.
  fireEvent.click(up);
  expect(said()).toContain('Note moved to position 1 of 2');
});

test('the drag handle is a control, and the arrow keys move the column', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  const handle = screen.getByRole('button', { name: 'Reorder Note' });
  handle.focus();
  fireEvent.keyDown(handle, { key: 'ArrowUp' });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim())[0]).toBe('Note');
});

test('a column is still dragged, from the handle that names it', () => {
  vi.useFakeTimers();
  try {
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={nameAndNote}
        getRowKey={(row) => row.id}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
    const rows = screen.getAllByRole('listitem');
    const handle = within(rows[1]!).getByRole('button', { name: 'Reorder Note' });

    /*
     * THE ATTRIBUTE AND THE HANDLER, because only one of them is a gesture.
     * jsdom fires a dragstart at anything, so an event-driven case alone
     * passes just as happily on an element no browser would ever start a drag
     * from: the attribute is what the browser reads, and it moved from the
     * row to the handle.
     */
    expect(handle.getAttribute('draggable')).toBe('true');
    expect(rows[1]!.getAttribute('draggable')).toBeNull();
    fireEvent.dragStart(handle, { dataTransfer: { effectAllowed: '' } });
    fireEvent.dragOver(rows[0]!, { dataTransfer: { dropEffect: '' } });
    act(() => { vi.advanceTimersByTime(20); });
    fireEvent.drop(rows[0]!, { dataTransfer: { dropEffect: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim())[0]).toBe('Note');
  } finally {
    vi.useRealTimers();
  }
});

test('First and Last reach the ends of the rows', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, name: `seat ${i}`, live: i }));
  render(
    <DataTable<Seat>
      variant="compact"
      data={many}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      defaultItemsPerPage={10}
    />,
  );
  // Nine presses of Previous was the whole way back, on a cluster that names
  // "of 3" as a destination.
  fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
  expect(screen.getByText('seat 29')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'First page' }));
  expect(screen.getByText('seat 0')).toBeTruthy();
});

test('a resize handle is a separator a keyboard can move', () => {
  render(<DataTable<Seat> variant="compact" data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />);
  const handle = screen.getByRole('separator', { name: 'Resize Seat' });
  const was = Number(handle.getAttribute('aria-valuenow'));
  handle.focus();
  expect(document.activeElement).toBe(handle);
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(was);
  // And the column it names keeps its own name, whatever the cell grows.
  expect(screen.getByRole('columnheader', { name: 'Seat' })).toBeTruthy();
});

test('a column keyed with a space is still a column with a name', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={{ 'created at': { label: 'Created at', render: () => 'today' } }}
      getRowKey={(row) => row.id}
    />,
  );
  // `aria-labelledby` is a space-separated list of ids, so the key goes into
  // one id or the cell points at two that do not exist and has no name.
  expect(screen.getByRole('columnheader', { name: 'Created at' })).toBeTruthy();
});

test('a table with no row actions still offers its settings frame', () => {
  render(
    <DataTable<Seat>
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      showActions={false}
    />,
  );
  /*
   * The cog hung off the row-actions column, so a default-variant table with
   * no actions had no way into its own settings: a column hidden by
   * `defaultVisible: false` could never be brought back.
   */
  fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
  expect(screen.getByText('Table Settings')).toBeTruthy();
});

test('the end of the rows is said once, and only when there is an end to say', () => {
  const { rerender } = render(
    <DataTable<Seat>
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      endMessage="End of feed"
    />,
  );
  expect(screen.getByText('End of feed')).toBeTruthy();

  rerender(
    <DataTable<Seat>
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      endMessage="End of feed"
      hasMore
      onLoadMore={() => {}}
    />,
  );
  expect(screen.queryByText('End of feed')).toBeNull();
});

test('a row action menu is the package menu, with its dividers as separators', () => {
  const remove = vi.fn();
  render(
    <DataTable<Seat>
      data={seats.slice(0, 1)}
      columns={{ name: { label: 'Seat' } }}
      getRowKey={(row) => row.id}
      rowActions={() => [
        { label: 'Open', onClick: () => {} },
        { label: 'Delete', danger: true, divider: 'before', onClick: remove },
        { label: 'Hidden', visible: false },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Row actions' }));
  // Inside the MENU: the resize handles are separators of their own, and a
  // query over the whole document would be counting the table's chrome.
  expect(within(screen.getByRole('menu')).getAllByRole('separator')).toHaveLength(1);
  expect(screen.queryByRole('menuitem', { name: 'Hidden' })).toBeNull();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  expect(remove).toHaveBeenCalledTimes(1);
});

test('a right-aligned column aligns its header with its numbers, in compact too', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      getRowKey={(row) => row.id}
      columns={{
        name: { label: 'Seat', shrink: true },
        live: { label: 'Spend', align: 'right', render: (row) => row.live },
      }}
    />,
  );
  /*
   * The class is the mechanism: the alignment and the tabular figures are one
   * rule in the stylesheet, and the compact variant used to drop the prop on
   * the floor, so a column of numbers was left-aligned under a header that
   * was too.
   */
  const header = screen.getByRole('columnheader', { name: 'Spend' });
  expect(header.className).toContain('crewlet-data-table__cell--right');
  const cell = screen.getByText('5');
  expect(cell.className).toContain('crewlet-data-table__cell--right');
  expect(screen.getByRole('columnheader', { name: 'Seat' }).className)
    .toContain('crewlet-data-table__cell--shrink');
});

test('a table with no pager and no cog draws no toolbar at all', () => {
  /*
   * THE SPACE IS GIVEN BACK. The Columns panel was drawn for any caller that
   * passed the controlled pair, so a table with neither chevrons nor a gear
   * still paid for a toolbar row to hold it. With the panel gone there is
   * nothing in that row, so there is no row: the rule under the last header
   * meets the first record.
   */
  const { container } = render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      paginated={false}
      showSettings={false}
      visibleColumns={{ name: true, note: false }}
      onVisibleColumnsChange={() => {}}
    />,
  );
  expect(screen.queryByRole('button', { name: /Columns/ })).toBeNull();
  expect(container.querySelector('.crewlet-data-table__toolbar')).toBeNull();
  expect(container.querySelector('.crewlet-data-table__chrome')).toBeNull();
  // And the pair still drives the table, whoever holds the control.
  expect(screen.queryByRole('columnheader', { name: 'Note' })).toBeNull();
});

test('a column the caller never named is a column the caller never hid', () => {
  /*
   * A controlled map is the CALLER's, and a caller that hides one column by
   * naming it alone has named the only thing it wants changed. The header and
   * the cells read the map as a bare truthy test and dropped everything it
   * did not mention, while the Columns panel read it as "not false" and drew
   * them all ticked: a table with no columns under a panel saying otherwise.
   */
  render(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `#/seat/${row.id}`}
      visibleColumns={{ note: false }}
      onVisibleColumnsChange={() => {}}
    />,
  );
  expect(screen.getByRole('columnheader', { name: /Seat/ })).toBeTruthy();
  expect(screen.queryByRole('columnheader', { name: 'Note' })).toBeNull();
  // And the row's own marks land on a cell that is actually drawn.
  expect(screen.getByRole('link', { name: 'alpha' })).toBeTruthy();
});

test('resizable={false} leaves no resize handle in either variant', () => {
  // A separator a reader can move, which is what a resize handle IS: see
  // `resizerState`.
  const resizeHandles = () => screen.queryAllByRole('separator', { name: /^Resize / });
  const { rerender } = render(
    <DataTable<Seat> data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />,
  );
  expect(resizeHandles().length).toBeGreaterThan(0);

  rerender(
    <DataTable<Seat> data={seats} columns={nameAndNote} getRowKey={(row) => row.id} resizable={false} />,
  );
  expect(resizeHandles()).toHaveLength(0);

  rerender(
    <DataTable<Seat>
      variant="compact"
      data={seats}
      columns={nameAndNote}
      getRowKey={(row) => row.id}
      resizable={false}
    />,
  );
  expect(resizeHandles()).toHaveLength(0);
});

test('a cell with no value says so, and the actions column has a name', () => {
  render(
    <DataTable<Seat>
      variant="compact"
      data={[{ id: 'unmetered', name: 'Unmetered', live: null }]}
      getRowKey={(row) => row.id}
      columns={{ name: { label: 'Seat' }, live: { label: 'Spend' } }}
      rowActions={() => [{ label: 'Open', onClick: () => {} }]}
      labels={{ absent: 'Not measured' }}
    />,
  );
  // The dash is drawn and the word is read: a screen reader says "dash" or
  // nothing at all for the punctuation, so the fact travels in the words.
  expect(screen.getByText('Not measured')).toBeTruthy();
  // The kebab's own column is named, so a reader crossing the row is told
  // which column they have reached.
  expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeTruthy();
});

test('a column declared after the table mounted is drawn, in the place it was declared', () => {
  function Growing() {
    const [extra, setExtra] = useState(false);
    const columns: Record<string, DataTableColumn<Seat>> = extra
      ? { name: { label: 'Seat' }, note: { label: 'Note' }, live: { label: 'Spend' } }
      : { name: { label: 'Seat' }, live: { label: 'Spend' } };
    return (
      <>
        <button type="button" onClick={() => setExtra(true)}>
          Add
        </button>
        <DataTable<Seat>
          variant="compact"
          data={seats}
          getRowKey={(row) => row.id}
          columns={columns}
          defaultColumnOrder={Object.keys(columns)}
        />
      </>
    );
  }

  render(<Growing />);
  const headers = () => screen.getAllByRole('columnheader').map((cell) => cell.textContent);
  expect(headers()).toEqual(['Seat', 'Spend']);

  /*
   * The order is seeded once from `defaultColumnOrder`, so without the
   * reconcile a column added later is in `columns`, is in the caller's order,
   * and is drawn nowhere: an archived list that reveals a Deleted at column,
   * or a screen that swaps its column set, simply loses it.
   */
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(headers()).toEqual(['Seat', 'Note', 'Spend']);
});

/**
 * The column order, against what the caller declares NOW.
 *
 * Both halves matter and they pull against each other: the reader's own
 * arrangement is theirs to keep, and a column they have never seen has to
 * arrive somewhere they would look for it.
 */
test('a column declared later arrives beside the one it was declared after', () => {
  // Nothing rearranged: the declaration is the order.
  expect(reconcileOrder(['name', 'live'], ['name', 'note', 'live'])).toEqual(['name', 'note', 'live']);
  // A column that has gone is dropped, and the rest keep their places.
  expect(reconcileOrder(['live', 'name', 'gone'], ['name', 'live'])).toEqual(['live', 'name']);

  /*
   * REARRANGED, which is the case that separates the two rules. Note is
   * declared after Seat, so it belongs after Seat wherever the reader has put
   * that column. Counting how many earlier columns are already placed answers
   * a different question, the DEPTH rather than the PLACE, and put Note second.
   */
  expect(reconcileOrder(['live', 'name'], ['name', 'note', 'live'])).toEqual(['live', 'name', 'note']);
  // A new FIRST column has nothing declared before it, so it goes to the front.
  expect(reconcileOrder(['live', 'name'], ['pick', 'name', 'live'])).toEqual(['pick', 'live', 'name']);
});

/* ─── A pinned header and a bounded body are ONE thing ──────────────
   The rows already sit in a scroller of their own, because a table has to be
   able to overflow sideways and a box that scrolls in one axis scrolls in
   both. A `position: sticky` header pins against THAT box and nothing else, so
   a table told to pin its header and not told how tall to be pins against a
   box as tall as its own rows, which never scrolls: the true case of that
   boolean did nothing at all on any screen. The height is the one thing a
   caller has to decide, and it cannot be said without also meaning the pin. */
test('the header pins exactly where the rows are bounded, and nowhere else', () => {
  const { rerender, container } = render(
    <DataTable<Seat> data={seats} getRowKey={(row) => row.id} columns={nameAndNote} variant="compact" />,
  );
  const root = () => container.querySelector('.crewlet-data-table')!;
  const scroller = () => container.querySelector<HTMLElement>('.crewlet-data-table__scroll')!;
  expect(root().classList.contains('crewlet-data-table--sticky-head')).toBe(false);
  expect(scroller().style.maxHeight).toBe('');

  rerender(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      variant="compact"
      maxBodyHeight={320}
    />,
  );
  expect(root().classList.contains('crewlet-data-table--sticky-head')).toBe(true);
  // The bound is on the scroller the header pins inside, not on the rail
  // around it: a height on the rail leaves that box as tall as its rows.
  expect(scroller().style.maxHeight).toBe('320px');

  rerender(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      variant="compact"
      maxBodyHeight="60vh"
    />,
  );
  expect(scroller().style.maxHeight).toBe('60vh');
});

/*
 * THE WHOLE HEADER STICKS, OR NONE OF IT DOES. Under `maxBodyHeight` every
 * header cell is `position: sticky` from the stylesheet, and the actions
 * column carried an inline `position: relative` so the two buttons it holds
 * had a containing block. Inline wins over a stylesheet, so on a bounded
 * table every column name stayed put while that one column's heading scrolled
 * away with the rows. The stylesheet's own value is already the containing
 * block those buttons need, pinned or not, so the cell says nothing about
 * position at all.
 */
test('no header cell overrides the position the stylesheet gives the header', () => {
  render(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      rowActions={() => [{ label: 'Open', onClick: () => {} }]}
    />,
  );
  const headers = [...document.querySelectorAll('thead th')] as HTMLElement[];
  expect(headers.length).toBeGreaterThan(1);
  // The settings cog lives in that cell, which is what made it the one with
  // an inline position: the case is only real while it is drawn.
  expect(screen.getByRole('button', { name: 'Table settings' })).toBeTruthy();
  expect(headers.filter((cell) => cell.style.position !== '').map((cell) => cell.outerHTML)).toEqual([]);
});

/* ─── What the chrome says out loud ─────────────────────────────────
   Each of these is a fact the table already drew and never said. */
test('the pagination is a named group, and says which rows the page is', () => {
  render(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      variant="compact"
      defaultItemsPerPage={1}
    />,
  );
  // A name on a plain div attaches to no role and is read by nobody. A GROUP
  // rather than a landmark: a table does not know how many tables it shares a
  // screen with, and a landmark that cannot be uniquely named fills a reader's
  // landmark list with identical entries for a table's own chrome.
  const pagination = screen.getByRole('group', { name: 'Pagination' });
  expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBe(null);
  expect(within(pagination).getByText('Page 1 of 2. Rows 1 to 1 of 2')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(within(pagination).getByText('Page 2 of 2. Rows 2 to 2 of 2')).toBeTruthy();
});

test('an empty table says so out loud, and a loading one says it is loading', () => {
  const props = {
    getRowKey: (row: Seat) => row.id,
    columns: nameAndNote,
    variant: 'compact' as const,
    emptyMessage: 'No seats yet.',
  };
  const { rerender } = render(<DataTable<Seat> data={seats} {...props} />);
  /*
   * THE REGION IS NOT IN THE CELL, AND IT IS THE SAME REGION BEFORE AND AFTER.
   * A screen reader registers a live region when the region enters the
   * accessibility tree and reports what changes inside it after that, so a
   * region that arrives TOGETHER with its first content announces nothing at
   * all. That is precisely the empty row: it appears when the list empties,
   * which is the one moment the sentence had to be heard. So the region is
   * mounted with the table, empty, and the filter that clears the rows is a
   * change inside a node that was already being watched.
   */
  const region = screen.getByRole('status');
  expect(region.textContent).toBe('');

  rerender(<DataTable<Seat> data={[]} {...props} />);
  expect(screen.getByRole('status')).toBe(region);
  expect(region.textContent).toBe('No seats yet.');
  // The cell carries the sentence and no wrapper at all, which is the markup
  // the design is specified in, and the region is neither in the table nor in
  // the scroller, which has no business holding anything but the table.
  expect(document.querySelector('.crewlet-data-table__empty')?.innerHTML).toBe('No seats yet.');
  expect(region.closest('table')).toBe(null);
  expect(region.closest('.crewlet-data-table__scroll')).toBe(null);

  rerender(<DataTable<Seat> data={[]} {...props} loading />);
  expect(document.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByRole('status').textContent).toBe('Loading rows');
});

/* And a screen's empty message is a NODE, not a sentence: every list screen in
   the engine passes a whole EmptyState, a heading over a sentence, sometimes
   with something to press. What the region carries is the row's own rendered
   text, so those words are heard without a second copy of the node itself,
   which would be a second copy of the control in it. */
test('the empty sentence is announced even when the caller passes a node', () => {
  const { rerender } = render(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      variant="compact"
      emptyMessage={
        <div>
          <h3>Nothing matches these filters</h3>
          <p>Clear them to see every seat.</p>
          <button type="button">Clear filters</button>
        </div>
      }
    />,
  );
  rerender(
    <DataTable<Seat>
      data={[]}
      getRowKey={(row) => row.id}
      columns={nameAndNote}
      variant="compact"
      emptyMessage={
        <div>
          <h3>Nothing matches these filters</h3>
          <p>Clear them to see every seat.</p>
          <button type="button">Clear filters</button>
        </div>
      }
    />,
  );
  expect(screen.getByRole('status').textContent).toBe(
    'Nothing matches these filtersClear them to see every seat.Clear filters',
  );
  // The node itself is drawn ONCE: the region carries its text and not a copy
  // of it, so the button in it is one tab stop rather than two.
  expect(screen.getAllByRole('button', { name: 'Clear filters' })).toHaveLength(1);
});

/* ─── A pinned pane has nothing behind it ───────────────────────────
   A pinned pane would want an edge if rows passed under it, and on this table
   none ever do: a VISIBLE column pinned right puts the rail in its frozen
   state, whose scroller locks horizontal overflow so the regular columns are
   always fitted to the container. That pairing is what makes the pane's
   missing edge correct rather than forgotten, and it is the pairing that is
   asserted, in both directions: hide the pinned column and the table is an
   ordinary scrolling one again. */
test('a table with a pinned pane is frozen, so nothing ever passes behind it', () => {
  const columns = {
    name: { label: 'Seat' },
    open: { label: '', sticky: 'right' as const, width: 80, render: () => 'Open' },
  };
  const { container, rerender } = render(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={columns}
      variant="compact"
      visibleColumns={{ name: true, open: true }}
      onVisibleColumnsChange={() => {}}
    />,
  );
  const rail = () => container.querySelector('.crewlet-data-table__rail')!;
  expect(rail().classList.contains('crewlet-data-table__rail--frozen')).toBe(true);
  expect(container.querySelector('.crewlet-data-table__td--sticky-right')).toBeTruthy();

  rerender(
    <DataTable<Seat>
      data={seats}
      getRowKey={(row) => row.id}
      columns={columns}
      variant="compact"
      visibleColumns={{ name: true, open: false }}
      onVisibleColumnsChange={() => {}}
    />,
  );
  // No pinned cell left, so nothing to freeze the rail for.
  expect(container.querySelector('.crewlet-data-table__td--sticky-right')).toBe(null);
  expect(rail().classList.contains('crewlet-data-table__rail--frozen')).toBe(false);
});

/*
 * THE CARD'S HEADER TAKES THE TABLE'S CONTROLS. A panel whose header says what
 * the rows are and how many there are, with a bar under it holding a pager and
 * a cog and nothing else, is two rows of chrome over one table. The controls
 * go on the row that already names what they page through, and the table below
 * it starts at its own first row.
 *
 * The composition is the package's, not the caller's: the card publishes the
 * row and the table draws into it, so a screen still writes a card, a header
 * and a table and no stylesheet of its own.
 */
describe('a table that fills a card', () => {
  const panel = (props: Partial<DataTableProps<Seat>> = {}, extra?: ReactNode) => (
    <Card as="section" padding="none">
      <Card.Header icon={<span>#</span>} count={seats.length}>
        <Card.Title>Seats</Card.Title>
      </Card.Header>
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={nameAndNote}
        getRowKey={(row) => row.id}
        defaultItemsPerPage={1}
        {...props}
      />
      {extra}
    </Card>
  );

  test('draws its pager and its cog on the card header, not in a bar of its own', () => {
    const { container } = render(panel());

    const header = container.querySelector('.crewlet-card__header')!;
    const chrome = header.querySelector('.crewlet-data-table__chrome')!;
    expect(chrome).toBeTruthy();
    expect(within(chrome as HTMLElement).getByRole('group', { name: 'Pagination' })).toBeTruthy();
    expect(within(chrome as HTMLElement).getByRole('button', { name: 'Table settings' })).toBeTruthy();
    // And the bar that used to hold them is not drawn at all.
    expect(container.querySelector('.crewlet-data-table__toolbar')).toBe(null);
    // The header keeps what it already carried, on the left, in its own order.
    const main = header.querySelector('.crewlet-card__header-main')!;
    expect(main.textContent).toBe('#Seats2');
    expect(main.compareDocumentPosition(chrome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the cog on the header opens this table own frame, and gives focus back', () => {
    /*
     * The controls are moved by a PORTAL, so they are the header's in the DOM
     * and this table's in React: the frame the cog opens is this table's, and
     * the focus it returns closes onto the button where the reader left it.
     */
    render(panel());
    const cog = screen.getByRole('button', { name: 'Table settings' });
    cog.focus();
    fireEvent.click(cog);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('checkbox', { name: 'Note' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(document.activeElement).toBe(cog);
  });

  test('a table with no card of its own keeps its own bar', () => {
    const { container } = render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={nameAndNote}
        getRowKey={(row) => row.id}
        defaultItemsPerPage={1}
      />,
    );
    const toolbar = container.querySelector('.crewlet-data-table__toolbar')!;
    expect(toolbar).toBeTruthy();
    expect(toolbar.querySelector('.crewlet-data-table__chrome')).toBeTruthy();
  });

  test('a card with no header of its own leaves the bar where it was', () => {
    const { container } = render(
      <Card as="section" padding="none">
        <DataTable<Seat>
          variant="compact"
          data={seats}
          columns={nameAndNote}
          getRowKey={(row) => row.id}
          defaultItemsPerPage={1}
        />
      </Card>,
    );
    expect(container.querySelector('.crewlet-data-table__toolbar .crewlet-data-table__chrome')).toBeTruthy();
  });

  test('a second table in one card keeps its own bar, so one header holds one pager', () => {
    /*
     * Two pagers and two cogs on one header row would each belong to rows the
     * reader cannot tell apart. The first table holds the row; the second is
     * told no and draws what it draws outside a card anyway.
     */
    const { container } = render(
      panel(
        {},
        <DataTable<Seat>
          variant="compact"
          data={seats}
          columns={nameAndNote}
          getRowKey={(row) => `second-${row.id}`}
          defaultItemsPerPage={1}
        />,
      ),
    );
    expect(container.querySelectorAll('.crewlet-card__header .crewlet-data-table__chrome')).toHaveLength(1);
    expect(container.querySelectorAll('.crewlet-data-table__toolbar .crewlet-data-table__chrome')).toHaveLength(1);
    expect(screen.getAllByRole('group', { name: 'Pagination' })).toHaveLength(2);
  });

  test('a table that titles itself keeps its controls in its own header', () => {
    // Two named rows over one table is the shape this change removes; where a
    // caller has titled the table, the table's own header is the nearer of the
    // two and the card's stays as the caller wrote it.
    const { container } = render(panel({ title: 'Every seat' }));
    expect(container.querySelector('.crewlet-card__header .crewlet-data-table__chrome')).toBe(null);
    expect(container.querySelector('.crewlet-data-table__header .crewlet-data-table__chrome')).toBeTruthy();
  });

  test('a table with nothing to put there leaves the header for one that has', () => {
    const { container } = render(
      panel(
        { paginated: false, showSettings: false },
        <DataTable<Seat>
          variant="compact"
          data={seats}
          columns={nameAndNote}
          getRowKey={(row) => `second-${row.id}`}
          defaultItemsPerPage={1}
        />,
      ),
    );
    const chrome = container.querySelectorAll('.crewlet-card__header .crewlet-data-table__chrome');
    expect(chrome).toHaveLength(1);
    expect(within(chrome[0] as HTMLElement).getByRole('group', { name: 'Pagination' })).toBeTruthy();
  });

  test('a card holding no table draws no box for controls nobody sent', () => {
    // The node is rendered by every header inside a card, because the panel
    // that might fill it is below the header in the tree. An empty one is
    // given no box at all by the stylesheet, and it is empty here.
    const { container } = render(
      <Card as="section">
        <Card.Header>
          <Card.Title>Nothing to page</Card.Title>
        </Card.Header>
        <Card.Body>Prose.</Card.Body>
      </Card>,
    );
    const slot = container.querySelector('.crewlet-card__header-chrome')!;
    expect(slot).toBeTruthy();
    expect(slot.childElementCount).toBe(0);
  });
});

/*
 * A TABLE THAT PAGES CAN BE PAGED. The chrome row was the compact variant's
 * alone, and `paginated` defaults to true in both: a default-variant table
 * sliced twenty-five rows into pages of ten and drew nothing to turn them
 * with, so fifteen of them were reachable only by opening the settings frame
 * and choosing All. Which control a reader is offered is a question about
 * whether the table pages, not about how it looks.
 */
test.each<DataTableVariant>(['default', 'compact'])(
  'a %s table that slices its rows draws the control that turns them',
  (variant) => {
    const many: Seat[] = Array.from({ length: 25 }, (_, index) => ({
      id: `s${index}`,
      name: `seat ${index}`,
      live: index,
    }));
    const { container } = render(
      <DataTable<Seat>
        variant={variant}
        data={many}
        columns={{ name: { label: 'Seat' } }}
        getRowKey={(row) => row.id}
        defaultItemsPerPage={10}
        defaultSort={{ key: 'live', direction: 'asc' }}
      />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(within(screen.getByRole('group', { name: 'Pagination' })).getByText(
      'Page 1 of 3. Rows 1 to 10 of 25',
    )).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(firstCellText()).toBe('seat 10');
  },
);

test('the cog is drawn once, wherever its variant puts it', () => {
  /*
   * The default variant keeps its cog in the trailing chrome column's header,
   * so the row that arrived with its pager must not draw a second one: two
   * controls opening one frame is one of them a reader has to learn to
   * ignore.
   */
  const { container } = render(
    <DataTable<Seat> data={seats} columns={nameAndNote} getRowKey={(row) => row.id} />,
  );
  expect(screen.getAllByRole('button', { name: 'Table settings' })).toHaveLength(1);
  expect(container.querySelector('.crewlet-data-table__chrome .crewlet-data-table__settings-btn')).toBe(null);
  expect(container.querySelector('.crewlet-data-table__header-btn--settings')).toBeTruthy();
});

/*
 * ─── A table stays inside the box it is drawn in ───────────────────
 *
 * The fit pass is the only thing in this component that measures anything,
 * and jsdom measures nothing: every `clientWidth` is 0, which is the width
 * the pass refuses to work from, so none of what follows ran here before.
 * The stub gives the SCROLLER a width and leaves every other element at
 * zero, which is what the pass reads.
 *
 * What is asserted is the arithmetic the browser then lays out: with
 * `table-layout: fixed` (the compact variant, held in styles.test.tsx) a
 * column is exactly as wide as its cell says, so the row is as wide as those
 * widths add up to and the scroller scrolls when that passes its own width.
 */
function scrollerWidth(px: number): () => void {
  const proto = window.HTMLDivElement.prototype;
  const own = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLDivElement) {
      return this.classList.contains('crewlet-data-table__scroll') ? px : 0;
    },
  });
  return () => {
    if (own) Object.defineProperty(proto, 'clientWidth', own);
    else delete (proto as unknown as Record<string, unknown>).clientWidth;
  };
}

/**
 * A scroller whose box is FRACTIONAL, as a grid or flex column routinely is.
 *
 * `clientWidth` is an integer, so it cannot express 544.5 and rounds. The fit
 * reads the box itself, so this states both: the measured width, and what the
 * rounding property would have answered beside it.
 */
function fractionalScroller(width: number): () => void {
  const proto = window.HTMLDivElement.prototype;
  const ownClient = Object.getOwnPropertyDescriptor(proto, "clientWidth");
  const ownRect = Object.getOwnPropertyDescriptor(proto, "getBoundingClientRect");
  const base = proto.getBoundingClientRect;
  const mine = (el: HTMLDivElement) => el.classList.contains("crewlet-data-table__scroll");
  Object.defineProperty(proto, "clientWidth", {
    configurable: true,
    get(this: HTMLDivElement) {
      return mine(this) ? Math.round(width) : 0;
    },
  });
  Object.defineProperty(proto, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLDivElement): DOMRect {
      if (!mine(this)) return base.call(this);
      return {
        x: 0, y: 0, top: 0, left: 0, right: width, bottom: 0, width, height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    },
  });
  return () => {
    if (ownClient) Object.defineProperty(proto, "clientWidth", ownClient);
    else delete (proto as unknown as Record<string, unknown>).clientWidth;
    if (ownRect) Object.defineProperty(proto, "getBoundingClientRect", ownRect);
    else delete (proto as unknown as Record<string, unknown>).getBoundingClientRect;
  };
}

/**
 * The width the stylesheet draws the pinned pane's gutter at.
 *
 * jsdom lays nothing out, so the cell the fit pass measures answers zero and
 * the pass falls back to the figure the normal density draws. Stating one
 * here is how the density that is NOT that figure gets exercised.
 */
function drawnSpacerWidth(px: number): () => void {
  const proto = window.HTMLTableCellElement.prototype;
  const own = Object.getOwnPropertyDescriptor(proto, 'getBoundingClientRect');
  const base = proto.getBoundingClientRect;
  Object.defineProperty(proto, 'getBoundingClientRect', {
    configurable: true,
    value(this: HTMLTableCellElement): DOMRect {
      if (!this.classList.contains('crewlet-data-table__th--spacer')) return base.call(this);
      return { x: 0, y: 0, top: 0, left: 0, right: px, bottom: 0, width: px, height: 0,
        toJSON: () => ({}) } as DOMRect;
    },
  });
  return () => {
    if (own) Object.defineProperty(proto, 'getBoundingClientRect', own);
    else delete (proto as unknown as Record<string, unknown>).getBoundingClientRect;
  };
}

/** What each header cell states, in order, and 0 where it states nothing. */
const statedWidths = (): number[] => [...document.querySelectorAll('thead th')]
  .map((th) => Number.parseFloat((th as HTMLElement).style.width) || 0);

const statedTotal = (): number => statedWidths().reduce((sum, px) => sum + px, 0);

/** Three columns, none of them locked by the caller. */
const threeColumns: Record<string, DataTableColumn<Seat>> = {
  name: { label: 'Seat', defaultWidth: 300 },
  note: { label: 'Note', defaultWidth: 90 },
  live: { label: 'Live', defaultWidth: 90 },
};

describe('a table fitted to its container', () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  test('fills the container exactly, and so does not scroll', () => {
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedTotal()).toBe(600);
  });

  test("states no more than a fractional container holds", () => {
    /*
     * A table in a grid column is routinely a fraction of a pixel wide. The
     * pass read `clientWidth`, which rounds 544.5 up to 545, so the columns
     * were handed a whole pixel more than the box held and the scroller drew
     * a bar for the half pixel over: a horizontal scrollbar across a table
     * that fits, at every viewport width, on a screen with no rows. Measured
     * on the engine's fleet screen at 1440, 1280 and 1100.
     */
    restore = fractionalScroller(544.5);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedTotal()).toBe(544);
  });

  test('takes its room back from every column that still has some', () => {
    /*
     * 480px of columns in a 400px box, and two of the three are 10px above
     * the floor. One proportional pass gives each of them its share, stops
     * both at the floor, hands the shortfall to whichever column is last and
     * stops that one at the floor too: 410px in a 400px box, with a column
     * 240px wide sitting beside them the whole time.
     */
    restore = scrollerWidth(400);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedWidths()).toEqual([240, 80, 80, 0]);
    expect(statedTotal()).toBe(400);
  });

  test('is not left a pixel wider than its container', () => {
    /*
     * The tolerance was symmetric, so a row one pixel over its box was left
     * there and the scroller drew a bar across a table that fits to within a
     * rounding error. Measured on the engine dashboard's budgets panel: 692
     * in a 691px box.
     */
    restore = scrollerWidth(480);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={{ ...threeColumns, live: { label: 'Live', defaultWidth: 91 } }}
        getRowKey={(row) => row.id}
      />,
    );
    // 481px of columns in a 480px box: one pixel over, and a scrollbar.
    expect(statedTotal()).toBe(480);
  });

  test('fits again when a column the reader had hidden comes back', () => {
    /*
     * Which columns are on is half of what the fit was computed from, and it
     * was watched by nothing: showing one back added a column's width to a
     * row already exactly as wide as its box. Measured on the engine
     * dashboard's runs list: three columns back on, 360px of overflow that
     * stayed until something else remounted the table.
     */
    restore = scrollerWidth(600);
    const { rerender } = render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
        visibleColumns={{ name: true, note: false, live: false }}
        onVisibleColumnsChange={() => {}}
      />,
    );
    expect(statedTotal()).toBe(600);
    rerender(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
        visibleColumns={{ name: true, note: true, live: true }}
        onVisibleColumnsChange={() => {}}
      />,
    );
    expect(statedTotal()).toBe(600);
  });

  test('fits when it is first measured, however late that is', () => {
    /*
     * A table mounted inside a panel that is not on screen measures zero, and
     * the pass has nothing to fit to. What asked for a fit used to be a flag
     * that the pass could only clear once it had measured something, so every
     * later request set a `true` that was already true: React had no state
     * change to re-render for, and the table never fitted at all once it was
     * shown. A count of requests cannot be already set.
     */
    restore = scrollerWidth(0);
    const { rerender } = render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
        visibleColumns={{ name: true, note: false, live: true }}
        onVisibleColumnsChange={() => {}}
      />,
    );
    restore();
    restore = scrollerWidth(600);
    rerender(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
        visibleColumns={{ name: true, note: true, live: true }}
        onVisibleColumnsChange={() => {}}
      />,
    );
    expect(statedTotal()).toBe(600);
  });
});

describe('a table with no rows', () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  const rowless = () => document.querySelector('.crewlet-data-table__table--rowless');

  test('lays itself out by content rather than by the widths it holds', () => {
    /*
     * A width is a claim about content, and under the fixed layout it is an
     * instruction: with no rows it came out as a row wider than its container
     * and a reader scrolling sideways past columns holding nothing. Seven of
     * the twelve tables measured scrolling on the engine dashboard were empty
     * ones. The widths stay stated, so the header keeps the shape its rows
     * will land in; the layout is what changes.
     */
    restore = scrollerWidth(200);
    render(
      <DataTable<Seat>
        variant="compact"
        data={[]}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(rowless()).toBeTruthy();
    expect(statedTotal()).toBeGreaterThan(0);
    expect(document.querySelector('.crewlet-data-table__empty')?.textContent).toBe('No data available');
  });

  test('says the same of a table showing an error instead of its rows', () => {
    restore = scrollerWidth(200);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        error="The fleet did not answer"
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(rowless()).toBeTruthy();
  });

  test('but a loading table is laid out for the rows it is waiting on', () => {
    // The bars stand in for the rows replacing them, and they line up with
    // those rows because both are drawn at the same widths under one layout.
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        data={[]}
        loading
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(rowless()).toBe(null);
    expect(statedTotal()).toBe(600);
  });

  test('and a table with rows is laid out by them', () => {
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(rowless()).toBe(null);
  });
});

describe('a table that genuinely needs the room', () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  const pinned: Record<string, DataTableColumn<Seat>> = {
    name: { label: 'Seat', defaultWidth: 300 },
    note: { label: 'Note', defaultWidth: 300 },
    live: { label: 'Live', defaultWidth: 300 },
    open: { label: '', sortable: false, sticky: 'right', width: 120, render: () => 'Open' },
  };

  test('scrolls rather than shrink a column past the floor', () => {
    /*
     * The floor is what keeps a cell legible, so a container narrower than
     * the floors plus the pinned pane is one the columns cannot be fitted to.
     * The row is then wider than the box and the scroller is what reaches the
     * rest of it.
     */
    restore = scrollerWidth(300);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={pinned}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedWidths().slice(0, 3)).toEqual([80, 80, 80]);
    expect(statedTotal()).toBeGreaterThan(300);
  });

  test('falls back to the drawn figure where nothing can be measured', () => {
    /*
     * The gutter is read off the spacer, and a layout that measures nothing
     * answers zero for it. Reserving that zero would hand the gutter to the
     * data columns and put the row a gutter's width past its container, so
     * the figure the normal density draws is what stands in.
     */
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={pinned}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedWidths().slice(0, 3).reduce((sum, px) => sum + px, 0)).toBe(600 - 120 - 24);
  });

  test('reserves the gutter the stylesheet draws, at whatever density', () => {
    /*
     * The gutter beside the pinned pane is a spacing token, and every spacing
     * token here is `calc(Npx * var(--density))`. The pass reserved a flat
     * 24px, so the comfortable density drew 27 and the row landed three
     * pixels over its container: measured on the conlet fixture, 883 in an
     * 880px box, which is a scrollbar across a table that fits.
     */
    restore = scrollerWidth(600);
    const drawn = drawnSpacerWidth(27);
    try {
      render(
        <DataTable<Seat>
          variant="compact"
          data={seats}
          columns={pinned}
          getRowKey={(row) => row.id}
        />,
      );
    } finally {
      drawn();
    }
    // What every cell states, plus the gutter the spacer draws, is the
    // container: 453px of data columns, the 120px pane, and 27px between.
    expect(statedWidths().slice(0, 3).reduce((sum, px) => sum + px, 0)).toBe(600 - 120 - 27);
    expect(statedTotal() + 27).toBe(600);
  });

  test('keeps its frozen pane pinned while it does', () => {
    restore = scrollerWidth(300);
    const { container } = render(
      <DataTable<Seat>
        variant="compact"
        data={seats}
        columns={pinned}
        getRowKey={(row) => row.id}
      />,
    );
    // The pane is still the rail's frozen one, still the last cell in every
    // row, and still stated at the width the caller pinned it to.
    expect(container.querySelector('.crewlet-data-table__rail--frozen')).toBeTruthy();
    const head = container.querySelector('.crewlet-data-table__th--sticky-right') as HTMLElement;
    expect(head).toBeTruthy();
    expect(head.style.width).toBe('120px');
    for (const row of container.querySelectorAll('tbody tr')) {
      expect(row.lastElementChild?.classList.contains('crewlet-data-table__td--sticky-right')).toBe(true);
    }
  });
});

describe('the widths a table remembers', () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  const resize = (columnName: string, presses: number) => {
    const handle = screen.getByRole('separator', { name: `Resize ${columnName}` });
    for (let press = 0; press < presses; press += 1) {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    }
  };

  test('are the ones a reader resized, and nothing the table worked out', () => {
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        storageKey="seats"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    // Nothing is remembered until somebody moves a handle.
    expect(localStorage.getItem('seats_resizedColumns')).toBeNull();
    resize('Seat', 2);
    expect(JSON.parse(localStorage.getItem('seats_resizedColumns') ?? '{}')).toEqual({
      name: statedWidths()[0],
    });
  });

  test('do not stop the table fitting the container it opens in', () => {
    /*
     * The entry held every column's width, the fit pass's own output among
     * them, and the pass stood down for the life of any table that had one.
     * A window narrowed after that first paint left every column at the width
     * a wider one justified: twelve of twelve tables on the engine dashboard,
     * by 300 to 500px. The entry is retired rather than read.
     */
    localStorage.setItem('seats_columnWidths', JSON.stringify({ name: 500, note: 500, live: 500 }));
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        storageKey="seats"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedTotal()).toBe(600);
    expect(localStorage.getItem('seats_columnWidths')).toBeNull();
  });

  test('hold the column a reader sized while the rest fit around it', () => {
    localStorage.setItem('seats_resizedColumns', JSON.stringify({ name: 400 }));
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        storageKey="seats"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(statedWidths()).toEqual([400, 100, 100, 0]);
  });

  test('are given back to the fit pass by Reset to Default', () => {
    restore = scrollerWidth(600);
    render(
      <DataTable<Seat>
        variant="compact"
        storageKey="seats"
        data={seats}
        columns={threeColumns}
        getRowKey={(row) => row.id}
      />,
    );
    resize('Seat', 2);
    expect(localStorage.getItem('seats_resizedColumns')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset to Default/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(localStorage.getItem('seats_resizedColumns')).toBeNull();
    expect(statedTotal()).toBe(600);
  });
});
