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

/** The separators `parseCsv` reads: a comma, a semicolon (a European spreadsheet's CSV) and a tab (a copied range). */
export type CsvDelimiter = ',' | ';' | '\t';

export interface ParseCsvOptions {
  /** The separator. Without it, the one the first record uses most outside quotes, a comma when none. */
  delimiter?: CsvDelimiter | undefined;
  /** The most records read, the header included. One more is `too_many_rows` rather than a silent cut. */
  maxRows?: number | undefined;
}

/** Why a text could not be read as CSV: an opened quote never closed, or more records than allowed. */
export type CsvProblem = 'unterminated_quote' | 'too_many_rows';

export type ParseCsvResult =
  | { ok: true; rows: string[][]; delimiter: CsvDelimiter }
  | {
      ok: false;
      problem: CsvProblem;
      /** The 1-based line the problem starts on. */
      line: number;
    };

const DELIMITERS: readonly CsvDelimiter[] = [',', ';', '\t'];

/**
 * A CSV text as its records, each a list of field texts, as RFC 4180 reads
 * it and as spreadsheets write it in practice: CRLF, LF or a lone CR ends a
 * record, a quoted field may hold the separator, quotes (doubled) and line
 * breaks, a UTF-8 byte order mark is dropped, and the blank line after the
 * last record is not a record. A quote inside an unquoted field is kept as
 * text. Records may differ in length; the caller decides what a short one
 * means.
 *
 * IT READS BACK WHAT `toCsv` WRITES. A text field `toCsv` defused with a
 * leading apostrophe (`'=SUM(A1)`) reads as the text it was (`=SUM(A1)`), so
 * an export imported again is the same table. Every value stays text: the
 * caller types it, and no value is ever evaluated.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): ParseCsvResult {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = options.delimiter ?? sniffDelimiter(source);
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY;
  const rows: string[][] = [];
  let record: string[] = [];
  let value = '';
  let quoted = false;
  let wasQuoted = false;
  let line = 1;
  let quoteLine = 1;
  let i = 0;

  const endField = () => {
    record.push(undefused(value));
    value = '';
    wasQuoted = false;
  };
  const endRecord = (): boolean => {
    endField();
    rows.push(record);
    record = [];
    return rows.length <= maxRows;
  };

  while (i < source.length) {
    const ch = source[i]!;
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      if (ch === '\n' || (ch === '\r' && source[i + 1] !== '\n')) line += 1;
      value += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && value === '' && !wasQuoted) {
      quoted = true;
      wasQuoted = true;
      quoteLine = line;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      const step = ch === '\r' && source[i + 1] === '\n' ? 2 : 1;
      if (!endRecord()) return { ok: false, problem: 'too_many_rows', line };
      line += 1;
      i += step;
      continue;
    }
    value += ch;
    i += 1;
  }
  if (quoted) return { ok: false, problem: 'unterminated_quote', line: quoteLine };
  // A last record with no line break after it; an empty text has none.
  if (value !== '' || wasQuoted || record.length > 0) {
    if (!endRecord()) return { ok: false, problem: 'too_many_rows', line };
  }
  return { ok: true, rows, delimiter };
}

/** The separator the first record uses most outside quotes, a comma when it uses none. */
function sniffDelimiter(source: string): CsvDelimiter {
  const counts = new Map<CsvDelimiter, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of source) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && counts.has(ch as CsvDelimiter)) counts.set(ch as CsvDelimiter, counts.get(ch as CsvDelimiter)! + 1);
  }
  let best: CsvDelimiter = ',';
  for (const d of DELIMITERS) if (counts.get(d)! > counts.get(best)!) best = d;
  return best;
}

/** A field `toCsv` defused (an apostrophe before a formula's first character) as the text it was. */
function undefused(field: string): string {
  return field.length > 1 && field[0] === "'" && FORMULA_LEAD.test(field.slice(1)) ? field.slice(1) : field;
}
