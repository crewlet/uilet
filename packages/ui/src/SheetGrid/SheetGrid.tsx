/**
 * An editable, virtualised data grid: the native sheet of a `sheet` artifact,
 * and the grid the artifact kit draws for a page's `<crewlet-sheet>`.
 *
 * KEYBOARD FIRST, with a spreadsheet's keys: the arrows move, Enter or F2
 * edits, Escape cancels, Tab and Shift+Tab move across, Space toggles a
 * checkbox, typing on a cell starts an edit with that character, Mod+C and
 * Mod+V copy and paste ranges as tab-separated values, Delete clears, Mod+Z
 * and Mod+Shift+Z ask the host to undo and redo the reader's own edits, and
 * Mod+Alt+H opens a cell's history. The grid is ONE TAB STOP (the ARIA grid
 * pattern): Tab at a row's edge leaves it rather than wrapping.
 *
 * HONEST INSTANT EDITS (D23). The reader's value is the host's to draw: the
 * grid asks for an edit through `onEdit`, the host draws the value at once and
 * lists the field in the row's `pending` until the engine confirms it, which
 * the grid draws as Saving (a dashed underline, and the word in the cell's
 * description and the sync strip). A refusal reverts the value in the host's
 * data and arrives in the row's `refused`, said on the cell. What is drawn
 * solid is what the engine holds.
 *
 * CONFLICTS ARE SAID, NEVER LOCKED. A remote write that lands on the cell
 * being edited keeps the editor open and names the writer: "Maya changed this
 * to 6.8 while you were editing. Keep yours or use Maya's." No cell is ever
 * locked; presence makes contention visible instead.
 *
 * VIRTUALISED: only the rows in view (and the active one) are in the
 * document, so ten thousand rows cost what forty do. `aria-rowcount` and each
 * row's `aria-rowindex` tell assistive technology how many there are and
 * where it is.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { ArrowDownGlyph, ArrowUpGlyph, CircleAlertGlyph, EllipsisGlyph, PlusGlyph, RotateCcwClockGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { Avatar } from '../Avatar/index.js';
import { Button } from '../Button/index.js';
import { ChangeMark } from '../ChangeMark/index.js';
import { CursorFlag } from '../CursorFlag/index.js';
import { IconButton } from '../IconButton/index.js';
import { isComposing } from '../Layer/index.js';
import { Menu } from '../Menu/index.js';
import { Popover } from '../Popover/index.js';
import { presenceHueClass } from '../PresenceRing/index.js';
import { presenceLabels, type PresenceLabels } from '../PresenceModel/index.js';
import {
  SHEET_COLUMN_BOUNDS,
  SHEET_ROW_HEIGHT,
  SHEET_ROW_NUMBER_WIDTH,
  cellDescription,
  cellKey,
  columnOffsets,
  columnWidth,
  displayText,
  drawnColumns,
  editorSide,
  fitSamples,
  fittedWidth,
  flagText,
  hasPrevious,
  inRange,
  isMod,
  isTypingKey,
  moveFrom,
  nextSort,
  normalizeValue,
  parseTSV,
  planClear,
  planPaste,
  presenceByCell,
  presenceByColumn,
  presenceByRow,
  rangeOf,
  ratingMax,
  rowName,
  sameValue,
  scrollToRow,
  sheetLabels,
  sortRows,
  toTSV,
  visibleRows,
  type SheetCellPresence,
  type SheetColumn,
  type SheetEdit,
  type SheetLabels,
  type SheetPerson,
  type SheetPosition,
  type SheetRow,
  type SheetSort,
  type SheetSyncState,
  type SheetValue,
  type SheetValueContext,
} from '../SheetModel/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { CellDisplay, CellEditor, hasEditor, takesTyping, type CellConflict, type CellMove } from './cells.js';

/** `edit` takes edits; `read` draws the same grid with every cell read only. */
export type SheetGridMode = 'edit' | 'read';

/** The cell a reader is on, by row id and field: what a host publishes as presence focus. */
export interface SheetCellRef {
  rowId: string;
  field: string;
}

export interface SheetGridProps {
  /** The grid's accessible name: the sheet's title. */
  label: string;
  columns: readonly SheetColumn[];
  rows: readonly SheetRow[];
  /** The people person cells name and offer. */
  people?: readonly SheetPerson[] | undefined;
  mode?: SheetGridMode | undefined;
  /** Every edit the reader makes: one cell, a paste, a cleared range. The host writes them as one batch. */
  onEdit?: ((edits: readonly SheetEdit[]) => void) | undefined;
  /** Shows the Add row control. */
  onAddRow?: (() => void) | undefined;
  /** Shows the per-cell history control on the active cell, and takes Mod+Alt+H. */
  onShowHistory?: ((cell: SheetCellRef) => void) | undefined;
  /** The cell the reader is on, or null when the grid has no active data cell: a host's presence focus. */
  onActiveCellChange?: ((cell: SheetCellRef | null) => void) | undefined;
  /** The cell the reader is editing, or null: a host's presence `editing`. */
  onEditingChange?: ((cell: SheetCellRef | null) => void) | undefined;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  /** Opens a URL cell's link, for a host that routes links through an interstitial. */
  onOpenLink?: ((url: string) => void) | undefined;
  /** Collaborators on cells (D22). */
  presence?: readonly SheetCellPresence[] | undefined;
  /** The order drawn. With `onSortChange` the headers sort. */
  sort?: SheetSort | null | undefined;
  onSortChange?: ((sort: SheetSort | null) => void) | undefined;
  /** Where the host's writes stand, for the sync strip. No strip without it. */
  sync?: SheetSyncState | undefined;
  onRetry?: (() => void) | undefined;
  /**
   * The scroller's height in px. Without it the grid takes the height its
   * container gives it. With `fit="content"` it is the MOST the grid takes.
   */
  height?: number | undefined;
  /**
   * `container` (the default) fills the height its container gives it.
   * `content` is as tall as its rows, up to `height` (or the
   * `--crewlet-sheet-max-height` the page sets, 70% of the viewport by
   * default), so twelve rows draw no empty bordered slab under the last one
   * and Add row sits right under them. In a column of bounded height it
   * shrinks to the room left, down to the `--crewlet-sheet-min-height` the
   * page sets.
   */
  fit?: 'container' | 'content' | undefined;
  /**
   * Shows the row actions menu in a row's number gutter (the number gives way
   * to the button under the pointer, on the row holding focus, and while the
   * menu is open; a tap on the number opens it on a touch screen; Shift+F10
   * opens it from any of the row's cells) with Delete row. The grid only
   * asks: the host confirms with its own dialog before it deletes anything.
   */
  onDeleteRow?: ((rowId: string) => void) | undefined;
  /**
   * Shows Dismiss in the sync strip while refused changes are held there
   * (`sync.refused`), so the reader clears them once they have read why.
   */
  onDismissRefused?: (() => void) | undefined;
  /**
   * Makes each column header open the host's column settings in a popover
   * anchored to it: a click, Enter or Space on a header opens it, and Escape
   * closes it and returns to the header. The grid owns the popover and its
   * placement; the host draws what is inside and changes its own `columns`.
   * A header that opens settings does not sort on a click: a host that offers
   * both puts its sort in the settings, as a spreadsheet's column menu does.
   */
  renderColumnEditor?: ((column: SheetColumn, close: () => void) => ReactNode) | undefined;
  /**
   * The field whose settings are open, for a host that opens them itself (a
   * column it has just added, say). Leave it out and the grid keeps its own.
   */
  settingsColumn?: string | null | undefined;
  onSettingsColumnChange?: ((field: string | null) => void) | undefined;
  /** Shows the Add column control after the last header. The host appends the column. */
  onAddColumn?: (() => void) | undefined;
  /** A BCP 47 tag for numbers and dates; the reader's own locale when absent. */
  locale?: string | undefined;
  className?: string | undefined;
  labels?: Partial<SheetLabels> | undefined;
  presenceLabels?: Partial<PresenceLabels> | undefined;
}

