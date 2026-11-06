/**
 * The parts DataGrid and TreeGrid draw alike: a column's head, the foot under
 * the rows, the comparator, and the measurement the give-way fit reads.
 *
 * ONE COPY, BECAUSE TWO DRIFT. TreeGrid drew a head of its own (a word, no
 * button, no order said) and no foot, so a tree table could not look or
 * behave like the list beside it. Both grids now draw these parts from here,
 * with DataGrid's class names, so a change to a head or a foot reaches both.
 * Not exported from the package: a grid is the public shape, not its parts.
 */

import type { ReactNode } from 'react';
import { ArrowDownGlyph, ArrowUpDownGlyph, ArrowUpGlyph } from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import { SHRINK_SHARE } from '../utils/tableTrack.js';
import { titleIfCut, titleWhenCut } from '../utils/titleIfCut.js';

/** The edge a column's head and values share. */
export type GridAlign = 'left' | 'right' | 'center';

/** The track an `icon` column is drawn in: the target size and the cell's inset either side. */
export const GRID_ICON_TRACK = 'calc(var(--size-target-min) + var(--spacing-3) * 2)';

/** What a head is drawn from: the part of a column both grids share. */
export interface GridHeadColumn {
  key: string;
  header: ReactNode;
  align?: GridAlign | undefined;
  icon?: boolean | undefined;
  label?: string | undefined;
  action?: boolean | undefined;
  shrink?: boolean | undefined;
}

/** The edge a column is drawn on: `center` for an icon column unless it says otherwise. */
export function alignOf(column: Pick<GridHeadColumn, 'align' | 'icon'>): GridAlign {
  return column.align ?? (column.icon ? 'center' : 'left');
}

/** A head that is a word, or nothing. */
export function headerWord(column: Pick<GridHeadColumn, 'header'>): string {
  return typeof column.header === 'string' ? column.header : '';
}

/** What a reader calls the column: its head's word, else its `label`, else its key. */
export function columnName(column: Pick<GridHeadColumn, 'header' | 'label' | 'key'>): string {
  return headerWord(column) || column.label || column.key;
}

/** `-updated` as `{key: "updated", desc: true}`. */
export function parseGridSort(raw: string): { key: string; desc: boolean } | null {
  if (!raw) return null;
  return raw.startsWith('-') ? { key: raw.slice(1), desc: true } : { key: raw, desc: false };
}

/**
 * The sort a press on a column's head asks for: ascending, then descending,
 * then back to the default. PURE, so the cycle is held without a render.
 *
 * Against the EFFECTIVE sort (the reader's, else the default), because a head
 * that reads "descending" must take its next press as one more step from
 * descending, whoever chose it. Two rules keep every press a visible change:
 *
 * - a column already at its DEFAULT descending turns ascending, where the
 *   cycle's "back to the default" would have changed nothing;
 * - a step that lands on the default is written as `''`, so the address holds
 *   only what the reader chose and the default can change under it.
 */
export function nextGridSort(column: string, sort: string, defaultSort = ''): string {
  const chosen = sort === defaultSort ? '' : sort;
  const current = parseGridSort(chosen || defaultSort);
  let next: string;
  if (current?.key !== column) next = column;
  else if (!current.desc) next = `-${column}`;
  else next = chosen ? '' : column;
  return next === defaultSort ? '' : next;
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
 * `items` in a new array, ordered by `get`. An absent value sorts last in both
 * directions, since it is not a value. Never sorts the caller's array in place.
 */
export function sortByValue<T>(
  items: readonly T[],
  get: (item: T) => string | number | null | undefined,
  desc: boolean,
): T[] {
  return [...items].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = compare(av, bv);
    return desc ? -cmp : cmp;
  });
}

