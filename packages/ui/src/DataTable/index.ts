import './DataTable.css';

export { DataTable } from './DataTable.js';
export type {
  DataTableProps,
  DataTableColumn,
  DataTableSortState,
  DataTableRowAction,
  DataTableVariant,
  DataTableDensity,
} from './DataTable.js';

/*
 * CopyableCell is re-exported because it doubles as the canonical
 * "hover-revealed copy affordance" affixed to arbitrary children.
 * A custom cell renderer can wrap an email, id or IP address span in it
 * without re-implementing the icon-button + clipboard flow.
 */
export { CopyableCell } from './CopyableCell.js';
export type { CopyableCellProps } from './CopyableCell.js';
