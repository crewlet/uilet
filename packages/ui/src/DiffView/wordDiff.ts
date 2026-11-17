/**
 * Where an edited line changed: the ONE run between what a removed line and
 * its added line share at their start and at their end, in whole tokens. A
 * word-by-word diff would mark every word the edit moved past.
 */

/** A stretch of a line's text, as offsets into it: `start` inclusive, `end` exclusive. */
export interface Run {
  start: number;
  end: number;
}

/** What to underline on each line of a pair, or nothing on a side that only lost or gained. */
export interface ChangedRuns {
  before: Run | null;
  after: Run | null;
}

/** A token of a line; `word` when it holds a letter or a digit. */
export interface LineToken {
  text: string;
  start: number;
  end: number;
  word: boolean;
}

const NONE: ChangedRuns = { before: null, after: null };

/**
 * One token: a single ideograph or kana (those scripts put no space between
 * words); else a run of letters, digits, joining marks and underscores; else
 * a run of white space; else any one character.
 */
const TOKEN =
  /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]|(?:(?![\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}])[\p{L}\p{N}\p{M}_])+|\s+|[^]/gu;

const WORD = /[\p{L}\p{N}]/u;

/** A line's tokens, in order, covering every character of it. */
export function lineTokens(text: string): LineToken[] {
  const out: LineToken[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index;
    out.push({ text: m[0], start, end: start + m[0].length, word: WORD.test(m[0]) });
  }
  return out;
}

function span(all: LineToken[], from: number, to: number): Run | null {
  if (from >= to) return null;
  return { start: all[from]!.start, end: all[to - 1]!.end };
}

/**
 * The run of `before` and of `after` that differ, when the two are one line
 * edited. Two lines that share no word at their ends are two lines, and
 * nothing is underlined.
 */
export function changedRuns(before: string, after: string): ChangedRuns {
  const a = lineTokens(before);
  const b = lineTokens(after);
  let head = 0;
  while (head < a.length && head < b.length && a[head]!.text === b[head]!.text) head++;
  // The shared end stops where the shared start began, so no token counts twice.
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail]!.text === b[b.length - 1 - tail]!.text) {
    tail++;
  }
  const shared = a.slice(0, head).concat(a.slice(a.length - tail));
  if (!shared.some((t) => t.word)) return NONE;
  return { before: span(a, head, a.length - tail), after: span(b, head, b.length - tail) };
}

/** A host's run of a line's text, up to `end` (exclusive), drawn with `className`, or plain. */
export interface DiffSpan {
  end: number;
  className: string | null;
}

/** One piece of a drawn line: the changed run, or a stretch with its class or none. */
export interface Segment {
  start: number;
  end: number;
  className: string | null;
  run: boolean;
}

/**
 * A line cut at its spans' ends and its run's edges, covering it in order. The
 * run is one segment with no class: its text keeps the line's own ink on its tint.
 */
export function segments(text: string, spans: readonly DiffSpan[] | null, run: Run | null): Segment[] {
  const length = text.length;
  const from = run ? Math.min(Math.max(run.start, 0), length) : 0;
  const to = run ? Math.min(Math.max(run.end, from), length) : 0;
  const out: Segment[] = [];
  let ran = false;
  const push = (start: number, end: number, className: string | null) => {
    if (end <= start) return;
    const last = out[out.length - 1];
    if (className === null && last && !last.run && last.className === null && last.end === start) {
      last.end = end;
    } else {
      out.push({ start, end, className, run: false });
    }
  };
  const piece = (start: number, end: number, className: string | null) => {
    if (!run || end <= from || start >= to) {
      // A run of no length sits between the pieces it divides.
      if (run && !ran && start >= to) {
        out.push({ start: from, end: to, className: null, run: true });
        ran = true;
      }
      push(start, end, className);
      return;
    }
    push(start, from, className);
    if (!ran) out.push({ start: from, end: to, className: null, run: true });
    ran = true;
    push(to, end, className);
  };
  let at = 0;
  for (const span of spans ?? []) {
    const end = Math.min(span.end, length);
    if (end <= at) continue;
    piece(at, end, span.className);
    at = end;
  }
  piece(at, length, null);
  if (run && !ran) out.push({ start: from, end: to, className: null, run: true });
  if (out.length === 0) out.push({ start: 0, end: 0, className: null, run: false });
  return out;
}
