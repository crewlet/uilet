/**
 * Columns sized to what they hold. A column that declares no width is as wide
 * as the widest of its header and its values as drawn, within bounds its type
 * sets: a status column wide enough for "Changes requested", a checkbox column
 * wide enough for its name, and no text column running a screen wide.
 *
 * The grid measures; this module says WHAT it measures (a few values per
 * column, not every row) and how a measurement becomes a width.
 */

import { liveOptions } from './options.js';
import type { SheetColumn, SheetColumnType, SheetRow, SheetValue } from './types.js';
import { SHEET_COLUMN_WIDTHS } from './navigation.js';
import { displayText, isEmptyValue, normalizeValue, ratingMax, type SheetValueContext } from './values.js';

/**
 * The narrowest and widest a column sizes itself to, in px, by type. The
 * floor keeps a column a target and its header readable; the ceiling keeps one
 * long value from pushing every other column off the screen (the rest of it is
 * one Enter away, in the editor).
 */
export const SHEET_COLUMN_BOUNDS: Readonly<Record<SheetColumnType, readonly [min: number, max: number]>> = {
  text: [120, 280],
  longtext: [160, 320],
  number: [80, 180],
  checkbox: [72, 180],
  select: [104, 240],
  // A multi-select draws its chips on one line and counts the rest, so its
  // values do not size it: its default is its floor, and its header may widen it.
  multiselect: [SHEET_COLUMN_WIDTHS.multiselect, 280],
  status: [112, 260],
  person: [120, 240],
  date: [112, 180],
  url: [160, 280],
  rating: [104, 180],
};

/** How many of a column's longest values it is measured by. */
export const SHEET_FIT_SAMPLES = 8;

/**
 * The width a column takes from its measurement (the widest of its header and
 * sampled values as drawn, border included), within its type's bounds. Nothing
 * measured (no layout, as on a server or in a test) leaves the type's default.
 */
export function fittedWidth(type: SheetColumnType, measured: number): number {
  if (!(measured > 0)) return SHEET_COLUMN_WIDTHS[type];
  const [min, max] = SHEET_COLUMN_BOUNDS[type];
  return Math.min(max, Math.max(min, Math.ceil(measured)));
}

/**
 * The values a column is measured by. A choice column is measured by every
 * live choice, whatever the rows hold, so a choice nobody has picked yet still
 * fits when somebody does. A checkbox and a multi-select by their header alone
 * (one box, and chips that count what does not fit), a rating by its full
 * mark. Every other column by its `limit` longest values as displayed.
 */
export function fitSamples(column: SheetColumn, rows: readonly SheetRow[], context: SheetValueContext, limit = SHEET_FIT_SAMPLES): SheetValue[] {
  switch (column.type) {
    case 'select':
    case 'status':
      return liveOptions(column).map((option) => option.id);
    case 'checkbox':
    case 'multiselect':
      return [];
    case 'rating':
      return [ratingMax(column)];
    default: {
      const longest: { value: SheetValue; length: number }[] = [];
      for (const row of rows) {
        const value = normalizeValue(column, row.values[column.field]);
        if (isEmptyValue(value)) continue;
        const length = displayText(column, value, context).length;
        if (longest.length === limit && length <= longest[limit - 1]!.length) continue;
        longest.push({ value, length });
        longest.sort((a, b) => b.length - a.length);
        if (longest.length > limit) longest.pop();
      }
      return longest.map((entry) => entry.value);
    }
  }
}
