/**
 * The grammar's own rules: what reading a body yields, before any renderer or
 * editor draws it. The renderers' suites hold what each draws; these hold the
 * parts both depend on.
 */
import { describe, expect, test } from 'vitest';
import { markdownInline, parseMarkdown, parseMarkdownSpans, safeHref } from './grammar.js';

const inline = (text: string) => [...markdownInline(text)].map((m) => m.groups);

describe('a backslash escape', () => {
  test('is the character it escapes, and opens nothing', () => {
    expect(inline('\\*not em\\*')).toEqual([{ esc: '*' }, { esc: '*' }].map((g) => expect.objectContaining(g)));
    expect(inline('\\`no code`').map((g) => g.esc ?? g.code)).toEqual(['`']);
  });

  test('escapes ASCII punctuation only, so a path keeps its backslashes', () => {
    expect(inline('C:\\path\\to')).toEqual([]);
  });

  test('is literal inside a code span', () => {
    expect(inline('`a\\*b`')[0]?.code).toBe('a\\*b');
  });
});

describe('a link', () => {
  test('may hold a picture in its label, which neither ends the label nor gives the link its address', () => {
    expect(inline('[![build](ci/badge.svg)](https://example.com/ci)')).toEqual([
      expect.objectContaining({ label: '![build](ci/badge.svg)', href: 'https://example.com/ci' }),
    ]);
    expect(inline('see [the ![rota](r.png "Rota") page](https://example.com/oncall) now')).toEqual([
      expect.objectContaining({ label: 'the ![rota](r.png "Rota") page', href: 'https://example.com/oncall' }),
    ]);
    // A picture on its own is still a picture, and a bracket alone still ends a label.
    expect(inline('![rota](r.png)')[0]).toEqual(expect.objectContaining({ alt: 'rota', src: 'r.png' }));
    expect(inline('[a ! b](x) and ](y)')[0]).toEqual(expect.objectContaining({ label: 'a ! b', href: 'x' }));
  });

  test('may carry an escaped bracket in its label', () => {
    expect(inline('[a \\] b](#/knowledge/pages/1)')[0]).toEqual(
      expect.objectContaining({ label: 'a \\] b', href: '#/knowledge/pages/1' }),
    );
  });

  test('keeps its title', () => {
    expect(inline('[docs](https://example.com "The docs")')[0]).toEqual(
      expect.objectContaining({ href: 'https://example.com', hrefTitle: 'The docs' }),
    );
  });

  test('is followed only on an allowed scheme', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('#/work/ENG-1')).toBe('#/work/ENG-1');
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('java\tscript:alert(1)')).toBeNull();
  });
});

describe('a callout', () => {
  test('is a quote whose first line names a tone', () => {
    expect(parseMarkdown('> [!WARNING]\n> Mind the gap.')).toEqual([
      { kind: 'callout', tone: 'warning', blocks: [{ kind: 'paragraph', text: 'Mind the gap.' }] },
    ]);
  });

  test('reads its tone in any case, and only on the first line', () => {
    expect(parseMarkdown('> [!tip]\n> x')[0]).toEqual(expect.objectContaining({ kind: 'callout', tone: 'tip' }));
    expect(parseMarkdown('> A quote\n> [!NOTE]')[0]).toEqual(expect.objectContaining({ kind: 'quote' }));
    expect(parseMarkdown('> [!SOMETHING]\n> x')[0]).toEqual(expect.objectContaining({ kind: 'quote' }));
  });
});

describe('a table', () => {
  test('reads an escaped pipe as a pipe of its cell, inside a code span too', () => {
    expect(parseMarkdown('| a | b |\n|---|---|\n| x \\| y | `p\\|q` |')[0]).toEqual({
      kind: 'table',
      head: ['a', 'b'],
      align: ['left', 'left'],
      rows: [['x | y', '`p|q`']],
    });
  });
});

describe('a list', () => {
  test('records its marker and whether it is loose', () => {
    expect(parseMarkdown('* a\n* b')[0]).toEqual(expect.objectContaining({ marker: '*', loose: false }));
    expect(parseMarkdown('1) a\n\n2) b')[0]).toEqual(expect.objectContaining({ marker: ')', loose: true, ordered: true }));
  });
});

describe('the spans of a body', () => {
  test('name the lines each top-level block was read from', () => {
    const { spans } = parseMarkdownSpans('# T\n\npara\nwrapped\n\n- a\n- b\n\n```\ncode\n```\n');
    expect(spans.map((s) => [s.block.kind, s.start, s.end])).toEqual([
      ['heading', 0, 1],
      ['paragraph', 2, 4],
      ['list', 5, 7],
      ['code', 8, 11],
    ]);
  });
});
