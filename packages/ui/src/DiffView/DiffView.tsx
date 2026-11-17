import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import type { DiffLine, DiffSection } from './diff.js';
import { compareLines, notComparedReason, type Uncompared } from './lineDiff.js';
import { changedRuns, segments, type ChangedRuns, type DiffSpan, type Run } from './wordDiff.js';

export interface DiffSummaryLabels {
  /** Read in place of the drawn counts: "3 lines added, 1 removed". */
  spoken: (added: number, removed: number) => string;
  /** What the counts are measured against: "against version 4". */
  against: (what: string) => string;
}

export const DIFF_SUMMARY_LABELS: DiffSummaryLabels = {
  spoken: (added, removed) =>
    `${added === 1 ? '1 line' : `${added.toLocaleString()} lines`} added, ${removed.toLocaleString()} removed`,
  against: (what) => `against ${what}`,
};

export interface DiffViewLabels extends DiffSummaryLabels {
  /** The row a dropped run of unchanged lines is drawn as: "12 unchanged lines". */
  skipped: (count: number) => string;
  /** Read in place of the `+` mark on an added line. */
  added: string;
  /** Read in place of the minus mark on a removed line. */
  removed: string;
  /** The region's accessible name when the caller gives none. */
  region: string;
  /** Said in place of the diff when nothing changed and the host gives no `empty`. */
  empty: string;
  /** Said in place of every row when two texts were not compared. */
  notCompared: (why: Uncompared) => string;
  /** A pickable line number's name: "Line 12: pick it". */
  pick: (line: DiffLine) => string;
}

export const DIFF_VIEW_LABELS: DiffViewLabels = {
  ...DIFF_SUMMARY_LABELS,
  skipped: (count) => (count === 1 ? '1 unchanged line' : `${count.toLocaleString()} unchanged lines`),
  added: 'Added',
  removed: 'Removed',
  region: 'Line changes',
  empty: 'Nothing changed.',
  notCompared: (why) => `The two versions were not compared line by line: ${notComparedReason(why)}.`,
  pick: (line) => `${line.after !== null ? 'Line' : 'Removed line'} ${line.after ?? line.before}: pick it`,
};

/** How the two sides are laid out. */
export type DiffLayout = 'unified' | 'split';

/** Sections a host computed, or two texts the diff compares by line. */
type DiffSource =
  | { sections: readonly DiffSection[]; before?: undefined; after?: undefined; context?: undefined }
  | {
      before: string;
      after: string;
      /** Unchanged lines kept either side of a change: three when unset. */
      context?: number | undefined;
      sections?: undefined;
    };

export type DiffViewProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
  DiffSource & {
    /** Unified by default; split only where the diff is at least the phone breakpoint wide. */
    layout?: DiffLayout | undefined;
    /** What the counts above the diff are measured against ("rev 12"); left out, no counts are drawn. */
    against?: string | undefined;
    /** Drawn in place of the diff when nothing changed. */
    empty?: ReactNode;
    /** What a host draws under a line (a finding, a thread); asked only for the rows drawn. */
    notes?: ((line: DiffLine) => ReactNode) | undefined;
    /** With it, each line's own number is a button that picks the line; Shift extends the pick. */
    onPick?: ((line: DiffLine, extend: boolean) => void) | undefined;
    /** Whether the host has picked a line, which is drawn marked. */
    picked?: ((line: DiffLine) => boolean) | undefined;
    /** The line to bring into view once, wherever the window is; a new predicate is a new reveal. */
    reveal?: ((line: DiffLine) => boolean) | undefined;
    /** A line's coloured spans (its syntax), by the side it is read from and its number there. */
    tokens?: ((side: 'before' | 'after', n: number) => readonly DiffSpan[] | null) | undefined;
    labels?: Partial<DiffViewLabels> | undefined;
  };

/** Rows a diff draws before only the blocks near the view hold theirs. */
export const WINDOW_FROM_ROWS = 1000;

/** Rows a window block holds. */
export const WINDOW_BLOCK_ROWS = 100;

/** A row's height in px until a drawn block is measured: 13px on the 1.45 leading, plus its padding. */
const ROW_ESTIMATE_PX = 21;

const PHONE_PX = Number.parseFloat(breakpoint.phone);

