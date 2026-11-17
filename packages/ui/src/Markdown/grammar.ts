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
 * and never the text of a paragraph (see [parseList]).
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
// A MARKER ALONE ON ITS LINE IS AN EMPTY ITEM, as CommonMark reads it: "1."
// and "-" with nothing after them, or with only the space an editor strips.
// Its text group is then undefined, which an item reads as nothing.
const BULLET = /^(\s*)([-*+])(?:\s+(.*))?$/;
const ORDERED = /^(\s*)(\d{1,9})([.)])(?:\s+(.*))?$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const CALLOUT = /^\[!(note|tip|important|warning|caution)\]\s*$/i;
const TASK = /^\[([ xX])\](?:\s+(.*))?$/;

/** Whether a list line is a marker with nothing after it: an empty item. */
function bareMarker(line: string): boolean {
  const found = BULLET.exec(line) ?? ORDERED.exec(line);
  return found !== null && (found[found.length - 1] ?? '').trim() === '';
}

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
  return blocksOf(markdownLines(source)).map((span) => span.block);
}

/**
 * Split a document into its top-level blocks AND the lines each was read
 * from, for an editor that keeps the source of every block it did not change.
 */
export function parseMarkdownSpans(source: string): { lines: string[]; spans: MarkdownSpan[] } {
  const lines = markdownLines(source);
  return { lines, spans: blocksOf(lines) };
}

function blocksOf(lines: string[]): MarkdownSpan[] {
  const out: MarkdownSpan[] = [];
  let i = 0;

  const paragraph: string[] = [];
  let paragraphStart = 0;
  const flush = () => {
    if (paragraph.length) {
      out.push({
        block: { kind: 'paragraph', text: paragraph.join('\n') },
        start: paragraphStart,
        end: paragraphStart + paragraph.length,
      });
      paragraph.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const start = i;

    if (line.trim() === '') {
      flush();
      i++;
      continue;
    }

    const fence = markdownFenceOf(line);
    if (fence) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !markdownClosesFence(lines[i] ?? '', fence.marker)) {
        body.push(dedent(lines[i] ?? '', fence.indent));
        i++;
      }
      // A fence that is never closed still renders what it opened: the
      // alternative is dropping the rest of a document over a missing line.
      // Its last line is the document's own terminating newline rather than
      // a blank line somebody typed, so it is not content.
      if (i >= lines.length && body.length > 0 && body[body.length - 1] === '') {
        body.pop();
      }
      i = Math.min(i + 1, lines.length);
      out.push({
        block: { kind: 'code', lang: fence.lang, text: body.join('\n'), fence: fence.marker },
        start,
        end: i,
      });
      continue;
    }

    if (RULE.test(line)) {
      flush();
      i++;
      out.push({ block: { kind: 'rule' }, start, end: i });
      continue;
    }

    const heading = markdownHeadingOf(line);
    if (heading) {
      flush();
      i++;
      out.push({ block: { kind: 'heading', level: heading.level, text: heading.title }, start, end: i });
      continue;
    }

    if (QUOTE.test(line)) {
      flush();
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? '')) {
        inner.push(QUOTE.exec(lines[i] ?? '')?.[1] ?? '');
        i++;
      }
      // A QUOTE WHOSE FIRST LINE NAMES A TONE IS A CALLOUT, and only that
      // line: `[!NOTE]` anywhere else is the text somebody wrote.
      const tone = CALLOUT.exec(inner[0] ?? '');
      out.push({
        block: tone
          ? {
              kind: 'callout',
              tone: (tone[1] ?? 'note').toLowerCase() as MarkdownCalloutTone,
              blocks: parseMarkdown(inner.slice(1).join('\n')),
            }
          : { kind: 'quote', blocks: parseMarkdown(inner.join('\n')) },
        start,
        end: i,
      });
      continue;
    }

    // A TABLE IS A HEADER PLUS ITS RULE, checked together: a line of pipes
    // with no delimiter under it is a paragraph that happens to contain
    // pipes, which is what a shell command or a file path looks like.
    if (line.includes('|') && TABLE_RULE.test(lines[i + 1] ?? '')) {
      flush();
      const head = splitRow(line);
      const align = splitRow(lines[i + 1] ?? '').map(alignOf);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').includes('|') && (lines[i] ?? '').trim() !== '') {
        rows.push(splitRow(lines[i] ?? ''));
        i++;
      }
      out.push({ block: { kind: 'table', head, align, rows }, start, end: i });
      continue;
    }

    // AN EMPTY ITEM DOES NOT INTERRUPT A PARAGRAPH, as in CommonMark: a "-"
    // or a "1." under a line of text is that text's next line, so a sum
    // wrapped before its last figure is not cut into a paragraph and a list.
    if ((BULLET.test(line) || ORDERED.test(line)) && !(paragraph.length > 0 && bareMarker(line))) {
      flush();
      const [list, next] = parseList(lines, i);
      out.push({ block: list, start, end: next });
      i = next;
      continue;
    }

    if (paragraph.length === 0) paragraphStart = i;
    paragraph.push(line);
    i++;
  }
  flush();
  return out;
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

/** One alternation for both kinds of marker, matching what [BULLET] and [ORDERED] match. */
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
 * the paragraph above it: what a LAZY line may not do. `next` is the line
 * after it, which decides whether a line of pipes is a table's header.
 */
function startsBlock(line: string, next: string | undefined): boolean {
  return (
    blank(line) ||
    markdownFenceOf(line) !== null ||
    RULE.test(line) ||
    markdownHeadingOf(line) !== null ||
    QUOTE.test(line) ||
    itemStart(line) !== null ||
    (line.includes('|') && TABLE_RULE.test(next ?? ''))
  );
}

