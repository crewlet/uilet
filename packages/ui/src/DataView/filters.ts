/**
 * What a list screen can be narrowed by, and what narrowing means.
 *
 * THE MODEL, IN ONE PLACE. A filter has a NAME (the key its value is kept
 * under), a LABEL (what a reader calls it), a KIND (what sort of value it
 * holds) and an OPERATOR (what comparing that value to a row means). Every
 * screen that filters a table needs all four, and the two halves that were
 * written per screen before this existed disagreed at once: one read "contains"
 * as case sensitive, one dropped rows whose value was absent and one kept them.
 *
 * WHERE THE DEFINITIONS COME FROM. Either the columns themselves
 * ([filterDefsFromColumns]), which is how "every column should be filterable"
 * is satisfied without writing a second schema beside the first, or the screen
 * (the `filters` prop), which is how a screen declares an axis the table has no
 * column for, or one the SERVER filters rather than the browser.
 *
 * WHO APPLIES THEM. [applyColumnFilters] applies the filters derived from
 * COLUMNS and nothing else, because a column that says `filterable` is saying
 * "narrow these rows here". A screen-declared filter is the screen's own: it
 * usually goes into a query string and comes back as fewer rows, and a browser
 * that also applied it would filter twice, once against a row field that does
 * not exist. That split is the whole contract, and it is what keeps the URL out
 * of the component.
 *
 * A VALUE IS COMPARED AS TEXT unless both sides are numbers. A row's id is a
 * string in one API and a number in the next, and an operator that answered
 * differently for the two would be a filter that works on one screen.
 */

import type { ReactNode } from 'react';

/** What sort of value a filter holds. */
export type FilterKind = 'text' | 'number' | 'select' | 'datetime';

/**
 * What comparing a filter's value to a row means.
 *
 * Six, and each one is a sentence a reader could say out loud: a name
 * CONTAINS what was typed, a status IS one thing, a role IS ANY OF several, a
 * count EQUALS a number, an event happened ON OR AFTER a moment or ON OR
 * BEFORE one. The pair at the end is why this is a named operator rather than
 * a property of the kind: a window between two moments is two filters over one
 * column, and with a single hard-coded "after" the later bound could only be
 * had by declaring a second, duplicate column.
 */
export type FilterOperator = 'contains' | 'is' | 'is-any-of' | 'equals' | 'on-or-after' | 'on-or-before';

export type FilterOptionValue = string | number;

export interface FilterOption {
  value: FilterOptionValue;
  label: string;
  /** Unavailable, and left in the list so a reader learns the answer exists. */
  disabled?: boolean | undefined;
}

/** What a filter is set to. An array only in a multiple-choice filter. */
export type FilterValue = string | number | readonly FilterOptionValue[] | null | undefined;

/** Every filter's value, by name. A screen owns this object and its history. */
export type FilterValues = Record<string, FilterValue>;

export interface FilterDef<TRow = unknown> {
  /** The key this filter's value is kept under, and a column key when it came from one. */
  name: string;
  /** What a reader calls it, in the Filter menu and on the chip. */
  label: string;
  /** Text by default: the kind most filters are, and the one a search box is. */
  kind?: FilterKind | undefined;
  /** What comparing means. Left out, the kind's own default (see [defaultOperator]). */
  operator?: FilterOperator | undefined;
  /** The answers, for a `select`. */
  options?: readonly FilterOption[] | undefined;
  /** Several answers at once, for a `select`. */
  multiple?: boolean | undefined;
  /** The example shown in an empty editor or search box. */
  placeholder?: string | undefined;
  /**
   * Marks the one filter drawn as the toolbar's search box. It is always on
   * screen, so it never appears in the Filter menu and never becomes a chip:
   * a screen that hid its search behind "add a filter" is a screen where
   * nobody finds the search.
   */
  role?: 'search' | undefined;
  /** Whether Enter in the search box commits. True by default. */
  submitOnEnter?: boolean | undefined;
  /**
   * Where the value is read from a row when this filter is applied in the
   * browser. Defaults to `row[name]`.
   */
  value?: ((row: TRow) => unknown) | undefined;
}

/**
 * What a filter means when its own operator is left out.
 *
 * Text contains, because a person typing three letters of a name is looking
 * for the name that holds them. A number equals, because a partial number is
 * not a fact about anything. One choice IS, several ARE ANY OF. A moment is on
 * or after, which is the "since" a reader asks a log for.
 */
