/**
 * DataGrid: one track list on the grid, a row link that never holds a cell's
 * link, heads that are buttons only where they sort, columns that give way in
 * order, bands for a grouped answer, and a cursor an application drives.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  ChooserList,
  ColumnChooser,
  DATA_GRID_ICON_TRACK,
  DataGrid,
  columnChoicesOf,
  fitGridColumns,
  nextGridSort,
  parseGridSort,
  type DataGridColumn,
  type DataGridHandle,
} from './index.js';
import { squeezed } from './DataGrid.js';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  seat?: string;
  tokens?: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Bravo', seat: 'ada', tokens: 30 },
  { id: 'b', name: 'Alpha', tokens: 10 },
  { id: 'c', name: 'Charlie', seat: 'grace' },
];

const COLUMNS: DataGridColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name, floor: '8rem' },
  {
    key: 'seat',
    header: 'Seat',
    shrink: true,
    cell: (r) => (r.seat ? <a href={`#/seats/${r.seat}`}>{r.seat}</a> : null),
  },
  { key: 'tokens', header: 'Tokens', align: 'right', cell: (r) => r.tokens ?? '', sortValue: (r) => r.tokens },
  { key: 'mark', header: '', label: 'Kind', cell: () => <svg /> },
  { key: 'go', header: '', action: true, cell: (r) => <button type="button">Open {r.name}</button> },
];

const sheet = () =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'DataGrid.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const names = () => [...document.querySelectorAll('.crewlet-data-grid__row')].map((row) => row.textContent);

describe('the row link', () => {
  test('is an overlay, so a row never holds a link inside a link, and it is named by its row', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} rowHref={(r) => `#/x/${r.id}`} />);
    expect(container.querySelector('a a')).toBeNull();
    const row = container.querySelector('.crewlet-data-grid__row')!;
    const link = row.querySelector('.crewlet-data-grid__row-link')!;
    expect(link.getAttribute('href')).toBe('#/x/a');
    expect(link.getAttribute('aria-labelledby')).toBe(row.id);
    expect(row.querySelector('a[href="#/seats/ada"]')).not.toBeNull();
  });

  test('is a button where the row acts and has no address, and nothing where it does neither', () => {
    const open = vi.fn();
    const { container, rerender } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} onRowActivate={open} />);
    expect(container.querySelector('a.crewlet-data-grid__row-link')).toBeNull();
    const row = container.querySelector<HTMLElement>('.crewlet-data-grid__row')!;
    const overlay = row.querySelector<HTMLButtonElement>('button.crewlet-data-grid__row-link')!;
    expect(overlay.getAttribute('aria-labelledby')).toBe(row.id);
    fireEvent.click(overlay);
    expect(open).toHaveBeenCalledWith(ROWS[0], expect.anything());
    // A control inside the row is that control's own.
    fireEvent.click(within(row).getByRole('button', { name: 'Open Bravo' }));
    expect(open).toHaveBeenCalledTimes(1);
    rerender(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    expect(container.querySelector('.crewlet-data-grid__row-link')).toBeNull();
  });

  test('is a table of rows and cells with its column heads, named by its caller', () => {
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} aria-label="Tasks" />);
    const table = screen.getByRole('table', { name: 'Tasks' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(within(table).getAllByRole('row')[1]!).getAllByRole('cell')).toHaveLength(5);
  });

  test('marks the selected row and says so', () => {
    const { container } = render(
      <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} rowHref={(r) => `#/x/${r.id}`} isSelected={(r) => r.id === 'b'} />,
    );
    const rows = [...container.querySelectorAll('.crewlet-data-grid__row')];
    expect(rows.map((r) => r.classList.contains('crewlet-data-grid__row--selected'))).toEqual([false, true, false]);
    expect(rows[1]!.querySelector('.crewlet-data-grid__row-link')!.getAttribute('aria-current')).toBe('true');
  });
});

describe('the columns', () => {
  test('are declared once, on the grid, with shrink columns capped and a floor kept', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    const grid = container.querySelector<HTMLElement>('.crewlet-data-grid')!;
    expect(grid.style.gridTemplateColumns).toBe(
      'minmax(8rem, 1fr) fit-content(20%) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    );
    expect(container.querySelector<HTMLElement>('.crewlet-data-grid__row')!.getAttribute('style')).toBeNull();
    expect(sheet()).toMatch(/\.crewlet-data-grid__row \{[^}]*grid-template-columns: subgrid;/);
  });

  test('name each cell for the phone card where the column has a word, and leave an action cell unnamed', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    const cells = [...container.querySelector('.crewlet-data-grid__row')!.children];
    expect(cells.map((c) => c.getAttribute('data-label'))).toEqual(['Name', 'Seat', 'Tokens', 'Kind', null]);
  });

  test('leave a cell with no value childless, so the card drops its line', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    const seat = container.querySelectorAll('.crewlet-data-grid__row')[1]!.children[1]!;
    expect(seat.childNodes).toHaveLength(0);
    expect(sheet()).toMatch(/\.crewlet-data-grid__cell:empty \{\s*display: none;/);
  });

  test('draw the set asked for in the order asked, and offer the way back', () => {
    const onCols = vi.fn();
    const { container } = render(
      <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} cols="tokens,name" onColsChange={onCols} />,
    );
    expect([...container.querySelector('.crewlet-data-grid__row')!.children].map((c) => c.textContent)).toEqual([
      '30',
      'Bravo',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Show every column' }));
    expect(onCols).toHaveBeenCalledWith('');
  });
});

describe('the heads', () => {
  test('are buttons only where they sort, with the sort said on the column head', () => {
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-tokens" onSortChange={() => {}} />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.map((h) => h.querySelector('button') !== null)).toEqual([true, false, true, false, false]);
    expect(heads[2]!.getAttribute('aria-sort')).toBe('descending');
    expect(heads[0]!.getAttribute('aria-sort')).toBeNull();
    // A glyph head is named by its label; an action head is not.
    expect(heads[3]!.textContent).toBe('Kind');
    expect(heads[3]!.getAttribute('title')).toBe('Kind');
    expect(heads[4]!.textContent).toBe('');
  });

  test('cycle the sort ascending, descending, then off', () => {
    const onSort = vi.fn();
    const { rerender } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="" onSortChange={onSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    rerender(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="name" onSortChange={onSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    rerender(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-name" onSortChange={onSort} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort.mock.calls.map((c) => c[0])).toEqual(['name', '-name', '']);
  });

  test('every sortable head carries an arrow, the sorted one naming its direction, and a plain head none', () => {
    const { container, rerender } = render(
      <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-tokens" onSortChange={() => {}} />,
    );
    const marks = () =>
      screen.getAllByRole('columnheader').map((head) => head.querySelector('.crewlet-data-grid__sort-mark') !== null);
    expect(marks()).toEqual([true, false, true, false, false]);
    // Hidden from assistive technology, which hears `aria-sort`.
    for (const mark of container.querySelectorAll('.crewlet-data-grid__sort-mark')) {
      expect(mark.getAttribute('aria-hidden')).toBe('true');
    }
    // The button's name is the head's word alone.
    expect(screen.getByRole('button', { name: 'Tokens' })).toBeTruthy();
    // A head that cannot be pressed shows the order it is in, and stays inert.
    rerender(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-tokens" />);
    expect(marks()).toEqual([false, false, true, false, false]);
    expect(screen.queryByRole('button', { name: 'Tokens' })).toBeNull();
  });

  test('say the order in force on a head that cannot change it', () => {
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} defaultSort="-tokens" />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads[2]!.getAttribute('aria-sort')).toBe('descending');
    expect(heads[0]!.getAttribute('aria-sort')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tokens' })).toBeNull();
  });

  test('draw the default sort on its head, and a press on it steps from there', () => {
    const onSort = vi.fn();
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} defaultSort="-tokens" onSortChange={onSort} />);
    expect(screen.getAllByRole('columnheader')[2]!.getAttribute('aria-sort')).toBe('descending');
    expect(names().map((n) => n?.slice(0, 5))).toEqual(['Bravo', 'Alpha', 'Charl']);
    fireEvent.click(screen.getByRole('button', { name: 'Tokens' }));
    expect(onSort).toHaveBeenLastCalledWith('tokens');
  });

  test('the cycle is ascending, descending, then the default, and never a press that changes nothing', () => {
    // No default: on, reversed, off.
    expect(nextGridSort('name', '')).toBe('name');
    expect(nextGridSort('name', 'name')).toBe('-name');
    expect(nextGridSort('name', '-name')).toBe('');
    expect(nextGridSort('seat', '-name')).toBe('seat');
    // A descending default: its own column turns ascending, and the step back
    // to descending IS the default, written as nothing.
    expect(nextGridSort('updated', '', '-updated')).toBe('updated');
    expect(nextGridSort('updated', 'updated', '-updated')).toBe('');
    expect(nextGridSort('updated', '-updated', '-updated')).toBe('updated');
    expect(nextGridSort('title', '', '-updated')).toBe('title');
    expect(nextGridSort('title', '-title', '-updated')).toBe('');
    // An ascending default: reversed, then back.
    expect(nextGridSort('name', '', 'name')).toBe('-name');
    expect(nextGridSort('name', '-name', 'name')).toBe('');
  });

  test('sort the rows by the column, an absent value last both ways, and leave a server order alone', () => {
    const { rerender } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="tokens" onSortChange={() => {}} />);
    expect(names().map((n) => n?.slice(0, 5))).toEqual(['Alpha', 'Bravo', 'Charl']);
    rerender(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-tokens" onSortChange={() => {}} />);
    expect(names().map((n) => n?.slice(0, 5))).toEqual(['Bravo', 'Alpha', 'Charl']);
    rerender(
      <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="-tokens" serverSorted onSortChange={() => {}} />,
    );
    expect(names().map((n) => n?.slice(0, 5))).toEqual(['Bravo', 'Alpha', 'Charl']);
    expect(parseGridSort('-a')).toEqual({ key: 'a', desc: true });
    expect(parseGridSort('')).toBeNull();
  });
});

/*
 * THE ALIGNMENT GUARD. A head stood off the values it names three ways: no
 * per-column edge but left and right, a picker's ghost button adding its own
 * inset at the cell's edge, and pills and dates ragged against a left edge. A
 * head and its cells must take one edge and one inset, whatever `align` says.
 */
