/**
 * The sheet's keyboard model and geometry, as plain arithmetic both renderers
 * share: which cell a key moves to, which cells a range covers, which rows a
 * scroll position shows, and which way an editor's list opens.
 *
 * Positions are indexes into what is drawn: `row` counts the drawn rows from 0
 * (the header row is -1) and `col` counts the drawn columns from 0.
 */

import type { SheetColumn, SheetColumnType } from './types.js';

export interface SheetPosition {
  row: number;
  col: number;
}

export interface SheetBounds {
  /** Data rows drawn. */
  rows: number;
  /** Columns drawn. */
  cols: number;
  /** Rows a PageUp or a PageDown moves. */
  page: number;
}

/** The modifier state a move reads, so a caller hands over a KeyboardEvent or anything shaped like one. */
export interface SheetKey {
  key: string;
  shiftKey?: boolean | undefined;
  ctrlKey?: boolean | undefined;
  metaKey?: boolean | undefined;
  altKey?: boolean | undefined;
}

/** Whether the platform's command modifier is held: Command on a Mac, Control elsewhere, either accepted. */
export const isMod = (key: SheetKey): boolean => Boolean(key.ctrlKey || key.metaKey);

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/**
 * Where a navigation key moves the active cell, or null for a key that is not
 * one. The header row (-1) is reachable from the first row and moves along
 * itself; Tab is not handled here, because at the row's edge it leaves the
 * grid (the grid is one tab stop) rather than wrapping.
 */
export function moveFrom(at: SheetPosition, key: SheetKey, bounds: SheetBounds): SheetPosition | null {
  const lastRow = bounds.rows - 1;
  const lastCol = bounds.cols - 1;
  if (bounds.cols === 0) return null;
  const mod = isMod(key);
  switch (key.key) {
    case 'ArrowUp':
      return { row: mod ? (at.row < 0 ? -1 : 0) : Math.max(at.row - 1, -1), col: at.col };
    case 'ArrowDown':
      if (lastRow < 0) return at;
      return { row: mod ? lastRow : clamp(at.row + 1, -1, lastRow), col: at.col };
    case 'ArrowLeft':
      return { row: at.row, col: mod ? 0 : Math.max(at.col - 1, 0) };
    case 'ArrowRight':
      return { row: at.row, col: mod ? lastCol : Math.min(at.col + 1, lastCol) };
    case 'Home':
      return mod ? { row: lastRow < 0 ? -1 : 0, col: 0 } : { row: at.row, col: 0 };
    case 'End':
      return mod ? { row: Math.max(lastRow, -1), col: lastCol } : { row: at.row, col: lastCol };
    case 'PageUp':
      return { row: at.row < 0 ? -1 : Math.max(at.row - bounds.page, 0), col: at.col };
    case 'PageDown':
      if (lastRow < 0) return at;
      return { row: clamp(at.row + bounds.page, 0, lastRow), col: at.col };
    default:
      return null;
  }
}

/** A rectangle of cells, as its inclusive corners. */
export interface SheetRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** The range an anchor and the active cell span. A header position counts as the first row. */
export function rangeOf(anchor: SheetPosition, active: SheetPosition): SheetRange {
  const a = Math.max(anchor.row, 0);
  const b = Math.max(active.row, 0);
  return { top: Math.min(a, b), bottom: Math.max(a, b), left: Math.min(anchor.col, active.col), right: Math.max(anchor.col, active.col) };
}

export const inRange = (range: SheetRange, row: number, col: number): boolean =>
  row >= range.top && row <= range.bottom && col >= range.left && col <= range.right;

/** Whether a range is more than the one cell. */
export const isMultiCell = (range: SheetRange): boolean => range.top !== range.bottom || range.left !== range.right;

/** The rows a scroll position shows, with an overscan either side, as [first, last] inclusive. */
export function visibleRows(scrollTop: number, viewport: number, rowHeight: number, rows: number, overscan = 8): [number, number] {
  if (rows === 0) return [0, -1];
  // A viewport that has not been laid out (a test document, a hidden tab)
  // reports 0: draw a first screenful rather than nothing.
  const height = viewport > 0 ? viewport : rowHeight * 40;
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(rows - 1, Math.ceil((scrollTop + height) / rowHeight) + overscan);
  return [first, last];
}

/** The scrollTop that brings a row fully into view, or the current one when it already is. */
export function scrollToRow(row: number, scrollTop: number, viewport: number, rowHeight: number, header: number): number {
  const top = row * rowHeight;
  const bottom = top + rowHeight;
  const visibleTop = scrollTop;
  const visibleBottom = scrollTop + Math.max(viewport - header, rowHeight);
  if (top < visibleTop) return top;
  if (bottom > visibleBottom) return bottom - Math.max(viewport - header, rowHeight);
  return scrollTop;
}

/**
 * Which way an editor's list opens from its cell: below by default, above
 * when there is not room below and more room above. Measured in the scroller's
 * own coordinates, so a list never opens off the edge it would be clipped at.
 */
export function editorSide(cellTop: number, cellBottom: number, viewTop: number, viewBottom: number, panelHeight: number): 'below' | 'above' {
  const below = viewBottom - cellBottom;
  const above = cellTop - viewTop;
  return below >= panelHeight || below >= above ? 'below' : 'above';
}

/** The width each type takes when its column declares none, in px. */
export const SHEET_COLUMN_WIDTHS: Readonly<Record<SheetColumnType, number>> = {
  text: 200,
  longtext: 260,
  number: 112,
  checkbox: 104,
  select: 144,
  multiselect: 208,
  status: 144,
  person: 176,
  date: 136,
  url: 208,
  rating: 128,
};

/** The width of the row number column, in px. */
export const SHEET_ROW_NUMBER_WIDTH = 52;

/** The row height a sheet assumes until it has measured `--size-sheet-row`, in px. */
export const SHEET_ROW_HEIGHT = 32;

export const columnWidth = (column: Pick<SheetColumn, 'type' | 'width'>): number =>
  column.width !== undefined && column.width > 0 ? column.width : SHEET_COLUMN_WIDTHS[column.type];

/**
 * Each column's offset from the leading edge, in px, after the row number
 * column: what a frozen column's `inset-inline-start` is.
 */
export function columnOffsets(columns: readonly Pick<SheetColumn, 'type' | 'width'>[]): number[] {
  const offsets: number[] = [];
  let at = SHEET_ROW_NUMBER_WIDTH;
  for (const column of columns) {
    offsets.push(at);
    at += columnWidth(column);
  }
  return offsets;
}

/**
 * The columns in drawing order: the frozen ones lead, in their own order, so
 * a frozen column is never stranded behind a scrolled one.
 */
export function drawnColumns<C extends Pick<SheetColumn, 'frozen'>>(columns: readonly C[]): C[] {
  return [...columns.filter((column) => column.frozen), ...columns.filter((column) => !column.frozen)];
}

/** Whether a key starts typing into a cell: one printable character with no command modifier. */
export const isTypingKey = (key: SheetKey): boolean => key.key.length === 1 && !isMod(key) && !key.altKey;