export function defaultOperator(def: Pick<FilterDef, 'kind' | 'multiple'>): FilterOperator {
  switch (def.kind ?? 'text') {
    case 'select':
      return def.multiple === true ? 'is-any-of' : 'is';
    case 'number':
      return 'equals';
    case 'datetime':
      return 'on-or-after';
    default:
      return 'contains';
  }
}

export function operatorOf(def: FilterDef<never> | FilterDef<unknown>): FilterOperator {
  return def.operator ?? defaultOperator(def);
}

/**
 * The value a filter has when it is not narrowing anything.
 *
 * NOT ALWAYS THE EMPTY STRING. A single-choice filter's first option is its
 * "any" answer by convention ("All roles", "Any status"), so clearing that
 * filter means going back to that option rather than to a value the list does
 * not offer, which would leave the control showing a placeholder over a list
 * where every answer is unselected.
 */
export function blankFilterValue(def: FilterDef<never> | FilterDef<unknown>): FilterValue {
  if (def.kind === 'select' && def.multiple === true) return [];
  if (def.kind === 'select' && def.options && def.options.length > 0) return def.options[0]?.value ?? '';
  return '';
}

/** Whether a filter is narrowing anything, which is what decides its chip. */
export function filterHasValue(def: FilterDef<never> | FilterDef<unknown>, value: FilterValue): boolean {
  if (def.kind === 'select' && def.multiple === true) return Array.isArray(value) && value.length > 0;
  if (value === undefined || value === null || value === '') return false;
  if (def.kind === 'select' && def.options && def.options.length > 0) {
    return String(value) !== String(def.options[0]?.value);
  }
  return true;
}

/** A value as text, for the comparisons that are text comparisons. */
function asText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/** A moment as a number, or NaN for anything that is not one. */
function asTime(value: unknown): number {
  if (value === undefined || value === null || value === '') return Number.NaN;
  if (value instanceof Date) return value.getTime();
  return new Date(String(value)).getTime();
}

/**
 * What this filter does to a row, or null when it does nothing.
 *
 * NULL RATHER THAN A PREDICATE THAT ALWAYS ANSWERS TRUE, so a caller can count
 * how many filters are actually narrowing the list, and so an unset filter
 * costs nothing per row.
 *
 * A ROW WITH NO VALUE FAILS EVERY OPERATOR. A seat with no last-seen time is
 * not before every moment and not after any of them: it was never measured,
 * and answering either way would put it in a list it does not belong to. It is
 * the same rule the table's comparator keeps when it sorts absent values last
 * in both directions.
 *
 * WHAT "DOES NOTHING" MEANS IS [filterHasValue], AND ONLY THAT. A single-choice
 * filter's blank answer is the first option its own list offers, which is very
 * often a word rather than the empty string ("All roles", "Any status"). Asked
 * here as "is the value empty", a filter cleared back to that answer went on
 * comparing every row against the word `all`, matched none of them, and handed
 * back an empty table under a chip row that had just been emptied. Two
 * definitions of the same fact is what did it, so there is one.
 */
export function filterPredicate<TRow>(def: FilterDef<TRow>, value: FilterValue): ((row: TRow) => boolean) | null {
  if (!filterHasValue(def, value)) return null;

  const read = def.value ?? ((row: TRow) => (row as Record<string, unknown> | null | undefined)?.[def.name]);
  const operator = operatorOf(def);

  if (operator === 'is-any-of') {
    // An empty list of answers narrows nothing. The check above catches it for
    // the multiple-choice KIND; this catches the operator asked for by name on
    // a filter of any other kind.
    const wanted = Array.isArray(value) ? value : [];
    if (wanted.length === 0) return null;
    const set = new Set(wanted.map((entry) => String(entry)));
    return (row) => set.has(asText(read(row)));
  }

  if (operator === 'is') {
    return (row) => asText(read(row)) === String(value);
  }

  if (operator === 'equals') {
    const wanted = Number(value);
    if (Number.isNaN(wanted)) return null;
    return (row) => {
      const raw = read(row);
      if (raw === undefined || raw === null || raw === '') return false;
      return Number(raw) === wanted;
    };
  }

  if (operator === 'on-or-after' || operator === 'on-or-before') {
    const edge = asTime(value);
    if (Number.isNaN(edge)) return null;
    const after = operator === 'on-or-after';
    return (row) => {
      const at = asTime(read(row));
      if (Number.isNaN(at)) return false;
      return after ? at >= edge : at <= edge;
    };
  }

  // contains, case insensitive, over the text of the value.
  const needle = String(value).trim().toLowerCase();
  if (needle === '') return null;
  return (row) => {
    const raw = read(row);
    if (raw === undefined || raw === null) return false;
    return String(raw).toLowerCase().includes(needle);
  };
}

