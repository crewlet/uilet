/**
 * What a column keeps when a person gives it another type.
 *
 * A TYPE'S SETTINGS ARE THAT TYPE'S: a number's bounds, decimals and format, a
 * date's time of day, a text's length cap. Carried into a type that ignores
 * them they are invisible, and they come back to life, unasked, if the old
 * type is picked again. So a retyped column is BUILT UP from what every type
 * has, never pared down from the old column: a list of settings to remove is
 * one a new setting is missing from until somebody notices, and the list this
 * replaced had already missed the length cap and the time of day.
 */

import type { SheetColumn, SheetColumnType } from './types.js';

/** Text and long text both read the length cap, so it survives a move between them. */
const capsLength = (type: SheetColumnType) => type === 'text' || type === 'longtext';

/**
 * The column as `type`: its field, name, width, freezing, read-only flag and
 * whether it is required, and its length cap between text and long text.
 * Nothing else. What the new type starts with (choices, a rating's stars) is
 * the caller's to add.
 */
export function retypeColumn(column: SheetColumn, type: SheetColumnType): SheetColumn {
  const next: SheetColumn = { field: column.field, label: column.label, type };
  if (column.width !== undefined) next.width = column.width;
  if (column.frozen !== undefined) next.frozen = column.frozen;
  if (column.readOnly !== undefined) next.readOnly = column.readOnly;
  if (column.required !== undefined) next.required = column.required;
  if (column.maxLength !== undefined && capsLength(column.type) && capsLength(type)) next.maxLength = column.maxLength;
  return next;
}
