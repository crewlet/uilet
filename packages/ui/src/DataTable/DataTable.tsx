/*
 * DataTable is a generic primitive that accepts arbitrary row shapes
 * from its consumer. The row data is opaque to the primitive itself,
 * only the consumer-supplied column.render, sortValue, copyValue,
 * onRowClick, etc. know its real shape. Using `any` for the row
 * parameter across every callback signature avoids forcing a single
 * `Row` type on every consumer (the alternative would be plumbing
 * a generic TRow through every interface and helper function, which
 * blows up the public type surface for marginal benefit). A future
 * API revision can introduce that generic; for now the file opts
 * out of the no-explicit-any rule with this justification.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { Modal } from '../Modal/Modal.js';
import { Button } from '../Button/Button.js';
import { CopyableCell } from './CopyableCell.js';
import { RowActionsMenu } from './RowActionsMenu.js';


/**
 * DataTable, a feature-rich table primitive with two visual variants
 * (default and compact) sharing one data, sort, pagination and
 * persistence model.
 *
 * FEATURES:
 * - Resizable columns (drag column edges)
 * - Sortable columns (click headers)
 * - Column reordering (drag & drop in settings)
 * - Show/hide columns
 * - Customizable items per page
 * - localStorage persistence of all settings
 * - Custom cell rendering
 * - Row actions
 * - Responsive design
 * - Light/dark theme support
 * 
 * BASIC USAGE:
 * 
 *   const columns = {
 *     name: { label: 'Name', defaultWidth: 150 },
 *     email: { label: 'Email', defaultWidth: 200 },
 *     role: { label: 'Role', defaultWidth: 120 }
 *   };
 * 
 *   <DataTable
 *     data={users}
 *     columns={columns}
 *     storageKey="userTable"
 *     onRowAction={(row) => handleDelete(row)}
 *     getRowKey={(row) => row.id}
 *   />
 * 
 * CUSTOM RENDERING:
 * 
 *   const columns = {
 *     status: {
 *       label: 'Status',
 *       render: (row, value) => (
 *         <span style={{ color: value === 'active' ? 'green' : 'red' }}>
 *           {value}
 *         </span>
 *       )
 *     }
 *   };
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.data - Array of data objects to display
 * @param {Object} props.columns - Column configuration
 *   Each key is a column ID, value is an object with:
 *   - label: string (required) - Display name
 *   - render: function(row, value) - Custom render function
 *   - sortable: boolean - Enable sorting (default: true)
 *   - defaultVisible: boolean - Initially visible (default: true)
 *   - defaultWidth: number - Width in pixels (default: 120)
 * @param {string} props.storageKey - Unique key for localStorage (required for persistence)
 * @param {Array} props.defaultColumnOrder - Initial column order (default: Object.keys(columns))
 * @param {number} props.defaultItemsPerPage - Initial items per page (default: 10)
 * @param {Array} props.itemsPerPageOptions - Available page size options (default: [5,10,20,50,100])
 * @param {function} props.onRowAction - Callback for action button (receives row data)
 * @param {string} props.actionLabel - Action button tooltip (default: 'Delete')
 * @param {string} props.actionIcon - Material icon name (default: 'delete')
 * @param {function} props.getRowKey - Get unique row identifier (default: row => row.id)
 * @param {string} props.emptyMessage - No data message (default: 'No data available')
 * @param {boolean} props.showActions - Show action column (default: true)
 * @param {string} props.className - Additional CSS class
 */
export interface DataTableColumn {
  label: ReactNode;
  render?: (row: any, value: any) => ReactNode;
  sortable?: boolean;
  defaultVisible?: boolean;
  defaultWidth?: number;
  /** Override the value used when sorting this column (defaults to row[key]). */
  sortValue?: (row: any) => any;
  /**
   * Cell alignment. Mostly used in the compact variant for numeric columns
   * that should hug the right edge.
   */
  align?: 'left' | 'right' | 'center';
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
  copyValue?: (row: any) => any;
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
  direction: 'asc' | 'desc';
}

/**
 * Single action shown in the row-actions kebab menu. `rowActions` returns
 * a list of these per row; falsy entries are dropped, so a caller can
 * include an action conditionally with `condition && { ... }`.
 */
export interface DataTableRowAction {
  label: string;
  onClick?: () => void;
  icon?: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  visible?: boolean;
  description?: string;
  divider?: 'before' | 'after';
}

export type DataTableVariant = 'default' | 'compact';

/**
 * Row density for the compact variant. The two presets cover the two
 * places a compact table usually sits:
 *
 *   - 'compact'     13px font, 10/12px padding. For full-width list
 *                   pages where density matters more than air.
 *   - 'comfortable' 14px font, 12/14px padding with extra outer
 *                   24px on first/last cells. For tables inside a
 *                   section card, where the rows have to align with
 *                   the card's 24px inner padding.
 *
 * Has no effect on variant="default" since the default variant uses
 * its own resizable column widths.
 */
export type DataTableDensity = 'compact' | 'comfortable';

