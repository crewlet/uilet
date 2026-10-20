/**
 * The sheet model: the rules both renderers draw a sheet from. Each test names
 * a rule a person would notice broken (a value that pastes back as something
 * else, a refusal that does not say why, a pending cell that never settles).
 */

import { describe, expect, test } from 'vitest';
import {
  SHEET_COLUMN_BOUNDS,
  SHEET_COLUMN_WIDTHS,
  SHEET_LABELS,
  SheetPendingEdits,
  cellDescription,
  checkValue,
  compareValues,
  displayText,
  editText,
  editorSide,
  fitSamples,
  fittedWidth,
  moveFrom,
  nextSort,
  normalizeValue,
  optionHue,
  parseOptionList,
  parseTSV,
  parseText,
  planClear,
  planPaste,
  presenceByCell,
  rangeOf,
  refusalText,
  retypeColumn,
  sortRows,
  statusTone,
  toTSV,
  visibleRows,
  type SheetColumn,
  type SheetRow,
  type SheetValueContext,
} from './index.js';

const people = [
  { id: 'seat:maya', name: 'Maya Ortiz', kind: 'human' as const },
  { id: 'seat:pm', name: 'PM', kind: 'agent' as const, hue: 'rose' as const },
];
const context: SheetValueContext = { people, locale: 'en-US', labels: SHEET_LABELS };

const text: SheetColumn = { field: 'vendor', label: 'Vendor', type: 'text', required: true };
const score: SheetColumn = { field: 'score', label: 'Score', type: 'number', min: 0, max: 10, precision: 1 };
const done: SheetColumn = { field: 'done', label: 'Approved', type: 'checkbox' };
const tier: SheetColumn = {
  field: 'tier',
  label: 'Tier',
  type: 'select',
  options: [
    { id: 'gold', label: 'Gold', color: 'amber' },
    { id: 'silver', label: 'Silver', color: 'neutral' },
    { id: 'bronze', label: 'Bronze', color: 'red', archived: true },
  ],
};
const tags: SheetColumn = { field: 'tags', label: 'Labels', type: 'multiselect', maxItems: 2, options: tier.options };
const status: SheetColumn = {
  field: 'status',
  label: 'Status',
  type: 'status',
  options: [
    { id: 'todo', label: 'To review', category: 'todo' },
    { id: 'blocked', label: 'Blocked', color: 'amber', category: 'blocked' },
    { id: 'ok', label: 'Approved', category: 'done' },
  ],
};
const owner: SheetColumn = { field: 'owner', label: 'Owner', type: 'person' };
const due: SheetColumn = { field: 'due', label: 'Due', type: 'date' };
const link: SheetColumn = { field: 'link', label: 'Preview', type: 'url' };
const stars: SheetColumn = { field: 'stars', label: 'Priority', type: 'rating', max: 5 };
const share: SheetColumn = { field: 'share', label: 'Share', type: 'number', numberStyle: 'percent' };

