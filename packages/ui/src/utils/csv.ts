/**
 * The first characters a spreadsheet reads as the start of a formula, or as a
 * control character that can smuggle one in: `=`, `+`, `-`, `@`, a tab and a
 * carriage return.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * One table as RFC 4180 CSV: a header row, then one record a row, every line
 * ended by CRLF.
 *
 * A field is quoted when it holds a comma, a double quote, a carriage return or
 * a line feed, and a quote inside it is doubled. `null` and `undefined` are an
 * empty field, a number is its `String` form, a boolean is `true` or `false`, a
 * `Date` is its ISO 8601 instant, and any other object is its JSON.
 *
 * TEXT THAT WOULD RUN AS A FORMULA IS DEFUSED. A CSV a reader exports is
 * opened in a spreadsheet, and a spreadsheet runs a cell that starts with `=`,
 * `+`, `-` or `@` as a formula, which is how a value somebody else wrote (a
 * task title, a datastore row) becomes a hyperlink that sends data off the
 * machine or a command the application asks to run (CSV injection). Such a
 * TEXT cell is prefixed with an apostrophe, which every spreadsheet reads as
 * "this is text". A NUMBER is never prefixed: `-3` is a value, and stays one.
 */
export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  const lines = [header.map((name) => field(name)).join(',')];
  for (const row of rows) {
    lines.push(row.map((value) => field(value)).join(','));
  }
  return lines.map((line) => `${line}\r\n`).join('');
}

/** One value as one CSV field. */
function field(value: unknown): string {
  return quote(text(value));
}

/** The text a value is written as, defused where it is text that would run. */
function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  // A function or a symbol has no JSON form and is written as nothing.
  const written = typeof value === 'string' ? value : (JSON.stringify(value) ?? '');
  return FORMULA_LEAD.test(written) ? `'${written}` : written;
}

/** Quotes a field that needs it, doubling the quotes inside. */
function quote(written: string): string {
  return /[",\r\n]/.test(written) ? `"${written.replace(/"/g, '""')}"` : written;
}
