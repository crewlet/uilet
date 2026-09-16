/**
 * One answer to "where does this key go" for both the tree pattern and the
 * treegrid pattern.
 *
 * The fixture is the shape of a real company: a root seat, units nested two
 * deep, and labels that collide on their first letter and start with a digit,
 * because those are the cases type ahead and the zoom keys fight over.
 *
 * Ported from the engine dashboard's `ui/treeModel.test.ts`.
 */

import { describe, expect, test } from 'vitest';
import {
  createTreeModel,
  isTypeAheadKey,
  treeAllExpandable,
  treeAncestors,
  treeCollapseOrAscend,
  treeExpandOrDescend,
  treeExpandTo,
  treeFirst,
  treeLast,
  treeLevel,
  treeNext,
  treePosInSet,
  treePrevious,
  treeSetSize,
  treeTypeAhead,
  treeVisible,
  typeAheadBuffer,
  TYPE_AHEAD_RESET_MS,
  type TreeInput,
} from './model.js';

const FOREST: TreeInput[] = [
  {
    id: 'company',
    label: 'Nimbus',
    children: [
      { id: 'ceo', label: 'Chief Executive' },
      {
        id: 'eng',
        label: 'Engineering',
        children: [
          { id: 'sre', label: 'Reliability', children: [{ id: 'oncall', label: 'Engineer on call' }] },
          { id: 'swe', label: 'Software Engineer' },
        ],
      },
      { id: 'zero', label: '0 to 1' },
      { id: 'gtm', label: 'Go to Market' },
    ],
  },
  { id: 'orphan', label: 'External Advisor' },
];

const tree = createTreeModel(FOREST);
const none = new Set<string>();
const all = treeAllExpandable(tree);

describe('visible order', () => {
  test('is pre-order, skipping what a collapsed node holds', () => {
    expect(treeVisible(tree, none)).toEqual(['company', 'orphan']);
    expect(treeVisible(tree, new Set(['company']))).toEqual([
      'company',
      'ceo',
      'eng',
      'zero',
      'gtm',
      'orphan',
    ]);
    expect(treeVisible(tree, all)).toEqual([
      'company',
      'ceo',
      'eng',
      'sre',
      'oncall',
      'swe',
      'zero',
      'gtm',
      'orphan',
    ]);
  });

  test('next and previous walk exactly the visible order, in both directions', () => {
    for (const expanded of [none, new Set(['company', 'eng']), all]) {
      const rows = treeVisible(tree, expanded);
      rows.forEach((id, i) => {
        expect(treeNext(tree, expanded, id)).toBe(rows[i + 1] ?? null);
        expect(treePrevious(tree, expanded, id)).toBe(rows[i - 1] ?? null);
      });
      expect(treeFirst(tree)).toBe(rows[0]);
      expect(treeLast(tree, expanded)).toBe(rows[rows.length - 1]);
    }
  });

  test('an expanded leaf is still a leaf', () => {
    expect(treeNext(tree, new Set(['company', 'ceo']), 'ceo')).toBe('eng');
  });
});

describe('Right and Left', () => {
  const expanded = new Set(['company']);

  test('Right expands a closed node, then moves to its first child, and does nothing on a leaf', () => {
    expect(treeExpandOrDescend(tree, expanded, 'eng')).toEqual({ expand: 'eng' });
    expect(treeExpandOrDescend(tree, new Set(['company', 'eng']), 'eng')).toEqual({ focus: 'sre' });
    expect(treeExpandOrDescend(tree, expanded, 'ceo')).toBeNull();
  });

  test('Left collapses an open node, otherwise moves to the parent, and does nothing on a closed root', () => {
    expect(treeCollapseOrAscend(tree, expanded, 'company')).toEqual({ collapse: 'company' });
    expect(treeCollapseOrAscend(tree, expanded, 'eng')).toEqual({ focus: 'company' });
    expect(treeCollapseOrAscend(tree, none, 'orphan')).toBeNull();
  });
});

test('level, set size and position are what aria-level, aria-setsize and aria-posinset need', () => {
  expect([treeLevel(tree, 'company'), treeSetSize(tree, 'company'), treePosInSet(tree, 'company')]).toEqual([
    1, 2, 1,
  ]);
  expect([treeLevel(tree, 'gtm'), treeSetSize(tree, 'gtm'), treePosInSet(tree, 'gtm')]).toEqual([2, 4, 4]);
  expect([treeLevel(tree, 'oncall'), treeSetSize(tree, 'oncall'), treePosInSet(tree, 'oncall')]).toEqual([
    4, 1, 1,
  ]);
});

