/**
 * The grammar's own rules: what reading a body yields, before any renderer or
 * editor draws it. The renderers' suites hold what each draws; these hold the
 * parts both depend on.
 */
import { describe, expect, test } from 'vitest';
import {
  markdownCodeText,
  markdownInline,
  parseMarkdown,
  parseMarkdownSpans,
  safeHref,
  type MarkdownBlock,
} from './grammar.js';

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
    expect(inline('[a \\] b](#/doclet/pages/1)')[0]).toEqual(
      expect.objectContaining({ label: 'a \\] b', href: '#/doclet/pages/1' }),
    );
  });

  test('keeps its title', () => {
    expect(inline('[docs](https://example.com "The docs")')[0]).toEqual(
      expect.objectContaining({ href: 'https://example.com', hrefTitle: 'The docs' }),
    );
  });

  test('is followed only on an allowed scheme', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('#/worklet/ENG-1')).toBe('#/worklet/ENG-1');
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

describe('a list item', () => {
  /** The blocks of the only item of the only list `source` reads as. */
  const itemBlocks = (source: string, item = 0) => {
    const [list] = parseMarkdown(source);
    if (list?.kind !== 'list') throw new Error(`not a list: ${JSON.stringify(list)}`);
    return list.items[item]?.blocks;
  };

  test('reads a fence at its content indent as a code block, holding a YAML list as text', () => {
    // crewlet/crewlet#1207: the fence read as a paragraph of three backticks,
    // and its `- name:` line, written back, became an item of its own.
    const source = [
      '1. Add this:',
      '',
      '   ```yaml',
      '   mcp_servers:',
      '     - name: x',
      '   ```',
      '',
      '   It is pinned ([see](#x)).',
    ].join('\n');
    expect(parseMarkdown(source)).toEqual([
      {
        kind: 'list',
        ordered: true,
        start: 1,
        marker: '.',
        loose: true,
        items: [
          {
            checked: null,
            blocks: [
              { kind: 'paragraph', text: 'Add this:' },
              { kind: 'code', lang: 'yaml', text: 'mcp_servers:\n  - name: x', fence: '```' },
              { kind: 'paragraph', text: 'It is pinned ([see](#x)).' },
            ],
          },
        ],
      },
    ]);
  });

  test('reads a tilde fence, and one that opens on the marker line', () => {
    expect(itemBlocks('- run\n\n  ~~~sh\n  echo "- not an item"\n  ~~~')).toEqual([
      { kind: 'paragraph', text: 'run' },
      { kind: 'code', lang: 'sh', text: 'echo "- not an item"', fence: '~~~' },
    ]);
    expect(itemBlocks('1. ```go\n   x := 1\n   ```\n2. b')).toEqual([
      { kind: 'code', lang: 'go', text: 'x := 1', fence: '```' },
    ]);
  });

  test('keeps blank lines inside a fence, which do not end the item', () => {
    expect(itemBlocks('- a\n\n  ```\n  one\n\n\n  two\n  ```\n- b')).toEqual([
      { kind: 'paragraph', text: 'a' },
      { kind: 'code', lang: '', text: 'one\n\n\ntwo', fence: '```' },
    ]);
  });

  test('closes a fence on a line indented differently from its opening', () => {
    expect(itemBlocks('- a\n\n  ```\n  x\n     ```\n\n  after')).toEqual([
      { kind: 'paragraph', text: 'a' },
      { kind: 'code', lang: '', text: 'x', fence: '```' },
      { kind: 'paragraph', text: 'after' },
    ]);
    // Opened a space in, its lines lose that space too.
    expect(itemBlocks('- a\n\n   ```\n   x\n    y\n  ```')).toEqual([
      { kind: 'paragraph', text: 'a' },
      { kind: 'code', lang: '', text: 'x\n y', fence: '```' },
    ]);
  });

  test('measures a multi-digit marker: the content of `10. ` starts at column four', () => {
    const source = '9. nine\n10. ten\n\n    ```\n    x\n    ```\n11. eleven';
    expect(itemBlocks(source, 1)).toEqual([
      { kind: 'paragraph', text: 'ten' },
      { kind: 'code', lang: '', text: 'x', fence: '```' },
    ]);
    expect(parseMarkdown(source)[0]).toEqual(expect.objectContaining({ start: 9, loose: true }));
  });

  test('reads a nested list, a quote, a table and a heading among its blocks', () => {
    expect(
      itemBlocks(
        ['- intro', '', '  > quoted', '  > on', '', '  | a | b |', '  |---|---|', '  | 1 | 2 |', '', '  ## Part', '', '  - inner', '  - more'].join(
          '\n',
        ),
      ),
    ).toEqual([
      { kind: 'paragraph', text: 'intro' },
      { kind: 'quote', blocks: [{ kind: 'paragraph', text: 'quoted\non' }] },
      { kind: 'table', head: ['a', 'b'], align: ['left', 'left'], rows: [['1', '2']] },
      { kind: 'heading', level: 2, text: 'Part' },
      {
        kind: 'list',
        ordered: false,
        start: 1,
        marker: '-',
        loose: false,
        items: [
          { checked: null, blocks: [{ kind: 'paragraph', text: 'inner' }] },
          { checked: null, blocks: [{ kind: 'paragraph', text: 'more' }] },
        ],
      },
    ]);
  });

  test('continues a paragraph on a lazy line, and ends at a line that starts a block', () => {
    expect(itemBlocks('- a\nb')).toEqual([{ kind: 'paragraph', text: 'a\nb' }]);
    // Lazy into a nested item's paragraph too.
    expect(itemBlocks('- a\n  - b\nc')).toEqual([
      { kind: 'paragraph', text: 'a' },
      expect.objectContaining({ items: [{ checked: null, blocks: [{ kind: 'paragraph', text: 'b\nc' }] }] }),
    ]);
    // A fence, a heading or a quote is not lazy: the list ends there.
    expect(parseMarkdown('- a\n```\nx\n```').map((b) => b.kind)).toEqual(['list', 'code']);
    expect(parseMarkdown('- a\n# H').map((b) => b.kind)).toEqual(['list', 'heading']);
    // Nor is any line after a fence, which is not a paragraph.
    expect(parseMarkdown('- ```\n  x\n  ```\ny').map((b) => b.kind)).toEqual(['list', 'paragraph']);
  });

  test('is loose when a blank line stands between two of its blocks, and not for one inside a block', () => {
    expect(parseMarkdown('- a\n  ```\n  x\n  ```\n- b')[0]).toEqual(expect.objectContaining({ loose: false }));
    expect(parseMarkdown('- a\n\n  b\n- c')[0]).toEqual(expect.objectContaining({ loose: true }));
    expect(parseMarkdown('- a\n  ```\n  x\n\n  y\n  ```\n- b')[0]).toEqual(expect.objectContaining({ loose: false }));
    // A blank line between a nested list's items makes that list loose, not its parent.
    const [outer] = parseMarkdown('- a\n  - b\n\n  - c\n- d');
    expect(outer).toEqual(expect.objectContaining({ loose: false }));
    expect(outer?.kind === 'list' && outer.items[0]?.blocks[1]).toEqual(expect.objectContaining({ loose: true }));
  });

  test('takes only lines indented to its content, as CommonMark does', () => {
    // Two spaces under a three-wide marker is not the item's: after a blank
    // line it is a paragraph of its own, and a marker there is a sibling.
    expect(parseMarkdown('1. a\n\n  b').map((b) => b.kind)).toEqual(['list', 'paragraph']);
    expect(parseMarkdown('- a\n - b')[0]).toEqual(expect.objectContaining({ items: [expect.anything(), expect.anything()] }));
    expect(parseMarkdown('1. a\n  - b').map((b) => b.kind)).toEqual(['list', 'list']);
  });

  test('may start with one blank line, not two', () => {
    expect(itemBlocks('-\n  foo')).toEqual([{ kind: 'paragraph', text: 'foo' }]);
    expect(parseMarkdown('-\n\n  foo')).toEqual([
      expect.objectContaining({ kind: 'list', items: [{ checked: null, blocks: [] }] }),
      // A paragraph keeps its lines as written; reading inline collapses the indent.
      { kind: 'paragraph', text: '  foo' },
    ]);
  });
});

