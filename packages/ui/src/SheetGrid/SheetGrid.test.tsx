/**
 * The editable sheet, driven the way a person drives it: from the keyboard
 * first, then the pointer, the clipboard and the room around them.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { SheetCellPresence, SheetColumn, SheetEdit, SheetRow, SheetSort } from '../SheetModel/index.js';
import { SheetGrid, type SheetGridProps } from './index.js';

afterEach(cleanup);

const columns: SheetColumn[] = [
  { field: 'vendor', label: 'Vendor', type: 'text', frozen: true, required: true },
  { field: 'score', label: 'Score', type: 'number', min: 0, max: 10 },
  { field: 'approved', label: 'Approved', type: 'checkbox' },
  {
    field: 'tier',
    label: 'Tier',
    type: 'select',
    options: [
      { id: 'gold', label: 'Gold', color: 'amber' },
      { id: 'silver', label: 'Silver' },
    ],
  },
  { field: 'owner', label: 'Owner', type: 'person' },
  {
    field: 'status',
    label: 'Status',
    type: 'status',
    options: [
      { id: 'review', label: 'Review', category: 'in_progress' },
      { id: 'done', label: 'Done', category: 'done' },
    ],
  },
];

const people = [
  { id: 'seat:maya', name: 'Maya Ortiz', kind: 'human' as const },
  { id: 'seat:pm', name: 'PM', kind: 'agent' as const, hue: 'rose' as const },
];

const initial: SheetRow[] = [
  { id: 'acme', values: { vendor: 'Acme Corp', score: 7.2, approved: true, tier: 'gold', owner: 'seat:maya', status: 'review' } },
  { id: 'globex', values: { vendor: 'Globex', score: 6.8, approved: false, tier: 'silver', owner: 'seat:pm', status: 'done' } },
  { id: 'initech', values: { vendor: 'Initech', score: 9.1, approved: true, tier: 'gold', owner: null, status: null } },
];

/** A host that writes every edit at once, marked pending until `confirm`. */
function Host(props: Partial<SheetGridProps> & { onEdits?: (edits: readonly SheetEdit[]) => void; start?: SheetRow[] }) {
  const { onEdits, start = initial, ...rest } = props;
  const [rows, setRows] = useState(start);
  const [sort, setSort] = useState<SheetSort | null>(null);
  return (
    <SheetGrid
      label="Vendor scorecard"
      columns={columns}
      rows={rows}
      people={people}
      sort={sort}
      onSortChange={setSort}
      onEdit={(edits) => {
        onEdits?.(edits);
        setRows((before) =>
          before.map((row) => {
            const mine = edits.filter((edit) => edit.rowId === row.id);
            if (mine.length === 0) return row;
            const values = { ...row.values };
            for (const edit of mine) values[edit.field] = edit.value;
            return { ...row, values, pending: [...(row.pending ?? []), ...mine.map((edit) => edit.field)] };
          }),
        );
      }}
      {...rest}
    />
  );
}

const grid = () => screen.getByRole('grid', { name: 'Vendor scorecard' });
const cell = (row: number, col: number) => {
  const rows = within(grid()).getAllByRole('row');
  const target = rows.find((element) => element.getAttribute('aria-rowindex') === String(row + 2));
  if (!target) throw new Error(`row ${row} is not drawn`);
  return within(target).getAllByRole('gridcell')[col]!;
};
const focused = () => document.activeElement as HTMLElement;
/** What a screen reader reads of an element: its text without the parts hidden from assistive technology. */
const spoken = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return (copy.textContent ?? '').trim();
};
const key = (target: Element, name: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(target, { key: name, ...init });
const description = () => document.getElementById(focused().getAttribute('aria-describedby') ?? '')?.textContent ?? '';

describe('structure', () => {
  test('is an ARIA grid with its row and column counts, one tab stop, and the frozen column first', () => {
    render(<Host />);
    expect(grid().getAttribute('aria-rowcount')).toBe('4');
    expect(grid().getAttribute('aria-colcount')).toBe('7');
    const stops = grid().querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    expect(within(grid()).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Row',
      'Vendor, Text',
      'Score, Number',
      'Approved, Checkbox',
      'Tier, Select',
      'Owner, Person',
      'Status, Status',
    ]);
  });

  test('draws every type: the words a reader sees are the words a screen reader reads', () => {
    render(<Host />);
    expect(spoken(cell(0, 0))).toBe('Acme Corp');
    expect(spoken(cell(0, 1))).toBe('7.2');
    expect(spoken(cell(0, 2))).toBe('Checked');
    expect(spoken(cell(1, 2))).toBe('Not checked');
    expect(spoken(cell(0, 3))).toBe('Gold');
    expect(spoken(cell(1, 4))).toBe('PM');
    expect(spoken(cell(1, 5))).toBe('Done');
    expect(spoken(cell(2, 4))).toBe('Empty');
  });

  test('ten thousand rows draw only the rows in view', () => {
    const many: SheetRow[] = Array.from({ length: 10_000 }, (_, index) => ({ id: `r${index}`, values: { vendor: `Vendor ${index}`, score: index % 10 } }));
    render(<Host start={many} />);
    expect(grid().getAttribute('aria-rowcount')).toBe('10001');
    const drawn = within(grid()).getAllByRole('row').length - 1;
    expect(drawn).toBeGreaterThan(10);
    expect(drawn).toBeLessThan(80);
  });
});

