/**
 * The Markdown round trip: a load and a save with no edit change nothing, a
 * changed block is written in a spelling that reads back as what the writer
 * saw, and only the block that changed moves.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { Fragment, type Node as PMNode } from 'prosemirror-model';
import { parseMarkdown } from '../Markdown/index.js';
import { readMarkdown, signature, writeBlock, writeMarkdown } from './codec.js';
import { canonicalMarkdown } from './roundtrip.js';
import { schema } from './schema.js';

// By arithmetic on this file's path: Vite rewrites `new URL(…, import.meta.url)`.
const CORPUS = resolve(dirname(fileURLToPath(import.meta.url)), 'corpus');
const corpus = readdirSync(CORPUS)
  .filter((name) => name.endsWith('.md'))
  .map((name) => ({ name, text: readFileSync(join(CORPUS, name), 'utf8') }));

/** The same document with the paragraph at `index` given new text. */
function editParagraph(doc: PMNode, index: number, text: string): PMNode {
  const children: PMNode[] = [];
  doc.forEach((child, _o, i) => children.push(i === index ? schema.node('paragraph', null, schema.text(text)) : child));
  return doc.copy(schema.nodes.doc!.createChecked(null, children).content);
}

describe('a load and a save with no edit', () => {
  test('the corpus holds every block the editor writes', () => {
    const doc = readMarkdown(corpus.find((c) => c.name === 'every-block.md')!.text).doc;
    const seen = new Set<string>([doc.type.name]);
    doc.descendants((node) => {
      seen.add(node.type.name);
      for (const mark of node.marks) seen.add(mark.type.name);
    });
    for (const name of [...Object.keys(schema.nodes), ...Object.keys(schema.marks)]) {
      expect(seen, name).toContain(name);
    }
  });

  test.each(corpus)('changes nothing in $name', ({ text }) => {
    const { doc, source } = readMarkdown(text);
    expect(writeMarkdown(doc, source)).toBe(text);
  });

  test.each(corpus)('changes nothing in $name when every block is a copy of itself', ({ text }) => {
    // An undone edit hands back equal nodes rather than the same objects.
    const { doc, source } = readMarkdown(text);
    const copy = schema.nodeFromJSON(doc.toJSON());
    expect(writeMarkdown(copy, source)).toBe(text.replace(/\r\n/g, '\n').replace(/\n/g, source.crlf ? '\r\n' : '\n'));
  });
});

