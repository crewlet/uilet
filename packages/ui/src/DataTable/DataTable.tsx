import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCardHeaderSlot } from '../Card/headerSlot.js';
import { Modal } from '../Modal/index.js';
import { Button } from '../Button/index.js';
import { Checkbox } from '../Checkbox/index.js';
import { IconButton } from '../IconButton/index.js';
import { EmptyValue } from '../EmptyValue/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { CopyableCell } from './CopyableCell.js';
import { RowActionsMenu } from './RowActionsMenu.js';
import {
  ArrowDownwardGlyph,
  ArrowUpwardGlyph,
  CheckGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  DeleteGlyph,
  DragIndicatorGlyph,
  KeyboardArrowDownGlyph,
  KeyboardArrowUpGlyph,
  KeyboardDoubleArrowLeftGlyph,
  KeyboardDoubleArrowRightGlyph,
  SettingsBackupRestoreGlyph,
  SettingsGlyph,
  UnfoldMoreGlyph,
} from '@crewlethq/icons/glyphs';

/**
 * DataTable, the sortable table the whole product reads its records from, in
 * two visual variants (default and compact) over one data, sort, pagination
 * and persistence model.
 *
 * THE FOUR RULES THAT DECIDE ITS SHAPE, each of them a defect that reached a
 * reader before it was one:
 *
 * 1. THE SORT CONTROL IS A BUTTON INSIDE THE HEADER CELL, and `aria-sort`
 *    sits on the cell. A `th` with a click handler is neither focusable nor
 *    announced as a control, so a keyboard reader could see which way a column
 *    was sorted and could not change it.
 * 2. THE COMPARATOR IS THREE-WAY, ABSENT LAST AND INDEX-STABLE. An absent
 *    value is not a small one: a seat with no meter has not spent nothing, it
 *    has not been measured, so it sorts below every measurement in BOTH
 *    directions. A comparator that returns -1 for equal operands (the
 *    `a < b ? 1 : -1` idiom) makes equal rows trade places on every render
 *    under V8's sort, which is a list that shuffles itself while somebody
 *    reads it.
 * 3. A ROW THAT NAVIGATES IS A LINK, and a press that started on a control
 *    inside the row is that control's press and nobody else's. Both halves
 *    were wrong: a clickable `tr` could not be reached by keyboard, and a
 *    click on a chip inside it navigated twice.
 * 4. NOTHING IT PERSISTS IS TRUSTED ON THE WAY BACK IN. A corrupt entry under
 *    `storageKey` used to throw from a state initialiser, which is a blank
 *    screen rather than a table, and `storageKey` stays optional because a
 *    surface whose state belongs in the URL should read no storage at all.
 */

/**
 * A row, as the table itself sees one: an opaque record it reads named
 * columns out of. A caller names its own row type through the generic, and
 * every callback on the column and on the table is typed with it.
 */
export type DataTableRow = Record<string, unknown>;

/**
 * The one place a row is read by column key.
 *
 * The generic is deliberately unconstrained, so a caller can pass an
 * interface, a class instance or a discriminated union without adding an
 * index signature to it. That leaves one cast, here, rather than the
 * `any` the whole file used to opt into.
 */
function cellValue<TRow>(row: TRow, key: string): unknown {
  return (row as DataTableRow | null | undefined)?.[key];
}

/**
 * Web Storage, read as something that can refuse and can lie.
 *
 * THREE FAILURES, AND ONLY ONE OF THEM IS RARE. Reading `localStorage` THROWS
 * in a browser whose site data is blocked, and in a document with no origin;
 * a stored entry is whatever a previous version of this component (or a
 * different product on the same origin) wrote, so it parses to anything at
 * all; and a half-written entry parses to nothing. Every one of those used to
 * arrive from inside a `useState` initialiser, where a throw is not a missing
 * preference but a blank screen with the table on it.
 *
 * So each read is guarded, each parsed value is checked against the shape the
 * caller expects, and anything that does not match is ignored in favour of the
 * default. A write that fails is silent on purpose: a preference that could
 * not be saved is not something to interrupt somebody's work over.
 */
function readStored(storageKey: string | undefined, name: string): string | null {
  if (!storageKey) return null;
  try {
    return globalThis.localStorage?.getItem(`${storageKey}_${name}`) ?? null;
  } catch {
    return null;
  }
}

function writeStored(storageKey: string | undefined, name: string, value: string): void {
  if (!storageKey) return;
  try {
    globalThis.localStorage?.setItem(`${storageKey}_${name}`, value);
  } catch {
    // A full or blocked store is not worth a reader's attention.
  }
}

function removeStored(storageKey: string | undefined, name: string): void {
  if (!storageKey) return;
  try {
    globalThis.localStorage?.removeItem(`${storageKey}_${name}`);
  } catch {
    // As above: nothing a reader can act on.
  }
}