describe('alignment', () => {
  interface Fact {
    id: string;
    name: string;
    age: number;
    kind: string;
  }
  const FACTS: Fact[] = [
    { id: 'a', name: 'Alpha', age: 53, kind: 'bug' },
    { id: 'b', name: 'Bravo', age: 12, kind: 'task' },
  ];
  const ALIGNED: DataGridColumn<Fact>[] = [
    { key: 'kind', header: '', label: 'Type', icon: true, cell: (r) => <svg aria-label={r.kind} /> },
    { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
    { key: 'age', header: 'Updated', align: 'right', cell: (r) => `${r.age}s ago`, sortValue: (r) => r.age },
    { key: 'mark', header: 'Mark', align: 'center', cell: () => '•' },
  ];

  test('a head and every cell of a column take the same edge', () => {
    const { container } = render(<DataGrid rows={FACTS} columns={ALIGNED} rowKey={(r) => r.id} onSortChange={() => {}} />);
    const heads = screen.getAllByRole('columnheader');
    const rows = [...container.querySelectorAll('.crewlet-data-grid__row')];
    const edge = (el: Element, part: 'th' | 'cell') =>
      (['right', 'center'] as const).find((a) => el.classList.contains(`crewlet-data-grid__${part}--${a}`)) ?? 'left';
    const expected = ['center', 'left', 'right', 'center'];
    expect(heads.map((h) => edge(h, 'th'))).toEqual(expected);
    for (const row of rows) {
      expect([...row.querySelectorAll(':scope > .crewlet-data-grid__cell')].map((c) => edge(c, 'cell'))).toEqual(expected);
    }
    // An icon column is a fixed track, named for assistive technology.
    expect((container.querySelector('.crewlet-data-grid') as HTMLElement).style.gridTemplateColumns.startsWith(DATA_GRID_ICON_TRACK)).toBe(true);
    expect(heads[0]!.textContent).toBe('Type');
    expect(heads[0]!.getAttribute('title')).toBe('Type');
  });

  test('the stylesheet gives a head and its cells one inset and one edge per align value', () => {
    const css = sheet();
    // ONE INSET: head and cell read the same two variables.
    expect(css).toMatch(/\.crewlet-data-grid__th \{[^}]*padding-inline: var\(--crewlet-data-grid-cell-start\) var\(--crewlet-data-grid-cell-end\)/);
    expect(css).toMatch(/\.crewlet-data-grid__cell \{[^}]*padding-inline: var\(--crewlet-data-grid-cell-start\) var\(--crewlet-data-grid-cell-end\)/);
    // ONE EDGE: each modifier justifies the head, its sort button and its cells alike.
    for (const [align, justify] of [
      ['right', 'flex-end'],
      ['center', 'center'],
    ] as const) {
      expect(css).toMatch(new RegExp(`\\.crewlet-data-grid__th--${align} \\{[^}]*justify-content: ${justify}`));
      expect(css).toMatch(new RegExp(`\\.crewlet-data-grid__th--${align} \\.crewlet-data-grid__sort \\{[^}]*justify-content: ${justify}`));
      expect(css).toMatch(new RegExp(`\\.crewlet-data-grid__cell--${align} \\{[^}]*justify-content: ${justify}`));
    }
    // FIGURES AND TIMES END ON ONE EDGE with tabular digits.
    expect(css).toMatch(/\.crewlet-data-grid__cell--right \{[^}]*font-variant-numeric: tabular-nums/);
    // A CENTRED SORTABLE HEAD mirrors its arrow's box before the word, so the
    // word stands on the column's middle: the reserve is the arrow's own size.
    const markSize = /\.crewlet-data-grid__sort-mark \{[^}]*inline-size: ([^;]+);/.exec(css)?.[1];
    expect(markSize).toBeDefined();
    expect(css).toMatch(
      new RegExp(`\\.crewlet-data-grid__th--center \\.crewlet-data-grid__sort::before \\{[^}]*inline-size: ${markSize!.replace(/[()]/g, '\\$&')}`),
    );
    // AN ICON COLUMN keeps the cells' step either side, at the grid's edge too.
    expect(css).toMatch(
      /\.crewlet-data-grid__th\.crewlet-data-grid__th--icon,\s*\.crewlet-data-grid__cell\.crewlet-data-grid__cell--icon \{[^}]*--crewlet-data-grid-cell-start: var\(--spacing-3\);[^}]*--crewlet-data-grid-cell-end: var\(--spacing-3\)/,
    );
    // WHERE NOTHING HOVERS, a sortable head shows its arrow at rest.
    expect(css).toMatch(/@media \(hover: none\) \{\s*\.crewlet-data-grid__th:not\(\.crewlet-data-grid__th--plain\) \.crewlet-data-grid__sort-mark \{\s*opacity: 1/);
  });

  test('an icon column carries its modifier on the head and every cell', () => {
    const { container } = render(<DataGrid rows={FACTS} columns={ALIGNED} rowKey={(r) => r.id} />);
    expect(screen.getAllByRole('columnheader')[0]!.classList.contains('crewlet-data-grid__th--icon')).toBe(true);
    for (const row of container.querySelectorAll('.crewlet-data-grid__row')) {
      expect(row.querySelector(':scope > .crewlet-data-grid__cell')!.classList.contains('crewlet-data-grid__cell--icon')).toBe(true);
    }
  });

  /*
   * ONE OUTDENT MECHANISM: Button's flush reads `--crewlet-btn-flush-outdent`,
   * a ghost control written straight into a cell takes the same declaration,
   * and the grid's exemptions (its own edge, right and centred columns, card
   * rows) set that one variable to 0. Two mechanisms let a flush control
   * bypass the exemptions and pull toward the frame.
   */
  test('a flush control takes the grid exemptions through one variable', () => {
    const css = sheet();
    const outdent = 'margin-inline-start: var(--crewlet-btn-flush-outdent, calc(-1 * (var(--crewlet-btn-inset) + 1px)))';
    expect(css).toContain(outdent);
    expect(css).not.toMatch(/control-outdent/);
    expect(css).toMatch(
      /\.crewlet-data-grid__cell:is\(:first-child, \.crewlet-data-grid__cell--right, \.crewlet-data-grid__cell--center\) \{\s*--crewlet-btn-flush-outdent: 0px;/,
    );
    expect(css).toMatch(/\.crewlet-data-grid:where\(\[data-stacked\]\) \{[^}]*--crewlet-btn-flush-outdent: 0px;/);
    const button = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../Button/Button.css'), 'utf8');
    expect(button).toContain(outdent);
    // NO OTHER RULE in the grid moves a control's start.
    expect(css.split('margin-inline-start:').length - 1).toBe(1);
  });
});

describe('bands', () => {
  test('draw sub-bands and count what is under them, the source count beside the loaded one', () => {
    const { container } = render(
      <DataGrid
        columns={COLUMNS}
        rowKey={(r) => r.id}
        bands={[
          {
            key: 'eng',
            label: 'Engineering',
            total: 5,
            rows: [],
            bands: [
              { key: 'ada', label: 'Ada', rows: [ROWS[0]!] },
              { key: 'none', label: 'Nobody', rows: [ROWS[1]!, ROWS[2]!] },
            ],
          },
          { key: 'empty', label: 'Design', total: 3, rows: [] },
        ]}
      />,
    );
    const counts = [...container.querySelectorAll('.crewlet-data-grid__band-count')].map((c) => c.textContent);
    expect(counts).toEqual(['3 of 5', '1', '2', '0 of 3']);
    // A band with no rows on this page still draws its heading, not the empty state.
    expect(screen.getByText('Design')).toBeTruthy();
  });
});

describe('the fit', () => {
  test('drops the column that goes first on an overrun, and only that one', () => {
    const fit = { set: 'a,b,c', width: 800, dropped: [] as string[] };
    const visible = [{ key: 'a' }, { key: 'b', drop: 2 }, { key: 'c', drop: 1 }];
    expect(fitGridColumns({ fit, width: 600, overflows: true, visible })).toEqual({ ...fit, width: 600, dropped: ['c'] });
    // A column with no place in the order never goes, so nothing changes.
    expect(fitGridColumns({ fit, width: 600, overflows: true, visible: [{ key: 'a' }] })).toBeNull();
  });

  test('stacks into card rows when nothing is left to drop and the values still do not fit', () => {
    const fit = { set: 'a,b', width: 800, dropped: ['b'] as string[] };
    expect(fitGridColumns({ fit, width: 500, overflows: true, stack: true, visible: [{ key: 'a' }] })).toEqual({
      set: 'a,b',
      width: 500,
      dropped: ['b'],
      stacked: true,
    });
    // A give-way column still goes first.
    expect(
      fitGridColumns({ fit, width: 500, overflows: true, stack: true, visible: [{ key: 'a' }, { key: 'c', drop: 1 }] }),
    ).toEqual({ set: 'a,b', width: 500, dropped: ['b', 'c'] });
    // A head alone cut short drops a column but never turns the grid into cards.
    expect(fitGridColumns({ fit, width: 500, overflows: true, stack: false, visible: [{ key: 'a' }] })?.stacked).toBeFalsy();
  });

  test('a stacked grid stays cards until it grows past the width it stacked at', () => {
    const fit = { set: 'a', width: 500, dropped: [] as string[], stacked: true };
    expect(fitGridColumns({ fit, width: 480, overflows: false, visible: [{ key: 'a' }] })).toBeNull();
    expect(fitGridColumns({ fit, width: 520, overflows: false, visible: [{ key: 'a' }] })).toEqual({
      set: 'a',
      width: 520,
      dropped: [],
    });
  });

  test('a head cut short is a squeeze, told apart from a value cut short', () => {
    const { container } = render(
      <DataGrid
        rows={[{ id: 'a', name: 'Bravo', tokens: 10 }]}
        columns={[
          { key: 'name', header: 'Name', cell: (r: Row) => r.name },
          { key: 'tokens', header: 'Tokens', shrink: true, cell: (r: Row) => r.tokens ?? '' },
        ]}
        rowKey={(r) => r.id}
      />,
    );
    const wrap = container.querySelector<HTMLElement>('.crewlet-data-grid')!;
    Object.defineProperty(wrap, 'clientWidth', { configurable: true, value: 400 });
    const head = wrap.querySelectorAll<HTMLElement>('.crewlet-data-grid__th')[1]!;
    head.getBoundingClientRect = () => ({ width: 24 }) as DOMRect;
    const box = (el: HTMLElement, client: number, scroll: number) => {
      Object.defineProperty(el, 'clientWidth', { configurable: true, value: client });
      Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scroll });
    };
    const cell = wrap.querySelectorAll<HTMLElement>('.crewlet-data-grid__row .crewlet-data-grid__cell')[1]!;
    box(cell, 24, 20);
    box(head.querySelector<HTMLElement>('.crewlet-data-grid__truncate')!, 12, 44);
    const visible = [
      { key: 'name', header: 'Name', cell: () => null },
      { key: 'tokens', header: 'Tokens', shrink: true, cell: () => null },
    ];
    expect(squeezed(wrap, visible)).toBe('heads');
    box(cell, 24, 40);
    expect(squeezed(wrap, visible)).toBe('values');
  });

  test('card rows are the grid\'s own decision, never a window media query', () => {
    expect(sheet()).not.toMatch(/@media \(width < 640px\)/);
    expect(sheet()).toMatch(/\.crewlet-data-grid:where\(\[data-stacked\]\)\s*\{[^}]*display: block/);
  });

  test('gives every column another chance once the grid grows, and leaves a fit that stands', () => {
    const fit = { set: 'a', width: 600, dropped: ['c'] };
    expect(fitGridColumns({ fit, width: 700, overflows: false, visible: [] })).toEqual({ set: 'a', width: 700, dropped: [] });
    expect(fitGridColumns({ fit: { set: 'a', width: 600, dropped: [] }, width: 600, overflows: false, visible: [] })).toBeNull();
  });
});

describe('the frame', () => {
  test('is flush where asked and inside a card, its empty state included', () => {
    const { container, rerender } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} flush />);
    expect(container.querySelector('.crewlet-data-grid')!.hasAttribute('data-flush')).toBe(true);
    rerender(<DataGrid rows={[]} columns={COLUMNS} rowKey={(r) => r.id} flush empty={{ title: 'Nothing here' }} />);
    expect(container.querySelector('.crewlet-data-grid')!.hasAttribute('data-flush')).toBe(true);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(sheet()).toMatch(/\.crewlet-card > \.crewlet-data-grid,/);
  });

  test('marks a compact phone grid and its lead cells', () => {
    const columns: DataGridColumn<Row>[] = [{ ...COLUMNS[0]!, phoneLead: true }, COLUMNS[2]!];
    const { container } = render(<DataGrid rows={ROWS} columns={columns} rowKey={(r) => r.id} phoneRows="compact" />);
    expect(container.querySelector('.crewlet-data-grid')!.getAttribute('data-phone-rows')).toBe('compact');
    expect(container.querySelector('.crewlet-data-grid__cell')!.hasAttribute('data-lead')).toBe(true);
  });

  test('draws a foot quieter than a row: the micro step, the tertiary ink, the grid own ground', () => {
    const foot = /\.crewlet-data-grid__foot \{([^}]*)\}/.exec(sheet())![1]!;
    expect(foot).toMatch(/font-size: var\(--font-size-2xs\)/);
    expect(foot).toMatch(/color: var\(--color-text-tertiary\)/);
    expect(foot).toMatch(/background: transparent/);
    expect(foot).toMatch(/padding: var\(--spacing-1\)/);
    expect(foot).not.toMatch(/surface-elevated/);
  });

  test('says the rows loaded and offers more', () => {
    const more = vi.fn();
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} loadedNote="3 of 40 loaded" onLoadMore={more} />);
    expect(screen.getByText('3 of 40 loaded')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(more).toHaveBeenCalled();
  });
});

