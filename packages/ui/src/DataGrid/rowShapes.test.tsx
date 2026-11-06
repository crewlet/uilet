/**
 * DataGrid's row shapes: rows that open, lines under a row, a row's tone, rows
 * moved by hand and their position, summary rows, a compact and a loading
 * grid, a column's overflow and hover text, a head that sorts with no
 * comparator, and a foot that is the table's own rows.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DataGrid, type DataGridColumn, type DataGridHandle } from './index.js';
import { movedKey } from './DataGrid.js';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  tokens?: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Bravo', tokens: 30 },
  { id: 'b', name: 'Alpha', tokens: 10 },
  { id: 'c', name: 'Charlie' },
];

const COLUMNS: DataGridColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { key: 'tokens', header: 'Tokens', align: 'right', cell: (r) => r.tokens ?? null, sortValue: (r) => r.tokens },
];

const sheet = () =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'DataGrid.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

const records = () => [...document.querySelectorAll('.crewlet-data-grid__row:not(.crewlet-data-grid__row--summary)')];
const names = () => records().map((row) => row.firstElementChild!.textContent);

describe('rows that open (expansion)', () => {
  const expansion = (open: Set<string>, onToggle = vi.fn()) => ({
    isExpanded: (r: Row) => open.has(r.id),
    onToggle,
    render: (r: Row) => <p>Access of {r.name}</p>,
    label: (r: Row, isOpen: boolean) => `${isOpen ? 'Hide' : 'Show'} access of ${r.name}`,
    canExpand: (r: Row) => r.id !== 'c',
  });

  test('draw a named chevron before the first column, and none on a row with nothing to open', () => {
    const onToggle = vi.fn();
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} expansion={expansion(new Set(), onToggle)} />);
    const chevron = screen.getByRole('button', { name: 'Show access of Bravo' });
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
    expect(chevron.closest('[role="cell"]')).toBe(records()[0]!.firstElementChild);
    expect(within(records()[2] as HTMLElement).queryByRole('button')).toBeNull();
    fireEvent.click(chevron);
    expect(onToggle).toHaveBeenCalledWith(ROWS[0]);
  });

  test('an open row draws its detail on a full-width row under it, which its chevron controls', () => {
    const { container } = render(
      <DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} expansion={expansion(new Set(['b']))} />,
    );
    const chevron = screen.getByRole('button', { name: 'Hide access of Alpha' });
    expect(chevron.getAttribute('aria-expanded')).toBe('true');
    const detail = document.getElementById(chevron.getAttribute('aria-controls')!)!;
    expect(detail.getAttribute('role')).toBe('row');
    expect(detail.textContent).toBe('Access of Alpha');
    // Right under its own row, and starting on the first of the caller's columns.
    expect(detail.previousElementSibling).toBe(records()[1]);
    const cell = detail.querySelector<HTMLElement>('[role="cell"]')!;
    expect(cell.getAttribute('aria-colspan')).toBe('3');
    expect(cell.style.gridColumn).toBe('2 / -1');
    expect(container.querySelectorAll('.crewlet-data-grid__subrow--detail')).toHaveLength(1);
  });
});

describe('a line under a row (rowAccessory)', () => {
  test('draws under the row it belongs to, describes the row link, and draws nothing for null', () => {
    const { container } = render(
      <DataGrid
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        rowHref={(r) => `#/x/${r.id}`}
        rowAccessory={(r) => (r.id === 'a' ? 'Cannot reach the deploy keys' : null)}
      />,
    );
    const lines = container.querySelectorAll('.crewlet-data-grid__subrow--accessory');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.previousElementSibling).toBe(records()[0]);
    const link = records()[0]!.querySelector('.crewlet-data-grid__row-link')!;
    expect(link.getAttribute('aria-describedby')).toBe(lines[0]!.id);
    expect(document.getElementById(link.getAttribute('aria-describedby')!)!.textContent).toBe(
      'Cannot reach the deploy keys',
    );
    expect(records()[1]!.querySelector('.crewlet-data-grid__row-link')!.hasAttribute('aria-describedby')).toBe(false);
    // The row and its line are one record: no rule between them.
    expect(records()[0]!.hasAttribute('data-continued')).toBe(true);
  });
});

describe('a row tone (rowTone)', () => {
  test('marks the row and the lines under it, with isFailed as the danger tone and rowTone winning', () => {
    render(
      <DataGrid
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        isFailed={(r) => r.id !== 'b'}
        rowTone={(r) => (r.id === 'a' ? 'warning' : undefined)}
        rowAccessory={(r) => (r.id === 'a' ? 'Held for review' : null)}
      />,
    );
    const [a, b, c] = records();
    expect(a!.getAttribute('data-tone')).toBe('warning');
    expect(a!.classList.contains('crewlet-data-grid__row--failed')).toBe(false);
    expect(a!.nextElementSibling!.getAttribute('data-tone')).toBe('warning');
    expect(b!.hasAttribute('data-tone')).toBe(false);
    expect(c!.getAttribute('data-tone')).toBe('danger');
    expect(c!.classList.contains('crewlet-data-grid__row--failed')).toBe(true);
  });

  test('each tone draws its own edge in its ink', () => {
    const css = sheet();
    for (const tone of ['danger', 'warning', 'info']) {
      expect(css).toMatch(
        new RegExp(
          `\\.crewlet-data-grid__row\\[data-tone='${tone}'\\], \\.crewlet-data-grid__subrow\\[data-tone='${tone}'\\] \\{ box-shadow: inset 2px 0 0 var\\(--color-feedback-${tone}-ink\\); \\}`,
        ),
      );
    }
  });
});

describe('rows moved by hand (reorder) and their position (ordinal)', () => {
  test('a move is read off the orders before and after it', () => {
    expect(movedKey(['a', 'b', 'c'], ['b', 'a', 'c'])).toEqual({ key: 'a', before: 'c' });
    expect(movedKey(['a', 'b', 'c'], ['a', 'c', 'b'])).toEqual({ key: 'b', before: null });
    expect(movedKey(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual({ key: 'c', before: 'a' });
    expect(movedKey(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeNull();
  });

  test('a handle per row, named by the row; an arrow key moves it and says where it now stands', () => {
    const onMove = vi.fn();
    render(
      <DataGrid
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        sort="name"
        onSortChange={() => {}}
        reorder={{ onMove, rowName: (r) => r.name }}
        ordinal
      />,
    );
    // THE HAND ORDER, not the sort: Bravo, Alpha, Charlie as given.
    expect(records().map((row) => row.textContent)).toEqual(['1Bravo30', '2Alpha10', '3Charlie']);
    // The heads do not sort a hand-ordered list.
    expect(screen.queryAllByRole('button', { name: /Name|Tokens/ })).toHaveLength(0);
    const handle = screen.getByRole('button', { name: 'Move Bravo' });
    expect(handle.getAttribute('draggable')).toBe('true');
    expect(handle.getAttribute('aria-describedby')).toBeTruthy();
    // The instruction it is described by lives in the table's head, as a cell's content.
    expect(
      document.getElementById(handle.getAttribute('aria-describedby')!)!.closest('[role="columnheader"]'),
    ).not.toBeNull();
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onMove).toHaveBeenCalledWith('a', 'c');
  });

  test('a row that holds its place, or whose move is saving, has a disabled handle', () => {
    render(
      <DataGrid
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        reorder={{ onMove: () => {}, rowName: (r) => r.name, canMove: (r) => r.id !== 'b', pendingKey: 'c' }}
      />,
    );
    expect((screen.getByRole('button', { name: 'Move Bravo' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Move Alpha' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move Charlie' }) as HTMLButtonElement).disabled).toBe(true);
    expect(records()[2]!.getAttribute('aria-busy')).toBe('true');
  });

  test('the position column follows the order drawn, and never sorts', () => {
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} sort="name" onSortChange={() => {}} ordinal />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads[0]!.textContent).toBe('#');
    expect(heads[0]!.querySelector('button')).toBeNull();
    expect(records().map((row) => row.firstElementChild!.textContent)).toEqual(['1', '2', '3']);
    expect(records()[0]!.textContent).toContain('Alpha');
  });
});

describe('summary rows', () => {
  test('stand on the tracks above or under the records, never sorted, linked or walked', () => {
    const handle = createRef<DataGridHandle>();
    const { container } = render(
      <DataGrid
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        rowHref={(r) => `#/x/${r.id}`}
        sort="-tokens"
        onSortChange={() => {}}
        handleRef={handle}
        summaryRows={[
          { key: 'company', label: 'The whole company', cells: { tokens: 99 }, position: 'top' },
          { key: 'total', label: 'Total', cells: { tokens: 40 } },
        ]}
      />,
    );
    const body = container.querySelector('.crewlet-data-grid__body')!;
    const first = body.firstElementChild!;
    const last = body.lastElementChild!;
    expect(first.getAttribute('data-position')).toBe('top');
    expect([...first.children].map((cell) => cell.textContent)).toEqual(['The whole company', '99']);
    expect(last.getAttribute('data-position')).toBe('bottom');
    expect([...last.children].map((cell) => cell.textContent)).toEqual(['Total', '40']);
    expect(container.querySelectorAll('.crewlet-data-grid__row--summary .crewlet-data-grid__row-link')).toHaveLength(0);
    expect(handle.current!.rowCount()).toBe(3);
    // The records between them are sorted; the summaries are not.
    expect(records().map((row) => row.firstElementChild!.textContent)).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });
});

describe('density and loading', () => {
  test('a compact grid says so, and its rows and head take the short row step', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} density="compact" />);
    expect(container.querySelector('.crewlet-data-grid')!.getAttribute('data-density')).toBe('compact');
    expect(sheet()).toMatch(
      /\.crewlet-data-grid\[data-density='compact'\] \.crewlet-data-grid__row \{ min-height: var\(--size-row-sm\); \}/,
    );
  });

  test('a loading grid with no rows keeps its head and draws placeholder rows, never the empty state', () => {
    const { container } = render(
      <DataGrid
        rows={[]}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        loading
        loadingRows={4}
        empty={{ title: 'Nothing here' }}
      />,
    );
    const table = screen.getByRole('table');
    expect(table.getAttribute('aria-busy')).toBe('true');
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.queryByText('Nothing here')).toBeNull();
    const placeholders = container.querySelectorAll('.crewlet-data-grid__row--loading');
    expect(placeholders).toHaveLength(4);
    expect(placeholders[0]!.getAttribute('aria-hidden')).toBe('true');
  });

  test('a loading grid with rows keeps them and says it is busy', () => {
    const { container } = render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} loading />);
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.crewlet-data-grid__row--loading')).toHaveLength(0);
    expect(records()).toHaveLength(3);
  });
});

describe("a column's overflow and hover text", () => {
  const box = (el: HTMLElement, client: number, scroll: number) => {
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: client });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scroll });
  };

  test('a truncating column cuts its value and carries the whole words on hover while it is cut', () => {
    render(
      <DataGrid
        rows={[{ id: 'a', name: 'A name far too long for its column' }]}
        columns={[{ key: 'name', header: 'Name', overflow: 'truncate', cell: (r: Row) => r.name }]}
        rowKey={(r) => r.id}
      />,
    );
    const cut = records()[0]!.querySelector<HTMLElement>('.crewlet-data-grid__truncate')!;
    box(cut, 80, 240);
    fireEvent.mouseEnter(cut);
    expect(cut.getAttribute('title')).toBe('A name far too long for its column');
    box(cut, 240, 240);
    fireEvent.mouseEnter(cut);
    expect(cut.hasAttribute('title')).toBe(false);
  });

  test("a column's own hover text is the cell's title whether or not it is cut, and a prose column wraps", () => {
    render(
      <DataGrid
        rows={ROWS}
        columns={[
          {
            key: 'name',
            header: 'Name',
            overflow: 'truncate',
            title: (r: Row) => `Exactly ${r.name}`,
            cell: (r: Row) => r.name,
          },
          { key: 'what', header: 'What changed', overflow: 'wrap', cell: (r: Row) => `${r.name} moved` },
        ]}
        rowKey={(r) => r.id}
      />,
    );
    const [name, what] = [...records()[0]!.children] as HTMLElement[];
    expect(name!.getAttribute('title')).toBe('Exactly Bravo');
    expect(what!.classList.contains('crewlet-data-grid__cell--wrap')).toBe(true);
    expect(sheet()).toMatch(/\.crewlet-data-grid__cell--wrap \{ white-space: normal; overflow-wrap: anywhere;/);
  });

  test('a head cut short carries its whole word on hover', () => {
    render(<DataGrid rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />);
    const word = screen.getAllByRole('columnheader')[1]!.querySelector<HTMLElement>('.crewlet-data-grid__truncate')!;
    box(word, 12, 44);
    fireEvent.mouseEnter(word);
    expect(word.getAttribute('title')).toBe('Tokens');
  });
});

describe('a head that sorts with no comparator (sortable)', () => {
  test('is a button that asks for the order and leaves the rows as the source sent them', () => {
    const onSortChange = vi.fn();
    render(
      <DataGrid
        rows={ROWS}
        columns={[
          { key: 'name', header: 'Name', sortable: true, cell: (r: Row) => r.name },
          {
            key: 'tokens',
            header: 'Tokens',
            sortable: false,
            sortValue: (r: Row) => r.tokens,
            cell: (r: Row) => r.tokens ?? null,
          },
        ]}
        rowKey={(r) => r.id}
        sort="-name"
        onSortChange={onSortChange}
        serverSorted
      />,
    );
    const head = screen.getAllByRole('columnheader')[0]!;
    expect(head.getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(within(head).getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('');
    expect(within(screen.getAllByRole('columnheader')[1]!).queryByRole('button')).toBeNull();
    expect(names()).toEqual(['Bravo', 'Alpha', 'Charlie']);
  });
});

describe("the foot is the table's own rows", () => {
  test('every child of the table is a row or a row group, the foot and the way back from a column set included', () => {
    render(
      <DataGrid
        rows={ROWS}
        columns={[...COLUMNS, { key: 'extra', header: 'Extra', optional: true, cell: () => 'x' }]}
        rowKey={(r) => r.id}
        cols="name,extra"
        onColsChange={() => {}}
        footer={
          <ul aria-label="Legend">
            <li>Done</li>
          </ul>
        }
        loadedNote="3 of 3 loaded"
      />,
    );
    const table = screen.getByRole('table');
    for (const child of table.children) expect(['row', 'rowgroup']).toContain(child.getAttribute('role'));
    const foot = table.querySelector('.crewlet-data-grid__foot')!;
    expect(foot.getAttribute('role')).toBe('row');
    const cell = foot.querySelector('[role="cell"]')!;
    expect(cell.getAttribute('aria-colspan')).toBe('2');
    expect(within(cell as HTMLElement).getByRole('list', { name: 'Legend' })).toBeTruthy();
    expect(foot.textContent).toBe('Done3 of 3 loaded');
    const reset = screen.getByRole('button', { name: 'Show every column' });
    expect(reset.closest('[role="row"]')!.closest('[role="rowgroup"]')).toBe(foot.parentElement);
  });
});

describe('a row that links still shows what its cells say on hover', () => {
  const under = (...els: Element[]) => {
    const all = (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => els });
    return () => Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: all });
  };

  test("the row link takes the whole words of a cut value under the pointer, and a cell's own title", () => {
    render(
      <DataGrid
        rows={[{ id: 'a', name: 'A name far too long for its column', tokens: 5 }]}
        columns={[
          { key: 'name', header: 'Name', overflow: 'truncate', cell: (r: Row) => r.name },
          {
            key: 'tokens',
            header: 'Tokens',
            title: () => '5 tokens in the last hour',
            cell: (r: Row) => r.tokens ?? null,
          },
        ]}
        rowKey={(r) => r.id}
        rowHref={(r) => `#/x/${r.id}`}
      />,
    );
    const row = records()[0]!;
    const link = row.querySelector<HTMLElement>('.crewlet-data-grid__row-link')!;
    const cut = row.querySelector<HTMLElement>('.crewlet-data-grid__truncate')!;
    Object.defineProperty(cut, 'clientWidth', { configurable: true, value: 80 });
    Object.defineProperty(cut, 'scrollWidth', { configurable: true, value: 240 });
    let restore = under(link, cut, cut.parentElement!, row);
    fireEvent.mouseMove(link, { clientX: 20, clientY: 10 });
    expect(link.getAttribute('title')).toBe('A name far too long for its column');
    restore();
    const tokens = row.children[1]!;
    restore = under(link, tokens, row);
    fireEvent.mouseMove(link, { clientX: 300, clientY: 10 });
    expect(link.getAttribute('title')).toBe('5 tokens in the last hour');
    restore();
    fireEvent.mouseLeave(link);
    expect(link.hasAttribute('title')).toBe(false);
  });
});
