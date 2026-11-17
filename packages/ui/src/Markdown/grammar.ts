/**
 * The Markdown grammar every Crewlet surface reads and writes: a CommonMark
 * subset, parsed into blocks and inline matches and never into markup.
 *
 * ONE GRAMMAR FOR READING AND EDITING. An application renders these blocks
 * with its own renderer (which elements, which link schemes, where a picture
 * is fetched from are decisions about its own content), and `RichEditor`
 * builds its document from the same blocks. A page that reads one way and
 * edits another is a page whose author cannot trust what they see, and two
 * copies of a grammar drift the first time somebody fixes one of them.
 *
 * NOTHING HERE PRODUCES MARKUP. The parser answers plain objects and strings,
 * so a renderer that builds elements from them never parses HTML, which is
 * what lets a consumer enforce Trusted Types with no policy at all.
 *
 * WHAT IT READS: ATX headings, paragraphs, emphasis and strong, strikethrough,
 * inline code, fenced code, links, images, autolinks, backslash escapes,
 * bullet and ordered lists (nested), task list items, block quotes, callouts
 * (`> [!NOTE]`, GitHub's alert syntax), tables, thematic breaks and hard line
 * breaks.
 *
 * A LIST ITEM IS A CONTAINER, as in CommonMark: its lines, with the item's
 * content indent taken off, are read as blocks by this same grammar, so a
 * fence, a table, a quote, a heading or a list inside an item is that block
 * and never the text of a paragraph (see [BlockReader]).
 *
 * WHAT IT DELIBERATELY DOES NOT: raw HTML (read as its own text, never
 * parsed), reference links, footnotes, bare autolink literals, setext
 * headings and indented code. Each is a shape these documents do not use, and
 * every one of them is a place a parser grows a branch nobody exercises.
 */

export type MarkdownAlign = 'left' | 'center' | 'right';

/**
 * A callout's tone, by GitHub's alert names: `> [!NOTE]`, `> [!TIP]`,
 * `> [!IMPORTANT]`, `> [!WARNING]` and `> [!CAUTION]`. The syntax is
 * GitHub's so a page reads as a callout on GitHub too, and anywhere else it
 * degrades to a quote whose first line names its tone.
 */
export type MarkdownCalloutTone = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export const MARKDOWN_CALLOUT_TONES: readonly MarkdownCalloutTone[] = ['note', 'tip', 'important', 'warning', 'caution'];

/**
 * Each tone's name as a reader sees it, on the callout's own label line: the
 * one set of words a renderer and the editor both draw.
 */
export const MARKDOWN_CALLOUT_NAMES: Readonly<Record<MarkdownCalloutTone, string>> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

/** One parsed block. */
export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; lang: string; text: string; fence: MarkdownFence }
  | { kind: 'quote'; blocks: MarkdownBlock[] }
  | { kind: 'callout'; tone: MarkdownCalloutTone; blocks: MarkdownBlock[] }
  | {
      kind: 'list';
      ordered: boolean;
      start: number;
      /** The bullet character (`-`, `*`, `+`) or the ordered delimiter (`.`, `)`). */
      marker: string;
      /** Whether a blank line separates any two of its items. */
      loose: boolean;
      items: MarkdownListItem[];
    }
  | { kind: 'table'; head: string[]; align: MarkdownAlign[]; rows: string[][] }
  | { kind: 'rule' };

export type MarkdownFence = '```' | '~~~';

export interface MarkdownListItem {
  /** null when the item is not a task item, which is not "unticked". */
  checked: boolean | null;
  blocks: MarkdownBlock[];
}

/** A top-level block and the source lines it was read from, `[start, end)`. */
export interface MarkdownSpan {
  block: MarkdownBlock;
  start: number;
  end: number;
}

// --- links -----------------------------------------------------------------

/**
 * The schemes a link may carry.
 *
 * AN ALLOWLIST, never a denylist. `javascript:` is the one everybody
 * remembers; `data:`, `vbscript:`, a whitespace character inside the scheme
 * and a protocol-relative `//host` are the ones they do not, and a check that
 * enumerated the bad ones would be wrong the moment a browser grew one more.
 */
const SAFE_SCHEME = /^(https?:|mailto:)/i;

/**
 * Every character a browser drops before it resolves a URL's scheme.
 *
 * They are removed so that the string CHECKED is the string emitted (see
 * [safeHref], where returning the normalised value rather than the raw one is
 * the whole of the guarantee). Stripping them is not itself the defence: an
 * allowlist cannot be slipped past by ADDING noise, only a denylist can.
 */
// eslint-disable-next-line no-control-regex
const URL_NOISE = /[\u0000- ]/g;