test('an application drives the cursor through the handle, and Enter activates the row it is on', () => {
  const handle = createRef<DataGridHandle>();
  const open = vi.fn();
  const { container } = render(
    <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} onRowActivate={open} handleRef={handle} />,
  );
  Element.prototype.scrollIntoView = vi.fn();
  expect(handle.current!.rowCount()).toBe(3);
  expect(handle.current!.activate(new KeyboardEvent('keydown'))).toBe(false);
  fireEvent.pointerDown(container.querySelector('.crewlet-data-grid')!);
  act(() => handle.current!.step(1));
  act(() => handle.current!.step(1));
  // Clamped at the last row.
  act(() => handle.current!.step(5));
  expect(container.querySelectorAll('.crewlet-data-grid__row--cursor')).toHaveLength(1);
  expect(container.querySelector('.crewlet-data-grid__row--cursor')!.getAttribute('data-row-index')).toBe('2');
  let activated = false;
  act(() => {
    activated = handle.current!.activate(new KeyboardEvent('keydown'));
  });
  expect(activated).toBe(true);
  expect(open.mock.calls[0]![0]).toBe(ROWS[2]);
});

test('a chooser writes the declaration order whatever the order of the ticks, and an empty value is the default set', () => {
  const onChange = vi.fn();
  const choices = columnChoicesOf([...COLUMNS, { key: 'extra', header: 'Extra', cell: () => '', optional: true }]);
  expect(choices.map((c) => c.label)).toEqual(['Name', 'Seat', 'Tokens', 'Kind', 'go', 'Extra']);
  render(<ColumnChooser choices={choices} value="" onChange={onChange} />);
  const box = (name: string) => screen.getByRole('checkbox', { name });
  expect((box('Name') as HTMLInputElement).checked).toBe(true);
  expect((box('Extra') as HTMLInputElement).checked).toBe(false);
  fireEvent.click(box('Extra'));
  expect(onChange).toHaveBeenLastCalledWith('name,seat,tokens,mark,go,extra');
});

