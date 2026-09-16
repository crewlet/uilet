/**
 * A list screen, whole: the head, the toolbar, the filter chips and the table.
 *
 * WHY ONE COMPONENT RATHER THAN FIVE A SCREEN COMPOSES ITSELF. The five parts
 * are separately useful and are exported separately, but the RULES BETWEEN
 * them are where every list screen went wrong on its own:
 *
 * 1. WHICH CHIPS ARE ON SCREEN is not "the filters that have a value". An axis
 *    a reader just picked from the Filter menu has no value yet, and a chip
 *    that appeared only once it did made picking a multiple-choice filter look
 *    like a control that did nothing. So a chip is drawn for an axis that
 *    HAS a value or that the reader JUST ADDED, and the second half is state
 *    that lives here because the toolbar raises it and the chip row renders it.
 * 2. REMOVING A CHIP IS NOT THE SAME AS EMPTYING IT. Taking the axis off the
 *    list also puts its value back to the blank one, and the blank value of a
 *    single-choice filter is its first option ("Any status"), not the empty
 *    string.
 * 3. THE ARCHIVED ROWS ARE HIDDEN AND THEIR COLUMN IS NOT DRAWN, until the
 *    toggle is on: a Deleted at column over a list with no deleted rows in it
 *    is a column of nothing that every reader still has to scan past.
 * 4. FILTERING HAPPENS BEFORE HIDING. A reader who has both "role is admin"
 *    and "show archived" on wants archived admins, which is what applying the
 *    two in that order gives them.
 *
 * WHAT IT DOES NOT OWN IS THE STATE. Values and callbacks, all of them, so the
 * screen keeps its filters wherever its own history lives, which for every
 * screen in this product is the URL. The one exception is the two pieces of
 * state that have no meaning outside this component (which chips are on, and
 * which chip just opened), and the archived toggle, which is controlled when a
 * caller passes a value for it and otherwise keeps its own.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DataTable, type DataTableProps } from '../DataTable/index.js';
import { PageHeader } from '../PageHeader/index.js';
import { RelativeTime } from '../RelativeTime/index.js';
import { cx } from '../utils/cx.js';
import type { HeadingLevel } from '../utils/headingLevel.js';
import { DataViewToolbar, type DataViewToolbarLabels } from './DataViewToolbar.js';
import { FilterAxisBar, type FilterAxisLabels } from './FilterAxisBar.js';
import { tableColumns, type DataViewColumn, type DataViewSortState } from './columns.js';
import {
  applyFilters,
  blankFilterValue,
  filterDefsFromColumns,
  filterHasValue,
  type FilterDef,
  type FilterValues,
} from './filters.js';

/** Every string the composite renders on its own, by the part that renders it. */
export interface DataViewLabels {
  toolbar: Partial<DataViewToolbarLabels>;
  chips: Partial<FilterAxisLabels>;
  /** The column appended while archived rows are shown. */
  archivedAt: string;
  /** What that column says for a row nobody archived. */
  archivedAtAbsent: string;
}

/**
 * The table properties a screen passes straight through. Each one means
 * exactly what it means on [DataTable]; they are listed rather than spread so
 * the composite's own signature says what it accepts.
 */
type PassedToTable<TRow> = Pick<
  DataTableProps<TRow>,
  | 'rowKey'
  | 'getRowKey'
  | 'rowActions'
  | 'onRowClick'
  | 'getRowHref'
  | 'rowTone'
  | 'isSelected'
  | 'renderExpandedRow'
  | 'renderAccessoryRow'
  | 'emptyMessage'
  | 'endMessage'
  | 'loading'
  | 'skeletonRows'
  | 'error'
  | 'density'
  /* A list whose rows are bounded scrolls them and pins its column names; a
     list the page scrolls does neither, which is why it is the screen that
     says how tall the rows may be. */
  | 'maxBodyHeight'
  | 'visibleColumns'
  | 'onVisibleColumnsChange'
  | 'columnOrder'
  | 'onColumnOrderChange'
  | 'showSettings'
  | 'storageKey'
  /* WHETHER THE TABLE PAGES, and everything a screen needs to say where in
     the pages a reader is. `paginated` was a literal `false` here, so no list
     screen could page whatever it passed, and the settings frame's page-size
     row was gated off with it. It still DEFAULTS to false: a list screen
     scrolls unless it asks not to. */
  | 'paginated'
  | 'defaultItemsPerPage'
  | 'itemsPerPageOptions'
  | 'itemsPerPage'
  | 'onItemsPerPageChange'
  | 'page'
  | 'onPageChange'
  | 'pageCount'
  | 'resizable'
  | 'sortCycle'
  | 'stableOrder'
  | 'hasMore'
  | 'onLoadMore'
  | 'loadingMore'
  | 'loadMoreLabel'
  | 'archivedLabel'
