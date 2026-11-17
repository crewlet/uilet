/**
 * The shapes a line diff is drawn from, and what a host does with them: count
 * a diff, collapse a whole one to its changes, or cut a preview. Two texts are
 * compared by [compareLines] (`lineDiff.ts`). Framework free.
 */

/** One line of a diff. `same` lines carry both numbers. */
export interface DiffLine {
  kind: 'same' | 'add' | 'remove';
  text: string;
  /** 1-based line number in the OLD document, or null on an addition. */
  before: number | null;
  /** 1-based line number in the NEW document, or null on a removal. */
  after: number | null;
  /** Where a setting is (a configuration path, a file): a keyed diff draws it in place of the numbers. */
  path?: string | undefined;
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
  lines: readonly DiffLine[];
  /** How many unchanged lines were dropped BEFORE this section. */
  skipped: number;
}

/**
 * Split a text into the lines a diff compares: every line ending ends one, and
 * a final newline ends the last line rather than starting another.
 */
export function splitLines(text: string): string[] {
  if (!text) return [];
  const out = text.split(/\r\n|\n|\r/);
  if (out[out.length - 1] === '') out.pop();
  return out;
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