describe('reading a body', () => {
  /**
   * The work parsing `source` takes, COUNTED rather than timed: every
   * regular-expression evaluation and every trim the grammar makes, the two
   * ways it reads a line. A replaced `exec` is called by `test`, `match`,
   * `replace` and `split` too.
   */
  const work = (source: string): number => {
    const exec = RegExp.prototype.exec;
    const trim = String.prototype.trim;
    let calls = 0;
    RegExp.prototype.exec = function (this: RegExp, text: string) {
      calls++;
      return exec.call(this, text);
    };
    String.prototype.trim = function (this: string) {
      calls++;
      return trim.call(this);
    };
    try {
      parseMarkdown(source);
    } finally {
      RegExp.prototype.exec = exec;
      String.prototype.trim = trim;
    }
    return calls;
  };

  /** Items nested `depth` deep, then `pairs` of a line indented to the innermost item and a lazy line. */
  const nestedLazy = (depth: number, pairs: number) => {
    const lines: string[] = [];
    for (let d = 0; d < depth; d++) lines.push(`${'  '.repeat(d)}- level ${d}`);
    for (let i = 0; i < pairs; i++) lines.push(`${'  '.repeat(depth)}indented ${i}`, `lazy ${i}`);
    return lines.join('\n') + '\n';
  };

  // Twice the lines must take about twice the work. A parse that re-read an
  // item's lines for each lazy line took four times the work at depth one and
  // sixteen at depth three, and seconds for a few kilobytes.
  test.each([1, 2, 3, 4])('grows linearly with lazy lines in items %i deep', (depth) => {
    const ratio = work(nestedLazy(depth, 60)) / work(nestedLazy(depth, 30));
    expect(ratio).toBeLessThan(2.2);
  });

  test('grows linearly with a run of blank lines inside an item', () => {
    const run = (blanks: number) => `- a\n\n  \`\`\`\n${'\n'.repeat(blanks)}  x\n  \`\`\`\n`;
    expect(work(run(2000)) / work(run(1000))).toBeLessThan(2.2);
  });

  test('reads lazy lines in nested items as the innermost paragraph', () => {
    const [list] = parseMarkdown(nestedLazy(3, 2));
    const inner = (block: MarkdownBlock | undefined): MarkdownBlock | undefined =>
      block?.kind === 'list' ? inner(block.items[0]?.blocks[block.items[0].blocks.length - 1]) : block;
    expect(inner(list)).toEqual({ kind: 'paragraph', text: 'level 2\nindented 0\nlazy 0\nindented 1\nlazy 1' });
  });
});

