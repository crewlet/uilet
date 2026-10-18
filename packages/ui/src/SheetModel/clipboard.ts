/**
 * Copy and paste as tab-separated values, the format every spreadsheet puts on
 * the clipboard and reads back from it.
 *
 * A field holding a tab, a newline or a quote is quoted, with its quotes
 * doubled, which is how a long text with paragraphs survives a round trip
 * through another spreadsheet.
 */

import { normalizeValue, editText, parseText, sameValue, type SheetValueContext } from './values.js';
import type { SheetRange } from './navigation.js';
import type { SheetColumn, SheetEdit, SheetRow } from './types.js';

function quote(field: string): string {
  return /[\t\n\r"]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/** The cells a range covers, as TSV. */
export function toTSV(
  columns: readonly SheetColumn[],
  rows: readonly SheetRow[],
  range: SheetRange,
  context: SheetValueContext,
): string {
  const lines: string[] = [];
  for (let row = range.top; row <= range.bottom; row += 1) {
    const record = rows[row];
    if (!record) continue;
    const fields: string[] = [];
    for (let col = range.left; col <= range.right; col += 1) {
      const column = columns[col];
      if (!column) continue;
      fields.push(quote(editText(column, normalizeValue(column, record.values[column.field]), context)));
    }
    lines.push(fields.join('\t'));
  }
  return lines.join('\n');
}

/** TSV read into rows of fields. A trailing line break is not an extra empty row. */
export function parseTSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let at = 0;
  const source = text.replace(/\r\n?/g, '\n');
  while (at < source.length) {
    const char = source[at]!;
    if (quoted) {
      if (char === '"' && source[at + 1] === '"') {
        field += '"';
        at += 2;
        continue;
      }
      if (char === '"') {
        quoted = false;
        at += 1;
        continue;
      }
      field += char;
      at += 1;
      continue;
    }
    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === '\t') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
    at += 1;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** What a paste would write, and the cells it could not. */
export interface SheetPastePlan {
  edits: SheetEdit[];
  refused: { rowId: string; field: string; error: string }[];
}

/**
 * The edits pasting a block of fields at a cell makes. A single field pasted
 * over a range fills the range, as a spreadsheet does. Read-only columns and
 * rows past the end are skipped; a field that does not fit its column is
 * refused with the reason, and the rest of the paste still lands.
 */
export function planPaste(
  columns: readonly SheetColumn[],
  rows: readonly SheetRow[],
  target: SheetRange,
  block: readonly (readonly string[])[],
  context: SheetValueContext,
): SheetPastePlan {
  const plan: SheetPastePlan = { edits: [], refused: [] };
  if (block.length === 0) return plan;
  const single = block.length === 1 && block[0]!.length === 1;
  const height = single ? target.bottom - target.top + 1 : block.length;
  const width = single ? target.right - target.left + 1 : Math.max(...block.map((line) => line.length));
  for (let r = 0; r < height; r += 1) {
    const row = rows[target.top + r];
    if (!row) break;
    for (let c = 0; c < width; c += 1) {
      const column = columns[target.left + c];
      if (!column) break;
      if (column.readOnly) continue;
      const text = single ? block[0]![0]! : block[r]?.[c];
      if (text === undefined) continue;
      const parsed = parseText(column, text, context);
      if (!parsed.ok) {
        plan.refused.push({ rowId: row.id, field: column.field, error: parsed.error });
        continue;
      }
      if (sameValue(parsed.value, normalizeValue(column, row.values[column.field]))) continue;
      plan.edits.push({ rowId: row.id, field: column.field, value: parsed.value });
    }
  }
  return plan;
}

/**
 * The edits that clear every writable cell of a range: a checkbox unchecks, a
 * list empties. A required cell is refused with the reason rather than
 * cleared, and the rest of the range still clears.
 */
export function planClear(
  columns: readonly SheetColumn[],
  rows: readonly SheetRow[],
  range: SheetRange,
  context: SheetValueContext,
): SheetPastePlan {
  const plan: SheetPastePlan = { edits: [], refused: [] };
  for (let r = range.top; r <= range.bottom; r += 1) {
    const row = rows[r];
    if (!row) continue;
    for (let c = range.left; c <= range.right; c += 1) {
      const column = columns[c];
      if (!column || column.readOnly) continue;
      const empty = column.type === 'checkbox' ? false : column.type === 'multiselect' ? [] : null;
      if (sameValue(normalizeValue(column, row.values[column.field]), empty)) continue;
      if (column.required && column.type !== 'checkbox') {
        plan.refused.push({ rowId: row.id, field: column.field, error: context.labels.required(column.label) });
        continue;
      }
      plan.edits.push({ rowId: row.id, field: column.field, value: empty });
    }
  }
  return plan;
}
