/**
 * What narrowing a list means, as arithmetic.
 *
 * Every case here is a rule two screens disagreed about while each kept its
 * own copy of this: whether a filter compares as text or as a value, what an
 * absent field does, what an untouched filter does, and what "clear this
 * filter" puts back.
 */

import { expect, test } from 'vitest';
import {
  applyColumnFilters,
  applyFilters,
  blankFilterValue,
  defaultOperator,
  filterDefsFromColumns,
  filterHasValue,
  filterPredicate,
  type FilterDef,
} from './filters.js';
import type { DataViewColumn } from './columns.js';

interface Operator {
  id: number;
  email: string;
  role: string;
  grantedAt: string | null;
}

const OPERATORS: Operator[] = [
  { id: 1, email: 'ada@example.com', role: 'owner', grantedAt: '2026-01-10T09:00:00Z' },
  { id: 2, email: 'Grace@example.com', role: 'admin', grantedAt: '2026-03-02T09:00:00Z' },
  { id: 3, email: 'linus@example.com', role: 'viewer', grantedAt: null },
];

const ROLE: FilterDef<Operator> = {
  name: 'role',
  label: 'Role',
  kind: 'select',
  multiple: true,
  options: [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'viewer', label: 'Viewer' },
  ],
};

const EMAIL: FilterDef<Operator> = { name: 'email', label: 'Email' };
const GRANTED: FilterDef<Operator> = { name: 'grantedAt', label: 'Granted', kind: 'datetime' };

test('a text filter contains, case insensitively, and an absent field matches nothing', () => {
  const rows = applyFilters(OPERATORS, [EMAIL], { email: 'GRACE' });
  expect(rows.map((row) => row.id)).toEqual([2]);

  // Row 3's field is null, so it is not a row whose text contains anything.
  const asText: FilterDef<Operator> = { name: 'grantedAt', label: 'Granted' };
  expect(applyFilters(OPERATORS, [asText], { grantedAt: '2026' }).map((row) => row.id)).toEqual([1, 2]);
});

test('an untouched filter narrows nothing, and hands the same array back', () => {
  expect(applyFilters(OPERATORS, [ROLE, EMAIL], { role: [], email: '   ' })).toBe(OPERATORS);
  expect(filterPredicate(ROLE, [])).toBe(null);
  expect(filterPredicate(EMAIL, '')).toBe(null);
});

test('several answers are an OR, and they compare as text', () => {
  const rows = applyFilters(OPERATORS, [ROLE], { role: ['owner', 'viewer'] });
  expect(rows.map((row) => row.id)).toEqual([1, 3]);

  // A row's id is a number here and the filter's answer is a string, which is
  // how the same filter arrives from a URL. Compared by value it would match
  // nothing at all.
  const byId: FilterDef<Operator> = {
    name: 'id',
    label: 'Id',
    kind: 'select',
    multiple: true,
    options: [{ value: '2', label: 'Two' }],
  };
  expect(applyFilters(OPERATORS, [byId], { id: ['2'] }).map((row) => row.email)).toEqual(['Grace@example.com']);
});

test('several filters are an AND', () => {
  const rows = applyFilters(OPERATORS, [ROLE, EMAIL], { role: ['owner', 'admin'], email: 'example.com' });
  expect(rows.map((row) => row.id)).toEqual([1, 2]);
});

test('a moment filter takes both bounds, includes its own edge, and refuses a row with no moment', () => {
  const since = applyFilters(OPERATORS, [GRANTED], { grantedAt: '2026-01-10T09:00:00Z' });
  expect(since.map((row) => row.id)).toEqual([1, 2]);

  const until: FilterDef<Operator> = { ...GRANTED, operator: 'on-or-before' };
  expect(applyFilters(OPERATORS, [until], { grantedAt: '2026-01-10T09:00:00Z' }).map((row) => row.id)).toEqual([1]);

  // Row 3 has no moment at all, so it is in neither answer: it was never
  // measured, and putting it in one would be a claim nobody made.
  expect(since.some((row) => row.id === 3)).toBe(false);
});

test('a number filter equals, and a value that is not a number narrows nothing', () => {
  const count: FilterDef<Operator> = { name: 'id', label: 'Id', kind: 'number' };
  expect(applyFilters(OPERATORS, [count], { id: '2' }).map((row) => row.email)).toEqual(['Grace@example.com']);
  expect(filterPredicate(count, 'two')).toBe(null);
});

