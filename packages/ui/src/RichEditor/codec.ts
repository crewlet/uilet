/**
 * Markdown in, Markdown out: the editor's document read from a body, and the
 * body written back from the document.
 *
 * # A save with no edit changes nothing, by construction
 *
 * Storage is Markdown, and the bytes are the record: a Knowledge page is
 * merged line by line against somebody else's save, and a doc's version is a
 * patch of the lines that moved. An editor that wrote every body back in its
 * own canonical spelling would turn opening a page and pressing Save into a
 * rewrite of every line, and every concurrent save into a conflict.
 *
 * So the document REMEMBERS THE SOURCE OF EVERY TOP-LEVEL BLOCK it read
 * ([LoadedMarkdown]). ProseMirror shares every node a transaction did not
 * touch, so a block nobody edited is the very node that was read, and it is
 * written back as the lines it came from, with the blank lines that stood
 * between it and its neighbour. A block an edit replaced is looked up by
 * value too, so a change that was undone writes back its original lines.
 * Only a block that really changed is written in the canonical spelling
 * below, and it keeps the markers it was read with.
 *
 * # A changed block is checked before it is written
 *
 * The canonical spelling is read back through the same grammar and compared
 * with what the writer sees ([signature]); a spelling that would read
 * differently (an asterisk that would open emphasis, a `_` inside a word that
 * cannot close one) is written again with plainer markers and then with every
 * punctuation character escaped. What the editor shows is what the next
 * reader sees.
 */

import { Fragment, type Mark, type Node as PMNode } from 'prosemirror-model';
import {
  markdownCodeText,
  markdownInline,
  parseMarkdownSpans,
  type MarkdownAlign,
  type MarkdownBlock,
} from '../Markdown/index.js';
import { schema } from './schema.js';

// --- reading ----------------------------------------------------------------

/** One top-level block as it was read: its lines, and what stood before it. */
interface SourceBlock {
  index: number;
  node: PMNode;
  text: string;
  /** The text between the previous block's last line and this block's first. */
  sep: string;
}

/** A document and the source it was read from. */
export interface LoadedMarkdown {
  doc: PMNode;
  source: MarkdownSource;
}

/** What a document remembers of the body it was read from. */
export interface MarkdownSource {
  original: string;
  doc: PMNode;
  lead: string;
  trail: string;
  blocks: SourceBlock[];
  byNode: WeakMap<PMNode, SourceBlock>;
  /** Whether every line of the original ends in CRLF, which a changed body keeps. */
  crlf: boolean;
}

/** Read a Markdown body into the editor's document. */
export function readMarkdown(markdown: string): LoadedMarkdown {
  const original = markdown ?? '';
  const { lines, spans } = parseMarkdownSpans(original);
  const blocks: SourceBlock[] = [];
  const byNode = new WeakMap<PMNode, SourceBlock>();
  spans.forEach((span, index) => {
    const node = blockNode(span.block);
    const prevEnd = index === 0 ? 0 : (spans[index - 1]?.end ?? 0);
    const sep = index === 0 ? '' : '\n' + lines.slice(prevEnd, span.start).map((l) => `${l}\n`).join('');
    const block: SourceBlock = { index, node, text: lines.slice(span.start, span.end).join('\n'), sep };
    blocks.push(block);
    byNode.set(node, block);
  });
  const first = spans[0];
  const last = spans[spans.length - 1];
  const lead = first ? lines.slice(0, first.start).map((l) => `${l}\n`).join('') : '';
  const trail = last && last.end < lines.length ? '\n' + lines.slice(last.end).join('\n') : '';
  const nodes = blocks.map((b) => b.node);
  const doc = schema.node('doc', null, nodes.length > 0 ? nodes : [schema.node('paragraph')]);
  const crlf = /\r\n/.test(original) && !/(^|[^\r])\n/.test(original);
  return { doc, source: { original, doc, lead, trail, blocks, byNode, crlf } };
}