/**
 * Whether a href may be followed at all, and in what form: `http:`, `https:`,
 * `mailto:` and an application's own `#/` routes. Anything else is null.
 *
 * In-app routes (`#/worklet/ENG-1`) are allowed because they are how a page
 * points at the company's own objects and they cannot leave the application.
 * Everything else must carry an allowed scheme, including, deliberately, a
 * bare `/path` or `guide.html`, which would resolve against whatever origin
 * serves the page and mean nothing to a reader.
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href === '') return null;
  // NORMALISE, THEN CHECK, THEN EMIT THE NORMALISED ONE. A browser drops the
  // characters in URL_NOISE before resolving a scheme, so a href and its
  // stripped form can reach different destinations, and a function that
  // checked one and returned the other would be checking a string nobody
  // navigates to.
  const clean = href.replace(URL_NOISE, '');
  if (clean.startsWith('#/')) return clean;
  if (SAFE_SCHEME.test(clean)) return clean;
  return null;
}

// --- lines -----------------------------------------------------------------

// A HEADING AND A FENCE MAY BE INDENTED UP TO THREE SPACES, as in CommonMark:
// four would be indented code, which this grammar does not read. A list
// item's later blocks sit at its content indent, and one written a space or
// two further in is still the block it spells.
const HEADING = /^ {0,3}(#{1,6})\s+(.*)$/;
const FENCE = /^( {0,3})(```|~~~)\s*([A-Za-z0-9_+-]*)\s*$/;
const RULE = /^(?:\s*(?:-{3,}|\*{3,}|_{3,})\s*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const CALLOUT = /^\[!(note|tip|important|warning|caution)\]\s*$/i;
const TASK = /^\[([ xX])\](?:\s+(.*))?$/;

/**
 * What CLOSES a fence opened with each marker.
 *
 * NOT `line.startsWith(marker)`. A closing fence carries NO INFO STRING, so a
 * literal ```` ```ts ```` line inside a ```` ```sh ```` sample is content, and
 * reading it as a close ended the block on its first line. A page teaching
 * somebody how to write a fenced block is exactly that input.
 *
 * A LONGER RUN OF THE SAME CHARACTER STILL CLOSES, which is CommonMark's rule
 * and free here: [FENCE] only ever opens on three, so a four-backtick line is
 * not an opening this grammar can have made.
 *
 * A CLOSE MAY BE INDENTED UP TO THREE SPACES, whatever the opening's indent,
 * as CommonMark has it: a fence in a list item whose closing line sits a
 * space further in than its opening still ends there.
 */
const FENCE_CLOSE: Record<MarkdownFence, RegExp> = {
  '```': /^ {0,3}`{3,}[ \t]*$/,
  '~~~': /^ {0,3}~{3,}[ \t]*$/,
};

/** Whether `line` closes a fence opened with `marker`. */
export function markdownClosesFence(line: string, marker: MarkdownFence): boolean {
  return FENCE_CLOSE[marker].test(line);
}

/**
 * The fence `line` opens, with its info string and the spaces it is indented
 * by, or null when it opens none. Each line of the block loses up to that
 * many spaces of its own, which is how CommonMark reads an indented fence.
 */
export function markdownFenceOf(line: string): { marker: MarkdownFence; lang: string; indent: number } | null {
  const m = FENCE.exec(line);
  return m ? { marker: (m[2] ?? '```') as MarkdownFence, lang: m[3] ?? '', indent: (m[1] ?? '').length } : null;
}

