/**
 * A hierarchy as rows and columns: the view a keyboard or a screen reader user
 * works fastest in, and the one a narrow screen falls back to.
 *
 * A TREEGRID, NOT A TREE. Every row says its level, position and expansion
 * like a treeitem, and its cells are navigable like a grid's. A row holds
 * focus by default and its keys act on the node (Enter activates, Delete or
 * Backspace removes, the ContextMenu key or Shift+F10 opens its actions);
 * Right opens a closed row or steps into its cells, Left steps back out,
 * closes the row or climbs to its parent, Up and Down keep the column. A cell
 * holding a control focuses the control itself, so what the cell does is one
 * Enter away, and the grid's one tab stop is wherever focus is: a press that
 * opens a cell's menu moves it to that cell, and the row's chevron, which is
 * pointer only and hidden from assistive technology, takes no focus at all.
 *
 * NAVIGATION KEYS ARE CAPTURED, so they reach the grid before the control that
 * holds focus in a cell: ArrowDown on a menu button would otherwise open the
 * menu instead of moving to the next row. An open menu keeps its keys because
 * it is in no row: it renders in the layer over the grid, and React carries
 * its keys up through this handler with a target no row contains.
 *
 * THE MENUS OPEN OVER THE GRID, NOT INSIDE IT. The grid scrolls sideways at
 * narrow widths, and a box that scrolls on one axis clips on both, so a menu
 * drawn under its trigger in the last rows would be cut off and would scroll
 * the grid down instead of opening. The frame publishes a LayerHost over the
 * scroller, and a sideways scroll tells that layer so an open surface follows
 * its trigger or closes with it.
 *
 * Ported from the generic half of the engine dashboard's org builder outline.
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { breakpoint } from '@crewlethq/tokens';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { Checkbox } from '../Checkbox/index.js';
import {
  GRID_FOOT_LABELS,
  GRID_ICON_TRACK,
  GridFoot,
  GridHeadCell,
  alignOf,
  droppedNames,
  headerWord,
  nextGridSort,
  overrunning,
  parseGridSort,
  sortByValue,
  squeezedCells,
  type GridAlign,
  type GridFootLabels,
} from '../DataGrid/parts.js';
// The grid's own entry, so DataGrid's stylesheet (the head and foot this grid draws) comes with it.
import { fitGridColumns, type GridFit } from '../DataGrid/index.js';
import { EmptyState } from '../EmptyState/index.js';
import { LAYER_REPOSITION_EVENT, LayerHost, focusables } from '../Layer/index.js';
import { LayerNodeBridge } from '../Canvas/layerNode.js';
import { IconButton } from '../IconButton/index.js';
import { useMediaMatch } from '../MediaMatch/index.js';
import {
  treeExpandable,
  treeItemAction,
  treeLevel,
  treeNext,
  treePosInSet,
  treePrevious,
  treeSetSize,
  treeStep,
  useTreeState,
  type TreeDefaultExpanded,
  type TreeInput,
  type TreeItemAction,
  type TreeModel,
  type TreeViewHandle,
} from '../Tree/index.js';
import { cx } from '../utils/cx.js';
import { tableTrack } from '../utils/tableTrack.js';

export interface TreeGridColumn {
  key: string;
  /** The column's name: a word, or a glyph named by `label`. */
  header: ReactNode;
  /**
   * Read but not seen, for a column whose heading would be noise in the sight
   * of it and is still the only thing a screen reader has (an actions column).
   */
  headerHidden?: boolean | undefined;
  /**
   * The value a row is ordered by among its SIBLINGS, never across parents:
   * the hierarchy stays the order, and a sort orders each level of it.
   */
  sortValue?: ((id: string) => string | number | null | undefined) | undefined;
  /**
   * Whether the head is a sort button. Defaults to whether `sortValue` is set;
   * a `serverSorted` grid sets it alone, its source ordering each level.
   */
  sortable?: boolean | undefined;
  /**
   * Which edge the column's values and its head share, as a DataGrid column's:
   * `right` for figures, times and dates, `center` for one mark per row.
   */
  align?: GridAlign | undefined;
  /** A column of ONE MARK per row: a fixed track, its head and cells centred. Name it with `label`. */
  icon?: boolean | undefined;
  /** The column's name where `header` cannot carry one: a glyph head, a hidden one, the phone's card. */
  label?: string | undefined;
  /**
   * A column of ROW CONTROLS that name themselves: its head is read but not
   * seen, it never sorts, and a phone's card draws no name beside it.
   */
  action?: boolean | undefined;
  /**
   * An exact track, in place of the default flexible one. A column whose values a
   * live push changes takes a length: the track list is the whole table's, so a
   * content-sized track moves every column after it when its widest value changes.
   */
  width?: string | undefined;
  /**
   * Shrink to content, up to a fifth of the grid (`fit-content(20%)`), for a
   * column of values that hold still. One track list serves the header and every
   * row, so the track is sized by all of them together.
   */
  shrink?: boolean | undefined;
  /**
   * The narrowest a flexible column may be drawn: its track is
   * `minmax(floor, 1fr)` rather than `minmax(0, 1fr)`. For the column that is
   * the point of the list, which at zero gave way to every column beside it.
   */
  floor?: string | undefined;
  /**
   * The order this column GIVES WAY in when the grid cannot draw every column
   * at its size, as a DataGrid column's: the lowest number goes first, a
   * column without one never goes, and the foot names what went.
   */
  drop?: number | undefined;
  /** Hidden unless the column set (`cols`) names it. */
  optional?: boolean | undefined;
  /**
   * The grid's own width, in CSS pixels, below which this column is left out
   * with its header. A cell's words can then move into another column's.
   *
   * @deprecated Use `drop`, which gives way by measurement and says so in the
   * foot; a pixel width says nothing to the reader.
   */
  hideBelow?: number | undefined;
  /**
   * `sm` draws the column's values a step smaller, in the 11px of the caption
   * under a name, for values read after the row's name. `md` is the grid's own.
   */
  size?: 'md' | 'sm' | undefined;
}