describe('the canonical spelling', () => {
  test.each(corpus)('of $name reads back as the same document', ({ text }) => {
    const doc = readMarkdown(text).doc;
    const written = writeMarkdown(doc);
    const back = readMarkdown(written).doc;
    expect(signature(back)).toBe(signature(doc));
    // And it is a fixed point: written again, it does not move.
    expect(writeMarkdown(back)).toBe(written);
  });

  test('escapes what would otherwise read as syntax', () => {
    const cases: [string, string][] = [
      ['a*b*c and 2*3', 'a\\*b\\*c and 2\\*3'],
      ['snake_case_name stays, _but this escapes', 'snake_case_name stays, \\_but this escapes'],
      ['# not a heading', '\\# not a heading'],
      ['1. not a list', '1\\. not a list'],
      ['- not a bullet', '\\- not a bullet'],
      ['> not a quote', '\\> not a quote'],
      ['use `ticks` here', 'use \\`ticks\\` here'],
      ['[not](a link)', '\\[not](a link)'],
      ['~~not struck~~', '\\~\\~not struck\\~\\~'],
      ['<https://example.com> stays text', '\\<https://example.com> stays text'],
      ['C:\\path\\to\\file', 'C:\\path\\to\\file'],
    ];
    for (const [text, want] of cases) {
      const node = schema.node('paragraph', null, schema.text(text));
      expect(writeBlock(node), text).toBe(want);
      expect(signature(readMarkdown(want).doc.firstChild!), text).toBe(signature(node));
    }
  });

  test('puts the spaces an emphasis run holds outside it', () => {
    const strong = schema.marks.strong!.create();
    const node = schema.node('paragraph', null, [schema.text('a '), schema.text('bold ', [strong]), schema.text('word')]);
    expect(writeBlock(node)).toBe('a **bold** word');
  });

  test('writes a code span no backtick inside it can close', () => {
    const code = schema.marks.code!.create();
    const node = schema.node('paragraph', null, schema.text('a `tick` inside', [code]));
    expect(writeBlock(node)).toBe('``a `tick` inside``');
    expect(signature(readMarkdown(writeBlock(node)).doc.firstChild!)).toBe(signature(node));
  });

  test('fences code with a run longer than any its own lines hold', () => {
    const node = schema.node('code_block', { lang: 'md', fence: '```' }, schema.text('```\ninside\n````'));
    expect(writeBlock(node)).toBe('`````md\n```\ninside\n````\n`````');
    expect(signature(readMarkdown(writeBlock(node)).doc.firstChild!)).toBe(signature(node));
  });

  test('fences code that holds an indented backtick line and a tilde line', () => {
    // Read: an opening on three, a line of three indented four (content), a
    // tilde line (content), and the end of the body.
    const text = '   ```\n    ```\n~~~';
    const written = canonicalMarkdown(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(readMarkdown(written).doc.childCount).toBe(1);
    expect(canonicalMarkdown(written)).toBe(written);
  });

  test('escapes a pipe inside a table cell', () => {
    const cell = (type: 'table_header' | 'table_cell', text: string) =>
      schema.node(type, { align: 'left' }, text ? schema.text(text) : undefined);
    const table = schema.node('table', null, [
      schema.node('table_row', null, [cell('table_header', 'a|b'), cell('table_header', 'c')]),
      schema.node('table_row', null, [cell('table_cell', 'x'), cell('table_cell', '')]),
    ]);
    expect(writeBlock(table)).toBe('| a\\|b | c |\n| --- | --- |\n| x |  |');
    expect(signature(readMarkdown(writeBlock(table)).doc.firstChild!)).toBe(signature(table));
  });

  test('keeps two lists of one kind apart', () => {
    const item = (text: string) => schema.node('list_item', null, schema.node('paragraph', null, schema.text(text)));
    const doc = schema.node('doc', null, [
      schema.node('bullet_list', null, [item('a')]),
      schema.node('bullet_list', null, [item('b')]),
    ]);
    const back = readMarkdown(writeMarkdown(doc)).doc;
    expect(back.childCount).toBe(2);
  });
});

describe('an edit', () => {
  test('moves only the lines of the block it changed', () => {
    const text = corpus.find((c) => c.name === 'every-block.md')!.text;
    const { doc, source } = readMarkdown(text);
    let index = -1;
    doc.forEach((child, _o, i) => {
      if (index < 0 && child.type.name === 'paragraph') index = i;
    });
    const written = writeMarkdown(editParagraph(doc, index, 'A new first paragraph.'), source);
    const before = text.split('\n');
    const after = written.split('\n');
    const removed = before.filter((line) => !after.includes(line));
    // The paragraph's four lines go and one comes, and nothing else moves.
    expect(removed).toHaveLength(4);
    expect(after.filter((line) => !before.includes(line))).toEqual(['A new first paragraph.']);
  });

  test('keeps CRLF line endings on a body that used them', () => {
    const text = corpus.find((c) => c.name === 'crlf.md')!.text;
    const { doc, source } = readMarkdown(text);
    expect(writeMarkdown(editParagraph(doc, 0, 'Line changed'), source)).toBe('Line changed\r\n\r\n- a\r\n- b\r\n');
  });
});

describe('emphasis around other marks', () => {
  test.each([
    ['**Check `search_degraded` first.** A failing'],
    ['- **`a` / `b`** and more'],
    ['**[a link](https://example.com) inside**'],
  ])('%s is written as one run', (text) => {
    expect(writeMarkdown(readMarkdown(text).doc)).toBe(text);
  });
});

describe('a table cell', () => {
  test('reads an escaped pipe in a code span as a pipe, and writes it escaped', () => {
    const text = '| Flag | What |\n|---|---|\n| `-mode group\\|instance` | a \\| b |';
    const doc = readMarkdown(text).doc;
    expect(doc.firstChild!.child(1).child(0).textContent).toBe('-mode group|instance');
    expect(writeMarkdown(doc)).toBe('| Flag | What |\n| --- | --- |\n| `-mode group\\|instance` | a \\| b |');
  });
});

describe('a list item holding blocks', () => {
  // Each is written as the canonical spelling writes it, so the round trip
  // must give back these bytes exactly, as well as the same blocks.
  const exact: [string, string][] = [
    [
      'a fence holding a YAML list, then a paragraph with a link (crewlet/crewlet#1207)',
      '1. Add this:\n\n   ```yaml\n   mcp_servers:\n     - name: x\n   ```\n\n   It is pinned ([see](#x)).',
    ],
    ['a tilde fence holding a list marker', '- run\n\n  ~~~sh\n  echo "- not an item"\n  ~~~'],
    ['a fence on the marker line, in a tight list', '1. ```go\n   x := 1\n   ```\n2. b'],
    ['a blank line inside a fence', '- a\n\n  ```\n  one\n\n  two\n  ```\n\n- b'],
    ['a nested list', '1. one\n   - a\n   - b\n2. two'],
    ['a quote', '- intro\n\n  > quoted\n\n- next'],
    ['a table', '- intro\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |'],
    ['a heading', '- intro\n\n  ## Part'],
    ['a multi-digit marker', '9. nine\n\n10. ten\n\n    ```\n    x\n    ```\n\n11. eleven'],
  ];

  test.each(exact)('%s round-trips byte for byte and block for block', (_name, text) => {
    const written = canonicalMarkdown(text);
    expect(written).toBe(text);
    expect(parseMarkdown(written)).toEqual(parseMarkdown(text));
    expect(canonicalMarkdown(written)).toBe(written);
  });

  // Spelled otherwise than the editor spells them: rewritten once, and then a
  // fixed point that reads as the same document.
  const respelled: [string, string][] = [
    ['a fence closing at another indent', '- a\n\n  ```\n  x\n     ```\n\n  after'],
    ['a lazy line', '- a\nb'],
    ['a lazy line under a nested item', '- a\n  - b\nc'],
    ['a tight paragraph and fence', '- a\n  ```\n  x\n  ```\n- b'],
    ['two lists of one kind in an item', '- a\n\n  - b\n\n\n  - c'],
    ['a tab-indented fence', '-\tdo\n\n\t```\n\tx\n\t```'],
  ];

  test.each(respelled)('%s is written once and then stays', (_name, text) => {
    const written = canonicalMarkdown(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(canonicalMarkdown(written)).toBe(written);
  });

  test('reads a fence in an item as a code block, never a paragraph of backticks', () => {
    const item = readMarkdown('1. Add this:\n\n   ```yaml\n   a: 1\n   ```').doc.firstChild!.firstChild!;
    expect(item.type.name).toBe('list_item');
    const kinds: string[] = [];
    item.forEach((child) => kinds.push(child.type.name));
    expect(kinds).toEqual(['paragraph', 'code_block']);
    expect(item.child(1).textContent).toBe('a: 1');
  });

  test('writes a list loose when one of its items needs a blank line between two blocks', () => {
    const p = (text: string) => schema.node('paragraph', null, schema.text(text));
    const list = schema.node('bullet_list', { marker: '-', loose: false }, [
      schema.node('list_item', null, [p('a'), p('b')]),
      schema.node('list_item', null, [p('c')]),
    ]);
    expect(writeBlock(list)).toBe('- a\n\n  b\n\n- c');
    // It reads back loose, which is what was written: the same list, loose.
    expect(signature(readMarkdown(writeBlock(list)).doc.firstChild!)).toBe(
      signature(list.type.create({ ...list.attrs, loose: true }, list.content)),
    );
  });

  test('writes a code block in an item at the item indent, wherever it stands', () => {
    const code = schema.node('code_block', { lang: 'sh', fence: '```' }, schema.text('echo\n\n  - x'));
    const list = schema.node('ordered_list', { start: 10, marker: '.', loose: false }, [
      schema.node('list_item', null, [schema.node('paragraph', null, schema.text('run')), code]),
    ]);
    expect(writeBlock(list)).toBe('10. run\n    ```sh\n    echo\n\n      - x\n    ```');
    expect(signature(readMarkdown(writeBlock(list)).doc.firstChild!)).toBe(signature(list));
  });
});

describe('a code span wrapped across lines', () => {
  // A line that started inside a code span was escaped as though it started
  // in text, and an escape inside a span is a literal backslash.
  const dashboardDesign = [
    '- **A project opens on its work.** The Tasks lens is the list at the top of',
    '  the page, as the approved Board draws a project: no header about the',
    '  container above the work, and no row of lenses either: the lenses sit on the',
    '  page bar beside the name they are lenses on (`Worklet › ENG Core · Tasks | About',
    '  | History | Files`, `PageLenses`, the chips All projects\' lenses wear too),',
    '  controlling the region below by id.',
  ].join('\n');

  test.each([
    ['at the top level', 'see `Tasks | About\n| History | Files` here', 'see `Tasks | About | History | Files` here'],
    ['inside an item', '- see `Tasks | About\n  | History | Files` here', '- see `Tasks | About | History | Files` here'],
  ])('%s is written on one line, unescaped', (_where, text, want) => {
    const written = canonicalMarkdown(text);
    expect(written).toBe(want);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
  });

  test("in dashboard-design.md's lens sentence, reads back as written", () => {
    const written = canonicalMarkdown(dashboardDesign);
    expect(written).not.toContain('\\|');
    expect(written).toContain('`Worklet › ENG Core · Tasks | About | History | Files`');
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(dashboardDesign).doc));
    expect(canonicalMarkdown(written)).toBe(written);
  });

  test('in a paragraph nobody edited, keeps its bytes on a save, line ending and all', () => {
    const text = 'Before.\n\nsee `Tasks | About\n| History | Files` here\nand more.\n\nAfter.\n';
    const { doc, source } = readMarkdown(text);
    expect(writeMarkdown(doc, source)).toBe(text);
    // An undone edit hands back equal nodes rather than the same objects.
    expect(writeMarkdown(schema.nodeFromJSON(doc.toJSON()), source)).toBe(text);
    // An edit to the paragraph before it moves only that paragraph's line.
    expect(writeMarkdown(editParagraph(doc, 0, 'Changed.'), source)).toBe(text.replace('Before.', 'Changed.'));
  });

  test('reads as one run of code, the line ending a space', () => {
    const p = readMarkdown('see `Tasks | About\n| History` here').doc.firstChild!;
    const code: string[] = [];
    p.forEach((n) => {
      if (n.marks.some((m) => m.type.name === 'code')) code.push(n.text ?? '');
    });
    expect(code).toEqual(['Tasks | About | History']);
  });
});