/** The ATX heading `line` is, or null. Closing hashes are decoration, not content. */
export function markdownHeadingOf(line: string): { level: number; title: string } | null {
  const m = HEADING.exec(line);
  if (!m) return null;
  return { level: (m[1] ?? '#').length, title: (m[2] ?? '').replace(/\s+#+\s*$/, '').trim() };
}

/** A document's lines, every line ending normalised to `\n`. */
export function markdownLines(source: string): string[] {
  return (source ?? '').replace(/\r\n?/g, '\n').split('\n');
}

// --- blocks ----------------------------------------------------------------

/** Split a document into blocks. Pure, and the only thing that reads lines. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  return new BlockReader(markdownLines(source)).read().map((span) => span.block);
}

/**
 * Split a document into its top-level blocks AND the lines each was read
 * from, for an editor that keeps the source of every block it did not change.
 */
export function parseMarkdownSpans(source: string): { lines: string[]; spans: MarkdownSpan[] } {
  const lines = markdownLines(source);
  return { lines, spans: new BlockReader(lines).read() };
}

function alignOf(cell: string): MarkdownAlign {
  const t = cell.trim();
  if (t.startsWith(':') && t.endsWith(':')) return 'center';
  if (t.endsWith(':')) return 'right';
  return 'left';
}

/**
 * Split one table row, dropping the optional leading and trailing pipes.
 *
 * AN ESCAPED PIPE IS A CHARACTER OF ITS CELL, as GitHub reads it: a cell that
 * has to say `a|b` writes `a\|b`, and the cell's text holds the pipe itself,
 * inside a code span too (`` `a\|b` `` reads as `a|b`), because the escape
 * belongs to the table's syntax rather than to the text in the cell.
 */
function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && t[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (c === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += c;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/** Whether a line holds nothing but whitespace. */
function blank(line: string | undefined): boolean {
  return (line ?? '').trim() === '';
}

/** The column after `ws` when it starts at column `from`: a tab stops at the next multiple of four. */
function columnAfter(ws: string, from: number): number {
  let col = from;
  for (const c of ws) col = c === '\t' ? col + 4 - (col % 4) : col + 1;
  return col;
}

/** How many columns of whitespace `line` starts with. */
function indentOf(line: string): number {
  return columnAfter(/^\s*/.exec(line)?.[0] ?? '', 0);
}

/**
 * `line` with `columns` columns of its leading whitespace taken off, and no
 * more. A tab that straddles the cut leaves the spaces it stood for past it,
 * so a tab-indented line inside a list item keeps its own indent.
 */
function dedent(line: string, columns: number): string {
  let col = 0;
  let i = 0;
  while (i < line.length && col < columns) {
    const c = line[i] ?? '';
    if (c === '\t') {
      const next = col + 4 - (col % 4);
      if (next > columns) return ' '.repeat(next - columns) + line.slice(i + 1);
      col = next;
    } else if (/\s/.test(c)) {
      col++;
    } else {
      break;
    }
    i++;
  }
  return line.slice(i);
}

/** A list item's first line: its marker, and the column its content starts at. */
interface ItemStart {
  ordered: boolean;
  /** The bullet character (`-`, `*`, `+`) or the ordered delimiter (`.`, `)`). */
  marker: string;
  number: number;
  /**
   * The column every later line of the item is indented to: the marker's
   * width and the spaces after it, so `1. ` is three and `10. ` four.
   */
  content: number;
  /** The first line's own content, after the marker and its spaces. */
  text: string;
}

/**
 * A list marker: a bullet (`-`, `*`, `+`) or a number of up to nine digits
 * with `.` or `)`, and the text after it.
 *
 * A MARKER ALONE ON ITS LINE IS AN EMPTY ITEM, as CommonMark reads it: "1."
 * and "-" with nothing after them, or with only the space an editor strips.
 * Its text group is then undefined, which an item reads as nothing.
 */
const ITEM = /^(\s*)(?:([-*+])|(\d{1,9})([.)]))(?:(\s+)(.*))?$/;

/**
 * The item `line` starts, or null.
 *
 * THE CONTENT INDENT IS CommonMark's: the marker's width plus the one to four
 * spaces after it. Five or more is one space and then text indented further,
 * because a writer who put five spaces after a `-` did not mean every later
 * line to need seven. A marker alone on its line takes one space.
 */
function itemStart(line: string): ItemStart | null {
  const m = ITEM.exec(line);
  if (!m) return null;
  const ordered = m[3] !== undefined;
  const marker = ordered ? (m[4] ?? '.') : (m[2] ?? '-');
  const after = columnAfter(m[1] ?? '', 0) + (ordered ? (m[3] ?? '').length + 1 : 1);
  const text = m[6] ?? '';
  if (text === '') return { ordered, marker, number: Number(m[3] ?? 1), content: after + 1, text: '' };
  const spaces = columnAfter(m[5] ?? ' ', after) - after;
  return spaces <= 4
    ? { ordered, marker, number: Number(m[3] ?? 1), content: after + spaces, text }
    : { ordered, marker, number: Number(m[3] ?? 1), content: after + 1, text: ' '.repeat(spaces - 1) + text };
}

/**
 * Whether `line`, taken as it stands, starts a block rather than continuing
 * the paragraph above it: what a LAZY line may not do. `next` gives the line
 * after it, which decides whether a line of pipes is a table's header, and is
 * read only for a line that holds a pipe.
 */
function startsBlock(line: string, next: () => string): boolean {
  return (
    blank(line) ||
    markdownFenceOf(line) !== null ||
    RULE.test(line) ||
    markdownHeadingOf(line) !== null ||
    QUOTE.test(line) ||
    itemStart(line) !== null ||
    (line.includes('|') && TABLE_RULE.test(next()))
  );
}

/** The block still being read at the tip of the open containers: the only one that takes a line. */
type Leaf =
  | { kind: 'paragraph'; lines: string[]; start: number; end: number }
  | {
      kind: 'code';
      marker: MarkdownFence;
      lang: string;
      indent: number;
      lines: string[];
      start: number;
      end: number;
    }
  | {
      kind: 'table';
      head: string[];
      align: MarkdownAlign[];
      rows: string[][];
      /** Whether its delimiter row, the line under the header, has been read. */
      ruled: boolean;
      start: number;
      end: number;
    };

/** A container of blocks: the document, a quote or a list item. */
interface Holder {
  /** Its blocks read so far, each with the lines it was read from. */
  children: MarkdownSpan[];
  leaf: Leaf | null;
  start: number;
  end: number;
}

interface RootFrame extends Holder {
  kind: 'root';
}

interface QuoteFrame extends Holder {
  kind: 'quote';
  tone: MarkdownCalloutTone | null;
}

interface ItemFrame extends Holder {
  kind: 'item';
  /** The column its later lines are indented to ([ItemStart.content]). */
  content: number;
  checked: boolean | null;
  /** A bare marker with no line under it yet, which a blank line ends: an item starts with one blank line at most. */
  bare: boolean;
  /** Every blank line before this one is known to be the item's: the answer of one look ahead, kept for the run. */
  blankUntil: number;
}

interface ListFrame {
  kind: 'list';
  ordered: boolean;
  marker: string;
  number: number;
  loose: boolean;
  items: MarkdownListItem[];
  start: number;
  end: number;
}

/** A container still open below the document: the stack holds these, outermost first. */
type Open = QuoteFrame | ItemFrame | ListFrame;

/**
 * The block reader: ONE PASS over the document's lines, in order, with the
 * containers still open (quotes, lists and their items) on a stack, as
 * CommonMark's reference parser reads.
 *
 * EACH LINE IS MATCHED AGAINST THE OPEN CONTAINERS from the outside in: a
 * quote takes a line that starts with `>`, with that marker off; a list item
 * takes one indented to its content ([ItemStart.content]), with that indent
 * off, and a blank line when the next line that is not blank is indented that
 * far (so a blank line inside a fence or between two of an item's paragraphs
 * keeps the item open). What is left of the line goes to the innermost
 * container that took it: to its open fence or table, or as the start of a
 * block, or as the next line of its paragraph. A container the line does not
 * reach is closed, unless the line is a LAZY line: one that continues the
 * paragraph left open at the innermost tip, through items only (a quote takes
 * no lazy line in this grammar), and starts no block of its own.
 *
 * WHY ONE PASS. A list item's blocks can only be read as blocks, so whether a
 * lazy line continues a paragraph depends on what the item holds so far. An
 * item read by collecting its lines and parsing them answered that by parsing
 * the lines collected so far, once a lazy line, and a nested item did the
 * same inside every one of those parses: n to the power depth + 1, twenty
 * seconds for five kilobytes three items deep. Here the answer is the stack's
 * own state, and every line is matched once against containers that are as
 * deep as the document: the work is linear in the document for any nesting
 * the document has, and the grammar's tests count it.
 *
 * LOOKING AHEAD reads a later line through the same containers ([peel]): the
 * delimiter row under a table's header, the line after a blank one between
 * two items, and the first line that is not blank after a run of them inside
 * an item, which is answered once for the whole run.
 */
class BlockReader {
  private readonly root: RootFrame = { kind: 'root', children: [], leaf: null, start: 0, end: 0 };
  private readonly stack: Open[] = [];

  constructor(private readonly lines: readonly string[]) {}

  read(): MarkdownSpan[] {
    for (let i = 0; i < this.lines.length; i++) this.line(i);
    this.closeFrom(0);
    this.closeLeaf(this.root);
    return this.root.children;
  }

  private line(i: number): void {
    // MATCH: how many open containers take the line, and what is left of it.
    let rest = this.lines[i] ?? '';
    let depth = 0;
    for (; depth < this.stack.length; depth++) {
      const frame = this.stack[depth]!;
      if (frame.kind === 'list') continue;
      if (frame.kind === 'quote') {
        const quoted = QUOTE.exec(rest);
        if (!quoted) break;
        rest = quoted[1] ?? '';
        continue;
      }
      if (blank(rest) ? !this.blankBelongs(frame, depth, i) : indentOf(rest) < frame.content) break;
      if (!blank(rest)) frame.bare = false;
      rest = dedent(rest, frame.content);
    }

    if (depth === this.stack.length) {
      const top = this.stack[depth - 1] ?? this.root;
      if (top.kind === 'list') {
        // The line after a blank one that ended an item: the next item, as
        // the look ahead that kept the list open found it.
        const head = itemStart(rest);
        if (head && head.ordered === top.ordered) {
          this.extend(i);
          this.openItem(top, head, i);
          return;
        }
        this.closeFrom(depth - 1);
        this.extend(i);
        this.start(rest, i);
        return;
      }
      this.extend(i);
      const leaf = top.leaf;
      if (leaf?.kind === 'code') {
        leaf.end = i + 1;
        if (markdownClosesFence(rest, leaf.marker)) {
          top.children.push({ block: codeOf(leaf), start: leaf.start, end: leaf.end });
          top.leaf = null;
        } else {
          leaf.lines.push(dedent(rest, leaf.indent));
        }
        return;
      }
      if (leaf?.kind === 'table') {
        if (!leaf.ruled) {
          leaf.ruled = true;
          leaf.align = splitRow(rest).map(alignOf);
          leaf.end = i + 1;
          return;
        }
        if (rest.includes('|') && !blank(rest)) {
          leaf.rows.push(splitRow(rest));
          leaf.end = i + 1;
          return;
        }
      }
      this.start(rest, i);
      return;
    }

    // A LAZY LINE continues the paragraph at the tip, every container kept.
    if (!blank(rest) && this.lazy(depth, rest, i)) return;

    const first = this.stack[depth]!;
    if (first.kind === 'item') {
      const list = this.stack[depth - 1] as ListFrame;
      if (blank(rest)) {
        // ONE BLANK LINE BEFORE THE NEXT ITEM keeps the list, loose; two end
        // it, which is the one way to write two lists of one kind in a row.
        const next = i + 1 < this.lines.length ? this.peel(i + 1, depth) : null;
        const sibling = next === null || blank(next) ? null : itemStart(next);
        this.closeFrom(depth);
        if (sibling && sibling.ordered === list.ordered) {
          list.loose = true;
          this.extend(i);
          return;
        }
        this.closeFrom(depth - 1);
        this.extend(i);
        this.start(rest, i);
        return;
      }
      // A MARKER SHORT OF THE ITEM'S CONTENT is the next item of its list,
      // or, of the other kind, the end of the list.
      const head = itemStart(rest);
      this.closeFrom(depth);
      if (head && head.ordered === list.ordered) {
        this.extend(i);
        this.openItem(list, head, i);
        return;
      }
      this.closeFrom(depth - 1);
    } else {
      this.closeFrom(depth);
    }
    this.extend(i);
    this.start(rest, i);
  }

  /**
   * Take `rest` as a lazy line, if it is one: the innermost tip is an open
   * paragraph, only list items stand between it and the containers the line
   * matched, and the line, its own indent gone, starts no block. It is added
   * whole and unindented, as the paragraph text it was taken for.
   */
  private lazy(depth: number, rest: string, i: number): boolean {
    for (let d = depth; d < this.stack.length; d++) if (this.stack[d]!.kind === 'quote') return false;
    const top = this.stack[this.stack.length - 1] ?? this.root;
    if (top.kind === 'list' || top.leaf?.kind !== 'paragraph') return false;
    const text = rest.trimStart();
    if (startsBlock(text, () => (i + 1 < this.lines.length ? (this.peel(i + 1, depth) ?? '') : ''))) return false;
    top.leaf.lines.push(text);
    top.leaf.end = i + 1;
    this.extend(i);
    return true;
  }

  /**
   * Whether the blank line `i` belongs to the item at `depth`: it does when
   * the next line that is not blank, read through the containers outside the
   * item, is indented to the item's content. The answer covers the whole run
   * of blank lines, so a run is looked through once, not once a line.
   */
  private blankBelongs(item: ItemFrame, depth: number, i: number): boolean {
    if (item.bare) return false;
    if (i < item.blankUntil) return true;
    for (let k = i + 1; k < this.lines.length; k++) {
      const next = this.peel(k, depth);
      if (next === null) return false;
      if (blank(next)) continue;
      if (indentOf(next) < item.content) return false;
      item.blankUntil = k;
      return true;
    }
    return false;
  }

  /**
   * Line `k` as the first `depth` open containers would hand it on, or null
   * when one of them would not take it. A blank line passes an item, whose own
   * question about it is [blankBelongs].
   */
  private peel(k: number, depth: number): string | null {
    let rest = this.lines[k] ?? '';
    for (let d = 0; d < depth; d++) {
      const frame = this.stack[d]!;
      if (frame.kind === 'list') continue;
      if (frame.kind === 'quote') {
        const quoted = QUOTE.exec(rest);
        if (!quoted) return null;
        rest = quoted[1] ?? '';
        continue;
      }
      if (!blank(rest) && indentOf(rest) < frame.content) return null;
      rest = dedent(rest, frame.content);
    }
    return rest;
  }

  /** Read `rest` of line `i` as the start of a block, or the next line of a paragraph, in the innermost container. */
  private start(rest: string, i: number): void {
    const top = (this.stack[this.stack.length - 1] ?? this.root) as RootFrame | QuoteFrame | ItemFrame;
    const leaf = top.leaf;
    if (blank(rest)) {
      this.closeLeaf(top);
      return;
    }

    const fence = markdownFenceOf(rest);
    if (fence) {
      this.closeLeaf(top);
      top.leaf = { kind: 'code', marker: fence.marker, lang: fence.lang, indent: fence.indent, lines: [], start: i, end: i + 1 };
      return;
    }

    if (RULE.test(rest)) {
      this.closeLeaf(top);
      top.children.push({ block: { kind: 'rule' }, start: i, end: i + 1 });
      return;
    }

    const heading = markdownHeadingOf(rest);
    if (heading) {
      this.closeLeaf(top);
      top.children.push({ block: { kind: 'heading', level: heading.level, text: heading.title }, start: i, end: i + 1 });
      return;
    }

    const quoted = QUOTE.exec(rest);
    if (quoted) {
      this.closeLeaf(top);
      // A QUOTE WHOSE FIRST LINE NAMES A TONE IS A CALLOUT, and only that
      // line: `[!NOTE]` anywhere else is the text somebody wrote.
      const inner = quoted[1] ?? '';
      const tone = CALLOUT.exec(inner);
      this.stack.push({
        kind: 'quote',
        tone: tone ? ((tone[1] ?? 'note').toLowerCase() as MarkdownCalloutTone) : null,
        children: [],
        leaf: null,
        start: i,
        end: i + 1,
      });
      if (!tone) this.start(inner, i);
      return;
    }

    // A TABLE IS A HEADER PLUS ITS RULE, checked together: a line of pipes
    // with no delimiter under it is a paragraph that happens to contain
    // pipes, which is what a shell command or a file path looks like.
    if (rest.includes('|') && i + 1 < this.lines.length && TABLE_RULE.test(this.peel(i + 1, this.stack.length) ?? '')) {
      this.closeLeaf(top);
      top.leaf = { kind: 'table', head: splitRow(rest), align: [], rows: [], ruled: false, start: i, end: i + 1 };
      return;
    }

    // AN EMPTY ITEM DOES NOT INTERRUPT A PARAGRAPH, as in CommonMark: a "-"
    // or a "1." under a line of text is that text's next line, so a sum
    // wrapped before its last figure is not cut into a paragraph and a list.
    const head = itemStart(rest);
    if (head && !(leaf?.kind === 'paragraph' && head.text === '')) {
      this.closeLeaf(top);
      const list: ListFrame = {
        kind: 'list',
        ordered: head.ordered,
        marker: head.marker,
        number: head.ordered ? head.number : 1,
        loose: false,
        items: [],
        start: i,
        end: i + 1,
      };
      this.stack.push(list);
      this.openItem(list, head, i);
      return;
    }

    if (leaf?.kind === 'paragraph') {
      leaf.lines.push(rest);
      leaf.end = i + 1;
      return;
    }
    this.closeLeaf(top);
    top.leaf = { kind: 'paragraph', lines: [rest], start: i, end: i + 1 };
  }

  /** Open the item `head` starts on line `i`, and read its first line's content as the item's own first line. */
  private openItem(list: ListFrame, head: ItemStart, i: number): void {
    let text = head.text;
    let checked: boolean | null = null;
    const task = TASK.exec(text);
    if (task) {
      checked = (task[1] ?? ' ').toLowerCase() === 'x';
      text = task[2] ?? '';
    }
    list.end = i + 1;
    this.stack.push({
      kind: 'item',
      content: head.content,
      checked,
      bare: blank(text),
      blankUntil: 0,
      children: [],
      leaf: null,
      start: i,
      end: i + 1,
    });
    if (!blank(text)) this.start(text, i);
  }

  /** Every open container has read up to line `i`. */
  private extend(i: number): void {
    this.root.end = i + 1;
    for (const frame of this.stack) frame.end = i + 1;
  }

  /** Finish the open leaf of `holder`, if it has one. */
  private closeLeaf(holder: Holder): void {
    const leaf = holder.leaf;
    if (!leaf) return;
    holder.leaf = null;
    let block: MarkdownBlock;
    switch (leaf.kind) {
      case 'paragraph':
        block = { kind: 'paragraph', text: leaf.lines.join('\n') };
        break;
      case 'code':
        // A fence that is never closed still renders what it opened: the
        // alternative is dropping the rest of a document over a missing line.
        // Its last line is the document's own terminating newline rather than
        // a blank line somebody typed, so it is not content.
        if (leaf.lines.length > 0 && leaf.lines[leaf.lines.length - 1] === '') leaf.lines.pop();
        block = codeOf(leaf);
        break;
      case 'table':
        block = { kind: 'table', head: leaf.head, align: leaf.align, rows: leaf.rows };
        break;
    }
    holder.children.push({ block, start: leaf.start, end: leaf.end });
  }

  /** Close every open container from `depth` up, each into the one it is in. */
  private closeFrom(depth: number): void {
    while (this.stack.length > depth) {
      const frame = this.stack.pop()!;
      const parent = this.stack[this.stack.length - 1] ?? this.root;
      if (frame.kind === 'list') {
        const { ordered, number, marker, loose, items } = frame;
        (parent as Holder).children.push({
          block: { kind: 'list', ordered, start: number, marker, loose, items },
          start: frame.start,
          end: frame.end,
        });
        continue;
      }
      this.closeLeaf(frame as Holder);
      if (frame.kind === 'item') {
        const list = parent as ListFrame;
        // CommonMark's second rule of a loose list: an item holding two blocks
        // with a blank line between them. A blank line inside one of them (a
        // fence's, a nested list's) is that block's own and does not count.
        const spans = frame.children;
        if (spans.some((span, j) => j > 0 && span.start > (spans[j - 1]?.end ?? 0))) list.loose = true;
        list.items.push({ checked: frame.checked, blocks: spans.map((span) => span.block) });
      } else if (frame.kind === 'quote') {
        const blocks = frame.children.map((span) => span.block);
        (parent as Holder).children.push({
          block: frame.tone ? { kind: 'callout', tone: frame.tone, blocks } : { kind: 'quote', blocks },
          start: frame.start,
          end: frame.end,
        });
      }
    }
  }
}

function codeOf(leaf: Extract<Leaf, { kind: 'code' }>): MarkdownBlock {
  return { kind: 'code', lang: leaf.lang, text: leaf.lines.join('\n'), fence: leaf.marker };
}

// --- inline ----------------------------------------------------------------

/**
 * The inline grammar, as one alternation.
 *
 * ORDER MATTERS. An escape comes first, so `\*` is an asterisk and `` \` ``
 * opens no code span. A backtick span is opaque, so `**not bold**` inside one
 * stays literal. Images precede links because their syntax is a link with a
 * `!` in front of it.
 *
 * A LABEL MAY CARRY ESCAPED BRACKETS (`[a \] b](url)`), which is how a link
 * to a page whose title holds a bracket is written; and a DESTINATION MAY
 * CARRY ONE LEVEL OF BALANCED PARENTHESES, which is what a Wikipedia URL
 * needs, and also what stops a refused `[label](javascript:alert(1))` from
 * rendering its closing bracket as a stray character beside the label.
 *
 * EMPHASIS FOLLOWS COMMONMARK'S DELIMITER-RUN RULES (W is whitespace or either
 * end of the text, P is punctuation or a symbol):
 *
 *  - a run OPENS only when LEFT-FLANKING (not followed by W, and either not
 *    followed by P or preceded by W or P) and CLOSES only when
 *    RIGHT-FLANKING, the mirror image; so `*foo *` is not emphasis;
 *  - an UNDERSCORE run also opens only after W or P and closes only before W
 *    or P, so one inside a word is a letter of it: `snake_case_name` stays
 *    itself, while `_word_` and `__init__` are still emphasis;
 *  - an ASTERISK inside a word still works both ways, as CommonMark says.
 *
 * Every rule is a lookaround, which is why the walk ([markdownInline]) runs
 * the pattern over the WHOLE text from a moving index rather than over what
 * is left after each construct: sliced, a run right after a construct would
 * be judged against the start of the text instead of its real neighbour.
 */
const NOT_WP = String.raw`[^\s\p{P}\p{S}]`;
const WP = String.raw`[\s\p{P}\p{S}]`;
const PUNCT = String.raw`[\p{P}\p{S}]`;
const leftFlanking = (d: string) => String.raw`(?:(?<!${NOT_WP})${d}(?!\s|$)|(?<=${NOT_WP})${d}(?!${WP}|$))`;
const rightFlanking = (d: string) => String.raw`(?:(?<=${NOT_WP})${d}|(?<=${PUNCT})${d}(?!${NOT_WP}))`;
const underOpens = (d: string) => String.raw`(?<!${NOT_WP})${d}(?!\s|$)`;
const underCloses = (d: string) => String.raw`(?<!\s)${d}(?!${NOT_WP})`;
/** A label: anything but an unescaped closing bracket. */
const label = (name: string) => String.raw`(?<${name}>(?:\\[\s\S]|[^\]\\])*)`;
/** A destination, captured as `name`, and its optional quoted title. */
const destination = (name: string, title: string) =>
  String.raw`(?<${name}>(?:[^()\s]|\([^()\s]*\))*)(?:\s+"(?<${title}>[^"]*)")?\)`;

/**
 * A link's label, which may also hold a picture: `[![build](badge.svg)](ci)`
 * is how a badge that links somewhere is written. The picture is matched
 * whole before its brackets are read as the label's, so its `]` does not end
 * the label and its address is not taken for the link's.
 */
const linkLabel = (name: string) =>
  String.raw`(?<${name}>(?:\\[\s\S]|!\[(?:\\[\s\S]|[^\]\\])*\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)|[^\]\\])*)`;

/** ASCII punctuation, the characters a backslash escapes. */
const ASCII_PUNCTUATION = String.raw`[!-\/:-@\[-\x60{-~]`;

const INLINE_SOURCE = [
  String.raw`\\(?<esc>${ASCII_PUNCTUATION})`,
  String.raw`(?<tick>\x60+)(?<code>[\s\S]*?)\k<tick>`,
  String.raw`!\[` + label('alt') + String.raw`\]\(` + destination('src', 'srcTitle'),
  String.raw`\[` + linkLabel('label') + String.raw`\]\(` + destination('href', 'hrefTitle'),
  String.raw`<(?<auto>(?:https?:|mailto:)[^>\s]+)>`,
  // A strong run closes on a `**` no third asterisk follows, so `***both***`
  // is strong around emphasis rather than strong around `*both` and a stray.
  leftFlanking(String.raw`\*\*`) + String.raw`(?<strong>[\s\S]+?)` + rightFlanking(String.raw`\*\*(?!\*)`),
  underOpens('__') + String.raw`(?<strongUnder>[\s\S]+?)` + underCloses('__'),
  leftFlanking(String.raw`\*`) + String.raw`(?<em>[\s\S]+?)` + rightFlanking(String.raw`\*`),
  underOpens('_') + String.raw`(?<emUnder>[\s\S]+?)` + underCloses('_'),
  String.raw`~~(?<del>[\s\S]+?)~~`,
].join('|');

/** What one inline construct captured, by name. */
export interface MarkdownInlineGroups {
  /** An escaped ASCII punctuation character, without its backslash. */
  esc?: string;
  tick?: string;
  code?: string;
  alt?: string;
  src?: string;
  srcTitle?: string;
  label?: string;
  href?: string;
  hrefTitle?: string;
  auto?: string;
  strong?: string;
  strongUnder?: string;
  em?: string;
  emUnder?: string;
  del?: string;
}

/** One inline construct: where it starts and ends in the text, and what it captured. */
export interface MarkdownInlineMatch {
  index: number;
  end: number;
  groups: MarkdownInlineGroups;
}

/**
 * Every inline construct of `text`, in order: THE ONE WALK every reader of
 * inline Markdown takes, so a renderer, a text flattener and an editor can
 * never disagree about where a construct begins.
 *
 * A fresh pattern per walk: the walk is re-entered for a construct's own
 * content before the outer one has finished, and a shared `g` pattern carries
 * its position in `lastIndex`.
 */
export function* markdownInline(text: string): Generator<MarkdownInlineMatch> {
  const pattern = new RegExp(INLINE_SOURCE, 'gu');
  for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
    yield { index: m.index, end: m.index + m[0].length, groups: (m.groups ?? {}) as MarkdownInlineGroups };
  }
}

/**
 * A code span's content as it reads: ONE leading and one trailing space go,
 * which is how CommonMark lets a span start with a backtick of its own.
 */
export function markdownCodeText(code: string): string {
  return code.replace(/^ | $/g, '');
}

/**
 * The splits a run of text breaks at: two trailing spaces or a backslash
 * before a newline is a HARD break; every other newline is soft. With
 * `hard`, every newline is a break and the two markers are consumed with it.
 */
export function markdownBreaks(text: string, hard = false): string[] {
  return text.split(hard ? /(?:  +|\\)?\n/ : /(?:  +|\\)\n/);
}