/** The editor's node for one parsed block. */
function blockNode(block: MarkdownBlock): PMNode {
  switch (block.kind) {
    case 'heading':
      return schema.node('heading', { level: block.level }, inline(block.text, [], { breaks: false }));
    case 'paragraph':
      return schema.node('paragraph', null, inline(block.text, [], { breaks: true }));
    case 'code':
      return schema.node(
        'code_block',
        { lang: block.lang, fence: block.fence },
        block.text ? schema.text(block.text) : undefined,
      );
    case 'quote':
      return schema.node('blockquote', null, blockNodes(block.blocks));
    case 'callout':
      return schema.node('callout', { tone: block.tone }, blockNodes(block.blocks));
    case 'rule':
      return schema.node('horizontal_rule');
    case 'list':
      return schema.node(
        block.ordered ? 'ordered_list' : 'bullet_list',
        block.ordered
          ? { start: block.start, marker: block.marker, loose: block.loose }
          : { marker: block.marker, loose: block.loose },
        block.items.map((item) => schema.node('list_item', { checked: item.checked }, itemNodes(item.blocks))),
      );
    case 'table':
      return schema.node('table', null, [
        row('table_header', block.head, block.align),
        ...block.rows.map((cells) => row('table_cell', cells, block.align)),
      ]);
  }
}

function blockNodes(blocks: MarkdownBlock[]): PMNode[] {
  const nodes = blocks.map(blockNode);
  return nodes.length > 0 ? nodes : [schema.node('paragraph')];
}

/**
 * A list item's blocks, fitted to what an item can hold.
 *
 * The grammar reads a fenced block or a heading inside an item only where its
 * marker line is (`- # Title`), and a code block nowhere, because an indented
 * fence is not a fence. An item therefore holds what can be written back into
 * it; anything else the grammar produced is kept as the paragraph it reads as.
 */
function itemNodes(blocks: MarkdownBlock[]): PMNode[] {
  const nodes = blockNodes(blocks);
  const item = schema.nodes.list_item!;
  const fitted: PMNode[] = [];
  for (const node of nodes) {
    if (item.contentMatch.matchFragment(Fragment.from([...fitted, node]))) {
      fitted.push(node);
    } else {
      fitted.push(schema.node('paragraph', null, node.textContent ? schema.text(node.textContent) : undefined));
    }
  }
  return fitted;
}

function row(type: 'table_header' | 'table_cell', cells: string[], align: MarkdownAlign[]): PMNode {
  const nodes = cells.map((cell, i) =>
    schema.node(type, { align: align[i] ?? 'left' }, inline(cell, [], { breaks: false })),
  );
  return schema.node('table_row', null, nodes.length > 0 ? nodes : [schema.node(type)]);
}

/**
 * A run of inline Markdown as the editor's inline nodes.
 *
 * WHITESPACE READS AS IT RENDERS: a document is set with `white-space: normal`,
 * so a newline is a space and a run of spaces is one, and an editor that kept
 * either would show a different paragraph from the one a reader sees. A hard
 * break (two trailing spaces, or a backslash, before a newline) is a break.
 */
function inline(text: string, marks: readonly Mark[], options: { breaks: boolean }): PMNode[] {
  const out: PMNode[] = [];
  walkInline(text, marks, options, out);
  return collapse(out);
}

function walkInline(text: string, marks: readonly Mark[], options: { breaks: boolean }, out: PMNode[]): void {
  let at = 0;
  for (const { index, end, groups: g } of markdownInline(text)) {
    if (index > at) plain(text.slice(at, index), marks, options, out);
    at = end;
    if (g.esc !== undefined) {
      out.push(schema.text(g.esc, marks));
    } else if (g.tick !== undefined) {
      const code = markdownCodeText(g.code ?? '');
      if (code) out.push(schema.text(code, schema.marks.code!.create().addToSet(marks)));
    } else if (g.src !== undefined) {
      out.push(schema.node('image', { src: g.src, alt: g.alt ?? '', title: g.srcTitle ?? null }, undefined, marks));
    } else if (g.href !== undefined) {
      const link = schema.marks.link!.create({ href: g.href, title: g.hrefTitle ?? null });
      walkInline(g.label ?? '', link.addToSet(marks), options, out);
    } else if (g.auto !== undefined) {
      out.push(schema.text(g.auto, schema.marks.link!.create({ href: g.auto, auto: true }).addToSet(marks)));
    } else if (g.strong !== undefined || g.strongUnder !== undefined) {
      const mark = schema.marks.strong!.create({ marker: g.strong !== undefined ? '**' : '__' });
      walkInline(g.strong ?? g.strongUnder ?? '', mark.addToSet(marks), options, out);
    } else if (g.em !== undefined || g.emUnder !== undefined) {
      const mark = schema.marks.em!.create({ marker: g.em !== undefined ? '*' : '_' });
      walkInline(g.em ?? g.emUnder ?? '', mark.addToSet(marks), options, out);
    } else if (g.del !== undefined) {
      walkInline(g.del, schema.marks.strike!.create().addToSet(marks), options, out);
    }
  }
  if (at < text.length) plain(text.slice(at), marks, options, out);
}