describe('a pipe at the start of a line', () => {
  const br = () => schema.node('hard_break', { style: 'backslash' });
  const t = (text: string) => schema.text(text);

  test('is left alone where no delimiter row follows', () => {
    const p = schema.node('paragraph', null, [t('a'), br(), t('| b')]);
    expect(writeBlock(p)).toBe('a\\\n| b');
    expect(signature(readMarkdown(writeBlock(p)).doc.firstChild!)).toBe(signature(p));
  });

  test('is escaped where the next line would make it a table header', () => {
    const p = schema.node('paragraph', null, [t('a'), br(), t('| b |'), br(), t('| --- |')]);
    const back = readMarkdown(writeBlock(p)).doc;
    expect(back.childCount).toBe(1);
    expect(signature(back.firstChild!)).toBe(signature(p));
  });
});

describe('backticks in text', () => {
  test.each([
    ['three alone, after a word on a lazy line', '- a\nb ```'],
    ['three alone, indented past a fence', 'a\n    ```'],
  ])('%s stay text, and round-trip', (_case, text) => {
    const written = canonicalMarkdown(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(canonicalMarkdown(written)).toBe(written);
    let code = false;
    readMarkdown(text).doc.descendants((n) => {
      if (n.marks.some((m) => m.type.name === 'code')) code = true;
    });
    expect(code).toBe(false);
    expect(readMarkdown(written).doc.textContent).toContain('```');
  });

  test.each([['`a'], ['a`'], [' a'], ['a '], ['  '], [' `a` ']])('a code span holding %j reads back as written', (text) => {
    // Between two words, so the editor's own collapsing of a space at a
    // paragraph's edge or beside another space does not touch the span.
    const node = schema.node('paragraph', null, [
      schema.text('x'),
      schema.text(text, [schema.marks.code!.create()]),
      schema.text('y'),
    ]);
    // The span's own text, space for space: the signature collapses spaces.
    expect(readMarkdown(writeBlock(node)).doc.firstChild!.textContent).toBe(`x${text}y`);
  });
});

describe('looseness', () => {
  test('is part of what a list says', () => {
    const tight = readMarkdown('- a\n- b').doc.firstChild!;
    const loose = readMarkdown('- a\n\n- b').doc.firstChild!;
    expect(signature(tight)).not.toBe(signature(loose));
  });

  // Each tight reading has a tight spelling, which the canonical form keeps.
  test.each([
    ['a rule under a paragraph', '- p\n  ---\n- q', '- p\n  ***\n- q'],
    ['a table under a paragraph', '- p\n  | a |\n  | --- |\n- q', '- p\n  | a |\n  | --- |\n- q'],
    ['a fence under a table', '- | a |\n  | --- |\n  ```\n  x\n  ```\n- q', '- | a |\n  | --- |\n  ```\n  x\n  ```\n- q'],
  ])('a tight list with %s stays tight', (_case, text, want) => {
    const written = canonicalMarkdown(text);
    expect(written).toBe(want);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
  });

  test.each([
    ['a quote, then a line with no marker', '- > q\n  p\n- r'],
    ['a table, then a line with no pipe', '- | a |\n  | --- |\n  p\n- r'],
  ])('%s is one block, so the list stays tight', (_case, text) => {
    const written = canonicalMarkdown(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(readMarkdown(text).doc.firstChild!.attrs.loose).toBe(false);
  });
});

describe('two lists of one kind next to each other', () => {
  const item = (text: string) => schema.node('list_item', null, schema.node('paragraph', null, schema.text(text)));
  const bullets = (text: string) => schema.node('bullet_list', { marker: '-', loose: false }, [item(text)]);
  const numbers = (text: string) => schema.node('ordered_list', { start: 1, marker: '.', loose: false }, [item(text)]);

  test.each([
    ['three bullet lists', [bullets('a'), bullets('b'), bullets('c')], '- a\n\n* b\n\n- c'],
    ['two numbered lists', [numbers('a'), numbers('b')], '1. a\n\n1) b'],
  ])('%s alternate their markers, and read back as that many lists', (_case, lists, want) => {
    const doc = schema.node('doc', null, lists);
    const written = writeMarkdown(doc);
    expect(written).toBe(want);
    expect(readMarkdown(written).doc.childCount).toBe(lists.length);
  });

  test('inside an item, stay tight and two lists', () => {
    const list = schema.node('bullet_list', { marker: '-', loose: false }, [
      schema.node('list_item', null, [schema.node('paragraph', null, schema.text('x')), bullets('a'), bullets('b')]),
    ]);
    expect(writeBlock(list)).toBe('- x\n  - a\n  * b');
    expect(signature(readMarkdown(writeBlock(list)).doc.firstChild!)).toBe(signature(list));
  });

  test('read from a body and brought together by an edit, the second is written afresh', () => {
    const text = '- a\n\nbetween\n\n- b\n';
    const { doc, source } = readMarkdown(text);
    const without = doc.copy(Fragment.from([doc.child(0), doc.child(2)]));
    const written = writeMarkdown(without, source);
    expect(written).toBe('- a\n\n* b\n');
    expect(readMarkdown(written).doc.childCount).toBe(2);
  });
});

describe('a code span with a space at an end', () => {
  // The span's text is written exactly: a space at one end is content, and
  // the spaces beside the span stay outside it.
  test.each([
    ['a space at its end', 'a `b ` c'],
    ['a space at its start', 'a ` b` c'],
    ['two spaces at its end, last in the paragraph', 'a `b  `'],
    ['nothing but spaces', 'a `  `'],
    ['backticks inside and a space at its end', 'Errors with ``x `y` `` when it fails.'],
    ['agent-learning.md: a title prefix', 'the `[Auto-draft] ` title prefix'],
    ['code-sandbox.md: a gutter', "a wrapping's gutter `[Worker1A] ` before the END"],
    ['knowledge-system.md: a prefix in a list', '- carries the `[Auto-draft] ` prefix (`knowledge.AutoDraftTitlePrefix`) as a backstop'],
    ['llm-backends.md: a bullet and a space', 'prefixes every line with `• ` and re-wraps it'],
    ['confluence.md: a prefix', 'still carries the `[Auto-draft] ` prefix: two tests'],
    ['cli.md: a command in a span', 'Errors with ``this node knows no company; run `crewlet config import` `` when it knows none.'],
  ])('%s is written as it was read', (_case, text) => {
    const written = canonicalMarkdown(text);
    expect(written).toBe(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(canonicalMarkdown(written)).toBe(written);
  });

  test("a space moved out of a span changes what the block says", () => {
    expect(signature(readMarkdown('a `b ` c').doc)).not.toBe(signature(readMarkdown('a `b` c').doc));
    expect(signature(readMarkdown('a ` b` c').doc)).not.toBe(signature(readMarkdown('a `b` c').doc));
  });
});

describe('a list that cannot interrupt a paragraph, under another block', () => {
  test.each([
    ['under a quote', '- a\n  > q\n  3. b'],
    ['under a table', '- | a |\n  | --- |\n  3. b'],
    ['under a list', '- a\n  - x\n  3. b'],
  ])('starts tight %s, and is written tight', (_case, text) => {
    expect(readMarkdown(text).doc.firstChild!.attrs.loose).toBe(false);
    const written = canonicalMarkdown(text);
    expect(written).toBe(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
  });

  test('an empty item under a quote is written tight', () => {
    const text = '- a\n  > q\n  -';
    const written = canonicalMarkdown(text);
    expect(signature(readMarkdown(written).doc)).toBe(signature(readMarkdown(text).doc));
    expect(readMarkdown(written).doc.firstChild!.attrs.loose).toBe(false);
  });
});
