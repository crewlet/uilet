/**
 * Two texts compared line by line: the shortest edit (Myers 1986) in linear
 * space, bounded, and saying why when it did not compare ([Uncompared]).
 */

import { splitLines, type DiffLine, type DiffSection } from './diff.js';

/**
 * The most lines a comparison reads on a side of what changed. With [MAX_EDITS]
 * it bounds the work: 20,000 lines a side with 4,000 edited took about 100 ms in
 * Node 24 on a laptop core.
 */
export const MAX_COMPARE_LINES = 20_000;

/** The most lines removed and added before two texts are too different to compare. */
export const MAX_EDITS = 4_000;

/** Unchanged lines kept either side of a change by default: git's own three. */
export const CONTEXT_LINES = 3;

/** Why two texts were not compared line by line. */
export type Uncompared =
  /** What changed spans more lines a side than a comparison reads: `lines` is the longer side's. */
  | { kind: 'too-large'; lines: number }
  /** More than [MAX_EDITS] lines were removed and added between them. */
  | { kind: 'too-different' };

/** Two texts compared: the changed runs with their context, none when the texts match, or why not. */
export type LineComparison = { kind: 'compared'; sections: DiffSection[] } | Uncompared;

/** One run of a comparison: lines both texts hold, or lines removed and added. */
export type EditRun = { kind: 'same'; count: number } | { kind: 'change'; removed: number; added: number };

/** Compares `before` with `after` line by line, keeping `context` unchanged lines either side of each change. */
export function compareLines(before: string, after: string, context: number = CONTEXT_LINES): LineComparison {
  const a = splitLines(before);
  const b = splitLines(after);
  const compared = compareSequences(a, b);
  if (compared.kind !== 'compared') return compared;
  return { kind: 'compared', sections: sectionsOf(compared.runs, a, b, context) };
}

/**
 * The shortest edit turning `a` into `b` as runs front to back, or why it was
 * not made: [compareLines]'s comparison over any sequence of strings, such as
 * a page's blocks or a block's words.
 */