type Row =
  | { kind: 'skip'; count: number }
  /** `continues`: the line goes on the setting the line above began. */
  | { kind: 'line'; line: DiffLine; continues: boolean }
  | { kind: 'pair'; left: DiffLine | null; right: DiffLine | null };

/** A removed line and the added line it was edited into, its words read once, when first drawn. */
class Pair {
  private runs: ChangedRuns | undefined;

  constructor(
    private readonly removed: string,
    private readonly added: string,
  ) {}

  runOf(kind: 'remove' | 'add'): Run | null {
    this.runs ??= changedRuns(this.removed, this.added);
    return kind === 'remove' ? this.runs.before : this.runs.after;
  }
}

type Pairs = ReadonlyMap<DiffLine, Pair>;

/**
 * Which removed line each added one replaced, from the lines' kinds and paths
 * alone: in a text by position, in a keyed diff within one path.
 */
function pairsOf(sections: readonly DiffSection[], keyed: boolean): Pairs {
  const pairs = new Map<DiffLine, Pair>();
  const join = (removed: DiffLine, added: DiffLine) => {
    const pair = new Pair(removed.text, added.text);
    pairs.set(removed, pair);
    pairs.set(added, pair);
  };
  for (const section of sections) {
    const lines = section.lines;
    for (let i = 0; i < lines.length; ) {
      if (lines[i]!.kind === 'same') {
        i++;
        continue;
      }
      const removed: DiffLine[] = [];
      const added: DiffLine[] = [];
      for (; i < lines.length && lines[i]!.kind !== 'same'; i++) {
        const line = lines[i]!;
        (line.kind === 'remove' ? removed : added).push(line);
      }
      if (keyed) pairByPath(removed, added, join);
      else pairByPosition(removed, added, join);
    }
  }
  return pairs;
}

/**
 * The kth removed line with the kth added, only where position can still mean
 * one line edited: as many added as removed (the shape git's diff-highlight
 * pairs), or one line against several, the first of each.
 */
function pairByPosition(removed: readonly DiffLine[], added: readonly DiffLine[], join: (r: DiffLine, a: DiffLine) => void) {
  if (removed.length !== added.length && Math.min(removed.length, added.length) !== 1) return;
  for (let k = 0; k < Math.min(removed.length, added.length); k++) join(removed[k]!, added[k]!);
}

function pairByPath(removed: readonly DiffLine[], added: readonly DiffLine[], join: (r: DiffLine, a: DiffLine) => void) {
  const sides = new Map<string, { removed: DiffLine[]; added: DiffLine[] }>();
  const sideOf = (path: string) => {
    let side = sides.get(path);
    if (!side) sides.set(path, (side = { removed: [], added: [] }));
    return side;
  };
  for (const line of removed) if (line.path !== undefined) sideOf(line.path).removed.push(line);
  for (const line of added) if (line.path !== undefined) sideOf(line.path).added.push(line);
  for (const side of sides.values()) pairByPosition(side.removed, side.added, join);
}

/** The rows a diff draws; split, a change's removed lines run down the left beside its added lines. */
function rowsOf(sections: readonly DiffSection[], split: boolean): Row[] {
  const rows: Row[] = [];
  for (const section of sections) {
    if (section.skipped > 0) rows.push({ kind: 'skip', count: section.skipped });
    const lines = section.lines;
    if (!split) {
      lines.forEach((line, i) => rows.push({ kind: 'line', line, continues: continuesAbove(line, lines[i - 1]) }));
      continue;
    }
    for (let i = 0; i < lines.length; ) {
      const line = lines[i]!;
      if (line.kind === 'same') {
        rows.push({ kind: 'pair', left: line, right: line });
        i++;
        continue;
      }
      const removed: DiffLine[] = [];
      const added: DiffLine[] = [];
      for (; i < lines.length && lines[i]!.kind !== 'same'; i++) {
        const changed = lines[i]!;
        (changed.kind === 'remove' ? removed : added).push(changed);
      }
      for (let k = 0; k < Math.max(removed.length, added.length); k++) {
        rows.push({ kind: 'pair', left: removed[k] ?? null, right: added[k] ?? null });
      }
    }
  }
  return rows;
}

/** A keyed line that goes on the setting above it (same path, same side) does not write its path again. */
function continuesAbove(line: DiffLine, above: DiffLine | undefined): boolean {
  return line.path !== undefined && above !== undefined && above.path === line.path && above.kind === line.kind;
}