export interface DataTableProps {
  data?: any[];
  columns?: Record<string, DataTableColumn>;
  storageKey?: string;
  defaultColumnOrder?: string[] | null;
  defaultItemsPerPage?: number;
  itemsPerPageOptions?: number[];
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
  onRowAction?: ((row: any) => void) | null;
  actionLabel?: string;
  actionIcon?: string;
  getRowKey?: (row: any) => string | number;
  /** Pulls the row key from a fixed property (alternative to getRowKey). */
  rowKey?: string;
  emptyMessage?: ReactNode;
  showActions?: boolean;
  className?: string;
  /**
   * Visual treatment.
   * - 'default': roomier cells with the settings cog in the Actions
   *   column header; suited to directory-style tables an operator
   *   reshapes and revisits.
   * - 'compact': lighter chrome, tight padding, uppercase headers,
   *   full-row loading and error states, and the settings cog in the
   *   toolbar instead of the header row. Designed for dense list pages
   *   where the table sits inside an external Toolbar + Footer.
   * Both variants honour `resizable` and `settingsVariant`.
   */
  variant?: DataTableVariant;
  /**
   * Row density for the compact variant. Defaults to 'compact'.
   * See the DataTableDensity docs for what each preset paints.
   */
  density?: DataTableDensity;
  /**
   * Controlled sort state. When provided, the table delegates sort to
   * the caller (typical pairing: an external sort menu shares state
   * with the column headers). When omitted, sort is internal.
   */
  sort?: DataTableSortState | null;
  onSortChange?: (next: DataTableSortState | null) => void;
  /**
   * Multi-action menu per row. When supplied, an actions column is
   * appended on the right that renders a kebab popover. Takes precedence
   * over onRowAction (the single-button affordance).
   */
  rowActions?: (row: any) => Array<DataTableRowAction | null | undefined | false>;
  /** Dim rows the predicate marks as archived, with a left edge accent. */
  archivedPredicate?: (row: any) => boolean;
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
  /** When false, skip the built-in items-per-page slicing (caller paginates). */
  paginated?: boolean;
  /** When false, the settings cog and Actions column header are suppressed. */
  showSettings?: boolean;
  /**
   * Fires when a row's surface is clicked. Used by click-to-detail tables
   * (an order row opening its detail page, a log entry opening a drawer).
   * The compact variant also flips the row's cursor to pointer when this
   * prop is supplied. The row-actions kebab menu stops propagation so
   * clicking the kebab does not also trigger the row navigation.
   */
  onRowClick?: (row: any) => void;
  /**
   * Optional secondary row rendered immediately below each main row,
   * spanning the full column width. Returning null skips it for that
   * row. Used by tree-like tables (for example API keys grouped under
   * their owner) where each entity owns an attached detail strip that
   * visually belongs to the main row but does not share its column
   * layout.
   */
  renderAccessoryRow?: (row: any) => ReactNode | null | undefined;
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
   * When supplied, each row becomes expandable. Clicking the row (or
   * its built-in chevron) toggles a detail panel rendered immediately
   * below the row, spanning the full column width. Returning null
   * from the function suppresses expansion for that row.
   *
   * Mutually exclusive with onRowClick (expansion takes the click);
   * combine with rowActions freely since the kebab stops propagation.
   * Single-row expansion only, opening one row closes the previous.
   */
  renderExpandedRow?: (row: any) => ReactNode | null | undefined;
  /** Optional initial expanded row key (resolved via the row-key resolver). */
  defaultExpandedKey?: string | number | null;
  /**
   * Cursor-pagination footer. When hasMore is true, the table renders
   * a centered "Load more" button below the rows that fires onLoadMore.
   * The button is disabled while loadingMore is true (label flips to
   * "Loading…"). When hasMore is false, no footer is rendered; the
   * terminal "End of feed" state is intentionally silent.
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
   * Material Symbols glyph name rendered to the left of the title
   * (the same icon, title and description header a settings card uses). Folding
   * them into the table primitive lets the entire surface, header +
   * toolbar + table, share the same card boundary and spacing without
   * each caller recomposing the `<header><h2/><p/></header>` pattern.
   *
   * When a header is present, the table's right-side controls
   * (pagination chevrons + settings cog) move ONTO the header row so
   * the section title and the controls share the same line. The
   * caller-supplied filter slot (renderToolbar) renders on its own
   * row below the header.
   */
  title?: ReactNode;
  description?: ReactNode;
  icon?: string;
  /**
   * Settings modal shape.
   * - 'compact': page-size radio list + Wrap lines toggle, Cancel/Confirm
   *   footer. Right for the card-style tables that carry their own
   *   title + description in the header (clean surface, no filter row).
   * - 'rich': items-per-page chip row + drag-to-reorder column list +
   *   per-column visibility checkboxes. Right for tables that surface
   *   filters in a toolbar and benefit from operator-driven layout
   *   customisation (activity feeds, audit trails, access token lists).
   *
   * Default: when title / description / icon is set, the table uses
   * the compact modal (card-style); otherwise the rich modal. Pass an
   * explicit prop to override.
   */
  settingsVariant?: 'compact' | 'rich';
  /**
   * Initial value for the Wrap lines toggle (compact settings only).
   * When true, cells wrap their content with overflow-wrap: anywhere.
   * When false, cells stay on a single line and truncate with an
   * ellipsis. Persisted under `${storageKey}_wrapLines` when a
   * storageKey is provided.
   */
  defaultWrapLines?: boolean;
}