export function compareSequences(
  a: readonly string[],
  b: readonly string[],
): { kind: 'compared'; runs: EditRun[] } | Uncompared {
  const shortest = Math.min(a.length, b.length);
  let start = 0;
  while (start < shortest && a[start] === b[start]) start++;
  let end = 0;
  while (end < shortest - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const longest = Math.max(a.length - start - end, b.length - start - end);
  if (longest > MAX_COMPARE_LINES) return { kind: 'too-large', lines: longest };
  const middle = shortestEdit(a, b, start, end);
  if (middle === null) return { kind: 'too-different' };
  const runs = new Runs();
  runs.same(start);
  runs.append(middle);
  runs.same(end);
  return { kind: 'compared', runs: runs.all };
}

/** Why two texts were not compared, as the clause after "not compared line by line:". */
export function notComparedReason(why: Uncompared): string {
  return why.kind === 'too-large'
    ? `what changed spans ${why.lines.toLocaleString()} lines, more than the ${MAX_COMPARE_LINES.toLocaleString()} a comparison reads`
    : `more than ${MAX_EDITS.toLocaleString()} lines were removed or added`;
}

/**
 * A floor under the lines removed and added that turn `a` into `b`: an
 * alignment keeps a line no more often than the text holding it fewer times.
 */
export function distanceFloor(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const held = new Map<number, number>();
  for (let i = 0; i < a.length; i++) held.set(a[i]!, (held.get(a[i]!) ?? 0) + 1);
  let common = 0;
  for (let j = 0; j < b.length; j++) {
    const left = held.get(b[j]!) ?? 0;
    if (left === 0) continue;
    held.set(b[j]!, left - 1);
    common++;
  }
  return a.length + b.length - 2 * common;
}

/** A comparison's runs, front to back: two changes with nothing kept between them are one. */
class Runs {
  readonly all: EditRun[] = [];

  same(count: number): void {
    if (count === 0) return;
    const last = this.all[this.all.length - 1];
    if (last?.kind === 'same') last.count += count;
    else this.all.push({ kind: 'same', count });
  }

  change(removed: number, added: number): void {
    if (removed + added === 0) return;
    const last = this.all[this.all.length - 1];
    if (last?.kind === 'change') {
      last.removed += removed;
      last.added += added;
    } else {
      this.all.push({ kind: 'change', removed, added });
    }
  }

  append(other: Runs): void {
    for (const run of other.all) {
      if (run.kind === 'same') this.same(run.count);
      else this.change(run.removed, run.added);
    }
  }
}

/** The shortest edit between the shared start and end, or null past [MAX_EDITS]. */
function shortestEdit(a: readonly string[], b: readonly string[], start: number, end: number): Runs | null {
  const n = a.length - start - end;
  const m = b.length - start - end;
  const runs = new Runs();
  if (n === 0 || m === 0) {
    if (n + m > MAX_EDITS) return null;
    runs.change(n, m);
    return runs;
  }
  const ids = new Map<string, number>();
  const intern = (line: string) => {
    let id = ids.get(line);
    if (id === undefined) {
      id = ids.size;
      ids.set(line, id);
    }
    return id;
  };
  const x = new Int32Array(n);
  const y = new Int32Array(m);
  for (let i = 0; i < n; i++) x[i] = intern(a[start + i]!);
  for (let j = 0; j < m; j++) y[j] = intern(b[start + j]!);
  // A pair that cannot be within the bound is answered in one pass, before any round.
  if (distanceFloor(x, y) > MAX_EDITS) return null;
  return edit(x, y, 0, n, 0, m, runs, MAX_EDITS) ? runs : null;
}

interface Cut {
  x: number;
  y: number;
}

/**
 * Writes the shortest edit turning `a[x0, x1)` into `b[y0, y1)` onto `runs`, or
 * answers false past `budget`. Only the whole is budgeted: its halves fit in it.
 */
function edit(a: Int32Array, b: Int32Array, x0: number, x1: number, y0: number, y1: number, runs: Runs, budget: number): boolean {
  let start = 0;
  while (x0 + start < x1 && y0 + start < y1 && a[x0 + start] === b[y0 + start]) start++;
  let end = 0;
  while (x1 - end > x0 + start && y1 - end > y0 + start && a[x1 - 1 - end] === b[y1 - 1 - end]) end++;
  const fromX = x0 + start;
  const toX = x1 - end;
  const fromY = y0 + start;
  const toY = y1 - end;
  const n = toX - fromX;
  const m = toY - fromY;
  const cut =
    n === 0 || m === 0 ? (n + m > budget ? null : 'nothing in common') : middleSnake(a, b, fromX, toX, fromY, toY, budget);
  if (cut === null) return false;
  runs.same(start);
  if (cut === 'nothing in common') {
    runs.change(n, m);
  } else {
    edit(a, b, fromX, cut.x, fromY, cut.y, runs, Infinity);
    edit(a, b, cut.x, toX, cut.y, toY, runs, Infinity);
  }
  runs.same(end);
  return true;
}

/**
 * Where a shortest edit crosses the middle of its distance (Myers 1986, §4b):
 * the forward and reverse frontiers run until they overlap. A distance D is
 * found by round ⌈D/2⌉, so a budget B is decided by round ⌈B/2⌉.
 */
function middleSnake(
  a: Int32Array,
  b: Int32Array,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  budget: number,
): Cut | 'nothing in common' | null {
  const n = x1 - x0;
  const m = y1 - y0;
  const most = Math.ceil((n + m) / 2);
  const rounds = Math.min(most, Math.ceil(budget / 2) + 1);
  // How far along each diagonal k = x - y each frontier has come; -1 is not reached.
  const offset = rounds;
  const size = 2 * rounds + 2;
  const forward = new Int32Array(size).fill(-1);
  const reverse = new Int32Array(size).fill(-1);
  forward[offset + 1] = 0;
  reverse[offset + 1] = 0;
  const delta = n - m;
  const odd = (delta & 1) !== 0;
  let forwardFrom = 0;
  let forwardTo = 0;
  let reverseFrom = 0;
  let reverseTo = 0;
  const within = (distance: number, cut: Cut) => (distance > budget ? null : cut);
  for (let d = 0; d < rounds; d++) {
    for (let k = -d + forwardFrom; k <= d - forwardTo; k += 2) {
      const at = offset + k;
      let x = k === -d || (k !== d && forward[at - 1]! < forward[at + 1]!) ? forward[at + 1]! : forward[at - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x0 + x] === b[y0 + y]) {
        x++;
        y++;
      }
      forward[at] = x;
      if (x > n) forwardTo += 2;
      else if (y > m) forwardFrom += 2;
      else if (odd) {
        const mirror = offset + delta - k;
        if (mirror >= 0 && mirror < size && reverse[mirror] !== -1 && x >= n - reverse[mirror]!) {
          return within(2 * d - 1, { x: x0 + x, y: y0 + y });
        }
      }
    }
    for (let k = -d + reverseFrom; k <= d - reverseTo; k += 2) {
      const at = offset + k;
      let x = k === -d || (k !== d && reverse[at - 1]! < reverse[at + 1]!) ? reverse[at + 1]! : reverse[at - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x1 - 1 - x] === b[y1 - 1 - y]) {
        x++;
        y++;
      }
      reverse[at] = x;
      if (x > n) reverseTo += 2;
      else if (y > m) reverseFrom += 2;
      else if (!odd) {
        const mirror = offset + delta - k;
        if (mirror >= 0 && mirror < size && forward[mirror] !== -1) {
          const fx = forward[mirror]!;
          if (fx >= n - x) return within(2 * d, { x: x0 + fx, y: y0 + fx - (mirror - offset) });
        }
      }
    }
  }
  return rounds === most && n + m <= budget ? 'nothing in common' : null;
}

/**
 * Runs as the sections a diff draws: each change with up to `context`
 * unchanged lines either side, built without the unchanged lines left out.
 */
function sectionsOf(runs: readonly EditRun[], a: readonly string[], b: readonly string[], context: number): DiffSection[] {
  const out: DiffSection[] = [];
  let x = 0;
  let y = 0;
  let open: DiffLine[] | null = null;
  let skipped = 0;
  const section = (): DiffLine[] => {
    if (open) return open;
    const lines: DiffLine[] = [];
    out.push({ lines, skipped });
    skipped = 0;
    open = lines;
    return lines;
  };
  const keep = (count: number) => {
    const lines = section();
    for (let i = 0; i < count; i++, x++, y++) lines.push({ kind: 'same', text: a[x]!, before: x + 1, after: y + 1 });
  };
  runs.forEach((run, r) => {
    if (run.kind === 'change') {
      const lines = section();
      for (let i = 0; i < run.removed; i++, x++) lines.push({ kind: 'remove', text: a[x]!, before: x + 1, after: null });
      for (let i = 0; i < run.added; i++, y++) lines.push({ kind: 'add', text: b[y]!, before: null, after: y + 1 });
      return;
    }
    // The context after the change before, the context before the change after; the gap between closes the section.
    const after = r > 0 ? Math.min(context, run.count) : 0;
    const before = r < runs.length - 1 ? Math.min(context, run.count - after) : 0;
    if (after > 0) keep(after);
    const gap = run.count - after - before;
    if (gap > 0) {
      x += gap;
      y += gap;
      skipped += gap;
      open = null;
    }
    if (before > 0) keep(before);
  });
  return out;
}
