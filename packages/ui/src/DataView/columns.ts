/**
 * How a list screen declares its columns, and how that becomes a table.
 *
 * AN ORDERED ARRAY, EACH COLUMN CARRYING ITS OWN KEY. [DataTable] holds
 * columns as a record keyed by field plus a separate order array, which is the
 * right shape for a table whose reader reorders and hides columns and stores
 * the result. It is the wrong shape for declaring a screen: the order and the
 * columns are then two things that can disagree, and every list screen wrote
 * the same twenty-line translation between them. The translation lives here
 * instead, once, so a screen declares what a reader sees, in the order they
 * see it, and there is still exactly one table underneath.
 */

import type { ReactNode } from 'react';
import type { DataTableColumn, DataTableSortState } from '../DataTable/index.js';
import type { DataViewColumnFilter } from './filters.js';

/** Which column a list is ordered by, and which way. The table's own type. */
export type DataViewSortState = DataTableSortState;

export interface DataViewColumn<TRow = unknown> extends Omit<DataTableColumn<TRow>, 'label'>, DataViewColumnFilter<TRow> {
  /** The field this column reads, and the key its sort and filter are kept under. */
  key: string;
  /** What the column is called, at the head of it. */
  header: ReactNode;
}

export interface TableColumns<TRow> {
  columns: Record<string, DataTableColumn<TRow>>;
  order: string[];
}

/**
 * The declared columns, as the table holds them.
 *
 * A column with no key is dropped rather than drawn under an empty heading:
 * the table reads every value by key, so a keyless column is a column of
 * nothing.
 */
export function tableColumns<TRow>(columns: readonly DataViewColumn<TRow>[]): TableColumns<TRow> {
  const record: Record<string, DataTableColumn<TRow>> = {};
  const order: string[] = [];
  for (const column of columns) {
    if (!column.key) continue;
    /*
     * The filter declarations are stripped here: they are this package's own
     * vocabulary and mean nothing to the table, and a property the table does
     * not know would otherwise ride along into whatever it spreads onto a cell.
     */
    const {
      key,
      header,
      filterable: _filterable,
      filterKind: _filterKind,
      filterOperator: _filterOperator,
      filterOptions: _filterOptions,
      filterMultiple: _filterMultiple,
      filterLabel: _filterLabel,
      filterValue: _filterValue,
      filterPlaceholder: _filterPlaceholder,
      ...rest
    } = column;
    order.push(key);
    record[key] = { ...rest, label: header };
  }
  return { columns: record, order };
}
