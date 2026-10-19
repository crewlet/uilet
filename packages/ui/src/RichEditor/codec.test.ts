/**
 * The Markdown round trip: a load and a save with no edit change nothing, a
 * changed block is written in a spelling that reads back as what the writer
 * saw, and only the block that changed moves.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { Node as PMNode } from 'prosemirror-model';
import { readMarkdown, signature, writeBlock, writeMarkdown } from './codec.js';
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

  test('fences code with the marker its own lines cannot close', () => {
    const node = schema.node('code_block', { lang: 'md', fence: '```' }, schema.text('```\ninside\n```'));
    expect(writeBlock(node)).toBe('~~~md\n```\ninside\n```\n~~~');
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