function underlineOf(pairs: Pairs, line: DiffLine): Run | null {
  return line.kind === 'same' ? null : (pairs.get(line)?.runOf(line.kind) ?? null);
}

function shapeOf(sections: readonly DiffSection[]) {
  let keyed = false;
  let numbered = false;
  let widest = 1;
  let path = 0;
  let added = 0;
  let removed = 0;
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.path !== undefined) {
        keyed = true;
        path = Math.max(path, line.path.length);
      }
      for (const n of [line.before, line.after]) {
        if (n === null) continue;
        numbered = true;
        widest = Math.max(widest, n);
      }
      if (line.kind === 'add') added++;
      if (line.kind === 'remove') removed++;
    }
  }
  // A setting has no line number, so a keyed diff draws none.
  return { keyed, numbered: numbered && !keyed, digits: String(widest).length, path, added, removed };
}

function blocksOf(rows: readonly Row[]): Row[][] {
  const out: Row[][] = [];
  for (let at = 0; at < rows.length; at += WINDOW_BLOCK_ROWS) out.push(rows.slice(at, at + WINDOW_BLOCK_ROWS));
  return out;
}

const NO_SECTIONS: readonly DiffSection[] = [];
const FIRST: ReadonlySet<number> = new Set([0]);

/** The nearest scrolling ancestor, or null for the viewport. */
function scrollerOf(el: Element): Element | null {
  for (let at = el.parentElement; at; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if (overflowY === 'auto' || overflowY === 'scroll') return at;
  }
  return null;
}

/** Whether the element is laid out narrower than `below` px; false until measured. */
function useNarrowerThan(node: RefObject<HTMLElement | null>, below: number, ready: boolean): boolean {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el || !ready) return undefined;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [node, ready]);
  return width > 0 && width < below;
}

/**
 * Which blocks of a windowed diff hold their rows, observed against the diff's
 * own scroller with a view's margin either side, and the measured height each
 * empty block keeps. No observer, no window.
 */
function useWindow(body: RefObject<HTMLDivElement | null>, blocks: readonly Row[][], windowed: boolean) {
  const [near, setNear] = useState<ReadonlySet<number>>(FIRST);
  // A new diff's blocks start their heights over.
  const { heights } = useMemo(() => ({ of: blocks, heights: new Map<number, number>() }), [blocks]);
  const [, measuredNew] = useReducer((n: number) => n + 1, 0);
  const observing = windowed && typeof IntersectionObserver !== 'undefined';
  const drawn = useRef<ReadonlySet<number>>(FIRST);
  useLayoutEffect(() => {
    drawn.current = near;
    const el = body.current;
    if (!observing || !el) return;
    let changed = false;
    for (const block of el.querySelectorAll<HTMLElement>('[data-block]')) {
      const at = Number(block.dataset.block);
      const height = block.getBoundingClientRect().height;
      if (!near.has(at) || height <= 0 || heights.get(at) === height) continue;
      heights.set(at, height);
      changed = true;
    }
    if (changed) measuredNew();
  }, [body, heights, near, observing]);

  useEffect(() => {
    const el = body.current;
    if (!observing || !el) return undefined;
    const watch = new IntersectionObserver(
      (entries) => {
        const said = entries.map((entry) => ({
          at: Number((entry.target as HTMLElement).dataset.block),
          near: entry.isIntersecting,
          height: entry.boundingClientRect.height,
        }));
        // A block leaving keeps the height it had while it held its rows.
        for (const { at, near, height } of said) {
          if (!near && height > 0 && drawn.current.has(at)) heights.set(at, height);
        }
        // In the order said: one batch can carry a block arriving and leaving.
        setNear((was) => {
          let now: Set<number> | null = null;
          for (const { at, near } of said) {
            if (near === (now ?? was).has(at)) continue;
            now ??= new Set(was);
            if (near) now.add(at);
            else now.delete(at);
          }
          return now ?? was;
        });
      },
      { root: scrollerOf(el), rootMargin: '100% 0px' },
    );
    for (const block of el.querySelectorAll<HTMLElement>('[data-block]')) watch.observe(block);
    return () => watch.disconnect();
  }, [body, heights, observing]);

  let rows = 0;
  let height = 0;
  for (const [at, h] of heights) {
    rows += blocks[at]?.length ?? 0;
    height += h;
  }
  const perRow = rows > 0 ? height / rows : ROW_ESTIMATE_PX;
  return {
    holds: (at: number) => !observing || near.has(at),
    height: (at: number) => heights.get(at) ?? (blocks[at]?.length ?? 0) * perRow,
  };
}

