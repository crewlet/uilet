/**
 * A cell on its own, as a field in a form: the same display and editors the
 * grid draws, with a control a keyboard reaches and a name that says the
 * column and the value.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { CheckboxCell, MultiSelectCell, NumberCell, PersonCell, RatingCell, SelectCell, StatusCell, TextCell, UrlCell, LongTextCell, DateCell } from './index.js';

afterEach(cleanup);

const options = [
  { id: 'gold', label: 'Gold', color: 'amber' },
  { id: 'silver', label: 'Silver' },
];

test('a checkbox cell is a real checkbox the reader toggles', () => {
  const onChange = vi.fn();
  render(<CheckboxCell label="Approved" value={false} onChange={onChange} />);
  const box = screen.getByRole('checkbox', { name: 'Approved' });
  expect(box.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(box);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('a text cell names its column and value, opens its editor in place, and Enter saves', () => {
  const onChange = vi.fn();
  render(<TextCell label="Vendor" value="Acme" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Vendor: Acme' }));
  const input = screen.getByRole('textbox', { name: 'Vendor' });
  fireEvent.change(input, { target: { value: 'Acme Corp' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenCalledWith('Acme Corp');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Vendor: Acme' }));
});

test('a number cell refuses what is not a number and saves nothing until it fits', () => {
  const onChange = vi.fn();
  render(<NumberCell label="Score" value={6.8} onChange={onChange} column={{ max: 10 }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Score: 6.8' }));
  const input = screen.getByRole('textbox', { name: 'Score' });
  fireEvent.change(input, { target: { value: '12' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByText('Score must be at most 10.')).toBeDefined();
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '9' } });
  fireEvent.keyDown(input, { key: 'Tab' });
  expect(onChange).toHaveBeenCalledWith(9);
});

test('leaving the editor saves what was typed, as a spreadsheet does', () => {
  const onChange = vi.fn();
  render(
    <>
      <TextCell label="Vendor" value="Acme" onChange={onChange} />
      <button type="button">Elsewhere</button>
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Vendor: Acme' }));
  const input = screen.getByRole('textbox', { name: 'Vendor' });
  fireEvent.change(input, { target: { value: 'Initech' } });
  act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
  expect(onChange).toHaveBeenCalledWith('Initech');
});

test('a select cell picks from a filtered list, and a multi-select keeps several', () => {
  const onSelect = vi.fn();
  const onMany = vi.fn();
  render(
    <>
      <SelectCell label="Tier" value="silver" options={options} onChange={onSelect} />
      <MultiSelectCell label="Labels" value={[]} options={options} onChange={onMany} />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tier: Silver' }));
  const box = screen.getByRole('combobox', { name: 'Tier' });
  fireEvent.change(box, { target: { value: 'go' } });
  fireEvent.keyDown(box, { key: 'Enter' });
  expect(onSelect).toHaveBeenCalledWith('gold');

  fireEvent.click(screen.getByRole('button', { name: 'Labels: Empty' }));
  const many = screen.getByRole('combobox', { name: 'Labels' });
  const list = screen.getByRole('listbox', { name: 'Labels' });
  expect(list.getAttribute('aria-multiselectable')).toBe('true');
  fireEvent.keyDown(many, { key: 'Enter' });
  fireEvent.keyDown(many, { key: 'ArrowDown' });
  fireEvent.keyDown(many, { key: 'Enter' });
  expect(within(list).getAllByRole('option').map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'true']);
  fireEvent.keyDown(many, { key: 'Enter', ctrlKey: true });
  expect(onMany).toHaveBeenCalledWith(['gold', 'silver']);
});

test('the other cells draw their value and say it', () => {
  render(
    <>
      <PersonCell label="Owner" value="seat:pm" people={[{ id: 'seat:pm', name: 'PM', kind: 'agent', hue: 'rose' }]} />
      <StatusCell label="Status" value="ok" options={[{ id: 'ok', label: 'Approved', category: 'done' }]} />
      <RatingCell label="Priority" value={3} />
      <UrlCell label="Preview" value="https://acme.example" />
      <LongTextCell label="Notes" value={'First line\nSecond line'} />
      <DateCell label="Due" value="2026-10-17" locale="en-US" />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Owner: PM' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Status: Approved' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Priority: 3 of 5 stars' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Preview: https://acme.example' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Due: Oct 17, 2026' })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Notes: First line/ }).getAttribute('aria-disabled')).toBe('true');
});

test('a pending cell says Saving and a refused one says why', () => {
  render(
    <>
      <TextCell label="Vendor" value="Acme" onChange={() => {}} pending />
      <TextCell label="Owner" value="Maya" onChange={() => {}} refused="You can view this sheet but not edit it." />
    </>,
  );
  const pending = screen.getByRole('button', { name: 'Vendor: Acme' });
  expect(document.getElementById(pending.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Saving');
  expect(screen.getByText('You can view this sheet but not edit it.')).toBeDefined();
});

test('carries no axe violation, at rest and editing', async () => {
  const { container } = render(
    <main>
      <TextCell label="Vendor" value="Acme" onChange={() => {}} />
      <CheckboxCell label="Approved" value onChange={() => {}} />
      <SelectCell label="Tier" value="gold" options={options} onChange={() => {}} />
    </main>,
  );
  const run = async () =>
    (
      await axe.run(container, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
        resultTypes: ['violations'],
      })
    ).violations.map((violation) => violation.id);
  expect(await run()).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Tier: Gold' }));
  expect(await run()).toEqual([]);
});
