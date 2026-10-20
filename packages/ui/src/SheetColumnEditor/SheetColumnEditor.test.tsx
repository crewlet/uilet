/**
 * A column's settings, driven as a person shapes a column: renaming it,
 * picking its type, listing its choices, and taking a suggestion.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import type { SheetColumn } from '../SheetModel/index.js';
import { SheetColumnEditor, type SheetColumnEditorProps } from './index.js';

afterEach(cleanup);

/** A host that keeps the column the editor hands it, and reports each one. */
function Host({ start, onColumn, ...rest }: { start: SheetColumn; onColumn?: (column: SheetColumn) => void } & Partial<SheetColumnEditorProps>) {
  const [column, setColumn] = useState(start);
  return (
    <SheetColumnEditor
      column={column}
      onChange={(next) => {
        onColumn?.(next);
        setColumn(next);
      }}
      {...rest}
    />
  );
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const pickType = (label: RegExp) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
  fireEvent.mouseDown(screen.getByRole('option', { name: label }));
};

test('a rename is handed on as it is typed, and an emptied name is held and then restored', () => {
  const onColumn = vi.fn();
  render(<Host start={{ field: 'name', label: 'Name', type: 'text' }} onColumn={onColumn} />);
  fireEvent.change(name(), { target: { value: 'Vendor' } });
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ label: 'Vendor' }));
  onColumn.mockClear();
  fireEvent.change(name(), { target: { value: '  ' } });
  expect(onColumn).not.toHaveBeenCalled();
  expect(screen.getByText('Give the column a name.')).toBeTruthy();
  fireEvent.blur(name());
  expect((name() as HTMLInputElement).value).toBe('Vendor');
});

test('Enter in the name and Done both close; selectName starts on the name, selected', () => {
  const onDone = vi.fn();
  render(<Host start={{ field: 'a', label: 'Owner', type: 'person' }} onDone={onDone} selectName />);
  expect(document.activeElement).toBe(name());
  fireEvent.keyDown(name(), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(onDone).toHaveBeenCalledTimes(2);
});

test('a choice column lists its choices: each added takes the next unused hue, and a repeat is refused', () => {
  const onColumn = vi.fn();
  render(<Host start={{ field: 'tier', label: 'Tier', type: 'text' }} onColumn={onColumn} />);
  pickType(/^Select/);
  expect(screen.getByText('Add at least one choice.')).toBeTruthy();
  const add = screen.getByRole('textbox', { name: 'Add a choice' });
  fireEvent.change(add, { target: { value: 'Gold' } });
  fireEvent.keyDown(add, { key: 'Enter' });
  fireEvent.change(add, { target: { value: 'Silver' } });
  fireEvent.keyDown(add, { key: 'Enter' });
  expect(onColumn).toHaveBeenLastCalledWith(
    expect.objectContaining({
      type: 'select',
      options: [
        { id: 'gold', label: 'Gold', color: 'purple' },
        { id: 'silver', label: 'Silver', color: 'cyan' },
      ],
    }),
  );
  fireEvent.change(add, { target: { value: 'gold' } });
  fireEvent.keyDown(add, { key: 'Enter' });
  expect(screen.getByText('There is already a choice called “gold”.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Gold' }));
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ options: [{ id: 'silver', label: 'Silver', color: 'cyan' }] }));
});

test('a choice is renamed in place and keeps its id, and its colour is picked from the hue menu', () => {
  const onColumn = vi.fn();
  render(<Host start={{ field: 't', label: 'Tier', type: 'select', options: [{ id: 'gold', label: 'Gold', color: 'amber' }] }} onColumn={onColumn} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Choice 1' }), { target: { value: 'Golden' } });
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ options: [{ id: 'gold', label: 'Golden', color: 'amber' }] }));
  fireEvent.click(screen.getByRole('button', { name: 'Color of Golden' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: 'Rose' }));
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ options: [{ id: 'gold', label: 'Golden', color: 'rose' }] }));
});