test('the kind decides the operator, and the operator decides the comparison', () => {
  expect(defaultOperator({ kind: 'text' })).toBe('contains');
  expect(defaultOperator({ kind: 'number' })).toBe('equals');
  expect(defaultOperator({ kind: 'datetime' })).toBe('on-or-after');
  expect(defaultOperator({ kind: 'select' })).toBe('is');
  expect(defaultOperator({ kind: 'select', multiple: true })).toBe('is-any-of');

  // `is` is exact where `contains` is not: a screen filtering on a status must
  // not match "failed" with "not failed".
  const status: FilterDef<Operator> = { name: 'role', label: 'Role', kind: 'select', options: [] };
  expect(applyFilters(OPERATORS, [status], { role: 'owner' }).map((row) => row.id)).toEqual([1]);
  expect(applyFilters(OPERATORS, [{ ...status, operator: 'contains' }], { role: 'owner' }).map((row) => row.id)).toEqual([1]);
  expect(applyFilters(OPERATORS, [status], { role: 'own' })).toEqual([]);
});

test('a cleared filter goes back to the answer the list offers for "any", not to nothing', () => {
  const status: FilterDef<Operator> = {
    name: 'role',
    label: 'Role',
    kind: 'select',
    options: [
      { value: '', label: 'Any role' },
      { value: 'owner', label: 'Owner' },
    ],
  };
  expect(blankFilterValue(status)).toBe('');
  expect(filterHasValue(status, '')).toBe(false);
  expect(filterHasValue(status, 'owner')).toBe(true);

  const tiers: FilterDef<Operator> = {
    name: 'role',
    label: 'Role',
    kind: 'select',
    options: [
      { value: 'all', label: 'All roles' },
      { value: 'owner', label: 'Owner' },
    ],
  };
  // The first option IS the "any" answer, so clearing goes back to it rather
  // than to an empty string the list does not offer.
  expect(blankFilterValue(tiers)).toBe('all');
  expect(filterHasValue(tiers, 'all')).toBe(false);

  expect(blankFilterValue(ROLE)).toEqual([]);
  expect(blankFilterValue(EMAIL)).toBe('');
});

test('a filter sitting on its own blank answer narrows nothing, whatever that answer is', () => {
  const tiers: FilterDef<Operator> = {
    name: 'role',
    label: 'Role',
    kind: 'select',
    options: [
      { value: 'all', label: 'All roles' },
      { value: 'owner', label: 'Owner' },
    ],
  };
  /*
   * ONE DEFINITION OF "NARROWS NOTHING". Read as "the value is empty", this
   * filter cleared back to its own any answer went on comparing every row
   * against the word `all` and handed back an empty table, under a chip row
   * that had just been emptied: the blank value said one thing and the
   * predicate another.
   */
  expect(filterPredicate(tiers, blankFilterValue(tiers))).toBe(null);
  expect(applyFilters(OPERATORS, [tiers], { role: 'all' })).toBe(OPERATORS);
  expect(applyFilters(OPERATORS, [tiers], { role: 'owner' }).map((row) => row.id)).toEqual([1]);
});

const COLUMNS: DataViewColumn<Operator>[] = [
  { key: 'email', header: 'Email', filterable: true },
  {
    key: 'role',
    header: 'Role',
    filterable: true,
    filterKind: 'select',
    filterMultiple: true,
    filterOptions: [{ value: 'owner', label: 'Owner' }],
    filterLabel: 'Access',
  },
  { key: 'grantedAt', header: 'Granted', filterable: true, filterKind: 'datetime', filterValue: (row) => row.grantedAt },
  { key: 'id', header: 'Id' },
];

test('a column declares its own filter, and a column that does not is not one', () => {
  const defs = filterDefsFromColumns(COLUMNS);
  expect(defs.map((def) => def.name)).toEqual(['email', 'role', 'grantedAt']);
  expect(defs[1]).toMatchObject({ label: 'Access', kind: 'select', multiple: true });
  expect(defs[0]).toMatchObject({ label: 'Email', kind: 'text' });
});

test('a column filter reads the row through the column, and only column filters are applied', () => {
  expect(applyColumnFilters(OPERATORS, COLUMNS, { grantedAt: '2026-02-01T00:00:00Z' }).map((row) => row.id)).toEqual([2]);

  /*
   * THE CONTRACT: a value whose name belongs to no filterable column does
   * nothing here. A screen declares "search" and filters on the server; if
   * this applied it too, it would look for a `search` field on every row, find
   * none, and hand back an empty table.
   */
  expect(applyColumnFilters(OPERATORS, COLUMNS, { search: 'ada' })).toBe(OPERATORS);
});
