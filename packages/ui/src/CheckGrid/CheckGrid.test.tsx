/**
 * CheckGrid: which rows hold which columns, as native checkboxes.
 *
 * The invariants: every box is named by its row and its column, the words a
 * reader sees; a column that refuses a box says why, once, and never locks
 * a ticked box on; and at any width every column is shown, either side by
 * side under a header or, where they do not fit, stacked under each row's
 * name with its own column's name beside each box.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { CheckGrid, type CheckGridColumn, type CheckGridProps, type CheckGridState } from './index.js';

const ROWS = [
  { value: 'be', label: 'Backend Engineer' },
  { value: 'qa', label: 'Quality Lead' },
];

const COLUMNS: CheckGridColumn[] = [
  { value: 'coding', label: 'Coding', disabledReason: 'Codex runs no coding.' },
  { value: 'reviews', label: 'Reviewing and delegations' },
  { value: 'routines', label: 'Routines and evaluations' },
];

const STATES: Record<string, CheckGridState> = {
  'be:coding': 'checked',
  'be:reviews': 'mixed',
};

function grid(props: Partial<CheckGridProps> = {}) {
  const onChange = vi.fn();
  const view = render(
    <CheckGrid
      label="Jobs per seat"
      rows={ROWS}
      columns={COLUMNS}
      stateOf={(row, column) => STATES[`${row}:${column}`] ?? 'unchecked'}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...view };
}

const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

const sheet = () =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'CheckGrid.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

afterEach(cleanup);

test('every box is named by its row and its column, and each row is a group named by its row', () => {
  grid();
  expect(screen.getByRole('group', { name: 'Jobs per seat' })).toBeTruthy();
  for (const row of ROWS) {
    const group = screen.getByRole('group', { name: row.label });
    for (const column of COLUMNS) {
      expect(within(group).getByRole('checkbox', { name: `${row.label} ${column.label}` })).toBeTruthy();
    }
  }
  // The header row draws the columns once, and is not read again on top of every box.
  const head = document.querySelector('.crewlet-check-grid__head')!;
  expect(head.getAttribute('aria-hidden')).toBe('true');
  expect(head.textContent).toBe(COLUMNS.map((c) => c.label).join(''));
});

test('a box shows on, partly on or off, and a press asks for the other', () => {
  const { onChange } = grid();
  expect(box('Backend Engineer Coding').checked).toBe(true);
  const partly = box('Backend Engineer Reviewing and delegations');
  expect(partly.checked).toBe(false);
  expect(partly.indeterminate).toBe(true);
  const off = box('Quality Lead Routines and evaluations');
  expect(off.checked).toBe(false);
  expect(off.indeterminate).toBe(false);
  fireEvent.click(off);
  expect(onChange).toHaveBeenLastCalledWith('qa', 'routines', true);
  fireEvent.click(box('Backend Engineer Coding'));
  expect(onChange).toHaveBeenLastCalledWith('be', 'coding', false);
});

test('a column that refuses a box says why once, and a box already on stays free to take off', () => {
  grid();
  const refused = box('Quality Lead Coding');
  expect(refused.disabled).toBe(true);
  expect(refused.getAttribute('aria-describedby')).toBeTruthy();
  const reason = document.getElementById(refused.getAttribute('aria-describedby')!)!;
  expect(reason.textContent).toBe('Coding: Codex runs no coding.');
  // Drawn once, under the grid, whatever the number of rows.
  expect(screen.getAllByText('Coding: Codex runs no coding.')).toHaveLength(1);
  const on = box('Backend Engineer Coding');
  expect(on.disabled).toBe(false);
  expect(on.getAttribute('aria-describedby')).toBeNull();
  expect(box('Quality Lead Reviewing and delegations').disabled).toBe(false);
});

test('the boxes are native checkboxes in reading order, row by row', () => {
  grid();
  const order = [...document.querySelectorAll('input[type="checkbox"]')].map((el) =>
    el.getAttribute('aria-labelledby')!.split(' ').map((id) => document.getElementById(id)!.textContent).join(' '),
  );
  expect(order).toEqual(ROWS.flatMap((r) => COLUMNS.map((c) => `${r.label} ${c.label}`)));
  for (const el of document.querySelectorAll('input[type="checkbox"]')) {
    expect((el as HTMLInputElement).tabIndex).toBe(0);
  }
});

test('has no accessibility violations, with a box partly on and a column refusing', async () => {
  const { container } = grid();
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});

/**
 * NO COLUMN IS CUT OFF. Side by side, the grid needs the row names' track and
 * each column's track and gap; under that width it stacks. Each column count
 * up to six stacks at exactly that width, read off the sheet's own tracks and
 * its gap token; more than six always stacks.
 */
test('stacks under the width every column needs, for each count of columns, and always past six', () => {
  const uninstall = installThemed('light', 'CheckGrid/CheckGrid.css');
  try {
    const { container } = grid();
    const root = container.querySelector('.crewlet-check-grid')!;
    const rem = (v: string) => Number(/^([\d.]+)rem$/.exec(v.trim())?.[1]);
    const name = rem(getComputedStyle(root).getPropertyValue('--crewlet-check-grid-name'));
    const column = rem(getComputedStyle(root).getPropertyValue('--crewlet-check-grid-column'));
    const gap = px(container.querySelector('.crewlet-check-grid__row')!, 'column-gap') / 16;
    expect(name).toBeGreaterThan(0);
    expect(column).toBeGreaterThan(0);
    expect(gap).toBeGreaterThan(0);
    const css = sheet();
    for (let n = 1; n <= 6; n++) {
      const at = new RegExp(
        `@container crewlet-check-grid \\(width < ([\\d.]+)rem\\) \\{\\s*\\.crewlet-check-grid--${n} \\.crewlet-check-grid__head`,
      ).exec(css)?.[1];
      expect(Number(at), `${n} columns`).toBeCloseTo(name + n * (column + gap), 5);
    }
  } finally {
    uninstall();
  }
  expect(grid().container.querySelector('.crewlet-check-grid--3')).toBeTruthy();
  cleanup();
  const seven = Array.from({ length: 7 }, (_, i) => ({ value: `c${i}`, label: `Column ${i}` }));
  expect(grid({ columns: seven }).container.querySelector('.crewlet-check-grid--many')).toBeTruthy();
});

/**
 * STACKED, EVERY BOX SHOWS ITS COLUMN; SIDE BY SIDE, THE HEADER DOES. The
 * column's name beside a box is only ever clipped, never removed, since it is
 * half the box's name.
 */
test('stacked, the header goes and each box draws its column; side by side the name is only clipped', () => {
  const css = sheet();
  const wide = /\n\.crewlet-check-grid__box \.crewlet-checkbox__text \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(wide).toMatch(/clip-path:\s*inset\(50%\);/);
  expect(wide).not.toMatch(/display:\s*none/);
  for (const layout of ['1', '2', '3', '4', '5', '6', 'many']) {
    const stacked = (part: string) =>
      new RegExp(`\\.crewlet-check-grid--${layout} \\.crewlet-check-grid__${part} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
    expect(stacked('head'), layout).toMatch(/display:\s*none;/);
    expect(stacked('row'), layout).toMatch(/flex-wrap:\s*wrap;/);
    expect(stacked('name'), layout).toMatch(/flex-basis:\s*100%;/);
    expect(stacked('box \\.crewlet-checkbox__text'), layout).toMatch(/clip-path:\s*none;/);
  }
});