>;

export interface DataViewProps<TRow> extends PassedToTable<TRow> {
  /** What the screen is. Left out, no header is drawn and the screen draws its own. */
  title?: ReactNode;
  description?: ReactNode;
  /** Status beside the title. */
  badges?: ReactNode;
  /** What a reader can do on this screen, beside the title. */
  headerActions?: ReactNode;
  headingLevel?: HeadingLevel | undefined;

  /**
   * The axes this screen declares. They are offered in the Filter menu and
   * drawn as chips, and the screen applies them itself (it usually asks a
   * server). A filter declared on a COLUMN instead is applied here.
   */
  filters?: readonly FilterDef<TRow>[] | undefined;
  filterValues?: FilterValues | undefined;
  onFilterValuesChange?: ((next: FilterValues) => void) | undefined;
  /** Committed: Enter in the search box, a chip edited, a chip removed. */
  onApplyFilters?: (() => void) | undefined;

  columns: readonly DataViewColumn<TRow>[];
  rows: readonly TRow[];

  /** Which column the list opens ordered by, while the sort is the view's own. */
  defaultSort?: DataViewSortState | null | undefined;
  /** Lift the sort into the screen (a URL, a server) by passing both of these. */
  sort?: DataViewSortState | null | undefined;
  onSortChange?: ((next: DataViewSortState | null) => void) | undefined;

  /**
   * Which rows are archived. With it the toolbar grows a toggle, the rows are
   * hidden until it is on, and each one is marked when it is.
   */
  archivedPredicate?: ((row: TRow) => boolean) | undefined;
  /** Where each archived row's own moment is read from, for the extra column. */
  archivedTimestamp?: ((row: TRow) => string | number | Date | null | undefined) | undefined;
  /** Lift the toggle into the screen by passing both of these. */
  showArchived?: boolean | undefined;
  onShowArchivedChange?: ((next: boolean) => void) | undefined;
  /**
   * Where the toggle is remembered when the screen does not own it. Left out,
   * nothing is stored and a fresh visit hides archived rows.
   */
  archivedStorageKey?: string | undefined;

  /**
   * Draws the table on a surface of its own: a boundary, a radius and the
   * subtle ground, which is what a list screen inside a padded page wants so
   * the rows read as one object rather than as text on the page.
   */
  framed?: boolean | undefined;
  /** What else belongs on the toolbar row, held to its end. */
  toolbarActions?: ReactNode;
  /** Keeps the toolbar under the top of the scroller. */
  stickyToolbar?: boolean | undefined;

  labels?: Partial<DataViewLabels> | undefined;
  className?: string | undefined;
}

