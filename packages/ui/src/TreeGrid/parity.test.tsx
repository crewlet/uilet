/**
 * TreeGrid on DataGrid's terms: the same head (sort buttons, marks, edges,
 * plain and hidden heads), a sort that orders siblings and never crosses a
 * parent, the column set and the give-way columns with the foot that names
 * them, the row link, the failed edge, the empty state, the select box after
 * a drawn indent, and the card a row becomes where columns do not fit.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { TreeInput } from '../Tree/index.js';
import { TreeGrid, sortTreeLevels, type TreeGridColumn, type TreeGridProps } from './TreeGrid.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NODES: Record<string, { name: string; saved: number; size?: number }> = {
  root: { name: 'Handbook', saved: 5 },
  b: { name: 'Billing', saved: 3, size: 12 },
  a: { name: 'Access', saved: 9, size: 4 },
  'b/2': { name: 'Refunds', saved: 1 },
  'b/1': { name: 'Invoices', saved: 7 },
  c: { name: 'Calendar', saved: 2 },
};

const FOREST: TreeInput[] = [
  {
    id: 'root',
    label: 'Handbook',
    children: [
      {
        id: 'b',
        label: 'Billing',
        children: [
          { id: 'b/2', label: 'Refunds' },
          { id: 'b/1', label: 'Invoices' },
          { id: 'more:b', label: '' },
        ],
      },
      { id: 'a', label: 'Access' },
      { id: 'c', label: 'Calendar' },
      { id: 'more:root', label: '' },
    ],
  },
];

const COLUMNS: TreeGridColumn[] = [
  { key: 'title', header: 'Title', sortValue: (id) => NODES[id]?.name },
  { key: 'size', header: 'Size', align: 'right', shrink: true, sortValue: (id) => NODES[id]?.size },
  { key: 'saved', header: 'Last saved', align: 'right', sortValue: (id) => NODES[id]?.saved, drop: 1 },
  { key: 'edit', header: 'Edit', action: true, width: '3rem' },
];

const pinned = (id: string) => id.startsWith('more:');

function Grid(props: Partial<TreeGridProps> & { initialSort?: string }) {
  const { initialSort = '', ...rest } = props;
  const [sort, setSort] = useState(initialSort);
  return (
    <TreeGrid
      label="Pages"
      columns={COLUMNS}
      rows={FOREST}
      sort={sort}
      onSortChange={setSort}
      addRow={(id) => (pinned(id) ? { label: 'More pages', cells: 1 } : null)}
      renderCell={(id, column, grid) => {
        if (pinned(id)) return 'More';
        const key = grid.columnKey(column);
        const node = NODES[id]!;
        if (key === 'title') return node.name;
        if (key === 'size') return node.size ?? null;
        if (key === 'saved') return `${node.saved}d`;
        return <button type="button">Edit {node.name}</button>;
      }}
      {...rest}
    />
  );
}

/** The names of the rows drawn under `parent`, in order, its pinned rows as "+". */
const level = (parent: string) => {
  const depth = Number(document.querySelector(`[data-tree-id="${parent}"]`)!.getAttribute('aria-level')) + 1;
  const rows = [...document.querySelectorAll<HTMLElement>('[role="row"][data-tree-id]')];
  const from = rows.findIndex((row) => row.dataset.treeId === parent) + 1;
  const out: string[] = [];
  for (const row of rows.slice(from)) {
    const at = Number(row.getAttribute('aria-level'));
    if (at < depth) break;
    if (at === depth) out.push(pinned(row.dataset.treeId!) ? '+' : NODES[row.dataset.treeId!]!.name);
  }
  return out;
};

describe("the head is a data grid's head", () => {
  test("sortable heads are buttons, the edges are the column's, and an action head is read but not seen", () => {
    render(<Grid />);
    const heads = screen.getAllByRole('columnheader');
    expect(heads.map((h) => h.getAttribute('aria-colindex'))).toEqual(['1', '2', '3', '4']);
    expect(within(heads[0]!).getByRole('button', { name: 'Title' })).toBeTruthy();
    expect(heads[1]!.classList.contains('crewlet-data-grid__th--right')).toBe(true);
    expect(heads[1]!.classList.contains('crewlet-data-grid__th--shrink')).toBe(true);
    // The action column never sorts, and its word is for a screen reader only.
    expect(within(heads[3]!).queryByRole('button')).toBeNull();
    expect(heads[3]!.querySelector('.crewlet-data-grid__truncate')).toBeNull();
    expect(heads[3]!.textContent).toBe('Edit');
    // A value's cell takes its column's edge too.
    const cell = document.querySelector('[data-tree-id="b"] [aria-colindex="2"]')!;
    expect(cell.classList.contains('crewlet-tree-grid__cell--right')).toBe(true);
  });

  test("the tree's own order is the default, and no head is marked while it is in force", () => {
    render(<Grid />);
    for (const head of screen.getAllByRole('columnheader')) expect(head.hasAttribute('aria-sort')).toBe(false);
    expect(level('root')).toEqual(['Billing', 'Access', 'Calendar', '+']);
  });
});