test('a chooser list is one group named by its heading, and a box says which item it toggles', () => {
  const onToggle = vi.fn();
  render(
    <ChooserList
      label="Card shows"
      items={[
        { key: 'due', label: 'Due', checked: true },
        { key: 'owner', label: 'Owner', checked: false },
      ]}
      onToggle={onToggle}
    />,
  );
  const group = screen.getByRole('group', { name: 'Card shows' });
  expect(group.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }));
  expect(onToggle).toHaveBeenLastCalledWith('owner');
});

describe('the selection column', () => {
  function Picking({ initial = [], isSelectable }: { initial?: string[]; isSelectable?: (row: Row) => boolean }) {
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(initial));
    return (
      <>
        <output data-testid="picked">{[...selected].sort().join(',')}</output>
        <DataGrid
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          rowHref={(r) => `#/x/${r.id}`}
          selection={{ selected, onChange: setSelected, rowLabel: (r) => `Select ${r.name}`, isSelectable }}
        />
      </>
    );
  }
  const picked = () => screen.getByTestId('picked').textContent;
  const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

  test('draws a named box before the first column on every row, above the row link', () => {
    const { container } = render(<Picking />);
    for (const row of container.querySelectorAll('.crewlet-data-grid__row')) {
      const first = row.querySelector('.crewlet-data-grid__cell');
      expect(first?.querySelector('[data-above-row] input[type="checkbox"]')).not.toBeNull();
    }
    expect(box('Select Bravo')).toBeDefined();
    expect(box('Select every row')).toBeDefined();
  });

  test('ticks one row, tints it as picked, and leaves the row link alone', () => {
    const { container } = render(<Picking />);
    fireEvent.click(box('Select Alpha'));
    expect(picked()).toBe('b');
    const row = box('Select Alpha').closest('.crewlet-data-grid__row');
    expect(row?.classList.contains('crewlet-data-grid__row--picked')).toBe(true);
    expect(container.querySelectorAll('.crewlet-data-grid__row--picked')).toHaveLength(1);
  });

  test('the head box is mixed while some rows are picked, and picks or clears every row drawn', () => {
    render(<Picking initial={['a', 'elsewhere']} />);
    const all = box('Select every row');
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
    fireEvent.click(all);
    expect(picked()).toBe('a,b,c,elsewhere');
    expect(box('Select every row').checked).toBe(true);
    expect(box('Select every row').indeterminate).toBe(false);
    fireEvent.click(box('Select every row'));
    // A pick the host keeps for a row it is not drawing is left alone.
    expect(picked()).toBe('elsewhere');
  });

  test('Shift with a box sets every row between it and the last box pressed, in drawn order', () => {
    render(<Picking />);
    fireEvent.click(box('Select Bravo'));
    fireEvent.click(box('Select Charlie'), { shiftKey: true });
    expect(picked()).toBe('a,b,c');
    // A range is set to the pressed box's state, never toggled row by row.
    fireEvent.click(box('Select Alpha'));
    expect(picked()).toBe('a,c');
    fireEvent.click(box('Select Charlie'), { shiftKey: true });
    expect(picked()).toBe('a');
  });

  test('a row that cannot be picked has a disabled box, and a range or the head box skips it', () => {
    render(<Picking isSelectable={(r) => r.id !== 'b'} />);
    expect(box('Select Alpha').disabled).toBe(true);
    fireEvent.click(box('Select Bravo'));
    fireEvent.click(box('Select Charlie'), { shiftKey: true });
    expect(picked()).toBe('a,c');
    expect(box('Select every row').checked).toBe(true);
  });

  test('the selection column is the grid\'s own: never in the column chooser, never given way', () => {
    expect(columnChoicesOf(COLUMNS).map((c) => c.key)).not.toContain('crewlet-select');
    const { container } = render(<Picking />);
    const heads = container.querySelectorAll('.crewlet-data-grid__head > [role="columnheader"]');
    expect(heads).toHaveLength(COLUMNS.length + 1);
  });
});