/** A stored entry, parsed and checked, or null when it is anything else. */
function readStoredJson<T>(
  storageKey: string | undefined,
  name: string,
  valid: (value: unknown) => value is T,
): T | null {
  const raw = readStored(storageKey, name);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isPlainObject(value) && Object.values(value).every((entry) => typeof entry === 'number');
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isPlainObject(value) && Object.values(value).every((entry) => typeof entry === 'boolean');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export type DataTableSortDirection = 'asc' | 'desc';

/**
 * What a second and third press on the same header do.
 *
 * `asc-desc-none` is the default: the third press clears the sort and hands
 * the rows back in the order the server sent them, which on a live table is
 * the only ordering that means anything. `asc-desc` is for a table that has
 * no meaningful unsorted order, where clearing the sort would look like a
 * glitch.
 */
export type DataTableSortCycle = 'asc-desc-none' | 'asc-desc';

/**
 * How a row is marked as a state rather than as an identity.
 *
 * Three, and they are the rail colours a state may take: `info` for something
 * that is happening, `warning` for something a person has to look at, and
 * `danger` for something that failed. There is no brand tone, because the
 * accent means "where the reader is" and a selected row already spends it.
 */
export type DataTableRowTone = 'info' | 'warning' | 'danger';

/**
 * A value nobody measured.
 *
 * NaN is one of these rather than a number: it poisons a comparator's
 * transitivity (nothing is less than, greater than or equal to it), and the
 * thing that produced it was a parse that failed, which is an absence.
 */
function isAbsent(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/** The three-way comparison of two values that are both present. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The column order a table draws, given the order a reader arranged and the
 * columns the caller declares now.
 *
 * Kept order first, so nothing a reader did is lost; anything newly declared
 * goes in BESIDE THE COLUMN IT WAS DECLARED AFTER, wherever the reader has
 * since put that one, so a column that arrives in the middle of the set does
 * not appear at the far end of the row. Counting the earlier columns instead
 * of finding the nearest one puts it at the right DEPTH of a row the reader
 * has rearranged rather than in the right PLACE: with the last two columns
 * swapped, a column declared third landed second.
 */
export function reconcileOrder(current: readonly string[], declared: readonly string[]): string[] {
  const known = new Set(declared);
  const kept = current.filter((key) => known.has(key));
  if (kept.length === declared.length) return kept;
  const out = [...kept];
  declared.forEach((key, index) => {
    if (out.includes(key)) return;
    // After the nearest column declared before it that is already placed, or
    // at the front, which is where a new first column belongs.
    let at = 0;
    for (let earlier = index - 1; earlier >= 0; earlier -= 1) {
      const where = out.indexOf(declared[earlier] as string);
      if (where >= 0) {
        at = where + 1;
        break;
      }
    }
    out.splice(at, 0, key);
  });
  return out;
}

export interface DataTableColumn<TRow = DataTableRow> {
  label: ReactNode;
  render?: (row: TRow, value: unknown) => ReactNode;
  sortable?: boolean;
  defaultVisible?: boolean;
  /**
   * Whether a reader may hide this column. Defaults to true.
   *
   * FALSE IS FOR THE COLUMN THAT SAYS WHICH ROW THIS IS: the node, the seat,
   * the name. Hidden, every remaining cell is a fact about something the
   * reader can no longer identify, which is a table of numbers belonging to
   * nobody. The tick is drawn, and drawn fixed with a reason beside it, rather
   * than left out: a column missing from the list reads as a column that is
   * not there at all.
   */
  hideable?: boolean;
  defaultWidth?: number;
  /** Override the value used when sorting this column (defaults to row[key]). */
  sortValue?: (row: TRow) => string | number | Date | null | undefined;
  /**
   * Which way the FIRST press on this header sorts. A name reads ascending
   * first and a cost reads descending first, because the interesting end of
   * each is the one the reader came for.
   */
  firstDirection?: DataTableSortDirection;
  /**
   * Cell alignment. A right-aligned column is a column of numbers, so it also
   * takes tabular figures and stops wrapping: a digit that changes width is a
   * column that jiggles on every push.
   */
  align?: 'left' | 'right' | 'center';
  /** Shrink to the content and never wrap. For a status chip or a short id. */
  shrink?: boolean;
  /**
   * Monospace cell content at a smaller font, suitable for opaque ids,
   * timestamps, and similar fixed-pitch values. Compact variant only.
   */
  mono?: boolean;
  /**
   * When true, the cell value is wrapped in a hover-revealed copy
   * affordance. The clipboard value defaults to String(row[key]) but
   * can be overridden via copyValue. Compact variant only.
   */
  copyable?: boolean;
  copyValue?: (row: TRow) => unknown;
  /**
   * Fixed pixel-or-string width applied directly to the <th>/<td>. A
   * column with `width` is locked at exactly that width; `defaultWidth`
   * is a starting width that resizing and the fit-to-container pass can
   * change.
   */
  width?: string | number;
  /**
   * Pin the column to the right edge of the scroll container so it
   * stays visible regardless of horizontal scroll or how the operator
   * resizes the surrounding data columns. Typical use is a trailing
   * row-action link or affordance that must always be reachable
   * without scrolling. Compact variant only; the default variant
   * already uses fixed widths that do not overflow.
   */
  sticky?: 'right';
}

export interface DataTableSortState {
  key: string;
  direction: DataTableSortDirection;
}

/**
 * Single action shown in the row-actions kebab menu. `rowActions` returns
 * a list of these per row; falsy entries are dropped, so a caller can
 * include an action conditionally with `condition && { ... }`.
 */
export interface DataTableRowAction {
  label: string;
  onClick?: () => void;
  /** A glyph component, drawn before the label. */
  icon?: ReactNode;
  /** A destructive action, drawn in the critical ink. */
  danger?: boolean;
  disabled?: boolean;
  visible?: boolean;
  description?: string;
  divider?: 'before' | 'after';
}

export type DataTableVariant = 'default' | 'compact';

/**
 * The value the All chip stands for.
 *
 * A SENTINEL RATHER THAN A COUNT. It used to be written as `data.length`,
 * which is not "all" but "as many as there were at the instant somebody
 * pressed it": a reader who chose All on twelve rows was on twelve per page,
 * and the table quietly began paging the moment a thirteenth arrived. On an
 * empty table the same press wrote 0, and a page of zero rows hid every row
 * that came afterwards, for the life of the screen and, with a `storageKey`,
 * for every session after it. A word cannot go stale, so the word is what is
 * stored, what a controlled caller is handed, and what the chip compares
 * itself against.
 */
export const ALL_ITEMS = 'all';

/** How many rows a page holds: a count, or every row there is. */
export type DataTableItemsPerPage = number | typeof ALL_ITEMS;

/**
 * Row density for the compact variant. The two presets cover the two
 * places a compact table usually sits:
 *
 *   - 'compact'     the 2xs header over the compact cell step, tight
 *                   padding. For full-width list pages where density
 *                   matters more than air.
 *   - 'comfortable' the small cell step with more padding and extra outer
 *                   space on the first and last cells, so the rows align
 *                   with the inner padding of the card they sit in.
 *
 * Has no effect on variant="default" since the default variant uses
 * its own resizable column widths.
 */
export type DataTableDensity = 'compact' | 'comfortable';

/**
 * Every string the table renders on its own behalf, in one prop.
 *
 * ONE PROP RATHER THAN THIRTY. A table draws a lot of chrome it invents the
 * words for, and each of those words is one a product may have to say
 * differently or in another language. They are gathered here so the signature
 * stays readable and so a caller can override one without restating the rest;
 * `DATA_TABLE_LABELS` is the English default, exported so an override can
 * start from it.
 */
export interface DataTableLabels {
  settings: string;
  resetColumns: string;
  resetConfirmed: string;
  cancel: string;
  apply: string;
  settingsTitle: string;
  itemsPerPage: string;
  allItems: string;
  /**
   * HOW MANY ROWS All IS, read after the word itself, so the chip's whole name
   * is "All 1,284 rows". The word alone is a promise with no size on it, and
   * the size is what a reader is deciding: every row of a list of forty is a
   * page, and every row of a list of forty thousand is a layout the browser
   * will spend seconds on.
   */
  allItemsCount: (rows: number) => string;
  wrapLines: string;
  wrapLinesHint: string;
  columnsSection: string;
  columnsHint: string;
  moveUp: (column: string) => string;
  moveDown: (column: string) => string;
  /** Why Move up does nothing, for the column already at the top. */
  atTop: (column: string) => string;
  atBottom: (column: string) => string;
  /** The drag handle, which is also the arrow-key control beside it. */
  reorder: (column: string) => string;
  reorderHint: string;
  /** Where a column landed, said after a move nobody can see happen. */
  columnMoved: (column: string, position: number, of: number) => string;
  /** Why a column's tick is fixed: the caller's rule, and the table's own. */
  columnAlwaysShown: string;
  columnLastShown: string;
  pagination: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  page: (page: number, of: number) => string;
  /**
   * WHICH ROWS THIS PAGE IS, said after which page it is. "Page 2 of 7" tells
   * a reader where they are in the chrome; it does not tell them what they
   * are looking at, and on a table whose page size the same panel sets, the
   * range is the answer to both "how far in am I" and "how much is there".
   */
  pageRange: (from: number, to: number, total: number) => string;
  expandRow: string;
  collapseRow: string;
  expandAll: string;
  collapseAll: string;
  resize: (column: string) => string;
  /** The width a resize handle is at, for a reader who cannot see the edge. */
  resizeWidth: (pixels: number) => string;
  copyCell: (column: string) => string;
  rowActions: string;
  /** The action column's own header, for a reader moving across a row. */
  actions: string;
  /** Said of a row the caller marks archived, in that row's own title. */
  archivedRow: (label: string) => string;
  /** Read in place of the dash a cell with no value is drawn as. */
  absent: string;
  /** Said while the rows are being fetched and none are on screen yet. */
  loading: string;
  tone: Record<DataTableRowTone, string>;
}

export const DATA_TABLE_LABELS: DataTableLabels = {
  settings: 'Table settings',
  /*
   * THE WORDS THE PRODUCT ALREADY SHIPS. The frame's title, its column
   * section, that section's hint and the reset button are the four strings an
   * operator reads on every table in the product today, so they are spelt here
   * exactly as they are spelt there. `Reset to Default` is also the more
   * accurate of the two: the button puts the page size, the wrapping, the sort
   * and the widths back as well as the columns, which `Reset columns` says
   * less than half of.
   */
  resetColumns: 'Reset to Default',
  resetConfirmed: 'Settings reset to default',
  cancel: 'Cancel',
  apply: 'Apply',
  settingsTitle: 'Table Settings',
  itemsPerPage: 'Items per page',
  allItems: 'All',
  allItemsCount: (rows: number) => `${rows.toLocaleString()} rows`,
  wrapLines: 'Wrap lines',
  wrapLinesHint: 'Wrap the content of a cell instead of truncating it.',
  columnsSection: 'Column Order & Visibility',
  /*
   * THE HINT IS THE POINTER'S, AND THE KEYBOARD'S PATH IS ON THE CONTROLS
   * THEMSELVES. Naming Move up and Move down here read as the only way in for
   * somebody who could see the row, and said nothing to a reader who cannot:
   * a paragraph above a list is not where a screen reader looks for what a
   * control does. The handle's own name and `reorderHint` carry it now, so
   * the keyboard path arrives at the control it belongs to.
   */
  columnsHint: 'Drag to reorder, check/uncheck to show/hide',
  moveUp: (column: string) => `Move ${column} up`,
  moveDown: (column: string) => `Move ${column} down`,
  atTop: (column: string) => `${column} is already first`,
  atBottom: (column: string) => `${column} is already last`,
  reorder: (column: string) => `Reorder ${column}`,
  reorderHint: 'Press the up or down arrow key to move this column.',
  columnMoved: (column: string, position: number, of: number) =>
    `${column} moved to position ${position} of ${of}`,
  columnAlwaysShown: 'This column is always shown.',
  columnLastShown: 'At least one column stays shown.',
  pagination: 'Pagination',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  page: (page: number, of: number) => `Page ${page} of ${of}`,
  pageRange: (from: number, to: number, total: number) => `Rows ${from} to ${to} of ${total}`,
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  expandAll: 'Expand all rows',
  collapseAll: 'Collapse all rows',
  resize: (column: string) => `Resize ${column}`,
  resizeWidth: (pixels: number) => `${pixels} pixels`,
  copyCell: (column: string) => `Copy ${column}`,
  rowActions: 'Row actions',
  actions: 'Actions',
  archivedRow: (label: string) => `This row is ${label}`,
  absent: 'Not reported',
  loading: 'Loading rows',
  tone: { info: 'Active', warning: 'Needs attention', danger: 'Failed' },
};

export interface DataTableProps<TRow = DataTableRow> {
  data?: TRow[];
  columns?: Record<string, DataTableColumn<TRow>>;
  /**
   * Where the operator's own layout choices are kept. Leave it out and the
   * table reads no storage at all, which is what a surface whose state
   * belongs in the URL wants.
   *
   * WHAT IS KEPT HERE, AND WHAT IS NOT. Two of this table's choices are facts
   * about the browser somebody is reading in: whether cells wrap at this
   * window width, and how wide each column was dragged. Those are stored, and
   * only here. The other five, which page, how many rows a page holds, which
   * columns are shown, in what order, and the sort, are facts about WHAT IS ON
   * SCREEN: they are what a reader would send somebody, so each one has a
   * controlled pair a screen can keep in its own history and hand back. A
   * controlled choice is never written to storage, even with a key set, and
   * never read from it either, because the caller holding it has somewhere
   * better and the two would disagree on the first reload.
   */
  storageKey?: string;
  defaultColumnOrder?: string[] | null;
  /**
   * The order the columns are drawn in, as a controlled pair with
   * `onColumnOrderChange`. Names every declared column; a column the caller
   * leaves out is put back beside the one it was declared after.
   *
   * Without the pair, the order a reader arranges in the settings frame lives
   * in `localStorage` under `storageKey`, so it cannot be shared and, on a
   * surface with no key, cannot survive a reload at all.
   */
  columnOrder?: string[];
  onColumnOrderChange?: (next: string[]) => void;
  defaultItemsPerPage?: DataTableItemsPerPage;
  itemsPerPageOptions?: number[];
  /**
   * How many rows a page holds, as a controlled pair with
   * `onItemsPerPageChange`. `ALL_ITEMS` is every row.
   *
   * Passing `onItemsPerPageChange` is also what offers the size to a table
   * that does NOT slice its own rows: the number then means something (the
   * caller reads it), so the frame draws the row of chips.
   */
  itemsPerPage?: DataTableItemsPerPage;
  onItemsPerPageChange?: (next: DataTableItemsPerPage) => void;
  /**
   * Which page the table is on, 1-indexed, as a controlled pair with
   * `onPageChange`. It is where the reader is, so it belongs in the screen's
   * own history: a link to page four of an event log is a link somebody sends.
   */
  page?: number;
  onPageChange?: (next: number) => void;
  /**
   * How many pages there are, for a caller that slices or fetches its own.
   *
   * Required to draw the chevrons for a table with `paginated={false}`, and
   * not defaulted: a bound nobody supplied would be a Next button disabled on
   * page one of a server's ten. With `paginated` on, the table counts its own
   * rows and this is ignored.
   */
  pageCount?: number;
  /**
   * Minimum column width, in pixels, that the resize handle will
   * honor. Operators can drag a column down to this width but no
   * further; trying to shrink past it pins the column at the floor.
   * Default 80px, which keeps short labels and the sort indicator
   * legible without being chatty.
   */
  minColumnWidth?: number;
  /**
   * Enable the per-column drag-to-resize handle on every header.
   * Defaults to true. Set to false on tables whose width should be
   * controlled entirely by the fit-to-container pass (read-mostly
   * lists, single-purpose tables that should not invite the
   * operator to reflow the row). When off, no resize handles
   * render anywhere on the table.
   */
  resizable?: boolean;
  onRowAction?: ((row: TRow) => void) | null;
  actionLabel?: string;
  /** The action column's glyph. A component, not a name. */
  actionIcon?: ReactNode;
  getRowKey?: (row: TRow) => string | number;
  /** Pulls the row key from a fixed property (alternative to getRowKey). */
  rowKey?: string;
  /**
   * What an empty table says. A node, so an EmptyState with its own title,
   * cause and action goes here: "nothing happened", "nothing could be read"
   * and "not configured" are three different facts and a reader has to be
   * told which one this is.
   */
  emptyMessage?: ReactNode;
  /**
   * What sits after the last row when there are no more to fetch. Left out,
   * the end of the rows is silent, which is right for a table that is simply
   * short and wrong for a feed somebody has paged to the bottom of.
   */
  endMessage?: ReactNode;
  showActions?: boolean;
  className?: string;
  /**
   * Visual treatment.
   * - 'default': roomier cells with the settings cog in the Actions
   *   column header; suited to directory-style tables an operator
   *   reshapes and revisits.
   * - 'compact': lighter chrome, tight padding, uppercase headers,
   *   full-row loading and error states, and the settings cog beside the
   *   pager rather than in the header row. That pair is drawn in the
   *   table's own bar, in its own header where it has one, or on the header
   *   of the card the table fills. Designed for dense list pages.
   * Both variants honour `resizable` and open the same settings frame.
   */
  variant?: DataTableVariant;
  /**
   * Row density for the compact variant. Defaults to 'compact'.
   * See the DataTableDensity docs for what each preset paints.
   */
  density?: DataTableDensity;
  /**
   * How tall the rows may grow before they scroll, which is ALSO what pins the
   * column names and paints the band they need to be read over the rows
   * passing behind them. A number is pixels; a string is any CSS length.
   *
   * ONE PROP, because a pinned header and a bounded body are one thing. The
   * rows already sit in a scroller of their own (the table has to be able to
   * overflow sideways, and a box that scrolls in one axis scrolls in both), so
   * a `position: sticky` header pins against THAT box and against nothing
   * else. Left unbounded it is as tall as its rows, never scrolls, and the
   * pin has nothing to happen against: a table told to pin its header and not
   * told how tall to be simply does not pin it, which is a boolean whose true
   * case does nothing. Naming the height is the whole of what a caller has to
   * decide, and it cannot be said without also meaning the pin.
   *
   * Unset, the rows are as tall as they are and the header row is an ordinary
   * row of names on whatever the table stands on, which is what a table the
   * PAGE scrolls wants.
   */
  maxBodyHeight?: number | string;
  /**
   * Controlled sort state. When provided, the table delegates sort to
   * the caller (typical pairing: an external sort menu shares state
   * with the column headers). When omitted, sort is internal.
   */
  sort?: DataTableSortState | null;
  onSortChange?: (next: DataTableSortState | null) => void;
  /**
   * Which column the table opens sorted on, and which order Reset puts back.
   *
   * It seeds the sort only while the sort is the table's own, but it is what
   * BOTH resets mean by "default" either way: a caller holding the sort still
   * has to say what the default IS, or Reset to Default can only offer to
   * order the rows by nothing.
   */
  defaultSort?: DataTableSortState | null;
  /** What a second and third press on the same header do. */
  sortCycle?: DataTableSortCycle;
  /**
   * Holds the order a sort produced until a header is pressed again.
   *
   * For a LIVE table. Without it, a table sorted by a number that a push
   * updates re-ranks itself under the reader's cursor several times a second,
   * so the row somebody is reading is not the row they click. With it, the
   * order is taken once, when the sort is chosen; rows that arrive afterwards
   * join the end until the next press re-ranks everything.
   */
  stableOrder?: boolean;
  /**
   * Multi-action menu per row. When supplied, an actions column is
   * appended on the right that renders a kebab menu. Takes precedence
   * over onRowAction (the single-button affordance).
   */
  rowActions?: (row: TRow) => Array<DataTableRowAction | null | undefined | false>;
  /** Dim rows the predicate marks as archived, with a left edge accent. */
  archivedPredicate?: (row: TRow) => boolean;
  archivedLabel?: string;
  /**
   * Skeleton loading state. While true and no rows are present, the
   * body renders shimmer bars inside the real table structure (one
   * bar per visible column) so column alignment, paddings, and row
   * heights match the data that replaces them, no layout shift when
   * the fetch lands. Tables that already have rows keep showing them
   * during a refresh.
   */
  loading?: boolean;
  /** Number of shimmer rows painted while loading. Default 5. */
  skeletonRows?: number;
  /** Renders a single full-row error message when truthy. Wins over empty. */
  error?: ReactNode;
  /**
   * Whether the TABLE slices the rows into pages. When false the caller
   * slices them, and says how many there are with `pageCount` if it wants the
   * chevrons drawn.
   */
  paginated?: boolean;
  /** When false, the settings cog and Actions column header are suppressed. */
  showSettings?: boolean;
  /**
   * Fires when a row's surface is clicked. Used by click-to-detail tables
   * (an order row opening its detail page, a log entry opening a drawer).
   * The row becomes focusable and takes Enter and Space, and a press that
   * began on a control inside the row belongs to that control alone.
   */
  onRowClick?: (row: TRow) => void;
  /**
   * Where a row leads, for a row that navigates.
   *
   * A REAL LINK, not a click handler: the first cell carries an anchor whose
   * hit area covers the row, so the row can be opened in a new tab, its
   * address copied, and read by a screen reader as the link it is. Prefer it
   * to `onRowClick` wherever the destination is a URL.
   */
  getRowHref?: (row: TRow) => string | null | undefined;
  /**
   * Marks a row as a state. The row takes a rail in the tone's colour and a
   * word for a reader who cannot see the rail, because colour is never the
   * only carrier of a state.
   */
  rowTone?: (row: TRow) => DataTableRowTone | null | undefined;
  /** Whether a row is the selected one: `aria-selected` and the selection ring. */
  isSelected?: (row: TRow) => boolean;
  /**
   * Optional secondary row rendered immediately below each main row,
   * spanning the full column width. Returning null skips it for that
   * row. Used by tree-like tables (for example API keys grouped under
   * their owner) where each entity owns an attached detail strip that
   * visually belongs to the main row but does not share its column
   * layout.
   */
  renderAccessoryRow?: (row: TRow) => ReactNode | null | undefined;
  /**
   * Slot rendered above the table header (and inside the same root
   * wrapper) for filter bars, search inputs, or batch-action toolbars.
   * uilet is intentionally agnostic about what goes here, the caller
   * composes whichever primitives match its domain (Select, Input,
   * datetime-local, etc.). The slot is rendered exactly once per
   * mount, regardless of pagination state.
   */
  renderToolbar?: ReactNode;
  /**
   * A band BETWEEN the toolbar and the rows, inside the same panel, for what
   * the toolbar has switched on: the chips a list screen draws for its active
   * filters, a selection count, a batch action bar.
   *
   * It is a slot of its own rather than more of `renderToolbar` because the
   * two are different rows: the toolbar is a row of controls the table's own
   * pagination and settings share, and this is the state those controls
   * produced. Stacked into one slot, the controls at the table's right edge
   * would centre themselves against a two-line block. Left out, no band is
   * drawn at all, so a screen with no chips on has no empty strip.
   */
  renderFilterBar?: ReactNode;
  /**
   * Clear-filters affordance for tables whose renderToolbar slot
   * carries filter controls. When onClearFilters is supplied and
   * filtersActive is true, a "Clear filters" link button renders at
   * the end of the filter slot; clicking it fires the callback so
   * the caller resets its own filter state. The button stays hidden
   * while filtersActive is false so an untouched toolbar carries no
   * dead control.
   */
  onClearFilters?: () => void;
  filtersActive?: boolean;
  /** Label override for the clear-filters button. */
  clearFiltersLabel?: string;
  /**
   * A value that changes whenever the caller's own filters change, so the
   * table can go back to the first page.
   *
   * THE PAGE IS RESET BY A FILTER OR A SORT, AND BY NOTHING ELSE. It used to
   * reset whenever the row COUNT changed, which on a live table is whenever
   * anything happened: a reader on page four of an activity feed was thrown
   * back to page one by an event they were not looking at.
   */
  filterKey?: string | number;
  /**
   * Which columns are shown, as a controlled pair with
   * `onVisibleColumnsChange`.
   *
   * Without the pair the table owns the choice and keeps it in
   * `localStorage` under `storageKey`, so a surface that passes neither can
   * never bring back a column hidden by `defaultVisible: false`. Supplied,
   * the caller keeps it wherever its other state lives, which for a dashboard
   * screen is the URL.
   *
   * EITHER WAY, THE SETTINGS FRAME IS THE WAY IN, so a caller that passes the
   * pair and `showSettings={false}` has taken the reader's way in with it and
   * owes them a control of its own. The pair still drives the table: what it
   * says is what is drawn, whoever changed it.
   */
  visibleColumns?: Record<string, boolean>;
  onVisibleColumnsChange?: (next: Record<string, boolean>) => void;
  /**
   * When supplied, each row becomes expandable. The chevron button in the
   * leading cell toggles a detail panel rendered immediately below the row,
   * spanning the full column width. Returning null from the function
   * suppresses expansion for that row.
   *
   * Mutually exclusive with onRowClick (expansion takes the click);
   * combine with rowActions freely since the kebab stops propagation.
   * ANY NUMBER OF ROWS MAY BE OPEN AT ONCE: opening one closes nothing, and
   * the header chevron opens or closes every row on the page.
   */
  renderExpandedRow?: (row: TRow) => ReactNode | null | undefined;
  /** Optional initial expanded row key (resolved via the row-key resolver). */
  defaultExpandedKey?: string | number | null;
  /**
   * Cursor-pagination footer. When hasMore is true, the table renders
   * a centered "Load more" button below the rows that fires onLoadMore.
   * The button is disabled while loadingMore is true. When hasMore is
   * false, `endMessage` says so, or nothing does.
   *
   * Independent from the built-in client-side paginated prop: cursor
   * pagination is server-driven (caller fetches and appends rows),
   * client pagination slices a fully loaded dataset.
   */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  loadMoreLabel?: string;
  /**
   * Optional table header rendered above the toolbar. The title is the
   * section name (e.g. "Projects"), the description is a one-line
   * explanation of what the rows represent, and icon is an optional
   * glyph rendered to the left of the title (the same icon, title and
   * description header a settings card uses). Folding them into the table
   * primitive lets the entire surface, header + toolbar + table, share the
   * same card boundary and spacing without each caller recomposing the
   * `<header><h2/><p/></header>` pattern.
   *
   * When a header is present, the table's right-side controls
   * (pagination chevrons + settings cog) move ONTO the header row so
   * the section title and the controls share the same line. The
   * caller-supplied filter slot (renderToolbar) renders on its own
   * row below the header.
   *
   * A TABLE THAT FILLS A CARD USUALLY WANTS THE CARD'S HEADER INSTEAD, which
   * carries the icon, the name and the count, and which takes the same
   * controls with nothing passed: see `Card.Header` and `useCardHeaderSlot`.
   * This one is for a table that is the whole of its own surface.
   */
  title?: ReactNode;
  description?: ReactNode;
  /** The header's glyph. A component, not a name. */
  icon?: ReactNode;
  /**
   * Initial value for the Wrap lines toggle.
   * When true, cells wrap their content with overflow-wrap: anywhere.
   * When false, cells stay on a single line and truncate with an
   * ellipsis. Persisted under `${storageKey}_wrapLines` when a
   * storageKey is provided.
   */
  defaultWrapLines?: boolean;
  /** Every string the table renders itself. Merged over the English defaults. */
  labels?: Partial<DataTableLabels>;
}

export const DataTable = <TRow,>({
  data = [],
  columns = {},
  storageKey,
  defaultColumnOrder = null,
  columnOrder: columnOrderProp,
  onColumnOrderChange,
  defaultItemsPerPage = 10,
  itemsPerPage: itemsPerPageProp,
  onItemsPerPageChange,
  page: pageProp,
  onPageChange,
  pageCount,
  minColumnWidth = 80,
  resizable = true,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  onRowAction = null,
  actionLabel = 'Delete',
  actionIcon = <DeleteGlyph size="md" />,
  getRowKey,
  rowKey,
  emptyMessage = 'No data available',
  endMessage,
  showActions = true,
  className = '',
  variant = 'default',
  density = 'compact',
  maxBodyHeight,
  sort: sortProp,
  onSortChange,
  defaultSort = null,
  sortCycle = 'asc-desc-none',
  stableOrder = false,
  rowActions,
  archivedPredicate,
  archivedLabel = 'archived',
  loading = false,
  skeletonRows = 5,
  error = null,
  paginated = true,
  showSettings = true,
  onRowClick,
  getRowHref,
  rowTone,
  isSelected,
  renderAccessoryRow,
  renderToolbar,
  renderFilterBar,
  onClearFilters,
  filtersActive = false,
  clearFiltersLabel = 'Clear filters',
  filterKey,
  visibleColumns: visibleColumnsProp,
  onVisibleColumnsChange,
  renderExpandedRow,
  defaultExpandedKey = null,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loadMoreLabel = 'Load more',
  title,
  description,
  icon,
  defaultWrapLines,
  labels: labelOverrides,
}: DataTableProps<TRow>) => {
  const labels: DataTableLabels = labelOverrides
    ? { ...DATA_TABLE_LABELS, ...labelOverrides, tone: { ...DATA_TABLE_LABELS.tone, ...labelOverrides.tone } }
    : DATA_TABLE_LABELS;
  /*
   * Wrap-lines default: every DataTable wraps cell content by default
   * so columns flow legibly at any width and stacked content blocks
   * (name + id pairs, avatar + label cells) render as designed. Operators
   * can opt-in to single-line truncation per table via the Wrap lines
   * toggle in the settings modal; the preference persists in
   * localStorage under the table's storageKey.
   */
  const effectiveDefaultWrapLines = defaultWrapLines ?? true;
  /*
   * Row-key resolver. Callers can pass either getRowKey (function) or
   * rowKey (property name), with a final fallback to row.id so existing
   * call sites that do neither keep working.
   */
  const resolveRowKey = (row: TRow): string | number => {
    if (getRowKey) return getRowKey(row);
    if (rowKey) return cellValue(row, rowKey) as string | number;
    return cellValue(row, 'id') as string | number;
  };

  /*
   * Variant flag drives several layout opt-outs:
   *   - compact moves the settings cog from the Actions header column
   *     to the toolbar
   *   - compact emits the .crewlet-data-table--compact class root
   *
   * Anything the caller passes explicitly via showSettings / paginated still
   * wins so they remain orthogonal escape hatches.
   */
  const isCompact = variant === 'compact';
  /*
   * Two derivations of the props alone, declared here rather than beside their
   * first use a thousand lines below: the fit pass reads both, and a `const`
   * declared after the effect that reads it is a temporal dead zone.
   */
  const hasActionColumn = !!rowActions || (showActions && !!onRowAction);
  const expandable = !!renderExpandedRow;
  /*
   * Pagination + settings are now driven solely by the caller's
   * props in both variants. The compact variant gets a dedicated
   * top-right toolbar (pagination chevrons + gear icon) instead of
   * the in-Actions-column gear the default variant uses. Callers
   * who don't want either feature pass paginated={false} and
   * showSettings={false} explicitly; both default to true.
   */
  const settingsEnabled = showSettings;
  const paginationEnabled = paginated;
  // The default variant still surfaces the settings cog in the
  // Actions column header; the compact variant uses the new
  // top-right toolbar. Gate the in-header cog accordingly so the
  // compact variant doesn't paint it twice.
  const settingsInHeader = settingsEnabled && !isCompact;
  /*
   * WHICH TABLES CARRY THE TRAILING CHROME COLUMN. The one with row actions,
   * and the default-variant one whose settings live in that column's header.
   * It used to be the first alone, and the cog hung off it: a default-variant
   * table with no `rowActions` and no `onRowAction` therefore had no way into
   * its own settings at all, so a column hidden by `defaultVisible: false`
   * could never be brought back.
   */
  const hasChromeColumn = hasActionColumn || settingsInHeader;
  // Generate default values from columns config
  const generateDefaultColumnWidths = (): Record<string, number> => {
    const widths: Record<string, number> = {};
    Object.keys(columns).forEach(key => {
      const col = columns[key];
      const rawExplicit = col?.width ?? col?.defaultWidth;
      let px: number | null = null;
      if (rawExplicit != null) {
        const parsed = typeof rawExplicit === 'number'
          ? rawExplicit
          : parseInt(String(rawExplicit), 10);
        if (Number.isFinite(parsed)) px = parsed;
      }
      /*
       * Label-aware default when no explicit width prop is given.
       * Headers must fit their label without being truncated to
       * "Created…" on first paint, so we estimate the natural rendered
       * width from the label's character count (each char ≈ 7.5px
       * at the compact header's 11px font) and reserve 56px of chrome
       * for cell padding, the sort indicator, and the resize handle.
       * Callers that want a different starting width pass column.width
       * (or column.defaultWidth) explicitly to override the estimate.
       */
      if (px == null) {
        const labelStr = typeof col?.label === 'string' ? col.label : key;
        const estimated = Math.ceil(labelStr.length * 7.5) + 56;
        px = Math.max(120, estimated);
      }
      /*
       * Floor the seeded value at the minimum so call sites that
       * declare a sub-minimum width never start the table below the
       * resize floor. The operator can still grow the column from
       * the minimum; they just can't go lower.
       */
      widths[key] = Math.max(minColumnWidth, px);
    });
    /*
     * Width slot for the legacy variant's internal Actions column.
     * Stored under the reserved `__actions` key (matches the React
     * <th>/<td> key) so it never collides with a user-defined column
     * named "actions" in the columns config. The compact variant
     * ignores this slot (its chrome action column has a fixed inline
     * width).
     */
    if (showActions) {
      widths.__actions = 60;
    }
    return widths;
  };

  const generateDefaultVisibleColumns = (): Record<string, boolean> => {
    const visible: Record<string, boolean> = {};
    Object.keys(columns).forEach(key => {
      visible[key] = columns[key]?.defaultVisible !== false;
    });
    return visible;
  };

  const generateDefaultColumnOrder = () => {
    return defaultColumnOrder || Object.keys(columns);
  };

  const defaultColumnWidths = generateDefaultColumnWidths();
  const defaultVisibleColumns = generateDefaultVisibleColumns();
  const defaultOrder = generateDefaultColumnOrder();

  /**
   * The widths an operator resized to, as the store holds them.
   *
   * A stale key is dropped rather than carried: a column the caller has
   * since locked with `width` is the caller's to size, and one that has left
   * the table altogether would keep a row of the store alive forever. The
   * floor applies here too, because an entry written by an older build may
   * name a width under the current `minColumnWidth`.
   *
   * A function, because the two states that seed from it both want it and
   * neither may read the store on every render.
   */
  const readResizedColumns = (): Record<string, number> => {
    const saved = readStoredJson(storageKey, 'resizedColumns', isNumberRecord);
    if (!saved) return {};
    const kept: Record<string, number> = {};
    Object.entries(saved).forEach(([key, px]) => {
      if (!Number.isFinite(px)) return;
      const col = columns[key];
      if (!col || col.width != null) return;
      kept[key] = Math.max(minColumnWidth, px);
    });
    return kept;
  };

  // State management with localStorage persistence
  const [columnWidths, setColumnWidths] = useState(
    () => ({ ...defaultColumnWidths, ...readResizedColumns() }),
  );
  /*
   * WHICH WIDTHS ARE SOMEBODY'S CHOICE, and which the table worked out for
   * itself.
   *
   * Every width used to be saved under one entry and read back as the
   * operator's, so the fit pass (which WROTE almost all of them) found its
   * own arithmetic in the store on the next mount and stood down for the life
   * of the table. A window narrowed after that first paint left every column
   * at the width a wider one had justified, and the table scrolled sideways
   * with nothing in it. Measured on the engine dashboard: twelve of twelve
   * tables, by 300 to 500px, seven of them empty.
   *
   * A width is the operator's only where they dragged or stepped the handle
   * to it. Those keys are what is held here and all that is persisted, and
   * the fit pass treats them exactly as it treats a `width` a caller locked:
   * chrome, never redistributed. Every other width belongs to the fit, which
   * is free to take it back whenever the container changes.
   */
  const [resizedColumns, setResizedColumns] = useState<Record<string, true>>(
    () => Object.fromEntries(Object.keys(readResizedColumns()).map((key) => [key, true])),
  );
  /*
   * A width somebody dragged to is a width they asked for: theirs from the
   * first pixel of the drag, and the fit pass leaves it alone from there on.
   *
   * Held stable, because the pointer drag marks the column from inside the
   * effect that carries the document's mousemove listener, and a fresh
   * function every render would tear that listener down and rebuild it on
   * every pixel of the drag.
   */
  const markResized = useCallback((columnKey: string) => {
    setResizedColumns((was) => (was[columnKey] ? was : { ...was, [columnKey]: true }));
  }, []);

  /*
   * How many rows a page holds. Controlled through `itemsPerPage` and
   * `onItemsPerPageChange` when the caller passes the pair, its own
   * otherwise; the stored entry is read only in the uncontrolled case, for
   * the reason `storageKey` gives.
   */
  const [ownItemsPerPage, setOwnItemsPerPage] = useState<DataTableItemsPerPage>(() => {
    if (itemsPerPageProp !== undefined) return defaultItemsPerPage;
    const saved = readStored(storageKey, 'itemsPerPage');
    if (saved === ALL_ITEMS) return ALL_ITEMS;
    const count = Number.parseInt(saved ?? '', 10);
    return Number.isFinite(count) && count > 0 ? count : defaultItemsPerPage;
  });
  const itemsPerPage = itemsPerPageProp ?? ownItemsPerPage;
  const commitItemsPerPage = (next: DataTableItemsPerPage) => {
    if (itemsPerPageProp === undefined) setOwnItemsPerPage(next);
    onItemsPerPageChange?.(next);
  };

  /*
   * Which columns are shown. Controlled through `visibleColumns` and
   * `onVisibleColumnsChange` when the caller passes the pair, and its own
   * otherwise; the stored entry is read only in the uncontrolled case,
   * because a caller that owns the choice has somewhere better to keep it.
   */
  const [ownVisibleColumns, setOwnVisibleColumns] = useState(() => {
    const saved = visibleColumnsProp === undefined
      ? readStoredJson(storageKey, 'visibleColumns', isBooleanRecord)
      : null;
    if (!saved) return defaultVisibleColumns;
    // Drop columns that no longer exist, and give a new column its own default.
    const valid: Record<string, boolean> = {};
    Object.keys(columns).forEach((key) => {
      valid[key] = Object.prototype.hasOwnProperty.call(saved, key)
        ? saved[key]!
        : columns[key]?.defaultVisible !== false;
    });
    return valid;
  });
  const visibleColumns = visibleColumnsProp ?? ownVisibleColumns;
  /**
   * Whether a column is drawn.
   *
   * ONE ANSWER, and the absent entry is the reason it has to be one. The
   * table's own map names every column, but a CONTROLLED map is the caller's,
   * and a caller that hides one column by naming it alone is naming the only
   * thing it wants changed. Read as a bare truthy test, the header and the
   * cells dropped every column the map did not mention while the Columns
   * panel, which has always read it as "not false", drew them all ticked: a
   * table with no columns under a panel saying they were all shown.
   */
  const isColumnVisible = (key: string): boolean => visibleColumns[key] !== false;
  const commitVisibleColumns = (next: Record<string, boolean>) => {
    if (visibleColumnsProp === undefined) setOwnVisibleColumns(next);
    onVisibleColumnsChange?.(next);
  };

  /*
   * The order the columns are drawn in. The same controlled pair as the
   * visibility above, and for the same reason: the order a reader arranged is
   * part of what they are looking at, so a screen that keeps its state in a
   * URL has to be able to keep this too.
   */
  const [ownColumnOrder, setOwnColumnOrder] = useState(() => {
    const saved = columnOrderProp === undefined
      ? readStoredJson(storageKey, 'columnOrder', isStringArray)
      : null;
    if (!saved) return defaultOrder;
    // Filter out any columns that no longer exist in the columns config
    const validOrder = saved.filter((key) => Object.prototype.hasOwnProperty.call(columns, key));
    // Add any new columns that aren't in the saved order
    const newColumns = defaultOrder.filter((key: string) => !validOrder.includes(key));
    return validOrder.length > 0 ? [...validOrder, ...newColumns] : defaultOrder;
  });

  /*
   * THE COLUMNS CAN CHANGE WHILE THE TABLE IS MOUNTED, and the reader's own
   * order has to survive it. The state above is seeded once, so a column a
   * caller adds later (an archived list revealing a Deleted at column, a
   * screen swapping its column set behind a tab) was never drawn at all: its
   * data was there, its key was in `columns`, and nothing walked it. A column
   * the caller stops declaring is the same failure the other way round, with
   * every cell reading undefined.
   *
   * So the order is reconciled on every render against what is declared NOW:
   * the keys a reader has arranged keep their places, one that has gone is
   * dropped, and a new one is put back where it was declared rather than at
   * the end, measured against the columns already placed around it.
   */
  // Keyed on the declared order's CONTENT rather than on the array, because a
  // caller builds that array fresh on every render and an identity dependency
  // would recompute the order several times a second on a live table.
  const declaredOrder = defaultOrder.join('\u0000');
  const arrangedOrder = columnOrderProp ?? ownColumnOrder;
  const columnOrder = useMemo(
    () => reconcileOrder(arrangedOrder, declaredOrder === '' ? [] : declaredOrder.split('\u0000')),
    [arrangedOrder, declaredOrder],
  );
  const commitColumnOrder = (next: string[]) => {
    if (columnOrderProp === undefined) setOwnColumnOrder(next);
    onColumnOrderChange?.(next);
  };

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: DataTableSortDirection | null }>(
    () => ({ key: defaultSort?.key ?? null, direction: defaultSort?.direction ?? null }),
  );
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);

  /*
   * Wrap-lines state: when true, cells wrap onto multiple lines instead
   * of truncating with an ellipsis. Persisted per storageKey so the
   * operator's preference survives a reload. Driven through the compact
   * settings modal's confirm/cancel flow (draft state below).
   */
  const [wrapLines, setWrapLines] = useState<boolean>(() => {
    if (!storageKey) return effectiveDefaultWrapLines;
    const saved = readStored(storageKey, 'wrapLines');
    return saved == null ? effectiveDefaultWrapLines : saved === 'true';
  });

  /*
   * Draft state for the settings frame, under its Reset / Cancel /
   * Apply footer: opening the frame seeds the drafts from live state,
   * every edit inside it mutates drafts only, Apply commits them to
   * live state, Cancel discards them, and Reset to Default resets the
   * drafts rather than live state. Column resize via the table-header
   * drag handle keeps writing to live state directly, since the frame
   * is not open during that interaction.
   */
  const [draftItemsPerPage, setDraftItemsPerPage] = useState<DataTableItemsPerPage>(0);
  const [draftWrapLines, setDraftWrapLines] = useState<boolean>(effectiveDefaultWrapLines);
  const [draftColumnWidths, setDraftColumnWidths] = useState<Record<string, number>>({});
  const [draftVisibleColumns, setDraftVisibleColumns] = useState<Record<string, boolean>>({});
  const [draftColumnOrder, setDraftColumnOrder] = useState<string[]>([]);
  const [draftSortConfig, setDraftSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>(
    { key: null, direction: null },
  );
  /*
   * Brief checkmark affordance on the Reset to Default button. Flips
   * to true on click, auto-clears after 1500ms via an effect cleanup.
   * Mirrors the Copyable "copied" pattern so the operator sees a
   * confirmation that the reset landed in the draft state.
   */
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const resetConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
   * When the operator clicks Reset to Default inside the settings
   * modal, the draft column widths revert to the bare label-aware
   * defaults. Apply then commits those drafts to live state. Without
   * this flag, the live commit would leave the table in its
   * unfitted shape (collapsed columns next to a wide spacer) until
   * the next mount. Flipped on by handleResetTableSettings and read
   * by applyTableSettings so apply can re-arm the fit pass.
   */
  const pendingFitOnApplyRef = useRef<boolean>(false);

  /*
   * Which rows are open, by resolved row key. A SET, and it always was: the
   * comment that called this single-row expansion and named a `null` that
   * does not exist survived every change to the thing it described, so the
   * header chevron opening every row on the page read as a bug.
   *
   * Dormant when renderExpandedRow is not supplied.
   */
  const [expandedKeys, setExpandedKeys] = useState<Set<string | number>>(
    () => (defaultExpandedKey != null ? new Set([defaultExpandedKey]) : new Set()),
  );
  const toggleExpanded = (key: string | number) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  /*
   * scrollRef points at the table's horizontal scroll container so the
   * fit-to-container effect can measure the row width the table is
   * allowed to occupy.
   *
   * WHAT ASKS FOR A FIT IS A COUNT OF REQUESTS, NOT A FLAG. A boolean
   * latched: the pass returns without clearing it when there is nothing to
   * measure yet (no element, or a container of zero width, which is every
   * table mounted inside a panel that is not on screen), and every later
   * request then set a `true` that was already true, so React had no state
   * change to re-render for and the effect was never entered again. A table
   * in a closed tab never fitted at all once it opened. A counter cannot be
   * already set, so a request always lands; two in one commit still fit once,
   * because React batches them into a single render.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [fitRequests, setFitRequests] = useState<number>(0);
  const requestFit = useCallback(() => setFitRequests((n) => n + 1), []);
  /*
   * WHAT THE EMPTY ROW ACTUALLY SAYS, read back off the row itself.
   *
   * `emptyMessage` is a node, and every list screen in the engine passes one:
   * a whole EmptyState, a heading over a sentence, sometimes with something to
   * press. A second copy of that node inside the live region would be a second
   * copy of everything in it, including that control, which is a tab stop
   * nobody can see and a name read twice. The RENDERED cell's own text is the
   * same words with none of that, so it is what the region carries, and it is
   * read after the commit that draws the row rather than guessed from the prop.
   */
  const emptyCellRef = useRef<HTMLTableCellElement | null>(null);
  const [emptySaid, setEmptySaid] = useState('');

  // Reset to default settings
  const resetToDefault = () => {
    const newDefaultWidths = generateDefaultColumnWidths();
    const newDefaultVisible = generateDefaultVisibleColumns();
    const newDefaultOrder = generateDefaultColumnOrder();

    setColumnWidths(newDefaultWidths);
    /* A reset gives every column back to the fit pass, the ones this reader
       dragged included: the widths being put back are the table's own. */
    setResizedColumns({});
    commitVisibleColumns(newDefaultVisible);
    commitColumnOrder(newDefaultOrder);
    commitItemsPerPage(defaultItemsPerPage);
    setSortConfig({ key: defaultSort?.key ?? null, direction: defaultSort?.direction ?? null });

    /*
     * Reopen the fit pass so the proportional grow-to-fit runs
     * again against the current container size. Without this the
     * reset widths stay pinned at their bare label-aware minimums
     * and the spacer absorbs the rest, defeating the reset.
     */
    requestFit();

    for (const name of ['resizedColumns', 'visibleColumns', 'columnOrder', 'itemsPerPage']) {
      removeStored(storageKey, name);
    }
  };

  /*
   * Fit-to-container effect. On first paint, if the seeded data column
   * widths leave headroom inside the scroll container, distribute the
   * leftover proportionally to the visible data columns so headers
   * read at their natural rendered width instead of being collapsed
   * against a wide trailing spacer. Skipped when:
   *
   *   - the operator has already saved widths (storageKey hit in
   *     localStorage) so persisted choices win
   *   - the table is narrower than the visible columns sum, in which
   *     case horizontal scroll is the right answer, not stretching
   *   - the fit has already run this mount (fitAppliedRef)
   *
   * Chrome columns (__actions, the expand chevron, the action kebab
   * cap) are excluded from the proportional split because they have
   * fixed visual widths and stretching them would offset cell
   * alignment.
   */
  /*
   * WHAT THE FIT PASS READS, held in a ref rather than named in the dependency
   * list below.
   *
   * The pass is triggered by a request alone and WRITES the column widths it
   * reads, so a dependency list naming those widths re-runs it on its own
   * output: a loop. Written as a ref updated on every render, the effect sees
   * exactly what a dependency list would have given it, and the list is honest
   * about the one thing that actually triggers it.
   */
  const fitInputs = useRef({
    columns,
    columnOrder,
    visibleColumns,
    columnWidths,
    resizedColumns,
    expandable,
    hasChromeColumn,
    isCompact,
    minColumnWidth,
  });
  fitInputs.current = {
    columns,
    columnOrder,
    visibleColumns,
    columnWidths,
    resizedColumns,
    expandable,
    hasChromeColumn,
    isCompact,
    minColumnWidth,
  };

  useLayoutEffect(() => {
    const { columns, columnOrder, visibleColumns, columnWidths, resizedColumns, expandable, hasChromeColumn, isCompact, minColumnWidth } =
      fitInputs.current;
    const el = scrollRef.current;
    if (!el) return;
    /*
     * THE BOX IS FRACTIONAL; clientWidth IS NOT.
     *
     * A table in a grid or flex column is routinely a fraction of a pixel
     * wide (the fleet screen's pair measure 544.5), and `clientWidth` rounds.
     * Rounded up, the fit hands the columns a whole pixel more than the box
     * holds, every column keeps its integer width, and the scroller draws a
     * bar for the half pixel over: a horizontal scrollbar across a table that
     * fits, at every viewport width, on a screen with no rows at all.
     * Neither `scrollWidth - clientWidth` nor any other integer measurement
     * can see it, because both round the same way.
     *
     * So the content box is measured and FLOORED. Half a pixel of unused room
     * is invisible; half a pixel of overflow is a scrollbar.
     *
     * Its edges come from `offsetWidth - clientWidth`, which is the borders
     * AND any classic scrollbar and is already an integer. getComputedStyle
     * cannot be asked here at all: jsdom answers `16px` for a border nothing
     * declares, which would take 32px off every fitted table in a test run
     * and none in a browser.
     */
    const box = el.getBoundingClientRect();
    const edges = Math.max(0, el.offsetWidth - el.clientWidth);
    const measured = box.width - edges;
    // A layout that measures nothing, which is every test runner, answers
    // zero for the box; clientWidth is the only number there.
    const containerWidth = measured > 0 ? Math.floor(measured) : el.clientWidth;
    if (containerWidth <= 0) return;

    /*
     * Sticky-right columns are pinned to the right edge at a fixed
     * affordance width (a trailing action link, kebab, etc.). They
     * should not absorb leftover container space when the table is
     * fit to its container, otherwise the action chip would balloon
     * past its content width. Count their width as chrome instead so
     * the proportional grow distributes only across the regular data
     * columns to their left.
     */
    const visibleAllKeys = columnOrder.filter((key) => visibleColumns[key] !== false);
    /*
     * Three buckets:
     *   visibleStickyKeys  pinned action cells at the right edge; their
     *                      width is locked at the seeded value and
     *                      counted as chrome.
     *   visibleFixedKeys   data columns nobody here may resize: the ones
     *                      a caller declared with an explicit `width`
     *                      prop (an avatar swatch, a status icon, a
     *                      kebab cap: anything that should never
     *                      balloon), and the ones the OPERATOR dragged
     *                      or stepped to a width of their own. Counted
     *                      as chrome so the fit leaves both alone.
     *   visibleDataKeys    data columns on `defaultWidth` or on the
     *                      label-aware default. These absorb the
     *                      leftover space proportionally, and give it
     *                      back when the container gets smaller.
     *
     * Columns split by `sticky === 'right'` AND by whether anything has
     * locked their width. The semantic difference: `width` is "lock at
     * exactly this", `defaultWidth` is "start at this and let the fit
     * grow / shrink it", and a drag is the operator saying the first.
     */
    const isFixedWidthColumn = (key: string): boolean => {
      const col = columns[key];
      if (!col) return false;
      if (col.sticky === 'right') return false;
      return col.width != null || resizedColumns[key] === true;
    };
    const visibleStickyKeys = visibleAllKeys.filter((key) => columns[key]?.sticky === 'right');
    const visibleFixedKeys = visibleAllKeys.filter((key) => isFixedWidthColumn(key));
    const visibleDataKeys = visibleAllKeys.filter(
      (key) => columns[key]?.sticky !== 'right' && !isFixedWidthColumn(key),
    );
    if (visibleDataKeys.length === 0) return;

    let chromeWidth = 0;
    if (expandable) chromeWidth += 32;
    if (hasChromeColumn) chromeWidth += isCompact ? 48 : (columnWidths.__actions ?? 60);
    chromeWidth += visibleStickyKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    chromeWidth += visibleFixedKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    /*
     * Reserve the breathing-room gutter to the left of the sticky
     * action column so the rightmost regular cell never touches the
     * pinned button. Without this, the fit pass distributes the full
     * leftover across regular columns, pushes the spacer to 0, and
     * the rightmost data cell butts directly against the sticky cell
     * with no visual separation. A clear cell gap also leaves the
     * operator visual proof that the action column is a separate
     * frozen pane rather than an extension of the data grid.
     *
     * READ OFF THE CELL, NOT ASSUMED. The stylesheet draws that gutter
     * with a spacing token, and every spacing token in this system is
     * `calc(Npx * var(--density))`, so a flat number here is right at
     * one density and wrong at the other two. It was 24, and the
     * comfortable density draws 27: the row landed three pixels over
     * its container, which on a frozen rail is a scrollbar across a
     * table that fits (measured on the conlet fixture: 883 in an 880px
     * box). The spacer is the cell the gutter IS, so its own width is
     * the answer at whatever density the page is on. A layout that
     * measures nothing, which is every test runner, answers zero and
     * falls back to the figure the normal density draws.
     */
    if (visibleStickyKeys.length > 0) {
      const spacer = el.querySelector('.crewlet-data-table__th--spacer');
      const drawn = spacer ? spacer.getBoundingClientRect().width : 0;
      chromeWidth += drawn > 0 ? drawn : 24;
    }

    const dataTotal = visibleDataKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    const available = containerWidth - chromeWidth;
    const leftover = available - dataTotal;
    /*
     * A GAP OF A PIXEL IS NOTHING; AN OVERFLOW OF ONE IS A SCROLLBAR.
     *
     * The window used to be symmetric, so a row a pixel wider than its box
     * was left alone and the scroller drew a bar over rows that fit to
     * within a rounding error. Measured on the engine dashboard's budgets
     * table at a 1024px viewport: 692 in a 691px box. Under the container
     * nothing further is gained by a re-render, so that half stays.
     *
     * Outside that window the proportional pass grows OR shrinks the regular
     * columns so they always fit the current container width. Shrink is what
     * the responsive case needs: when the viewport narrows (a sidebar opens,
     * a window is dragged), the previously fitted widths now overflow, and
     * the table would otherwise scroll sideways instead of compacting.
     */
    if (leftover >= 0 && leftover <= 1) return;

    /*
     * THE ROOM COMES FROM EVERY COLUMN THAT STILL HAS SOME, not from the
     * last one in the row.
     *
     * One proportional pass cannot shrink a table that has to give up more
     * than its narrow columns hold: each of them stops at the floor, the
     * shortfall lands on whichever column happens to be last, and it stops
     * at the floor too, leaving the table wider than the container with
     * columns above the floor on either side of the one that failed. So the
     * pass repeats over the columns that are still above it until the room
     * is found or nothing is left to take. Growing needs one pass: there is
     * no ceiling to stop at.
     */
    const next = { ...columnWidths };
    const widthOf = (key: string): number => next[key] ?? minColumnWidth;
    visibleDataKeys.forEach((key) => {
      next[key] = widthOf(key);
    });
    let outstanding = leftover;
    let pool = visibleDataKeys;
    while (pool.length > 0 && outstanding !== 0) {
      const poolTotal = pool.reduce((sum, key) => sum + widthOf(key), 0);
      if (poolTotal <= 0) break;
      const roomLeft: string[] = [];
      let moved = 0;
      pool.forEach((key, idx) => {
        const current = widthOf(key);
        const rawShare = idx === pool.length - 1
          ? outstanding - moved
          : Math.round(outstanding * (current / poolTotal));
        const clamped = Math.max(minColumnWidth, current + rawShare);
        moved += clamped - current;
        next[key] = clamped;
        if (clamped > minColumnWidth) roomLeft.push(key);
      });
      if (moved === 0) break;
      outstanding -= moved;
      pool = roomLeft;
    }
    setColumnWidths(next);
  }, [fitRequests]);

  /*
   * WHAT ELSE THE FIT WAS COMPUTED FROM. The container's own width is
   * watched by the observer below; which columns are on is the other half,
   * and it was watched by nothing. Hiding one left the rest holding room
   * they no longer needed, and showing one back added a column's width to a
   * row already exactly as wide as its box, so the table scrolled sideways
   * until something else remounted it. Measured on the engine dashboard's
   * runs list: three columns back on, 360px of overflow that never went.
   */
  const fittedColumnKeys = columnOrder.filter((key) => visibleColumns[key] !== false).join(',');
  const fittedColumnKeysRef = useRef(fittedColumnKeys);
  useLayoutEffect(() => {
    if (fittedColumnKeysRef.current === fittedColumnKeys) return;
    fittedColumnKeysRef.current = fittedColumnKeys;
    requestFit();
  }, [fittedColumnKeys, requestFit]);

  /*
   * Responsive re-fit: when the scroll container's width changes
   * (window resize, sidebar collapse, parent layout shift), schedule
   * another fit pass so the columns redistribute against the new
   * available space. Without this the columns keep the widths that
   * were correct at mount and the table would either leave a gap on
   * the right or overflow horizontally on a narrower viewport.
   *
   * The check guards against the observer firing for size changes
   * the fit pass itself caused: only width deltas (not content
   * height changes from data loading) re-arm the fit.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0 && w !== lastWidth) {
        lastWidth = w;
        requestFit();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [requestFit]);

  // Save the operator's own choices, when there is somewhere to save them.
  useEffect(() => {
    const chosen = Object.keys(resizedColumns);
    if (chosen.length === 0) {
      /*
       * An entry that exists says a reader sized this table. A Reset that
       * left an empty one behind would say it forever, and the next mount
       * would have a record to reconcile that holds nothing.
       */
      removeStored(storageKey, 'resizedColumns');
      return;
    }
    writeStored(storageKey, 'resizedColumns', JSON.stringify(
      Object.fromEntries(chosen.map((key) => [key, columnWidths[key] ?? minColumnWidth])),
    ));
  }, [columnWidths, resizedColumns, storageKey, minColumnWidth]);

  /*
   * The entry this replaced held EVERY column's width, the fit pass's own
   * output among them, so nothing in it can be told from arithmetic. It is
   * removed rather than read: honouring it is what kept a table at the
   * widths some other window justified, and leaving it would keep a record
   * nothing reads in every reader's browser for good.
   */
  useEffect(() => {
    removeStored(storageKey, 'columnWidths');
  }, [storageKey]);

  useEffect(() => {
    // Only what the table owns: a controlled size belongs to its caller.
    if (itemsPerPageProp === undefined) {
      writeStored(storageKey, 'itemsPerPage', String(ownItemsPerPage));
    }
  }, [ownItemsPerPage, storageKey, itemsPerPageProp]);

  useEffect(() => {
    // Only what the table owns: a controlled visibility belongs to its caller.
    if (visibleColumnsProp === undefined) {
      writeStored(storageKey, 'visibleColumns', JSON.stringify(ownVisibleColumns));
    }
  }, [ownVisibleColumns, storageKey, visibleColumnsProp]);

  useEffect(() => {
    // As above: the order is the caller's whenever the caller holds it.
    if (columnOrderProp === undefined) {
      writeStored(storageKey, 'columnOrder', JSON.stringify(columnOrder));
    }
  }, [columnOrder, storageKey, columnOrderProp]);

  useEffect(() => {
    writeStored(storageKey, 'wrapLines', String(wrapLines));
  }, [wrapLines, storageKey]);

  // Column resizing handlers
  const handleMouseDownResize = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnKey] ?? minColumnWidth);
  };

  /**
   * One step of a keyboard resize.
   *
   * A column that can only be resized by dragging a two-pixel handle is a
   * column a keyboard reader cannot resize at all, and a pointer with any
   * tremor cannot resize reliably either. The step is the same one the
   * pointer's own floor is measured in.
   */
  const KEYBOARD_RESIZE_STEP = 16;
  /**
   * What the handle IS, in one place because there are two of them.
   *
   * A SEPARATOR THE READER CAN MOVE, rather than a button with a name. The
   * arrows already moved it, but nothing said it was movable, which way, or
   * where it had got to: `separator` with an orientation, a value and a floor
   * is the shape a screen reader already knows how to read out and step. There
   * is no `aria-valuemax` because a column has no upper bound, and a maximum
   * invented to fill the attribute would be a number a reader is told they
   * cannot pass.
   */
  const resizerState = (columnKey: string) => {
    const width = Math.round(columnWidths[columnKey] ?? minColumnWidth);
    return {
      role: 'separator',
      'aria-orientation': 'vertical' as const,
      'aria-label': labels.resize(columnName(columnKey)),
      'aria-valuenow': width,
      'aria-valuemin': minColumnWidth,
      'aria-valuetext': labels.resizeWidth(width),
    };
  };
  const nudgeColumnWidth = (e: React.KeyboardEvent, columnKey: string) => {
    const step = e.key === 'ArrowLeft' ? -KEYBOARD_RESIZE_STEP : e.key === 'ArrowRight' ? KEYBOARD_RESIZE_STEP : 0;
    if (step === 0) return;
    e.preventDefault();
    e.stopPropagation();
    setColumnWidths((was) => ({
      ...was,
      [columnKey]: Math.max(minColumnWidth, (was[columnKey] ?? minColumnWidth) + step),
    }));
    markResized(columnKey);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(minColumnWidth, startWidth + diff);
        setColumnWidths((prev: Record<string, number>) => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
        markResized(resizingColumn);
      }
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        setResizingColumn(null);
      }
    };

    if (resizingColumn) {
      document.body.classList.add('crewlet-data-table-resizing');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.body.classList.remove('crewlet-data-table-resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [resizingColumn, startX, startWidth, minColumnWidth, markResized]);

  /*
   * Sort state. When a `sort` prop is passed the parent controls it; we
   * route handleSort through onSortChange instead of the internal setter.
   * Sort state is normalised to the existing sortConfig shape internally so
   * the rest of the rendering code can stay key/direction-driven.
   */
  const controlledSort = sortProp !== undefined;
  const effectiveSort: { key: string | null; direction: DataTableSortDirection | null } = controlledSort
    ? sortProp
      ? { key: sortProp.key, direction: sortProp.direction }
      : { key: null, direction: null }
    : sortConfig;

  const handleSort = (columnKey: string) => {
    const column = columns[columnKey];
    if (column?.sortable === false) return;

    /*
     * WHICH WAY THE FIRST PRESS GOES is the column's own business: a name
     * reads A to Z first and a cost reads largest first, because the end the
     * reader came for is the end they should not have to press twice for.
     */
    const first = column?.firstDirection ?? 'asc';
    const other: DataTableSortDirection = first === 'asc' ? 'desc' : 'asc';
    let next: DataTableSortState | null;
    if (effectiveSort.key !== columnKey || effectiveSort.direction === null) {
      next = { key: columnKey, direction: first };
    } else if (effectiveSort.direction === first) {
      next = { key: columnKey, direction: other };
    } else {
      // The third press clears the sort, unless the caller has no unsorted
      // order worth handing back.
      next = sortCycle === 'asc-desc' ? { key: columnKey, direction: first } : null;
    }

    if (controlledSort) {
      onSortChange?.(next);
    } else {
      setSortConfig({ key: next?.key ?? null, direction: next?.direction ?? null });
    }
  };

  /**
   * The order a sort produced, held until the next press.
   *
   * Written during render on purpose: it is a cache keyed on the sort itself,
   * and the alternative (an effect) would paint one re-ranked frame before it
   * could hold anything still, which is the frame this exists to prevent.
   */
  const heldOrder = useRef<{ signature: string; rank: Map<string | number, number> } | null>(null);

  const getSortedData = (): TRow[] => {
    const sortKey = effectiveSort.key;
    const direction = effectiveSort.direction;
    if (!sortKey || !direction) {
      heldOrder.current = null;
      return [...data];
    }

    const column = columns[sortKey];
    const accessor = column?.sortValue ?? ((row: TRow) => cellValue(row, sortKey) as string | number);

    /*
     * Decorated with the original index, so the sort is stable: two rows that
     * compare equal keep the order the caller gave them rather than trading
     * places whenever a push re-renders the list.
     *
     * AN ABSENT VALUE SORTS LAST IN BOTH DIRECTIONS. A seat with no meter has
     * not spent nothing; it has not been measured, and flipping it to the top
     * on the second press would put "unknown" where "the most" belongs.
     */
    const sorted = data
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const a = accessor(left.row);
        const b = accessor(right.row);
        const aAbsent = isAbsent(a);
        const bAbsent = isAbsent(b);
        if (aAbsent || bAbsent) {
          if (aAbsent && bAbsent) return left.index - right.index;
          return aAbsent ? 1 : -1;
        }
        const difference = compareValues(a, b);
        if (difference !== 0) return direction === 'asc' ? difference : -difference;
        return left.index - right.index;
      })
      .map((decorated) => decorated.row);

    if (!stableOrder) {
      heldOrder.current = null;
      return sorted;
    }

    const signature = `${sortKey}:${direction}`;
    const held = heldOrder.current;
    if (!held || held.signature !== signature) {
      heldOrder.current = {
        signature,
        rank: new Map(sorted.map((row, index) => [resolveRowKey(row), index])),
      };
      return sorted;
    }
    // Rows the held order does not know are new since the press: they keep the
    // rank the fresh sort gave them, after everything the reader has seen.
    const { rank } = held;
    return sorted
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const a = rank.get(resolveRowKey(left.row));
        const b = rank.get(resolveRowKey(right.row));
        if (a === undefined && b === undefined) return left.index - right.index;
        if (a === undefined) return 1;
        if (b === undefined) return -1;
        return a - b;
      })
      .map((decorated) => decorated.row);
  };

  /*
   * Pagination. The page is 1-indexed, and is the caller's whenever the caller
   * passes the pair: it is where a reader is, which is the first thing a link
   * has to be able to carry.
   */
  const [ownPage, setOwnPage] = useState(1);
  const currentPage = pageProp ?? ownPage;
  const goToPage = (next: number) => {
    if (pageProp === undefined) setOwnPage(next);
    onPageChange?.(next);
  };
  const sortedDataMemo = getSortedData();
  /*
   * How many pages there are. The table counts its own rows when it slices
   * them, and `All` is one page however many rows that is; a caller that
   * slices its own says so with `pageCount`, and with neither there is one
   * page, which is what a table nobody pages IS.
   */
  const totalPages = paginationEnabled
    ? itemsPerPage === ALL_ITEMS
      ? 1
      : Math.max(1, Math.ceil(sortedDataMemo.length / Math.max(1, itemsPerPage)))
    : Math.max(1, pageCount ?? 1);

  /*
   * A page that no longer exists is not a page anybody can read, so the last
   * one stands in. This is a CLAMP and not a reset: it moves nobody who is on
   * a page that still has rows.
   *
   * AND IT IS ONLY ASKED WHERE THE BOUND IS KNOWN. A caller that fetches a
   * page at a time and has not said how many there are has a bound this table
   * cannot see, and clamping against the 1 that stands in for "not said"
   * would send every such reader to the first page on the first render.
   */
  const pageBoundKnown = paginationEnabled || pageCount !== undefined;
  useEffect(() => {
    if (!pageBoundKnown) return;
    if (currentPage > totalPages) goToPage(totalPages);
    else if (currentPage < 1) goToPage(1);
    // The handler is rebuilt on every render; what triggers a clamp is a page
    // or a bound that moved, and naming the closure here would run it on both.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, currentPage, pageBoundKnown]);

  /*
   * A FILTER OR A SORT SENDS THE READER BACK TO THE FIRST PAGE, and nothing
   * else does. The row COUNT used to do it, which on a live table is anything
   * that happens: page four of an activity feed threw a reader back to page
   * one every time an event they were not reading arrived.
   */
  /*
   * AND THE FIRST RUN IS NOT A CHANGE. An effect runs on mount, where nothing
   * has been filtered or sorted yet, and with a controlled page that mounting
   * call is `onPageChange(1)` written straight over the page a link arrived
   * carrying: page four of the event log opened, and turned itself to page one
   * before the reader saw it.
   */
  const pagedFrom = useRef<string | null>(null);
  useEffect(() => {
    const signature = `${effectiveSort.key}:${effectiveSort.direction}:${String(filterKey)}:${filtersActive}`;
    const was = pagedFrom.current;
    pagedFrom.current = signature;
    if (was === null || was === signature) return;
    if (currentPage !== 1) goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSort.key, effectiveSort.direction, filterKey, filtersActive]);

  const getDisplayedData = () => {
    if (!paginationEnabled || itemsPerPage === ALL_ITEMS) return sortedDataMemo;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDataMemo.slice(start, start + itemsPerPage);
  };

  /** A column's name, for a control that has to say which column it acts on. */
  const columnName = (columnKey: string): string => {
    const label = columns[columnKey]?.label;
    return typeof label === 'string' && label.trim() !== '' ? label : columnKey;
  };

  /**
   * WHY A TICK IS FIXED, or null where it is not.
   *
   * Two reasons: a column the caller declares `hideable: false` is what says
   * which row this is, and the last visible column is the table itself, which
   * a reader could untick and Apply, leaving a spacer and a footer. It was
   * asked in two places once, by the settings frame and by a Columns panel in
   * the toolbar, and two copies of the decision is how the panel came to
   * allow what the frame refused; the frame is the only place that asks now.
   */
  const whyFixed = (columnKey: string, shown: Record<string, boolean>): string | null => {
    if (columns[columnKey]?.hideable === false) return labels.columnAlwaysShown;
    const others = Object.keys(columns).filter((key) => key !== columnKey && shown[key] !== false);
    return others.length === 0 ? labels.columnLastShown : null;
  };

  /* What the frame says after something it did cannot be seen to have
     happened: a reset, or a column that moved. ONE region and one message at a
     time, because two live regions in one dialog interrupt each other. */
  const [settingsSaid, setSettingsSaid] = useState('');
  /* One sentence, pointed at by every handle in the list: the arrow keys do
     the same thing from any of them, and a copy per row is the same words
     read out again on each. */
  const instanceId = useId();
  const reorderHintId = `${instanceId}-reorder`;
  /**
   * WHAT NAMES A COLUMN HEADER: its label, and nothing else in the cell.
   *
   * A `th` with no `aria-labelledby` is named from its CONTENTS, which means
   * every control that has drifted into the cell is read out as part of the
   * column's name. With the resize handle in there as a real control, every
   * header announced itself as "Seat Resize Seat", on every row a reader
   * moved through. Pointing the cell at the label span is what holds the name
   * to the one thing that is the column's name, whatever else the cell grows.
   */
  const columnLabelId = (columnKey: string) =>
    // Whitespace out of the key: `aria-labelledby` is a SPACE-SEPARATED list
    // of ids, so a column keyed "created at" would point the cell at two ids
    // that do not exist and leave the header with no name at all.
    `${instanceId}-col-${columnKey.replace(/\s+/g, '_')}`;

  // Table settings handlers. They mutate draft state only.
  const handleToggleColumn = (columnKey: string) => {
    if (whyFixed(columnKey, draftVisibleColumns) !== null && draftVisibleColumns[columnKey] !== false) return;
    setDraftVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  /**
   * Moving a column by one place.
   *
   * BESIDE THE DRAG, NEVER INSTEAD OF IT. Reordering was drag-only, which is
   * a control a keyboard cannot reach at all and a tremor cannot hold; the
   * buttons and the handle's own arrow keys are the same operation with a
   * target somebody can hit.
   *
   * AND THE MOVE IS SAID. Nothing about a list reordering itself reaches a
   * reader who cannot see it: the control they pressed keeps its name, the
   * row keeps its words, and the only thing that changed is a position
   * nobody announced.
   */
  const moveColumn = (columnKey: string, by: -1 | 1) => {
    // Read from the draft rather than from an updater: an updater has to be
    // pure, and what a move has to do besides reordering is say so.
    const at = draftColumnOrder.indexOf(columnKey);
    const to = at + by;
    if (at < 0 || to < 0 || to >= draftColumnOrder.length) return;
    const next = [...draftColumnOrder];
    next.splice(at, 1);
    next.splice(to, 0, columnKey);
    setDraftColumnOrder(next);
    setSettingsSaid(labels.columnMoved(columnName(columnKey), to + 1, next.length));
  };

  const handleItemsPerPageChange = (value: DataTableItemsPerPage) => {
    setDraftItemsPerPage(value);
  };

  /*
   * Reset to Default resets the DRAFTS to the table's initial defaults
   * so the operator can preview the reset state inside the modal.
   * They then Apply to commit or Cancel to back out.
   */
  const handleResetTableSettings = () => {
    setDraftColumnWidths(generateDefaultColumnWidths());
    setDraftItemsPerPage(defaultItemsPerPage);
    setDraftVisibleColumns(generateDefaultVisibleColumns());
    setDraftColumnOrder(generateDefaultColumnOrder());
    setDraftWrapLines(effectiveDefaultWrapLines);
    /*
     * THE ORDER THE TABLE OPENS IN, not no order at all.
     *
     * This cleared the sort outright while `resetToDefault`, the same
     * component's other reset, put `defaultSort` back: one button, one name,
     * two meanings of "default". A table that opens ordered by spend, or by
     * when a turn started, is a table whose reader pressed Reset to Default
     * and got the order the rows happened to arrive in, which is the one
     * order nobody chose. A caller holding the sort saw it twice over,
     * because the reset is committed through `onSortChange` and a screen
     * keeping that in a URL then carried `sort=none` for the life of the
     * link.
     */
    setDraftSortConfig({ key: defaultSort?.key ?? null, direction: defaultSort?.direction ?? null });
    pendingFitOnApplyRef.current = true;
    setResetConfirmed(true);
    setSettingsSaid(labels.resetConfirmed);
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    resetConfirmTimer.current = setTimeout(() => setResetConfirmed(false), 1500);
  };

  /*
   * Opening the modal seeds every draft from the live state so the
   * modal opens reflecting the table's current configuration. Sort
   * is also captured so Reset can put `defaultSort` back via Apply and
   * Cancel preserves the operator's current sort.
   */
  const openTableSettings = () => {
    setDraftColumnWidths({ ...columnWidths });
    setDraftItemsPerPage(itemsPerPage);
    setDraftVisibleColumns({ ...visibleColumns });
    setDraftColumnOrder([...columnOrder]);
    setDraftWrapLines(wrapLines);
    setDraftSortConfig({ key: effectiveSort.key, direction: effectiveSort.direction });
    setResetConfirmed(false);
    setSettingsSaid('');
    pendingFitOnApplyRef.current = false;
    if (resetConfirmTimer.current) {
      clearTimeout(resetConfirmTimer.current);
      resetConfirmTimer.current = null;
    }
    setTableSettingsOpen(true);
  };

  /*
   * Apply commits every draft to the live state in a single batch
   * and closes the modal. Sort routes through the controlled or
   * uncontrolled path matching how the table is wired. When the
   * operator hit Reset to Default inside the modal, the
   * pendingFitOnApply flag re-arms the fit pass so the bare
   * label-aware defaults grow to fill the container instead of
   * landing as a row of collapsed columns next to a wide spacer.
   */
  const applyTableSettings = () => {
    setColumnWidths(draftColumnWidths);
    commitItemsPerPage(draftItemsPerPage);
    commitVisibleColumns(draftVisibleColumns);
    commitColumnOrder(draftColumnOrder);
    setWrapLines(draftWrapLines);
    if (controlledSort) {
      onSortChange?.(
        draftSortConfig.key && draftSortConfig.direction
          ? { key: draftSortConfig.key, direction: draftSortConfig.direction }
          : null,
      );
    } else {
      setSortConfig(draftSortConfig);
    }
    if (pendingFitOnApplyRef.current) {
      pendingFitOnApplyRef.current = false;
      /*
       * Reset to Default put the table's own label-aware widths in the
       * drafts, so every column goes back to the fit pass: a width this
       * reader had dragged to is one of the things being reset. The save
       * effect drops the stored entry once nothing is left in it.
       */
      setResizedColumns({});
      requestFit();
    }
    setTableSettingsOpen(false);
  };

  const cancelTableSettings = () => {
    pendingFitOnApplyRef.current = false;
    setTableSettingsOpen(false);
  };

  // Drag and drop for column reordering
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (columnKey && draggedColumn && draggedColumn !== columnKey) {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      dragTimeoutRef.current = setTimeout(() => {
        setDraftColumnOrder((prev) => {
          const newOrder = [...prev];
          const draggedIndex = newOrder.indexOf(draggedColumn);
          const targetIndex = newOrder.indexOf(columnKey);
          if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
            return prev;
          }
          newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedColumn);
          return newOrder;
        });
      }, 5);
    }
  };

  const handleDrop = (e: React.DragEvent, _targetColumnKey: string) => {
    e.preventDefault();
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    setDraggedColumn(null);
  };

  /*
   * There is no Escape listener here. The settings frame is a Modal, and a
   * Modal is on the layer stack, where Escape reaches the TOPMOST surface and
   * nothing beneath it. This component's own document listener closed the
   * settings frame from underneath whatever had been raised over it.
   */

  /*
   * Cell renderer. The compact variant honours per-column align / mono /
   * copyable / width; the default variant ignores these and applies the
   * resizable pixel width tracked in columnWidths. Copyable cells wrap
   * the rendered content in CopyableCell, the same hover-revealed copy
   * affordance the standalone CopyableCell export provides.
   */
  const renderCellContent = (row: TRow, columnKey: string): ReactNode => {
    const column = columns[columnKey];
    const value = cellValue(row, columnKey);

    if (column?.render) {
      return column.render(row, value);
    }

    /*
     * AN ABSENCE IS SAID, not drawn as punctuation and left at that. The cell
     * used to render a bare en dash, which a screen reader reads as "dash" or
     * skips outright, so the one cell in the row that carried a fact about
     * the data (nobody measured this) was the one cell that carried nothing.
     */
    return value !== null && value !== undefined
      ? (value as ReactNode)
      : <EmptyValue label={labels.absent} />;
  };

  /**
   * The classes a column's own shape puts on both its header and its cells.
   *
   * ONE FUNCTION FOR BOTH, because a header aligned left over a column of
   * right-aligned numbers is a header that points at the wrong edge, and two
   * copies of this rule is how that happens.
   */
  const columnClasses = (column: DataTableColumn<TRow>): string => cx(
    column.align === 'right' && 'crewlet-data-table__cell--right',
    column.align === 'center' && 'crewlet-data-table__cell--center',
    column.shrink && 'crewlet-data-table__cell--shrink',
  );

  const renderBodyCell = (
    row: TRow,
    columnKey: string,
    lead: { tone?: ReactNode; href?: string | null | undefined } = {},
  ) => {
    const column = columns[columnKey];
    if (!column) return null;

    const style: React.CSSProperties = {};
    if (isCompact) {
      /*
       * Width is sourced from the live columnWidths state so the cell
       * tracks any operator-driven resize from the header handle. The
       * state is seeded from column.width / column.defaultWidth.
       */
      if (columnWidths[columnKey] != null) {
        style.width = `${columnWidths[columnKey]}px`;
      }
    } else {
      style.width = `${columnWidths[columnKey]}px`;
    }

    const rendered = renderCellContent(row, columnKey);
    let content: ReactNode = rendered;

    /*
     * THE ROW'S LINK WRAPS THE LEADING CELL'S OWN CONTENT, rather than adding
     * a hidden copy of it: a screen reader reading both would say the row's
     * name twice, once as a link and once as text. The stylesheet stretches
     * the anchor's hit area over the row, so the whole row is clickable while
     * the row has exactly one tab stop. The leading column therefore renders
     * text, never a control of its own.
     */
    if (lead.href) {
      content = (
        <a className="crewlet-data-table__row-link" href={lead.href}>
          {content}
        </a>
      );
    }

    if (isCompact && column.copyable) {
      const raw = column.copyValue ? column.copyValue(row) : cellValue(row, columnKey);
      const copyText = raw !== undefined && raw !== null ? String(raw) : '';
      content = (
        <CopyableCell value={copyText} ariaLabel={labels.copyCell(columnName(columnKey))}>
          {rendered}
        </CopyableCell>
      );
    }

    const tdClassName = cx(
      columnClasses(column),
      column.mono && 'crewlet-data-table__cell--mono',
      isCompact && column.sticky === 'right' && 'crewlet-data-table__td--sticky-right',
    );
    return (
      <td key={columnKey} style={style} className={tdClassName || undefined}>
        {lead.tone}
        {content}
      </td>
    );
  };

  /**
   * A header cell.
   *
   * THE SORT CONTROL IS A BUTTON AND `aria-sort` IS ON THE CELL, in BOTH
   * variants. The default variant used to sort from a click handler on the
   * `th` itself, which is not focusable, is announced as a cell rather than a
   * control, and told a screen reader nothing about which way the column was
   * sorted; the compact variant had the button but not the state. A screen
   * reader looks for `aria-sort` on the column header and for a control
   * inside it, and now finds both wherever it looks.
   */
  const renderHeaderCell = (columnKey: string) => {
    if (!isColumnVisible(columnKey)) return null;
    const column = columns[columnKey];
    if (!column) return null;
    const isSortable = column.sortable !== false;
    const isActive = effectiveSort.key === columnKey && effectiveSort.direction !== null;
    /*
      * The glyph, not its name. `unfold_more` is the both-ways mark a sortable
      * column that is not the current sort carries, so the affordance is
      * visible before anybody presses it.
      */
    const arrow = !isSortable ? null : isActive ? (
      effectiveSort.direction === 'asc' ? <ArrowUpwardGlyph size="sm" /> : <ArrowDownwardGlyph size="sm" />
    ) : (
      <UnfoldMoreGlyph size="sm" />
    );
    const ariaSort = isActive
      ? effectiveSort.direction === 'asc'
        ? 'ascending'
        : 'descending'
      : undefined;
    const isSticky = column.sticky === 'right';

    if (isCompact) {
      const style: React.CSSProperties = {};
      if (columnWidths[columnKey] != null) {
        style.width = `${columnWidths[columnKey]}px`;
      }

      /*
       * Resizer: right-edge drag handle present on every data column
       * in the compact variant. mousedown stops propagation so the
       * surrounding sort button does not also fire. The cursor and
       * hover styling are owned by the .crewlet-data-table__resizer
       * CSS rule.
       */
      /*
       * When the table carries any sticky-right action affordance
       * (a Details link, Manage chip, kebab, etc.), every column drops
       * its resize handle. The whole row is treated as a frozen
       * surface: the proportional fit at mount picks widths that fit
       * the container, the sticky cell anchors the right edge, and
       * the operator interacts with the row through clicks rather
       * than drags. Letting any internal boundary still resize would
       * let a careless drag overflow the table and slide content
       * under the pinned cell, undermining the boundary the action
       * column is meant to enforce.
       *
       * The `resizable` prop also suppresses every handle when the
       * caller wants a strictly read-only layout (single-purpose
       * lists, directory tables, etc.) so the row never invites the
       * operator to reflow it.
       */
      const visibleStickyExists = columnOrder.some(
        (k) => columns[k]?.sticky === 'right' && isColumnVisible(k),
      );
      const suppressResizer = !resizable || isSticky || visibleStickyExists;
      const resizer = suppressResizer ? null : (
        <button
          type="button"
          className="crewlet-data-table__resizer"
          {...resizerState(columnKey)}
          onMouseDown={(e) => { e.stopPropagation(); handleMouseDownResize(e, columnKey); }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => nudgeColumnWidth(e, columnKey)}
        />
      );

      const thClass = cx(
        columnClasses(column),
        isSortable && 'crewlet-data-table__th--sortable',
        isSortable && isActive && 'is-active',
        isSticky && 'crewlet-data-table__th--sticky-right',
      );

      return (
        <th
          key={columnKey}
          scope="col"
          style={style}
          aria-sort={ariaSort}
          aria-labelledby={columnLabelId(columnKey)}
          className={thClass || undefined}
        >
          {isSortable ? (
            <button
              type="button"
              className="crewlet-data-table__sort-button"
              onClick={() => handleSort(columnKey)}
            >
              <span id={columnLabelId(columnKey)}>{column.label}</span>
              {arrow}
            </button>
          ) : (
            <span id={columnLabelId(columnKey)}>{column.label}</span>
          )}
          {resizer}
        </th>
      );
    }

    return (
      <th
        key={columnKey}
        scope="col"
        style={{ width: `${columnWidths[columnKey]}px` }}
        aria-sort={ariaSort}
        aria-labelledby={columnLabelId(columnKey)}
        className={cx(columnClasses(column), isSortable && 'crewlet-data-table__th--sortable') || undefined}
      >
        {isSortable ? (
          <button
            type="button"
            className="crewlet-data-table__sort-button crewlet-data-table__header-content"
            onClick={() => handleSort(columnKey)}
          >
            <span id={columnLabelId(columnKey)}>{column.label}</span>
            <span className={cx('crewlet-data-table__sort-icon', isActive && 'is-active')}>{arrow}</span>
          </button>
        ) : (
          <div className="crewlet-data-table__header-content">
            <span id={columnLabelId(columnKey)}>{column.label}</span>
          </div>
        )}
        {/*
          * A BUTTON, and an operable one. It used to be a bare div with a
          * mousedown handler, so a column was resizable by pointer and by
          * nothing else: a keyboard reader could neither find the handle nor
          * move it, and a pointer with any tremor could not hold a two-pixel
          * target. The arrows now move it by a step.
          *
          * AND `resizable={false}` REMOVES IT HERE TOO. The prop has always
          * said no handle renders anywhere on the table; the compact variant
          * obeyed it and this one drew the handle regardless, so a table a
          * caller had declared read-only still offered every column to a
          * pointer and put a control in every header's tab order.
          */}
        {resizable && (
          <button
            type="button"
            className="crewlet-data-table__column-resizer"
            {...resizerState(columnKey)}
            onMouseDown={(e) => handleMouseDownResize(e, columnKey)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => nudgeColumnWidth(e, columnKey)}
          />
        )}
      </th>
    );
  };

  /*
   * Action column renderer. Precedence:
   *   rowActions(row) wins  → kebab popover via RowActionsMenu
   *   onRowAction(row)      → single icon button (legacy shape)
   *   neither               → no actions cell
   * The action column header is suppressed in compact mode and when
   * settingsEnabled is false to keep the right edge clean.
   */
  const renderActionsHeader = () => {
    if (!hasChromeColumn) return null;
    if (!settingsInHeader) {
      /*
       * THE COLUMN STILL HAS A NAME, even where it draws none. A header cell
       * with nothing in it leaves the cells under it unassociated, so a
       * screen reader moving across a row reaches the kebab and is told only
       * that it is in the last column of something.
       */
      return (
        <th
          key="__actions"
          scope="col"
          className="crewlet-data-table__th--chrome crewlet-data-table__th--actions"
          style={{ width: 1 }}
        >
          <VisuallyHidden>{labels.actions}</VisuallyHidden>
        </th>
      );
    }
    return (
      /*
       * NO POSITION HERE. The two buttons above hang off this cell, so it has
       * to be their containing block, and it used to say so inline. The header
       * cells are `sticky` now, which is a positioned value and is already
       * that containing block; the inline `relative` merely OUTRANKED it, so
       * on a bounded table every column name stayed put while this one column
       * scrolled its heading away.
       */
      <th key="__actions" scope="col" style={{ width: `${columnWidths.__actions}px` }}>
        {labels.actions}
        <button
          type="button"
          className="crewlet-data-table__header-btn crewlet-data-table__header-btn--reset"
          onClick={(e) => { e.stopPropagation(); resetToDefault(); }}
          aria-label={labels.resetColumns}
          title={labels.resetColumns}
        >
          <SettingsBackupRestoreGlyph size="md" />
        </button>
        <button
          type="button"
          ref={settingsButtonRef}
          className="crewlet-data-table__header-btn crewlet-data-table__header-btn--settings"
          onClick={(e) => { e.stopPropagation(); openTableSettings(); }}
          aria-label={labels.settings}
          title={labels.settings}
        >
          <SettingsGlyph size="md" />
        </button>
      </th>
    );
  };

  const renderActionsCell = (row: TRow) => {
    if (!hasChromeColumn) return null;
    // The column the settings cog sits in has no cell of its own, and the row
    // still has to reach the right edge: an empty cell is what keeps the rows
    // under the header they belong to.
    if (!hasActionColumn) {
      return <td key="__actions" className="crewlet-data-table__td--actions" />;
    }
    if (rowActions) {
      const actions = rowActions(row);
      return (
        <td
          key="__actions"
          className="crewlet-data-table__td--actions"
          style={{ textAlign: 'right', width: 1 }}
        >
          <RowActionsMenu actions={actions} label={labels.rowActions} />
        </td>
      );
    }
    return (
      <td
        key="__actions"
        className="crewlet-data-table__td--actions"
        style={{ width: `${columnWidths.__actions}px`, textAlign: 'center' }}
      >
        <IconButton
          size="sm"
          className="crewlet-data-table__action-btn"
          onClick={() => onRowAction!(row)}
          label={actionLabel}
          title={actionLabel}
          icon={actionIcon}
        />
      </td>
    );
  };

  const displayedData = getDisplayedData();
  /*
   * WHETHER A COLUMN'S WIDTH MEANS ANYTHING RIGHT NOW.
   *
   * A width is a claim about content: this column needs this much room for
   * what is in it. A table drawing one full-width message instead of rows,
   * because it has nothing to show or an error to show in place of it, has
   * no such content, and under the fixed layout that claim is an
   * INSTRUCTION: the row comes out wider than the box it sits in and a
   * reader scrolls sideways past columns holding nothing. The widths are
   * still stated, so the header keeps the shape the rows will land in, but
   * the table lays itself out by content until they do, which is the layout
   * that reads a width as a preference it may shrink.
   *
   * The loading skeleton is NOT that case: its bars stand in for the rows
   * about to replace them, and they line up with those rows because both are
   * drawn at the same widths.
   */
  const bodyHoldsRows = (loading && displayedData.length === 0)
    || (!error && displayedData.length > 0);
  const visibleColumnKeys = columnOrder.filter(isColumnVisible);
  /* The column a row's own marks hang off: its first visible, unpinned one. */
  const firstVisibleKey = columnOrder.find(
    (key) => columns[key]?.sticky !== 'right' && isColumnVisible(key),
  );
  /*
   * +1 for the trailing spacer column the compact variant always
   * renders. The spacer absorbs whatever width is left over after
   * the user-defined columns, so the table never shrinks below its
   * container width even when every data column is dragged to its
   * minimum. Resize math stays 1:1 because the spacer (not the
   * user's columns) gives up width during proportional fill.
   */
  const spacerCols = isCompact ? 1 : 0;
  const colSpan = visibleColumnKeys.length + (hasChromeColumn ? 1 : 0) + spacerCols;

  const wrapLinesClass = wrapLines ? ' crewlet-data-table--wrap-lines' : '';
  /* The band and the pin ride on the bounded body, for the reason the prop's
     own documentation gives: without one there is nothing to pin against. */
  const boundedBody = maxBodyHeight !== undefined;
  const stickyHeadClass = boundedBody ? ' crewlet-data-table--sticky-head' : '';
  const rootClass = isCompact
    ? `crewlet-data-table crewlet-data-table--compact crewlet-data-table--density-${density}${wrapLinesClass}${stickyHeadClass} ${className}`.trim()
    : `crewlet-data-table crewlet-data-table--default${wrapLinesClass}${stickyHeadClass} ${className}`.trim();

  /*
   * Expansion column gating. When renderExpandedRow is supplied, a
   * chevron column is auto-appended on the right (after the action
   * column, if any) so each row exposes an expand affordance even
   * when the whole row is also clickable.
   */
  const expandColSpan = colSpan + (expandable ? 1 : 0);

  /*
   * Expand-all state: derived from whether every visible row's key is
   * in expandedKeys. The header chevron toggles between expand-all
   * (when at least one row is collapsed) and collapse-all (when every
   * row is open). The chevron rotates 90deg in the open state, so the
   * closed `>` becomes `v` without swapping icons.
   */
  const visibleRowKeys = displayedData.map((row) => resolveRowKey(row));
  const allExpanded =
    expandable && visibleRowKeys.length > 0 && visibleRowKeys.every((k) => expandedKeys.has(k));
  const toggleExpandAll = () => {
    setExpandedKeys(() => (
      allExpanded ? new Set() : new Set(visibleRowKeys)
    ));
  };

  const renderExpandHeader = () => {
    if (!expandable) return null;
    /*
     * The expand-chevron column intentionally omits the --chrome
     * modifier: it sits at the leftmost edge and reads as a real
     * column delimited from the first data column by the standard
     * vertical separator. The trailing actions column (rendered by
     * renderActionsHeader) keeps --chrome so the last data column
     * stays flush against the row's right edge.
     */
    return (
      <th
        key="__expand"
        className="crewlet-data-table__expand-header"
        style={{ width: 32 }}
      >
        <button
          type="button"
          className="crewlet-data-table__expand-all-btn"
          onClick={toggleExpandAll}
          aria-label={allExpanded ? labels.collapseAll : labels.expandAll}
          aria-expanded={allExpanded}
          title={allExpanded ? labels.collapseAll : labels.expandAll}
        >
          <ChevronRightGlyph
            className={`crewlet-data-table__chevron${allExpanded ? ' is-open' : ''}`}
            size="md"
          />
        </button>
      </th>
    );
  };

  /**
   * The cell that opens a row.
   *
   * A BUTTON, CARRYING `aria-expanded` ITSELF. The state used to sit on the
   * `tr` with the chevron drawn as an `aria-hidden` glyph beside it, so the
   * control a reader was told about was a table row rather than a control,
   * and the thing that looked like a button was hidden from them entirely.
   *
   * Rows whose renderExpandedRow returned null are not expandable: the cell
   * stays (column alignment) and the button goes, so the row does not
   * advertise an affordance that does nothing.
   */
  const renderExpandCell = (rowIsOpen: boolean, canExpand: boolean, onToggle: () => void) => {
    if (!expandable) return null;
    return (
      <td key="__expand" className="crewlet-data-table__expand-cell" style={{ width: 32 }}>
        {canExpand && (
          <button
            type="button"
            className="crewlet-data-table__expand-btn"
            aria-expanded={rowIsOpen}
            aria-label={rowIsOpen ? labels.collapseRow : labels.expandRow}
            onClick={(event) => { event.stopPropagation(); onToggle(); }}
          >
            <ChevronRightGlyph className={cx('crewlet-data-table__chevron', rowIsOpen && 'is-open')} size="md" />
          </button>
        )}
      </td>
    );
  };

  /*
   * Top-right controls (compact variant only). Mirrors the AWS data
   * table chrome: prev / page / next chevrons + a gear icon that
   * opens the settings modal. Renders only when the caller opted in
   * to paginated or showSettings; the default variant routes its
   * settings cog through the Actions column header instead.
   */
  /*
   * WHO IS OFFERED A PAGER. The table that slices its own rows, and the caller
   * that slices them itself and says how many pages that came to
   * (`onPageChange` with `pageCount`). Nobody else: a table whose rows are all
   * on screen used to carry a Previous and a Next that were disabled for the
   * life of the screen, and a control that can never do anything is a control
   * to remove rather than to grey out.
   */
  const callerPages = onPageChange !== undefined && pageCount !== undefined;
  const pagerVisible = paginationEnabled || callerPages;
  /* And the same question for the size: the table reads it, or the caller
     asked to be told it. Either way the row of chips means something. */
  const pageSizeOffered = paginationEnabled || onItemsPerPageChange !== undefined;
  /*
   * Which rows the page on screen is, counting from one and inclusive at both
   * ends, which is how a person reads a range. An empty table is the one case
   * with no range at all, and it answers 0 to 0 of 0 rather than 1 to 0: a
   * range that starts after it ends is a sentence a reader has to unpick.
   */
  const pageRange = (() => {
    const total = sortedDataMemo.length;
    if (total === 0) return { from: 0, to: 0, total: 0 };
    const sliced = paginationEnabled && itemsPerPage !== ALL_ITEMS;
    const from = sliced ? (currentPage - 1) * itemsPerPage + 1 : 1;
    return { from, to: Math.min(total, from + displayedData.length - 1), total };
  })();

  /*
   * Everything that decides whether the row is drawn and what is in it. The
   * message is a NODE, so a caller writing it inline hands over a new one on
   * every render and this runs on every render, which is what is wanted: the
   * words inside it can change with no prop of this table's changing at all.
   * Setting the state to the string it already holds is a bail-out in React
   * rather than a render, so running often costs nothing and cannot loop.
   */
  useEffect(() => {
    setEmptySaid(emptyCellRef.current?.textContent ?? '');
  }, [emptyMessage, loading, error, displayedData.length]);

  /*
   * WHO DRAWS THE PAGER, and it is not the variant that decides. The row used
   * to be the compact variant's alone, so a default-variant table sliced its
   * rows into pages of ten and offered nothing to turn them with: fifteen
   * rows of twenty-five were reachable only by opening the settings frame and
   * choosing All, and a reader with no reason to open it never saw them. What
   * the variant decides is where the COG goes, which is the chrome column's
   * header on a default table and this row on a compact one.
   */
  const cogInChromeRow = settingsEnabled && isCompact;
  const topControlsVisible = pagerVisible || cogInChromeRow;

  const headerVisible = title != null || description != null || icon != null;

  /*
   * A CARD'S HEADER TAKES THEM, where the table fills a card and draws no
   * header of its own. A panel whose header says what the rows are and how
   * many there are, with a bar under it holding a pager and a cog and nothing
   * else, is two rows of chrome over one table: the controls belong on the row
   * that already names what they page through.
   *
   * Asked for only when there is something to put there, so a table with
   * neither a pager nor a cog leaves the card's header free for one that has
   * them. Not asked for at all when this table has a header of its own: that
   * header is the more specific of the two, and a caller who titled the table
   * has said where its own name goes.
   */
  const cardHeader = useCardHeaderSlot(topControlsVisible && !headerVisible);

  /*
   * When a header is present, the right-side controls (pagination +
   * settings cog) ride along on the header row so the section title
   * and the controls share one line, AWS-style. When no header is
   * present, they stay on the toolbar row (which also hosts the
   * caller-supplied renderToolbar filters) unless a card's header has
   * taken them.
   */
  const renderTopControls = topControlsVisible ? (
    <div className="crewlet-data-table__chrome">
      {pagerVisible && (
        /*
         * A NAMED GROUP, because `aria-label` on a plain div names nothing: a
         * generic element has no role for a name to attach to, so the label
         * this cluster has always carried was read by nobody.
         *
         * A GROUP AND NOT A LANDMARK. `<nav aria-label="Pagination">` is the
         * shape a page-level pager takes, and it comes with a rule this
         * component cannot keep: where there is more than one of them on a
         * page, each needs a name of its own. A table does not know how many
         * tables it is on screen with, and the engine draws three on a single
         * route, so a landmark here fills a reader's landmark list with
         * identical entries for chrome that belongs inside a table rather than
         * to the document. A group carries the name and adds nothing to that
         * list.
         */
        <div role="group" className="crewlet-data-table__pagination" aria-label={labels.pagination}>
          {/*
            * FIRST AND LAST, beside the step buttons. A reader on page nine of
            * an event log had one way back to the top: eight presses of
            * Previous. The page number says "of 7" in the same cluster, which
            * names a destination a reader then expects to be able to reach.
            */}
          <IconButton
            size="sm"
            className="crewlet-data-table__page-btn"
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            label={labels.firstPage}
            icon={<KeyboardDoubleArrowLeftGlyph size="md" />}
          />
          <IconButton
            size="sm"
            className="crewlet-data-table__page-btn"
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            label={labels.previousPage}
            icon={<ChevronLeftGlyph size="md" />}
          />
          {/*
            * The page number is read on a change and never on a push: it is
            * `aria-live` because turning a page moves nothing a reader can
            * see the top of, and it says WHICH of how many, because a bare
            * "3" announced on its own is a number without a subject.
            */}
          <span className="crewlet-data-table__page-number" aria-live="polite">
            <span aria-hidden>{currentPage}</span>
            {/*
              * WHICH PAGE, AND THEN WHICH ROWS. The page number alone says
              * where the reader is in the chrome and nothing about what they
              * are paging through; the range says how far into the rows they
              * are and how many there are to go, which is the question a
              * reader turning a page is actually asking.
              */}
            <VisuallyHidden>
              {`${labels.page(currentPage, totalPages)}. ${labels.pageRange(
                pageRange.from,
                pageRange.to,
                pageRange.total,
              )}`}
            </VisuallyHidden>
          </span>
          <IconButton
            size="sm"
            className="crewlet-data-table__page-btn"
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            label={labels.nextPage}
            icon={<ChevronRightGlyph size="md" />}
          />
          <IconButton
            size="sm"
            className="crewlet-data-table__page-btn"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            label={labels.lastPage}
            icon={<KeyboardDoubleArrowRightGlyph size="md" />}
          />
        </div>
      )}
      {cogInChromeRow && (
        <IconButton
          size="sm"
          ref={settingsButtonRef}
          className="crewlet-data-table__settings-btn"
          onClick={openTableSettings}
          label={labels.settings}
          title={labels.settings}
          icon={<SettingsGlyph size="md" />}
        />
      )}
    </div>
  ) : null;

  /** The controls are this table's own row, rather than a card header's. */
  const chromeInOwnBar = topControlsVisible && !headerVisible && !cardHeader.hosted;

  const toolbarVisible = renderToolbar != null || chromeInOwnBar;

  return (
    <div className={rootClass}>
      {/*
        * INTO THE CARD'S HEADER. A portal rather than a node handed upward:
        * the controls re-render with this table's own page and its own
        * settings state, and a node lifted into the card's state would have to
        * be pushed there again on every one of those renders. What a portal
        * moves is only where the DOM lands, so the tab order is the header's
        * own and the frame the cog opens still belongs to this table.
        */}
      {cardHeader.hosted && cardHeader.node !== null
        ? createPortal(renderTopControls, cardHeader.node)
        : null}
      {headerVisible && (
        <header className="crewlet-data-table__header">
          {icon != null && (
            <span className="crewlet-data-table__header-icon">{icon}</span>
          )}
          <div className="crewlet-data-table__header-text">
            {title != null && <h3 className="crewlet-data-table__title">{title}</h3>}
            {description != null && (
              <p className="crewlet-data-table__description">{description}</p>
            )}
          </div>
          {renderTopControls}
        </header>
      )}
      {toolbarVisible && (
        <div className="crewlet-data-table__toolbar">
          {renderToolbar != null && (
            <div className="crewlet-data-table__toolbar-start">{renderToolbar}</div>
          )}
          {/*
            * The clear-filters link renders as a direct toolbar child
            * (not inside the caller's filter slot) so its position is
            * identical on every table: pinned to the right of the
            * toolbar row, just before the pagination cluster,
            * independent of how the caller lays out its filters.
            */}
          {onClearFilters != null && filtersActive && (
            <button
              type="button"
              className="crewlet-data-table__clear-filters"
              onClick={onClearFilters}
            >
              {clearFiltersLabel}
            </button>
          )}
          {chromeInOwnBar && renderTopControls}
        </div>
      )}
      {renderFilterBar != null && (
        <div className="crewlet-data-table__filter-bar">{renderFilterBar}</div>
      )}
      <div
        className={[
          'crewlet-data-table__rail',
          /*
           * When the table carries a sticky-right action column the
           * row is treated as a frozen, screen-fitting surface: the
           * fit pass redistributes regular columns to consume only
           * the room left after the sticky pane and the gutter, the
           * resize handles are suppressed, and the scroll container
           * locks horizontal overflow. The modifier class flips that
           * behaviour on so the CSS can also drop the scrollbar mask
           * that would otherwise float over rows when no scrollbar
           * is present.
           */
          isCompact && columnOrder.some(
            (k) => columns[k]?.sticky === 'right' && isColumnVisible(k),
          )
            ? 'crewlet-data-table__rail--frozen'
            : undefined,
        ].filter(Boolean).join(' ')}
        style={isCompact ? ({
          '--crewlet-data-table-sticky-pane-width': `${columnOrder
            .filter((key) => columns[key]?.sticky === 'right' && isColumnVisible(key))
            .reduce((sum, key) => sum + (columnWidths[key] ?? minColumnWidth), 0)}px`,
        } as React.CSSProperties) : undefined}
      >
      {/*
        * WHAT THE TABLE IS SAYING RIGHT NOW, in ONE region that is mounted
        * with the table and empty until it has something to say.
        *
        * That is the whole of why it is here rather than around the sentence
        * it reports: a screen reader registers a live region when the region
        * enters the accessibility tree and announces what changes AFTERWARDS,
        * so a region that arrives together with its first content announces
        * nothing at all. The empty row is exactly that case, and it is the
        * case that matters: a filter that empties a list changes nothing a
        * reader who cannot see it would otherwise hear.
        *
        * `aria-busy` on the table says the same thing to a reader whose
        * software listens for it; the sentence is what carries the rest,
        * since support for the attribute is uneven and a live region is not.
        *
        * It sits outside the TABLE, because a row of its own inside one is a
        * row the table then has, and outside the SCROLLER, which has no
        * business holding anything but the table it scrolls.
        *
        * What it says when the rows are empty is the empty row's OWN text,
        * read off the rendered cell: see `emptySaid`.
        */}
      <span role="status">
        <VisuallyHidden>{loading ? labels.loading : emptySaid}</VisuallyHidden>
      </span>
      <div
        className="crewlet-data-table__scroll"
        ref={scrollRef}
        style={boundedBody ? { maxHeight: maxBodyHeight } : undefined}
      >
      <table
        className={cx(
          'crewlet-data-table__table',
          !bodyHoldsRows && 'crewlet-data-table__table--rowless',
        )}
        aria-busy={loading || undefined}
      >
        <thead>
          <tr>
            {renderExpandHeader()}
            {/*
              Sticky-right columns render AFTER the trailing spacer so
              they sit as the rightmost cells in the row. Sticky relies
              on the cell being at the natural right edge during no-
              scroll layout, with right:0 only taking effect under
              horizontal overflow. Rendering sticky cells before the
              spacer would leave them at a leftward natural position
              and a drag on the column before them would visibly push
              the sticky affordance until the spacer collapsed.
            */}
            {columnOrder
              .filter((key) => columns[key]?.sticky !== 'right')
              .map((columnKey: string) => renderHeaderCell(columnKey))}
            {isCompact && (
              <th
                key="__spacer"
                className="crewlet-data-table__th--chrome crewlet-data-table__th--spacer"
                aria-hidden
              />
            )}
            {columnOrder
              .filter((key) => columns[key]?.sticky === 'right')
              .map((columnKey: string) => renderHeaderCell(columnKey))}
            {renderActionsHeader()}
          </tr>
        </thead>
        <tbody>
          {loading && displayedData.length === 0 ? (
            /*
             * Skeleton rows live inside the real <tbody> and reuse the
             * live column set + widths, so the shimmer lines up exactly
             * with the data that replaces it. Bar widths cycle a fixed
             * pattern (not Math.random) so re-renders never reshuffle
             * the shimmer.
             */
            Array.from({ length: Math.max(1, skeletonRows) }, (_, rowIdx) => {
              const widths = [72, 46, 84, 58, 64];
              const visibleKeys = columnOrder.filter(
                (key) => columns[key]?.sticky !== 'right' && isColumnVisible(key),
              );
              return (
                <tr key={`__skeleton_${rowIdx}`} className="crewlet-data-table__skeleton-row" aria-hidden>
                  {expandable && (
                    <td key="__expand" className="crewlet-data-table__expand-cell" style={{ width: 32 }} />
                  )}
                  {visibleKeys.map((columnKey, colIdx) => (
                    <td
                      key={columnKey}
                      style={columnWidths[columnKey] != null ? { width: `${columnWidths[columnKey]}px` } : undefined}
                    >
                      <span
                        className="crewlet-data-table__skeleton-bar"
                        style={{
                          width: `${widths[(rowIdx + colIdx) % widths.length]}%`,
                          animationDelay: `${rowIdx * 0.1}s`,
                        }}
                      />
                    </td>
                  ))}
                  {isCompact && (
                    <td key="__spacer" className="crewlet-data-table__td--spacer" aria-hidden />
                  )}
                  {columnOrder
                    .filter((key) => columns[key]?.sticky === 'right' && isColumnVisible(key))
                    .map((columnKey) => (
                      <td key={columnKey} className="crewlet-data-table__td--sticky-right" />
                    ))}
                  {hasChromeColumn && <td key="__actions" className="crewlet-data-table__td--actions" />}
                </tr>
              );
            })
          ) : error ? (
            <tr>
              <td
                colSpan={expandColSpan}
                className="crewlet-data-table__empty"
              >
                {error}
              </td>
            </tr>
          ) : displayedData.length === 0 ? (
            <tr>
              <td
                ref={emptyCellRef}
                colSpan={expandColSpan}
                className="crewlet-data-table__empty"
              >
                {/*
                  * THE SENTENCE, AND NOTHING ROUND IT. It is said out loud by
                  * the live region beside the table, which is mounted with the
                  * table and therefore already watching when this row appears.
                  * A region that arrives WITH its first content announces
                  * nothing: a screen reader registers a live region when it
                  * enters the accessibility tree and reports what changes
                  * afterwards, so the one that used to wrap this cell was read
                  * on every later change and never on the one that mattered.
                  */}
                {emptyMessage}
              </td>
            </tr>
          ) : (
            displayedData.map((row) => {
              const trKey = resolveRowKey(row);
              const isArchived = archivedPredicate ? archivedPredicate(row) : false;
              const expanded = expandable ? expandedKeys.has(trKey) : false;
              const expandedContent = expandable ? renderExpandedRow!(row) : null;
              const canExpand = expandable && expandedContent != null;
              const href = getRowHref ? getRowHref(row) : null;
              const tone = rowTone ? rowTone(row) : null;
              const selected = isSelected ? isSelected(row) : undefined;
              const isClickable = !!onRowClick || canExpand || !!href;
              const trClass = cx(
                isArchived && 'crewlet-data-table__row--archived',
                isClickable && 'crewlet-data-table__row--clickable',
                canExpand && 'crewlet-data-table__row--expandable',
                expanded && 'is-expanded',
                selected && 'crewlet-data-table__row--selected',
                tone && `crewlet-data-table__row--tone-${tone}`,
              );
              const accessory = renderAccessoryRow ? renderAccessoryRow(row) : null;
              const onRowSurfaceClick = canExpand
                ? () => toggleExpanded(trKey)
                : onRowClick
                  ? () => onRowClick(row)
                  : undefined;
              /*
               * A PRESS THAT BEGAN ON A CONTROL BELONGS TO THAT CONTROL. A
               * chip inside a row used to navigate twice: once as itself and
               * once as the row under it, so a link to a seat also opened the
               * row's own destination, and the reader arrived wherever the
               * second one landed.
               */
              const onSurface = onRowSurfaceClick
                ? (event: React.MouseEvent<HTMLTableRowElement>) => {
                  const from = event.target as Element | null;
                  if (from?.closest?.('a,button,input,select,textarea,label,[role="button"],[role="link"],[role="menuitem"]')) {
                    return;
                  }
                  onRowSurfaceClick();
                }
                : undefined;
              /*
               * The leading cell carries what belongs to the ROW rather than
               * to a column: the word for a tone a reader cannot see, and the
               * link a navigating row is.
               */
              const rowLead = {
                tone: tone ? <VisuallyHidden>{labels.tone[tone]}</VisuallyHidden> : null,
                href,
              };
              return (
                <React.Fragment key={trKey ?? JSON.stringify(row)}>
                  <tr
                    className={trClass || undefined}
                    title={isArchived ? labels.archivedRow(archivedLabel) : undefined}
                    onClick={onSurface}
                    /*
                     * A clickable row is FOCUSABLE and takes Enter and Space.
                     * A row that navigates carries a real anchor instead, so
                     * it has its own tab stop and needs no second one, and an
                     * expandable row's tab stop is the chevron button.
                     */
                    tabIndex={onRowClick && !href && !canExpand ? 0 : undefined}
                    aria-selected={selected}
                    onKeyDown={onRowClick && !href && !canExpand ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    } : undefined}
                  >
                    {renderExpandCell(expanded, canExpand, () => toggleExpanded(trKey))}
                    {columnOrder
                      .filter((columnKey) => columns[columnKey]?.sticky !== 'right')
                      .map((columnKey) => {
                        if (!isColumnVisible(columnKey)) return null;
                        return renderBodyCell(row, columnKey, columnKey === firstVisibleKey ? rowLead : {});
                      })}
                    {isCompact && (
                      <td key="__spacer" className="crewlet-data-table__td--spacer" aria-hidden />
                    )}
                    {columnOrder
                      .filter((columnKey) => columns[columnKey]?.sticky === 'right')
                      .map((columnKey) => {
                        if (!isColumnVisible(columnKey)) return null;
                        return renderBodyCell(row, columnKey);
                      })}
                    {renderActionsCell(row)}
                  </tr>
                  {expanded && expandedContent != null && (
                    <tr
                      className={[
                        'crewlet-data-table__expanded-row',
                        isArchived ? 'crewlet-data-table__row--archived' : undefined,
                      ].filter(Boolean).join(' ')}
                    >
                      <td colSpan={expandColSpan} className="crewlet-data-table__expanded-cell">
                        {expandedContent}
                      </td>
                    </tr>
                  )}
                  {accessory != null && (
                    <tr
                      className={[
                        'crewlet-data-table__accessory-row',
                        isArchived ? 'crewlet-data-table__row--archived' : undefined,
                      ].filter(Boolean).join(' ')}
                    >
                      <td colSpan={colSpan} className="crewlet-data-table__accessory-cell">
                        {accessory}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
      </div>
      </div>

      {hasMore && onLoadMore && (
        <div className="crewlet-data-table__load-more">
          <Button
            variant="outline"
            size="small"
            onClick={onLoadMore}
            loading={loadingMore}
          >
            {loadMoreLabel}
          </Button>
        </div>
      )}

      {/*
        * The end of the rows, said out loud for a reader who paged to it. A
        * feed that simply stops is a feed somebody keeps scrolling; it is
        * left to the caller because a table that is merely short has no end
        * worth announcing.
        */}
      {!hasMore && endMessage != null && displayedData.length > 0 && !loading && (
        <p className="crewlet-data-table__end">{endMessage}</p>
      )}

      {/*
        The settings frame: the page size, the wrapping, and the columns with
        their order. It opens with the drafts seeded from live state, every
        edit mutates a draft, Apply commits them and Cancel discards them,
        under one footer: Reset to Default at the leading edge, Cancel and
        Apply at the trailing one.

        ONE FRAME, NOT TWO. It used to come in a `compact` shape and a `rich`
        one, and only the rich one held the column list; the compact one was
        what a table with a title got by default. A table drew a gear that
        opened onto a frame with no way to its own columns, and the way in
        that covered for it, a Columns panel in the toolbar, has been removed
        because the frame is where an operator goes for this. The two shapes
        differed in nothing else a caller could have wanted: a dialog carrying
        a drag-reorder list wants the wide step whatever the table above it
        looks like.
       */}
      <Modal
        open={tableSettingsOpen}
        onClose={cancelTableSettings}
        title={labels.settingsTitle}
        size="lg"
        /*
          RESET SITS AT THE FAR LEFT, which is the frame's own shape and what
          it has drawn since 0.2.0: undo over here, the two answers over
          there. Handed to `footer` with the rest it landed in the end slot,
          which carries `margin-inline-start: auto`, so the whole cluster was
          pushed right and the reset ended up beside Cancel. The Modal has a
          start slot for exactly this, and using it is also what keeps the
          gap between them at whatever the footer's own gap is.
        */
        footerStart={(
          <>
            <Button
              variant="secondary"
              onClick={handleResetTableSettings}
              leadingIcon={
                resetConfirmed ? <CheckGlyph className="crewlet-data-table__reset-confirm-icon" size="sm" /> : undefined
              }
            >
              {labels.resetColumns}
            </Button>
            {/*
              * WHAT THE FRAME JUST DID, SPOKEN OUTSIDE THE CONTROL THAT DID
              * IT. The reset used to be `aria-live` on the button itself,
              * which makes the control's own name the announcement, so a
              * reader heard the button rather than what it had just done.
              * The column moves arrive here too: one region for one dialog,
              * because two live regions in one surface talk over each other.
              */}
            <span role="status">
              <VisuallyHidden>{settingsSaid}</VisuallyHidden>
            </span>
          </>
        )}
        footer={(
          <>
            <Button variant="tertiary" onClick={cancelTableSettings}>
              {labels.cancel}
            </Button>
            <Button variant="primary" onClick={applyTableSettings}>
              {labels.apply}
            </Button>
          </>
        )}
      >
        {/*
          A PAGE SIZE IS OFFERED WHERE THE NUMBER IS READ BY SOMEBODY: by the
          table, when it slices its own rows, or by the caller, which is what
          passing `onItemsPerPageChange` says. Offered to neither, every choice
          in the row did nothing at all, which is the chevrons' own rule one
          panel further in.
        */}
        {pageSizeOffered ? (
        <div className="crewlet-data-table__settings-section">
          <h3 className="crewlet-data-table__settings-section-title">{labels.itemsPerPage}</h3>
          <div className="crewlet-data-table__items-per-page-options">
            {itemsPerPageOptions.map((value) => (
              <button
                key={value}
                type="button"
                className={cx('crewlet-data-table__items-per-page-btn', draftItemsPerPage === value && 'is-active')}
                aria-pressed={draftItemsPerPage === value}
                onClick={() => handleItemsPerPageChange(value)}
              >
                {value}
              </button>
            ))}
            {/*
              * The chip SAYS HOW MANY All is, in its name and not on its face:
              * the word is what the design draws and what every reader
              * recognises, and the count is what tells somebody about to press
              * it that this list is forty thousand rows long.
              */}
            <button
              type="button"
              className={cx('crewlet-data-table__items-per-page-btn', draftItemsPerPage === ALL_ITEMS && 'is-active')}
              aria-pressed={draftItemsPerPage === ALL_ITEMS}
              onClick={() => handleItemsPerPageChange(ALL_ITEMS)}
            >
              {labels.allItems}
              <VisuallyHidden>{` ${labels.allItemsCount(sortedDataMemo.length)}`}</VisuallyHidden>
            </button>
          </div>
        </div>
        ) : null}

        <div className="crewlet-data-table__settings-section">
          <Checkbox
            label={labels.wrapLines}
            description={labels.wrapLinesHint}
            checked={draftWrapLines}
            onChange={(e) => setDraftWrapLines(e.target.checked)}
          />
        </div>

        <div className="crewlet-data-table__settings-section">
          <h3 className="crewlet-data-table__settings-section-title">{labels.columnsSection}</h3>
          <p className="crewlet-data-table__settings-section-hint">{labels.columnsHint}</p>
          <VisuallyHidden id={reorderHintId}>{labels.reorderHint}</VisuallyHidden>
          <ul className="crewlet-data-table__column-toggles">
            {draftColumnOrder.map((key, index) => {
              const name = columnName(key);
              const fixed = whyFixed(key, draftVisibleColumns);
              const shown = draftVisibleColumns[key] !== false;
              return (
              <li
                key={key}
                className={cx('crewlet-data-table__column-toggle-item', draggedColumn === key && 'is-dragging')}
                onDragOver={(e) => handleDragOver(e, key)}
                onDrop={(e) => handleDrop(e, key)}
              >
                {/*
                  * THE HANDLE IS A CONTROL, and it is what the row is
                  * dragged BY. It used to be an `aria-hidden` glyph on a
                  * row that was draggable along its whole width: nothing
                  * named it, nothing could focus it, and the one gesture it
                  * offered started just as readily from the checkbox beside
                  * it. As a button it has a name, a focus ring, a target at
                  * the control step, and the arrow keys do from here exactly
                  * what the two buttons at the end of the row do.
                  */}
                <IconButton
                  size="sm"
                  className="crewlet-data-table__column-drag-handle"
                  label={labels.reorder(name)}
                  icon={<DragIndicatorGlyph size="md" />}
                  aria-describedby={reorderHintId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, key)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                    e.preventDefault();
                    moveColumn(key, e.key === 'ArrowUp' ? -1 : 1);
                  }}
                />
                {/*
                  * The name falls back to the column key for a decorative
                  * column that ships an empty label, because a checkbox
                  * with no name is a checkbox nobody can decide about.
                  *
                  * A TICK THAT CANNOT MOVE SAYS WHY, and stays reachable:
                  * `disabled` would take it out of the reading order
                  * entirely, so a reader who cannot see it would find the
                  * column simply missing from the list.
                  */}
                <Checkbox
                  className={cx(
                    'crewlet-data-table__column-toggle',
                    fixed !== null && shown && 'is-fixed',
                  )}
                  label={name}
                  {...(fixed !== null && shown ? { description: fixed, 'aria-disabled': true } : {})}
                  checked={shown}
                  onChange={() => handleToggleColumn(key)}
                />
                <span className="crewlet-data-table__column-toggle-actions">
                  {/*
                    * `disabledReason` RATHER THAN `disabled`, at both ends
                    * of the list. Move up on the column that has just
                    * reached the top disables the very button the press is
                    * on, and a disabled button drops focus to the document
                    * body: the reader who moved the column lost their place
                    * in the list by moving it. Left operable and marked
                    * `aria-disabled` with a reason, the control keeps focus
                    * and says why it does nothing.
                    */}
                  <IconButton
                    size="sm"
                    label={labels.moveUp(name)}
                    icon={<KeyboardArrowUpGlyph size="sm" />}
                    {...(index === 0 ? { disabledReason: labels.atTop(name) } : {})}
                    onClick={() => moveColumn(key, -1)}
                  />
                  <IconButton
                    size="sm"
                    label={labels.moveDown(name)}
                    icon={<KeyboardArrowDownGlyph size="sm" />}
                    {...(index === draftColumnOrder.length - 1
                      ? { disabledReason: labels.atBottom(name) }
                      : {})}
                    onClick={() => moveColumn(key, 1)}
                  />
                </span>
              </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </div>
  );
};