interface ActiveCell {
  /** The row id, or null for the header row. */
  rowId: string | null;
  field: string;
}

interface Editing {
  rowId: string;
  field: string;
  seed?: string | undefined;
  /** The value when the edit began; a different value under the editor is a conflict. */
  base: SheetValue;
}

const HEADER = -1;

/** The most of the grid's visible width the row numbers and the frozen columns hold together. */
const FROZEN_SHARE = 0.6;

/** Pastes, clears and type refusals the grid itself refuses, keyed by cell, until the cell is edited again. */
type LocalRefusals = ReadonlyMap<string, string>;

export function SheetGrid({
  label,
  columns: declared,
  rows: given,
  people,
  mode = 'edit',
  onEdit,
  onAddRow,
  onShowHistory,
  onActiveCellChange,
  onEditingChange,
  onUndo,
  onRedo,
  onOpenLink,
  presence,
  sort,
  onSortChange,
  sync,
  onRetry,
  height,
  fit = 'container',
  onDeleteRow,
  onDismissRefused,
  renderColumnEditor,
  settingsColumn,
  onSettingsColumnChange,
  onAddColumn,
  locale,
  className,
  labels: labelOverrides,
  presenceLabels: presenceOverrides,
}: SheetGridProps) {
  const id = useId();
  const labels = useMemo(() => sheetLabels(labelOverrides), [labelOverrides]);
  const said = useMemo(() => presenceLabels(presenceOverrides), [presenceOverrides]);
  const context = useMemo<SheetValueContext>(() => ({ people, locale, labels }), [people, locale, labels]);
  const ordered = useMemo(() => drawnColumns(declared), [declared]);

  /* ----- column widths --------------------------------------------------- */

  // A COLUMN THAT DECLARES NO WIDTH IS SIZED TO WHAT IT HOLDS: the widest of
  // its header and a few of its values (SheetModel `fitSamples`), drawn by the
  // real header and cells in a hidden row and measured, within its type's
  // bounds. The samples are taken when the columns change and when the first
  // rows arrive, never on an edit, so no column moves under a reader typing.
  // The scroller's visible width, which the frozen columns are held to a share of.
  const [viewportWidth, setViewportWidth] = useState(0);
  const latestRows = useRef(given);
  useLayoutEffect(() => {
    latestRows.current = given;
  });
  const hasRows = given.length > 0;
  const [samples, setSamples] = useState<ReadonlyMap<string, readonly SheetValue[]> | null>(null);
  useLayoutEffect(() => {
    const from = hasRows ? latestRows.current : [];
    setSamples(new Map(ordered.filter((column) => !(column.width && column.width > 0)).map((column) => [column.field, fitSamples(column, from, context)])));
  }, [ordered, hasRows, context]);
  // Measured again once the face has loaded: a fallback face's widths are not the drawn face's.
  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts) return undefined;
    let live = true;
    const loaded = () => {
      if (live) setFontsLoaded((n) => n + 1);
    };
    void fonts.ready.then(loaded);
    fonts.addEventListener('loadingdone', loaded);
    return () => {
      live = false;
      fonts.removeEventListener('loadingdone', loaded);
    };
  }, []);
  const measurer = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<ReadonlyMap<string, number>>(new Map());
  useLayoutEffect(() => {
    const box = measurer.current;
    if (!box) return;
    const next = new Map<string, number>();
    for (const group of box.querySelectorAll<HTMLElement>('[data-measure]')) {
      let widest = 0;
      for (const part of group.children) widest = Math.max(widest, part.getBoundingClientRect().width);
      next.set(group.dataset['measure'] ?? '', widest);
    }
    setMeasured(next);
  }, [samples, fontsLoaded]);
  // THE FROZEN COLUMNS NEVER TAKE THE VIEW: together with the row numbers they
  // hold at most a share of the grid's visible width (on a phone, a title
  // column at its ceiling left no room for anything that scrolls), each
  // fitted one giving way, never below its type's floor.
  const columns = useMemo(() => {
    const declares = (column: SheetColumn) => column.width !== undefined && column.width > 0;
    const fitted = ordered.map((column) => (declares(column) ? column : { ...column, width: fittedWidth(column.type, measured.get(column.field) ?? 0) }));
    if (viewportWidth <= 0) return fitted;
    const room = Math.floor(viewportWidth * FROZEN_SHARE) - SHEET_ROW_NUMBER_WIDTH;
    const over = fitted.filter((column) => column.frozen).reduce((sum, column) => sum + columnWidth(column), 0) - room;
    const yielding = ordered.filter((column) => column.frozen && !declares(column)).length;
    if (over <= 0 || yielding === 0) return fitted;
    const each = Math.ceil(over / yielding);
    return fitted.map((column, index) =>
      column.frozen && !declares(ordered[index]!) ? { ...column, width: Math.max(SHEET_COLUMN_BOUNDS[column.type][0], columnWidth(column) - each) } : column,
    );
  }, [ordered, measured, viewportWidth]);
  const rows = useMemo(() => sortRows(columns, given, sort, context), [columns, given, sort, context]);
  const editable = mode === 'edit' && onEdit !== undefined;
  const rowActions = mode === 'edit' && onDeleteRow !== undefined;
  const columnSettings = mode === 'edit' && renderColumnEditor !== undefined;
  const addsColumns = mode === 'edit' && onAddColumn !== undefined;
  const [ownSettingsColumn, setOwnSettingsColumn] = useState<string | null>(null);
  const openColumn = settingsColumn !== undefined ? settingsColumn : ownSettingsColumn;
  const setOpenColumn = (field: string | null) => {
    if (settingsColumn === undefined) setOwnSettingsColumn(field);
    onSettingsColumnChange?.(field);
  };

  const scroller = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const handledFocus = useRef(0);

  const [rowHeight, setRowHeight] = useState(SHEET_ROW_HEIGHT);
  const [headerHeight, setHeaderHeight] = useState(SHEET_ROW_HEIGHT);
  const [viewport, setViewport] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrolledAcross, setScrolledAcross] = useState(false);
  const [active, setActive] = useState<ActiveCell | null>(null);
  const [anchor, setAnchor] = useState<ActiveCell | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [local, setLocal] = useState<LocalRefusals>(new Map());
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const dragging = useRef(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const say = useCallback((text: string) => setAnnouncement((current) => ({ text, n: current.n + 1 })), []);

  // A REFUSAL IS SAID AS IT ARRIVES, not only on the cell: the value has
  // already reverted, and a reader whose focus is elsewhere would otherwise
  // never learn their change was not kept.
  const heardRefusals = useRef<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    const now = new Map<string, string>();
    for (const row of given) {
      for (const [field, reason] of Object.entries(row.refused ?? {})) now.set(cellKey(row.id, field), reason);
    }
    for (const [key, reason] of now) {
      if (heardRefusals.current.get(key) !== reason) {
        say(labels.notSaved(reason));
        break;
      }
    }
    heardRefusals.current = now;
  }, [given, labels, say]);

  /* ----- geometry -------------------------------------------------------- */

  useLayoutEffect(() => {
    const measure = () => {
      const row = probe.current?.offsetHeight ?? 0;
      if (row > 0) setRowHeight(row);
      const head = grid.current?.querySelector<HTMLElement>('.crewlet-sheet-grid__row--head')?.offsetHeight ?? 0;
      if (head > 0) setHeaderHeight(head);
      setViewport(scroller.current?.clientHeight ?? 0);
      setViewportWidth(scroller.current?.clientWidth ?? 0);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(measure);
    if (scroller.current) observer.observe(scroller.current);
    if (probe.current) observer.observe(probe.current);
    return () => observer.disconnect();
  }, []);

  const offsets = useMemo(() => columnOffsets(columns), [columns]);
  // THE LAST TRACK TAKES THE SLACK: a grid narrower than its container
  // stretches its last column to the border rather than leaving an empty
  // strip beside it, and a wider one scrolls as before.
  const template = useMemo(
    () =>
      [
        `${SHEET_ROW_NUMBER_WIDTH}px`,
        ...columns.map((column, index) => (index === columns.length - 1 ? `minmax(${columnWidth(column)}px, 1fr)` : `${columnWidth(column)}px`)),
      ].join(' '),
    [columns],
  );
  const totalWidth = useMemo(() => columns.reduce((sum, column) => sum + columnWidth(column), SHEET_ROW_NUMBER_WIDTH), [columns]);
  // THE LAST COLUMN THAT STAYS when the grid scrolls sideways (-1: only the
  // row numbers stay): its trailing hairline is the frozen edge.
  const lastFrozen = useMemo(() => columns.reduce((edge, column, index) => (column.frozen ? index : edge), -1), [columns]);
  const frozenEdge = useMemo(() => {
    let edge = SHEET_ROW_NUMBER_WIDTH;
    columns.forEach((column, index) => {
      if (column.frozen) edge = (offsets[index] ?? edge) + columnWidth(column);
    });
    return edge;
  }, [columns, offsets]);

  /* ----- positions ------------------------------------------------------- */

  const rowIndex = useMemo(() => new Map(rows.map((row, index) => [row.id, index])), [rows]);
  const colIndex = useMemo(() => new Map(columns.map((column, index) => [column.field, index])), [columns]);

  const positionOf = useCallback(
    (cell: ActiveCell | null): SheetPosition | null => {
      if (!cell) return null;
      const col = colIndex.get(cell.field);
      if (col === undefined) return null;
      if (cell.rowId === null) return { row: HEADER, col };
      const row = rowIndex.get(cell.rowId);
      return row === undefined ? null : { row, col };
    },
    [colIndex, rowIndex],
  );

  const cellAt = useCallback(
    (position: SheetPosition): ActiveCell | null => {
      const column = columns[position.col];
      if (!column) return null;
      if (position.row === HEADER) return { rowId: null, field: column.field };
      const row = rows[position.row];
      return row ? { rowId: row.id, field: column.field } : null;
    },
    [columns, rows],
  );

  // The active cell, held by row id so a sort or a remote insert never moves
  // the reader to a different row; one whose row is gone falls back to the
  // first cell.
  const fallback: ActiveCell | null = rows.length > 0 && columns.length > 0 ? { rowId: rows[0]!.id, field: columns[0]!.field } : columns.length > 0 ? { rowId: null, field: columns[0]!.field } : null;
  const current = positionOf(active) ?? positionOf(fallback);
  const currentCell = current ? cellAt(current) : null;
  const anchorPosition = positionOf(anchor) ?? current;
  const range = current && anchorPosition && current.row !== HEADER ? rangeOf(anchorPosition, current) : null;

  /* ----- presence -------------------------------------------------------- */

  const onCells = useMemo(() => presenceByCell(presence), [presence]);
  const onRows = useMemo(() => presenceByRow(presence), [presence]);
  const onColumns = useMemo(() => presenceByColumn(presence), [presence]);

  /* ----- reporting ------------------------------------------------------- */

  const reportedActive = useRef<string | null>(null);
  useEffect(() => {
    const cell = currentCell && currentCell.rowId !== null ? { rowId: currentCell.rowId, field: currentCell.field } : null;
    const key = cell ? cellKey(cell.rowId, cell.field) : null;
    if (key === reportedActive.current) return;
    reportedActive.current = key;
    onActiveCellChange?.(cell);
  }, [currentCell, onActiveCellChange]);

  const reportedEditing = useRef<string | null>(null);
  useEffect(() => {
    const key = editing ? cellKey(editing.rowId, editing.field) : null;
    if (key === reportedEditing.current) return;
    reportedEditing.current = key;
    onEditingChange?.(editing ? { rowId: editing.rowId, field: editing.field } : null);
  }, [editing, onEditingChange]);

  /* ----- edits ----------------------------------------------------------- */

  const refuseLocally = useCallback(
    (refusals: readonly { rowId: string; field: string; error: string }[]) => {
      if (refusals.length === 0) return;
      setLocal((before) => {
        const next = new Map(before);
        for (const refusal of refusals) next.set(cellKey(refusal.rowId, refusal.field), refusal.error);
        return next;
      });
      say(refusals[0]!.error);
    },
    [say],
  );

  const clearLocal = useCallback((keys: readonly string[]) => {
    setLocal((before) => {
      if (!keys.some((key) => before.has(key))) return before;
      const next = new Map(before);
      for (const key of keys) next.delete(key);
      return next;
    });
  }, []);

  const emit = useCallback(
    (edits: readonly SheetEdit[]) => {
      if (edits.length === 0 || !onEdit) return;
      clearLocal(edits.map((edit) => cellKey(edit.rowId, edit.field)));
      onEdit(edits);
    },
    [onEdit, clearLocal],
  );

  const columnOf = useCallback((field: string) => columns[colIndex.get(field) ?? -1], [columns, colIndex]);
  const rowOf = useCallback((rowId: string) => rows[rowIndex.get(rowId) ?? -1], [rows, rowIndex]);

  const cellEditable = useCallback(
    (column: SheetColumn | undefined): boolean => editable && column !== undefined && !column.readOnly,
    [editable],
  );

  /* ----- moving ---------------------------------------------------------- */

  const focusCell = useCallback(() => setFocusRequest((n) => n + 1), []);

  const moveTo = useCallback(
    (cell: ActiveCell | null, extend = false) => {
      if (!cell) return;
      setActive(cell);
      if (!extend) setAnchor(cell);
      focusCell();
    },
    [focusCell],
  );

  // Focus is the truth about where the reader is: a cell focused by a press,
  // a screen reader or a script becomes the active cell. A move of the grid's
  // own has already made it active, so an extended range keeps its anchor.
  const onCellFocus = (cell: ActiveCell) => {
    if (active && active.rowId === cell.rowId && active.field === cell.field) return;
    setActive(cell);
    setAnchor(cell);
  };

  // Bring the active cell into view, and give it focus when a move asked for
  // it, after the render that drew it.
  const activeRow = current?.row ?? null;
  const activeCol = current?.col ?? null;
  useLayoutEffect(() => {
    if (activeRow === null || activeCol === null) return;
    const box = scroller.current;
    if (box && activeRow >= 0) {
      const top = scrollToRow(activeRow, box.scrollTop, box.clientHeight, rowHeight, headerHeight);
      if (top !== box.scrollTop) {
        box.scrollTop = top;
        setScrollTop(top);
      }
      const column = columns[activeCol];
      if (column && !column.frozen) {
        const left = offsets[activeCol] ?? 0;
        const right = left + columnWidth(column);
        if (left - frozenEdge < box.scrollLeft) box.scrollLeft = Math.max(left - frozenEdge, 0);
        else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth;
      }
    }
    if (focusRequest === handledFocus.current || editing) return;
    handledFocus.current = focusRequest;
    document.getElementById(cellDomId(id, { row: activeRow, col: activeCol }))?.focus({ preventScroll: true });
  }, [activeRow, activeCol, focusRequest, editing, id, rowHeight, headerHeight, columns, offsets, frozenEdge]);

  /* ----- editing --------------------------------------------------------- */

  const beginEdit = useCallback(
    (cell: ActiveCell, seed?: string) => {
      if (cell.rowId === null) return;
      const column = columnOf(cell.field);
      const row = rowOf(cell.rowId);
      if (!row || !column) return;
      if (!cellEditable(column)) {
        say(editable ? labels.readOnly(column.label) : labels.forbidden);
        return;
      }
      if (!hasEditor(column.type)) return;
      clearLocal([cellKey(cell.rowId, cell.field)]);
      setEditing({ rowId: cell.rowId, field: cell.field, seed, base: normalizeValue(column, row.values[column.field]) });
    },
    [cellEditable, clearLocal, columnOf, editable, labels, rowOf, say],
  );

  const toggle = useCallback(
    (cell: ActiveCell) => {
      if (cell.rowId === null) return;
      const column = columnOf(cell.field);
      const row = rowOf(cell.rowId);
      if (!row || !column || column.type !== 'checkbox') return;
      if (!cellEditable(column)) {
        say(editable ? labels.readOnly(column.label) : labels.forbidden);
        return;
      }
      emit([{ rowId: row.id, field: column.field, value: normalizeValue(column, row.values[column.field]) !== true }]);
    },
    [cellEditable, columnOf, editable, emit, labels, rowOf, say],
  );

  const stepFrom = useCallback(
    (at: SheetPosition, move: CellMove): ActiveCell | null => {
      if (move === null) return cellAt(at);
      const next = {
        down: { row: Math.min(at.row + 1, rows.length - 1), col: at.col },
        up: { row: Math.max(at.row - 1, 0), col: at.col },
        right: { row: at.row, col: Math.min(at.col + 1, columns.length - 1) },
        left: { row: at.row, col: Math.max(at.col - 1, 0) },
      }[move];
      return cellAt(next);
    },
    [cellAt, columns.length, rows.length],
  );

  const endEdit = useCallback(
    (value: SheetValue | undefined, move: CellMove) => {
      if (!editing) return;
      const position = positionOf({ rowId: editing.rowId, field: editing.field });
      const column = columnOf(editing.field);
      const row = rowOf(editing.rowId);
      setEditing(null);
      if (value !== undefined && column && row && !sameValue(value, normalizeValue(column, row.values[column.field]))) {
        emit([{ rowId: row.id, field: column.field, value }]);
      }
      // The active cell moves, and takes focus, only when the edit ended from
      // the keyboard, with focus still in the editor. An edit that ended
      // because focus left (a press on another cell, which already made that
      // cell active, or a press outside the grid, which took focus away on
      // purpose) leaves both where the reader put them.
      const holder = document.activeElement;
      const editorHadFocus = holder !== null && holder !== document.body && Boolean(grid.current?.contains(holder));
      if (position && editorHadFocus) moveTo(stepFrom(position, move));
    },
    [columnOf, editing, emit, moveTo, positionOf, rowOf, stepFrom],
  );

  // An edit whose row was removed underneath it ends without writing.
  useEffect(() => {
    if (editing && !rowIndex.has(editing.rowId)) setEditing(null);
  }, [editing, rowIndex]);

  const editingRow = editing ? rowOf(editing.rowId) : undefined;
  const editingColumn = editing ? columnOf(editing.field) : undefined;
  const remote = editing && editingRow && editingColumn ? normalizeValue(editingColumn, editingRow.values[editingColumn.field]) : null;
  const conflicted = Boolean(editing && editingRow && editingColumn && !sameValue(remote, editing.base));
  const writer = conflicted && editing ? (editingRow?.changed?.[editing.field]?.by ?? labels.someone) : '';
  const conflict: CellConflict | null =
    conflicted && editing && editingColumn
      ? {
          writer,
          value: displayText(editingColumn, remote, context) || labels.empty,
          onKeepMine: () => setEditing((now) => (now ? { ...now, base: remote } : now)),
          onUseTheirs: () => {
            const position = positionOf({ rowId: editing.rowId, field: editing.field });
            setEditing(null);
            if (position) moveTo(cellAt(position));
          },
        }
      : null;

  const conflictText = conflict ? labels.conflict(conflict.writer, conflict.value) : '';
  useEffect(() => {
    if (conflictText) say(conflictText);
  }, [conflictText, say]);

  /* ----- clipboard ------------------------------------------------------- */

  const onCopy = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || !range || fromElsewhere(event)) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', toTSV(columns, rows, range, context));
  };

  const clearRange = useCallback(() => {
    if (!range) return;
    if (!editable) {
      say(labels.forbidden);
      return;
    }
    const plan = planClear(columns, rows, range, context);
    emit(plan.edits);
    refuseLocally(plan.refused);
  }, [columns, context, editable, emit, labels.forbidden, range, refuseLocally, rows, say]);

  const onCut = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || !range || fromElsewhere(event)) return;
    onCopy(event);
    clearRange();
  };

  const onPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (editing || !range || fromElsewhere(event)) return;
    event.preventDefault();
    if (!editable) {
      say(labels.forbidden);
      return;
    }
    const plan = planPaste(columns, rows, range, parseTSV(event.clipboardData.getData('text/plain')), context);
    emit(plan.edits);
    refuseLocally(plan.refused);
  };

  /* ----- keys ------------------------------------------------------------ */

  const page = Math.max(1, Math.floor(Math.max(viewport - headerHeight, rowHeight) / rowHeight) - 1);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editing || isComposing(event) || !current || !currentCell || fromElsewhere(event)) return;
    // Keys on a row's actions button are the menu button's own: ArrowDown opens
    // its menu there, and must not also move the active cell.
    if ((event.target as HTMLElement).closest('.crewlet-sheet-grid__row-actions')) return;
    // Keys inside the header's own sort control are the header cell's.
    const column = columns[current.col];
    const mod = isMod(event);

    if (mod && event.altKey && event.key.toLowerCase() === 'h') {
      if (onShowHistory && currentCell.rowId !== null) {
        event.preventDefault();
        onShowHistory({ rowId: currentCell.rowId, field: currentCell.field });
      }
      return;
    }
    if (mod && !event.altKey && event.key.toLowerCase() === 'z') {
      const handler = event.shiftKey ? onRedo : onUndo;
      if (handler) {
        event.preventDefault();
        handler();
      }
      return;
    }
    if (mod && !event.altKey && event.key.toLowerCase() === 'y') {
      if (onRedo) {
        event.preventDefault();
        onRedo();
      }
      return;
    }
    if (mod && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      if (rows.length === 0) return;
      setAnchor(cellAt({ row: 0, col: 0 }));
      setActive(cellAt({ row: rows.length - 1, col: columns.length - 1 }));
      focusCell();
      return;
    }

    if (rowActions && currentCell.rowId !== null && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
      event.preventDefault();
      setRowMenu(currentCell.rowId);
      return;
    }

    const moved = moveFrom(current, event, { rows: rows.length, cols: columns.length, page });
    if (moved) {
      event.preventDefault();
      const extend = event.shiftKey && moved.row !== HEADER && current.row !== HEADER;
      moveTo(cellAt(moved), extend);
      return;
    }

    if (event.key === 'Tab') {
      const step = event.shiftKey ? -1 : 1;
      const col = current.col + step;
      // The grid is one tab stop: Tab at the edge leaves it.
      if (col < 0 || col >= columns.length) return;
      event.preventDefault();
      moveTo(cellAt({ row: current.row, col }));
      return;
    }

    if (current.row === HEADER) {
      if ((event.key === 'Enter' || event.key === ' ') && column && columnSettings) {
        event.preventDefault();
        setOpenColumn(column.field);
      } else if ((event.key === 'Enter' || event.key === ' ') && column && onSortChange) {
        event.preventDefault();
        onSortChange(nextSort(sort, column.field));
      }
      return;
    }

    switch (event.key) {
      case 'Enter':
      case 'F2':
        event.preventDefault();
        if (event.key === 'Enter' && mod && column?.type === 'url') {
          const row = rows[current.row];
          const url = row ? normalizeValue(column, row.values[column.field]) : null;
          if (typeof url === 'string' && url) {
            if (onOpenLink) onOpenLink(url);
            else window.open(url, '_blank', 'noopener,noreferrer');
          }
          return;
        }
        if (column?.type === 'checkbox') toggle(currentCell);
        else beginEdit(currentCell);
        return;
      case ' ':
        event.preventDefault();
        if (column?.type === 'checkbox') toggle(currentCell);
        else if (column && takesTyping(column.type)) beginEdit(currentCell, ' ');
        return;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        clearRange();
        return;
      case 'Escape':
        if (anchor && range && (range.top !== range.bottom || range.left !== range.right)) {
          event.preventDefault();
          setAnchor(currentCell);
        }
        return;
      default:
        break;
    }

    if (isTypingKey(event) && column) {
      if (column.type === 'rating' && /^\d$/.test(event.key)) {
        event.preventDefault();
        if (!cellEditable(column)) {
          say(editable ? labels.readOnly(column.label) : labels.forbidden);
          return;
        }
        const stars = Number(event.key);
        const row = rows[current.row];
        if (!row) return;
        if (stars > ratingMax(column)) {
          refuseLocally([{ rowId: row.id, field: column.field, error: labels.notARating(column.label, ratingMax(column)) }]);
          return;
        }
        emit([{ rowId: row.id, field: column.field, value: stars === 0 ? null : stars }]);
        return;
      }
      if (takesTyping(column.type)) {
        event.preventDefault();
        beginEdit(currentCell, column.type === 'date' ? undefined : event.key);
      }
    }
  };

  /* ----- pointer --------------------------------------------------------- */

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const onCellMouseDown = (event: ReactMouseEvent, cell: ActiveCell) => {
    if (event.button !== 0) return;
    const extend = event.shiftKey && cell.rowId !== null && currentCell?.rowId !== null;
    if (!(editing && editing.rowId === cell.rowId && editing.field === cell.field)) moveTo(cell, extend);
    dragging.current = cell.rowId !== null;
  };

  const onCellMouseEnter = (cell: ActiveCell) => {
    if (!dragging.current || cell.rowId === null) return;
    setActive(cell);
  };

  /* ----- drawing --------------------------------------------------------- */

  const [first, last] = visibleRows(Math.max(scrollTop - headerHeight, 0), viewport, rowHeight, rows.length);
  const drawn: number[] = [];
  for (let index = first; index <= last; index += 1) drawn.push(index);
  if (current && current.row >= 0 && (current.row < first || current.row > last)) drawn.push(current.row);
  if (editing) {
    const at = rowIndex.get(editing.rowId);
    if (at !== undefined && !drawn.includes(at)) drawn.push(at);
  }

  const describedId = `${id}-described`;
  const helpId = `${id}-help`;
  const activeColumn = current ? columns[current.col] : undefined;
  const activeRecord = current && current.row >= 0 ? rows[current.row] : undefined;
  const others = activeRecord && activeColumn ? (onCells.get(cellKey(activeRecord.id, activeColumn.field)) ?? []) : [];
  const description =
    activeRecord && activeColumn ? cellDescription(activeColumn, withLocal(activeRecord, local, activeColumn.field), others, context, said) : '';

  const style = {
    '--crewlet-sheet-columns': template,
    '--crewlet-sheet-row-height': `${rowHeight}px`,
    width: `${totalWidth}px`,
  } as CSSProperties;

  // Content height: the header, every row, and the scroller's own two
  // hairlines, so the last row's bottom edge is the scroller's.
  const contentHeight = headerHeight + rows.length * rowHeight + 2;
  const scrollerStyle: CSSProperties | undefined =
    fit === 'content'
      ? ({
          height: `${height !== undefined ? Math.min(contentHeight, height) : contentHeight}px`,
          '--crewlet-sheet-content-height': `${contentHeight}px`,
        } as CSSProperties)
      : height !== undefined
        ? { height: `${height}px` }
        : undefined;

  const side = (rowAt: number): 'below' | 'above' => {
    const top = headerHeight + rowAt * rowHeight - scrollTop;
    const view = viewport > 0 ? viewport : rowHeight * 12;
    return editorSide(top, top + rowHeight, headerHeight, view, rowHeight * 8);
  };

  return (
    <div className={cx('crewlet-sheet-grid', mode === 'read' && 'crewlet-sheet-grid--read', fit === 'content' && 'crewlet-sheet-grid--fit-content', className)}>
      <div ref={probe} className="crewlet-sheet-grid__probe" aria-hidden="true" />
      <div
        ref={scroller}
        className={cx('crewlet-sheet-grid__scroller', scrolledAcross && 'crewlet-sheet-grid__scroller--across', addsColumns && 'crewlet-sheet-grid__scroller--add-column')}
        style={scrollerStyle}
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
          setScrolledAcross(event.currentTarget.scrollLeft > 0);
        }}
      >
        <div
          ref={grid}
          role="grid"
          aria-label={label}
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length + 1}
          aria-readonly={!editable || undefined}
          aria-multiselectable="true"
          aria-describedby={helpId}
          tabIndex={-1}
          className={cx('crewlet-sheet-grid__grid', range && (range.top !== range.bottom || range.left !== range.right) && 'crewlet-sheet-grid__grid--range')}
          style={style}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
        >
          <div role="rowgroup" className="crewlet-sheet-grid__head">
            <div role="row" aria-rowindex={1} className="crewlet-sheet-grid__row crewlet-sheet-grid__row--head">
              <div role="columnheader" aria-colindex={1} className={cx('crewlet-sheet-grid__corner', lastFrozen < 0 && 'crewlet-sheet-grid__frozen-edge')}>
                <VisuallyHidden>{labels.rowHeader}</VisuallyHidden>
              </div>
              {columns.map((column, col) => {
                const position = { row: HEADER, col };
                const isActive = current?.row === HEADER && current.col === col;
                const sorted = sort?.field === column.field ? sort.direction : undefined;
                const here = onColumns.get(column.field) ?? [];
                const header = (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys reach the grid's own handler, which sorts or opens the column's settings on Enter and Space
                  <div
                    key={column.field}
                    id={cellDomId(id, position)}
                    role="columnheader"
                    aria-colindex={col + 2}
                    aria-sort={sorted ?? (onSortChange ? 'none' : undefined)}
                    tabIndex={isActive ? 0 : -1}
                    className={cx(
                      'crewlet-sheet-grid__header',
                      `crewlet-sheet-grid__header--${column.type}`,
                      column.frozen && 'crewlet-sheet-grid__cell--frozen',
                      col === lastFrozen && 'crewlet-sheet-grid__frozen-edge',
                      isActive && 'crewlet-sheet-grid__header--active',
                      columnSettings && 'crewlet-sheet-grid__header--settings',
                      openColumn === column.field && 'crewlet-sheet-grid__header--open',
                    )}
                    style={column.frozen ? { insetInlineStart: `${offsets[col]}px` } : undefined}
                    onMouseDown={(event) => {
                      if (!fromElsewhere(event)) onCellMouseDown(event, { rowId: null, field: column.field });
                    }}
                    onFocus={(event) => {
                      if (event.target === event.currentTarget) onCellFocus({ rowId: null, field: column.field });
                    }}
                    onClick={(event) => {
                      if (fromElsewhere(event)) return;
                      if (columnSettings) setOpenColumn(openColumn === column.field ? null : column.field);
                      else if (onSortChange) onSortChange(nextSort(sort, column.field));
                    }}
                    // The whole name, which a narrow column cuts short.
                    title={columnSettings ? labels.columnSettings(column.label) : onSortChange ? labels.sortBy(column.label) : column.label}
                  >
                    <span className="crewlet-sheet-grid__header-label">{column.label}</span>
                    <VisuallyHidden>{`, ${labels.types[column.type]}`}</VisuallyHidden>
                    {sorted ? (
                      <span className="crewlet-sheet-grid__sort" aria-hidden="true">
                        {sorted === 'ascending' ? <ArrowUpGlyph size="xs" /> : <ArrowDownGlyph size="xs" />}
                      </span>
                    ) : null}
                    {here.length > 0 ? (
                      <span className="crewlet-sheet-grid__header-presence" aria-hidden="true">
                        {here.map((entry) => (
                          <Avatar key={entry.id} name={entry.name} kind={entry.kind} size={16} decorative className={cx('crewlet-sheet-grid__header-badge', presenceHueClass(entry.hue))} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                );
                return columnSettings ? (
                  <Popover
                    key={column.field}
                    label={labels.columnSettings(column.label)}
                    open={openColumn === column.field}
                    onOpenChange={(open) => {
                      if (!open && openColumn === column.field) setOpenColumn(null);
                    }}
                    trigger={() => header}
                    className="crewlet-sheet-grid__column-settings"
                  >
                    {(close) => renderColumnEditor(column, close)}
                  </Popover>
                ) : (
                  header
                );
              })}
            </div>
          </div>
          <div role="rowgroup" className="crewlet-sheet-grid__body" style={{ height: `${rows.length * rowHeight}px` }}>
            {drawn.map((index) => {
              const row = rows[index]!;
              const rowPresence = onRows.get(row.id);
              const rowNameId = `${id}-r${index}-name`;
              const rowSelected = range !== null && index >= range.top && index <= range.bottom;
              const actionsLabel = labels.rowActions(index + 1);
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={index + 2}
                  className="crewlet-sheet-grid__row"
                  style={{ top: `${index * rowHeight}px` }}
                  data-row-id={row.id}
                >
                  {/* THE GUTTER: the row's number, centred in a fixed width
                      and in tabular figures, and, where the host takes row
                      actions, the actions button drawn in the same place. The
                      button is always there, so a tap on the number opens the
                      menu where there is no pointer to hover with; it shows,
                      and the number gives way to it, under the pointer, on the
                      row holding focus and while the menu is open (see
                      SheetGrid.css). The row header is named by the row alone,
                      not by the button inside it. */}
                  <div
                    role="rowheader"
                    aria-colindex={1}
                    aria-labelledby={rowNameId}
                    className={cx(
                      'crewlet-sheet-grid__rownum',
                      lastFrozen < 0 && 'crewlet-sheet-grid__frozen-edge',
                      rowActions && 'crewlet-sheet-grid__rownum--actions',
                      rowSelected && 'crewlet-sheet-grid__rownum--selected',
                      rowMenu === row.id && 'crewlet-sheet-grid__rownum--open',
                      rowPresence && 'crewlet-sheet-grid__rownum--present',
                      rowPresence && presenceHueClass(rowPresence.hue),
                    )}
                  >
                    <span className="crewlet-sheet-grid__rownum-number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <VisuallyHidden id={rowNameId}>{rowName(columns, row, index, context)}</VisuallyHidden>
                    {rowActions ? (
                      <span className="crewlet-sheet-grid__row-actions">
                        <Menu
                          label={actionsLabel}
                          triggerTabIndex={-1}
                          open={rowMenu === row.id}
                          onOpenChange={(open) => setRowMenu(open ? row.id : null)}
                          renderTrigger={(trigger) => (
                            // Lined up with the button's leading edge: the gutter is the
                            // grid's first column, and a centred tip hung past the grid.
                            <Tooltip content={actionsLabel} align="start">
                              {/* The tooltip carries the name; a native one beside it is a second tip. */}
                              <IconButton {...trigger} label={actionsLabel} icon={<EllipsisGlyph />} size="sm" title="" />
                            </Tooltip>
                          )}
                          items={[
                            {
                              key: 'delete',
                              label: labels.deleteRow,
                              icon: <TrashGlyph size="sm" />,
                              danger: true,
                              onSelect: () => onDeleteRow?.(row.id),
                            },
                          ]}
                        />
                      </span>
                    ) : null}
                  </div>
                  {columns.map((column, col) => {
                    const position = { row: index, col };
                    const key = cellKey(row.id, column.field);
                    const isActive = current?.row === index && current.col === col;
                    const selected = range ? inRange(range, index, col) : false;
                    const pending = row.pending?.includes(column.field) ?? false;
                    const refused = row.refused?.[column.field] ?? local.get(key);
                    const change = row.changed?.[column.field];
                    const value = normalizeValue(column, row.values[column.field]);
                    const people = onCells.get(key);
                    const lead = people?.[0];
                    const isEditing = editing?.rowId === row.id && editing.field === column.field;
                    const history = isActive && onShowHistory !== undefined && !isEditing;
                    return (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys reach the grid's own handler, which toggles on Space and Enter
                      <div
                        key={column.field}
                        id={cellDomId(id, position)}
                        role="gridcell"
                        aria-colindex={col + 2}
                        aria-selected={selected}
                        aria-readonly={!cellEditable(column) || undefined}
                        aria-describedby={isActive ? describedId : undefined}
                        tabIndex={isActive && !isEditing ? 0 : -1}
                        className={cx(
                          'crewlet-sheet-grid__cell',
                          `crewlet-sheet-grid__cell--${column.type}`,
                          column.frozen && 'crewlet-sheet-grid__cell--frozen',
                          col === lastFrozen && 'crewlet-sheet-grid__frozen-edge',
                          selected && 'crewlet-sheet-grid__cell--selected',
                          isActive && 'crewlet-sheet-grid__cell--active',
                          pending && 'crewlet-sheet-grid__cell--pending',
                          refused !== undefined && 'crewlet-sheet-grid__cell--refused',
                          isEditing && 'crewlet-sheet-grid__cell--editing',
                          history && 'crewlet-sheet-grid__cell--history',
                          lead && 'crewlet-presence-ring',
                          lead && presenceHueClass(lead.hue),
                          lead && (lead.idle ? 'crewlet-presence-ring--idle' : null),
                        )}
                        style={column.frozen ? { insetInlineStart: `${offsets[col]}px` } : undefined}
                        onMouseDown={(event) => onCellMouseDown(event, { rowId: row.id, field: column.field })}
                        onFocus={(event) => {
                          if (event.target === event.currentTarget) onCellFocus({ rowId: row.id, field: column.field });
                        }}
                        onMouseEnter={() => onCellMouseEnter({ rowId: row.id, field: column.field })}
                        onDoubleClick={() => {
                          if (column.type !== 'checkbox') beginEdit({ rowId: row.id, field: column.field });
                        }}
                        onClick={(event) => {
                          if (column.type === 'checkbox' && (event.target as HTMLElement).closest('.crewlet-sheet-cell__check')) {
                            toggle({ rowId: row.id, field: column.field });
                          }
                        }}
                      >
                        <span className="crewlet-sheet-grid__value">
                          <CellDisplay column={column} value={value} context={context} onOpenLink={onOpenLink} />
                        </span>
                        {refused !== undefined ? (
                          <span className="crewlet-sheet-grid__refused" aria-hidden="true">
                            <CircleAlertGlyph size="xs" />
                          </span>
                        ) : null}
                        {change ? (
                          <ChangeMark
                            by={change.by}
                            at={change.at}
                            previous={hasPrevious(change) ? displayText(column, normalizeValue(column, change.previous), context) || null : null}
                            locale={locale}
                            labels={labels}
                          />
                        ) : null}
                        {people && lead ? (
                          <CursorFlag name={flagText(people)} hue={lead.hue} kind={lead.kind} editing={people.some((entry) => entry.editing)} />
                        ) : null}
                        {isActive && refused !== undefined && !isEditing ? (
                          <span className="crewlet-sheet-grid__message" aria-hidden="true">
                            {refused}
                          </span>
                        ) : null}
                        {history ? (
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            className="crewlet-sheet-grid__history"
                            title={labels.history}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => onShowHistory?.({ rowId: row.id, field: column.field })}
                          >
                            <RotateCcwClockGlyph size="xs" />
                          </button>
                        ) : null}
                        {isEditing ? (
                          <CellEditor
                            column={column}
                            value={value}
                            context={context}
                            seed={editing.seed}
                            label={`${column.label}, ${rowName(columns, row, index, context)}`}
                            side={side(index)}
                            conflict={conflict}
                            onCommit={(next, move) => endEdit(next, move)}
                            onCancel={() => endEdit(undefined, null)}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {addsColumns ? (
          // OUTSIDE THE GRID'S ROLES: a grid's rows hold cells only, so the
          // control stands beside the header row, sticks with it, and is its
          // own tab stop after the grid's.
          <div className="crewlet-sheet-grid__add-column" style={{ height: `${headerHeight}px` }}>
            <Tooltip content={labels.addColumn}>
              <IconButton label={labels.addColumn} icon={<PlusGlyph size="xs" />} size="sm" title="" onClick={onAddColumn} />
            </Tooltip>
          </div>
        ) : null}
      </div>
      {samples ? (
        <div ref={measurer} className="crewlet-sheet-grid__measure" aria-hidden="true" inert>
          {ordered
            .filter((column) => samples.has(column.field))
            .map((column) => (
              <div key={column.field} data-measure={column.field}>
                <div className={cx('crewlet-sheet-grid__header', `crewlet-sheet-grid__header--${column.type}`)}>
                  <span className="crewlet-sheet-grid__header-label">{column.label}</span>
                  {/* Room for the sort mark, which a sorted header draws beside its name. */}
                  {onSortChange ? (
                    <span className="crewlet-sheet-grid__sort">
                      <ArrowDownGlyph size="xs" />
                    </span>
                  ) : null}
                </div>
                {(samples.get(column.field) ?? []).map((value, index) => (
                  <div key={index} className={cx('crewlet-sheet-grid__cell', `crewlet-sheet-grid__cell--${column.type}`)}>
                    <span className="crewlet-sheet-grid__value">
                      <CellDisplay column={column} value={value} context={context} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      ) : null}
      <VisuallyHidden id={describedId}>{description}</VisuallyHidden>
      <VisuallyHidden id={helpId}>
        {[labels.keyboardHelp, rowActions ? labels.rowActionsHelp : '', columnSettings ? labels.columnSettingsHelp : ''].filter(Boolean).join(' ')}
      </VisuallyHidden>
      <VisuallyHidden>
        <span role="status" aria-live="polite">
          <span key={announcement.n}>{announcement.text}</span>
        </span>
      </VisuallyHidden>
      {onAddRow || sync ? (
        <div className="crewlet-sheet-grid__foot">
          {onAddRow && editable ? (
            <Button size="small" variant="ghost" onClick={onAddRow} leadingIcon={<PlusGlyph size="sm" />}>
              {labels.addRow}
            </Button>
          ) : null}
          {sync ? (
            <span
              className={cx(
                'crewlet-sheet-grid__sync',
                ((sync.failed ?? 0) > 0 || (!sync.offline && (sync.refused ?? 0) > 0)) && 'crewlet-sheet-grid__sync--failed',
              )}
            >
              <span>{labels.sync(sync)}</span>
              {(sync.failed ?? 0) > 0 && onRetry ? (
                <Button size="small" variant="ghost" onClick={onRetry}>
                  {labels.retry}
                </Button>
              ) : null}
              {(sync.failed ?? 0) === 0 && (sync.refused ?? 0) > 0 && onDismissRefused ? (
                <Button size="small" variant="ghost" onClick={onDismissRefused}>
                  {labels.dismiss}
                </Button>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Whether an event reached the grid through React's tree from somewhere else
 * in the document: a column's settings popover is portalled out of the grid,
 * and its keys, pastes and presses still bubble here. They are the popover's.
 */
function fromElsewhere(event: { currentTarget: EventTarget; target: EventTarget }): boolean {
  return !(event.currentTarget as Node).contains(event.target as Node);
}

/** A cell's DOM id: the header row is row -1. */
function cellDomId(grid: string, position: SheetPosition): string {
  return `${grid}-r${position.row < 0 ? 'h' : position.row}-c${position.col}`;
}

/** A row with the grid's own refusal of one cell folded in, for the cell's description. */
function withLocal(row: SheetRow, local: LocalRefusals, field: string): SheetRow {
  const refusal = local.get(cellKey(row.id, field));
  if (refusal === undefined || row.refused?.[field] !== undefined) return row;
  return { ...row, refused: { ...row.refused, [field]: refusal } };
}
