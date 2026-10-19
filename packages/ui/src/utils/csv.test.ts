/**
 * A table as CSV a spreadsheet opens as the same table, and never as a
 * formula somebody else wrote.
 */

import { expect, test } from 'vitest';
import { toCsv } from './csv.js';

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
