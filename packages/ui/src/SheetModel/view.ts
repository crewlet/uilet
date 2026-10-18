/**
 * What a sheet draws from its inputs, computed once for both renderers: the
 * rows in their sorted order, the collaborators on each cell, and the words a
 * focused cell is described by.
 */

import { PRESENCE_LABELS, type PresenceLabels } from '../PresenceModel/presence.js';
import { changeText, hasPrevious } from './edits.js';
import { compareValues, displayText, normalizeValue, spokenText, type SheetValueContext } from './values.js';
import type { SheetCellPresence, SheetColumn, SheetRow, SheetSort } from './types.js';

/** The rows in a sort's order, stable for equal values. With no sort, the host's order. */
export function sortRows(
  columns: readonly SheetColumn[],
  rows: readonly SheetRow[],
  sort: SheetSort | null | undefined,
  context: SheetValueContext,
): SheetRow[] {
  if (!sort) return [...rows];
  const column = columns.find((candidate) => candidate.field === sort.field);
  if (!column) return [...rows];
  const sign = sort.direction === 'descending' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, value: normalizeValue(column, row.values[column.field]) }))
    .sort((a, b) => {
      const empty = (value: typeof a.value) => value === null || value === '' || (Array.isArray(value) && value.length === 0);
      // Empty cells stay last in both directions, as every spreadsheet keeps them.
      if (column.type !== 'checkbox' && (empty(a.value) || empty(b.value))) {
        return empty(a.value) === empty(b.value) ? a.index - b.index : empty(a.value) ? 1 : -1;
      }
      return sign * compareValues(column, a.value, b.value, context) || a.index - b.index;
    })
    .map(({ row }) => row);
}

/** The next sort a header press asks for: ascending, then descending, then none. */
export function nextSort(current: SheetSort | null | undefined, field: string): SheetSort | null {
  if (!current || current.field !== field) return { field, direction: 'ascending' };
  return current.direction === 'ascending' ? { field, direction: 'descending' } : null;
}

export const cellKey = (rowId: string, field: string): string => `${rowId}\u0000${field}`;

/** The collaborators on each cell, editors first, keyed by `cellKey`. */
export function presenceByCell(presence: readonly SheetCellPresence[] | undefined): Map<string, SheetCellPresence[]> {
  const out = new Map<string, SheetCellPresence[]>();
  for (const entry of presence ?? []) {
    const at = cellKey(entry.rowId, entry.field);
    const list = out.get(at);
    if (list) list.push(entry);
    else out.set(at, [entry]);
  }
  for (const list of out.values()) list.sort((a, b) => Number(Boolean(b.editing)) - Number(Boolean(a.editing)));
  return out;
}

/** The rows somebody has selected, with the first collaborator on each, for the row's leading bar. */
export function presenceByRow(presence: readonly SheetCellPresence[] | undefined): Map<string, SheetCellPresence> {
  const out = new Map<string, SheetCellPresence>();
  for (const entry of presence ?? []) if (!out.has(entry.rowId)) out.set(entry.rowId, entry);
  return out;
}

/** The collaborators in each column, at most two, for its header. */
export function presenceByColumn(presence: readonly SheetCellPresence[] | undefined, max = 2): Map<string, SheetCellPresence[]> {
  const out = new Map<string, SheetCellPresence[]>();
  for (const entry of presence ?? []) {
    const list = out.get(entry.field) ?? [];
    if (list.length < max && !list.some((other) => other.id === entry.id)) list.push(entry);
    out.set(entry.field, list);
  }
  return out;
}

/** The text on a cell's name flag: "Maya", or "Maya, @pm" when several are on it. */
export function flagText(entries: readonly SheetCellPresence[]): string {
  return entries.map((entry) => entry.name).join(', ');
}

/**
 * Everything a focused cell is described by, after its own content: its
 * column, whether it is saving or was refused, who else is on it and who
 * changed it. "Score. Saving. Jane Founder is also here. Changed by Maya
 * Ortiz, 10:42. Was 6.8."
 */
export function cellDescription(
  column: SheetColumn,
  row: SheetRow,
  others: readonly SheetCellPresence[],
  context: SheetValueContext,
  presenceLabels: PresenceLabels = PRESENCE_LABELS,
): string {
  const { labels } = context;
  const parts: string[] = [`${column.label}.`];
  if (column.readOnly) parts.push(labels.readOnly(column.label));
  if (row.pending?.includes(column.field)) parts.push(`${labels.saving}.`);
  const refused = row.refused?.[column.field];
  if (refused) parts.push(refused);
  const names = others.map((entry) => entry.name);
  if (names.length > 0) parts.push(presenceLabels.alsoHere(names));
  const change = row.changed?.[column.field];
  if (change) {
    const previous = hasPrevious(change) ? displayText(column, normalizeValue(column, change.previous), context) || null : null;
    parts.push(changeText(change, labels, previous, context.locale));
  }
  return parts.join(' ');
}

/** A row's name, for its row header and an announcement: the first text column's value, or its number. */
export function rowName(columns: readonly SheetColumn[], row: SheetRow, index: number, context: SheetValueContext): string {
  const primary = columns.find((column) => column.type === 'text');
  if (primary) {
    const text = displayText(primary, normalizeValue(primary, row.values[primary.field]), context);
    if (text) return text;
  }
  return String(index + 1);
}

/** A cell's spoken value, the one form both renderers put in a cell for a screen reader. */
export function cellSpeech(column: SheetColumn, row: SheetRow, context: SheetValueContext): string {
  return spokenText(column, normalizeValue(column, row.values[column.field]), context);
}