test('a new status column starts with a choice per category, and a choice moves between categories', () => {
  const onColumn = vi.fn();
  render(<Host start={{ field: 's', label: 'Status', type: 'text' }} onColumn={onColumn} />);
  pickType(/^Status/);
  expect(onColumn).toHaveBeenLastCalledWith(
    expect.objectContaining({
      options: [
        { id: 'not_started', label: 'Not started', category: 'todo' },
        { id: 'in_progress', label: 'In progress', category: 'in_progress' },
        { id: 'done', label: 'Done', category: 'done' },
      ],
    }),
  );
  fireEvent.click(screen.getByRole('combobox', { name: 'Category of Done' }));
  fireEvent.mouseDown(screen.getByRole('option', { name: 'Blocked' }));
  expect(onColumn.mock.lastCall?.[0].options[2]).toEqual({ id: 'done', label: 'Done', category: 'blocked' });
  expect(screen.queryByRole('button', { name: /^Color of/ })).toBeNull();
});

test('a suggestion is one press, and a locked type says why and offers none', () => {
  const onColumn = vi.fn();
  const { unmount } = render(<Host start={{ field: 'due', label: 'Due date', type: 'text' }} suggestedType="date" onColumn={onColumn} />);
  expect(screen.getByText('Looks like date')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Use Date' }));
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'date' }));
  expect(screen.queryByRole('button', { name: 'Use Date' })).toBeNull();
  unmount();
  render(<Host start={{ field: 'name', label: 'Name', type: 'text' }} suggestedType="date" typeLockedReason="Every row is named by this column, so it stays text." />);
  expect(screen.getByText('Every row is named by this column, so it stays text.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Use Date' })).toBeNull();
});

test('a rating column picks its stars; a checkbox offers no Required', () => {
  const onColumn = vi.fn();
  render(<Host start={{ field: 'r', label: 'Confidence', type: 'text' }} onColumn={onColumn} />);
  pickType(/^Rating/);
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'rating', max: 5 }));
  fireEvent.click(screen.getByRole('combobox', { name: 'Stars' }));
  fireEvent.mouseDown(screen.getByRole('option', { name: '10' }));
  expect(onColumn).toHaveBeenLastCalledWith(expect.objectContaining({ max: 10 }));
  pickType(/^Checkbox/);
  expect(screen.queryByRole('checkbox', { name: /Required/ })).toBeNull();
});

test('a new type drops the old type\'s settings and keeps the name, width and Required', () => {
  const onColumn = vi.fn();
  render(
    <Host
      start={{ field: 'p', label: 'Price', type: 'number', width: 120, required: true, precision: 2, numberStyle: 'currency', currency: 'EUR' }}
      onColumn={onColumn}
    />,
  );
  pickType(/^Text/);
  expect(onColumn).toHaveBeenLastCalledWith({ field: 'p', label: 'Price', type: 'text', width: 120, required: true });
});

test('move and delete reach the host, and a refused delete says why', () => {
  const onMove = vi.fn();
  const onDelete = vi.fn();
  render(<Host start={{ field: 'a', label: 'A', type: 'text' }} onMove={onMove} canMoveBefore={false} onDelete={onDelete} deleteDisabledReason="A sheet keeps at least one column." />);
  fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
  expect(onMove).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
  expect(onMove).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Delete column/ }));
  expect(onDelete).not.toHaveBeenCalled();
});

test('passes axe with every part drawn', async () => {
  const { container } = render(
    <Host
      start={{ field: 's', label: 'Status', type: 'status', options: [{ id: 'todo', label: 'To do', category: 'todo' }] }}
      onMove={() => {}}
      onDelete={() => {}}
      onDone={() => {}}
      suggestedType="select"
    />,
  );
  await act(async () => {});
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)).toEqual([]);
  expect(within(container).getAllByRole('listitem')).toHaveLength(1);
});
