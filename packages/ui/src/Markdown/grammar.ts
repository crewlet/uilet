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
 * In-app routes (`#/work/ENG-1`) are allowed because they are how a page
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

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^(```|~~~)\s*([A-Za-z0-9_+-]*)\s*$/;
const RULE = /^(?:\s*(?:-{3,}|\*{3,}|_{3,})\s*)$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})([.)])\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
const CALLOUT = /^\[!(note|tip|important|warning|caution)\]\s*$/i;
const TASK = /^\[([ xX])\]\s+(.*)$/;

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
 */
const FENCE_CLOSE: Record<MarkdownFence, RegExp> = {
  '```': /^`{3,}[ \t]*$/,
  '~~~': /^~{3,}[ \t]*$/,
};

/** Whether `line` closes a fence opened with `marker`. */
export function markdownClosesFence(line: string, marker: MarkdownFence): boolean {
  return FENCE_CLOSE[marker].test(line);
}

/** The fence `line` opens, with its info string, or null when it opens none. */
export function markdownFenceOf(line: string): { marker: MarkdownFence; lang: string } | null {
  const m = FENCE.exec(line);
  return m ? { marker: (m[1] ?? '```') as MarkdownFence, lang: m[2] ?? '' } : null;
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
        body.push(lines[i] ?? '');
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

    if (BULLET.test(line) || ORDERED.test(line)) {
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

/**
 * Parse one list and everything nested under it.
 *
 * NESTING IS BY INDENT, measured against the FIRST item's marker rather than
 * against a fixed two spaces, which is what makes a four-space-indented
 * document render as the nesting its author meant.
 */
function parseList(lines: string[], start: number): [MarkdownBlock, number] {
  const head = lines[start] ?? '';
  const firstBullet = BULLET.exec(head);
  const firstOrdered = ORDERED.exec(head);
  const baseIndent = ((firstBullet ?? firstOrdered)?.[1] ?? '').length;
  const ordered = firstOrdered !== null && firstBullet === null;
  const startNumber = ordered ? Number(firstOrdered?.[2] ?? 1) : 1;
  const marker = ordered ? (firstOrdered?.[3] ?? '.') : (firstBullet?.[2] ?? '-');

  const items: MarkdownListItem[] = [];
  let i = start;
  let own: string[] = [];
  let checked: boolean | null = null;
  let open = false;
  let loose = false;

  const close = () => {
    if (!open) return;
    items.push({ checked, blocks: parseMarkdown(own.join('\n')) });
    own = [];
    checked = null;
    open = false;
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const bullet = BULLET.exec(line);
    const numbered = ORDERED.exec(line);
    const found = bullet ?? numbered;
    const indent = (found?.[1] ?? '').length;

    if (found && indent === baseIndent) {
      // A marker of the OTHER kind at this level ends the list: a bulleted
      // list and a numbered one are two lists, not one with mixed markers.
      if (ordered !== (numbered !== null && bullet === null)) break;
      close();
      open = true;
      const body = (bullet ? bullet[3] : numbered?.[4]) ?? '';
      const task = TASK.exec(body);
      if (task) {
        checked = (task[1] ?? ' ').toLowerCase() === 'x';
        own.push(task[2] ?? '');
      } else {
        own.push(body);
      }
      i++;
      continue;
    }
    if (found && indent > baseIndent) {
      // Nested: the whole indented run goes to this item's own parse, with
      // the base indent removed so the inner list measures from zero.
      own.push(line.slice(baseIndent));
      i++;
      continue;
    }
    if (line.trim() === '') {
      // A blank line inside a list ends it only if nothing continues it.
      const following = lines[i + 1] ?? '';
      const continues = BULLET.test(following) || ORDERED.test(following) || /^\s{2,}\S/.test(following);
      if (!continues) break;
      // A blank line before a sibling marker makes the list loose; one before
      // an item's own indented content is part of that item.
      const sibling = BULLET.exec(following) ?? ORDERED.exec(following);
      if (sibling && (sibling[1] ?? '').length === baseIndent) loose = true;
      own.push('');
      i++;
      continue;
    }
    if (found === null && /^\s{2,}\S/.test(line) && open) {
      own.push(line.slice(baseIndent));
      i++;
      continue;
    }
    break;
  }
  close();
  return [{ kind: 'list', ordered, start: startNumber, marker, loose, items }, i];
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