function rowDraws(row: Row, accepts: (line: DiffLine) => boolean): boolean {
  switch (row.kind) {
    case 'skip':
      return false;
    case 'line':
      return accepts(row.line);
    case 'pair':
      return (row.left !== null && accepts(row.left)) || (row.right !== null && accepts(row.right));
  }
}

/**
 * Brings the revealed line into view once per predicate: its block's box
 * first while the window holds none of its rows, then the line, centred.
 */
function useReveal(
  body: RefObject<HTMLDivElement | null>,
  blocks: readonly Row[][],
  reveal: ((line: DiffLine) => boolean) | undefined,
  holds: (at: number) => boolean,
) {
  const at = useMemo(() => (reveal ? blocks.findIndex((block) => block.some((row) => rowDraws(row, reveal))) : -1), [blocks, reveal]);
  const held = at >= 0 && holds(at);
  const done = useRef<{ reveal: (line: DiffLine) => boolean; line: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!reveal || at < 0) return;
    const was = done.current?.reveal === reveal ? done.current : null;
    if (was?.line) return;
    const box = body.current?.querySelector<HTMLElement>(`[data-block="${at}"]`);
    if (!box) return;
    if (held) {
      const line = box.querySelector<HTMLElement>('.crewlet-diff-view__line[data-revealed]');
      if (!line) return;
      done.current = { reveal, line: true };
      line.scrollIntoView?.({ block: 'center' });
      return;
    }
    if (was) return;
    done.current = { reveal, line: false };
    box.scrollIntoView?.({ block: 'center' });
  }, [body, at, held, reveal]);
}

/** A line's text, its changed run marked and its host's spans around it. An empty line keeps its height. */
function Text({ text, run, spans }: { text: string; run: Run | null; spans: readonly DiffSpan[] | null }) {
  if (!text) return <span className="crewlet-diff-view__text"> </span>;
  return (
    <span className="crewlet-diff-view__text">
      {segments(text, spans, run).map((s, i) => {
        const piece = text.slice(s.start, s.end);
        if (s.run) {
          return (
            <span key={i} className="crewlet-diff-view__run">
              {piece}
            </span>
          );
        }
        return s.className ? (
          <span key={i} className={s.className}>
            {piece}
          </span>
        ) : (
          piece
        );
      })}
    </span>
  );
}

/** The glyph, hidden, and the word read in its place: a minus sign is announced as anything or nothing. */
function Mark({ kind, labels }: { kind: DiffLine['kind']; labels: DiffViewLabels }) {
  return (
    <span className="crewlet-diff-view__mark">
      <span aria-hidden="true">{kind === 'add' ? '+' : kind === 'remove' ? '−' : ' '}</span>
      {kind === 'add' && <VisuallyHidden>{labels.added}</VisuallyHidden>}
      {kind === 'remove' && <VisuallyHidden>{labels.removed}</VisuallyHidden>}
    </span>
  );
}

interface Tracks {
  numbered: boolean;
  keyed: boolean;
  labels: DiffViewLabels;
  notes?: ((line: DiffLine) => ReactNode) | undefined;
  onPick?: ((line: DiffLine, extend: boolean) => void) | undefined;
  picked?: ((line: DiffLine) => boolean) | undefined;
  reveal?: ((line: DiffLine) => boolean) | undefined;
  spans?: ((line: DiffLine, side: 'left' | 'right' | undefined) => readonly DiffSpan[] | null) | undefined;
}

/** A host's spans for a line, by the text it is read from: an unchanged line on a split's left is the older. */
function spansReader(tokens: NonNullable<DiffViewProps['tokens']>): NonNullable<Tracks['spans']> {
  return (line, side) => {
    if (line.path !== undefined) return null;
    const older = line.kind === 'remove' || (line.kind === 'same' && side === 'left');
    const n = older ? line.before : line.after;
    return n === null ? null : tokens(older ? 'before' : 'after', n);
  };
}

