/**
 * The one row above a list: search, the filters that can be added, the sort,
 * and whatever else the screen can do here.
 *
 *   [search ..........................] [Filter] [Sort: Name] [Show archived]   [actions]
 *
 * ITS HEIGHT DOES NOT DEPEND ON HOW MANY FILTERS ARE ON. The axes a reader has
 * added are chips on their own row underneath ([FilterAxisBar]), so a screen
 * with six filters and a screen with none put their first row of data in the
 * same place. A toolbar that grew a control per filter pushed the table down
 * the page as it was used.
 *
 * THE SEARCH BOX IS ALWAYS DRAWN, and is never one of the filters the menu
 * offers: a search a reader has to add from a menu is a search nobody finds.
 *
 * THE ACCENT MEANS SOMETHING IS ON, and only that. The Sort button takes it
 * while a sort is applied and the archived toggle while archived rows are
 * shown; neither takes it merely for having its menu open, which is what the
 * overlay itself already says.
 *
 * It is a `group` rather than a WAI-ARIA `toolbar`: a row holding a text field
 * cannot take the arrows away from that field's caret, so every control here
 * keeps its own tab stop.
 */

import { useMemo, type KeyboardEvent, type ReactNode } from 'react';
import {
  ArrowDownwardGlyph,
  ArrowUpwardGlyph,
  CloseGlyph,
  KeyboardArrowDownGlyph,
  ListGlyph,
  ScheduleGlyph,
  SearchGlyph,
  SwapVertGlyph,
  TagGlyph,
  TuneGlyph,
  VisibilityGlyph,
  VisibilityOffGlyph,
} from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import { Count } from '../Count/index.js';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
import { Menu, type MenuEntry } from '../Menu/index.js';
import { Popover } from '../Popover/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';
import type { DataViewColumn } from './columns.js';
import type { FilterDef, FilterValues } from './filters.js';
import type { DataViewSortState } from './columns.js';

export interface DataViewToolbarLabels {
  /** Names the row, which a screen reader reads before the controls in it. */
  toolbar: string;
  /** Names the search box when its own filter declares no label. */
  search: string;
  searchPlaceholder: string;
  clearSearch: string;
  /** The button that offers the axes not yet on the list. */
  filter: string;
  /** The menu that button opens. */
  addFilter: string;
  /** The button that opens the sort panel, while nothing is sorted. */
  sort: string;
  /** The same button once a column is sorted. */
  sortedBy: (column: string) => string;
  /** The sort panel's own name. */
  sortPanel: string;
  ascending: (column: string) => string;
  descending: (column: string) => string;
  /** Read after the sorted column's name on the button. */
  ascendingWord: string;
  descendingWord: string;
  clearSort: string;
  /** The archived toggle, which names what a screen calls its archived rows. */
  showArchived: (archivedLabel: string) => string;
  archivedCount: (archivedLabel: string) => string;
}

export const DATA_VIEW_TOOLBAR_LABELS: DataViewToolbarLabels = {
  toolbar: 'Filters',
  search: 'Search',
  searchPlaceholder: 'Search',
  clearSearch: 'Clear search',
  filter: 'Filter',
  addFilter: 'Add filter',
  sort: 'Sort',
  sortedBy: (column) => `Sort: ${column}`,
  sortPanel: 'Sort',
  ascending: (column) => `Sort ${column} ascending`,
  descending: (column) => `Sort ${column} descending`,
  ascendingWord: 'ascending',
  descendingWord: 'descending',
  clearSort: 'Clear sort',
  showArchived: (archivedLabel) => `Show ${archivedLabel}`,
  archivedCount: (archivedLabel) => `${archivedLabel} rows`,
};

/** What an axis looks like in the Add filter menu, by the sort of value it holds. */
function glyphForKind<TRow>(def: FilterDef<TRow>): ReactNode {
  switch (def.kind) {
    case 'select':
      return <ListGlyph size="sm" />;
    case 'datetime':
      return <ScheduleGlyph size="sm" />;
    case 'number':
      return <TagGlyph size="sm" />;
    default:
      return <SearchGlyph size="sm" />;
  }
}

