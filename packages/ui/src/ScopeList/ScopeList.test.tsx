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

test('a search left behind when the list shrinks below searchFrom filters nothing', () => {
  const many: ScopeListOption[] = Array.from({ length: 9 }, (_, i) => ({ value: `a${i}`, label: `App ${i}` }));
  const { rerender } = render(<ScopeList label="Apps" options={many} value={[]} onChange={() => {}} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'App 8' } });
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  rerender(<ScopeList label="Apps" options={many.slice(0, 3)} value={[]} onChange={() => {}} />);
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
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

/** Analytics properties in two accounts, one name in both, and one property no account holds. */
const PROPERTIES: ScopeListOption[] = [
  { value: '301', label: 'Tally web', id: '301', group: 'Tally Labs' },
  { value: '900', label: 'Sandbox', id: '900' },
  { value: '402', label: 'Tally web', id: '402', group: 'Tally Retail' },
  { value: '302', label: 'Tally app', id: '302', group: 'Tally Labs' },
  { value: '403', label: 'Ledger app', id: '403', group: 'Tally Retail' },
  { value: '304', label: 'Ledger web', id: '304', group: 'Tally Labs' },
  { value: '405', label: 'Tally widgets', id: '405', group: 'Tally Retail' },
  { value: '306', label: 'Tally store', id: '306', group: 'Tally Labs' },
];

/** Each section's heading as drawn, in order: null for the ungrouped run. */
const headings = (fieldset: HTMLElement) =>
  [...fieldset.querySelectorAll<HTMLElement>(':scope > ul, :scope > [role="group"]')].map(
    (section) => section.querySelector('h1, h2, h3, h4, h5, h6')?.textContent ?? null,
  );

const names = (section: HTMLElement) =>
  within(section)
    .getAllByRole('checkbox')
    .map((b) => document.getElementById(b.getAttribute('aria-labelledby')!)!.textContent);

test('options that name a group are drawn under its heading, one section per group in first-appearance order, the ungrouped first', () => {
  render(<Harness options={PROPERTIES} initial={[]} />);
  const fieldset = screen.getByRole('group', { name: "Growth Marketer's apps" });
  expect(headings(fieldset)).toEqual([null, 'Tally Labs', 'Tally Retail']);
  const labs = within(fieldset).getByRole('group', { name: 'Tally Labs' });
  const retail = within(fieldset).getByRole('group', { name: 'Tally Retail' });
  // A HEADING ELEMENT names each section, at the level a heading takes where the list stands.
  expect(within(labs).getByRole('heading', { name: 'Tally Labs' }).tagName).toBe('H2');
  expect(names(labs)).toEqual(['Tally web', 'Tally app', 'Ledger web', 'Tally store']);
  expect(names(retail)).toEqual(['Tally web', 'Ledger app', 'Tally widgets']);
  // THE UNGROUPED ROW comes first, under no heading.
  const loose = fieldset.querySelector<HTMLElement>(':scope > ul')!;
  expect(names(loose)).toEqual(['Sandbox']);
  expect(loose.previousElementSibling?.matches('h1, h2, h3, h4, h5, h6')).toBe(false);
});

test('each box is described by its group too, so one name in two accounts is told apart', () => {
  render(<Harness options={PROPERTIES} initial={[]} />);
  const said = (box: HTMLElement) =>
    (box.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .join(' ');
  const [labs, retail] = screen.getAllByRole('checkbox', { name: 'Tally web' });
  expect(said(labs!)).toBe('301 Tally Labs');
  expect(said(retail!)).toBe('402 Tally Retail');
  // An ungrouped row names no group.
  expect(said(screen.getByRole('checkbox', { name: 'Sandbox' }))).toBe('900');
});

test('the search matches a group\'s name, draws no group it empties, and Choose all takes only the rows shown', () => {
  render(<Harness options={PROPERTIES} initial={[]} />);
  const find = screen.getByRole('searchbox', { name: 'Find by name or ID' });
  fireEvent.change(find, { target: { value: 'retail' } });
  const fieldset = screen.getByRole('group', { name: "Growth Marketer's apps" });
  expect(headings(fieldset)).toEqual(['Tally Retail']);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Choose all' }));
  expect(value()).toBe('402,403,405');
  // THE COUNT IS OVER EVERY OPTION, the control over what is shown.
  expect(screen.getByText('3 of 8 chosen')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
  // A search across groups keeps each group that still has a row, in its order.
  fireEvent.change(find, { target: { value: 'ledger' } });
  expect(headings(fieldset)).toEqual(['Tally Labs', 'Tally Retail']);
  expect(screen.queryByRole('checkbox', { name: 'Sandbox' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Choose all' }));
  expect(value()).toBe('402,403,405,304');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(value()).toBe('402,405');
});

test('a grouped list carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Properties</h1>
      <Harness options={PROPERTIES} initial={['301']} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
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