describe('the keyboard', () => {
  test('arrows move the one tab stop and focus follows, and the header is reachable', () => {
    render(<Host />);
    act(() => cell(0, 0).focus());
    key(focused(), 'ArrowRight');
    expect(focused()).toBe(cell(0, 1));
    key(focused(), 'ArrowDown');
    expect(focused()).toBe(cell(1, 1));
    key(focused(), 'ArrowUp');
    key(focused(), 'ArrowUp');
    expect(focused().getAttribute('role')).toBe('columnheader');
    expect(grid().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  test('Tab moves across and leaves the grid at the row edge rather than wrapping', () => {
    render(<Host />);
    act(() => cell(0, 4).focus());
    key(focused(), 'Tab');
    expect(focused()).toBe(cell(0, 5));
    const atEdge = fireEvent.keyDown(focused(), { key: 'Tab' });
    expect(atEdge).toBe(true);
  });

  test('typing on a cell starts an edit with that character, and Enter writes it and moves down', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 1).focus());
    key(focused(), '8');
    const input = screen.getByRole('textbox', { name: 'Score, Acme Corp' }) as HTMLInputElement;
    expect(input.value).toBe('8');
    fireEvent.change(input, { target: { value: '8.5' } });
    key(input, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'score', value: 8.5 }]);
    expect(focused()).toBe(cell(1, 1));
  });

  test('a value that does not fit is refused on the cell, with the reason, and the editor stays open', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 1).focus());
    key(focused(), 'Enter');
    const input = screen.getByRole('textbox', { name: 'Score, Acme Corp' });
    fireEvent.change(input, { target: { value: 'eleven' } });
    key(input, 'Enter');
    expect(onEdits).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Score must be a number.')).toBeDefined();
    key(input, 'Escape');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(focused()).toBe(cell(0, 1));
  });

  test('Escape cancels an edit and writes nothing', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(1, 0).focus());
    key(focused(), 'F2');
    const input = screen.getByRole('textbox', { name: 'Vendor, Globex' });
    fireEvent.change(input, { target: { value: 'Changed' } });
    key(input, 'Escape');
    expect(onEdits).not.toHaveBeenCalled();
    expect(cell(1, 0).textContent).toBe('Globex');
  });

  test('Space toggles a checkbox, and the toggle is drawn at once as pending (D23)', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(1, 2).focus());
    key(focused(), ' ');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'globex', field: 'approved', value: true }]);
    expect(cell(1, 2).textContent).toBe('Checked');
    expect(cell(1, 2).className).toContain('crewlet-sheet-grid__cell--pending');
    expect(description()).toContain('Saving.');
  });

  test('a select opens its list, filters as the reader types, and Enter picks', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(1, 3).focus());
    key(focused(), 'g');
    const box = screen.getByRole('combobox', { name: 'Tier, Globex' }) as HTMLInputElement;
    expect(box.value).toBe('g');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Gold']);
    key(box, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'globex', field: 'tier', value: 'gold' }]);
  });

  test('a person cell offers the people the host resolved', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(2, 4).focus());
    key(focused(), 'Enter');
    const box = screen.getByRole('combobox', { name: 'Owner, Initech' });
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map(spoken);
    expect(options).toEqual(['Clear', 'Maya Ortiz', 'PM']);
    key(box, 'ArrowDown');
    key(box, 'ArrowDown');
    key(box, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'initech', field: 'owner', value: 'seat:pm' }]);
  });

  test('Delete clears the range, and a required cell is refused with the reason rather than cleared', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 0).focus());
    key(focused(), 'ArrowRight', { shiftKey: true });
    key(focused(), 'Delete');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'score', value: null }]);
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--refused');
    expect(screen.getByRole('status').textContent).toBe('Vendor is required.');
  });

  test('undo, redo and the cell history shortcut reach the host', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onShowHistory = vi.fn();
    render(<Host onUndo={onUndo} onRedo={onRedo} onShowHistory={onShowHistory} />);
    act(() => cell(1, 1).focus());
    key(focused(), 'z', { ctrlKey: true });
    key(focused(), 'z', { metaKey: true, shiftKey: true });
    key(focused(), 'h', { ctrlKey: true, altKey: true });
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onShowHistory).toHaveBeenCalledWith({ rowId: 'globex', field: 'score' });
  });

  test('Enter on a header sorts, and the active cell stays on its row as the rows reorder', () => {
    render(<Host />);
    act(() => cell(0, 1).focus());
    expect(focused().textContent).toBe('7.2');
    key(focused(), 'ArrowUp');
    key(focused(), 'Enter');
    const header = within(grid()).getAllByRole('columnheader')[2]!;
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    expect(cell(0, 0).textContent).toBe('Globex');
    key(focused(), 'Enter');
    expect(header.getAttribute('aria-sort')).toBe('descending');
    expect(cell(0, 0).textContent).toBe('Initech');
  });
});