/**
 * A line's number in one of its slots: a button that picks the line where the
 * host picks and this is the line's own number (its newer, else its older).
 */
function SlotNumber({ line, slot, side, tracks }: { line: DiffLine; slot: 'before' | 'after'; side: 'left' | 'right' | undefined; tracks: Tracks }) {
  const n = slot === 'after' ? line.after : line.before;
  const own = side === 'left' ? true : side === 'right' ? line.kind !== 'same' : slot === (line.after !== null ? 'after' : 'before');
  const pick = tracks.onPick;
  if (!pick || n === null || !own) {
    return (
      <span className="crewlet-diff-view__number" aria-hidden="true">
        {n ?? ''}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="crewlet-diff-view__number crewlet-diff-view__pick"
      aria-label={tracks.labels.pick(line)}
      onClick={(event) => pick(line, event.shiftKey)}
    >
      {n}
    </button>
  );
}

/** What the host draws under a row's lines; an unchanged line is both sides of its pair and is asked once. */
function Notes({ lines, tracks }: { lines: readonly (DiffLine | null)[]; tracks: Tracks }) {
  if (!tracks.notes) return null;
  const drawn = lines.flatMap((line, i) => {
    if (!line || (i > 0 && line === lines[0])) return [];
    const note = tracks.notes!(line);
    return note === null || note === undefined || note === false ? [] : [<Fragment key={i}>{note}</Fragment>];
  });
  if (drawn.length === 0) return null;
  return <div className="crewlet-diff-view__notes">{drawn}</div>;
}

function Line({
  line,
  run,
  tracks,
  side,
  hidden = false,
  continues = false,
}: {
  line: DiffLine;
  run: Run | null;
  tracks: Tracks;
  side?: 'left' | 'right' | undefined;
  hidden?: boolean | undefined;
  continues?: boolean | undefined;
}) {
  const reader = tracks.spans;
  const spans = useMemo(() => reader?.(line, side) ?? null, [reader, line, side]);
  return (
    <div
      className={cx(
        'crewlet-diff-view__line',
        line.kind === 'add' && 'crewlet-diff-view__line--add',
        line.kind === 'remove' && 'crewlet-diff-view__line--remove',
        tracks.picked?.(line) && 'crewlet-diff-view__line--picked',
      )}
      data-kind={line.kind}
      data-revealed={tracks.reveal?.(line) || undefined}
      aria-hidden={hidden || undefined}
    >
      {tracks.numbered && side !== 'right' && <SlotNumber line={line} slot="before" side={side} tracks={tracks} />}
      {tracks.numbered && side !== 'left' && <SlotNumber line={line} slot="after" side={side} tracks={tracks} />}
      <Mark kind={line.kind} labels={tracks.labels} />
      {tracks.keyed && !continues && <span className="crewlet-diff-view__path">{line.path ?? ''}</span>}
      <Text text={line.text} run={run} spans={spans} />
    </div>
  );
}

function RowView({ row, tracks, pairs }: { row: Row; tracks: Tracks; pairs: Pairs }) {
  switch (row.kind) {
    case 'skip':
      return <div className="crewlet-diff-view__skip">{tracks.labels.skipped(row.count)}</div>;
    case 'line':
      return (
        <>
          <Line line={row.line} run={underlineOf(pairs, row.line)} tracks={tracks} continues={row.continues} />
          <Notes lines={[row.line]} tracks={tracks} />
        </>
      );
    case 'pair': {
      const same = row.left?.kind === 'same';
      return (
        <>
          <div className="crewlet-diff-view__pair">
            {row.left ? <Line line={row.left} run={underlineOf(pairs, row.left)} tracks={tracks} side="left" /> : <div aria-hidden="true" />}
            {row.right ? (
              // An unchanged line is read once: its newer copy is the same words.
              <Line line={row.right} run={underlineOf(pairs, row.right)} tracks={tracks} side="right" hidden={same} />
            ) : (
              <div aria-hidden="true" />
            )}
          </div>
          <Notes lines={[row.left, row.right]} tracks={tracks} />
        </>
      );
    }
  }
}

/**
 * A line diff on the diff family's tints, each line also marked by a glyph and
 * a word; handed two texts it compares them, and says when it did not.
 */
export function DiffView(props: DiffViewProps) {
  const {
    sections: given,
    before,
    after,
    context,
    layout = 'unified',
    against,
    empty,
    notes,
    onPick,
    picked,
    reveal,
    tokens,
    labels: overrides,
    className,
    style,
    'aria-label': ariaLabel,
    ...rest
  } = props;
  const labels: DiffViewLabels = overrides ? { ...DIFF_VIEW_LABELS, ...overrides } : DIFF_VIEW_LABELS;
  const compared = useMemo(
    () => (given ? null : compareLines(before ?? '', after ?? '', context)),
    [given, before, after, context],
  );
  const sections = given ?? (compared?.kind === 'compared' ? compared.sections : NO_SECTIONS);
  const shape = useMemo(() => shapeOf(sections), [sections]);
  const changed = shape.added > 0 || shape.removed > 0;
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const narrow = useNarrowerThan(root, PHONE_PX, changed);
  const split = layout === 'split' && !shape.keyed && !narrow;
  const pairs = useMemo(() => pairsOf(sections, shape.keyed), [sections, shape.keyed]);
  const rows = useMemo(() => rowsOf(sections, split), [sections, split]);
  const blocks = useMemo(() => blocksOf(rows), [rows]);
  const shown = useWindow(body, blocks, rows.length > WINDOW_FROM_ROWS);
  useReveal(body, blocks, reveal, shown.holds);
  const spans = useMemo(() => (tokens ? spansReader(tokens) : undefined), [tokens]);

  if (compared && compared.kind !== 'compared') {
    return <p className="crewlet-diff-view__said">{labels.notCompared(compared)}</p>;
  }
  if (!changed) {
    return <>{empty ?? <p className="crewlet-diff-view__said crewlet-diff-view__said--quiet">{labels.empty}</p>}</>;
  }
  const tracks: Tracks = { numbered: shape.numbered, keyed: shape.keyed, labels, notes, onPick, picked, reveal, spans };
  return (
    <div
      {...rest}
      ref={root}
      role="group"
      aria-label={ariaLabel ?? labels.region}
      className={cx(
        'crewlet-diff-view',
        shape.numbered && 'crewlet-diff-view--numbered',
        shape.keyed && 'crewlet-diff-view--keyed',
        split && 'crewlet-diff-view--split',
        className,
      )}
      style={{ ...style, '--crewlet-diff-digits': String(shape.digits), '--crewlet-diff-path': String(shape.path) } as CSSProperties}
    >
      {against !== undefined && <DiffSummary added={shape.added} removed={shape.removed} against={against} labels={labels} />}
      <div ref={body} className="crewlet-diff-view__body">
        {blocks.map((block, at) =>
          shown.holds(at) ? (
            <div key={at} className="crewlet-diff-view__block" data-block={at}>
              {block.map((row, i) => (
                <RowView key={i} row={row} tracks={tracks} pairs={pairs} />
              ))}
            </div>
          ) : (
            <div key={at} className="crewlet-diff-view__block" data-block={at} aria-hidden="true" style={{ height: `${shown.height(at)}px` }} />
          ),
        )}
      </div>
    </div>
  );
}

export interface DiffSummaryProps extends Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> {
  added: number;
  removed: number;
  /** What the diff is measured against, named the way the reader knows it: "version 4", "rev 12". */
  against?: string | undefined;
  labels?: Partial<DiffSummaryLabels> | undefined;
}

/**
 * The one line above a diff that says how big it is: `+3 −1 against version 4`,
 * the counts in the diff family's sign inks and a sentence read in their place.
 */
export function DiffSummary({ added, removed, against, labels: overrides, className, ...rest }: DiffSummaryProps) {
  const labels: DiffSummaryLabels = overrides ? { ...DIFF_SUMMARY_LABELS, ...overrides } : DIFF_SUMMARY_LABELS;
  return (
    <p {...rest} className={cx('crewlet-diff-summary', className)}>
      <span aria-hidden="true">
        <span className="crewlet-diff-summary__added">+{added.toLocaleString()}</span>{' '}
        <span className="crewlet-diff-summary__removed">{`−${removed.toLocaleString()}`}</span>
      </span>
      <VisuallyHidden>{labels.spoken(added, removed)}</VisuallyHidden>
      {against !== undefined && <> {labels.against(against)}</>}
    </p>
  );
}