/** A row that holds only controls, such as an inline Add row. */
export interface TreeGridAddRow {
  /** The row's accessible name, since its cells are all controls: "Add to Platform". */
  label: string;
  /** How many cells it has, which is what End and Right count to. */
  cells: number;
}

/** A select box before each row's name, after its indent: see [TreeGridProps.selection]. */
export interface TreeGridSelection {
  /**
   * Whether a row is picked: `true`, `false`, `'mixed'` for a group only some
   * of whose rows are picked, or `null` for a row with no box.
   */
  checked: (id: string) => boolean | 'mixed' | null;
  /** The box's accessible name: "Select Product Lead", "Select every agent in Engineering". */
  label: (id: string) => string;
  /** A press on a row's box, with the state it asks for. */
  onCheckedChange: (id: string, checked: boolean) => void;
}

/** What a cell needs from the grid it is drawn in. */
export interface TreeGridContext {
  expanded(id: string): boolean;
  expandable(id: string): boolean;
  toggle(id: string): void;
  /**
   * Whether this cell holds the grid's one tab stop. A control in a cell takes
   * `tabIndex` from it; a cell with no control takes the stop itself.
   */
  tabStop(id: string, column: number): boolean;
  /** Says a press opened a control in this cell, so the tab stop follows focus into it. */
  opened(id: string, column: number): void;
  /**
   * The props that make a press anywhere in a pointer-only strip land on the
   * row rather than on the control it hit.
   */
  press(id: string): { onMouseDown(event: MouseEvent<HTMLElement>): void };
  menuOpen(id: string): boolean;
  setMenuOpen(id: string, open: boolean): void;
  /** The key of the column drawn at this one based position, which moves as columns are left out. */
  columnKey(column: number): string | undefined;
  /** Whether the column with this key is drawn at the grid's width (`drop`, `hideBelow`, `cols`). */
  shown(key: string): boolean;
  /** The hierarchy AS DRAWN, each level in the order in force: a drawing that follows it (wires) reads this. */
  tree: TreeModel;
}

/** Every string the grid renders on its own. */
export interface TreeGridLabels extends GridFootLabels {
  /** The pointer-only chevron's tooltip, given the row's own label. */
  expand: (label: string) => string;
  collapse: (label: string) => string;
}

const LABELS: TreeGridLabels = {
  ...GRID_FOOT_LABELS,
  expand: (label) => `Expand ${label}`,
  collapse: (label) => `Collapse ${label}`,
};

const NO_DROPS: readonly string[] = [];
const NO_FIT: GridFit = { set: '', width: 0, dropped: NO_DROPS };

/** Whether a press on a column's head sorts: see [TreeGridColumn.sortable]. */
function sortsBy(column: TreeGridColumn): boolean {
  return !column.action && (column.sortable ?? column.sortValue !== undefined);
}

/**
 * The forest with every level ordered by `get`, its pinned rows (an add row,
 * a "more" row) kept last in their level in their own order. PURE, and it
 * never moves a row to another parent: a sort orders siblings.
 */
export function sortTreeLevels(
  forest: readonly TreeInput[],
  get: (id: string) => string | number | null | undefined,
  desc: boolean,
  pinned: (id: string) => boolean = () => false,
): TreeInput[] {
  const level = (nodes: readonly TreeInput[]): TreeInput[] => {
    const rows = nodes.filter((node) => !pinned(node.id));
    const pins = nodes.filter((node) => pinned(node.id));
    return [...sortByValue(rows, (node) => get(node.id), desc), ...pins].map((node) =>
      node.children && node.children.length > 0 ? { ...node, children: level(node.children) } : node,
    );
  };
  return level(forest);
}

/** Every id in pre-order: the drawn order's identity, for keeping a sorted forest stable. */
function orderOf(forest: readonly TreeInput[]): string {
  const ids: string[] = [];
  const walk = (node: TreeInput) => {
    ids.push(node.id);
    node.children?.forEach(walk);
  };
  forest.forEach(walk);
  return ids.join('\u0000');
}