export interface DataViewToolbarProps<TRow> {
  /** Every axis the screen declares, including those already on the list. */
  filters: readonly FilterDef<TRow>[];
  values: FilterValues;
  onValuesChange: (next: FilterValues) => void;
  /** The axes already drawn as chips, which the Filter menu therefore omits. */
  displayed?: readonly string[] | undefined;
  /** A reader picked an axis from the Filter menu. */
  onAddFilter?: ((name: string) => void) | undefined;
  /** Committed: Enter in the search box, or a change the caller fetches on. */
  onSubmit?: (() => void) | undefined;

  /** The columns, for the sort panel. Only the sortable ones are offered. */
  columns?: readonly DataViewColumn<TRow>[] | undefined;
  sort?: DataViewSortState | null | undefined;
  /** Left out, no sort control is drawn at all. */
  onSortChange?: ((next: DataViewSortState | null) => void) | undefined;

  /** Left out, no archived toggle is drawn. */
  onShowArchivedChange?: ((next: boolean) => void) | undefined;
  showArchived?: boolean | undefined;
  /** What this screen calls its archived rows: archived, deleted, disabled. */
  archivedLabel?: string | undefined;
  /** How many rows the toggle would reveal. */
  archivedCount?: number | undefined;

  /** What else can be done here, held to the end of the row. */
  actions?: ReactNode;
  /** Keeps the row under the top of the scroller in a long list. */
  sticky?: boolean | undefined;
  labels?: Partial<DataViewToolbarLabels> | undefined;
  className?: string | undefined;
}