const BREAK = /( {2,}|\\)\n/;

function plain(text: string, marks: readonly Mark[], options: { breaks: boolean }, out: PMNode[]): void {
  const parts = options.breaks ? text.split(BREAK) : [text];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? '';
    if (i % 2 === 1) {
      out.push(schema.node('hard_break', { style: part === '\\' ? 'backslash' : 'spaces' }, undefined, marks));
      continue;
    }
    const spaced = part.replace(/[ \t\n]+/g, ' ');
    if (spaced) out.push(schema.text(spaced, marks));
  }
}

/**
 * Whitespace collapsed ACROSS nodes, as a browser collapses it: a space that
 * ends one run and a space that opens the next are one space, and a line
 * (the block's, or one after a break) starts and ends on a character.
 */
function collapse(nodes: PMNode[]): PMNode[] {
  const out: PMNode[] = [];
  let lineStart = true;
  let lastSpace = false;
  for (const node of nodes) {
    if (!node.isText) {
      if (node.type.name === 'hard_break') trimEnd(out);
      out.push(node);
      lineStart = node.type.name === 'hard_break';
      lastSpace = false;
      continue;
    }
    let text = node.text ?? '';
    if (lineStart || lastSpace) text = text.replace(/^ /, '');
    if (!text) continue;
    out.push(schema.text(text, node.marks));
    lineStart = false;
    lastSpace = text.endsWith(' ');
  }
  trimEnd(out);
  return Fragment.from(out).content.slice();
}

function trimEnd(out: PMNode[]): void {
  const last = out[out.length - 1];
  if (!last?.isText) return;
  const text = (last.text ?? '').replace(/ $/, '');
  if (text) out[out.length - 1] = schema.text(text, last.marks);
  else out.pop();
}

// --- writing ----------------------------------------------------------------

/**
 * The body a document is saved as.
 *
 * With the source it was read from, every block nobody changed is written as
 * the lines it was read from; a document nobody changed at all is the source,
 * byte for byte, line endings included.
 */
export function writeMarkdown(doc: PMNode, source?: MarkdownSource): string {
  if (source && matchesAll(doc, source)) return source.original;
  const used = new Set<number>();
  let out = '';
  let emitted = false;
  let prev: SourceBlock | null = null;
  let prevNode: PMNode | null = null;
  for (let i = 0; i < doc.childCount; i++) {
    const node = doc.child(i);
    const known = source ? recall(node, source, used) : null;
    const text = known ? known.text : writeBlock(node);
    if (!known && text === '') continue;
    if (!emitted) {
      out = (known && known.index === 0 && source ? source.lead : '') + text;
    } else {
      const adjacent = known && prev && known.index === prev.index + 1;
      out += (adjacent ? known.sep : separator(prevNode, node)) + text;
    }
    emitted = true;
    prev = known;
    prevNode = node;
  }
  if (source) {
    const lastBlock = source.blocks[source.blocks.length - 1];
    const endsAsRead = prev !== null && lastBlock !== undefined && prev.index === lastBlock.index;
    out += endsAsRead ? source.trail : emitted && source.original.endsWith('\n') ? '\n' : '';
    if (source.crlf) out = out.replace(/\r?\n/g, '\r\n');
  }
  return out;
}

/** Whether every top-level node is the very node that was read, in order. */
function matchesAll(doc: PMNode, source: MarkdownSource): boolean {
  if (source.blocks.length === 0) return doc.childCount === 1 && doc.firstChild!.childCount === 0;
  if (doc.childCount !== source.blocks.length) return false;
  let same = true;
  doc.forEach((node, _offset, i) => {
    if (source.blocks[i]?.node !== node) same = false;
  });
  return same;
}

