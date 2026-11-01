/**
 * Who gets something: a group's grant reaches its members, a member is left
 * out or chosen on its own, a partly chosen group says "mixed", and the count
 * follows the choice.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { MemberPicker, type MemberPickerGroup, type MemberPickerValue } from './index.js';

afterEach(cleanup);

const GROUPS: MemberPickerGroup[] = [
  {
    key: 'product',
    label: 'Product',
    members: [
      { key: 'pm', name: 'PM', detail: 'Plans the work' },
      { key: 'dev', name: 'Developer', detail: 'Builds it' },
    ],
  },
  { key: 'ops', label: 'Operations', members: [{ key: 'sre', name: 'SRE' }] },
];

function Harness({ initial, open }: { initial: MemberPickerValue; open?: string[] }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MemberPicker label="Who gets it" groups={GROUPS} value={value} onChange={setValue} defaultOpen={open ?? ['product', 'ops']} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;
const value = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as MemberPickerValue;

test('a chosen group reaches its members, each marked as reached through it', () => {
  render(<Harness initial={{ groups: ['product'], members: [], except: [] }} />);
  expect(box('PM').checked).toBe(true);
  expect(box('Developer').checked).toBe(true);
  expect(screen.getAllByText('Through Product')).toHaveLength(2);
  expect(screen.getByText('Includes agents who join later')).toBeTruthy();
  expect(screen.getByText('2 of 3 agents')).toBeTruthy();
});

test('unticking a reached member leaves it out of the group, and the group reads as mixed', () => {
  render(<Harness initial={{ groups: ['product'], members: [], except: [] }} />);
  fireEvent.click(box('Developer'));
  expect(value()).toEqual({ groups: ['product'], members: [], except: ['dev'] });
  expect(box('Product').indeterminate).toBe(true);
  expect(screen.getByText('Left out')).toBeTruthy();
  expect(screen.getByText('1 of 3 agents')).toBeTruthy();
});

test('choosing a mixed group whole clears its overrides', () => {
  render(<Harness initial={{ groups: ['product'], members: [], except: ['dev'] }} />);
  fireEvent.click(box('Product'));
  expect(value()).toEqual({ groups: ['product'], members: [], except: [] });
});

test('a member of an unchosen group is chosen on its own, and unchoosing a group drops its own picks', () => {
  render(<Harness initial={{ groups: [], members: [], except: [] }} />);
  fireEvent.click(box('SRE'));
  expect(value().members).toEqual(['sre']);
  fireEvent.click(box('PM'));
  expect(box('Product').indeterminate).toBe(true);
  fireEvent.click(box('Product'));
  fireEvent.click(box('Product'));
  expect(value()).toEqual({ groups: [], members: ['sre'], except: [] });
});

test('a chosen group with every member left out still reads as mixed, since it reaches whoever joins', () => {
  render(<Harness initial={{ groups: ['product'], members: [], except: ['pm', 'dev'] }} />);
  expect(box('Product').checked).toBe(false);
  expect(box('Product').indeterminate).toBe(true);
  expect(screen.getByText('Includes agents who join later')).toBeTruthy();
  fireEvent.click(box('Product'));
  expect(value()).toEqual({ groups: ['product'], members: [], except: [] });
});

test('a group whose members are all chosen on their own is mixed, not chosen: its grant would reach a newcomer', () => {
  render(<Harness initial={{ groups: [], members: ['pm', 'dev'], except: [] }} />);
  expect(box('Product').checked).toBe(false);
  expect(box('Product').indeterminate).toBe(true);
  expect(screen.queryByText('Includes agents who join later')).toBeNull();
  fireEvent.click(box('Product'));
  expect(value()).toEqual({ groups: ['product'], members: [], except: [] });
  expect(box('Product').checked).toBe(true);
  expect(box('Product').indeterminate).toBe(false);
});

test('a group opens and closes on the kit\'s icon button, which says whether it is open and what it opens', () => {
  render(<Harness initial={{ groups: [], members: [], except: [] }} open={[]} />);
  const toggle = screen.getByRole('button', { name: 'Show the agents in Product' });
  expect(toggle.classList.contains('crewlet-icon-btn')).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.getAttribute('aria-controls')).toBeNull();
  expect(screen.queryByRole('checkbox', { name: 'PM' })).toBeNull();
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.contains(box('PM'))).toBe(true);
});

test('a member is described by its line and by how it is reached, with ids that hold no key', () => {
  const groups: MemberPickerGroup[] = [
    { key: 'product team', label: 'Product', members: [{ key: 'product manager', name: 'PM', detail: 'Plans the work' }] },
  ];
  render(
    <MemberPicker
      label="Who gets it"
      groups={groups}
      value={{ groups: ['product team'], members: [], except: [] }}
      onChange={() => {}}
      defaultOpen={['product team']}
    />,
  );
  const ids = (box('PM').getAttribute('aria-describedby') ?? '').split(' ');
  expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(['Plans the work', 'Through Product']);
  const toggle = screen.getByRole('button', { name: 'Show the agents in Product' });
  expect(toggle.getAttribute('aria-controls')).not.toMatch(/product/);
});

test('members in no group follow the groups, each chosen on its own, and the words are the caller\'s', () => {
  function People() {
    const [picked, setPicked] = useState<MemberPickerValue>({ groups: [], members: [], except: [] });
    return (
      <MemberPicker
        label="Who can review"
        groups={GROUPS}
        ungrouped={[{ key: 'ada', name: 'Ada' }]}
        value={picked}
        onChange={setPicked}
        labels={{ summary: (chosen, total) => `${chosen} of ${total} people` }}
      />
    );
  }
  render(<People />);
  expect(screen.getByText('0 of 4 people')).toBeTruthy();
  fireEvent.click(box('Ada'));
  expect(screen.getByText('1 of 4 people')).toBeTruthy();
});

test('sets a list\'s type: 13px names and one compact box for a group and its members alike', () => {
  const { container } = render(<Harness initial={{ groups: ['product'], members: [], except: [] }} />);
  const boxes = [...container.querySelectorAll('.crewlet-checkbox')];
  expect(boxes.length).toBeGreaterThan(1);
  for (const box of boxes) expect(box.classList.contains('crewlet-checkbox--sm')).toBe(true);
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'MemberPicker.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const part of ['summary', 'name']) {
    expect(new RegExp(`\\.crewlet-member-picker__${part} \\{[^}]*font-size: var\\(--font-size-compact\\)`).test(css), part).toBe(true);
  }
  expect(css).not.toMatch(/font-size: var\(--font-size-sm\)/);
});

test('a member\'s box stands under its group\'s box: one inset, the open control, one gap', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'MemberPicker.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // The group row: its start inset, then the small IconButton, then the gap to its box.
  expect(/\.crewlet-member-picker__group-row \{[^}]*padding: var\(--spacing-2\) var\(--spacing-3\) var\(--spacing-2\) var\(--spacing-1\);[^}]*\}/.test(css)).toBe(true);
  expect(/\.crewlet-member-picker__group-row \{[^}]*gap: var\(--spacing-2\);/.test(css)).toBe(true);
  // A member row starts its box past the same three, and takes back the bare box's pointer inset.
  expect(css).toMatch(/calc\(var\(--spacing-1\) \+ var\(--size-control-sm\) \+ var\(--spacing-2\)\)/);
  expect(css).toMatch(
    /\.crewlet-member-picker__members:not\(\.is-ungrouped\) \.crewlet-checkbox--bare \{\s*margin-inline-start: calc\(\(var\(--crewlet-checkbox-size\) - var\(--size-target-min\)\) \/ 2\);/,
  );
  const { container } = render(<Harness initial={{ groups: [], members: [], except: [] }} />);
  expect(container.querySelector('.crewlet-member-picker__toggle')!.classList.contains('crewlet-icon-btn--sm')).toBe(true);
  expect(container.querySelector('.crewlet-member-picker__member .crewlet-checkbox')!.classList.contains('crewlet-checkbox--bare')).toBe(true);
});

/*
 * A MEMBER IN TWO GROUPS is two rows, and either row's box answers for the
 * member, by how the value reaches it rather than by the row's own group: a
 * box under an unchosen group, ticked because a chosen group reaches the
 * member, was a box no click could untick.
 */
