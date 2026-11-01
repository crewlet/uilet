/**
 * Keys and their values as rows under one head: every field named on its
 * own, an error that moves nothing beside it, focus that never falls to the
 * page, and every edit handed back with the other rows untouched.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { KeyValueRows, keyValueRowsLabels, type KeyValueRow, type KeyValueRowsProps } from './index.js';

afterEach(cleanup);

const HEADERS: KeyValueRow[] = [
  { id: 'a', key: 'Authorization', value: 'Bearer abc' },
  { id: 'b', key: 'X-Team', value: 'platform' },
];

function Headers({ initial = HEADERS, ...rest }: { initial?: KeyValueRow[] } & Partial<KeyValueRowsProps>) {
  const [rows, setRows] = useState(initial);
  return (
    <>
      <Announcer />
      <KeyValueRows label="Headers" keyLabel="Header" value={rows} onChange={setRows} {...rest} />
      <pre data-testid="value">{JSON.stringify(rows)}</pre>
    </>
  );
}

const current = () => JSON.parse(screen.getByTestId('value').textContent ?? '[]') as KeyValueRow[];

test('the rows are a group named by the list, and every field is named on its own', () => {
  render(<Headers />);
  const group = screen.getByRole('group', { name: 'Headers' });
  expect(within(group).getByRole('textbox', { name: 'Header 1' })).toHaveProperty('value', 'Authorization');
  expect(within(group).getByRole('textbox', { name: 'Value for Authorization' })).toHaveProperty('value', 'Bearer abc');
  expect(within(group).getByRole('textbox', { name: 'Header 2' })).toHaveProperty('value', 'X-Team');
  expect(within(group).getByRole('button', { name: 'Remove X-Team' })).toBeTruthy();
  expect(within(group).getByRole('button', { name: 'Add header' })).toBeTruthy();
});

test('the column head is drawn once and not read, since every field reads its own name', () => {
  const { container } = render(<Headers />);
  const heads = container.querySelectorAll('.crewlet-key-value-rows__head');
  expect(heads).toHaveLength(1);
  expect(heads[0]!.getAttribute('aria-hidden')).toBe('true');
  expect(heads[0]!.textContent).toBe('HeaderValue');
});

test('a row with no key yet is named by its place', () => {
  render(<Headers initial={[{ id: 'n', key: '  ', value: '' }]} />);
  expect(screen.getByRole('textbox', { name: 'Value for header 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove header 1' })).toBeTruthy();
});

test('an edit hands back the list with that row changed and every other row as it was', () => {
  const onChange = vi.fn();
  render(<KeyValueRows label="Headers" keyLabel="Header" value={HEADERS} onChange={onChange} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Value for X-Team' }), { target: { value: 'data' } });
  const [next] = onChange.mock.calls[0]! as [KeyValueRow[]];
  expect(next).toEqual([HEADERS[0], { id: 'b', key: 'X-Team', value: 'data' }]);
  expect(next[0]).toBe(HEADERS[0]);
});

test('Add appends a blank row and puts the focus in its key', () => {
  render(<Headers />);
  fireEvent.click(screen.getByRole('button', { name: 'Add header' }));
  const rows = current();
  expect(rows).toHaveLength(3);
  expect(rows[2]).toMatchObject({ key: '', value: '' });
  expect(new Set(rows.map((row) => row.id)).size).toBe(3);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Header 3' }));
});

test('a caller’s rows keep their own fields, and a blank row is the caller’s to make', () => {
  interface Stored extends KeyValueRow {
    stored: boolean;
  }
  const onChange = vi.fn();
  const rows: Stored[] = [{ id: 's', key: 'Authorization', value: '', stored: true }];
  render(
    <KeyValueRows<Stored>
      label="Headers"
      keyLabel="Header"
      value={rows}
      onChange={onChange}
      createRow={() => ({ id: 'new', key: '', value: '', stored: false })}
      keyReadOnly={(row) => row.stored}
      valuePlaceholder={(row) => (row.stored ? 'Stored. Type to replace it' : 'Sealed when you save')}
    />,
  );
  const key = screen.getByRole('textbox', { name: 'Header 1' });
  expect(key).toHaveProperty('readOnly', true);
  expect(screen.getByPlaceholderText('Stored. Type to replace it')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Add header' }));
  expect(onChange).toHaveBeenLastCalledWith([rows[0], { id: 'new', key: '', value: '', stored: false }]);
});

test('Remove moves the focus to the row that took its place, else the one before, else Add, and says what went', () => {
  render(<Headers initial={[...HEADERS, { id: 'c', key: 'X-Trace', value: '1' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove X-Team' }));
  expect(current().map((row) => row.id)).toEqual(['a', 'c']);
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Header 2' }));
  expect(screen.getByRole('status').textContent).toBe('Removed X-Team');

  fireEvent.click(screen.getByRole('button', { name: 'Remove X-Trace' }));
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Header 1' }));

  fireEvent.click(screen.getByRole('button', { name: 'Remove Authorization' }));
  expect(current()).toEqual([]);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add header' }));
});

test('a list that refuses the change keeps the focus where it was', () => {
  render(<KeyValueRows label="Headers" keyLabel="Header" value={HEADERS} onChange={() => {}} />);
  const add = screen.getByRole('button', { name: 'Add header' });
  add.focus();
  fireEvent.click(add);
  expect(document.activeElement).toBe(add);
});

test('a refused key is said under it and linked to it, and its value and remove button stay on their line', () => {
  const remove = installSheets('Input/Input.css', 'KeyValueRows/KeyValueRows.css');
  try {
    render(
      <Headers
        initial={[...HEADERS, { id: 'c', key: 'X-Team', value: 'data' }]}
        keyError={(row, index) => (row.key === 'X-Team' && index === 2 ? 'Another row already sets X-Team.' : null)}
      />,
    );
    const key = screen.getByRole('textbox', { name: 'Header 3' });
    expect(key.getAttribute('aria-invalid')).toBe('true');
    const error = screen.getByRole('alert');
    expect(error.textContent).toBe('Another row already sets X-Team.');
    expect(key.getAttribute('aria-describedby')).toContain(error.id);
    expect(screen.getByRole('textbox', { name: 'Header 2' }).getAttribute('aria-invalid')).toBeNull();
    // Each row stands on its fields' top edge, so the error grows the key's cell downward only.
    const row = key.closest('.crewlet-key-value-rows__row')!;
    expect(getComputedStyle(row).display).toBe('grid');
    expect(getComputedStyle(row).alignItems).toBe('start');
  } finally {
    remove();
  }
});

test('a refused value is said under the value', () => {
  render(<Headers valueError={(row) => (row.key === 'Authorization' ? 'A bearer token has no spaces.' : null)} />);
  const value = screen.getByRole('textbox', { name: 'Value for Authorization' });
  expect(value.getAttribute('aria-invalid')).toBe('true');
  expect(value.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
});

test('the remove button is a square the fields’ height, and the head stands a label’s distance over the first row', () => {
  const remove = installSheets('IconButton/IconButton.css', 'Input/Input.css', 'KeyValueRows/KeyValueRows.css');
  try {
    const { container } = render(<Headers />);
    const button = screen.getByRole('button', { name: 'Remove Authorization' });
    const field = screen.getByRole('textbox', { name: 'Header 1' }).closest('.crewlet-input')!;
    expect(px(button, 'height')).toBe(px(field, 'min-height'));
    expect(px(button, 'width')).toBe(px(button, 'height'));
    const row = container.querySelector('.crewlet-key-value-rows__row')!;
    expect(getComputedStyle(row).gridTemplateColumns.endsWith(`${px(button, 'width')}px`)).toBe(true);
    const head = container.querySelector('.crewlet-key-value-rows__head')!;
    // The rows' gap less one small step: the head is 4px over the first row, as a label is over its field.
    expect(px(head, 'margin-block-end')).toBe(4 - 8);
  } finally {
    remove();
  }
});

test('secret values hide what is typed and are never offered a saved password; keys are never spell-checked', () => {
  render(<Headers secret />);
  const value = screen.getByLabelText('Value for Authorization');
  expect(value.getAttribute('type')).toBe('password');
  expect(value.getAttribute('autocomplete')).toBe('new-password');
  const key = screen.getByRole('textbox', { name: 'Header 1' });
  expect(key.getAttribute('spellcheck')).toBe('false');
  expect(key.getAttribute('autocomplete')).toBe('off');
});

test('an empty list says what the caller gives it, under its legend, with Add still there', () => {
  const { container, rerender } = render(
    <KeyValueRows label="Environment variables" keyLabel="Variable" value={[]} onChange={() => {}} />,
  );
  // Nothing to say by default: the legend and Add are the whole list.
  expect(container.querySelector('.crewlet-key-value-rows__empty')).toBeNull();
  expect(container.querySelector('.crewlet-key-value-rows__head')).toBeNull();
  rerender(
    <KeyValueRows
      label="Environment variables"
      keyLabel="Variable"
      value={[]}
      onChange={() => {}}
      empty="The process starts with only the variables its command line sets."
    />,
  );
  const group = screen.getByRole('group', { name: 'Environment variables' });
  expect(within(group).getByText('The process starts with only the variables its command line sets.')).toBeTruthy();
  expect(within(group).getByRole('button', { name: 'Add variable' })).toBeTruthy();
});

test('every word is the caller’s to change, and the English defaults are made from the column names', () => {
  expect(keyValueRowsLabels('Variable', 'Set to').value('', 3)).toBe('Set to for variable 3');
  render(
    <KeyValueRows
      label="Kopfzeilen"
      keyLabel="Kopfzeile"
      valueLabel="Wert"
      value={HEADERS.slice(0, 1)}
      onChange={() => {}}
      labels={{
        key: (n) => `Kopfzeile ${n}`,
        value: (key) => `Wert von ${key}`,
        remove: (key) => `${key} entfernen`,
        add: 'Kopfzeile hinzufügen',
      }}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Kopfzeile 1' })).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Wert von Authorization' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Authorization entfernen' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Kopfzeile hinzufügen' })).toBeTruthy();
});

test('disabled, nothing in the list can be changed', () => {
  render(<Headers disabled />);
  for (const field of screen.getAllByRole('textbox')) expect(field).toHaveProperty('disabled', true);
  for (const button of screen.getAllByRole('button')) expect(button).toHaveProperty('disabled', true);
});

test('a list with rows, an error and an empty one carry no violation', async () => {
  const { container } = render(
    <>
      <Headers keyError={(row) => (row.key === 'X-Team' ? 'Not a header name.' : null)} secret />
      <KeyValueRows label="Variables" keyLabel="Variable" value={[]} onChange={() => {}} empty="None yet." hideLabel />
    </>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