/** The source block a node is, by identity or, for an undone edit, by value. */
function recall(node: PMNode, source: MarkdownSource, used: Set<number>): SourceBlock | null {
  const byIdentity = source.byNode.get(node);
  if (byIdentity && !used.has(byIdentity.index)) {
    used.add(byIdentity.index);
    return byIdentity;
  }
  for (const block of source.blocks) {
    if (!used.has(block.index) && block.node.eq(node)) {
      used.add(block.index);
      return block;
    }
  }
  return null;
}

/**
 * What separates two blocks the editor wrote. Two lists of the same kind
 * need TWO blank lines: one would read as a single loose list, because the
 * grammar carries a list across one blank line to the next item.
 */
function separator(prev: PMNode | null, next: PMNode): string {
  if (prev && isList(prev) && isList(next) && (prev.type === next.type || bothBullet(prev, next))) return '\n\n\n';
  return '\n\n';
}

function isList(node: PMNode): boolean {
  return node.type.name === 'bullet_list' || node.type.name === 'ordered_list';
}

function bothBullet(a: PMNode, b: PMNode): boolean {
  return a.type.name === 'bullet_list' && b.type.name === 'bullet_list';
}

/** How a block is spelled: the markers it was read with, or plainer ones. */
interface Spelling {
  /** Keep `_` and `__` where they were read, or write every one as `*` and `**`. */
  markers: 'keep' | 'star';
  /** Escape only what would be read as syntax, or every ASCII punctuation character. */
  escape: 'light' | 'all';
}

/** A thematic break, and a table column's delimiter: three hyphens. */
const RULE = '-'.repeat(3);

const SPELLINGS: readonly Spelling[] = [
  { markers: 'keep', escape: 'light' },
  { markers: 'star', escape: 'light' },
  { markers: 'star', escape: 'all' },
];

/**
 * One block in the canonical spelling, checked: the first spelling that reads
 * back as what the writer sees, or the plainest when none does.
 */
export function writeBlock(node: PMNode): string {
  if (node.type.name === 'paragraph' && node.childCount === 0) return '';
  const want = signature(node);
  let text = '';
  for (const spelling of SPELLINGS) {
    text = block(node, spelling);
    const back = readMarkdown(text).doc;
    if (back.childCount === 1 && signature(back.firstChild!) === want) return text;
  }
  return text;
}

function block(node: PMNode, s: Spelling): string {
  switch (node.type.name) {
    case 'paragraph':
      // Space at either end of a block renders as nothing, and two at its end
      // would read as a break, so neither is written.
      return lineStarts(inlineText(node, s, false).replace(/^[ \t]+|[ \t]+$/g, ''));
    case 'heading': {
      const text = inlineText(node, s, false).trim();
      // Closing hashes are decoration to the grammar, so a heading that ENDS
      // in a run of them keeps it by escaping the first.
      return `${'#'.repeat(node.attrs.level as number)} ${text.replace(/(\s)(#+)$/, '$1\\$2')}`;
    }
    case 'code_block':
      return codeBlock(node);
    case 'blockquote':
      return quoted(blocks(node, s));
    case 'callout':
      return quoted(`[!${(node.attrs.tone as string).toUpperCase()}]\n${blocks(node, s)}`);
    case 'horizontal_rule':
      return RULE;
    case 'bullet_list':
    case 'ordered_list':
      return list(node, s);
    case 'table':
      return table(node, s);
    default:
      return node.textContent;
  }
}

function blocks(parent: PMNode, s: Spelling): string {
  const parts: string[] = [];
  let prev: PMNode | null = null;
  parent.forEach((child) => {
    const text = block(child, s);
    if (parts.length > 0) parts.push(separator(prev, child));
    parts.push(text);
    prev = child;
  });
  return parts.join('');
}

function quoted(text: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');
}

function codeBlock(node: PMNode): string {
  const text = node.textContent;
  const lang = node.attrs.lang as string;
  const closes = (fence: string) => text.split('\n').some((line) => CLOSER[fence]!.test(line));
  const wanted = node.attrs.fence as string;
  const other = wanted === '```' ? '~~~' : '```';
  const fence = closes(wanted) && !closes(other) ? other : wanted;
  return `${fence}${lang}\n${text}${text ? '\n' : ''}${fence}`;
}