/**
 * The control a cell hands its tab stop to: the first focusable element in it
 * that is not hidden from assistive technology. The chevron is hidden, which
 * is what keeps it out of this answer.
 *
 * WHAT COUNTS AS FOCUSABLE IS THE LAYER STACK'S ANSWER, not a list of the
 * elements a grid happens to hold today. A cell whose control is a link, an
 * input, a chooser or an element made focusable with `tabindex` is a cell the
 * grid has to step into as readily as one holding a menu trigger, and a
 * control it could not find would leave the stop on the cell with nothing for
 * Enter to do. A second selector here would be a second idea of what a
 * keyboard reaches, disagreeing with the trap about a disabled button.
 */
function controlIn(cell: HTMLElement): HTMLElement | null {
  return focusables(cell).find((el) => !el.closest('[aria-hidden="true"]')) ?? null;
}

/** The input types a person types a line of text into, whose caret the arrows move. */
const TEXT_INPUTS = new Set(['text', 'search', 'url', 'email', 'tel', 'password', 'number']);

/**
 * Whether `key` moves the caret of the text field that holds focus, which then
 * keeps it: Left, Right, Home and End in any text field, and Up and Down only
 * in one of several lines.
 */
function caretKey(target: HTMLElement, key: string): boolean {
  const lines = target instanceof HTMLTextAreaElement || target.isContentEditable;
  const field = lines || (target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type));
  if (!field) return false;
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') return true;
  return lines && (key === 'ArrowUp' || key === 'ArrowDown');
}

