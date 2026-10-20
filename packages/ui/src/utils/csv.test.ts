/**
 * A table as CSV a spreadsheet opens as the same table, and never as a
 * formula somebody else wrote.
 */

import { expect, test } from 'vitest';
import { parseCsv, toCsv } from './csv.js';

test('writes RFC 4180: a header, CRLF line ends, quoted fields only where needed', () => {
  expect(toCsv(['name', 'note'], [['Ana', 'plain'], ['Ben', 'a, b'], ['Cy', 'say "hi"'], ['Di', 'two\nlines']])).toBe(
    'name,note\r\nAna,plain\r\nBen,"a, b"\r\nCy,"say ""hi"""\r\nDi,"two\nlines"\r\n',
  );
});

test('writes each type as its plain value', () => {
  const when = new Date('2026-10-18T09:30:00Z');
  expect(toCsv(['a', 'b', 'c', 'd', 'e', 'f'], [[null, undefined, 3.5, true, when, { k: [1, 2] }]])).toBe(
    'a,b,c,d,e,f\r\n,,3.5,true,2026-10-18T09:30:00.000Z,"{""k"":[1,2]}"\r\n',
  );
});

test('defuses text a spreadsheet would run as a formula, and leaves numbers alone', () => {
  const csv = toCsv(['cell'], [['=HYPERLINK("https://example.com")'], ['+1'], ['-x'], ['@SUM(A1)'], ['\tlead'], [-3], ['safe']]);
  expect(csv.split('\r\n').slice(1, -1)).toEqual([`"'=HYPERLINK(""https://example.com"")"`, "'+1", "'-x", "'@SUM(A1)", "'\tlead", '-3', 'safe']);
});

test('defuses a header too, since a column name can come from data', () => {
  expect(toCsv(['=cmd'], [])).toBe("'=cmd\r\n");
});

const rowsOf = (text: string, options?: Parameters<typeof parseCsv>[1]) => {
  const result = parseCsv(text, options);
  if (!result.ok) throw new Error(`refused: ${result.problem} on line ${result.line}`);
  return result.rows;
};

test('reads RFC 4180: quoted separators, doubled quotes and line breaks inside a field', () => {
  expect(rowsOf('name,note\r\nAna,plain\r\nBen,"a, b"\r\nCy,"say ""hi"""\r\nDi,"two\nlines"\r\n')).toEqual([
    ['name', 'note'],
    ['Ana', 'plain'],
    ['Ben', 'a, b'],
    ['Cy', 'say "hi"'],
    ['Di', 'two\nlines'],
  ]);
});

test('takes LF, CR and CRLF line ends, drops a byte order mark, and reads a last line without a break', () => {
  expect(rowsOf('﻿a,b\nc,d\re,f\r\ng,h')).toEqual([
    ['a', 'b'],
    ['c', 'd'],
    ['e', 'f'],
    ['g', 'h'],
  ]);
});

test('keeps empty fields and short records as written', () => {
  expect(rowsOf('a,b,c\n,,\nonly\n""\n')).toEqual([['a', 'b', 'c'], ['', '', ''], ['only'], ['']]);
  expect(rowsOf('')).toEqual([]);
});

test('keeps a quote inside an unquoted field as text', () => {
  expect(rowsOf('size\n12" pipe\n')).toEqual([['size'], ['12" pipe']]);
});

test('finds the separator the first record uses: a semicolon or a tab', () => {
  const semi = parseCsv('a;b;"c;d"\n1;2;3\n');
  expect(semi.ok && semi.delimiter).toBe(';');
  expect(semi.ok && semi.rows).toEqual([
    ['a', 'b', 'c;d'],
    ['1', '2', '3'],
  ]);
  expect(rowsOf('a\tb\n1\t2')).toEqual([
    ['a', 'b'],
    ['1', '2'],
  ]);
  expect(rowsOf('a;b,c', { delimiter: ',' })).toEqual([['a;b', 'c']]);
});

test('reads back what toCsv writes, defused formulas included', () => {
  const header = ['cell', 'n'];
  const rows = [['=HYPERLINK("https://example.com")', '-3'], ['+1', 'a, "b"\nc'], ['@SUM(A1)', 'plain']];
  expect(rowsOf(toCsv(header, rows))).toEqual([header, ...rows]);
});

test('refuses an opened quote that never closes, naming the line it opened on', () => {
  expect(parseCsv('a,b\nc,"never\nclosed')).toEqual({ ok: false, problem: 'unterminated_quote', line: 2 });
});

test('refuses more records than maxRows rather than cutting them silently', () => {
  expect(parseCsv('h\n1\n2\n', { maxRows: 3 }).ok).toBe(true);
  expect(parseCsv('h\n1\n2\n3\n', { maxRows: 3 })).toEqual({ ok: false, problem: 'too_many_rows', line: 4 });
  expect(parseCsv('h\n1\n2\n3', { maxRows: 3 })).toEqual({ ok: false, problem: 'too_many_rows', line: 4 });
});