const CLOSER: Record<string, RegExp> = { '```': /^`{3,}[ \t]*$/, '~~~': /^~{3,}[ \t]*$/ };

function list(node: PMNode, s: Spelling): string {
  const ordered = node.type.name === 'ordered_list';
  const loose = node.attrs.loose as boolean;
  const items: string[] = [];
  node.forEach((item, _offset, i) => {
    const marker = ordered
      ? `${(node.attrs.start as number) + i}${node.attrs.marker as string} `
      : `${node.attrs.marker as string} `;
    const checked = item.attrs.checked as boolean | null;
    const box = checked === null ? '' : checked ? '[x] ' : '[ ] ';
    const indent = ' '.repeat(marker.length);
    const parts: string[] = [];
    item.forEach((child) => {
      // A list under a line is written tight against it; anything else after
      // the first block needs its blank line, or it runs into the line above.
      if (parts.length > 0) parts.push(isList(child) ? '\n' : '\n\n');
      parts.push(block(child, s));
    });
    const body = parts.join('');
    const lines = body.split('\n');
    items.push(
      marker +
        box +
        lines
          .map((line, j) => (j === 0 ? line : line === '' ? '' : indent + line))
          .join('\n'),
    );
  });
  return items.join(loose ? '\n\n' : '\n');
}

function table(node: PMNode, s: Spelling): string {
  const rows: string[][] = [];
  const align: MarkdownAlign[] = [];
  node.forEach((r, _o, ri) => {
    const cells: string[] = [];
    r.forEach((cell, _co, ci) => {
      cells.push(inlineText(cell, s, true));
      if (ri === 0) align[ci] = cell.attrs.align as MarkdownAlign;
    });
    rows.push(cells);
  });
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
  const rule = align.map((a) => (a === 'center' ? `:${RULE}:` : a === 'right' ? `${RULE}:` : RULE));
  return [line(rows[0] ?? ['']), `| ${rule.join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
}

/**
 * Escape what the START of a line would read as a block: a heading, a quote,
 * a list marker, a rule or a fence. Inline escaping has already taken the
 * asterisks and backticks.
 */
function lineStarts(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
        .replace(/^>/, '\\>')
        .replace(/^([-+])(?=\s)/, '\\$1')
        .replace(/^(\d{1,9})([.)])(?=\s)/, '$1\\$2')
        .replace(/^(-{3,}|_{3,})\s*$/, '\\$1')
        .replace(/^\|/, '\\|'),
    )
    .join('\n');
}

// --- inline writing ---------------------------------------------------------

/** One textblock's content as inline Markdown. */
function inlineText(parent: PMNode, s: Spelling, cell: boolean): string {
  const children: PMNode[] = [];
  parent.forEach((child) => children.push(child));
  return marked(expel(children), s, cell);
}

function linkOf(node: PMNode): Mark | null {
  return node.marks.find((m) => m.type.name === 'link') ?? null;
}

const EMPHASIS = new Set(['strong', 'em', 'strike']);

/**
 * Text with the whitespace at the edges of an emphasis run OUTSIDE it:
 * `**word **` is not strong in CommonMark, because a closing run may not
 * follow a space, so the space is written after the run closes. Only a mark
 * that OPENS at a node loses its leading space, and only one that CLOSES
 * there its trailing space: a space inside a run (`**a `code` b**`, three
 * nodes under one strong) stays inside it.
 */
function expel(nodes: PMNode[]): PMNode[] {
  const out: PMNode[] = [];
  nodes.forEach((node, i) => {
    const emphasis = node.marks.filter((m) => EMPHASIS.has(m.type.name));
    if (!node.isText || emphasis.length === 0 || node.marks.some((m) => m.type.name === 'code')) {
      out.push(node);
      return;
    }
    const prev = nodes[i - 1];
    const next = nodes[i + 1];
    const opening = emphasis.filter((m) => !prev || !m.isInSet(prev.marks));
    const closing = emphasis.filter((m) => !next || !m.isInSet(next.marks));
    const text = node.text ?? '';
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
    const without = (gone: readonly Mark[]) => node.marks.filter((mk) => !gone.includes(mk));
    if (m[1]) out.push(schema.text(m[1], without(opening)));
    if (m[2]) out.push(schema.text(m[2], node.marks));
    if (m[3]) out.push(schema.text(m[3], without(closing)));
  });
  return out;
}

/** The marks the writer opens and closes: every mark but a code span's, which is a node's own. */
function spanMarks(node: PMNode): Mark[] {
  return node.marks.filter((m) => m.type.name !== 'code');
}