export const DataTable = ({
  data = [],
  columns = {},
  storageKey,
  defaultColumnOrder = null,
  defaultItemsPerPage = 10,
  minColumnWidth = 80,
  resizable = true,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  onRowAction = null,
  actionLabel = 'Delete',
  actionIcon = 'delete',
  getRowKey,
  rowKey,
  emptyMessage = 'No data available',
  showActions = true,
  className = '',
  variant = 'default',
  density = 'compact',
  sort: sortProp,
  onSortChange,
  rowActions,
  archivedPredicate,
  archivedLabel = 'archived',
  loading = false,
  skeletonRows = 5,
  error = null,
  paginated = true,
  showSettings = true,
  onRowClick,
  renderAccessoryRow,
  renderToolbar,
  onClearFilters,
  filtersActive = false,
  clearFiltersLabel = 'Clear filters',
  renderExpandedRow,
  defaultExpandedKey = null,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loadMoreLabel = 'Load more',
  title,
  description,
  icon,
  settingsVariant,
  defaultWrapLines,
}: DataTableProps) => {
  /*
   * Pick the settings modal shape from the caller's explicit prop;
   * otherwise infer it from whether a header is present. Card-style
   * tables (title / description / icon set) get the compact modal,
   * filter / toolbar tables get the rich modal (column reorder +
   * visibility + items-per-page chips).
   */
  const headerVisibleFlag = title != null || description != null || icon != null;
  const effectiveSettingsVariant: 'compact' | 'rich' =
    settingsVariant ?? (headerVisibleFlag ? 'compact' : 'rich');
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
  const resolveRowKey = (row: any): string | number => {
    if (getRowKey) return getRowKey(row);
    if (rowKey) return row?.[rowKey];
    return row?.id;
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

  // State management with localStorage persistence
  const [columnWidths, setColumnWidths] = useState(() => {
    if (!storageKey) return defaultColumnWidths;
    const saved = localStorage.getItem(`${storageKey}_columnWidths`);
    if (!saved) return defaultColumnWidths;
    /*
     * Migration + clamp on load: stale localStorage entries may carry
     * widths below the current minColumnWidth floor (e.g. older builds
     * hardcoded the legacy action column to 60). Start with the
     * generated defaults so any newly-added column has a width, then
     * fold in saved values, clamped to the floor. Internal slots
     * (keys starting with __) keep their stored value verbatim
     * because they aren't user-resizable and have their own sizing.
     */
    try {
      const parsed = JSON.parse(saved) as Record<string, number>;
      const merged: Record<string, number> = { ...defaultColumnWidths };
      Object.entries(parsed).forEach(([key, value]) => {
        const px = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (!Number.isFinite(px)) return;
        /*
         * Columns declared with an explicit `width` prop are locked
         * at that value and must NOT inherit the saved-from-previous-
         * session width. A column flagged as fixed but bloated to
         * (say) 169px in localStorage from an older build would
         * otherwise keep its bloated width forever, defeating the
         * `width` lock. Skip the merge for those keys so the seeded
         * default wins.
         */
        const col = columns[key];
        if (col?.width != null) return;
        merged[key] = key.startsWith('__') ? px : Math.max(minColumnWidth, px);
      });
      return merged;
    } catch {
      return defaultColumnWidths;
    }
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (!storageKey) return defaultItemsPerPage;
    const saved = localStorage.getItem(`${storageKey}_itemsPerPage`);
    return saved ? parseInt(saved, 10) : defaultItemsPerPage;
  });

  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (!storageKey) return defaultVisibleColumns;
    const saved = localStorage.getItem(`${storageKey}_visibleColumns`);
    if (saved) {
      const savedVisible = JSON.parse(saved);
      // Filter out columns that no longer exist and add new columns with default visibility
      const validVisible: Record<string, boolean> = {};
      Object.keys(columns).forEach(key => {
        validVisible[key] = Object.prototype.hasOwnProperty.call(savedVisible, key) ? savedVisible[key] : (columns[key]?.defaultVisible !== false);
      });
      return validVisible;
    }
    return defaultVisibleColumns;
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    if (!storageKey) return defaultOrder;
    const saved = localStorage.getItem(`${storageKey}_columnOrder`);
    if (saved) {
      // Filter out any columns that no longer exist in the columns config
      const savedOrder = JSON.parse(saved) as string[];
      const validOrder = savedOrder.filter((key: string) => Object.prototype.hasOwnProperty.call(columns, key));
      // Add any new columns that aren't in the saved order
      const newColumns = defaultOrder.filter((key: string) => !validOrder.includes(key));
      return validOrder.length > 0 ? [...validOrder, ...newColumns] : defaultOrder;
    }
    return defaultOrder;
  });

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>(
    { key: null, direction: null },
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
    const saved = localStorage.getItem(`${storageKey}_wrapLines`);
    return saved == null ? effectiveDefaultWrapLines : saved === 'true';
  });

  /*
   * Draft state for the settings modal. Both modal shapes (compact +
   * rich) use the same Reset / Cancel / Apply footer pattern: opening
   * the modal seeds the drafts from live state, all in-modal edits
   * mutate drafts only, Apply commits drafts to live state, Cancel
   * discards drafts, Reset to Default resets drafts (not live state).
   * Column resize via the table-header drag handle keeps writing to
   * live state directly since the modal is not open during that
   * interaction.
   */
  const [draftItemsPerPage, setDraftItemsPerPage] = useState<number>(0);
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
   * Single-row expansion state. Tracks the resolved row key of the
   * currently-open detail panel; null means none expanded. When
   * renderExpandedRow is not supplied this state is dormant.
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
   * allowed to occupy. needsFit drives the effect: it flips on
   * (mount, reset) and turns off as soon as the proportional grow
   * has been applied, so subsequent data refreshes do not keep
   * stretching columns past what the operator has already shaped.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [needsFit, setNeedsFit] = useState<boolean>(true);

  // Reset to default settings
  const resetToDefault = () => {
    const newDefaultWidths = generateDefaultColumnWidths();
    const newDefaultVisible = generateDefaultVisibleColumns();
    const newDefaultOrder = generateDefaultColumnOrder();

    setColumnWidths(newDefaultWidths);
    setVisibleColumns(newDefaultVisible);
    setColumnOrder(newDefaultOrder);
    setItemsPerPage(defaultItemsPerPage);
    setSortConfig({ key: null, direction: null });

    /*
     * Reopen the fit pass so the proportional grow-to-fit runs
     * again against the current container size. Without this the
     * reset widths stay pinned at their bare label-aware minimums
     * and the spacer absorbs the rest, defeating the reset.
     */
    setNeedsFit(true);

    // Clear from localStorage if storageKey exists
    if (storageKey) {
      localStorage.removeItem(`${storageKey}_columnWidths`);
      localStorage.removeItem(`${storageKey}_visibleColumns`);
      localStorage.removeItem(`${storageKey}_columnOrder`);
      localStorage.removeItem(`${storageKey}_itemsPerPage`);
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
  useLayoutEffect(() => {
    if (!needsFit) return;
    /*
     * Tables with a sticky-right column ignore persisted widths so the
     * fit always re-runs against the current container. Operators
     * cannot resize columns in those tables (all resize handles are
     * suppressed), so there is no operator intent to preserve, and a
     * stale entry from a non-sticky version of the same storageKey
     * would otherwise leave the regular columns claiming the gutter
     * the sticky cell needs.
     */
    const stickyColumnPresent = columnOrder.some(
      (k) => columns[k]?.sticky === 'right' && visibleColumns[k] !== false,
    );
    if (
      !stickyColumnPresent
      && storageKey
      && localStorage.getItem(`${storageKey}_columnWidths`)
    ) {
      setNeedsFit(false);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
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
     *   visibleFixedKeys   data columns declared with an explicit
     *                      `width` prop. These are pinned at that
     *                      width (think: avatar swatch, status icon,
     *                      kebab cap, anything that should never
     *                      ballon). Counted as chrome too so the fit
     *                      doesn't try to redistribute their width.
     *   visibleFlexKeys    data columns using `defaultWidth` (or the
     *                      label-aware default). These absorb the
     *                      leftover space proportionally.
     *
     * Columns split by `sticky === 'right'` AND by whether the caller
     * passed `column.width` vs `column.defaultWidth`. The semantic
     * difference: `width` is "lock at exactly this", `defaultWidth`
     * is "start at this and let the fit grow / shrink it".
     */
    const isFixedWidthColumn = (key: string): boolean => {
      const col = columns[key];
      if (!col) return false;
      if (col.sticky === 'right') return false;
      return col.width != null;
    };
    const visibleStickyKeys = visibleAllKeys.filter((key) => columns[key]?.sticky === 'right');
    const visibleFixedKeys = visibleAllKeys.filter((key) => isFixedWidthColumn(key));
    const visibleDataKeys = visibleAllKeys.filter(
      (key) => columns[key]?.sticky !== 'right' && !isFixedWidthColumn(key),
    );
    if (visibleDataKeys.length === 0) {
      setNeedsFit(false);
      return;
    }

    let chromeWidth = 0;
    if (expandable) chromeWidth += 32;
    if (hasActionColumn) chromeWidth += isCompact ? 48 : (columnWidths.__actions ?? 60);
    chromeWidth += visibleStickyKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    chromeWidth += visibleFixedKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    /*
     * Reserve a fixed breathing-room gutter to the left of the sticky
     * action column so the rightmost regular cell never touches the
     * pinned button. Without this, the fit pass distributes the full
     * leftover across regular columns, pushes the spacer to 0, and
     * the rightmost data cell butts directly against the sticky cell
     * with no visual separation. 24px reads as a clear cell gap and
     * also leaves the operator visual proof that the action column
     * is a separate frozen pane rather than an extension of the data
     * grid.
     */
    if (visibleStickyKeys.length > 0) {
      chromeWidth += 24;
    }

    const dataTotal = visibleDataKeys.reduce(
      (sum, key) => sum + (columnWidths[key] ?? minColumnWidth),
      0,
    );
    const available = containerWidth - chromeWidth;
    const leftover = available - dataTotal;
    setNeedsFit(false);
    /*
     * Within +/-1px of the target, treat the fit as already correct
     * (avoids a render cycle that produces no visible change). Outside
     * that window the proportional pass grows OR shrinks the regular
     * columns so they always fit the current container width. Shrink
     * is important for the responsive case: when the viewport narrows
     * (sidebar opens, window resize, etc.), the previously-fitted
     * widths now overflow, and the table would otherwise scroll
     * horizontally instead of compacting to fit.
     */
    if (Math.abs(leftover) <= 1) return;

    const next = { ...columnWidths };
    let distributed = 0;
    visibleDataKeys.forEach((key, idx) => {
      const current = columnWidths[key] ?? minColumnWidth;
      const rawShare = idx === visibleDataKeys.length - 1
        ? leftover - distributed
        : Math.round(leftover * (current / dataTotal));
      const proposed = current + rawShare;
      const clamped = Math.max(minColumnWidth, proposed);
      const realShare = clamped - current;
      next[key] = clamped;
      distributed += realShare;
    });
    setColumnWidths(next);
  }, [needsFit]);

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
        setNeedsFit(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Save to localStorage when settings change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_columnWidths`, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_itemsPerPage`, itemsPerPage.toString());
    }
  }, [itemsPerPage, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_visibleColumns`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_columnOrder`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, storageKey]);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_wrapLines`, String(wrapLines));
    }
  }, [wrapLines, storageKey]);

  // Column resizing handlers
  const handleMouseDownResize = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnKey] ?? minColumnWidth);
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
  }, [resizingColumn, startX, startWidth]);

  /*
   * Sort state. When a `sort` prop is passed the parent controls it; we
   * route handleSort through onSortChange instead of the internal setter.
   * Sort state is normalised to the existing sortConfig shape internally so
   * the rest of the rendering code can stay key/direction-driven.
   */
  const controlledSort = sortProp !== undefined;
  const effectiveSort: { key: string | null; direction: 'asc' | 'desc' | null } = controlledSort
    ? sortProp
      ? { key: sortProp.key, direction: sortProp.direction }
      : { key: null, direction: null }
    : sortConfig;

  const handleSort = (columnKey: string) => {
    if (!columns[columnKey]?.sortable && columns[columnKey]?.sortable !== undefined) {
      return;
    }

    let direction: 'asc' | 'desc' | null = 'asc';
    if (effectiveSort.key === columnKey) {
      if (effectiveSort.direction === 'asc') {
        direction = 'desc';
      } else if (effectiveSort.direction === 'desc') {
        direction = null;
      }
    }

    const next: DataTableSortState | null = direction
      ? { key: columnKey, direction }
      : null;

    if (controlledSort) {
      onSortChange?.(next);
    } else {
      setSortConfig({ key: next?.key ?? null, direction: next?.direction ?? null });
    }
  };

  const getSortedData = () => {
    const sortKey = effectiveSort.key;
    if (!sortKey || !effectiveSort.direction) {
      return [...data];
    }

    const column = columns[sortKey];
    const accessor = column?.sortValue ?? ((row: any) => row[sortKey]);

    return [...data].sort((a: any, b: any) => {
      const aValue = accessor(a);
      const bValue = accessor(b);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
      }

      return effectiveSort.direction === 'asc' ? comparison : -comparison;
    });
  };

  /*
   * Pagination. currentPage is 1-indexed. Reset to page 1 whenever
   * the sort changes or the underlying row count changes so the
   * operator never lands on a phantom page after a refresh.
   */
  const [currentPage, setCurrentPage] = useState(1);
  const sortedDataMemo = getSortedData();
  const totalPages = paginationEnabled
    ? Math.max(1, Math.ceil(sortedDataMemo.length / Math.max(1, itemsPerPage)))
    : 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSort.key, effectiveSort.direction, sortedDataMemo.length]);

  const getDisplayedData = () => {
    if (!paginationEnabled) return sortedDataMemo;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDataMemo.slice(start, start + itemsPerPage);
  };

  // Table settings handlers. They mutate draft state only.
  const handleToggleColumn = (columnKey: string) => {
    setDraftVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const handleItemsPerPageChange = (value: number) => {
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
    setDraftSortConfig({ key: null, direction: null });
    pendingFitOnApplyRef.current = true;
    setResetConfirmed(true);
    if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
    resetConfirmTimer.current = setTimeout(() => setResetConfirmed(false), 1500);
  };

  /*
   * Opening the modal seeds every draft from the live state so the
   * modal opens reflecting the table's current configuration. Sort
   * is also captured so Reset can restore "no sort" via Apply and
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
    setItemsPerPage(draftItemsPerPage);
    setVisibleColumns(draftVisibleColumns);
    setColumnOrder(draftColumnOrder);
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
       * Clear the persisted width entry before re-arming the fit so
       * the layout effect's localStorage gate does not see a stale
       * value and skip the grow-to-fit pass. The save useEffect runs
       * after the fitted widths land and rewrites the entry.
       */
      if (storageKey) {
        localStorage.removeItem(`${storageKey}_columnWidths`);
      }
      setNeedsFit(true);
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

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && tableSettingsOpen) {
        setTableSettingsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [tableSettingsOpen]);

  /*
   * Cell renderer. The compact variant honours per-column align / mono /
   * copyable / width; the default variant ignores these and applies the
   * resizable pixel width tracked in columnWidths. Copyable cells wrap
   * the rendered content in CopyableCell, the same hover-revealed copy
   * affordance the standalone CopyableCell export provides.
   */
  const renderCellContent = (row: any, columnKey: string) => {
    const column = columns[columnKey];
    const value = row[columnKey];

    if (column?.render) {
      return column.render(row, value);
    }

    // An en dash marks an empty cell: it reads as "no value" without
    // implying zero.
    return value !== null && value !== undefined ? value : '–';
  };

  const renderBodyCell = (row: any, columnKey: string) => {
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
      /*
       * column.align is intentionally ignored: every DataTable in the
       * design system left-aligns header + cell content for visual
       * consistency. The prop is accepted by the type so existing
       * call sites keep type-checking, but it is treated as a no-op.
       */
      if (column.mono) {
        style.fontFamily = 'var(--font-family-mono)';
        style.fontSize = 11;
      }
    } else {
      style.width = `${columnWidths[columnKey]}px`;
    }

    const rendered = renderCellContent(row, columnKey);
    let content: ReactNode = rendered;

    if (isCompact && column.copyable) {
      const raw = column.copyValue ? column.copyValue(row) : row[columnKey];
      const copyText = raw !== undefined && raw !== null ? String(raw) : '';
      content = (
        <CopyableCell value={copyText} ariaLabel={`Copy ${typeof column.label === 'string' ? column.label : columnKey}`}>
          {rendered}
        </CopyableCell>
      );
    }

    const tdClassName = isCompact && column.sticky === 'right'
      ? 'crewlet-data-table__td--sticky-right'
      : undefined;
    return <td key={columnKey} style={style} className={tdClassName}>{content}</td>;
  };

  const renderHeaderCell = (columnKey: string) => {
    if (!visibleColumns[columnKey]) return null;
    const column = columns[columnKey];
    if (!column) return null;
    const isSortable = column.sortable !== false;
    const isActive = effectiveSort.key === columnKey;
    const arrow = !isSortable
      ? null
      : isActive
        ? effectiveSort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
        : 'unfold_more';

    if (isCompact) {
      const style: React.CSSProperties = {};
      if (columnWidths[columnKey] != null) {
        style.width = `${columnWidths[columnKey]}px`;
      }
      /*
       * column.align is intentionally ignored here too (see renderCell).
       * Header labels and sort buttons always render flush-left so
       * every column in every table reads with the same baseline.
       */

      /*
       * Resizer: right-edge drag handle present on every data column
       * in the compact variant. mousedown stops propagation so the
       * surrounding sort button does not also fire. The cursor and
       * hover styling are owned by the .crewlet-data-table__resizer
       * CSS rule.
       */
      const isSticky = column.sticky === 'right';
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
        (k) => columns[k]?.sticky === 'right' && visibleColumns[k] !== false,
      );
      const suppressResizer = !resizable || isSticky || visibleStickyExists;
      const resizer = suppressResizer ? null : (
        <span
          className="crewlet-data-table__resizer"
          onMouseDown={(e) => { e.stopPropagation(); handleMouseDownResize(e, columnKey); }}
          onClick={(e) => e.stopPropagation()}
          aria-hidden
        />
      );

      const stickyClass = isSticky ? ' crewlet-data-table__th--sticky-right' : '';

      if (!isSortable) {
        return (
          <th key={columnKey} style={style} className={stickyClass.trim() || undefined}>
            {column.label}
            {resizer}
          </th>
        );
      }

      const thClass = `crewlet-data-table__th--sortable${isActive ? ' is-active' : ''}${stickyClass}`;

      return (
        <th key={columnKey} style={style} className={thClass}>
          <button
            type="button"
            className="crewlet-data-table__sort-button"
            onClick={() => handleSort(columnKey)}
          >
            <span>{column.label}</span>
            {arrow && <span className="material-symbols-outlined">{arrow}</span>}
          </button>
          {resizer}
        </th>
      );
    }

    return (
      <th
        key={columnKey}
        style={{ width: `${columnWidths[columnKey]}px` }}
        className={isSortable ? 'crewlet-data-table__th--sortable' : undefined}
        onClick={isSortable ? () => handleSort(columnKey) : undefined}
      >
        <div className="crewlet-data-table__header-content">
          <span>{column.label}</span>
          {isSortable && (
            <span className={`material-symbols-outlined crewlet-data-table__sort-icon${isActive ? ' is-active' : ''}`}>
              {arrow}
            </span>
          )}
        </div>
        <div
          className="crewlet-data-table__column-resizer"
          onMouseDown={(e) => handleMouseDownResize(e, columnKey)}
          onClick={(e) => e.stopPropagation()}
        />
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
  const hasActionColumn = !!rowActions || (showActions && !!onRowAction);

  const renderActionsHeader = () => {
    if (!hasActionColumn) return null;
    if (!settingsInHeader) {
      return (
        <th
          key="__actions"
          className="crewlet-data-table__th--chrome crewlet-data-table__th--actions"
          style={{ width: 1 }}
        />
      );
    }
    return (
      <th key="__actions" style={{ width: `${columnWidths.__actions}px`, position: 'relative' }}>
        Actions
        <button
          type="button"
          className="crewlet-data-table__header-btn crewlet-data-table__header-btn--reset"
          onClick={(e) => { e.stopPropagation(); resetToDefault(); }}
          title="Reset to Default"
        >
          <span className="material-symbols-outlined">settings_backup_restore</span>
        </button>
        <button
          type="button"
          ref={settingsButtonRef}
          className="crewlet-data-table__header-btn crewlet-data-table__header-btn--settings"
          onClick={(e) => { e.stopPropagation(); openTableSettings(); }}
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </th>
    );
  };

  const renderActionsCell = (row: any) => {
    if (!hasActionColumn) return null;
    if (rowActions) {
      const actions = rowActions(row);
      return (
        <td
          key="__actions"
          className="crewlet-data-table__td--actions"
          style={{ textAlign: 'right', width: 1 }}
        >
          <RowActionsMenu actions={actions} />
        </td>
      );
    }
    return (
      <td
        key="__actions"
        className="crewlet-data-table__td--actions"
        style={{ width: `${columnWidths.__actions}px`, textAlign: 'center' }}
      >
        <button
          type="button"
          className="crewlet-data-table__action-btn"
          onClick={() => onRowAction!(row)}
          title={actionLabel}
        >
          <span className="material-symbols-outlined">{actionIcon}</span>
        </button>
      </td>
    );
  };

  const displayedData = getDisplayedData();
  const visibleColumnKeys = columnOrder.filter((key: string) => visibleColumns[key]);
  /*
   * +1 for the trailing spacer column the compact variant always
   * renders. The spacer absorbs whatever width is left over after
   * the user-defined columns, so the table never shrinks below its
   * container width even when every data column is dragged to its
   * minimum. Resize math stays 1:1 because the spacer (not the
   * user's columns) gives up width during proportional fill.
   */
  const spacerCols = isCompact ? 1 : 0;
  const colSpan = visibleColumnKeys.length + (hasActionColumn ? 1 : 0) + spacerCols;

  const wrapLinesClass = wrapLines ? ' crewlet-data-table--wrap-lines' : '';
  const rootClass = isCompact
    ? `crewlet-data-table crewlet-data-table--compact crewlet-data-table--density-${density}${wrapLinesClass} ${className}`.trim()
    : `crewlet-data-table crewlet-data-table--default${wrapLinesClass} ${className}`.trim();

  /*
   * Expansion column gating. When renderExpandedRow is supplied, a
   * chevron column is auto-appended on the right (after the action
   * column, if any) so each row exposes an expand affordance even
   * when the whole row is also clickable.
   */
  const expandable = !!renderExpandedRow;
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
          aria-label={allExpanded ? 'Collapse all rows' : 'Expand all rows'}
          aria-expanded={allExpanded}
          title={allExpanded ? 'Collapse all' : 'Expand all'}
        >
          <span
            className={`material-symbols-outlined crewlet-data-table__chevron${allExpanded ? ' is-open' : ''}`}
            aria-hidden
          >
            chevron_right
          </span>
        </button>
      </th>
    );
  };

  const renderExpandCell = (_row: any, isOpen: boolean, canExpand: boolean) => {
    if (!expandable) return null;
    /*
     * Rows whose renderExpandedRow returned null are not expandable:
     * keep the cell (column alignment) but drop the chevron so the
     * row does not advertise an affordance that does nothing.
     */
    return (
      <td key="__expand" className="crewlet-data-table__expand-cell" aria-hidden style={{ width: 32 }}>
        {canExpand && (
          <span
            className={`material-symbols-outlined crewlet-data-table__chevron${isOpen ? ' is-open' : ''}`}
          >
            chevron_right
          </span>
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
   * Pagination chevrons + settings cog always render in the compact
   * variant. The `paginated` prop only controls whether the data prop
   * is sliced client-side; the chevrons remain visible either way so
   * every table reads with the same chrome. Tables that explicitly
   * disable the cog via showSettings={false} hide it, leaving the
   * chevrons + separator in place.
   */
  const topControlsVisible = isCompact;

  const headerVisible = title != null || description != null || icon != null;

  /*
   * When a header is present, the right-side controls (pagination +
   * settings cog) ride along on the header row so the section title
   * and the controls share one line, AWS-style. When no header is
   * present, they stay on the toolbar row (which also hosts the
   * caller-supplied renderToolbar filters).
   */
  const renderTopControls = topControlsVisible ? (
    <div className="crewlet-data-table__toolbar-end">
      <div className="crewlet-data-table__pagination" aria-label="Pagination">
        <button
          type="button"
          className="crewlet-data-table__page-btn"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
        </button>
        <span className="crewlet-data-table__page-number" aria-live="polite">
          {currentPage}
        </span>
        <button
          type="button"
          className="crewlet-data-table__page-btn"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
        </button>
      </div>
      {settingsEnabled && (
        <button
          type="button"
          ref={settingsButtonRef}
          className="crewlet-data-table__settings-btn"
          onClick={openTableSettings}
          aria-label="Table settings"
          title="Table settings"
        >
          <span className="material-symbols-outlined" aria-hidden>settings</span>
        </button>
      )}
    </div>
  ) : null;

  const toolbarVisible = renderToolbar != null || (topControlsVisible && !headerVisible);

  return (
    <div className={rootClass}>
      {headerVisible && (
        <header className="crewlet-data-table__header">
          {icon != null && (
            <span className="material-symbols-outlined crewlet-data-table__header-icon" aria-hidden>
              {icon}
            </span>
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
          {topControlsVisible && !headerVisible && renderTopControls}
        </div>
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
            (k) => columns[k]?.sticky === 'right' && visibleColumns[k] !== false,
          )
            ? 'crewlet-data-table__rail--frozen'
            : undefined,
        ].filter(Boolean).join(' ')}
        style={isCompact ? ({
          '--crewlet-data-table-sticky-pane-width': `${columnOrder
            .filter((key) => columns[key]?.sticky === 'right' && visibleColumns[key] !== false)
            .reduce((sum, key) => sum + (columnWidths[key] ?? minColumnWidth), 0)}px`,
        } as React.CSSProperties) : undefined}
      >
      <div className="crewlet-data-table__scroll" ref={scrollRef}>
      <table className="crewlet-data-table__table">
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
                (key) => columns[key]?.sticky !== 'right' && visibleColumns[key] !== false,
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
                    .filter((key) => columns[key]?.sticky === 'right' && visibleColumns[key] !== false)
                    .map((columnKey) => (
                      <td key={columnKey} className="crewlet-data-table__td--sticky-right" />
                    ))}
                  {hasActionColumn && <td key="__actions" className="crewlet-data-table__td--actions" />}
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
                colSpan={expandColSpan}
                className="crewlet-data-table__empty"
              >
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
              const isClickable = !!onRowClick || canExpand;
              const trClass = [
                isArchived ? 'crewlet-data-table__row--archived' : undefined,
                isClickable ? 'crewlet-data-table__row--clickable' : undefined,
                canExpand ? 'crewlet-data-table__row--expandable' : undefined,
                expanded ? 'is-expanded' : undefined,
              ].filter(Boolean).join(' ');
              const accessory = renderAccessoryRow ? renderAccessoryRow(row) : null;
              const onRowSurfaceClick = canExpand
                ? () => toggleExpanded(trKey)
                : onRowClick
                  ? () => onRowClick(row)
                  : undefined;
              return (
                <React.Fragment key={trKey ?? JSON.stringify(row)}>
                  <tr
                    className={trClass || undefined}
                    title={isArchived ? `This row is ${archivedLabel}` : undefined}
                    onClick={onRowSurfaceClick}
                    tabIndex={canExpand ? 0 : undefined}
                    aria-expanded={canExpand ? expanded : undefined}
                    onKeyDown={canExpand ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded(trKey);
                      }
                    } : undefined}
                  >
                    {renderExpandCell(row, expanded, canExpand)}
                    {columnOrder
                      .filter((columnKey) => columns[columnKey]?.sticky !== 'right')
                      .map((columnKey) => {
                        if (!visibleColumns[columnKey]) return null;
                        return renderBodyCell(row, columnKey);
                      })}
                    {isCompact && (
                      <td key="__spacer" className="crewlet-data-table__td--spacer" aria-hidden />
                    )}
                    {columnOrder
                      .filter((columnKey) => columns[columnKey]?.sticky === 'right')
                      .map((columnKey) => {
                        if (!visibleColumns[columnKey]) return null;
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
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : loadMoreLabel}
          </Button>
        </div>
      )}

      {/*
        Table Settings modal. Two shapes share the same footer
        pattern: Reset to Default on the left, Cancel + Apply on the
        right. Both open with the drafts seeded from live state, all
        edits mutate drafts, Apply commits to live state, Cancel
        discards.
          - 'compact': page-size chip row + Wrap lines toggle.
          - 'rich':    items-per-page chip row + Wrap lines toggle +
                       drag-to-reorder column list with visibility
                       checkboxes.
       */}
      <Modal
        open={tableSettingsOpen}
        onClose={cancelTableSettings}
        title="Table Settings"
        size={effectiveSettingsVariant === 'compact' ? 'sm' : 'lg'}
        footer={(
          <div className="crewlet-data-table__settings-footer">
            <Button
              variant="secondary"
              onClick={handleResetTableSettings}
              leadingIcon={resetConfirmed ? (
                <span
                  className="material-symbols-outlined crewlet-data-table__reset-confirm-icon"
                  aria-hidden
                >
                  check
                </span>
              ) : undefined}
              aria-live="polite"
            >
              Reset to Default
            </Button>
            <div className="crewlet-data-table__settings-footer-right">
              <Button variant="tertiary" onClick={cancelTableSettings}>
                Cancel
              </Button>
              <Button variant="primary" onClick={applyTableSettings}>
                Apply
              </Button>
            </div>
          </div>
        )}
      >
        <div className="crewlet-data-table__settings-section">
          <h3 className="crewlet-data-table__settings-section-title">
            {effectiveSettingsVariant === 'compact' ? 'Page size' : 'Items per page'}
          </h3>
          <div className="crewlet-data-table__items-per-page-options">
            {itemsPerPageOptions.map((value) => (
              <button
                key={value}
                type="button"
                className={`crewlet-data-table__items-per-page-btn${draftItemsPerPage === value ? ' is-active' : ''}`}
                onClick={() => handleItemsPerPageChange(value)}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              className={`crewlet-data-table__items-per-page-btn${draftItemsPerPage === data.length ? ' is-active' : ''}`}
              onClick={() => handleItemsPerPageChange(data.length)}
            >
              All
            </button>
          </div>
        </div>

        <div className="crewlet-data-table__settings-section">
          <label className="crewlet-data-table__toggle-row">
            <input
              type="checkbox"
              className="crewlet-data-table__toggle-checkbox"
              checked={draftWrapLines}
              onChange={(e) => setDraftWrapLines(e.target.checked)}
            />
            <span className="crewlet-data-table__toggle-text">
              <span className="crewlet-data-table__toggle-label">Wrap lines</span>
              <span className="crewlet-data-table__toggle-hint">
                Enable to wrap table cell content, disable to truncate text.
              </span>
            </span>
          </label>
        </div>

        {effectiveSettingsVariant === 'rich' && (
          <div className="crewlet-data-table__settings-section">
            <h3 className="crewlet-data-table__settings-section-title">Column Order & Visibility</h3>
            <p className="crewlet-data-table__settings-section-hint">Drag to reorder, check/uncheck to show/hide</p>
            <div className="crewlet-data-table__column-toggles">
              {draftColumnOrder.map((key) => (
                <div
                  key={key}
                  className={`crewlet-data-table__column-toggle-item${draggedColumn === key ? ' is-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, key)}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDrop={(e) => handleDrop(e, key)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="material-symbols-outlined crewlet-data-table__column-drag-handle">drag_indicator</span>
                  <input
                    type="checkbox"
                    checked={!!draftVisibleColumns[key]}
                    onChange={() => handleToggleColumn(key)}
                    className="crewlet-data-table__column-toggle-checkbox"
                  />
                  <span className="crewlet-data-table__column-toggle-label">
                    {/*
                      Fall back to the column key when the label is
                      blank (decorative columns like an avatar swatch
                      that ship label=""). Otherwise the toggle row
                      shows an unlabeled checkbox and operators cannot
                      tell which column they are about to hide.
                    */}
                    {columns[key]?.label && String(columns[key]?.label).trim() !== ''
                      ? columns[key]?.label
                      : key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};