/**
 * Whether the blocks read from `lines` end in a paragraph still open at their
 * last line, directly or in the last item of a list: the paragraph a lazy line
 * would continue. A quote closes at its last `>` line in this grammar, and a
 * fence, a table or a heading never takes a lazy line.
 */
function endsInParagraph(lines: string[]): boolean {
  if (lines.length === 0 || blank(lines[lines.length - 1])) return false;
  const spans = blocksOf(lines);
  const last = spans[spans.length - 1];
  return last !== undefined && last.end === lines.length && openParagraph(last.block);
}

function openParagraph(block: MarkdownBlock): boolean {
  if (block.kind === 'paragraph') return true;
  if (block.kind !== 'list') return false;
  const blocks = block.items[block.items.length - 1]?.blocks ?? [];
  const last = blocks[blocks.length - 1];
  return last !== undefined && openParagraph(last);
}

/**
 * Read one item from its marker line at `start`: its blocks, whether a blank
 * line stands between two of them, and the line it ends before.
 *
 * AN ITEM'S LINES ARE READ AS BLOCKS, as CommonMark reads them. A line
 * indented at least as far as the item's content belongs to it, with that
 * indent taken off, and the lines are then parsed by [blocksOf] like a
 * document of their own: a fence, a table, a quote, a heading or a nested
 * list inside an item is that block. Reading them as the text of a paragraph
 * turned a fence into three backticks inline, and an editor writing that back
 * read a YAML `- name:` line inside it as a list item that swallowed the text
 * after it.
 *
 * A BLANK LINE belongs to the item when the next line that is not blank does,
 * which is what keeps a blank line inside a fence, or between two of the
 * item's paragraphs, from ending it. An item may start with at most one blank
 * line: a bare marker with a blank line under it is an empty item.
 *
 * A LAZY LINE, less indented than the item's content, still continues a
 * paragraph left open at the item's end, unless it starts a block of its own.
 * It is taken whole, its own indent gone, so the item's parse reads it as the
 * paragraph text it was taken for and never as a block its indent hid.
 */
function parseItem(lines: string[], start: number, head: ItemStart): [MarkdownListItem, boolean, number] {
  let checked: boolean | null = null;
  const task = TASK.exec(head.text);
  const own: string[] = [];
  if (task) {
    checked = (task[1] ?? ' ').toLowerCase() === 'x';
    own.push(task[2] ?? '');
  } else {
    own.push(head.text);
  }
  const bare = blank(own[0]);
  let i = start + 1;
  // Whether `own` ends in an open paragraph; null when a line has been added
  // since it was last worked out. Lazy lines keep it open, so a run of them
  // reads the item once rather than once a line.
  let lazy: boolean | null = null;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (blank(line)) {
      if (bare && own.length === 1) break;
      let k = i;
      while (k < lines.length && blank(lines[k])) k++;
      if (k >= lines.length || indentOf(lines[k] ?? '') < head.content) break;
      for (; i < k; i++) own.push(dedent(lines[i] ?? '', head.content));
      lazy = null;
      continue;
    }
    if (indentOf(line) >= head.content) {
      own.push(dedent(line, head.content));
      lazy = null;
      i++;
      continue;
    }
    const text = line.trimStart();
    if (startsBlock(text, lines[i + 1])) break;
    if (lazy === null) lazy = endsInParagraph(own);
    if (!lazy) break;
    own.push(text);
    i++;
  }
  const spans = blocksOf(own);
  // CommonMark's second rule of a loose list: an item holding two blocks with
  // a blank line between them. A blank line inside one of them (a fence's, a
  // nested list's) is that block's own and does not count.
  const spaced = spans.some((span, j) => j > 0 && span.start > (spans[j - 1]?.end ?? 0));
  return [{ checked, blocks: spans.map((span) => span.block) }, spaced, i];
}

/**
 * Parse one list: its items, each read as blocks by [parseItem].
 *
 * AN ITEM ENDS WHERE A LINE IS NOT ITS OWN, and the list goes on while the
 * next line starts an item of the same kind, at any indent short of the
 * previous item's content: CommonMark's siblings. A marker indented to the
 * content is inside the item, which is nesting; one short of it is not, so
 * `1. a` over `  - b` is two lists, as every CommonMark reader draws it.
 *
 * TWO BLANK LINES END A LIST, where one before a sibling makes it loose. It
 * is the one way to write two lists of one kind next to each other, and the
 * editor writes exactly that.
 */
function parseList(lines: string[], start: number): [MarkdownBlock, number] {
  const first = itemStart(lines[start] ?? '');
  const ordered = first?.ordered ?? false;
  const items: MarkdownListItem[] = [];
  let loose = false;
  let i = start;
  while (i < lines.length) {
    const head = itemStart(lines[i] ?? '');
    // A marker of the OTHER kind ends the list: a bulleted list and a
    // numbered one are two lists, not one with mixed markers.
    if (head === null || head.ordered !== ordered) break;
    const [item, spaced, next] = parseItem(lines, i, head);
    items.push(item);
    if (spaced) loose = true;
    i = next;
    if (blank(lines[i]) && i + 1 < lines.length && !blank(lines[i + 1])) {
      const sibling = itemStart(lines[i + 1] ?? '');
      if (sibling === null || sibling.ordered !== ordered) break;
      loose = true;
      i++;
    }
  }
  return [
    {
      kind: 'list',
      ordered,
      start: ordered ? (first?.number ?? 1) : 1,
      marker: first?.marker ?? (ordered ? '.' : '-'),
      loose,
      items,
    },
    i,
  ];
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