test('revealing a deep node opens exactly its ancestors, and keeps what was already open', () => {
  expect(treeAncestors(tree, 'oncall')).toEqual(['company', 'eng', 'sre']);
  expect([...treeExpandTo(tree, new Set(['gtm']), 'oncall')].sort()).toEqual(
    ['company', 'eng', 'gtm', 'sre'].sort(),
  );
});

describe('type ahead', () => {
  const open = new Set(['company', 'eng']);

  test('matches the start of a visible label, case insensitively, after the current row', () => {
    expect(treeTypeAhead(tree, open, 'company', 's')).toBe('swe');
    expect(treeTypeAhead(tree, open, 'company', 'SOFT')).toBe('swe');
    // Reliability's child is not visible, so "engineer on call" is not a match.
    expect(treeTypeAhead(tree, open, 'swe', 'engineer o')).toBeNull();
  });

  test('with nothing focused it starts at the top', () => {
    expect(treeTypeAhead(tree, open, null, 'n')).toBe('company');
    expect(treeTypeAhead(tree, open, null, 'ni')).toBe('company');
  });

  test('the same letter again cycles through the rows it starts, wrapping', () => {
    expect(treeTypeAhead(tree, all, 'company', 'e')).toBe('eng');
    expect(treeTypeAhead(tree, all, 'eng', 'ee')).toBe('oncall');
    expect(treeTypeAhead(tree, all, 'oncall', 'eee')).toBe('orphan');
    expect(treeTypeAhead(tree, all, 'orphan', 'eeee')).toBe('eng');
  });

  test('a longer word stays on the row it already matches', () => {
    expect(treeTypeAhead(tree, open, 'eng', 'en')).toBe('eng');
  });

  test('never starts a word with a zoom or fit key, a modified key or a space', () => {
    const empty = { text: '', at: 0 };
    const now = 10_000;
    for (const key of ['+', '-', '0']) expect(isTypeAheadKey({ key }, empty, now)).toBe(false);
    expect(isTypeAheadKey({ key: 'z', ctrlKey: true }, empty, now)).toBe(false);
    expect(isTypeAheadKey({ key: 'ArrowDown' }, empty, now)).toBe(false);
    expect(isTypeAheadKey({ key: ' ' }, empty, now)).toBe(false);
    expect(isTypeAheadKey({ key: ' ' }, { text: 'go', at: now - 100 }, now)).toBe(true);
    expect(isTypeAheadKey({ key: '1' }, empty, now)).toBe(true);
    // Inside a word they are ordinary characters: "Q3 2026" is typed whole.
    expect(isTypeAheadKey({ key: '0' }, { text: 'q3 2', at: now - 100 }, now)).toBe(true);
    expect(isTypeAheadKey({ key: '-' }, { text: 'on', at: now - 100 }, now)).toBe(true);
  });

  test('a word a pause has ended does not make a reserved key the middle of one', () => {
    const stale = { text: 'q', at: 1000 };
    const later = 1000 + TYPE_AHEAD_RESET_MS + 1;
    for (const key of ['+', '-', '0', ' ']) {
      expect(isTypeAheadKey({ key }, stale, later)).toBe(false);
    }
    // Still within the pause, the same key continues the word.
    expect(isTypeAheadKey({ key: '0' }, stale, 1000 + TYPE_AHEAD_RESET_MS)).toBe(true);
  });

  test('a pause longer than the reset starts a new word', () => {
    let state = typeAheadBuffer({ text: '', at: 0 }, 'g', 1000);
    state = typeAheadBuffer(state, 'o', 1000 + TYPE_AHEAD_RESET_MS - 1);
    expect(state.text).toBe('go');
    state = typeAheadBuffer(state, 's', 1000 + 2 * TYPE_AHEAD_RESET_MS + 1);
    expect(state.text).toBe('s');
  });
});

test('a duplicated id is refused by name', () => {
  expect(() =>
    createTreeModel([
      { id: 'a', label: 'A' },
      { id: 'a', label: 'A again' },
    ]),
  ).toThrow(/"a" appears twice/);
});