describe('a code span', () => {
  test('reads a line ending inside it as a space', () => {
    const [m] = [...markdownInline('`Tasks | About\n| History`')];
    expect(markdownCodeText(m?.groups.code ?? '')).toBe('Tasks | About | History');
  });
});

describe('a list under a line of text', () => {
  // CommonMark 5.3: only a bullet item with text, or a numbered one from 1,
  // interrupts a paragraph.
  test.each([
    ['a number other than 1', 'It took\n365) days in all'],
    ['a number other than 1, with a dot', 'see\n2. below'],
    ['an empty bullet', 'The total is\n-\nand more'],
  ])('is the paragraph\'s next line when it starts with %s', (_case, source) => {
    expect(parseMarkdown(source)).toEqual([{ kind: 'paragraph', text: source }]);
  });

  test.each([
    ['a bullet with text', 'Steps\n- one'],
    ['the number 1', 'Steps\n1. one'],
  ])('starts a list when it begins with %s', (_case, source) => {
    expect(parseMarkdown(source).map((b) => b.kind)).toEqual(['paragraph', 'list']);
  });

  test("holds inside an item's paragraph too", () => {
    expect(parseMarkdown('- It took\n  365) days')[0]).toEqual(
      expect.objectContaining({ items: [{ checked: null, blocks: [{ kind: 'paragraph', text: 'It took\n365) days' }] }] }),
    );
    expect(parseMarkdown('5. a\n   3. b')[0]).toEqual(
      expect.objectContaining({ loose: false, items: [{ checked: null, blocks: [{ kind: 'paragraph', text: 'a\n3. b' }] }] }),
    );
  });

  test('a lazy line that is a marker still ends the item', () => {
    expect(parseMarkdown('- a\n2. b').map((b) => b.kind)).toEqual(['list', 'list']);
  });
});