/**
 * Every filter, folded over the rows: AND between filters, OR inside a
 * multiple-choice one.
 *
 * The array is returned UNCHANGED when nothing is narrowing it, so a table
 * whose rows did not move does not re-render on a keystroke in an unrelated
 * box.
 */
export function applyFilters<TRow>(rows: readonly TRow[], defs: readonly FilterDef<TRow>[], values: FilterValues | undefined): readonly TRow[] {
  if (!values || rows.length === 0 || defs.length === 0) return rows;
  const predicates: ((row: TRow) => boolean)[] = [];
  for (const def of defs) {
    const predicate = filterPredicate(def, values[def.name]);
    if (predicate) predicates.push(predicate);
  }
  if (predicates.length === 0) return rows;
  return rows.filter((row) => predicates.every((predicate) => predicate(row)));
}

/**
 * A column, as a list screen declares one.
 *
 * `header` rather than `label`, and an ARRAY rather than a keyed record,
 * because a list screen's columns are an ordered list of fields and writing
 * them as a record plus a separate order array made the order and the columns
 * two things that could disagree. [DataView] translates this into the shape
 * [DataTable] holds, so there is one table underneath.
 */
export interface DataViewColumnFilter<TRow> {
  /** Offers this column in the Filter menu. */
  filterable?: boolean | undefined;
  /** What sort of value it holds. Text by default. */
  filterKind?: FilterKind | undefined;
  /** What comparing means. The kind's default otherwise. */
  filterOperator?: FilterOperator | undefined;
  /** The answers, for `filterKind: 'select'`. */
  filterOptions?: readonly FilterOption[] | undefined;
  /** Several answers at once. */
  filterMultiple?: boolean | undefined;
  /** What the chip and the menu call it. The header otherwise. */
  filterLabel?: string | undefined;
  /** Where the value is read from a row. `row[key]` otherwise. */
  filterValue?: ((row: TRow) => unknown) | undefined;
  /** The example shown in an empty editor. */
  filterPlaceholder?: string | undefined;
}

interface ColumnLike<TRow> extends DataViewColumnFilter<TRow> {
  key: string;
  header?: ReactNode;
}

/**
 * The filters the columns themselves declare.
 *
 * A column opts in with `filterable`, and the Filter menu picks it up with no
 * second schema to keep in step. A column whose header is not a string needs
 * `filterLabel`: a chip reading "[object Object]" is worse than one the screen
 * had to name.
 */
export function filterDefsFromColumns<TRow>(columns: readonly ColumnLike<TRow>[]): FilterDef<TRow>[] {
  const out: FilterDef<TRow>[] = [];
  for (const column of columns) {
    if (!column.filterable) continue;
    const def: FilterDef<TRow> = {
      name: column.key,
      label: column.filterLabel ?? (typeof column.header === 'string' ? column.header : column.key),
      kind: column.filterKind ?? 'text',
    };
    if (column.filterOperator) def.operator = column.filterOperator;
    if (column.filterPlaceholder) def.placeholder = column.filterPlaceholder;
    if (column.filterValue) def.value = column.filterValue;
    if ((column.filterKind ?? 'text') === 'select') {
      def.options = column.filterOptions ?? [];
      def.multiple = column.filterMultiple === true;
    }
    out.push(def);
  }
  return out;
}

/**
 * The rows a table shows, once the filters its own COLUMNS declare have been
 * applied. A screen-declared filter is not applied here; see the note at the
 * top of this file.
 */
export function applyColumnFilters<TRow>(
  rows: readonly TRow[],
  columns: readonly ColumnLike<TRow>[],
  values: FilterValues | undefined,
): readonly TRow[] {
  return applyFilters(rows, filterDefsFromColumns(columns), values);
}
