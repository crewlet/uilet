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

  const empty = { checked: null, blocks: [] };

  test.each(['-', '*', '+'])('reads a bare %s on its own line as an empty item', (marker) => {
    expect(parseMarkdown(`${marker}\n${marker} b\n${marker}`)).toEqual([
      {
        kind: 'list',
        ordered: false,
        start: 1,
        marker,
        loose: false,
        items: [empty, { checked: null, blocks: [{ kind: 'paragraph', text: 'b' }] }, empty],
      },
    ]);
  });

  test('reads bare numbers as empty items, with or without the space an editor strips', () => {
    const list = { kind: 'list', ordered: true, start: 1, marker: '.', loose: false, items: [empty, empty, empty] };
    expect(parseMarkdown('## Steps\n\n1.\n2.\n3.')).toEqual([{ kind: 'heading', level: 2, text: 'Steps' }, list]);
    expect(parseMarkdown('1. \n2. \n3. ')).toEqual([list]);
    expect(parseMarkdown('1)\n2)')[0]).toEqual(expect.objectContaining({ marker: ')', items: [empty, empty] }));
  });

  test('reads a bare task marker as an empty task, ticked or not', () => {
    expect(parseMarkdown('- [ ]\n- [x]\n- [ ] ')[0]).toEqual(
      expect.objectContaining({
        items: [
          { checked: false, blocks: [] },
          { checked: true, blocks: [] },
          { checked: false, blocks: [] },
        ],
      }),
    );
  });

  test('does not let an empty item interrupt a paragraph, as CommonMark does not', () => {
    expect(parseMarkdown('The total is\n-\nand more')).toEqual([{ kind: 'paragraph', text: 'The total is\n-\nand more' }]);
    expect(parseMarkdown('Steps\n1.')).toEqual([{ kind: 'paragraph', text: 'Steps\n1.' }]);
    // An item with text still starts a list under a paragraph, as it always did.
    expect(parseMarkdown('Steps\n- one')[1]).toEqual(expect.objectContaining({ kind: 'list' }));
  });

  test('keeps a marker joined to its text as text', () => {
    expect(parseMarkdown('-x\n1.5 litres')).toEqual([{ kind: 'paragraph', text: '-x\n1.5 litres' }]);
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