describe('a fence', () => {
  test('opens on three or more, and closes on a run of its character at least as long', () => {
    expect(parseMarkdown('````md\n```\ninside\n```\n````')).toEqual([
      { kind: 'code', lang: 'md', text: '```\ninside\n```', fence: '```' },
    ]);
    expect(parseMarkdown('~~~~\na\n~~~\n~~~~~')).toEqual([{ kind: 'code', lang: '', text: 'a\n~~~', fence: '~~~' }]);
  });

  test('closes on a line indented up to three spaces, and no further', () => {
    expect(parseMarkdown('   ```\n    ```\n~~~')).toEqual([{ kind: 'code', lang: '', text: ' ```\n~~~', fence: '```' }]);
    expect(parseMarkdown('```\na\n   ```\nafter').map((b) => b.kind)).toEqual(['code', 'paragraph']);
  });
});

describe('a backtick string', () => {
  const codes = (text: string) => [...markdownInline(text)].map((m) => m.groups.code).filter((c) => c !== undefined);

  test('is a whole run: three alone are literal, not an empty span and one more', () => {
    expect(codes('```')).toEqual([]);
    expect(codes('a ``` b')).toEqual([]);
  });

  test('closes only on a run of exactly its length', () => {
    expect(codes('`` a ``` b ``')).toEqual([' a ``` b ']);
    expect(codes('`a``b`')).toEqual(['a``b']);
  });

  test('may follow an escaped backtick', () => {
    expect(codes('\\``a`')).toEqual(['a']);
  });

  test("loses a space from each end only when both have one", () => {
    expect(markdownCodeText(' `a` ')).toBe('`a`');
    expect(markdownCodeText(' a')).toBe(' a');
    expect(markdownCodeText('  ')).toBe('  ');
  });
});

describe('a lazy line', () => {
  test('continues a quote\'s paragraph, as CommonMark reads it', () => {
    expect(parseMarkdown('> a\nb')).toEqual([{ kind: 'quote', blocks: [{ kind: 'paragraph', text: 'a\nb' }] }]);
    expect(parseMarkdown('> a\n\nb').map((b) => b.kind)).toEqual(['quote', 'paragraph']);
    expect(parseMarkdown('> a\n# h').map((b) => b.kind)).toEqual(['quote', 'heading']);
  });
});

describe('a list item whose first line is a table header', () => {
  test('holds the table, as GFM reads it, rather than being a table itself', () => {
    expect(parseMarkdown('- | a |\n  | --- |\n  | b |')).toEqual([
      expect.objectContaining({
        kind: 'list',
        items: [{ checked: null, blocks: [{ kind: 'table', head: ['a'], align: ['left'], rows: [['b']] }] }],
      }),
    ]);
  });
});

describe('a table row', () => {
  test('is any line until a blank one or another block, as GitHub reads a table', () => {
    expect(parseMarkdown('| a |\n| --- |\nb')).toEqual([{ kind: 'table', head: ['a'], align: ['left'], rows: [['b']] }]);
    expect(parseMarkdown('| a |\n| --- |\n> q').map((b) => b.kind)).toEqual(['table', 'quote']);
    expect(parseMarkdown('| a |\n| --- |\n\nb').map((b) => b.kind)).toEqual(['table', 'paragraph']);
  });
});

describe('a list and the next', () => {
  test('a change of bullet or delimiter starts a new list, as CommonMark reads it', () => {
    expect(parseMarkdown('- a\n* b').map((b) => b.kind)).toEqual(['list', 'list']);
    expect(parseMarkdown('1. a\n1) b').map((b) => b.kind)).toEqual(['list', 'list']);
    expect(parseMarkdown('- a\n\n\n\n* b').map((b) => b.kind)).toEqual(['list', 'list']);
  });

  test('any number of blank lines before the next item keep one list, loose', () => {
    expect(parseMarkdown('- a\n\n\n- b')).toEqual([
      expect.objectContaining({
        kind: 'list',
        loose: true,
        items: [
          { checked: null, blocks: [{ kind: 'paragraph', text: 'a' }] },
          { checked: null, blocks: [{ kind: 'paragraph', text: 'b' }] },
        ],
      }),
    ]);
  });
});