const isLink = (mark: Mark): number => (mark.type.name === 'link' ? 1 : 0);

/** How many nodes from `i` on carry `mark`, unbroken. */
function reach(nodes: PMNode[], i: number, mark: Mark): number {
  let n = 0;
  while (i + n < nodes.length && mark.isInSet(nodes[i + n]!.marks)) n++;
  return n;
}

/**
 * Inline nodes as Markdown: a mark opens where its run starts and closes
 * where it ends, nested so a run that reaches further is the OUTER one.
 * `**[a link](…) and more**` is strong around a link, which is how it was
 * read; opening in a fixed order (the link first) would close the strong at
 * the link's end and open it again, and a run opened after a space does not
 * read as strong at all.
 */
function marked(nodes: PMNode[], s: Spelling, cell: boolean): string {
  let out = '';
  const open: { mark: Mark; auto: boolean }[] = [];
  const close = (to: number) => {
    while (open.length > to) {
      const top = open.pop()!;
      out += closing(top.mark, top.auto, s);
    }
  };
  nodes.forEach((node, i) => {
    const want = spanMarks(node);
    // Keep every open mark this node still carries, from the outside in.
    let keep = 0;
    while (keep < open.length && open[keep]!.mark.isInSet(want)) keep++;
    close(keep);
    const opening = want
      .filter((m) => !open.some((o) => o.mark.eq(m)))
      // A run that reaches further is outer; between two that end together a
      // link is inner, as `**[a link](…)**` is usually written.
      .sort((a, b) => reach(nodes, i, b) - reach(nodes, i, a) || isLink(a) - isLink(b));
    for (const mark of opening) {
      const auto = autolink(mark, nodes, i, open.length);
      out += auto ? '<' : opener(mark, s);
      open.push({ mark, auto });
    }
    const inAuto = open.some((o) => o.auto);
    const inLink = open.some((o) => o.mark.type.name === 'link');
    out += inAuto ? (node.text ?? '') : content(node, s, cell, nodes[i + 1], inLink);
  });
  close(0);
  return out;
}

/**
 * Whether a link is written as `<address>`: it was read as one, its text is
 * its address, and nothing else opens inside it.
 */
function autolink(mark: Mark, nodes: PMNode[], i: number, depth: number): boolean {
  if (mark.type.name !== 'link' || !mark.attrs.auto) return false;
  const node = nodes[i]!;
  const href = mark.attrs.href as string;
  return (
    reach(nodes, i, mark) === 1 &&
    node.isText &&
    node.text === href &&
    spanMarks(node).length === depth + 1 &&
    !node.marks.some((m) => m.type.name === 'code') &&
    /^(https?:|mailto:)[^>\s]+$/i.test(href)
  );
}

function opener(mark: Mark, s: Spelling): string {
  return mark.type.name === 'link' ? '[' : delimiter(mark, s);
}

function closing(mark: Mark, auto: boolean, s: Spelling): string {
  if (auto) return '>';
  if (mark.type.name !== 'link') return delimiter(mark, s);
  const title = mark.attrs.title as string | null;
  return `](${destination(mark.attrs.href as string)}${title ? ` "${title.replace(/"/g, "'")}"` : ''})`;
}

function delimiter(mark: Mark, s: Spelling): string {
  switch (mark.type.name) {
    case 'strong':
      return s.markers === 'keep' ? (mark.attrs.marker as string) : '**';
    case 'em':
      return s.markers === 'keep' ? (mark.attrs.marker as string) : '*';
    default:
      return '~~';
  }
}

function content(node: PMNode, s: Spelling, cell: boolean, next: PMNode | undefined, inLink: boolean): string {
  if (node.type.name === 'hard_break') return node.attrs.style === 'spaces' ? '  \n' : '\\\n';
  if (node.type.name === 'image') {
    const alt = (node.attrs.alt as string).replace(/(^|[^\\])([[\]])/g, '$1\\$2');
    const title = node.attrs.title as string | null;
    return `![${alt}](${destination(node.attrs.src as string)}${title ? ` "${title.replace(/"/g, "'")}"` : ''})`;
  }
  const text = node.text ?? '';
  if (node.marks.some((m) => m.type.name === 'code')) return codeSpan(text, cell);
  const escaped = escapeText(text, s.escape, cell, next);
  // A label ends at its first unescaped bracket.
  return inLink ? escaped.replace(/(^|[^\\])\]/g, '$1\\]') : escaped;
}

