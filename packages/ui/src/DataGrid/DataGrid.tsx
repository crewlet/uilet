import {
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { ChevronDownGlyph, ChevronUpGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { EmptyState } from '../EmptyState/index.js';
import { useMediaMatch } from '../MediaMatch/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/**
 * What activated a row: a click, a key on the row's overlay, or the
 * application's own keymap driving the cursor (a native `KeyboardEvent`).
 * Each carries the modifier keys a handler reads to open in a new tab.
 */
export type DataGridActivationEvent = ReactMouseEvent | ReactKeyboardEvent | KeyboardEvent;

/** One column of a [DataGrid]. */
export interface DataGridColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** The value sorted on. Omit to make the column unsortable. */
  sortValue?: ((row: T) => string | number | null | undefined) | undefined;
  align?: 'left' | 'right' | undefined;
  /**
   * The column's name where `header` cannot carry one: a glyph head, or none
   * at all. Drawn by the card layout a grid takes on a phone, where every value
   * names itself, and said to assistive technology over a glyph head.
   */
  label?: string | undefined;
  /**
   * A column of ROW ACTIONS: every cell is a control that names itself (a
   * "Revoke" button, an icon button with its own label). On the phone's card
   * such a cell draws no name beside it, since the control is its own name;
   * its head stays empty, since a word over a column of buttons says nothing
   * the buttons do not.
   */
  action?: boolean | undefined;
  /** Shrink to content (up to a fifth of the grid) and never wrap. */
  shrink?: boolean | undefined;
  /**
   * On a grid drawn with `phoneRows="compact"`, a cell of the row's FIRST line
   * (what the row is: a key, a title), where every other cell is a fact about
   * it on the line under.
   */
  phoneLead?: boolean | undefined;
  /** Left off the compact phone row, whose contract is two lines. */
  phoneOmit?: boolean | undefined;
  /** An exact track, in place of the computed one. */
  width?: string | undefined;
  /** Hidden unless the column set (`cols`) names it. */
  optional?: boolean | undefined;
  /**
   * The narrowest a FLEXIBLE column may be drawn: its track is
   * `minmax(floor, 1fr)` rather than `minmax(0, 1fr)`. For the column that is
   * the point of the list (a title, a name), which at zero gave way to every
   * content-sized column beside it.
   */
  floor?: string | undefined;
  /**
   * The order this column GIVES WAY in when the grid cannot draw every column
   * at its size: the lowest number goes first, and a column without one never
   * goes. A grid that cannot fit drops columns rather than cutting them off at
   * its clipped edge, and says which it dropped.
   */
  drop?: number | undefined;
}

/** One column a reader may turn on or off, as a [ColumnChooser] offers it. */
export interface ColumnChoice {
  key: string;
  label: string;
  /** Off until the column set names it. */
  optional?: boolean | undefined;
}

/**
 * The choices a chooser offers, DERIVED from the columns a grid draws, so a
 * column added to a grid appears in its menu with no second edit. The cell
 * renderers are never called: a name and a flag are properties of the column.
 */
export function columnChoicesOf<T>(columns: readonly DataGridColumn<T>[]): ColumnChoice[] {
  return columns.map((column) => ({
    key: column.key,
    label: headerWord(column) || column.label || column.key,
    optional: column.optional,
  }));
}

/** One box in a [ChooserList]. */
export interface ChooserItem<K extends string = string> {
  key: K;
  label: ReactNode;
  checked: boolean;
}

export interface ChooserListProps<K extends string = string> {
  /** The heading above the boxes, which also names the group. */
  label: string;
  items: readonly ChooserItem<K>[];
  onToggle: (key: K) => void;
}

/**
 * A short checklist of what a view shows, in two columns under a quiet
 * heading: the columns a grid draws ([ColumnChooser]), the facts a card
 * carries. Native checkboxes in a named group, each row its box's label, so
 * the whole row takes the pointer.
 */
export function ChooserList<K extends string = string>({ label, items, onToggle }: ChooserListProps<K>) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <>
      <div className="crewlet-column-chooser__label" id={headingId}>
        {label}
      </div>
      <div className="crewlet-column-chooser__choices" role="group" aria-labelledby={headingId}>
        {items.map((item) => (
          <label key={item.key} className="crewlet-column-chooser__choice">
            <input type="checkbox" checked={item.checked} onChange={() => onToggle(item.key)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </>
  );
}

export interface ColumnChooserProps {
  choices: readonly ColumnChoice[];
  /** The column set as it stands (`key,key`), empty for the default set. */
  value: string;
  onChange: (cols: string) => void;
  /** The heading above the boxes. */
  label?: string | undefined;
}

/**
 * The checkbox list a reader chooses a grid's columns with.
 *
 * AN EMPTY VALUE IS THE DEFAULT SET, NOT AN EMPTY GRID, as [DataGrid] reads
 * it, so the boxes show the default until somebody moves one. It writes the
 * DECLARATION order, never the click order: the value carries an order as well
 * as a selection, and a value built from the order boxes were ticked in would
 * rearrange the grid with every tick.
 */
export function ColumnChooser({ choices, value, onChange, label = 'Columns' }: ColumnChooserProps) {
  const chosen = new Set(value ? value.split(',').filter(Boolean) : []);
  const isOn = (choice: ColumnChoice) => (chosen.size === 0 ? !choice.optional : chosen.has(choice.key));
  return (
    <ChooserList
      label={label}
      items={choices.map((choice) => ({ key: choice.key, label: choice.label, checked: isOn(choice) }))}
      onToggle={(key) => {
        const next = new Set(choices.filter(isOn).map((c) => c.key));
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onChange(
          choices
            .filter((c) => next.has(c.key))
            .map((c) => c.key)
            .join(','),
        );
      }}
    />
  );
}

/** A group of rows, as a grouped answer sends it: its own count and a page of rows. */
export interface DataGridBand<T> {
  key: string;
  label: ReactNode;
  /** The group value's own mark, drawn before the label (a sibling, so no ellipsis eats it). */
  mark?: ReactNode;
  /** The count over the WHOLE group, where the source gave one. */
  total?: number | undefined;
  rows: T[];
  /**
   * The bands INSIDE this one, where the answer was grouped twice: a band
   * carries rows OR sub-bands, never both, as the answer arrives.
   */
  bands?: DataGridBand<T>[] | undefined;
  /** A per-band aggregate line, or the way to what the band did not fit. */
  footer?: ReactNode;
}

/**
 * Rows a reader picks for a bulk action, by their `rowKey`: a column of boxes
 * before the first, with a box over them in the head.
 */
export interface DataGridSelection<T> {
  /** The keys of the rows picked. Controlled, and kept across pages and sorts by the host. */
  selected: ReadonlySet<string>;
  /** The keys as they should be now. */
  onChange: (selected: ReadonlySet<string>) => void;
  /** A row's box, said: "Select Q3 plan". The row's own words are its name, so this says what ticking it does. */
  rowLabel: (row: T) => string;
  /** A row that cannot be picked (the reader may not act on it): its box is drawn and disabled. */
  isSelectable?: ((row: T) => boolean) | undefined;
}

/** The words a grid says, for an application that says them otherwise. */
export interface DataGridLabels {
  /** "Hidden to fit: Due and Updated". */
  hiddenToFit: (names: string) => string;
  loadMore: string;
  showEveryColumn: string;
  /** Joins the last two names of a list: "Due and Updated". */
  and: string;
  /** The head's box, over every row the grid draws. */
  selectAll: string;
}

const LABELS: DataGridLabels = {
  hiddenToFit: (names) => `Hidden to fit: ${names}`,
  loadMore: 'Load more',
  showEveryColumn: 'Show every column',
  and: 'and',
  selectAll: 'Select every row',
};

/** The selection column's key: not a key a caller's column takes, and never in a column set. */
const SELECT_COLUMN = 'crewlet-select';

/**
 * What an application drives a grid's cursor with. The grid binds no keys of
 * its own: an application with a keymap decides which of several grids on a
 * screen a keystroke is for, and moves that one.
 */
export interface DataGridHandle {
  /** Moves the cursor row by `by` rows, clamped, and scrolls it into view. */
  step: (by: number) => void;
  /** Activates the cursor row, as a click on it would. False when there is none. */
  activate: (event: ReactKeyboardEvent | KeyboardEvent) => boolean;
  /** How many rows the grid draws, its bands' rows included. */
  rowCount: () => number;
}

export interface DataGridProps<T> {
  rows?: T[] | undefined;
  bands?: DataGridBand<T>[] | undefined;
  columns: DataGridColumn<T>[];
  rowKey: (row: T) => string;
  /** A plain click, or Enter on the cursor row. The row is still a link when `rowHref` is given. */
  onRowActivate?: ((row: T, event: DataGridActivationEvent) => void) | undefined;
  /** The row's object's page: a real link stretched over the row, so a new tab and copying it work. */
  rowHref?: ((row: T) => string) | undefined;
  /** The row the reader is on (the object a page or a side panel shows): tinted and announced as current. */
  isSelected?: ((row: T) => boolean) | undefined;
  /**
   * Rows picked for a bulk action: a box on every row before the first
   * column, and one in the head over every row drawn (ticked, clear, or mixed
   * when some are). Shift with a box picks or clears every row between it and
   * the box pressed before it, in the order the grid draws them.
   *
   * NOT `isSelected`, which is the one row the reader is ON. A picked row is
   * tinted in the selected fill and its box says it; the current row keeps
   * its own mark.
   */
  selection?: DataGridSelection<T> | undefined;
  isFailed?: ((row: T) => boolean) | undefined;
  /**
   * The sort as `key` or `-key` (descending), empty for the rows' own order.
   * Controlled, so an application keeps it where it keeps state (an address).
   */
  sort?: string | undefined;
  /** A sortable head pressed: ascending, then descending, then unsorted. */
  onSortChange?: ((sort: string) => void) | undefined;
  /** The rows arrive ordered by their source (a paged answer ordered over the whole set). */
  serverSorted?: boolean | undefined;
  /** The column set as `key,key`, in the order to draw it; empty for every column not `optional`. */
  cols?: string | undefined;
  /** The way back from a column set: drawn as "Show every column" while one is set. */
  onColsChange?: ((cols: string) => void) | undefined;
  /** What an empty grid says, and the one control that is its next step. */
  empty?: { title: ReactNode; hint?: ReactNode; icon?: ReactNode; action?: ReactNode } | undefined;
  footer?: ReactNode;
  onLoadMore?: (() => void) | undefined;
  /** "40 of 312 loaded": what an export would actually contain. */
  loadedNote?: string | undefined;
  /**
   * HOW A ROW IS DRAWN ON A PHONE, where there are no columns: `labelled` (a
   * card of one named line per value, which every grid can take) or `compact`
   * (two lines with no names: the lead cells, then every other value as a run
   * of marks, for a list scanned by the dozen).
   */
  phoneRows?: 'labelled' | 'compact' | undefined;
  /**
   * The grid is a card's body: no edge, corner or ground of its own and one
   * rule above its head. A grid straight in a `Card` is flush without this.
   */
  flush?: boolean | undefined;
  /** For an application driving the cursor from its own keymap. */
  handleRef?: Ref<DataGridHandle> | undefined;
  /** The reader pressed inside the grid: which grid the keyboard means. */
  onPointerDown?: (() => void) | undefined;
  labels?: Partial<DataGridLabels> | undefined;
  /** What the table is, for assistive technology: its card's title, by id or in words. */
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  className?: string | undefined;
}

/** `-updated` as `{key: "updated", desc: true}`. */
export function parseGridSort(raw: string): { key: string; desc: boolean } | null {
  if (!raw) return null;
  return raw.startsWith('-') ? { key: raw.slice(1), desc: true } : { key: raw, desc: false };
}

/** A head that is a word, or nothing. */
function headerWord<T>(column: DataGridColumn<T>): string {
  return typeof column.header === 'string' ? column.header : '';
}

/** Every row a band holds, its sub-bands' included, in the order they draw. */
function bandRows<T>(band: DataGridBand<T>): T[] {
  return band.bands ? band.bands.flatMap(bandRows) : band.rows;
}

/**
 * A three-way comparator that is STABLE on equal operands: rows pushed live
 * several times a second must not swap places with their equals on every
 * render, which is a list that shuffles itself while somebody reads it.
 */
function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : 1;
    if (Number.isNaN(b)) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The most of a grid one `shrink` column may take: a fraction, so it is the
 * same promise on a phone and a wide screen, and two at the cap still leave
 * three fifths of the grid to the flexible columns that are the point of it.
 */
const SHRINK_CAP = '20%';
const SHRINK_SHARE = 0.2;

/** How many rows the squeeze check reads: a page's first screen. */
const SQUEEZE_SAMPLE_ROWS = 12;

/** What the fit has decided for one set of columns, at one width. */
export interface GridFit {
  /** The column set it was decided for. */
  readonly set: string;
  /** The grid's width when it last decided. */
  readonly width: number;
  /** The keys it dropped, in the order it dropped them. */
  readonly dropped: readonly string[];
  /**
   * Whether the grid has STACKED into card rows: it still did not fit with
   * every give-way column gone, so its rows are cards, as on a phone.
   */
  readonly stacked?: boolean | undefined;
}

const NO_DROPS: readonly string[] = [];
const NO_FIT: GridFit = { set: '', width: 0, dropped: NO_DROPS };

/**
 * The next fit, or null when this one stands. PURE, so the rules are held
 * without a layout engine:
 *
 * - the grid GREW past the width columns were dropped or it stacked at: start
 *   again from all of them as columns (the next pass drops, and stacks, again
 *   only what still does not fit);
 * - a stacked grid that did not grow stays stacked: its rows are cards and
 *   there is no column left to measure;
 * - the tracks OVERRUN the grid: drop the visible column with the lowest
 *   `drop`, if there is one;
 * - nothing is left to drop and the grid still cannot draw its values
 *   (`stack`: the tracks overrun, or a value is cut short): STACK into card
 *   rows, the shape a phone draws, rather than clip;
 * - otherwise remember a narrower width, so growing back past it re-tries.
 */
export function fitGridColumns({
  fit,
  width,
  overflows,
  stack = false,
  visible,
}: {
  fit: GridFit;
  width: number;
  /** The columns do not fit: overrun, or a value or a head cut short. */
  overflows: boolean;
  /**
   * The grid cannot draw its VALUES: the tracks overrun, or a value is cut
   * short. A head alone cut short drops a give-way column but never stacks.
   */
  stack?: boolean;
  visible: readonly { key: string; drop?: number | undefined }[];
}): GridFit | null {
  if ((fit.dropped.length > 0 || fit.stacked) && width > fit.width) {
    return { set: fit.set, width, dropped: NO_DROPS };
  }
  if (fit.stacked) return null;
  if (overflows || stack) {
    let next: { key: string; drop?: number | undefined } | undefined;
    for (const c of visible) {
      if (c.drop === undefined) continue;
      if (!next || c.drop < (next.drop as number)) next = c;
    }
    if (next) return { set: fit.set, width, dropped: [...fit.dropped, next.key] };
    if (stack) return { set: fit.set, width, dropped: fit.dropped, stacked: true };
  }
  if (width !== fit.width && (fit.dropped.length > 0 || fit.width === 0)) {
    return { ...fit, width };
  }
  return null;
}

/** Whether the tracks run past the grid's inner edge, read off the head's last cell. */
function overflowing(wrap: HTMLElement): boolean {
  const last = wrap.querySelector(':scope > .crewlet-data-grid__head')?.lastElementChild;
  if (!last) return false;
  const inner = wrap.getBoundingClientRect().left + wrap.clientLeft + wrap.clientWidth;
  return last.getBoundingClientRect().right > inner + 0.5;
}

/**
 * Whether a content-sized column has been SQUEEZED: drawn narrower than its
 * cap AND cutting a value short, or its HEAD. The quieter way a grid fails to
 * fit: rather than overrun, it shrinks a status pill to a letter, or every
 * head of a row of counts to its first letter over values that still fit,
 * while the columns that could have gone stay. Read over the head and the
 * first screen of rows. `leading` is how many of the grid's own columns (the
 * selection column) are drawn before the caller's.
 *
 * `'values'` where a value is cut short (the grid cannot be read: drop, then
 * stack), `'heads'` where only a head is (drop a column if one may go, but a
 * grid whose every value reads is not turned into cards for a head), and
 * null where nothing is.
 */
export function squeezed<T>(
  wrap: HTMLElement,
  visible: readonly DataGridColumn<T>[],
  leading = 0,
): 'values' | 'heads' | null {
  const heads = wrap.querySelector(':scope > .crewlet-data-grid__head')?.children;
  if (!heads) return null;
  const cap = wrap.clientWidth * SHRINK_SHARE - 1;
  const rows = [...wrap.querySelectorAll(':scope > .crewlet-data-grid__body .crewlet-data-grid__row')].slice(
    0,
    SQUEEZE_SAMPLE_ROWS,
  );
  let headCut = false;
  for (let i = 0; i < visible.length; i++) {
    const column = visible[i]!;
    if (!column.shrink || column.width) continue;
    const head = heads[i + leading];
    if (!head || head.getBoundingClientRect().width >= cap) continue;
    if (cutShort(head)) headCut = true;
    for (const row of rows) {
      const cell = row.querySelectorAll(':scope > .crewlet-data-grid__cell')[i + leading];
      if (cell && cutShort(cell)) return 'values';
    }
  }
  return headCut ? 'heads' : null;
}

/**
 * Whether an element, or anything with a box inside it, is drawn narrower than
 * what it holds. A box one pixel wide is screen-reader-only text, narrower than
 * its words on purpose, and says nothing about the column's width.
 */
function cutShort(el: Element): boolean {
  for (const node of [el, ...el.querySelectorAll('*')]) {
    const box = node as HTMLElement;
    if (box.clientWidth > 1 && box.scrollWidth > box.clientWidth + 1) return true;
  }
  return false;
}

/** "Due and Updated": the dropped columns by the names a reader knows them by. */
function droppedNames<T>(columns: readonly DataGridColumn<T>[], dropped: readonly string[], and: string): string {
  const names = dropped.map((key) => {
    const c = columns.find((col) => col.key === key);
    return (c && (headerWord(c) || c.label)) || key;
  });
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

/**
 * A list as columns: sortable heads, optional and give-way columns, bands for
 * a grouped answer, a row link stretched over each row, and a card per row on
 * a phone.
 *
 * ONE TRACK LIST, ON THE GRID. The head, the bands and every row are
 * `subgrid` passthroughs, so a head cell and a cell twenty rows down size the
 * same track; each row being its own grid sized its columns against its own
 * cells alone, and no value sat under the head that named it.
 *
 * A SHRINK COLUMN IS CAPPED (`fit-content(20%)`): `max-content` grows without
 * a ceiling and grid resolves it before any flexible column, so one long value
 * starved the title to zero and still overflowed.
 *
 * COLUMNS THAT DO NOT FIT GIVE WAY IN ORDER (`drop`), measured after every
 * commit in a layout effect so the intermediate shapes never paint, and the
 * foot names what the width took. Not on a phone, where a row is a card.
 *
 * THE ROW'S LINK IS AN OVERLAY, NOT THE ROW: a row that was an anchor made
 * every linking cell an anchor inside an anchor, and the parser closes the
 * outer one at the inner, so the row stopped being clickable from that cell
 * on. Stretched over the row it keeps a real href, and the cells' own links
 * and buttons sit above it.
 *
 * The grid makes no scrollport of its own (`overflow: clip`), which is what
 * lets its head stick against the page's scroller; an application whose
 * scroller carries a sticky bar sets `--crewlet-data-grid-sticky-top`.
 */
export function DataGrid<T>({
  rows,
  bands,
  columns,
  rowKey,
  onRowActivate,
  rowHref,
  isSelected,
  selection,
  isFailed,
  sort: sortRaw = '',
  onSortChange,
  serverSorted = false,
  cols: colsRaw = '',
  onColsChange,
  empty,
  footer,
  onLoadMore,
  loadedNote,
  phoneRows = 'labelled',
  flush = false,
  handleRef,
  onPointerDown,
  labels,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  className,
}: DataGridProps<T>) {
  const text: DataGridLabels = { ...LABELS, ...labels };
  const sort = parseGridSort(sortRaw);
  const body = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(-1);
  const gridId = useId();

  const shownColumns = useMemo(() => {
    const asked = colsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (asked.length === 0) return columns.filter((c) => !c.optional);
    // THE ORDER THE READER ASKED FOR, not the declaration order.
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const picked = asked.map((key) => byKey.get(key)).filter((c): c is DataGridColumn<T> => !!c);
    return picked.length > 0 ? picked : columns.filter((c) => !c.optional);
  }, [columns, colsRaw]);

  // STATE, NOT A REF: a grid showing its empty state renders no wrap to
  // measure, and the observer has to attach when the rows arrive.
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null);
  const phone = useMediaMatch(`(width < ${breakpoint.phone})`);
  const shownKeys = shownColumns.map((c) => c.key).join(',');
  const [fit, setFit] = useState<GridFit>(NO_FIT);
  // CARD ROWS on a phone, and wherever the grid's own width cannot hold its
  // columns once every give-way column has gone (`fitGridColumns`): beside an
  // aside the reader opened, a desktop window can leave a grid a phone's room.
  // A card is a line per value, so a stacked grid gives back what it dropped.
  const stacked = phone || (fit.set === shownKeys && Boolean(fit.stacked));
  const dropped = !stacked && fit.set === shownKeys ? fit.dropped : NO_DROPS;
  const visibleColumns = useMemo(
    () => (dropped.length === 0 ? shownColumns : shownColumns.filter((c) => !dropped.includes(c.key))),
    [shownColumns, dropped],
  );
  const sortRows = useCallback(
    (input: T[]): T[] => {
      if (!sort || serverSorted) return input;
      const column = columns.find((c) => c.key === sort.key);
      if (!column?.sortValue) return input;
      const get = column.sortValue;
      // A COPY, always: sorting the caller's array would mutate its state.
      return [...input].sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        // An absent value sorts last in both directions: it is not a value.
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = compare(av, bv);
        return sort.desc ? -cmp : cmp;
      });
    },
    [columns, sort, serverSorted],
  );

  // EVERY ROW IN THE ORDER IT DRAWS, sub-bands included: the list the cursor
  // walks, so a row drawn and missed here is one the cursor steps over.
  const flat = useMemo(() => {
    const walk = (band: DataGridBand<T>): T[] => (band.bands ? band.bands.flatMap(walk) : sortRows(band.rows));
    if (bands) return bands.flatMap(walk);
    return sortRows(rows ?? []);
  }, [bands, rows, sortRows]);

  // THE SELECTION. The anchor is the row whose box was pressed last, by key, so
  // a Shift-press after a re-sort still ranges from the row the reader means.
  const anchor = useRef<string | null>(null);
  const pickable = useMemo(
    () => (selection ? flat.filter((row) => selection.isSelectable?.(row) ?? true) : []),
    [flat, selection],
  );
  const pickedCount = selection ? pickable.filter((row) => selection.selected.has(rowKey(row))).length : 0;
  const allPicked = pickable.length > 0 && pickedCount === pickable.length;

  const pick = (row: T, on: boolean, range: boolean): void => {
    if (!selection) return;
    const key = rowKey(row);
    const next = new Set(selection.selected);
    const to = flat.findIndex((r) => rowKey(r) === key);
    const from = range && anchor.current !== null ? flat.findIndex((r) => rowKey(r) === anchor.current) : -1;
    // A RANGE IS SET TO THE STATE OF THE BOX PRESSED, never toggled row by
    // row: a range across picked and clear rows comes out all one way.
    const span = from >= 0 && to >= 0 ? flat.slice(Math.min(from, to), Math.max(from, to) + 1) : [row];
    for (const r of span) {
      if (selection.isSelectable?.(r) === false) continue;
      if (on) next.add(rowKey(r));
      else next.delete(rowKey(r));
    }
    anchor.current = key;
    selection.onChange(next);
  };

  // THE HEAD'S BOX acts on the rows DRAWN, and leaves alone the picks the host
  // keeps for rows it is not drawing (another page, a filter since applied).
  const pickAll = (): void => {
    if (!selection) return;
    const next = new Set(selection.selected);
    for (const row of pickable) {
      if (allPicked) next.delete(rowKey(row));
      else next.add(rowKey(row));
    }
    anchor.current = null;
    selection.onChange(next);
  };

  const selectColumn: DataGridColumn<T> | null = selection
    ? {
        key: SELECT_COLUMN,
        header: (
          <Checkbox
            hideLabel
            label={text.selectAll}
            checked={allPicked}
            indeterminate={pickedCount > 0 && !allPicked}
            disabled={pickable.length === 0}
            onChange={pickAll}
          />
        ),
        cell: (row) => (
          // ABOVE THE ROW'S LINK, so the press lands on the box.
          <span className="crewlet-data-grid__select" data-above-row>
            <Checkbox
              hideLabel
              label={selection.rowLabel(row)}
              checked={selection.selected.has(rowKey(row))}
              disabled={selection.isSelectable?.(row) === false}
              onChange={(event) => pick(row, event.target.checked, (event.nativeEvent as Partial<MouseEvent>).shiftKey === true)}
            />
          </span>
        ),
        action: true,
        phoneLead: true,
        width: 'calc(var(--size-target-min) + var(--spacing-3) * 2)',
      }
    : null;
  // WHAT IS DRAWN: the selection column, then the columns that fit. The fit
  // and the column set never see it; it is the grid's own and never gives way.
  const drawnColumns = selectColumn ? [selectColumn, ...visibleColumns] : visibleColumns;
  // How many drawn columns come before the caller's: the squeeze check reads
  // the caller's columns at their drawn positions.
  const leading = drawnColumns.length - visibleColumns.length;

  // A resize the grid reports is a new width, which re-runs the fit. Without
  // the observer the grid keeps the fit of its first width.
  const [boxWidth, setBoxWidth] = useState(0);
  useLayoutEffect(() => {
    if (!wrap || typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(() => setBoxWidth(wrap.clientWidth));
    watch.observe(wrap);
    return () => watch.disconnect();
  }, [wrap]);
  // AFTER WHATEVER CAN CHANGE WHAT FITS: the rows (`flat`), the sort, the
  // columns, the width. The decision is one compare, and a pass that changes
  // nothing returns null, so the chain ends.
  useLayoutEffect(() => {
    const el = wrap;
    if (!el || phone) return;
    const current = fit.set === shownKeys ? fit : { ...NO_FIT, set: shownKeys };
    // A STACKED GRID HAS NO COLUMNS TO MEASURE; only its width is read, to
    // try columns again when it grows past the width it stacked at.
    const overrun = !current.stacked && overflowing(el);
    const squeeze = current.stacked ? null : squeezed(el, visibleColumns, leading);
    const next = fitGridColumns({
      fit: current,
      width: el.clientWidth,
      overflows: overrun || squeeze !== null,
      stack: overrun || squeeze === 'values',
      visible: visibleColumns,
    });
    if (next !== null) setFit(next);
  }, [wrap, phone, fit, shownKeys, visibleColumns, leading, flat, boxWidth]);

  useImperativeHandle(
    handleRef,
    () => ({
      step: (by: number) =>
        setCursor((at) => {
          const next = Math.max(0, Math.min(flat.length - 1, at + by));
          body.current?.querySelector<HTMLElement>(`[data-row-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
          return next;
        }),
      activate: (event) => {
        const row = flat[cursor];
        if (row === undefined || !onRowActivate) return false;
        onRowActivate(row, event);
        return true;
      },
      rowCount: () => flat.length,
    }),
    [flat, cursor, onRowActivate],
  );

  function headerClick(column: DataGridColumn<T>): void {
    if (!column.sortValue || !onSortChange) return;
    if (sort?.key === column.key && !sort.desc) onSortChange(`-${column.key}`);
    else if (sort?.key === column.key && sort.desc) onSortChange('');
    else onSortChange(column.key);
  }

  const template = drawnColumns
    .map((c) => c.width ?? (c.shrink ? `fit-content(${SHRINK_CAP})` : `minmax(${c.floor ?? 0}, 1fr)`))
    .join(' ');

  // A GROUPED ANSWER WITH NO ROWS ON THIS PAGE IS NOT AN EMPTY ANSWER: a band
  // still says how many are in it. The empty state is for nothing to draw.
  if (flat.length === 0 && !bands?.length && empty) {
    return (
      <div className={cx('crewlet-data-grid', className)} data-flush={flush || undefined}>
        <EmptyState
          size="compact"
          icon={empty.icon}
          title={empty.title}
          description={empty.hint}
          action={empty.action}
        />
      </div>
    );
  }

  let index = -1;
  function renderRow(row: T): ReactNode {
    index += 1;
    const at = index;
    const link = rowHref?.(row);
    // THE CELL CARRIES ITS COLUMN'S OWN NAME, for the phone's card, where the
    // head is gone: from the head where it is a word and from `label` where it
    // is not. A cell with no value has no child nodes, so the card drops its
    // line (`:empty`), and an action column's cell names itself.
    const marked = Boolean(isSelected?.(row));
    const picked = Boolean(selection?.selected.has(rowKey(row)));
    const rowId = `${gridId}-row-${at}`;
    // THE ROW'S OWN WAY IN IS AN OVERLAY in its first cell, stretched over the
    // whole row (the row is its containing block): a real link where the row
    // has an address, a button where it only acts. Either is named by the row
    // (`aria-labelledby`), since the overlay holds nothing of its own and a
    // copy of the row's words inside it would be read twice.
    const overlay =
      link !== undefined ? (
        // eslint-disable-next-line jsx-a11y/anchor-has-content
        <a
          className="crewlet-data-grid__row-link"
          href={link}
          aria-labelledby={rowId}
          aria-current={marked ? 'true' : undefined}
          onClick={(e) => onRowActivate?.(row, e)}
        />
      ) : onRowActivate ? (
        <button
          type="button"
          className="crewlet-data-grid__row-link"
          aria-labelledby={rowId}
          aria-current={marked ? 'true' : undefined}
          onClick={(e) => onRowActivate(row, e)}
        />
      ) : null;
    // THE CELL CARRIES ITS COLUMN'S OWN NAME, for the phone's card, where the
    // head is gone: from the head where it is a word and from `label` where it
    // is not. A cell with no value has no child nodes, so the card drops its
    // line (`:empty`), and an action column's cell names itself.
    const inner = drawnColumns.map((column, i) => (
      <span
        key={column.key}
        role="cell"
        className={cx(
          'crewlet-data-grid__cell',
          column.align === 'right' && 'crewlet-data-grid__cell--right',
          column.shrink && 'crewlet-data-grid__cell--shrink',
        )}
        data-lead={column.phoneLead || undefined}
        data-phone-omit={column.phoneOmit || undefined}
        data-label={column.action ? undefined : headerWord(column) || column.label || undefined}
      >
        {i === 0 ? overlay : null}
        {column.cell(row)}
      </span>
    ));
    return (
      <div
        key={rowKey(row)}
        id={rowId}
        role="row"
        className={cx(
          'crewlet-data-grid__row',
          marked && 'crewlet-data-grid__row--selected',
          picked && 'crewlet-data-grid__row--picked',
          isFailed?.(row) && 'crewlet-data-grid__row--failed',
          cursor === at && 'crewlet-data-grid__row--cursor',
        )}
        data-row-index={at}
        aria-current={overlay === null && marked ? 'true' : undefined}
      >
        {inner}
      </div>
    );
  }

  function renderBand(band: DataGridBand<T>): ReactNode {
    // THE LOADED COUNT IS THIS BAND'S OWN ROWS, its sub-bands' included.
    const loaded = bandRows(band).length;
    return (
      // A BAND IS ROWS OF THE TABLE: its head and its foot are rows of one
      // cell each across every column, and its own box is layout alone.
      <div key={band.key} className="crewlet-data-grid__band" role="none">
        <div className="crewlet-data-grid__band-head" role="row">
          <span className="crewlet-data-grid__band-cell" role="rowheader" aria-colspan={drawnColumns.length}>
            {band.mark}
            <span className="crewlet-data-grid__truncate">{band.label}</span>
            {/* THE SOURCE'S COUNT AND THE LOADED COUNT, apart: 12 over 12 of
                300 is the number a person plans against. */}
            <span className="crewlet-data-grid__band-count">
              {band.total != null && band.total !== loaded ? `${loaded} of ${band.total}` : loaded}
            </span>
          </span>
        </div>
        {band.bands ? band.bands.map((sub) => renderBand(sub)) : sortRows(band.rows).map(renderRow)}
        {band.footer && (
          <div className="crewlet-data-grid__band-foot" role="row">
            <span className="crewlet-data-grid__band-cell" role="cell" aria-colspan={drawnColumns.length}>
              {band.footer}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setWrap}
      role="table"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={cx('crewlet-data-grid', className)}
      data-phone-rows={phoneRows === 'compact' ? 'compact' : undefined}
      data-stacked={stacked || undefined}
      data-flush={flush || undefined}
      style={{ gridTemplateColumns: template }}
      onPointerDown={onPointerDown}
    >
      <div className="crewlet-data-grid__head" role="row">
        {drawnColumns.map((column) => {
          const sorted = sort?.key === column.key;
          const sortable = Boolean(column.sortValue && onSortChange);
          const headClass = cx(
            'crewlet-data-grid__th',
            column.align === 'right' && 'crewlet-data-grid__th--right',
            column.shrink && 'crewlet-data-grid__th--shrink',
            sorted && 'crewlet-data-grid__th--sorted',
            !sortable && 'crewlet-data-grid__th--plain',
          );
          const content = (
            <>
              <span className="crewlet-data-grid__truncate">{column.header}</span>
              {sorted && (sort?.desc ? <ChevronDownGlyph size="xs" /> : <ChevronUpGlyph size="xs" />)}
            </>
          );
          // A COLUMN THAT CANNOT BE SORTED IS NOT A BUTTON, and a glyph head is
          // still a named column: its `label`, said and shown on hover.
          if (!sortable) {
            const named = !headerWord(column) && !column.action ? column.label : undefined;
            return (
              <div key={column.key} className={headClass} role="columnheader" title={named}>
                {content}
                {named && <VisuallyHidden>{named}</VisuallyHidden>}
              </div>
            );
          }
          // THE SORT IS THE COLUMN HEAD'S STATE (`aria-sort` on the
          // columnheader), and the control that changes it is the button
          // inside it.
          return (
            <div
              key={column.key}
              className={headClass}
              role="columnheader"
              aria-sort={sorted ? (sort?.desc ? 'descending' : 'ascending') : undefined}
            >
              <button
                type="button"
                className="crewlet-data-grid__sort"
                onClick={() => headerClick(column)}
                // A SORTABLE GLYPH HEAD IS NAMED BY ITS LABEL, never by its arrow alone.
                aria-label={headerWord(column) ? undefined : column.label}
              >
                {content}
              </button>
            </div>
          );
        })}
      </div>

      <div className="crewlet-data-grid__body" role="rowgroup" ref={body}>
        {bands ? bands.map((band) => renderBand(band)) : sortRows(rows ?? []).map(renderRow)}
      </div>

      {(footer || onLoadMore || loadedNote || dropped.length > 0) && (
        <div className="crewlet-data-grid__foot">
          {footer}
          <span className="crewlet-data-grid__foot-spacer" aria-hidden="true" />
          {/* A DROPPED COLUMN IS SAID: widening the window brings it back. */}
          {dropped.length > 0 && (
            <span className="crewlet-data-grid__note">
              {text.hiddenToFit(droppedNames(shownColumns, dropped, text.and))}
            </span>
          )}
          {loadedNote && <span className="crewlet-data-grid__note">{loadedNote}</span>}
          {onLoadMore && (
            <Button size="small" variant="secondary" onClick={onLoadMore}>
              {text.loadMore}
            </Button>
          )}
        </div>
      )}
      {/* THE WAY BACK FROM A COLUMN SET, visible while one is set. */}
      {colsRaw && onColsChange && (
        <button type="button" className="crewlet-data-grid__cols-reset" onClick={() => onColsChange('')}>
          {text.showEveryColumn}
        </button>
      )}
    </div>
  );
}