/** A guarded read of a remembered toggle. A blocked or corrupt store is a no. */
function readStored(key: string | undefined): boolean {
  if (!key) return false;
  try {
    return globalThis.localStorage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStored(key: string | undefined, on: boolean): void {
  if (!key) return;
  try {
    if (on) globalThis.localStorage?.setItem(key, '1');
    else globalThis.localStorage?.removeItem(key);
  } catch {
    // A full or blocked store is not worth interrupting anybody over.
  }
}

export function DataView<TRow>({
  title,
  description,
  badges,
  headerActions,
  headingLevel,
  filters = [],
  filterValues,
  onFilterValuesChange,
  onApplyFilters,
  columns,
  rows,
  defaultSort = null,
  sort: sortProp,
  onSortChange,
  archivedPredicate,
  archivedTimestamp,
  showArchived: showArchivedProp,
  onShowArchivedChange,
  archivedStorageKey,
  archivedLabel = 'archived',
  framed = false,
  toolbarActions,
  stickyToolbar = false,
  labels: labelOverrides,
  className,
  ...table
}: DataViewProps<TRow>) {
  const labels = {
    toolbar: labelOverrides?.toolbar,
    chips: labelOverrides?.chips,
    archivedAt: labelOverrides?.archivedAt ?? 'Archived at',
    archivedAtAbsent: labelOverrides?.archivedAtAbsent ?? 'Not archived',
  };

  /* ── Sort ──────────────────────────────────────────────────────────── */

  const [ownSort, setOwnSort] = useState<DataViewSortState | null>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : ownSort;
  const setSort = onSortChange ?? setOwnSort;

  /* ── Which axes are declared ───────────────────────────────────────── */

  /*
   * The screen's own axes, then the ones the columns declare. The screen wins
   * a collision, so a column that says `filterable` can still be overridden by
   * a screen that filters the same field on the server.
   */
  const columnDefs = useMemo(() => filterDefsFromColumns(columns), [columns]);
  const allFilters = useMemo(() => {
    const seen = new Set(filters.map((def) => def.name));
    return [...filters, ...columnDefs.filter((def) => !seen.has(def.name))];
  }, [filters, columnDefs]);

  /* ── Which chips are on screen ─────────────────────────────────────── */

  const withValue = useCallback(
    (values: FilterValues | undefined): Set<string> => {
      const set = new Set<string>();
      if (!values) return set;
      for (const def of allFilters) {
        if (def.role === 'search') continue;
        if (filterHasValue(def, values[def.name])) set.add(def.name);
      }
      return set;
    },
    [allFilters],
  );

  const [displayed, setDisplayed] = useState<Set<string>>(() => withValue(filterValues));
  /** The chip whose editor opens by itself, having just been added. */
  const [justAdded, setJustAdded] = useState<string | null>(null);

  /*
   * A value that arrives from outside (a link opened with filters in it, a
   * reset) puts its chip on screen. Nothing is ever taken OFF here: a chip the
   * reader just added has no value yet and must not vanish under them.
   *
   * THE SAME SET IS HANDED BACK WHEN NOTHING WAS ADDED, which is almost every
   * time this runs. A screen keeps its filters in its own history and hands
   * down a fresh object on every render, so the identity check above passes
   * them through; a new Set each time is a state change, and a state change is
   * a second pass over every row in the table for a keystroke in a box.
   */
  const lastValues = useRef<FilterValues | undefined>(undefined);
  useEffect(() => {
    if (lastValues.current === filterValues) return;
    lastValues.current = filterValues;
    setDisplayed((was) => {
      let next: Set<string> | null = null;
      for (const name of withValue(filterValues)) {
        if (was.has(name)) continue;
        next ??= new Set(was);
        next.add(name);
      }
      return next ?? was;
    });
  }, [filterValues, withValue]);

  // In the order the axes were declared, so the chips do not shuffle as they
  // are added and removed.
  const names = useMemo(
    () => allFilters.filter((def) => displayed.has(def.name)).map((def) => def.name),
    [allFilters, displayed],
  );

  const values = filterValues ?? {};

  const addFilter = (name: string) => {
    setDisplayed((was) => new Set(was).add(name));
    setJustAdded(name);
  };

  const removeFilter = (def: FilterDef<TRow>) => {
    setDisplayed((was) => {
      const next = new Set(was);
      next.delete(def.name);
      return next;
    });
    onFilterValuesChange?.({ ...values, [def.name]: blankFilterValue(def) });
    onApplyFilters?.();
  };

  const clearAll = () => {
    const blank: FilterValues = { ...values };
    for (const def of allFilters) {
      // The search box is not a chip and is not cleared by Clear filters: it
      // is still on screen with words in it, and emptying a box the reader can
      // see without being asked is a change they did not make.
      if (def.role === 'search') continue;
      blank[def.name] = blankFilterValue(def);
    }
    setDisplayed(new Set());
    onFilterValuesChange?.(blank);
    onApplyFilters?.();
  };

  /* ── Archived rows ─────────────────────────────────────────────────── */

  const [ownShowArchived, setOwnShowArchived] = useState(() => readStored(archivedStorageKey));
  const showArchived = showArchivedProp !== undefined ? showArchivedProp : ownShowArchived;
  const setShowArchived = (next: boolean) => {
    if (onShowArchivedChange) {
      onShowArchivedChange(next);
      return;
    }
    setOwnShowArchived(next);
    writeStored(archivedStorageKey, next);
  };

  const archivedCount = useMemo(
    () => (archivedPredicate ? rows.reduce((count, row) => (archivedPredicate(row) ? count + 1 : count), 0) : 0),
    [rows, archivedPredicate],
  );

  /* ── What the table draws ──────────────────────────────────────────── */

  const visibleRows = useMemo(() => {
    const filtered = applyFilters(rows, columnDefs, filterValues);
    if (!archivedPredicate || showArchived) return filtered;
    return filtered.filter((row) => !archivedPredicate(row));
  }, [rows, columnDefs, filterValues, archivedPredicate, showArchived]);

  const shownColumns = useMemo(() => {
    if (!showArchived || !archivedTimestamp) return columns;
    const archivedColumn: DataViewColumn<TRow> = {
      key: '__archived_at',
      header: labels.archivedAt,
      sortable: true,
      shrink: true,
      sortValue: (row) => {
        const at = archivedTimestamp(row);
        if (at === null || at === undefined || at === '') return null;
        const time = at instanceof Date ? at.getTime() : new Date(String(at)).getTime();
        return Number.isNaN(time) ? null : time;
      },
      render: (row) => <RelativeTime value={archivedTimestamp(row) ?? null} emptyLabel={labels.archivedAtAbsent} />,
    };
    return [...columns, archivedColumn];
  }, [columns, showArchived, archivedTimestamp, labels.archivedAt, labels.archivedAtAbsent]);

  const { columns: tableCols, order } = useMemo(() => tableColumns(shownColumns), [shownColumns]);

  const showToolbar = allFilters.length > 0 || !!toolbarActions || (!!onShowArchivedChange || !!archivedPredicate);

  /*
   * THE SCREEN'S CONTROLS SIT IN THE TABLE'S OWN TOOLBAR, and the chips in the
   * band under it. They used to be two bars ABOVE the table, so a list screen
   * read as three objects stacked up: a row of controls, a row of chips, and
   * then a table with a toolbar of its own holding the settings cog. One row
   * now holds the screen's controls and the table's, which is what makes the
   * whole thing read as one list.
   */
  const toolbar = showToolbar ? (
    <DataViewToolbar
      filters={allFilters}
      values={values}
      onValuesChange={(next) => onFilterValuesChange?.(next)}
      displayed={names}
      onAddFilter={addFilter}
      {...(onApplyFilters ? { onSubmit: onApplyFilters } : {})}
      columns={shownColumns}
      sort={sort}
      onSortChange={setSort}
      {...(archivedPredicate ? { onShowArchivedChange: setShowArchived } : {})}
      showArchived={showArchived}
      archivedLabel={archivedLabel}
      archivedCount={archivedCount}
      actions={toolbarActions}
      {...(labels.toolbar ? { labels: labels.toolbar } : {})}
    />
  ) : null;

  /*
   * The chip row draws nothing when no axis is on, and the band it sits in is
   * drawn only when it has something in it, so a screen with no filters on
   * carries no empty strip between its toolbar and its rows.
   */
  const chips = names.length > 0 ? (
    <FilterAxisBar
      filters={allFilters}
      values={values}
      names={names}
      onValuesChange={(next) => onFilterValuesChange?.(next)}
      {...(onApplyFilters ? { onSubmit: onApplyFilters } : {})}
      onRemove={removeFilter}
      onClearAll={clearAll}
      autoOpenName={justAdded}
      onAutoOpenConsumed={() => setJustAdded(null)}
      {...(labels.chips ? { labels: labels.chips } : {})}
    />
  ) : null;

  return (
    <div
      className={cx(
        'crewlet-data-view',
        framed && 'crewlet-data-view--framed',
        stickyToolbar && 'crewlet-data-view--sticky-toolbar',
        className,
      )}
    >
      {title !== undefined ? (
        <PageHeader
          title={title}
          {...(headingLevel === undefined ? {} : { headingLevel })}
          {...(description === undefined ? {} : { description })}
          {...(badges === undefined ? {} : { badges })}
          {...(headerActions === undefined ? {} : { actions: headerActions })}
        />
      ) : null}

      {/*
        * THE PANEL IS THE TABLE AND NOTHING ELSE. A count line used to close
        * it, saying "Showing 12 of 300" or "12 rows" under every list on
        * every screen. Everything it said is said better somewhere a reader
        * already looks: how many of a thing there are is a fact about the
        * LIST rather than about the table drawing it, so it belongs in the
        * screen's own header, beside the name of the thing being counted;
        * which filters narrowed it is on the chips a step above the rows;
        * and which rows of how many are on this page is announced by the
        * pager, which is the control that moved the reader there. What the
        * line added on its own was a row of chrome at the foot of a dozen
        * panels and a second number free to disagree with the first.
        */}
      <div className="crewlet-data-view__table">
        <DataTable<TRow>
          {...table}
          variant="compact"
          paginated={table.paginated ?? false}
          /*
           * THE SETTINGS FRAME STAYS ON, which is what a list screen has today
           * and what the table's own default is. It is where a reader reorders
           * the columns, hides the ones this job does not need and turns off
           * wrapping, and on a screen with nine columns that is the difference
           * between a table they can read and one they scroll sideways. A
           * composite that quietly turned it off would have taken it from every
           * screen that adopted the composite, which is every list screen.
           */
          showSettings={table.showSettings ?? true}
          columns={tableCols}
          defaultColumnOrder={order}
          data={[...visibleRows]}
          sort={sort}
          onSortChange={setSort}
          /*
           * WHAT THE LIST OPENS ORDERED BY, said to the table as well as kept
           * here. The composite always passes `sort`, so the table's sort is
           * controlled and this seeds nothing; what it answers is the settings
           * frame's Reset to Default, which otherwise has no default to put
           * back and leaves a list ordered by nothing at all.
           */
          defaultSort={defaultSort}
          {...(toolbar ? { renderToolbar: toolbar } : {})}
          {...(chips ? { renderFilterBar: chips } : {})}
          {...(archivedPredicate ? { archivedPredicate } : {})}
          archivedLabel={archivedLabel}
        />
      </div>
    </div>
  );
}