/** A code span whose fence no run of backticks inside it can close. */
function codeSpan(text: string, cell: boolean): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  const pad = (side: string) => (side === ' ' || side === '`' ? ' ' : '');
  const body = cell ? text.replace(/\|/g, '\\|') : text;
  return `${fence}${pad(body[0] ?? '')}${body}${pad(body[body.length - 1] ?? '')}${fence}`;
}

const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;

/** Plain text, escaped so the grammar reads it back as the same characters. */
function escapeText(text: string, mode: 'light' | 'all', cell: boolean, next: PMNode | undefined): string {
  if (mode === 'all') {
    return text.replace(/[!-/:-@[-`{-~]/g, (c) => (c === '\\' || /[\\`*_[\]<>~|!#]/.test(c) ? `\\${c}` : c));
  }
  const nextChar = (next?.isText ? (next.text ?? '')[0] : next ? '!' : '') ?? '';
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const before = text[i - 1] ?? '';
    const after: string = text[i + 1] ?? nextChar;
    if (c === '\\') {
      out += after === '' || ASCII_PUNCTUATION.test(after) ? '\\\\' : '\\';
    } else if (c === '`' || c === '*') {
      out += `\\${c}`;
    } else if (c === '_') {
      const word = /[\p{L}\p{N}]/u;
      out += word.test(before) && word.test(after) ? '_' : '\\_';
    } else if (c === '~') {
      out += after === '~' || before === '~' ? '\\~' : '~';
    } else if (c === '[') {
      // Only a bracket a destination follows could open a link or a picture.
      out += text.indexOf('](', i) >= 0 ? '\\[' : '[';
    } else if (c === '<') {
      out += /^<(https?:|mailto:)/i.test(text.slice(i)) ? '\\<' : '<';
    } else if (c === '|' && cell) {
      out += '\\|';
    } else {
      out += c;
    }
  }
  return out;
}

/**
 * A destination the grammar reads whole: no whitespace and only balanced
 * parentheses, so a space or a stray parenthesis is percent-encoded.
 */
function destination(href: string): string {
  let depth = 0;
  let balanced = true;
  for (const c of href) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth < 0 || depth > 1) balanced = false;
  }
  const spaced = href.replace(/\s/g, (c) => encodeURIComponent(c));
  return balanced && depth === 0 ? spaced : spaced.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

// --- comparing --------------------------------------------------------------

/**
 * What a block SAYS: its structure and the attributes a reader sees, and its
 * text character by character with the marks each carries. The spelling (a
 * `*` or a `_`, a fence's marker, whether a space sat inside the strong or
 * after it) is not part of it, because the reader cannot see it either.
 */
export function signature(node: PMNode): string {
  if (node.isText) {
    const marks = node.marks
      .filter((m) => m.type.name !== 'link')
      .map((m) => m.type.name)
      .join('+');
    const link = linkOf(node);
    const tag = `${marks}${link ? `@${link.attrs.href as string}` : ''}`;
    return [...(node.text ?? '')].map((c) => (c === ' ' ? ' ' : `${c}${tag ? `{${tag}}` : ''}`)).join('');
  }
  const attrs = visibleAttrs(node);
  let inner = '';
  node.forEach((child) => {
    inner += signature(child);
  });
  if (node.isTextblock && !node.type.spec.code) {
    inner = inner
      .replace(/ +/g, ' ')
      .replace(/ ?(<hard_break[^>]*><\/>) ?/g, '$1')
      .trim();
  }
  return `<${node.type.name}${attrs}>${inner}</>`;
}

function visibleAttrs(node: PMNode): string {
  switch (node.type.name) {
    case 'heading':
      return ` ${node.attrs.level as number}`;
    case 'code_block':
      return ` ${node.attrs.lang as string}`;
    case 'callout':
      return ` ${node.attrs.tone as string}`;
    case 'ordered_list':
      return ` ${node.attrs.start as number}`;
    case 'list_item':
      return ` ${String(node.attrs.checked)}`;
    case 'table_header':
    case 'table_cell':
      return ` ${node.attrs.align as string}`;
    case 'image':
      return ` ${node.attrs.src as string} ${node.attrs.alt as string}`;
    default:
      return '';
  }
}