export interface TreeGridProps {
  /** The accessible name of the grid, such as "Organization outline". */
  label: string;
  columns: readonly TreeGridColumn[];
  /**
   * The hierarchy: every row, nested. An add row is one of these too.
   *
   * Keep it stable across renders (a `useMemo` over what it is derived from).
   * A fresh array each render rebuilds the model, and with it the visible
   * order, on every push a parent takes.
   */
  rows: readonly TreeInput[];
  /**
   * Draws one cell. `column` is its one based position, which is also its
   * `aria-colindex`; columns left out (`cols`, `drop`) move it, so a caller
   * reads which column it is with `grid.columnKey(column)`. The first cell is
   * drawn after the chevron strip, inside the same cell.
   */
  renderCell: (id: string, column: number, grid: TreeGridContext) => ReactNode;
  /**
   * Draws the row's level in its first cell, after the chevron and before the
   * select box and the caller's content, in place of the cell's own indent: a
   * drawing of the hierarchy (an org table's wires). Left out, the first cell
   * is indented by the row's level.
   */
  renderIndent?: ((id: string, grid: TreeGridContext) => ReactNode) | undefined;
  /**
   * Whether a cell holds a control that takes the grid's tab stop for itself
   * (a menu trigger, a chooser, a button). It is asked per row as well as per
   * column, because one column often holds a control on some rows and plain
   * text on others. `key` is the drawn column's own key.
   */
  cellHasControl?: ((id: string, column: number, key: string) => boolean) | undefined;
  /**
   * Carries out Enter (activate) or Delete and Backspace (remove) on a row.
   * Return false when the row has no such action, so the key travels on (to
   * the row's link, where it has one).
   *
   * Called only while the ROW itself holds focus, never from inside a cell,
   * and never on an add row. The Menu key is not here: which menu is open is
   * this component's state, so it opens the row's own menu itself when
   * `hasRowMenu` says there is one.
   */
  onRowKey?: ((id: string, action: Exclude<TreeItemAction, 'menu'>) => boolean) | undefined;
  /**
   * Any other key the caller claims on a row, such as Alt with an arrow to
   * reorder it. Asked FIRST, while the row itself holds focus, and never on an
   * add row; return true when it was handled, and the grid swallows the key.
   */
  onRowKeyDown?: ((id: string, event: KeyboardEvent<HTMLElement>) => boolean) | undefined;
  /** Whether a row has a menu the ContextMenu key and Shift+F10 can open. */
  hasRowMenu?: ((id: string) => boolean) | undefined;
  /**
   * Whether a row is an add row, and what it is called. An add row is a row of
   * the grid like any other, so it counts in its siblings' position and set
   * size; it just holds controls rather than a node's own data. A sort keeps
   * it last in its level.
   */
  addRow?: ((id: string) => TreeGridAddRow | null) | undefined;
  /** The selected row, drawn as `aria-selected`. */
  selectedId?: string | null | undefined;
  /**
   * Selection follows focus. Called with every row focus reaches except an add
   * row, which names no node.
   */
  onSelect?: ((id: string) => void) | undefined;
  /**
   * A select box before each row's name, after its indent, in a slot every row
   * keeps so the names stay in line whichever rows have a box. The box is a
   * control in the first cell, so that cell hands its tab stop to it.
   */
  selection?: TreeGridSelection | undefined;
  /**
   * The row's object's page: a real link stretched over the row, as a
   * DataGrid row's, so a new tab and copying it work. Enter on the row follows
   * it where `onRowKey` does not take the key, and a modified Enter opens it
   * elsewhere. The row itself stays the keyboard's way in.
   */
  rowHref?: ((id: string) => string | undefined) | undefined;
  /** A failed row, marked on its edge as a DataGrid's. Its cells say why. */
  isFailed?: ((id: string) => boolean) | undefined;
  /** Sets `aria-readonly`: the rows can be read and navigated but not edited. */
  readOnly?: boolean | undefined;
  /**
   * Which rows start open while the grid holds its own expansion: every one
   * (the default), or none, for a hierarchy whose levels are read on demand.
   */
  defaultExpanded?: TreeDefaultExpanded | undefined;
  /**
   * The open rows, when the caller holds them: to keep them across a visit,
   * or to read a level the moment it opens. A row in the set with no children
   * yet is ignored, so a level still loading can be held open.
   */
  expanded?: ReadonlySet<string> | undefined;
  /** The open rows a toggle has just produced, whether or not the caller holds them. */
  onExpandedChange?: ((expanded: ReadonlySet<string>) => void) | undefined;
  /**
   * The sort as `key` or `-key`, empty for the hierarchy's own order, which is
   * the default: no head is marked while it is in force. A sort orders each
   * row's children among themselves and never moves a row to another parent.
   * Controlled, as a DataGrid's.
   */
  sort?: string | undefined;
  /** The order each level takes while `sort` is empty, drawn on its head. Empty for the tree's own order. */
  defaultSort?: string | undefined;
  /** A sortable head pressed: ascending, descending, then back to the default (`''`). */
  onSortChange?: ((sort: string) => void) | undefined;
  /** Each level arrives ordered by its source; the grid marks the head and reorders nothing. */
  serverSorted?: boolean | undefined;
  /** The column set as `key,key`, in the order to draw it; empty for every column not `optional`. */
  cols?: string | undefined;
  /** The way back from a column set: drawn as "Show every column" while one is set. */
  onColsChange?: ((cols: string) => void) | undefined;
  /** What an empty grid says, and the one control that is its next step. */
  empty?: { title: ReactNode; hint?: ReactNode; icon?: ReactNode; action?: ReactNode } | undefined;
  /** The caller's words under the rows, beside what the width dropped and what is loaded. */
  footer?: ReactNode;
  /** "40 of 312 loaded". */
  loadedNote?: string | undefined;
  onLoadMore?: (() => void) | undefined;
  /**
   * HOW A ROW IS DRAWN WHERE COLUMNS DO NOT FIT (a phone, or a grid whose
   * give-way columns have all gone): `labelled`, a line per value under the
   * row's name, or `compact`, the name then its values on one line. Left out,
   * the grid keeps its columns and scrolls sideways (`layout="scroll"`).
   */
  phoneRows?: 'labelled' | 'compact' | undefined;
  /** The grid is a card's body: no frame of its own, the card's inset at its edges. */
  flush?: boolean | undefined;
  /**
   * The column names are READ BUT NOT SEEN: an outline whose cells say what
   * they are in the sight of them (a title, a face, a time) and want no
   * header band above them. A screen reader still hears every cell's column,
   * because the header row is still there; only its band is not drawn.
   */
  headless?: boolean | undefined;
  /**
   * `scroll` (the default) keeps a minimum width and scrolls sideways below
   * it. `container` never scrolls sideways: it fills its container, leaves out
   * the columns its width cannot hold (`drop`), and its header holds at the
   * top of the page's scroll as the rows pass under it.
   */
  layout?: 'scroll' | 'container' | undefined;
  /** The grid's own width, in CSS pixels, as it is measured and whenever it changes. */
  onWidthChange?: ((width: number) => void) | undefined;
  labels?: Partial<TreeGridLabels> | undefined;
  ref?: Ref<TreeViewHandle> | undefined;
  className?: string | undefined;
}

/**
 * A hierarchy on DataGrid's terms: the same head (sort buttons, marks, edges,
 * plain heads), the same give-way columns and foot, the same row link and
 * failed edge, so a tree table reads and behaves like the list beside it.
 *
 * A SORT ORDERS SIBLINGS. The hierarchy is the answer a tree gives, so a sort
 * never lifts a row out of its parent: each level is ordered among itself,
 * an add row stays last in its level, and with no sort chosen the rows are in
 * the tree's own order with no head marked. The model is built over the
 * sorted forest, so a row's position, the keys and the wires follow what is
 * drawn.
 */