describe('a line indented four or more', () => {
  test('is not a sibling item, but the text of the item before it (spec example 312)', () => {
    const [list] = parseMarkdown('- a\n - b\n  - c\n   - d\n    - e');
    expect(list).toEqual(
      expect.objectContaining({
        items: ['a', 'b', 'c', 'd\n- e'].map((text) => ({ checked: null, blocks: [{ kind: 'paragraph', text }] })),
      }),
    );
  });

  test('after a blank line, ends the list rather than starting an item (spec example 313)', () => {
    const blocks = parseMarkdown('1. a\n\n  2. b\n\n    3. c');
    expect(blocks.map((b) => b.kind)).toEqual(['list', 'paragraph']);
    expect(blocks[0]).toEqual(expect.objectContaining({ items: [expect.anything(), expect.anything()] }));
  });

  test('starts no list or rule of its own', () => {
    expect(parseMarkdown('    - x')).toEqual([{ kind: 'paragraph', text: '    - x' }]);
    expect(parseMarkdown('a\n    ---')).toEqual([{ kind: 'paragraph', text: 'a\n    ---' }]);
  });
});

describe('a tab', () => {
  test('before a fence closer is the columns it fills, from where the line starts', () => {
    // In a "- " item the tab starts at column two and fills two columns: the
    // close is indented two, which closes.
    expect(parseMarkdown('- a\n\n  ```\n  x\n  \t```\n\n  after')).toEqual([
      expect.objectContaining({
        items: [
          {
            checked: null,
            blocks: [
              { kind: 'paragraph', text: 'a' },
              { kind: 'code', lang: '', text: 'x', fence: '```' },
              { kind: 'paragraph', text: 'after' },
            ],
          },
        ],
      }),
    ]);
  });

  test("after a quote's marker gives one column to the marker and keeps the rest", () => {
    // ">" then a space then a tab at column two, two columns wide: the close
    // is indented two, which closes.
    expect(parseMarkdown('> ```\n> x\n> \t```\n\nafter')).toEqual([
      { kind: 'quote', blocks: [{ kind: 'code', lang: '', text: 'x', fence: '```' }] },
      { kind: 'paragraph', text: 'after' },
    ]);
    // ">" then a tab: one column of the tab is the marker's space, and the two
    // left over indent the fence by two, which its lines lose.
    expect(parseMarkdown('>\t```\n>\t  y\n>\t```')).toEqual([
      { kind: 'quote', blocks: [{ kind: 'code', lang: '', text: '  y', fence: '```' }] },
    ]);
  });

  test('in a code line of an item stays a tab', () => {
    expect(parseMarkdown('- a\n\n  ```go\n  \treturn\n  ```')[0]).toEqual(
      expect.objectContaining({
        items: [
          {
            checked: null,
            blocks: [
              { kind: 'paragraph', text: 'a' },
              { kind: 'code', lang: 'go', text: '\treturn', fence: '```' },
            ],
          },
        ],
      }),
    );
  });
});

describe('a line that opens an HTML block', () => {
  test('ends the paragraph above it, and is a paragraph of its own', () => {
    expect(parseMarkdown('a\n<!-- note -->')).toEqual([
      { kind: 'paragraph', text: 'a' },
      { kind: 'paragraph', text: '<!-- note -->' },
    ]);
    expect(parseMarkdown('a\n<div class="x">').map((b) => b.kind)).toEqual(['paragraph', 'paragraph']);
  });

  test('is not a lazy line of an item, or a row of a table', () => {
    expect(parseMarkdown('- a\n<!-- contract:end -->')).toEqual([
      expect.objectContaining({ kind: 'list', items: [{ checked: null, blocks: [{ kind: 'paragraph', text: 'a' }] }] }),
      { kind: 'paragraph', text: '<!-- contract:end -->' },
    ]);
    expect(parseMarkdown('| a |\n| --- |\n<!-- x -->').map((b) => b.kind)).toEqual(['table', 'paragraph']);
  });

  test('an inline tag, which opens no block, continues the paragraph', () => {
    expect(parseMarkdown('a\n<span>b</span>')).toEqual([{ kind: 'paragraph', text: 'a\n<span>b</span>' }]);
  });
});