test('a member listed under two groups is ticked and unticked from either row', () => {
  const shared: MemberPickerGroup[] = [
    { key: 'product', label: 'Product', members: [{ key: 'ada', name: 'Ada' }, { key: 'pm', name: 'PM' }] },
    { key: 'ops', label: 'Operations', members: [{ key: 'ada', name: 'Ada' }, { key: 'sre', name: 'SRE' }] },
  ];
  function Two({ initial }: { initial: MemberPickerValue }) {
    const [value, setValue] = useState(initial);
    return (
      <>
        <MemberPicker label="Who gets it" groups={shared} value={value} onChange={setValue} defaultOpen={['product', 'ops']} />
        <output data-testid="value">{JSON.stringify(value)}</output>
      </>
    );
  }
  const ada = () => screen.getAllByRole('checkbox', { name: 'Ada' }) as HTMLInputElement[];

  // Reached through Product, unticked under Operations: left out.
  render(<Two initial={{ groups: ['product'], members: [], except: [] }} />);
  expect(ada().map((b) => b.checked)).toEqual([true, true]);
  fireEvent.click(ada()[1]!);
  expect(ada().map((b) => b.checked)).toEqual([false, false]);
  expect(value()).toEqual({ groups: ['product'], members: [], except: ['ada'] });
  // Ticked again under Operations: back through Product, not a pick of its own beside an exception.
  fireEvent.click(ada()[1]!);
  expect(ada().map((b) => b.checked)).toEqual([true, true]);
  expect(value()).toEqual({ groups: ['product'], members: [], except: [] });
  cleanup();

  // Left out of Product, then ticked under Operations: back through Product,
  // never "Left out" beside a ticked box, and unticked again from Product's row.
  render(<Two initial={{ groups: ['product'], members: [], except: [] }} />);
  fireEvent.click(ada()[0]!);
  expect(value().except).toEqual(['ada']);
  fireEvent.click(ada()[1]!);
  expect(value()).toEqual({ groups: ['product'], members: [], except: [] });
  expect(screen.queryByText('Left out')).toBeNull();
  fireEvent.click(ada()[0]!);
  expect(ada().map((b) => b.checked)).toEqual([false, false]);
  expect(value()).toEqual({ groups: ['product'], members: [], except: ['ada'] });
});

test('a member\'s name and line are its box\'s target, as a group\'s name is', () => {
  const { container } = render(<Harness initial={{ groups: [], members: [], except: [] }} />);
  const name = [...container.querySelectorAll('.crewlet-member-picker__name')].find((n) => n.textContent === 'Developer')!;
  fireEvent.click(name);
  expect(value().members).toEqual(['dev']);
  fireEvent.click(screen.getByText('Builds it'));
  expect(value().members).toEqual([]);
  // Still one name: the box's own, not the words it is drawn beside.
  expect(box('Developer')).toBeTruthy();
});

test('has no accessibility violations', async () => {
  const { container } = render(<Harness initial={{ groups: ['product'], members: ['sre'], except: ['dev'] }} />);
  const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations).toEqual([]);
});