/** The words the head and the foot say, for an application that says them otherwise. */
export interface GridFootLabels {
  /** "Hidden to fit: Due and Updated". */
  hiddenToFit: (names: string) => string;
  loadMore: string;
  showEveryColumn: string;
  /** Joins the last two names of a list: "Due and Updated". */
  and: string;
}

export const GRID_FOOT_LABELS: GridFootLabels = {
  hiddenToFit: (names) => `Hidden to fit: ${names}`,
  loadMore: 'Load more',
  showEveryColumn: 'Show every column',
  and: 'and',
};

/** "Due and Updated": the columns a fit dropped, by the names a reader knows them by. */
export function droppedNames(
  columns: readonly Pick<GridHeadColumn, 'header' | 'label' | 'key'>[],
  dropped: readonly string[],
  and: string,
): string {
  const names = dropped.map((key) => {
    const c = columns.find((col) => col.key === key);
    return c ? columnName(c) : key;
  });
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

export interface GridHeadCellProps {
  column: GridHeadColumn;
  /** The sort in force, the reader's or the default. */
  sort: { key: string; desc: boolean } | null;
  /** Whether a press on this head changes the sort. */
  sortable: boolean;
  onSort: () => void;
  /** The head's word is READ BUT NOT SEEN: a column of controls that name themselves. */
  hidden?: boolean | undefined;
  /** `aria-colindex`, for a grid that counts its columns (a treegrid). */
  colIndex?: number | undefined;
}

/**
 * One column head: the micro label, its edge, and where it sorts a button
 * filling the head with the order's mark.
 *
 * A COLUMN THAT CANNOT BE SORTED IS NOT A BUTTON. The order in force is said
 * on its head too (`aria-sort`): a grid sorted by its default, with nothing to
 * press. A glyph head is still a named column: its `label`, said and shown on
 * hover.
 */
export function GridHeadCell({ column, sort, sortable, onSort, hidden = false, colIndex }: GridHeadCellProps) {
  const align = alignOf(column);
  const sorted = sort?.key === column.key;
  const headClass = cx(
    'crewlet-data-grid__th',
    align !== 'left' && `crewlet-data-grid__th--${align}`,
    column.icon && 'crewlet-data-grid__th--icon',
    column.shrink && 'crewlet-data-grid__th--shrink',
    sorted && 'crewlet-data-grid__th--sorted',
    !sortable && 'crewlet-data-grid__th--plain',
  );
  // A HEAD WITH NO WORD DRAWS NO WORD BOX: an empty box and its gap would
  // push a sortable mark column's arrow off the track's middle. A cut word
  // carries its whole text on hover.
  const worded = column.header !== '' && column.header !== null && column.header !== undefined;
  const label = !worded ? null : hidden ? (
    <VisuallyHidden>{column.header}</VisuallyHidden>
  ) : (
    <span className="crewlet-data-grid__truncate" onMouseEnter={titleWhenCut}>
      {column.header}
    </span>
  );
  // THE ARROW SAYS THE ORDER. The sorted head's names its direction; every
  // other SORTABLE head draws the two-way arrow, shown on hover and focus, so
  // a head says it sorts before it is pressed. Hidden from assistive
  // technology, which hears `aria-sort` instead.
  const arrow = sorted ? (
    sort?.desc ? (
      <ArrowDownGlyph size="xs" />
    ) : (
      <ArrowUpGlyph size="xs" />
    )
  ) : sortable ? (
    <ArrowUpDownGlyph size="xs" />
  ) : null;
  const ariaSort = sorted ? (sort?.desc ? 'descending' : 'ascending') : undefined;
  const mark = arrow && (
    <span className="crewlet-data-grid__sort-mark" aria-hidden="true">
      {arrow}
    </span>
  );
  if (!sortable) {
    const named = !headerWord(column) && !column.action ? column.label : undefined;
    return (
      <div className={headClass} role="columnheader" aria-colindex={colIndex} title={named} aria-sort={ariaSort}>
        {label}
        {mark}
        {named && <VisuallyHidden>{named}</VisuallyHidden>}
      </div>
    );
  }
  // THE SORT IS THE COLUMN HEAD'S STATE (`aria-sort` on the columnheader),
  // and the control that changes it is the button inside it.
  return (
    <div className={headClass} role="columnheader" aria-colindex={colIndex} aria-sort={ariaSort}>
      <button
        type="button"
        className="crewlet-data-grid__sort"
        onClick={onSort}
        // A SORTABLE GLYPH HEAD IS NAMED BY ITS LABEL, never by its arrow alone.
        aria-label={headerWord(column) ? undefined : column.label}
      >
        {label}
        {mark}
      </button>
    </div>
  );
}

export interface GridFootProps {
  footer?: ReactNode;
  /** The names a fit dropped, joined; empty when it dropped none. */
  dropped: string;
  loadedNote?: string | undefined;
  onLoadMore?: (() => void) | undefined;
  /** The way back from a column set; set only while one is in force. */
  onReset?: (() => void) | undefined;
  labels: GridFootLabels;
  /**
   * How many columns the table has, where the foot is the TABLE'S OWN ROWS (a
   * `rowgroup`, as a `tfoot`). Left out, the foot is a caption under a grid
   * whose rows are a hierarchy (a treegrid), outside it.
   */
  columns?: number | undefined;
}

/**
 * The foot: the caller's words, what the width dropped, what is loaded, and
 * the way to more; then the way back from a column set.
 *
 * TABLE CONTENT OR NONE. A table may own rows and row groups and nothing
 * else, and the foot sat in one as a bare box, so a list a caller put in it
 * was content the table did not allow. In a table it is now a row group of
 * rows of one cell across every column; under a treegrid it is outside it.
 */
export function GridFoot({ footer, dropped, loadedNote, onLoadMore, onReset, labels, columns }: GridFootProps) {
  const shows = Boolean(footer) || Boolean(onLoadMore) || Boolean(loadedNote) || dropped !== '';
  if (!shows && !onReset) return null;
  const table = columns !== undefined;
  const cell = (className: string, children: ReactNode) =>
    table ? (
      <div role="cell" aria-colspan={columns} className={className}>
        {children}
      </div>
    ) : (
      <div className={className}>{children}</div>
    );
  return (
    <div role={table ? 'rowgroup' : undefined} className="crewlet-data-grid__foot-group">
      {shows && (
        <div role={table ? 'row' : undefined} className="crewlet-data-grid__foot">
          {cell(
            'crewlet-data-grid__foot-cell',
            <>
              {footer}
              <span className="crewlet-data-grid__foot-spacer" aria-hidden="true" />
              {/* A DROPPED COLUMN IS SAID: widening the window brings it back. */}
              {dropped !== '' && <span className="crewlet-data-grid__note">{labels.hiddenToFit(dropped)}</span>}
              {loadedNote && <span className="crewlet-data-grid__note">{loadedNote}</span>}
              {onLoadMore && (
                <Button size="small" variant="secondary" onClick={onLoadMore}>
                  {labels.loadMore}
                </Button>
              )}
            </>,
          )}
        </div>
      )}
      {/* THE WAY BACK FROM A COLUMN SET, visible while one is set. */}
      {onReset && (
        <div role={table ? 'row' : undefined} className="crewlet-data-grid__reset">
          {cell(
            'crewlet-data-grid__reset-cell',
            <button type="button" className="crewlet-data-grid__cols-reset" onClick={onReset}>
              {labels.showEveryColumn}
            </button>,
          )}
        </div>
      )}
    </div>
  );
}

/** The elements the kit cuts on one line with an ellipsis, whose words are measured on hover. */
const CUT = '.crewlet-data-grid__truncate, .crewlet-table-cell__truncate, .crewlet-text--truncate';

/**
 * The hover text of what lies under the pointer BENEATH a row's link: the
 * title a cell's value carries, or a cut value's whole words. Null where
 * there is none.
 *
 * WHY THE LINK ASKS. The row's link is stretched over the row and above its
 * text, so the pointer is over the link wherever it is on a value: a cut
 * value's words, and every title a cell carries, never reached the pointer
 * in a row that links. The link takes the title of what it covers, read at
 * the point the pointer is, so a linked row reads on hover as a plain one.
 * A title the caller gave wins over a measured one.
 */
export function titleBeneath(link: HTMLElement, x: number, y: number): string | null {
  const row = link.closest('[role="row"]');
  if (!row || typeof document.elementsFromPoint !== 'function') return null;
  const under = document.elementsFromPoint(x, y).find((el) => el !== link && row.contains(el) && el !== row);
  if (!under) return null;
  const titled = under.closest<HTMLElement>('[title]');
  const own = titled && row.contains(titled) && titled !== row ? titled : null;
  if (own && !own.matches(CUT)) return own.getAttribute('title');
  const cut = under.closest<HTMLElement>(CUT);
  if (cut && row.contains(cut)) {
    titleIfCut(cut);
    return cut.getAttribute('title');
  }
  return own?.getAttribute('title') ?? null;
}

/** `onMouseMove` and `onMouseLeave` for a row's link: see [titleBeneath]. */
export const rowLinkTitle = {
  onMouseMove: (event: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
    const title = titleBeneath(event.currentTarget, event.clientX, event.clientY);
    if (title) event.currentTarget.setAttribute('title', title);
    else event.currentTarget.removeAttribute('title');
  },
  onMouseLeave: (event: { currentTarget: HTMLElement }) => event.currentTarget.removeAttribute('title'),
};

/** How many rows the squeeze check reads: a page's first screen. */
const SQUEEZE_SAMPLE_ROWS = 12;

/** Whether the tracks run past the box's inner edge, read off the head's last cell. */
export function overrunning(box: HTMLElement, head: Element | null | undefined): boolean {
  const last = head?.lastElementChild;
  if (!last) return false;
  const inner = box.getBoundingClientRect().left + box.clientLeft + box.clientWidth;
  return last.getBoundingClientRect().right > inner + 0.5;
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

/**
 * Whether a content-sized column has been SQUEEZED: drawn narrower than its
 * cap AND cutting a value short, or its HEAD. The quieter way a grid fails to
 * fit: rather than overrun, it shrinks a status pill to a letter, or every
 * head of a row of counts to its first letter over values that still fit,
 * while the columns that could have gone stay. Read over the head and the
 * first screen of rows. `leading` is how many of the grid's own columns (a
 * selection box, a handle) are drawn before the caller's.
 *
 * `'values'` where a value is cut short (the grid cannot be read: drop, then
 * stack), `'heads'` where only a head is (drop a column if one may go, but a
 * grid whose every value reads is not turned into cards for a head), and
 * null where nothing is.
 */
export function squeezedCells(
  width: number,
  heads: readonly Element[],
  rows: readonly Element[],
  cellsOf: (row: Element) => readonly Element[],
  visible: readonly { shrink?: boolean | undefined; width?: string | undefined; icon?: boolean | undefined }[],
  leading = 0,
): 'values' | 'heads' | null {
  const cap = width * SHRINK_SHARE - 1;
  const sample = rows.slice(0, SQUEEZE_SAMPLE_ROWS);
  let headCut = false;
  for (let i = 0; i < visible.length; i++) {
    const column = visible[i]!;
    if (!column.shrink || column.width || column.icon) continue;
    const head = heads[i + leading];
    if (!head || head.getBoundingClientRect().width >= cap) continue;
    if (cutShort(head)) headCut = true;
    for (const row of sample) {
      const cell = cellsOf(row)[i + leading];
      if (cell && cutShort(cell)) return 'values';
    }
  }
  return headCut ? 'heads' : null;
}