describe('values', () => {
  test('normalise what the datastore holds to the column type, and draw a wrong shape as empty', () => {
    expect(normalizeValue(score, '6.8')).toBe(6.8);
    expect(normalizeValue(score, 'abc')).toBeNull();
    expect(normalizeValue(done, null)).toBe(false);
    expect(normalizeValue(tags, 'gold')).toEqual([]);
    expect(normalizeValue(stars, 2.5)).toBeNull();
    expect(normalizeValue(text, 12)).toBe('12');
  });

  test('a value copied out pastes back as itself, for every type', () => {
    const cases: [SheetColumn, unknown][] = [
      [text, 'Acme Corp'],
      [score, 6.8],
      [done, true],
      [tier, 'gold'],
      [tags, ['gold', 'silver']],
      [status, 'blocked'],
      [owner, 'seat:pm'],
      [due, '2026-10-17'],
      [link, 'https://acme.example/pricing'],
      [stars, 4],
      [share, 0.125],
    ];
    for (const [column, raw] of cases) {
      const value = normalizeValue(column, raw);
      const parsed = parseText(column, editText(column, value, context), context);
      expect({ field: column.field, parsed }).toEqual({ field: column.field, parsed: { ok: true, value } });
    }
  });

  test('a value that does not fit is refused with the reason, in the column name', () => {
    expect(parseText(score, 'six', context)).toEqual({ ok: false, error: 'Score must be a number.' });
    expect(parseText(score, '11', context)).toEqual({ ok: false, error: 'Score must be at most 10.' });
    expect(parseText(score, '-1', context)).toEqual({ ok: false, error: 'Score must be at least 0.' });
    expect(parseText(text, '  ', context)).toEqual({ ok: false, error: 'Vendor is required.' });
    expect(parseText(tier, 'Platinum', context)).toEqual({ ok: false, error: 'Tier must be one of its options.' });
    expect(parseText(tier, 'Bronze', context)).toEqual({ ok: false, error: 'Tier must be one of its options.' });
    expect(parseText(tags, 'Gold, Silver, Gold', context)).toEqual({ ok: true, value: ['gold', 'silver'] });
    expect(parseText(owner, 'Nobody', context).ok).toBe(false);
    expect(parseText(due, '2026-02-30', context).ok).toBe(false);
    expect(parseText(link, 'javascript:alert(1)', context).ok).toBe(false);
    expect(parseText(link, 'ftp://files.example/report.pdf', context).ok).toBe(false);
    expect(parseText(link, 'data:text/html,<p>hi</p>', context).ok).toBe(false);
    expect(parseText(link, 'acme.example/pricing', context)).toEqual({ ok: true, value: 'https://acme.example/pricing' });
    expect(parseText(stars, '7', context)).toEqual({ ok: false, error: 'Priority must be a whole number from 1 to 5.' });
    expect(parseText(stars, '★★★', context)).toEqual({ ok: true, value: 3 });
  });

  test('numbers are read the way people paste them', () => {
    expect(parseText(score, ' 6.84 ', context)).toEqual({ ok: true, value: 6.8 });
    expect(parseText({ ...score, max: undefined, precision: undefined }, '$1,234.5', context)).toEqual({ ok: true, value: 1234.5 });
    expect(parseText(share, '12.5%', context)).toEqual({ ok: true, value: 0.125 });
    expect(parseText(share, '12.5', context)).toEqual({ ok: true, value: 0.125 });
  });

  test('checkbox words, and empty clears a cell that is not required', () => {
    for (const word of ['yes', 'TRUE', 'x', '1']) expect(parseText(done, word, context)).toEqual({ ok: true, value: true });
    for (const word of ['no', 'FALSE', '', '0']) expect(parseText(done, word, context)).toEqual({ ok: true, value: false });
    expect(parseText(score, '', context)).toEqual({ ok: true, value: null });
    expect(parseText(tags, '', context)).toEqual({ ok: true, value: [] });
  });

  test('a person is matched by id, by name or by a prefix only one name has', () => {
    expect(parseText(owner, 'seat:maya', context)).toEqual({ ok: true, value: 'seat:maya' });
    expect(parseText(owner, 'maya ortiz', context)).toEqual({ ok: true, value: 'seat:maya' });
    expect(parseText(owner, 'May', context)).toEqual({ ok: true, value: 'seat:maya' });
  });

  test('display text is formatted for the reader, and archived options say so', () => {
    expect(displayText(score, 6.8, context)).toBe('6.8');
    expect(displayText(share, 0.125, context)).toBe('12.5%');
    expect(displayText(tier, 'bronze', context)).toBe('Archived: Bronze');
    expect(displayText(owner, 'seat:gone', context)).toBe('Unknown person');
    expect(displayText(due, '2026-10-17', context)).toBe('Oct 17, 2026');
    expect(displayText(done, false, context)).toBe('Not checked');
    expect(displayText(stars, 3, context)).toBe('3 of 5 stars');
  });

  test('checkValue holds an editor choice to the column: no archived option, no unknown person, no excess items', () => {
    expect(checkValue(tier, 'bronze', context)).toBe('Tier must be one of its options.');
    expect(checkValue(tier, 'gold', context)).toBeNull();
    expect(checkValue(tags, ['gold', 'silver', 'gold'], context)).toBe('Labels holds at most 2 options.');
    expect(checkValue(tags, ['bronze'], context)).toBeNull();
    expect(checkValue(owner, 'seat:gone', context)).toBe('Owner must be a person or an agent in this company.');
    expect(checkValue(text, null, context)).toBe('Vendor is required.');
  });

  test('sorting keeps empty cells last in both directions and orders options by their position', () => {
    const rows: SheetRow[] = [
      { id: 'a', values: { score: 3, status: 'ok' } },
      { id: 'b', values: { score: null, status: 'todo' } },
      { id: 'c', values: { score: 9, status: 'blocked' } },
    ];
    expect(sortRows([score], rows, { field: 'score', direction: 'ascending' }, context).map((row) => row.id)).toEqual(['a', 'c', 'b']);
    expect(sortRows([score], rows, { field: 'score', direction: 'descending' }, context).map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(sortRows([status], rows, { field: 'status', direction: 'ascending' }, context).map((row) => row.id)).toEqual(['b', 'c', 'a']);
    expect(compareValues(done, true, false, context)).toBeGreaterThan(0);
    expect(nextSort(null, 'score')).toEqual({ field: 'score', direction: 'ascending' });
    expect(nextSort({ field: 'score', direction: 'ascending' }, 'score')).toEqual({ field: 'score', direction: 'descending' });
    expect(nextSort({ field: 'score', direction: 'descending' }, 'score')).toBeNull();
  });
});

describe('columns', () => {
  test('a retyped column keeps what every type has and none of its old type\'s settings', () => {
    const price: SheetColumn = {
      field: 'price',
      label: 'Price',
      type: 'number',
      width: 140,
      frozen: true,
      required: true,
      min: 0,
      max: 1000,
      precision: 2,
      numberStyle: 'currency',
      currency: 'EUR',
    };
    expect(retypeColumn(price, 'text')).toEqual({ field: 'price', label: 'Price', type: 'text', width: 140, frozen: true, required: true });
    // A date's time of day is the date's: it does not ride along into text and back.
    const at: SheetColumn = { field: 'at', label: 'At', type: 'date', time: true, readOnly: true };
    expect(retypeColumn(at, 'text')).toEqual({ field: 'at', label: 'At', type: 'text', readOnly: true });
  });

  test('the length cap moves between text and long text, and nowhere else', () => {
    const note: SheetColumn = { field: 'note', label: 'Note', type: 'text', maxLength: 80 };
    expect(retypeColumn(note, 'longtext')).toEqual({ field: 'note', label: 'Note', type: 'longtext', maxLength: 80 });
    expect(retypeColumn(note, 'number')).toEqual({ field: 'note', label: 'Note', type: 'number' });
  });
});

describe('options', () => {
  test('a select chip takes the author hue, through the aliases, and neutral otherwise', () => {
    expect(optionHue('amber')).toBe('amber');
    expect(optionHue('Red')).toBe('rose');
    expect(optionHue('violet')).toBe('purple');
    expect(optionHue('#ff0000')).toBe('neutral');
    expect(optionHue(undefined)).toBe('neutral');
  });

  test('a status is a state: a tone name, a hue a tone is drawn in, or its category', () => {
    expect(statusTone({ color: 'warning' })).toBe('warning');
    expect(statusTone({ color: 'green' })).toBe('success');
    expect(statusTone({ category: 'blocked' })).toBe('danger');
    expect(statusTone({ category: 'in_progress' })).toBe('info');
    expect(statusTone({})).toBe('neutral');
  });

  test('the kit attribute form gives stable ids from labels', () => {
    expect(parseOptionList('Gold:amber, Silver:neutral,Bronze ,,Gold')).toEqual([
      { id: 'gold', label: 'Gold', color: 'amber' },
      { id: 'silver', label: 'Silver', color: 'neutral' },
      { id: 'bronze', label: 'Bronze' },
      { id: 'gold_', label: 'Gold' },
    ]);
  });
});

describe('navigation', () => {
  const bounds = { rows: 100, cols: 5, page: 10 };
  test('arrows move one cell, stop at the edges, and reach the header from the first row', () => {
    expect(moveFrom({ row: 0, col: 0 }, { key: 'ArrowUp' }, bounds)).toEqual({ row: -1, col: 0 });
    expect(moveFrom({ row: -1, col: 0 }, { key: 'ArrowUp' }, bounds)).toEqual({ row: -1, col: 0 });
    expect(moveFrom({ row: 99, col: 4 }, { key: 'ArrowDown' }, bounds)).toEqual({ row: 99, col: 4 });
    expect(moveFrom({ row: 5, col: 4 }, { key: 'ArrowRight' }, bounds)).toEqual({ row: 5, col: 4 });
    expect(moveFrom({ row: 5, col: 2 }, { key: 'ArrowLeft', ctrlKey: true }, bounds)).toEqual({ row: 5, col: 0 });
  });

  test('Home, End, their command forms and the page keys', () => {
    expect(moveFrom({ row: 5, col: 2 }, { key: 'Home' }, bounds)).toEqual({ row: 5, col: 0 });
    expect(moveFrom({ row: 5, col: 2 }, { key: 'End', metaKey: true }, bounds)).toEqual({ row: 99, col: 4 });
    expect(moveFrom({ row: 5, col: 2 }, { key: 'PageDown' }, bounds)).toEqual({ row: 15, col: 2 });
    expect(moveFrom({ row: 5, col: 2 }, { key: 'PageUp' }, bounds)).toEqual({ row: 0, col: 2 });
    expect(moveFrom({ row: 5, col: 2 }, { key: 'Tab' }, bounds)).toBeNull();
  });

  test('a range spans its corners in either direction', () => {
    expect(rangeOf({ row: 4, col: 3 }, { row: 1, col: 0 })).toEqual({ top: 1, bottom: 4, left: 0, right: 3 });
  });

  test('only the rows in view are drawn, with an overscan, and an unmeasured viewport still draws a screenful', () => {
    expect(visibleRows(3200, 640, 32, 10_000)).toEqual([92, 128]);
    const [first, last] = visibleRows(0, 0, 32, 10_000);
    expect(first).toBe(0);
    expect(last).toBeLessThan(60);
    expect(visibleRows(0, 640, 32, 0)).toEqual([0, -1]);
  });

  test('a list opens above a cell near the bottom of the view', () => {
    expect(editorSide(100, 132, 0, 600, 256)).toBe('below');
    expect(editorSide(500, 532, 0, 600, 256)).toBe('above');
  });
});

describe('column fit', () => {
  test('a measured column takes its width within its type bounds, and nothing measured keeps the default', () => {
    const [min, max] = SHEET_COLUMN_BOUNDS.status;
    expect(fittedWidth('status', 0)).toBe(SHEET_COLUMN_WIDTHS.status);
    expect(fittedWidth('status', 40)).toBe(min);
    expect(fittedWidth('status', 171.2)).toBe(172);
    expect(fittedWidth('status', 4000)).toBe(max);
  });

  test('a choice column is measured by every live choice, whatever the rows hold', () => {
    expect(fitSamples(tier, [], context)).toEqual(['gold', 'silver']);
    expect(fitSamples(status, [], context)).toEqual(['todo', 'blocked', 'ok']);
  });

  test('a checkbox and a multi-select by their header alone, a rating by its full mark', () => {
    const rows: SheetRow[] = [{ id: 'a', values: { done: true, tags: ['gold'], stars: 2 } }];
    expect(fitSamples(done, rows, context)).toEqual([]);
    expect(fitSamples(tags, rows, context)).toEqual([]);
    expect(fitSamples(stars, rows, context)).toEqual([5]);
  });

  test('any other column by its longest values as displayed, at most the limit', () => {
    const rows: SheetRow[] = ['Acme', 'Globex Corporation', '', 'Initech', 'Umbrella'].map((vendor, i) => ({ id: String(i), values: { vendor } }));
    expect(fitSamples(text, rows, context, 2)).toEqual(['Globex Corporation', 'Umbrella']);
    expect(fitSamples(text, [], context)).toEqual([]);
  });
});

describe('clipboard', () => {
  const columns = [text, score, tier, done];
  const rows: SheetRow[] = [
    { id: 'a', values: { vendor: 'Acme\tCorp', score: 7.2, tier: 'gold', done: true } },
    { id: 'b', values: { vendor: 'Globex "Inc"', score: 6.8, tier: 'silver', done: false } },
  ];

  test('copies a range as TSV, quoting a field with a tab or a quote, and reads it back', () => {
    const tsv = toTSV(columns, rows, { top: 0, bottom: 1, left: 0, right: 3 }, context);
    expect(tsv).toBe('"Acme\tCorp"\t7.2\tGold\tTRUE\n"Globex ""Inc"""\t6.8\tSilver\tFALSE');
    expect(parseTSV(tsv)).toEqual([
      ['Acme\tCorp', '7.2', 'Gold', 'TRUE'],
      ['Globex "Inc"', '6.8', 'Silver', 'FALSE'],
    ]);
    expect(parseTSV('a\tb\n')).toEqual([['a', 'b']]);
  });

  test('a paste writes what changed, refuses what does not fit, skips read-only columns and stops at the edge', () => {
    const plan = planPaste(
      [text, { ...score, readOnly: true }, tier, done],
      rows,
      { top: 0, bottom: 0, left: 0, right: 0 },
      [
        ['Acme\tCorp', '1', 'Platinum', 'yes'],
        ['Initech', '2', 'Gold', 'no'],
        ['Past the end', '3', 'Gold', 'no'],
      ],
      context,
    );
    expect(plan.edits).toEqual([
      { rowId: 'b', field: 'vendor', value: 'Initech' },
      { rowId: 'b', field: 'tier', value: 'gold' },
    ]);
    expect(plan.refused).toEqual([{ rowId: 'a', field: 'tier', error: 'Tier must be one of its options.' }]);
  });

  test('one field pasted over a range fills it', () => {
    const plan = planPaste(columns, rows, { top: 0, bottom: 1, left: 1, right: 1 }, [['5']], context);
    expect(plan.edits).toEqual([
      { rowId: 'a', field: 'score', value: 5 },
      { rowId: 'b', field: 'score', value: 5 },
    ]);
  });

  test('clearing unchecks and empties, and refuses a required cell with the reason', () => {
    const plan = planClear(columns, rows, { top: 0, bottom: 0, left: 0, right: 3 }, context);
    expect(plan.edits).toEqual([
      { rowId: 'a', field: 'score', value: null },
      { rowId: 'a', field: 'tier', value: null },
      { rowId: 'a', field: 'done', value: false },
    ]);
    expect(plan.refused).toEqual([{ rowId: 'a', field: 'vendor', error: 'Vendor is required.' }]);
  });
});

describe('pending edits (D23)', () => {
  test('a cell is pending until every edit of it settles, and a refusal stays on the cell', () => {
    const edits = new SheetPendingEdits();
    let changes = 0;
    edits.subscribe(() => {
      changes += 1;
    });
    const first = edits.begin('a', 'score');
    const second = edits.begin('a', 'score');
    expect(edits.isPending('a', 'score')).toBe(true);
    expect(edits.saving).toBe(2);
    first({ ok: true });
    expect(edits.isPending('a', 'score')).toBe(true);
    second({ ok: false, message: 'You can view this sheet but not edit it.' });
    second({ ok: true });
    expect(edits.isPending('a', 'score')).toBe(false);
    expect(edits.refusal('a', 'score')).toBe('You can view this sheet but not edit it.');
    expect(edits.failures).toBe(1);
    expect(changes).toBe(4);

    const [row] = edits.decorate([{ id: 'a', values: { score: 1 } }]);
    expect(row?.refused).toEqual({ score: 'You can view this sheet but not edit it.' });

    edits.begin('a', 'score');
    expect(edits.refusal('a', 'score')).toBeUndefined();
    expect(edits.decorate([{ id: 'a', values: {} }])[0]?.pending).toEqual(['score']);
  });

  test('a refusal holds the strip at "not saved" until it is dismissed, never "Saved"', () => {
    const edits = new SheetPendingEdits();
    const settle = edits.begin('a', 'notes');
    settle({ ok: false, message: 'It changed since it was read.' });
    const state = edits.sync();
    expect(state.refused).toBe(1);
    expect(SHEET_LABELS.sync(state)).toBe('1 change not saved');
    edits.begin('b', 'notes')({ ok: false, message: 'No.' });
    expect(SHEET_LABELS.sync(edits.sync())).toBe('2 changes not saved');
    let changes = 0;
    edits.subscribe(() => {
      changes += 1;
    });
    edits.dismissAll();
    expect(changes).toBe(1);
    expect(edits.refusal('a', 'notes')).toBeUndefined();
    expect(SHEET_LABELS.sync(edits.sync())).toBe('Saved');
  });

  test('a permission refusal says the sheet words; anything else says the engine detail or a generic line', () => {
    expect(refusalText('forbidden', 'seat lacks editor', SHEET_LABELS)).toBe('You can view this sheet but not edit it.');
    expect(refusalText('invalid_value', 'Score must be a number.', SHEET_LABELS)).toBe('Score must be a number.');
    expect(refusalText('something_new', '', SHEET_LABELS)).toBe('Could not save this change.');
  });
});

describe('view', () => {
  test('a focused cell is described by its column, its state, who else is on it and who changed it', () => {
    const row: SheetRow = {
      id: 'a',
      values: { score: 7.2 },
      pending: ['score'],
      changed: { score: { by: 'Maya Ortiz', at: '2026-10-17T10:42:00Z', previous: 6.8 } },
    };
    const others = presenceByCell([{ rowId: 'a', field: 'score', id: 's1', name: 'Jane Founder', kind: 'human', hue: 'cyan' }]).get('a\u0000score') ?? [];
    const words = cellDescription(score, row, others, context);
    expect(words).toMatch(/^Score\. Saving\. Jane Founder is also here\. Changed by Maya Ortiz, .+\. Was 6\.8\.$/);
  });

  test('editors are listed first on a cell', () => {
    const list = presenceByCell([
      { rowId: 'a', field: 'x', id: '1', name: 'Viewer', kind: 'human', hue: 'cyan' },
      { rowId: 'a', field: 'x', id: '2', name: 'Editor', kind: 'agent', hue: 'rose', editing: true },
    ]).get('a\u0000x');
    expect(list?.map((entry) => entry.name)).toEqual(['Editor', 'Viewer']);
  });
});