describe('a sort orders siblings, never across parents', () => {
  test('each level is ordered among itself, its pinned rows last, and its position follows', () => {
    render(<Grid />);
    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(screen.getAllByRole('columnheader')[0]!.getAttribute('aria-sort')).toBe('ascending');
    expect(level('root')).toEqual(['Access', 'Billing', 'Calendar', '+']);
    expect(level('b')).toEqual(['Invoices', 'Refunds', '+']);
    const access = document.querySelector('[data-tree-id="a"]')!;
    expect(access.getAttribute('aria-posinset')).toBe('1');
    expect(access.getAttribute('aria-setsize')).toBe('4');
    // Descending, then back to the tree's own order.
    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(level('root')).toEqual(['Calendar', 'Billing', 'Access', '+']);
    expect(level('b')).toEqual(['Refunds', 'Invoices', '+']);
    fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(level('root')).toEqual(['Billing', 'Access', 'Calendar', '+']);
    expect(screen.getAllByRole('columnheader')[0]!.hasAttribute('aria-sort')).toBe(false);
  });

  test('an absent value sorts last both ways, and the keyboard walks the order drawn', () => {
    render(<Grid initialSort="-size" />);
    expect(level('root')).toEqual(['Billing', 'Access', 'Calendar', '+']);
    const billing = document.querySelector<HTMLElement>('[data-tree-id="b"]')!;
    act(() => billing.focus());
    // Billing is open: Down goes into it, in its own sorted order (no sizes: as given).
    fireEvent.keyDown(billing, { key: 'ArrowDown' });
    expect((document.activeElement as HTMLElement).dataset.treeId).toBe('b/2');
  });

  test('a server-sorted grid marks the head and reorders nothing', () => {
    render(<Grid initialSort="title" serverSorted />);
    expect(screen.getAllByRole('columnheader')[0]!.getAttribute('aria-sort')).toBe('ascending');
    expect(level('root')).toEqual(['Billing', 'Access', 'Calendar', '+']);
  });

  test('the levels are sorted by a pure function that never moves a row to another parent', () => {
    const sorted = sortTreeLevels(FOREST, (id) => NODES[id]?.saved, true, pinned);
    expect(sorted[0]!.children!.map((n) => n.id)).toEqual(['a', 'b', 'c', 'more:root']);
    expect(sorted[0]!.children![1]!.children!.map((n) => n.id)).toEqual(['b/1', 'b/2', 'more:b']);
    // The caller's forest is left as it was.
    expect(FOREST[0]!.children!.map((n) => n.id)).toEqual(['b', 'a', 'c', 'more:root']);
  });
});

