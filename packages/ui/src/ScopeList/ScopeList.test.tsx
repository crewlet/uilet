/**
 * The things an agent may reach: a named group of checkboxes, the name first
 * and the IDs quiet, a chosen row marked, a count, Choose all or Clear over
 * what is shown, and a search on a long list.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { ScopeList, type ScopeListOption } from './index.js';

afterEach(cleanup);

const APPS: ScopeListOption[] = [
  { value: '6450012345', label: 'Tally', detail: 'com.tallybird.tally', id: '6450012345' },
  { value: '6450098765', label: 'Tally Widgets', detail: 'com.tallybird.widgets', id: '6450098765' },
];

function Harness({ options = APPS, initial = ['6450012345'] }: { options?: ScopeListOption[]; initial?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <ScopeList label="Growth Marketer's apps" options={options} value={value} onChange={setValue} />
      <output data-testid="value">{value.join(',')}</output>
    </>
  );
}

const value = () => screen.getByTestId('value').textContent;

test('is a group named by its label, a checkbox per option named by its name', () => {
  render(<Harness />);
  const group = screen.getByRole('group', { name: "Growth Marketer's apps" });
  const boxes = within(group).getAllByRole('checkbox') as HTMLInputElement[];
  expect(boxes.map((b) => b.checked)).toEqual([true, false]);
  expect(within(group).getByRole('checkbox', { name: 'Tally' })).toBeTruthy();
});

test('describes each box by its detail and its ID, which tell two apps of one name apart', () => {
  render(<Harness />);
  const box = screen.getByRole('checkbox', { name: 'Tally Widgets' });
  const said = (box.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' ');
  expect(said).toContain('com.tallybird.widgets');
  expect(said).toContain('6450098765');
});

test('marks a chosen row and counts what is chosen', () => {
  render(<Harness />);
  const rows = screen.getAllByRole('listitem');
  expect(rows.map((r) => r.hasAttribute('data-chosen'))).toEqual([true, false]);
  expect(screen.getByText('1 of 2 chosen')).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tally Widgets' }));
  expect(value()).toBe('6450012345,6450098765');
  expect(screen.getByText('2 of 2 chosen')).toBeTruthy();
});

test('Choose all chooses every row, then Clear clears them', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose all' }));
  expect(value()).toBe('6450012345,6450098765');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(value()).toBe('');
});

test('a long list is searched by name, detail or ID, and Choose all takes only the rows shown', () => {
  const many: ScopeListOption[] = Array.from({ length: 9 }, (_, i) => ({
    value: `64500${i}`,
    label: i === 4 ? 'Ledger' : `App ${i}`,
    detail: `com.example.app${i}`,
    id: `64500${i}`,
  }));
  render(<Harness options={many} initial={[]} />);
  const find = screen.getByRole('searchbox', { name: 'Find by name or ID' });
  fireEvent.change(find, { target: { value: 'ledger' } });
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Choose all' }));
  expect(value()).toBe('645004');
  fireEvent.change(find, { target: { value: 'com.example.app7' } });
  expect(screen.getByRole('checkbox', { name: 'App 7' })).toBeTruthy();
  fireEvent.change(find, { target: { value: 'nothing here' } });
  expect(screen.getByText('Nothing matches “nothing here”.')).toBeTruthy();
});

test('a short list has no search', () => {
  render(<Harness />);
  expect(screen.queryByRole('searchbox')).toBeNull();
});

test('an option that cannot be chosen says why and is left out of Choose all', () => {
  render(
    <Harness
      initial={[]}
      options={[APPS[0]!, { ...APPS[1]!, disabled: true, disabledReason: 'Not in the connected team.' }]}
    />,
  );
  const box = screen.getByRole('checkbox', { name: 'Tally Widgets' }) as HTMLInputElement;
  expect(box.disabled).toBe(true);
  expect(screen.getByText('Not in the connected team.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Choose all' }));
  expect(value()).toBe('6450012345');
  expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
});

test('says so where there is nothing to choose from', () => {
  render(<Harness options={[]} initial={[]} />);
  expect(screen.getByText('Nothing to choose from.')).toBeTruthy();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Apps</h1>
      <Harness />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
