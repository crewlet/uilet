/**
 * What a host does with a diff's lines: split a text, count, collapse to the
 * changes and cut a preview.
 */

import { describe, expect, test } from 'vitest';
import { collapseDiff, compareLines, diffStat, firstChangedLines, splitLines, type DiffLine } from './index.js';

/** Every line of two texts compared, unchanged ones included. */
function diffLines(before: string, after: string): DiffLine[] {
  const compared = compareLines(before, after, Infinity);
  if (compared.kind !== 'compared') throw new Error(`not compared: ${compared.kind}`);
  return compared.sections.flatMap((section) => [...section.lines]);
}

describe('splitting a document into lines', () => {
  test('a trailing newline is not a line, and a blank line in the middle is', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('a\nb')).toEqual(['a', 'b']);
    expect(splitLines('a\n\nb\n')).toEqual(['a', '', 'b']);
    expect(splitLines('')).toEqual([]);
  });

  test('both line endings read as one', () => {
    expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b']);
  });
});

describe('the summary', () => {
  test('says identical rather than zero and zero', () => {
    expect(diffStat(diffLines('same', 'same'))).toEqual({ added: 0, removed: 0, identical: true });
  });

  test('counts a replacement as one of each', () => {
    expect(diffStat(diffLines('a\nOLD', 'a\nNEW'))).toEqual({ added: 1, removed: 1, identical: false });
  });
});

describe('collapsing the unchanged runs', () => {
  const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
  const after = before.replace('line 15', 'CHANGED');

  test('keeps context either side of a change and counts the gap before it', () => {
    const sections = collapseDiff(diffLines(before, after), 2);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.lines.map((line) => line.text)).toEqual([
      'line 13',
      'line 14',
      'line 15',
      'CHANGED',
      'line 16',
      'line 17',
    ]);
    expect(sections[0]!.skipped).toBe(13);
  });

  test('two distant changes are two sections', () => {
    const edited = before.replace('line 2', 'TOP').replace('line 27', 'BOTTOM');
    const sections = collapseDiff(diffLines(before, edited), 1);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.skipped).toBe(1);
  });

  test('two identical documents collapse to nothing', () => {
    expect(collapseDiff(diffLines(before, before))).toEqual([]);
  });
});

describe('a preview of a change', () => {
  test('shows the first changed lines and counts the rest, never a quiet cut', () => {
    const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
    const after = before
      .replace('line 1\n', 'ONE\n')
      .replace('line 2\n', 'TWO\n')
      .replace('line 3\n', 'THREE\n')
      .replace('line 4\n', 'FOUR\n')
      .replace('line 27', 'TWENTY-SEVEN')
      .replace('line 28', 'TWENTY-EIGHT');
    const preview = firstChangedLines(collapseDiff(diffLines(before, after), 0), 6);
    const shown = preview.sections.flatMap((section) => section.lines);
    expect(shown.every((line) => line.kind !== 'same')).toBe(true);
    expect(shown).toHaveLength(6);
    expect(preview.more).toBe(6);
    expect(preview.sections[0]!.skipped).toBe(1);
  });
});
