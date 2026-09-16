/**
 * The chips, and the editor each one opens.
 *
 * The editor is the place a reader spends the most time in this pattern, and
 * it is a LISTBOX rather than a stack of buttons: one tab stop, the arrows, the
 * ends, type-ahead, and a highlight a screen reader is told about. Those five
 * are what a reader used to get free from the platform's own dropdown, and
 * every one of them is a case here.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { FilterAxisBar } from './FilterAxisBar.js';
import type { FilterDef, FilterValues } from './filters.js';

afterEach(cleanup);

const ROLE: FilterDef = {
  name: 'role',
  label: 'Role',
  kind: 'select',
  multiple: true,
  options: [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'retired', label: 'Retired', disabled: true },
    { value: 'viewer', label: 'Viewer' },
  ],
};

const STATUS: FilterDef = {
  name: 'status',
  label: 'Status',
  kind: 'select',
  options: [
    { value: 'all', label: 'Any status' },
    { value: 'live', label: 'Live' },
    { value: 'paused', label: 'Paused' },
  ],
};

const EMAIL: FilterDef = { name: 'email', label: 'Email' };

function Bar({
  filters = [ROLE],
  names,
  initial = {},
  ...rest
}: {
  filters?: FilterDef[];
  names?: string[];
  initial?: FilterValues;
  onRemove?: (def: FilterDef) => void;
  autoOpenName?: string | null;
}) {
  const [values, setValues] = useState<FilterValues>(initial);
  return (
    <>
      <FilterAxisBar
        filters={filters}
        values={values}
        names={names ?? filters.map((def) => def.name)}
        onValuesChange={setValues}
        {...rest}
      />
      <pre data-testid="values">{JSON.stringify(values)}</pre>
    </>
  );
}

const held = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as FilterValues;
const chip = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const list = (name: string) => screen.getByRole('listbox', { name });
const highlighted = (name: string): string | null => {
  const id = list(name).getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? null) : null;
};

test('an axis with no value yet still reads as one, and says it narrows nothing', () => {
  render(<Bar />);
  expect(chip('Role').textContent).toContain('any');
});

test('the editor is one tab stop whose arrows move a highlight, and it steps over a disabled answer', () => {
  render(<Bar />);
  fireEvent.click(chip('Role'));
  const box = list('Role options');
  expect(box.getAttribute('tabindex')).toBe('0');
  expect(box.getAttribute('aria-multiselectable')).toBe('true');
  expect(highlighted('Role options')).toBe('Owner');

  fireEvent.keyDown(box, { key: 'ArrowDown' });
  expect(highlighted('Role options')).toBe('Admin');
  // Retired is disabled, so the arrow passes over it.
  fireEvent.keyDown(box, { key: 'ArrowDown' });
  expect(highlighted('Role options')).toBe('Viewer');
  fireEvent.keyDown(box, { key: 'End' });
  expect(highlighted('Role options')).toBe('Viewer');
  fireEvent.keyDown(box, { key: 'Home' });
  expect(highlighted('Role options')).toBe('Owner');
});

test('type-ahead reaches an answer by its own name', () => {
  render(<Bar />);
  fireEvent.click(chip('Role'));
  const box = list('Role options');
  fireEvent.keyDown(box, { key: 'v' });
  expect(highlighted('Role options')).toBe('Viewer');
});

test('several answers stay open as they are ticked, and Done closes the list', () => {
  render(<Bar />);
  fireEvent.click(chip('Role'));
  const box = list('Role options');
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(held().role).toEqual(['owner']);
  // Still open: a reader ticking three answers reopens the list twice without
  // this, and the chip says how many are on.
  expect(screen.queryByRole('listbox', { name: 'Role options' })).not.toBe(null);

  fireEvent.keyDown(list('Role options'), { key: 'ArrowDown' });
  fireEvent.keyDown(list('Role options'), { key: 'Enter' });
  expect(held().role).toEqual(['owner', 'admin']);
  expect(chip('Role').textContent).toContain('2 selected');

  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('listbox', { name: 'Role options' })).toBe(null);
});

test('one answer commits and closes, and the chip reads the answer rather than its value', () => {
  render(<Bar filters={[STATUS]} initial={{ status: 'all' }} />);
  fireEvent.click(chip('Status'));
  const box = list('Status options');
  expect(highlighted('Status options')).toBe('Any status');
  fireEvent.keyDown(box, { key: 'ArrowDown' });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(held().status).toBe('live');
  expect(screen.queryByRole('listbox', { name: 'Status options' })).toBe(null);
  expect(chip('Status').textContent).toContain('Live');
});

test('Escape closes the editor and gives focus back to the chip', () => {
  render(<Bar />);
  fireEvent.click(chip('Role'));
  fireEvent.keyDown(list('Role options'), { key: 'Escape' });
  expect(screen.queryByRole('listbox', { name: 'Role options' })).toBe(null);
  expect(document.activeElement).toBe(chip('Role'));
});

test('a text axis commits on Enter, and the chip carries what was typed', () => {
  render(<Bar filters={[EMAIL]} />);
  fireEvent.click(chip('Email'));
  const box = screen.getByRole('textbox', { name: 'Email filter' });
  expect(document.activeElement).toBe(box);
  fireEvent.change(box, { target: { value: 'ada@example.com' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(held().email).toBe('ada@example.com');
  expect(chip('Email').textContent).toContain('ada@example.com');
});

test('a chip that just arrived opens its own editor, once', () => {
  const consumed = vi.fn();
  render(<Bar autoOpenName="role" {...{ onAutoOpenConsumed: consumed }} />);
  expect(screen.queryByRole('listbox', { name: 'Role options' })).not.toBe(null);
  expect(consumed).toHaveBeenCalledTimes(1);
});

test('removing an axis is a control of its own, named after the axis', () => {
  const removed = vi.fn();
  render(<Bar onRemove={removed} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove the Role filter' }));
  expect(removed).toHaveBeenCalledTimes(1);
  expect(removed.mock.calls[0]?.[0]).toMatchObject({ name: 'role' });
});

test('an unusual operator is said out loud, and the usual one is not', () => {
  const since: FilterDef = { name: 'at', label: 'Created', kind: 'datetime' };
  const until: FilterDef = { ...since, operator: 'on-or-before' };
  const values = { at: '2026-03-02T00:00:00' };
  render(<Bar filters={[since]} initial={values} />);
  expect(chip('Created').textContent).not.toContain('on or after');
  cleanup();

  render(<Bar filters={[until]} initial={values} />);
  expect(chip('Created').textContent).toContain('on or before');
});

test('a moment axis opens straight onto the calendar, not onto a control that opens one', () => {
  const at: FilterDef = { name: 'at', label: 'Created', kind: 'datetime' };
  render(<Bar filters={[at]} initial={{ at: '2026-03-10T09:30:00' }} />);
  fireEvent.click(chip('Created'));

  /*
   * The editor IS the editor, the same rule the option list keeps. A picker
   * drawn as its own trigger inside this popover was a control that opened a
   * control: two presses and two stacked panels for one date.
   */
  expect(screen.getByRole('grid', { name: 'March 2026' })).toBeTruthy();
  fireEvent.click(screen.getByRole('gridcell', { name: 'Friday 20 March 2026' }));
  expect(held().at).toBe('2026-03-20T09:30:00');

  // Done is what says the reader is finished with the chip.
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('grid', { name: /2026/ })).toBe(null);
});

test('the row is not drawn at all while no axis is on', () => {
  const { container } = render(<Bar names={[]} />);
  expect(within(container).queryByRole('button')).toBe(null);
});
