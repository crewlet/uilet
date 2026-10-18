/**
 * The line diff a DiffView draws: what it pairs, what it numbers, and what it
 * says about the lines it leaves out.
 */

import { describe, expect, test } from 'vitest';
import { MAX_DIFF_LINES, collapseDiff, diffLines, diffStat, firstChangedLines, splitLines } from './index.js';

function shape(before: string, after: string): string[] {
  return diffLines(before, after).map((line) => `${line.kind[0]} ${line.text}`);
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

describe('the line diff', () => {
  test('keeps the unchanged lines as context', () => {
    expect(shape('one\ntwo', 'one\ntwo')).toEqual(['s one', 's two']);
  });

  test("puts a replaced line's removal above its addition", () => {
    expect(shape('one\nOLD\nthree', 'one\nNEW\nthree')).toEqual(['s one', 'r OLD', 'a NEW', 's three']);
  });

  test('finds the common subsequence rather than aligning by position', () => {
    expect(shape('a\nb\nc', 'a\nNEW\nb\nc')).toEqual(['s a', 'a NEW', 's b', 's c']);
  });

  test('handles an empty side in either direction', () => {
    expect(shape('', 'a\nb')).toEqual(['a a', 'a b']);
    expect(shape('a\nb', '')).toEqual(['r a', 'r b']);
    expect(shape('', '')).toEqual([]);
  });

  test('numbers each line in the document it belongs to', () => {
    const got = diffLines('one\nOLD\nthree', 'one\nNEW\nthree');
    expect(got.map((line) => [line.before, line.after])).toEqual([
      [1, 1],
      [2, null],
      [null, 2],
      [3, 3],
    ]);
  });

  test('reports a document past the cap as a whole replacement rather than building the table', () => {
    const big = Array.from({ length: MAX_DIFF_LINES + 1 }, (_, i) => `line ${i}`).join('\n');
    const got = diffLines(big, 'short');
    expect(got.filter((line) => line.kind === 'remove')).toHaveLength(MAX_DIFF_LINES + 1);
    expect(got.filter((line) => line.kind === 'add')).toHaveLength(1);
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
