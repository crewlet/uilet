/**
 * The editable sheet, driven the way a person drives it: from the keyboard
 * first, then the pointer, the clipboard and the room around them.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

  test('a press on another cell saves the edit and leaves the reader on the cell they pressed', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 0).focus());
    key(focused(), 'Enter');
    const input = screen.getByRole('textbox', { name: 'Vendor, Acme Corp' });
    fireEvent.change(input, { target: { value: 'Acme Inc' } });
    fireEvent.mouseDown(cell(2, 1));
    act(() => cell(2, 1).focus());
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'vendor', value: 'Acme Inc' }]);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(focused()).toBe(cell(2, 1));
    expect(cell(2, 1).getAttribute('tabindex')).toBe('0');
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

  test('a short select opens its list with no filter box, the typed letter picks out a choice, and Clear is last', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(1, 3).focus());
    key(focused(), 'g');
    expect(screen.queryByRole('combobox')).toBeNull();
    const list = screen.getByRole('listbox', { name: 'Tier, Globex' });
    expect(focused()).toBe(list);
    const options = within(list).getAllByRole('option');
    expect(options.map(spoken)).toEqual(['Gold', 'Silver', 'Clear']);
    expect(list.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    key(list, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'globex', field: 'tier', value: 'gold' }]);
  });

  test('a list of more than eight choices offers a filter box that narrows it as the reader types', () => {
    const onEdits = vi.fn();
    const many: SheetColumn = {
      field: 'region',
      label: 'Region',
      type: 'select',
      options: ['North', 'South', 'East', 'West', 'Central', 'Coastal', 'Highland', 'Island', 'Gulf'].map((label) => ({ id: label.toLowerCase(), label })),
    };
    render(<Host columns={[columns[0]!, many]} start={[{ id: 'acme', values: { vendor: 'Acme Corp', region: null } }]} onEdits={onEdits} />);
    act(() => cell(0, 1).focus());
    key(focused(), 'g');
    const box = screen.getByRole('combobox', { name: 'Region, Acme Corp' }) as HTMLInputElement;
    expect(box.value).toBe('g');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map(spoken)).toEqual(['Highland', 'Gulf']);
    key(box, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'region', value: 'highland' }]);
  });

  test('a person cell offers the people the host resolved', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(2, 4).focus());
    key(focused(), 'Enter');
    const box = screen.getByRole('listbox', { name: 'Owner, Initech' });
    const options = within(box).getAllByRole('option').map(spoken);
    expect(options).toEqual(['Maya Ortiz', 'PM', 'Clear']);
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

describe('audit fixes', () => {
  test('a row offers its actions in its number gutter, and Delete row only asks the host (A05)', () => {
    const onDeleteRow = vi.fn();
    render(<Host onDeleteRow={onDeleteRow} />);
    act(() => cell(1, 1).focus());
    // Every drawn row carries its button, so a tap on the number reaches it where nothing hovers.
    const triggers = within(grid()).getAllByRole('button', { name: /^Actions for row \d+$/ });
    expect(triggers.map((trigger) => trigger.getAttribute('aria-label'))).toEqual(['Actions for row 1', 'Actions for row 2', 'Actions for row 3']);
    // Pointer only: the grid stays one tab stop, and the keys reach it through Shift+F10.
    for (const trigger of triggers) expect(trigger.getAttribute('tabindex')).toBe('-1');
    key(focused(), 'F10', { shiftKey: true });
    const item = screen.getByRole('menuitem', { name: 'Delete row' });
    expect(triggers[1]!.closest('[role="rowheader"]')!.className).toContain('crewlet-sheet-grid__rownum--open');
    expect(onDeleteRow).not.toHaveBeenCalled();
    fireEvent.click(item);
    expect(onDeleteRow).toHaveBeenCalledWith('globex');
  });

  test('the gutter is named by its row alone, and its button carries a tooltip of its own name', () => {
    render(<Host onDeleteRow={() => {}} />);
    const header = within(grid()).getAllByRole('rowheader')[0]!;
    const name = document.getElementById(header.getAttribute('aria-labelledby') ?? '');
    expect(name?.textContent).toBe('Acme Corp');
    const trigger = within(header).getByRole('button', { name: 'Actions for row 1' });
    // One tip: the native title would be a second one beside it.
    expect(trigger.getAttribute('title')).toBe('');
    act(() => trigger.focus());
    expect(screen.getByRole('tooltip').textContent).toBe('Actions for row 1');
  });

  test('a press on a row\'s actions button opens its menu, and its keys never move the active cell', () => {
    render(<Host onDeleteRow={() => {}} />);
    act(() => cell(0, 1).focus());
    const trigger = within(grid()).getByRole('button', { name: 'Actions for row 3' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Actions for row 3' })).toBeDefined();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Delete row' }), { key: 'Escape' });
    act(() => trigger.focus());
    key(trigger, 'ArrowDown');
    expect(screen.getByRole('menu', { name: 'Actions for row 3' })).toBeDefined();
    expect(cell(0, 1).getAttribute('tabindex')).toBe('0');
  });

  test('the number and the button share one centred place in the gutter, and the button shows only where it is wanted', () => {
    const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SheetGrid.css'), 'utf8');
    expect(sheet).toMatch(/\.crewlet-sheet-grid__rownum \{[^}]*display: grid;[^}]*place-items: center;[^}]*tabular-nums/);
    expect(sheet).toMatch(/\.crewlet-sheet-grid__rownum-number,\s*\.crewlet-sheet-grid__row-actions\s*\{\s*grid-area: gutter;/);
    expect(sheet).toMatch(/\.crewlet-sheet-grid__row-actions \{[^}]*opacity: 0;/);
    expect(sheet).toMatch(/__row:is\(:hover, :focus-within\) > \.crewlet-sheet-grid__rownum > \.crewlet-sheet-grid__row-actions,\s*\.crewlet-sheet-grid__rownum--open > \.crewlet-sheet-grid__row-actions\s*\{\s*opacity: 1;/);
    expect(sheet).toMatch(/__rownum--actions > \.crewlet-sheet-grid__rownum-number,\s*\.crewlet-sheet-grid__rownum--open > \.crewlet-sheet-grid__rownum-number\s*\{\s*visibility: hidden;/);
  });

  test('the selected rows mark their numbers, on an opaque ground a sticky gutter needs', () => {
    render(<Host onDeleteRow={() => {}} />);
    act(() => cell(0, 0).focus());
    key(cell(0, 0), 'ArrowDown', { shiftKey: true });
    const headers = within(grid()).getAllByRole('rowheader');
    expect(headers.map((header) => header.className.includes('crewlet-sheet-grid__rownum--selected'))).toEqual([true, true, false]);
    const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SheetGrid.css'), 'utf8');
    expect(sheet).toMatch(/__rownum--selected \{\s*background: linear-gradient\([^)]*\)[^;]*var\(--color-surface-background\);/);
    expect(sheet).toMatch(/__cell--selected \{\s*background: linear-gradient\([^)]*\)[^;]*var\(--color-surface-background\);/);
  });

  test('no row actions are drawn without a host that deletes, or on a read-only sheet', () => {
    const { rerender } = render(<Host />);
    act(() => cell(0, 1).focus());
    expect(screen.queryByRole('button', { name: /Actions for row/ })).toBeNull();
    expect(within(grid()).getAllByRole('rowheader')[0]!.className).not.toContain('crewlet-sheet-grid__rownum--actions');
    rerender(<Host mode="read" onDeleteRow={() => {}} />);
    expect(screen.queryByRole('button', { name: /Actions for row/ })).toBeNull();
  });

  test('a refusal arriving from the host is announced, and the strip holds it with Dismiss (A07)', () => {
    const onDismiss = vi.fn();
    const props = { label: 'Vendor scorecard', columns, people, onEdit: () => {}, onDismissRefused: onDismiss };
    const { rerender } = render(<SheetGrid {...props} rows={initial} sync={{ saving: 1 }} />);
    const refused = initial.map((row) => (row.id === 'acme' ? { ...row, refused: { score: 'It changed since it was read.' } } : row));
    rerender(<SheetGrid {...props} rows={refused} sync={{ saving: 0, refused: 1 }} />);
    expect(screen.getByRole('status').textContent).toBe('Not saved: It changed since it was read.');
    expect(screen.getByText('1 change not saved')).toBeDefined();
    expect(screen.queryByText('Saved')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('a text cell edits in an overlay that shows the whole value, and a pasted line break is a space (A08)', () => {
    const onEdits = vi.fn();
    render(<Host onEdits={onEdits} />);
    act(() => cell(0, 0).focus());
    key(focused(), 'Enter');
    const field = screen.getByRole('textbox', { name: 'Vendor, Acme Corp' }) as HTMLTextAreaElement;
    expect(field.tagName).toBe('TEXTAREA');
    expect(field.closest('.crewlet-sheet-editor__overlay')).not.toBeNull();
    expect(field.value).toBe('Acme Corp');
    fireEvent.change(field, { target: { value: 'Acme\nHoldings' } });
    expect(field.value).toBe('Acme Holdings');
    key(field, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'vendor', value: 'Acme Holdings' }]);
  });

  test('a long text cell takes Shift+Enter as a new line and saves on Enter', () => {
    const onEdits = vi.fn();
    const notes: SheetColumn = { field: 'notes', label: 'Notes', type: 'longtext' };
    render(<Host columns={[columns[0]!, notes]} start={[{ id: 'acme', values: { vendor: 'Acme Corp', notes: 'First' } }]} onEdits={onEdits} />);
    act(() => cell(0, 1).focus());
    key(focused(), 'Enter');
    const field = screen.getByRole('textbox', { name: 'Notes, Acme Corp' });
    expect(key(field, 'Enter', { shiftKey: true })).toBe(true);
    expect(onEdits).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: 'First\nSecond' } });
    key(field, 'Enter');
    expect(onEdits).toHaveBeenCalledWith([{ rowId: 'acme', field: 'notes', value: 'First\nSecond' }]);
  });

  test('an editor takes focus without scrolling the page (A60)', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(<Host />);
    act(() => cell(0, 0).focus());
    focus.mockClear();
    key(focused(), 'Enter');
    key(screen.getByRole('textbox'), 'Escape');
    act(() => cell(0, 3).focus());
    focus.mockClear();
    key(focused(), 'Enter');
    expect(focus.mock.calls.length).toBeGreaterThan(0);
    for (const call of focus.mock.calls) expect(call[0]).toEqual({ preventScroll: true });
    focus.mockRestore();
  });

  test('fit="content" is as tall as the rows, and never taller than the height given (A15)', () => {
    const { container, rerender } = render(<Host fit="content" />);
    const scroller = () => container.querySelector<HTMLElement>('.crewlet-sheet-grid__scroller')!;
    // The header, three rows and the scroller's two hairlines, at the 32px row.
    expect(scroller().style.height).toBe(`${32 + 3 * 32 + 2}px`);
    expect(container.firstElementChild?.className).toContain('crewlet-sheet-grid--fit-content');
    rerender(<Host fit="content" height={100} />);
    expect(scroller().style.height).toBe('100px');
  });

  test('fit="content" gives way in a bounded column, never below its floor or its rows', () => {
    const { container } = render(<Host fit="content" />);
    const scroller = container.querySelector<HTMLElement>('.crewlet-sheet-grid__scroller')!;
    expect(scroller.style.getPropertyValue('--crewlet-sheet-content-height')).toBe(`${32 + 3 * 32 + 2}px`);
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SheetGrid.css'), 'utf8');
    const rule = /\.crewlet-sheet-grid--fit-content > \.crewlet-sheet-grid__scroller\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/flex:\s*0 1 auto;/);
    expect(rule).toMatch(/min-height:\s*min\(var\(--crewlet-sheet-min-height, 0px\), var\(--crewlet-sheet-content-height, 0px\)\);/);
  });

  test('the last column takes the slack, so no empty strip sits beside it (A16)', () => {
    render(<Host />);
    const template = grid().style.getPropertyValue('--crewlet-sheet-columns');
    expect(template).toMatch(/minmax\(\d+px, 1fr\)$/);
    expect(template.match(/minmax/g)).toHaveLength(1);
  });

  test('rating marks take the ink and the control edge, never the warning hue (A61)', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SheetGrid.css'), 'utf8');
    const rule = (name: string) => new RegExp(`\\.crewlet-sheet-cell__${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    expect(rule('star')).toMatch(/color:\s*var\(--color-border-strong\)/);
    expect(rule('star--on')).toMatch(/color:\s*var\(--color-text-primary\)/);
    expect(css).not.toMatch(/__star--on\s*\{[^}]*warning/);
  });

  test('a multi-select cell draws its chips as one line that counts what does not fit (A64)', () => {
    const tags: SheetColumn = { field: 'tags', label: 'Tags', type: 'multiselect', options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] };
    render(<Host columns={[columns[0]!, tags]} start={[{ id: 'acme', values: { vendor: 'Acme Corp', tags: ['a', 'b'] } }]} />);
    const list = within(cell(0, 1)).getByRole('list', { name: 'Tags, 2' });
    expect(list.className).toContain('crewlet-tag-group--fit');
  });
});

describe('polish', () => {
  const css = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'SheetGrid.css'), 'utf8');

  test('a header sits on its column edge: numbers and ratings end, checkboxes centre', () => {
    render(<Host />);
    const headers = within(grid()).getAllByRole('columnheader');
    expect(headers[2]!.className).toContain('crewlet-sheet-grid__header--number');
    expect(headers[3]!.className).toContain('crewlet-sheet-grid__header--checkbox');
    const sheet = css();
    expect(sheet).toMatch(/\.crewlet-sheet-grid__header--number,\s*\.crewlet-sheet-grid__header--rating\s*\{\s*flex-direction:\s*row-reverse;/);
    expect(sheet).toMatch(/\.crewlet-sheet-grid__header--checkbox\s*\{\s*justify-content:\s*center;/);
  });

  test('a header carries its whole name, which a narrow column cuts short', () => {
    render(<SheetGrid label="Vendor scorecard" columns={columns} rows={initial} />);
    expect(within(grid()).getAllByRole('columnheader')[1]!.getAttribute('title')).toBe('Vendor');
  });

  test('the active cell reserves room for its history control, shown while the reader is in the grid', () => {
    render(<Host onShowHistory={() => {}} />);
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__cell--history');
    expect(cell(1, 0).className).not.toContain('crewlet-sheet-grid__cell--history');
    const sheet = css();
    expect(sheet).toMatch(/:focus-within \.crewlet-sheet-grid__cell--history,[^{]*\{\s*padding-inline-end:/);
    expect(sheet).toMatch(/:not\(:focus-within\)[^{]*__history\s*\{\s*visibility:\s*hidden;/);
    // A number keeps its edge: its control and its room are on the leading side.
    expect(sheet).toMatch(/__cell--rating\) > \.crewlet-sheet-grid__history\s*\{\s*inset-inline:\s*var\(--spacing-1\) auto;/);
  });

  test('a single selected cell is tinted only while the reader is in the grid; a range always is', () => {
    render(<Host />);
    expect(grid().className).not.toContain('crewlet-sheet-grid__grid--range');
    act(() => cell(0, 0).focus());
    key(cell(0, 0), 'ArrowDown', { shiftKey: true });
    expect(grid().className).toContain('crewlet-sheet-grid__grid--range');
    expect(css()).toMatch(/__grid:is\(:focus-within, \.crewlet-sheet-grid__grid--range\) \.crewlet-sheet-grid__cell--selected\s*\{/);
  });

  test('the last frozen column is the frozen edge, or the row numbers where nothing is frozen', () => {
    const { container, rerender } = render(<Host />);
    expect(cell(0, 0).className).toContain('crewlet-sheet-grid__frozen-edge');
    expect(cell(0, 1).className).not.toContain('crewlet-sheet-grid__frozen-edge');
    rerender(<Host columns={columns.map((column) => ({ ...column, frozen: false }))} />);
    expect(container.querySelector('.crewlet-sheet-grid__rownum')?.className).toContain('crewlet-sheet-grid__frozen-edge');
    const scroller = container.querySelector<HTMLElement>('.crewlet-sheet-grid__scroller')!;
    scroller.scrollLeft = 40;
    fireEvent.scroll(scroller);
    expect(scroller.className).toContain('crewlet-sheet-grid__scroller--across');
  });
});

describe('column widths', () => {
  test('a column is sized to its widest header or value as drawn, within its type bounds', () => {
    // jsdom lays nothing out: each measured part is as wide as 8px a character.
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const width = this.closest('.crewlet-sheet-grid__measure') ? (this.textContent ?? '').length * 8 : 0;
      return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    try {
      const wide: SheetColumn = { field: 'approved', label: 'Finance approved', type: 'checkbox' };
      const huge: SheetColumn = { field: 'tier', label: 'Approved by the finance lead and the board', type: 'checkbox' };
      render(<Host columns={[columns[0]!, columns[1]!, wide, huge, columns[4]!]} />);
      const tracks = grid().style.getPropertyValue('--crewlet-sheet-columns').match(/minmax\([^)]*\)|\S+/g)!;
      // Vendor: "Initech" and "Acme Corp" and the header, all under the text floor.
      expect(tracks[1]).toBe('120px');
      // The checkbox's long name widens it past its floor, to its measure.
      expect(tracks[3]).toBe(`${'Finance approved'.length * 8}px`);
      // And no further than its ceiling, however long the name.
      expect(tracks[4]).toBe('180px');
      const measurer = document.querySelector('.crewlet-sheet-grid__measure')!;
      expect(measurer.getAttribute('aria-hidden')).toBe('true');
      expect(measurer.hasAttribute('inert')).toBe(true);
    } finally {
      measure.mockRestore();
    }
  });

  test('the frozen columns hold at most a share of a narrow view, never below their floor', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('crewlet-sheet-grid__scroller') ? 360 : 0;
    });
    try {
      render(<Host />);
      const tracks = grid().style.getPropertyValue('--crewlet-sheet-columns').match(/minmax\([^)]*\)|\S+/g)!;
      // 60% of 360 less the 52px row numbers leaves the frozen Vendor 164px of its 200.
      expect(tracks[1]).toBe('164px');
    } finally {
      width.mockRestore();
    }
  });

  test('a declared width wins, and nothing measured keeps the type default', () => {
    render(<Host columns={[{ ...columns[0]!, width: 240 }, columns[1]!]} />);
    const tracks = grid().style.getPropertyValue('--crewlet-sheet-columns').match(/minmax\([^)]*\)|\S+/g)!;
    expect(tracks[1]).toBe('240px');
    expect(tracks[2]).toBe('minmax(112px, 1fr)');
  });
});

describe('accessibility', () => {
  test('carries no axe violation, at rest and while editing', async () => {
    const { container } = render(
      <main>
        <h1>Vendor scorecard</h1>
        <Host onAddRow={() => {}} onDeleteRow={() => {}} sync={{ saving: 1 }} presence={[{ rowId: 'acme', field: 'tier', id: 's', name: 'Jane', kind: 'human', hue: 'cyan' }]} />
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
    fireEvent.keyDown(focused(), { key: 'Escape' });
    act(() => cell(1, 0).focus());
    key(focused(), 'F10', { shiftKey: true });
    expect(screen.getByRole('menu', { name: 'Actions for row 2' })).toBeDefined();
    expect(await run()).toEqual([]);
  });
});