describe('the column set, the give-way columns and the foot', () => {
  test('an optional column waits for the set to name it, and the set offers the way back', () => {
    const onColsChange = vi.fn();
    const columns = [...COLUMNS, { key: 'owner', header: 'Owner', optional: true }];
    const { rerender } = render(<Grid columns={columns} />);
    expect(screen.queryByRole('columnheader', { name: 'Owner' })).toBeNull();
    rerender(<Grid columns={columns} cols="title,owner" onColsChange={onColsChange} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Title', 'Owner']);
    fireEvent.click(screen.getByRole('button', { name: 'Show every column' }));
    expect(onColsChange).toHaveBeenCalledWith('');
  });

  test('a column that does not fit gives way in its order, and the foot names it', () => {
    // A 400px grid whose last head runs past its edge until the give-way column goes.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('role') === 'treegrid' ? 400 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const grid = this.closest('[role="treegrid"]');
      const heads = grid ? grid.querySelectorAll('[role="columnheader"]').length : 0;
      const right =
        this.getAttribute('role') === 'columnheader' && !this.nextElementSibling ? (heads > 3 ? 520 : 380) : 0;
      return {
        left: 0,
        top: 0,
        right,
        bottom: 0,
        width: this.classList.contains('crewlet-tree-grid') ? 400 : 0,
        height: 0,
      } as DOMRect;
    });
    render(<Grid footer="12 pages" loadedNote="12 of 12 loaded" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Title', 'Size', 'Edit']);
    const foot = document.querySelector('.crewlet-data-grid__foot')!;
    expect(foot.textContent).toBe('12 pagesHidden to fit: Last saved12 of 12 loaded');
    // A caption under the hierarchy, outside the treegrid, and still in its frame.
    expect(foot.closest('[role="treegrid"]')).toBeNull();
    expect(foot.closest('.crewlet-tree-grid__scroller')).not.toBeNull();
  });

  test('more rows to load are one press away', () => {
    const onLoadMore = vi.fn();
    render(<Grid onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

describe("a row's link, its failure and an empty grid", () => {
  test('a row that links carries a real href for the pointer, and Enter follows it where the caller does not', () => {
    const clicks: { href: string; meta: boolean }[] = [];
    const onRowKey = vi.fn((id: string) => id === 'c');
    render(<Grid rowHref={(id) => `#/pages/${id}`} onRowKey={onRowKey} />);
    const row = document.querySelector<HTMLElement>('[data-tree-id="a"]')!;
    const link = row.querySelector<HTMLAnchorElement>('a.crewlet-tree-grid__row-link')!;
    expect(link.getAttribute('href')).toBe('#/pages/a');
    expect(link.getAttribute('aria-hidden')).toBe('true');
    expect(link.tabIndex).toBe(-1);
    expect(row.hasAttribute('data-linked')).toBe(true);
    // No link on a pinned row.
    expect(document.querySelector('[data-tree-id="more:root"] a')).toBeNull();
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLAnchorElement;
      if (target.classList?.contains('crewlet-tree-grid__row-link')) {
        clicks.push({ href: target.getAttribute('href')!, meta: event.metaKey });
        event.preventDefault();
      }
    });
    act(() => row.focus());
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(clicks).toEqual([{ href: '#/pages/a', meta: false }]);
    fireEvent.keyDown(row, { key: 'Enter', metaKey: true });
    expect(clicks[1]).toEqual({ href: '#/pages/a', meta: true });
    // The caller's own Enter wins on a row it takes.
    const calendar = document.querySelector<HTMLElement>('[data-tree-id="c"]')!;
    act(() => calendar.focus());
    fireEvent.keyDown(calendar, { key: 'Enter' });
    expect(onRowKey).toHaveBeenCalledWith('c', 'activate');
    expect(clicks).toHaveLength(2);
  });

  test('a failed row is marked, and an empty grid says so with its next step', () => {
    const { rerender } = render(<Grid isFailed={(id) => id === 'c'} />);
    expect(document.querySelector('[data-tree-id="c"]')!.hasAttribute('data-failed')).toBe(true);
    expect(document.querySelector('[data-tree-id="a"]')!.hasAttribute('data-failed')).toBe(false);
    rerender(
      <Grid rows={[]} empty={{ title: 'Nothing is filed here yet', action: <button type="button">Create</button> }} />,
    );
    expect(screen.queryByRole('treegrid')).toBeNull();
    expect(screen.getByText('Nothing is filed here yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
  });

  test("flush draws the grid as a card's body", () => {
    const { container } = render(<Grid flush />);
    expect(container.querySelector('.crewlet-tree-grid')!.getAttribute('data-flush')).toBe('true');
  });
});

describe('the select box and a drawn indent', () => {
  test('the box follows the drawn indent, and its cell hands the tab stop to it', () => {
    const onCheckedChange = vi.fn();
    render(
      <Grid
        renderIndent={(id, grid) => <span className="wire" data-depth={grid.tree.depth.get(id)} />}
        selection={{
          checked: (id) => (pinned(id) ? null : id === 'a'),
          label: (id) => `Select ${NODES[id]?.name}`,
          onCheckedChange,
        }}
      />,
    );
    const cell = document.querySelector('[data-tree-id="b/1"] [aria-colindex="1"]')!;
    const order = [...cell.children].map((child) => child.className.split(' ')[0]);
    expect(order.slice(0, 3)).toEqual(['crewlet-tree-grid__toggle', 'wire', 'crewlet-tree-grid__select']);
    expect(cell.querySelector('.wire')!.getAttribute('data-depth')).toBe('2');
    const box = screen.getByRole('checkbox', { name: 'Select Access' }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    const row = document.querySelector<HTMLElement>('[data-tree-id="b"]')!;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: 'ArrowRight' });
    fireEvent.keyDown(row, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Select Billing' }));
  });
});

describe('where columns do not fit, a row is a card (phoneRows)', () => {
  const onAPhone = () =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('width <'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );

  test('only where asked: a tree that keeps its columns is never cards', () => {
    onAPhone();
    const { container } = render(<Grid />);
    expect(container.querySelector('.crewlet-tree-grid')!.hasAttribute('data-stacked')).toBe(false);
  });

  test("on a phone each value is a named line under the row's name", () => {
    onAPhone();
    const { container, rerender } = render(<Grid phoneRows="labelled" />);
    const frame = container.querySelector('.crewlet-tree-grid')!;
    expect(frame.hasAttribute('data-stacked')).toBe(true);
    const cells = document.querySelectorAll('[data-tree-id="b"] [role="gridcell"]');
    expect([...cells].map((cell) => cell.getAttribute('data-label'))).toEqual([null, 'Size', 'Last saved', null]);
    rerender(<Grid phoneRows="compact" />);
    expect(frame.getAttribute('data-phone-rows')).toBe('compact');
  });
});
