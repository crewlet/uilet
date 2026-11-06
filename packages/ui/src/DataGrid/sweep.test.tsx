/**
 * DataGrid fixes from a UX sweep of a dashboard built on it: a control's ring
 * in a shrink cell, the compact phone row's leading cells, a summary row an
 * application reveals and marks, and the grid's own order for a host that
 * pages a list it holds whole.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { DataGrid, sortGridRows, type DataGridColumn } from './index.js';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
  tokens?: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Bravo', tokens: 30 },
  { id: 'b', name: 'Alpha', tokens: 10 },
  { id: 'c', name: 'Charlie' },
];

const COLUMNS: DataGridColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { key: 'tokens', header: 'Tokens', align: 'right', cell: (r) => r.tokens ?? null, sortValue: (r) => r.tokens },
];

const sheet = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'DataGrid.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test("a shrink cell's clip leaves room for a control's focus ring", () => {
  // Clipped at the cell's edge, a stacked row's More button lost 4px of its
  // ring on every side. jsdom drops overflow-clip-margin, so the rule is read.
  expect(sheet()).toMatch(/\.crewlet-data-grid__cell--shrink\s*\{[^}]*overflow:\s*clip;[^}]*overflow-clip-margin:\s*4px/);
});

describe('the compact phone row', () => {
  // A control the grid draws (selection, handle, expander) and a figure took
  // the title's `flex: 1 1 0`, so a 16px box stood alone in a third of the line.
  const row = (cells: string) => {
    document.body.innerHTML = `<div class="crewlet-data-grid" data-phone-rows="compact" data-stacked><div class="crewlet-data-grid__row">${cells}</div></div>`;
    return [...document.querySelectorAll<HTMLElement>('.crewlet-data-grid__cell')];
  };

  test('only a left-aligned flexible lead cell fills the first line', () => {
    const uninstall = installSheets('DataGrid/DataGrid.css');
    try {
      const [select, handle, title, figure, shrink] = row(
        '<span class="crewlet-data-grid__cell crewlet-data-grid__cell--action" data-lead></span>' +
          '<span class="crewlet-data-grid__cell crewlet-data-grid__cell--action" data-lead></span>' +
          '<span class="crewlet-data-grid__cell" data-lead>Title</span>' +
          '<span class="crewlet-data-grid__cell crewlet-data-grid__cell--right" data-lead>1.2M</span>' +
          '<span class="crewlet-data-grid__cell crewlet-data-grid__cell--shrink" data-lead>MPL-17</span>',
      );
      expect(getComputedStyle(title!).flexGrow).toBe('1');
      for (const cell of [select, handle, figure, shrink]) expect(getComputedStyle(cell!).flexGrow).not.toBe('1');
      expect(getComputedStyle(select!).alignSelf).toBe('center');
    } finally {
      uninstall();
      document.body.innerHTML = '';
    }
  });

  test("its words stand on one baseline, and a key lead cell holds a common width", () => {
    const css = sheet();
    expect(css).toMatch(/\[data-phone-rows='compact'\]:where\(\[data-stacked\]\) \.crewlet-data-grid__row\s*\{[^}]*align-items:\s*first baseline/);
    expect(css).toMatch(/\.crewlet-data-grid__cell\[data-lead\]:has\(\.crewlet-table-cell__key\)\s*\{[^}]*min-width:\s*7ch/);
  });
});

test('a summary row can carry an id, take focus by script and wear the current mark', () => {
  // With none of these, a section a remedy opens, scrolls to and marks could
  // not move onto a summary row.
  render(
    <DataGrid
      aria-label="Budgets"
      rows={ROWS}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      summaryRows={[{ key: 'company', id: 'budget-company', label: 'Company', cells: { tokens: '40' }, selected: true }]}
    />,
  );
  const summary = document.getElementById('budget-company')!;
  expect(summary.getAttribute('role')).toBe('row');
  expect(summary.tabIndex).toBe(-1);
  expect(summary.getAttribute('aria-current')).toBe('true');
  expect(summary.classList.contains('crewlet-data-grid__row--selected')).toBe(true);
  summary.focus();
  expect(document.activeElement).toBe(summary);
});

test("sortGridRows orders rows as the grid does, so a host pages them without a comparator of its own", () => {
  expect(sortGridRows(ROWS, COLUMNS, { key: 'name', desc: false }).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  // An absent value sorts last both ways.
  expect(sortGridRows(ROWS, COLUMNS, { key: 'tokens', desc: true }).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  expect(sortGridRows(ROWS, COLUMNS, { key: 'tokens', desc: false }).map((r) => r.id)).toEqual(['b', 'a', 'c']);
  // Unsorted, a copy in the given order.
  const same = sortGridRows(ROWS, COLUMNS, null);
  expect(same).toEqual(ROWS);
  expect(same).not.toBe(ROWS);
});
