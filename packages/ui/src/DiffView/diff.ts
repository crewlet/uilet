/**
 * What changed between two versions of a document, by line.
 *
 * OVER LINES, by the classic longest-common-subsequence table. The shape is
 * the one a prose document wants: a paragraph somebody rewrote is a line
 * replaced, not thirty character edits scattered through it. Word-level
 * refinement inside a changed line is deliberately absent: it makes a small
 * edit prettier and a large one unreadable, and documents are rewritten in
 * paragraphs.
 *
 * THE TABLE RATHER THAN MYERS, and [MAX_DIFF_LINES] is what pays for that
 * choice. The table is quadratic on every input, but it is a dozen lines
 * anybody can check by reading; the cap keeps the quadratic term small, and a
 * document past it is reported as a whole replacement rather than freezing the
 * tab.
 *
 * FRAMEWORK FREE. Nothing here imports React, so a host can compute a diff in
 * a worker or a test and hand the sections to [DiffView].
 */

/** One line of the result. `same` lines carry both numbers. */
export interface DiffLine {
  kind: 'same' | 'add' | 'remove';
  text: string;
  /** 1-based line number in the OLD document, or null on an addition. */
  before: number | null;
  /** 1-based line number in the NEW document, or null on a removal. */
  after: number | null;
}

/** What a diff amounts to, for a one-line summary above it. */
export interface DiffStat {
  added: number;
  removed: number;
  /** True when the two documents are identical, which is a real outcome. */
  identical: boolean;
}

/**
 * A run of lines kept for display, and how many unchanged lines were dropped
 * before it. The gap is a count rather than a marker line, so the renderer
 * decides what a gap looks like.
 */
export interface DiffSection {
  /** The lines of this section, in order. */
  lines: DiffLine[];
  /** How many unchanged lines were dropped BEFORE this section. */
  skipped: number;
}

/**
 * The size past which the table is not worth building.
 *
 * SIZED FROM THE TABLE'S MEMORY, because that is the quantity that binds and
 * it is paid on every input: `(N+1)` rows of `(M+1)` `Uint32` entries, every
 * cell filled. At two thousand lines that is about 16 MB and 60 ms, which a
 * tab holds without noticing; at ten thousand it is hundreds of megabytes and
 * seconds on the main thread. Raising it means replacing the table with Myers
 * or Hirschberg first.
 */
export const MAX_DIFF_LINES = 2_000;

/**
 * Split a document into the lines a diff compares.
 *
 * A trailing newline is not a line. Every file that ends properly has one, so
 * counting it would report an added last line on every document that gained
 * one. Both line endings read as one.
 */
export function splitLines(text: string): string[] {
  const normalised = (text ?? '').replace(/\r\n?/g, '\n');
  if (normalised === '') return [];
  return normalised.replace(/\n$/, '').split('\n');
}

/**
 * The line diff of two documents: every line of the result in order, context
 * included, because a document diff is read as a document rather than as a
 * patch.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    // TOO BIG TO COMPARE HONESTLY, so reported as a whole replacement, which
    // is true; the alternative is a tab that stops responding.
    return [
      ...a.map((text, i) => ({ kind: 'remove' as const, text, before: i + 1, after: null })),
      ...b.map((text, i) => ({ kind: 'add' as const, text, before: null, after: i + 1 })),
    ];
  }
  return walk(a, b, common(a, b));
}

/**
 * Count the additions and removals, and say when there are none: identical is
 * its own answer, not "0 added, 0 removed".
 */
export function diffStat(diff: readonly DiffLine[]): DiffStat {
  let added = 0;
  let removed = 0;
  for (const line of diff) {
    if (line.kind === 'add') added++;
    if (line.kind === 'remove') removed++;
  }
  return { added, removed, identical: added === 0 && removed === 0 };
}

/**
 * Drop the runs of unchanged lines a reader does not need, keeping `context`
 * lines either side of every change.
 *
 * A HOLE IS REPORTED, never silently closed: each section carries how many
 * lines were dropped before it, so a reader can tell a document with two edits
 * at its ends from one rewritten in the middle.
 */
export function collapseDiff(diff: readonly DiffLine[], context = 3): DiffSection[] {
  const keep = new Array<boolean>(diff.length).fill(false);
  diff.forEach((line, i) => {
    if (line.kind === 'same') return;
    for (let k = Math.max(0, i - context); k <= Math.min(diff.length - 1, i + context); k++) {
      keep[k] = true;
    }
  });

  const out: DiffSection[] = [];
  let skipped = 0;
  let current: DiffLine[] | null = null;
  diff.forEach((line, i) => {
    if (keep[i]) {
      if (!current) {
        current = [];
        out.push({ lines: current, skipped });
        skipped = 0;
      }
      current.push(line);
      return;
    }
    skipped++;
    current = null;
  });
  return out;
}

/**
 * The first `max` changed lines of a collapsed diff, and how many changed
 * lines are left out: what a preview of a save shows, with the count that says
 * it is one. An unchanged context line is drawn and not counted.
 *
 * A COUNT, never a quiet cut: a preview ending at its sixth line reads as a
 * save that changed six lines.
 */
export function firstChangedLines(
  sections: readonly DiffSection[],
  max: number,
): { sections: DiffSection[]; more: number } {
  const out: DiffSection[] = [];
  let shown = 0;
  let more = 0;
  for (const section of sections) {
    const kept: DiffLine[] = [];
    for (const line of section.lines) {
      const changed = line.kind !== 'same';
      if (shown >= max) {
        if (changed) more++;
        continue;
      }
      if (changed) shown++;
      kept.push(line);
    }
    if (kept.length > 0) out.push({ lines: kept, skipped: section.skipped });
  }
  return { sections: out, more };
}

/** The length of the longest common subsequence from each pair of positions, as the classic table. */
function common(a: readonly string[], b: readonly string[]): Uint32Array[] {
  const table: Uint32Array[] = [];
  for (let i = 0; i <= a.length; i++) table.push(new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    const row = table[i]!;
    const next = table[i + 1]!;
    for (let j = b.length - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? next[j + 1]! + 1 : Math.max(next[j]!, row[j + 1]!);
    }
  }
  return table;
}

/**
 * Walk the table into a result.
 *
 * A REMOVAL BEFORE AN ADDITION at every equal branch, so a replaced line reads
 * as the old one struck out above the new one rather than as an insertion
 * followed by an unrelated deletion.
 */
function walk(a: readonly string[], b: readonly string[], table: readonly Uint32Array[]): DiffLine[] {
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]!, before: i + 1, after: j + 1 });
      i++;
      j++;
      continue;
    }
    const down = table[i + 1]![j]!;
    const right = table[i]![j + 1]!;
    if (down >= right) {
      out.push({ kind: 'remove', text: a[i]!, before: i + 1, after: null });
      i++;
    } else {
      out.push({ kind: 'add', text: b[j]!, before: null, after: j + 1 });
      j++;
    }
  }
  while (i < a.length) {
    out.push({ kind: 'remove', text: a[i]!, before: i + 1, after: null });
    i++;
  }
  while (j < b.length) {
    out.push({ kind: 'add', text: b[j]!, before: null, after: j + 1 });
    j++;
  }
  return out;
}