export function TreeGrid({
  label,
  columns,
  rows: forest,
  renderCell,
  renderIndent,
  cellHasControl,
  onRowKey,
  onRowKeyDown,
  hasRowMenu,
  addRow,
  selectedId = null,
  onSelect,
  selection,
  rowHref,
  isFailed,
  readOnly,
  defaultExpanded,
  expanded: held,
  onExpandedChange,
  sort: sortRaw = '',
  defaultSort = '',
  onSortChange,
  serverSorted = false,
  cols: colsRaw = '',
  onColsChange,
  empty,
  footer,
  loadedNote,
  onLoadMore,
  phoneRows,
  flush = false,
  headless = false,
  layout = 'scroll',
  onWidthChange,
  labels,
  ref,
  className,
}: TreeGridProps) {
  const text: TreeGridLabels = { ...LABELS, ...labels };

  // ---- the columns its own width holds ---------------------------------------
  // Measured before paint, so a narrow grid never flashes the columns it leaves
  // out. An unmeasured grid (0, as in a hidden panel) draws every column.
  const frame = useRef<HTMLDivElement>(null);
  const gridEl = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const reportWidth = useRef(onWidthChange);
  reportWidth.current = onWidthChange;
  const measures =
    onWidthChange !== undefined ||
    phoneRows !== undefined ||
    columns.some((one) => one.hideBelow !== undefined || one.drop !== undefined);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!measures || !el) return;
    const read = (next: number) => setWidth(Math.round(next));
    read(el.getBoundingClientRect().width);
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) read(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [measures]);
  useEffect(() => {
    if (width > 0) reportWidth.current?.(width);
  }, [width]);

  // THE COLUMN SET, as a DataGrid's: the reader's choice in the reader's
  // order, else every column that is not optional; then the pixel floors.
  const shownColumns = useMemo(() => {
    const asked = colsRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const picked = asked.map((key) => byKey.get(key)).filter((c): c is TreeGridColumn => !!c);
    const set = picked.length > 0 ? picked : columns.filter((c) => !c.optional);
    return set.filter((one) => one.hideBelow === undefined || width <= 0 || width >= one.hideBelow);
  }, [columns, colsRaw, width]);
  const shownKeys = shownColumns.map((c) => c.key).join(',');
  const [fit, setFit] = useState<GridFit>(NO_FIT);
  const phone = useMediaMatch(`(width < ${breakpoint.phone})`);
  // CARDS ONLY WHERE ASKED (`phoneRows`): a tree that keeps its columns
  // scrolls sideways below its minimum, as it always has.
  const stacked = phoneRows !== undefined && (phone || (fit.set === shownKeys && Boolean(fit.stacked)));
  const dropped = !stacked && fit.set === shownKeys ? fit.dropped : NO_DROPS;
  const drawn = useMemo(
    () => (dropped.length === 0 ? shownColumns : shownColumns.filter((c) => !dropped.includes(c.key))),
    [shownColumns, dropped],
  );

  // ---- the order -------------------------------------------------------------
  const sort = parseGridSort(sortRaw || defaultSort);
  const sortValue = sort && !serverSorted ? columns.find((c) => c.key === sort.key)?.sortValue : undefined;
  const pinned = (id: string) => addRow?.(id) != null;
  const sortedNow = sortValue && sort ? sortTreeLevels(forest, sortValue, sort.desc, pinned) : forest;
  // THE SAME ORDER IS THE SAME FOREST: a sort recomputed on every render (its
  // columns rebuilt by the caller) must not rebuild the model on every push.
  const drawnOrder = sortValue ? orderOf(sortedNow) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the forest and its drawn order are the identity
  const sorted = useMemo(() => sortedNow, [forest, drawnOrder]);
  const tree = useTreeState(sorted, selectedId, { defaultExpanded, expanded: held, onExpandedChange });
  const { model, expanded, rows, active, setActive, toggle } = tree;

  /** The column of the active row that holds focus; `null` when the row itself does. */
  const [column, setColumn] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Read through refs, so the callbacks below stay stable whatever a parent
  // re-renders: a grid of a few hundred rows re-creates none of them per push.
  const current = useRef({ addRow, onSelect });
  current.current = { addRow, onSelect };
  const isAddRow = (id: string) => current.current.addRow?.(id) ?? null;

  // ---- the fit -----------------------------------------------------------------
  // AFTER WHATEVER CAN CHANGE WHAT FITS, as a DataGrid's: the drop order goes
  // first, and a grid that still cannot draw its values stacks where it may.
  useLayoutEffect(() => {
    const el = gridEl.current;
    if (!el || phone || width <= 0) return;
    if (!drawn.some((one) => one.drop !== undefined) && phoneRows === undefined && fit.set === shownKeys) return;
    const current = fit.set === shownKeys ? fit : { ...NO_FIT, set: shownKeys };
    const head = el.querySelector(':scope > .crewlet-tree-grid__head > [role="row"]');
    const overrun = !current.stacked && overrunning(el, head);
    const squeeze = current.stacked
      ? null
      : squeezedCells(
          el.clientWidth,
          head ? [...head.children] : [],
          [
            ...el.querySelectorAll(
              ':scope > .crewlet-tree-grid__body > [role="row"]:not(.crewlet-tree-grid__row--add)',
            ),
          ],
          (row) => [...row.children],
          drawn,
        );
    const next = fitGridColumns({
      fit: current,
      width: el.clientWidth,
      overflows: overrun || squeeze !== null,
      stack: phoneRows !== undefined && (overrun || squeeze === 'values'),
      visible: drawn,
    });
    if (next !== null) setFit(next);
  }, [phone, fit, shownKeys, drawn, rows, width, phoneRows]);

  // ---- focus -----------------------------------------------------------------
  const rowEls = useRef(new Map<string, HTMLElement>());
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const rowRef = (id: string) => {
    let callback = refs.current.get(id);
    if (!callback) {
      callback = (el) => {
        if (el) rowEls.current.set(id, el);
        else rowEls.current.delete(id);
      };
      refs.current.set(id, callback);
    }
    return callback;
  };

  // A FOCUS REQUEST IS TAKEN BY THE RENDER IT CAUSES, AND BY NO OTHER. Focus
  // moves once the row it names is rendered (a row inside a node just opened,
  // a row an operation just added, a row a reorder just moved, which a browser
  // blurs as it moves it), so the request is state: each one is a new value,
  // so even a request for the row already active causes a render, and the
  // effect acts on that value once. A request held anywhere else would move no
  // focus when nothing else changed (an undo from a toolbar asking for its
  // node), then pull focus back to that row on whatever render came next,
  // wherever the operator had gone since.
  const [request, setRequest] = useState<{ readonly id: string; readonly column: number | null } | null>(null);
  const focusAt = useCallback(
    (id: string, col: number | null) => {
      if (current.current.addRow?.(id) == null) current.current.onSelect?.(id);
      setActive(id);
      setColumn(col);
      setRequest({ id, column: col });
    },
    [setActive],
  );
  useLayoutEffect(() => {
    const row = request ? rowEls.current.get(request.id) : undefined;
    if (!request || !row) return;
    if (request.column === null) {
      row.focus();
      return;
    }
    const cell = row.querySelector<HTMLElement>(`[aria-colindex="${request.column}"]`);
    const control = cell ? controlIn(cell) : null;
    (control ?? cell ?? row).focus();
  }, [request]);

  const focusRef = useRef<(id: string) => void>(() => {});
  focusRef.current = (id: string) => {
    if (!model.parent.has(id)) return;
    tree.open(id);
    focusAt(id, null);
  };
  const { expandAll, collapseAll } = tree;
  useImperativeHandle(ref, () => ({ focusNode: (id: string) => focusRef.current(id), expandAll, collapseAll }), [
    expandAll,
    collapseAll,
  ]);

  /**
   * Follows a row's link as a click on it would, with the keys held, so a
   * modified Enter opens it elsewhere as a modified click does. False where
   * the row has no link.
   */
  function follow(row: HTMLElement, event: KeyboardEvent<HTMLElement>): boolean {
    const link = row.querySelector<HTMLAnchorElement>(':scope > [role="gridcell"] > a.crewlet-tree-grid__row-link');
    if (!link) return false;
    link.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      }),
    );
    return true;
  }

  // ---- keys -------------------------------------------------------------------
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-tree-id]');
    if (!row) return;
    const id = row.getAttribute('data-tree-id')!;
    const onRow = target === row;
    const cellIndex = target.closest("[role='gridcell']")?.getAttribute('aria-colindex');
    const col = onRow || !cellIndex ? null : Number(cellIndex);
    const add = isAddRow(id);
    const cells = add ? add.cells : drawn.length;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    if (onRow && add === null) {
      if (onRowKeyDown?.(id, event)) {
        handled();
        return;
      }
      const action = treeItemAction(event);
      if (action === 'menu') {
        if (hasRowMenu?.(id)) {
          handled();
          setMenuFor(id);
        }
        return;
      }
      if (action !== null) {
        if (onRowKey?.(id, action)) handled();
        // A ROW THAT LINKS OPENS FROM THE KEYBOARD as a click on its link would.
        else if (action === 'activate' && follow(row, event)) handled();
        return;
      }
      // And a modified Enter opens it elsewhere, as a modified click does.
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.altKey && follow(row, event)) {
        handled();
        return;
      }
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const sameColumn = (next: string | null) => {
      if (next === null) return;
      const other = isAddRow(next);
      const count = other ? other.cells : drawn.length;
      focusAt(next, col === null ? null : Math.min(col, count));
    };

    // A TEXT FIELD IN A CELL IS EDITED WITH ITS OWN KEYS. A name typed in place
    // moves its caret with Left, Right, Home and End, and a field of several
    // lines moves between them with Up and Down; captured here, those keys
    // left the field instead, so nothing typed in it could be corrected. A
    // single line has no lines to move between, so Up and Down still walk the
    // rows from it, and Tab leaves it as it leaves any control.
    if (col !== null && caretKey(target, event.key)) return;

    if (col !== null) {
      switch (event.key) {
        case 'ArrowRight':
          handled();
          if (col < cells) focusAt(id, col + 1);
          return;
        case 'ArrowLeft':
          handled();
          focusAt(id, col > 1 ? col - 1 : null);
          return;
        case 'Home':
          handled();
          focusAt(id, 1);
          return;
        case 'End':
          handled();
          focusAt(id, cells);
          return;
        case 'ArrowDown':
          handled();
          sameColumn(treeNext(model, expanded, id));
          return;
        case 'ArrowUp':
          handled();
          sameColumn(treePrevious(model, expanded, id));
          return;
        default:
          // Enter and Space belong to the control in the cell.
          return;
      }
    }

    // A row: Right opens a closed row, and steps into an open or leaf row's cells.
    if (event.key === 'ArrowRight' && !(treeExpandable(model, id) && !expanded.has(id))) {
      handled();
      focusAt(id, 1);
      return;
    }
    if (add !== null && event.key === 'Enter') {
      handled();
      focusAt(id, 1);
      return;
    }
    const step = treeStep(tree, id, event);
    if (step === undefined) return;
    handled();
    if (step === null) return;
    if ('toggle' in step) toggle(step.toggle);
    else focusAt(step.focus, null);
  }

  // ---- the layer over the scroller ---------------------------------------------
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const onScroll = () => layer?.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));

  // ---- rows ---------------------------------------------------------------------
  /** Whether the active cell of `id` is column `col`: its control is then the tab stop. */
  const stop = (id: string, col: number) => id === active && column === col;
  // A POINTER OPENING A CELL'S CONTROL MOVES THE TAB STOP TO IT. The control
  // keeps the focus the press gave it and hands it back when the menu closes,
  // so the grid's one tab stop has to be that cell rather than the row it sits
  // in. Focus is not moved here: the control is taking it.
  const grid: TreeGridContext = {
    expanded: (id) => expanded.has(id),
    expandable: (id) => treeExpandable(model, id),
    toggle,
    tabStop: stop,
    opened: (id, col) => {
      setActive(id);
      setColumn(col);
    },
    press: (id) => ({
      onMouseDown: (event) => {
        // The press must not focus the control it landed on: see the module doc.
        event.preventDefault();
        focusAt(id, null);
      },
    }),
    menuOpen: (id) => menuFor === id,
    setMenuOpen: (id, open) => setMenuFor((was) => (open ? id : was === id ? null : was)),
    columnKey: (col) => drawn[col - 1]?.key,
    shown: (key) => drawn.some((one) => one.key === key),
    tree: model,
  };

  // A row's box is a control in its first cell, so the cell hands its tab stop to it.
  const hasControl = (id: string, col: number, key: string) =>
    (col === 1 && selection !== undefined && selection.checked(id) !== null) ||
    (cellHasControl?.(id, col, key) ?? false);

  function headerClick(one: TreeGridColumn): void {
    if (!sortsBy(one) || !onSortChange) return;
    onSortChange(nextGridSort(one.key, sortRaw, defaultSort));
  }

  const template = drawn
    .map((one) => tableTrack({ ...one, width: one.width ?? (one.icon ? GRID_ICON_TRACK : undefined) }))
    .join(' ');
  const frameClass = cx(
    'crewlet-tree-grid',
    headless && 'crewlet-tree-grid--headless',
    layout === 'container' && 'crewlet-tree-grid--container',
    className,
  );

  if (forest.length === 0 && empty) {
    return (
      <div ref={frame} className={frameClass} data-flush={flush || undefined}>
        <div className="crewlet-tree-grid__scroller">
          <EmptyState
            size="compact"
            icon={empty.icon}
            title={empty.title}
            description={empty.hint}
            action={empty.action}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={frame}
      className={frameClass}
      data-flush={flush || undefined}
      data-stacked={stacked || undefined}
      data-phone-rows={stacked && phoneRows === 'compact' ? 'compact' : undefined}
    >
      <LayerHost className="crewlet-tree-grid__layer">
        <div className="crewlet-tree-grid__scroller" onScroll={onScroll}>
          <div
            ref={gridEl}
            role="treegrid"
            aria-label={label}
            aria-colcount={drawn.length}
            aria-readonly={readOnly || undefined}
            className="crewlet-tree-grid__grid"
            style={{ '--crewlet-tree-grid-columns': template } as CSSProperties}
            onKeyDownCapture={onKeyDownCapture}
          >
            <div role="rowgroup" className="crewlet-tree-grid__head">
              <div role="row" className="crewlet-tree-grid__row">
                {drawn.map((one, index) => (
                  <GridHeadCell
                    key={one.key}
                    column={one}
                    colIndex={index + 1}
                    sort={sort}
                    sortable={sortsBy(one) && onSortChange !== undefined}
                    onSort={() => headerClick(one)}
                    hidden={one.headerHidden || one.action}
                  />
                ))}
              </div>
            </div>
            <div role="rowgroup" className="crewlet-tree-grid__body">
              {rows.map((id) => {
                const add = isAddRow(id);
                const cells = add ? add.cells : drawn.length;
                const expandable = treeExpandable(model, id);
                const open = expanded.has(id);
                const name = model.label.get(id) ?? '';
                const href = add ? undefined : rowHref?.(id);
                return (
                  /* The row's keys are the GRID's, captured at the treegrid so
                     one handler serves every row and reaches a cell's control
                     first. A listener on the row itself would be a second
                     place for them to live. */
                  /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- see above */
                  <div
                    key={id}
                    role="row"
                    data-tree-id={id}
                    ref={rowRef(id)}
                    tabIndex={id === active && column === null ? 0 : -1}
                    aria-level={treeLevel(model, id)}
                    aria-setsize={treeSetSize(model, id)}
                    aria-posinset={treePosInSet(model, id)}
                    aria-expanded={expandable ? open : undefined}
                    aria-selected={add ? undefined : id === selectedId}
                    aria-label={add ? add.label : undefined}
                    className={cx('crewlet-tree-grid__row', add && 'crewlet-tree-grid__row--add')}
                    data-linked={href !== undefined || undefined}
                    data-failed={(!add && isFailed?.(id)) || undefined}
                    style={{ '--crewlet-tree-grid-depth': treeLevel(model, id) - 1 } as CSSProperties}
                    onClick={(event) => {
                      // A press on a control in the row is the control's; a
                      // press on the row itself selects it and takes focus. A
                      // press in a surface portalled from a cell is not in the row.
                      if (!event.currentTarget.contains(event.target as Node)) return;
                      if ((event.target as HTMLElement).closest("button, input, label, [role='menu']")) return;
                      focusAt(id, null);
                    }}
                  >
                    {Array.from({ length: cells }, (_, index) => {
                      const col = index + 1;
                      const one = add ? undefined : drawn[index];
                      const align = one ? alignOf(one) : 'left';
                      return (
                        <div
                          key={col}
                          role="gridcell"
                          aria-colindex={col}
                          tabIndex={stop(id, col) && !hasControl(id, col, drawn[col - 1]?.key ?? '') ? 0 : -1}
                          data-size={one?.size === 'sm' ? 'sm' : undefined}
                          // The column's name, for the card a row becomes where columns do not fit.
                          data-label={
                            one && !one.action && col > 1 ? headerWord(one) || one.label || undefined : undefined
                          }
                          className={cx(
                            'crewlet-tree-grid__cell',
                            align !== 'left' && `crewlet-tree-grid__cell--${align}`,
                            one?.icon && 'crewlet-tree-grid__cell--icon',
                            one?.shrink && 'crewlet-tree-grid__cell--shrink',
                            one?.action && 'crewlet-tree-grid__cell--action',
                          )}
                        >
                          {col === 1 && href !== undefined && (
                            /* THE ROW'S LINK, STRETCHED OVER IT, for the pointer:
                               a real href, so a new tab and copying it work. The
                               row is the keyboard's and the reader's way in (Enter
                               follows this), so the link is hidden from both. */
                            // eslint-disable-next-line jsx-a11y/anchor-has-content
                            <a className="crewlet-tree-grid__row-link" href={href} tabIndex={-1} aria-hidden="true" />
                          )}
                          {col === 1 && (
                            /* THE PRESS LANDS ON THE ROW. The chevron is a
                               pointer-only control hidden from assistive
                               technology (the keyboard opens and closes a row
                               with Right and Left), and focus inside a hidden
                               subtree is focus nowhere, so the press is stopped
                               from focusing it and the row takes the focus. */
                            <span
                              className="crewlet-tree-grid__toggle"
                              /* ONE GLYPH, TURNED. Two drawings swapped is a
                                 cut where opening a row is a movement, and the
                                 chevron that turns is what every tree in the
                                 console draws. The state is on the span so the
                                 rule can turn the mark without the control
                                 around it moving. */
                              data-open={open ? '' : undefined}
                              aria-hidden="true"
                              {...grid.press(id)}
                            >
                              {expandable && (
                                <IconButton
                                  size="sm"
                                  label={open ? text.collapse(name) : text.expand(name)}
                                  icon={<ChevronRightGlyph />}
                                  tabIndex={-1}
                                  onClick={() => toggle(id)}
                                />
                              )}
                            </span>
                          )}
                          {col === 1 && renderIndent?.(id, grid)}
                          {col === 1 && selection && add === null && (
                            <TreeGridSelect id={id} selection={selection} context={grid} />
                          )}
                          {renderCell(id, col, grid)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <GridFoot
            footer={footer}
            dropped={droppedNames(shownColumns, dropped, text.and)}
            loadedNote={loadedNote}
            onLoadMore={onLoadMore}
            onReset={colsRaw && onColsChange ? () => onColsChange('') : undefined}
            labels={text}
          />
        </div>
        <LayerNodeBridge onNode={setLayer} />
      </LayerHost>
    </div>
  );
}

/** A row's select box, in the slot every row keeps; a press on it is the box's, not the row's. */
function TreeGridSelect({
  id,
  selection,
  context,
}: {
  id: string;
  selection: TreeGridSelection;
  context: TreeGridContext;
}) {
  const checked = selection.checked(id);
  return (
    <span className="crewlet-tree-grid__select">
      {checked !== null && (
        <Checkbox
          hideLabel
          label={selection.label(id)}
          checked={checked === true}
          indeterminate={checked === 'mixed'}
          tabIndex={context.tabStop(id, 1) ? 0 : -1}
          onClick={() => context.opened(id, 1)}
          onCheckedChange={(next) => selection.onCheckedChange(id, next)}
        />
      )}
    </span>
  );
}