export function DataViewToolbar<TRow>({
  filters,
  values,
  onValuesChange,
  displayed = [],
  onAddFilter,
  onSubmit,
  columns = [],
  sort = null,
  onSortChange,
  onShowArchivedChange,
  showArchived = false,
  archivedLabel = 'archived',
  archivedCount = 0,
  actions,
  sticky = false,
  labels: overrides,
  className,
}: DataViewToolbarProps<TRow>) {
  const labels: DataViewToolbarLabels = overrides ? { ...DATA_VIEW_TOOLBAR_LABELS, ...overrides } : DATA_VIEW_TOOLBAR_LABELS;

  // The search slot: the axis that asked to be one, or else the first plain
  // text axis, which is what a screen that declared a single "Search by email"
  // filter and nothing else means by it.
  const searchDef = useMemo(
    () => filters.find((def) => def.role === 'search') ?? filters.find((def) => (def.kind ?? 'text') === 'text'),
    [filters],
  );

  const addable = useMemo(
    () => filters.filter((def) => def !== searchDef && !displayed.includes(def.name)),
    [filters, searchDef, displayed],
  );

  const sortable = useMemo(() => columns.filter((column) => column.sortable), [columns]);
  const sortedColumn = sort ? sortable.find((column) => column.key === sort.key) : undefined;
  const sortedName = sortedColumn ? headerText(sortedColumn) : sort?.key;

  const setSearch = (next: string) => {
    if (!searchDef) return;
    onValuesChange({ ...values, [searchDef.name]: next });
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !searchDef || searchDef.submitOnEnter === false) return;
    // A search box inside a form submits it on Enter, and committing a filter
    // is not saving anything.
    event.preventDefault();
    onSubmit?.();
  };

  const filterItems: MenuEntry[] = addable.map((def) => ({
    key: def.name,
    label: def.label,
    icon: glyphForKind(def),
    onSelect: () => onAddFilter?.(def.name),
  }));

  return (
    <Toolbar label={labels.toolbar} mode="group" sticky={sticky} className={cx('crewlet-data-view-toolbar', className)}>
      {searchDef ? (
        <Input
          type="search"
          inputSize="sm"
          containerClassName="crewlet-data-view-toolbar__search"
          leading={<SearchGlyph size="sm" />}
          aria-label={searchDef.label || labels.search}
          placeholder={searchDef.placeholder ?? labels.searchPlaceholder}
          value={values[searchDef.name] === undefined || values[searchDef.name] === null ? '' : String(values[searchDef.name])}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={onSearchKeyDown}
          clearLabel={labels.clearSearch}
          onClear={() => {
            setSearch('');
            onSubmit?.();
          }}
        />
      ) : null}

      {filterItems.length > 0 && onAddFilter ? (
        <Menu
          label={labels.addFilter}
          items={filterItems}
          icon={<TuneGlyph size="sm" />}
          triggerVariant="secondary"
          trigger={
            <span className="crewlet-data-view-toolbar__menu-label">
              {labels.filter}
              <KeyboardArrowDownGlyph size="xs" />
            </span>
          }
        />
      ) : null}

      {sortable.length > 0 && onSortChange ? (
        <Popover
          align="start"
          role="dialog"
          label={labels.sortPanel}
          className="crewlet-data-view-toolbar__sort-panel"
          trigger={(_open, toggle) => (
            <Button
              variant="secondary"
              size="small"
              pressed={sort !== null}
              leadingIcon={<SwapVertGlyph size="sm" />}
              onClick={toggle}
            >
              <span className="crewlet-data-view-toolbar__menu-label">
                {sort && sortedName ? (
                  <>
                    {labels.sortedBy(String(sortedName))}
                    {sort.direction === 'asc' ? <ArrowUpwardGlyph size="xs" /> : <ArrowDownwardGlyph size="xs" />}
                    <VisuallyHidden>{sort.direction === 'asc' ? labels.ascendingWord : labels.descendingWord}</VisuallyHidden>
                  </>
                ) : (
                  <>
                    {labels.sort}
                    <KeyboardArrowDownGlyph size="xs" />
                  </>
                )}
              </span>
            </Button>
          )}
        >
          {(close) => (
            <div className="crewlet-data-view-toolbar__sort">
              <ul className="crewlet-data-view-toolbar__sort-list">
                {sortable.map((column) => {
                  const name = headerText(column);
                  const isAscending = sort?.key === column.key && sort.direction === 'asc';
                  const isDescending = sort?.key === column.key && sort.direction === 'desc';
                  return (
                    <li key={column.key} className="crewlet-data-view-toolbar__sort-row">
                      <span className="crewlet-data-view-toolbar__sort-label">{column.header}</span>
                      <span className="crewlet-data-view-toolbar__sort-buttons">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          pressed={isAscending}
                          label={labels.ascending(name)}
                          icon={<ArrowUpwardGlyph size="xs" />}
                          onClick={() => {
                            onSortChange({ key: column.key, direction: 'asc' });
                            close();
                          }}
                        />
                        <IconButton
                          size="sm"
                          variant="ghost"
                          pressed={isDescending}
                          label={labels.descending(name)}
                          icon={<ArrowDownwardGlyph size="xs" />}
                          onClick={() => {
                            onSortChange({ key: column.key, direction: 'desc' });
                            close();
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
              {sort ? (
                <div className="crewlet-data-view-toolbar__sort-footer">
                  <Button
                    variant="tertiary"
                    size="small"
                    leadingIcon={<CloseGlyph size="xs" />}
                    onClick={() => {
                      onSortChange(null);
                      close();
                    }}
                  >
                    {labels.clearSort}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Popover>
      ) : null}

      {onShowArchivedChange ? (
        <Button
          variant="secondary"
          size="small"
          pressed={showArchived}
          leadingIcon={showArchived ? <VisibilityGlyph size="sm" /> : <VisibilityOffGlyph size="sm" />}
          onClick={() => onShowArchivedChange(!showArchived)}
        >
          <span className="crewlet-data-view-toolbar__menu-label">
            {labels.showArchived(archivedLabel)}
            {archivedCount > 0 ? <Count value={archivedCount} label={labels.archivedCount(archivedLabel)} /> : null}
          </span>
        </Button>
      ) : null}

      {/*
        The spacer exists only when something is held to the end. Without it the
        search box absorbs the leftover width and stretches to meet the Filter
        button, which is what a toolbar with nothing on its right should do.
      */}
      {actions ? <div className="crewlet-data-view-toolbar__spacer" /> : null}
      {actions ? <div className="crewlet-data-view-toolbar__actions">{actions}</div> : null}
    </Toolbar>
  );
}

/** A column's name as plain words, for a control that has to say it. */
function headerText<TRow>(column: DataViewColumn<TRow>): string {
  return typeof column.header === 'string' ? column.header : column.key;
}