describe('read only', () => {
  test('a read-only sheet takes no edit and says why', () => {
    render(<SheetGrid label="Vendor scorecard" columns={columns} rows={initial} people={people} mode="read" />);
    expect(grid().getAttribute('aria-readonly')).toBe('true');
    act(() => cell(0, 1).focus());
    key(focused(), 'Enter');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('You can view this sheet but not edit it.');
  });

  test('a read-only column refuses an edit with its own reason', () => {
    render(<Host columns={columns.map((column) => (column.field === 'score' ? { ...column, readOnly: true } : column))} />);
    act(() => cell(0, 1).focus());
    key(focused(), '5');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Score is read only.');
  });
});

describe('host states', () => {
  test('a refusal from the host is said on the cell and in its description', () => {
    const rows = initial.map((row) => (row.id === 'acme' ? { ...row, refused: { score: 'You can view this sheet but not edit it.' } } : row));
    render(<SheetGrid label="Vendor scorecard" columns={columns} rows={rows} people={people} onEdit={() => {}} />);
    act(() => cell(0, 1).focus());
    expect(cell(0, 1).className).toContain('crewlet-sheet-grid__cell--refused');
    expect(description()).toContain('You can view this sheet but not edit it.');
    expect(cell(0, 1).textContent).toContain('You can view this sheet but not edit it.');
  });

  test('a remote write under the editor keeps it open and names the writer; Keep yours keeps the draft', () => {
    const onEdit = vi.fn();
    const { rerender } = render(<SheetGrid label="Vendor scorecard" columns={columns} rows={initial} people={people} onEdit={onEdit} />);
    act(() => cell(0, 1).focus());
    key(focused(), '9');
    const moved = initial.map((row) =>
      row.id === 'acme' ? { ...row, values: { ...row.values, score: 6.8 }, changed: { score: { by: 'Maya', at: '2026-10-17T10:42:00Z' } } } : row,
    );
    rerender(<SheetGrid label="Vendor scorecard" columns={columns} rows={moved} people={people} onEdit={onEdit} />);
    expect(screen.getByRole('alert').textContent).toContain('Maya changed this to 6.8 while you were editing.');
    fireEvent.click(screen.getByRole('button', { name: 'Keep yours' }));
    expect(screen.queryByRole('alert')).toBeNull();
    key(screen.getByRole('textbox'), 'Enter');
    expect(onEdit).toHaveBeenCalledWith([{ rowId: 'acme', field: 'score', value: 9 }]);
  });

  test("Use theirs drops the draft and keeps the remote value", () => {
    const onEdit = vi.fn();
    const { rerender } = render(<SheetGrid label="Vendor scorecard" columns={columns} rows={initial} people={people} onEdit={onEdit} />);
    act(() => cell(0, 1).focus());
    key(focused(), '9');
    const moved = initial.map((row) => (row.id === 'acme' ? { ...row, values: { ...row.values, score: 6.8 } } : row));
    rerender(<SheetGrid label="Vendor scorecard" columns={columns} rows={moved} people={people} onEdit={onEdit} />);
    expect(screen.getByRole('alert').textContent).toContain('Someone changed this to 6.8');
    fireEvent.click(screen.getByRole('button', { name: "Use Someone's" }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
    expect(cell(0, 1).textContent).toBe('6.8');
  });

  test('a change mark is drawn and its words describe the focused cell', () => {
    const rows = initial.map((row) => (row.id === 'globex' ? { ...row, changed: { score: { by: 'Maya Ortiz', at: '2026-10-17T10:42:00Z', previous: 6.2 } } } : row));
    render(<SheetGrid label="Vendor scorecard" columns={columns} rows={rows} people={people} />);
    expect(cell(1, 1).querySelector('.crewlet-change-mark')).not.toBeNull();
    act(() => cell(1, 1).focus());
    expect(description()).toMatch(/Changed by Maya Ortiz, .+\. Was 6\.2\./);
  });

  test('the sync strip says where the writes stand, and offers Retry after a failure', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<Host sync={{ saving: 2 }} />);
    expect(screen.getByText('Saving 2 changes')).toBeDefined();
    rerender(<Host sync={{ saving: 3, offline: true }} />);
    expect(screen.getByText('Offline. 3 changes will sync when you reconnect.')).toBeDefined();
    rerender(<Host sync={{ saving: 0, failed: 1 }} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('presence', () => {
  const presence: SheetCellPresence[] = [
    { rowId: 'globex', field: 'score', id: 's1', name: 'Jane', kind: 'human', hue: 'cyan' },
    { rowId: 'globex', field: 'score', id: 's2', name: 'PM', kind: 'agent', hue: 'rose', editing: true },
  ];

  test('a cell somebody is on wears their ring and a flag with every name, decorative to assistive technology', () => {
    render(<Host presence={presence} />);
    const target = cell(1, 1);
    expect(target.className).toContain('crewlet-presence-ring');
    expect(target.className).toContain('crewlet-presence-hue--rose');
    const flag = target.querySelector('.crewlet-cursor-flag')!;
    expect(flag.getAttribute('aria-hidden')).toBe('true');
    expect(flag.textContent).toBe('PM, Jane');
    act(() => target.focus());
    expect(description()).toContain('PM and Jane are also here.');
  });

  test('reports the reader own active and editing cell, for the host presence frames', () => {
    const onActiveCellChange = vi.fn();
    const onEditingChange = vi.fn();
    render(<Host onActiveCellChange={onActiveCellChange} onEditingChange={onEditingChange} />);
    act(() => cell(0, 0).focus());
    key(focused(), 'ArrowDown');
    expect(onActiveCellChange).toHaveBeenLastCalledWith({ rowId: 'globex', field: 'vendor' });
    key(focused(), 'Enter');
    expect(onEditingChange).toHaveBeenLastCalledWith({ rowId: 'globex', field: 'vendor' });
    key(screen.getByRole('textbox'), 'Escape');
    expect(onEditingChange).toHaveBeenLastCalledWith(null);
  });
});

describe('the clipboard', () => {
  function clip(type: 'copy' | 'paste' | 'cut', target: Element, text = '') {
    const store = new Map<string, string>([['text/plain', text]]);
    const clipboardData = { getData: (kind: string) => store.get(kind) ?? '', setData: (kind: string, value: string) => store.set(kind, value) };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    act(() => {
      target.dispatchEvent(event);
    });
    return store.get('text/plain');
  }

  test('copies the range as TSV', () => {
    render(<Host />);
    act(() => cell(0, 0).focus());
    key(focused(), 'ArrowDown', { shiftKey: true });
    key(focused(), 'ArrowRight', { shiftKey: true });
    expect(clip('copy', focused())).toBe('Acme Corp\t7.2\nGlobex\t6.8');
  });

  test('pastes a block at the active cell and refuses the fields that do not fit', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 1).focus());
    clip('paste', focused(), '5\tyes\nnot a number\tno');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'score', value: 5 }]);
    expect(cell(1, 1).className).toContain('crewlet-sheet-grid__cell--refused');
    expect(screen.getByRole('status').textContent).toBe('Score must be a number.');
  });
});

describe('accessibility', () => {
  test('carries no axe violation, at rest and while editing', async () => {
    const { container } = render(
      <main>
        <h1>Vendor scorecard</h1>
        <Host onAddRow={() => {}} sync={{ saving: 1 }} presence={[{ rowId: 'acme', field: 'tier', id: 's', name: 'Jane', kind: 'human', hue: 'cyan' }]} />
      </main>,
    );
    const run = async () =>
      (
        await axe.run(container, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          rules: { 'color-contrast': { enabled: false } },
          resultTypes: ['violations'],
        })
      ).violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
    expect(await run()).toEqual([]);
    act(() => cell(0, 3).focus());
    key(focused(), 'Enter');
    expect(await run()).toEqual([]);
  });
});
