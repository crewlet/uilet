/**
 * A cell's value in its three forms, and the rules that hold a value to its
 * column.
 *
 *   normalizeValue  what the datastore holds, coerced to the column's type
 *   displayText     what a reader sees, formatted for their locale
 *   editText        what an editor starts with and a copy writes: locale
 *                   free, so a value copied out pastes back as itself
 *   parseText       the inverse of editText, tolerant of what people type
 *                   and paste, and the one place a value is refused before
 *                   it is sent
 *
 * The engine validates every write again (the real boundary); refusing here
 * first is what lets the sheet say why on the cell without a round trip.
 */

import { findOption, liveOptions } from './options.js';
import type { SheetLabels } from './labels.js';
import type { SheetColumn, SheetPerson, SheetValue } from './types.js';

/** What formatting and parsing need beyond the column itself. */
export interface SheetValueContext {
  /** The people a person cell may name. */
  people?: readonly SheetPerson[] | undefined;
  /** A BCP 47 tag; the reader's own locale when absent. */
  locale?: string | undefined;
  labels: SheetLabels;
}

/** The engine's default and ceiling lengths (`artifacts` limits), for a column that declares none. */
export const TEXT_MAX_DEFAULT = 1000;
export const LONGTEXT_MAX_DEFAULT = 20000;
export const URL_MAX = 2048;
export const RATING_MAX_DEFAULT = 5;
export const RATING_MAX_CEILING = 10;
const YEAR_MIN = 1900;
const YEAR_MAX = 2200;

/** The number of stars a rating column draws. */
export function ratingMax(column: Pick<SheetColumn, 'max'>): number {
  const max = column.max ?? RATING_MAX_DEFAULT;
  return Number.isInteger(max) && max >= 1 ? Math.min(max, RATING_MAX_CEILING) : RATING_MAX_DEFAULT;
}

/** The longest value a text or long text column takes. */
export function textMax(column: Pick<SheetColumn, 'type' | 'maxLength'>): number {
  return column.maxLength ?? (column.type === 'longtext' ? LONGTEXT_MAX_DEFAULT : TEXT_MAX_DEFAULT);
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * What the datastore holds, coerced to the column's type. A value of the wrong
 * shape (a newer writer, a hand-edited document) is drawn as empty rather than
 * thrown on, except where it has an obvious reading: a numeric string in a
 * number column, a number in a text column.
 */
export function normalizeValue(column: Pick<SheetColumn, 'type'>, raw: unknown): SheetValue {
  if (raw === undefined || raw === null) return column.type === 'checkbox' ? false : column.type === 'multiselect' ? [] : null;
  switch (column.type) {
    case 'checkbox':
      return raw === true;
    case 'number': {
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;
      return Number.isFinite(value) ? value : null;
    }
    case 'rating':
      return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 ? raw : null;
    case 'multiselect':
      return isStringArray(raw) ? raw : [];
    case 'text':
    case 'longtext':
    case 'url':
    case 'date':
      return typeof raw === 'string' ? raw : typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : null;
    case 'select':
    case 'status':
    case 'person':
      return typeof raw === 'string' ? raw : null;
  }
}

/** Whether a value is nothing at all: null, an empty string or an empty list. A false checkbox is a value. */
export function isEmptyValue(value: SheetValue): boolean {
  return value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Whether two values are the same value. */
export function sameValue(a: SheetValue, b: SheetValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => item === b[index]);
  return a === b;
}

/** The person a value names, if the host resolved one. */
export function findPerson(people: readonly SheetPerson[] | undefined, id: string): SheetPerson | undefined {
  return people?.find((person) => person.id === id);
}

function numberFormat(column: SheetColumn, locale: string | undefined): Intl.NumberFormat {
  const digits = column.precision;
  const fraction = digits === undefined ? { maximumFractionDigits: 10 } : { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (column.numberStyle === 'percent') return new Intl.NumberFormat(locale, { style: 'percent', ...fraction });
  if (column.numberStyle === 'currency' && column.currency) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: column.currency, ...fraction });
  }
  return new Intl.NumberFormat(locale, fraction);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar date's parts, when the string is a real one inside the range the engine keeps. */
function calendarDate(text: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) return null;
  if (year < YEAR_MIN || year > YEAR_MAX) return null;
  return { year, month, day };
}

/** What a reader sees in a cell, formatted for their locale. Empty for an empty value. */
export function displayText(column: SheetColumn, value: SheetValue, context: SheetValueContext): string {
  const { labels, locale } = context;
  if (column.type === 'checkbox') return value === true ? labels.checked : labels.unchecked;
  if (isEmptyValue(value)) return '';
  switch (column.type) {
    case 'number':
      return typeof value === 'number' ? numberFormat(column, locale).format(value) : '';
    case 'rating':
      return typeof value === 'number' ? labels.rating(value, ratingMax(column)) : '';
    case 'select':
    case 'status': {
      const option = findOption(column, String(value));
      if (!option) return String(value);
      return option.archived ? labels.archived(option.label) : option.label;
    }
    case 'multiselect':
      return (value as readonly string[])
        .map((id) => {
          const option = findOption(column, id);
          if (!option) return id;
          return option.archived ? labels.archived(option.label) : option.label;
        })
        .join(', ');
    case 'person':
      return findPerson(context.people, String(value))?.name ?? labels.unknownPerson;
    case 'date': {
      const text = String(value);
      if (calendarDate(text)) {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${text}T00:00:00Z`));
      }
      const at = Date.parse(text);
      return Number.isNaN(at) ? text : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(at);
    }
    default:
      return String(value);
  }
}

/** What a cell says to a screen reader: its display text, or a word for the values that draw none. */
export function spokenText(column: SheetColumn, value: SheetValue, context: SheetValueContext): string {
  if (column.type !== 'checkbox' && isEmptyValue(value)) return context.labels.empty;
  return displayText(column, value, context);
}

/** What an editor starts with and a copy writes. Locale free, so it pastes back as itself. */
export function editText(column: SheetColumn, value: SheetValue, context: SheetValueContext): string {
  if (column.type === 'checkbox') return value === true ? 'TRUE' : 'FALSE';
  if (isEmptyValue(value)) return '';
  switch (column.type) {
    case 'number':
      if (typeof value !== 'number') return '';
      return column.numberStyle === 'percent' ? `${roundTo(value * 100, 10)}%` : String(value);
    case 'select':
    case 'status':
      return findOption(column, String(value))?.label ?? String(value);
    case 'multiselect':
      return (value as readonly string[]).map((id) => findOption(column, id)?.label ?? id).join(', ');
    case 'person':
      return findPerson(context.people, String(value))?.name ?? String(value);
    default:
      return String(value);
  }
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** A parsed value, or why the text does not fit the column. */
export type SheetParse = { ok: true; value: SheetValue } | { ok: false; error: string };

const refuse = (error: string): SheetParse => ({ ok: false, error });

function matchOption(column: SheetColumn, text: string): string | null {
  const wanted = text.trim().toLowerCase();
  const options = liveOptions(column);
  const hit = options.find((option) => option.id === text.trim()) ?? options.find((option) => option.label.toLowerCase() === wanted);
  return hit ? hit.id : null;
}

function matchPerson(people: readonly SheetPerson[] | undefined, text: string): string | null {
  const wanted = text.trim().toLowerCase();
  if (!people || wanted === '') return null;
  const exact = people.find((person) => person.id === text.trim() || person.name.toLowerCase() === wanted);
  if (exact) return exact.id;
  const prefixed = people.filter((person) => person.name.toLowerCase().startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0]!.id : null;
}

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'x', 'checked', 'on', '✓', '✔']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', '', 'unchecked', 'off']);

function parseNumber(column: SheetColumn, text: string, labels: SheetLabels): SheetParse {
  let source = text.trim().replace(/\s+/g, '');
  const percent = source.endsWith('%');
  if (percent) source = source.slice(0, -1);
  source = source.replace(/^[$€£¥]|[$€£¥]$/g, '');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(source)) source = source.replaceAll(',', '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(source)) return refuse(labels.notANumber(column.label));
  let value = Number(source);
  if (percent || column.numberStyle === 'percent') value /= 100;
  if (!Number.isFinite(value)) return refuse(labels.notANumber(column.label));
  if (column.precision !== undefined) value = roundTo(value, column.precision);
  const show = (bound: number) => (column.numberStyle === 'percent' ? `${roundTo(bound * 100, 10)}%` : String(bound));
  if (column.min !== undefined && value < column.min) return refuse(labels.belowMin(column.label, show(column.min)));
  if (column.max !== undefined && value > column.max) return refuse(labels.aboveMax(column.label, show(column.max)));
  return { ok: true, value };
}

function parseDate(column: SheetColumn, text: string, labels: SheetLabels): SheetParse {
  const source = text.trim();
  if (!column.time) {
    const day = calendarDate(source.slice(0, 10));
    if (day && (source.length === 10 || source[10] === 'T' || source[10] === ' ')) return { ok: true, value: source.slice(0, 10) };
    return refuse(labels.notADate(column.label));
  }
  const at = Date.parse(source);
  if (Number.isNaN(at)) return refuse(labels.notADate(column.label));
  const year = new Date(at).getUTCFullYear();
  if (year < YEAR_MIN || year > YEAR_MAX) return refuse(labels.notADate(column.label));
  return { ok: true, value: new Date(at).toISOString().replace(/\.000Z$/, 'Z') };
}

function parseUrl(column: SheetColumn, text: string, labels: SheetLabels): SheetParse {
  let source = text.trim();
  // A bare host a person typed ("acme.com/pricing") is read as https; a
  // scheme other than the two the engine keeps is refused, never rewritten.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(source) && /^[^\s/]+\.[^\s/]+/.test(source)) source = `https://${source}`;
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return refuse(labels.notAUrl(column.label));
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || source.length > URL_MAX || url.host === '') {
    return refuse(labels.notAUrl(column.label));
  }
  return { ok: true, value: source };
}

/**
 * Text, as a person typed or pasted it, read as a value of the column, or the
 * reason it cannot be. Empty text clears the cell, unless the column is
 * required.
 */
export function parseText(column: SheetColumn, text: string, context: SheetValueContext): SheetParse {
  const { labels } = context;
  const blank = text.trim() === '';
  if (blank && column.type !== 'checkbox') {
    if (column.required) return refuse(labels.required(column.label));
    return { ok: true, value: column.type === 'multiselect' ? [] : null };
  }
  switch (column.type) {
    case 'checkbox': {
      const word = text.trim().toLowerCase();
      if (TRUE_WORDS.has(word)) return { ok: true, value: true };
      if (FALSE_WORDS.has(word)) return { ok: true, value: false };
      return refuse(labels.notABoolean(column.label));
    }
    case 'number':
      return parseNumber(column, text, labels);
    case 'rating': {
      const max = ratingMax(column);
      const source = text.trim();
      const stars = /^★+$/.test(source) ? source.length : Number(source);
      if (stars === 0) return column.required ? refuse(labels.required(column.label)) : { ok: true, value: null };
      if (!Number.isInteger(stars) || stars < 1 || stars > max) return refuse(labels.notARating(column.label, max));
      return { ok: true, value: stars };
    }
    case 'text': {
      const value = text.replace(/\s*[\r\n]+\s*/g, ' ');
      if (value.length > textMax(column)) return refuse(labels.tooLong(column.label, textMax(column)));
      return { ok: true, value };
    }
    case 'longtext':
      if (text.length > textMax(column)) return refuse(labels.tooLong(column.label, textMax(column)));
      return { ok: true, value: text };
    case 'select':
    case 'status': {
      const id = matchOption(column, text);
      return id === null ? refuse(labels.notAnOption(column.label)) : { ok: true, value: id };
    }
    case 'multiselect': {
      const ids: string[] = [];
      for (const part of text.split(/[,;\n]/)) {
        if (part.trim() === '') continue;
        const id = matchOption(column, part);
        if (id === null) return refuse(labels.notAnOption(column.label));
        if (!ids.includes(id)) ids.push(id);
      }
      if (column.maxItems !== undefined && ids.length > column.maxItems) return refuse(labels.tooManyItems(column.label, column.maxItems));
      return { ok: true, value: ids };
    }
    case 'person': {
      const id = matchPerson(context.people, text);
      return id === null ? refuse(labels.notAPerson(column.label)) : { ok: true, value: id };
    }
    case 'date':
      return parseDate(column, text, labels);
    case 'url':
      return parseUrl(column, text, labels);
  }
}

/**
 * Why a value chosen in an editor (an option, a person, a checkbox) cannot be
 * written, or null. The text path is held by `parseText`; this holds the
 * values an editor hands over directly.
 */
export function checkValue(column: SheetColumn, value: SheetValue, context: SheetValueContext): string | null {
  const { labels } = context;
  if (column.required && column.type !== 'checkbox' && isEmptyValue(value)) return labels.required(column.label);
  if (isEmptyValue(value)) return null;
  switch (column.type) {
    case 'checkbox':
      return typeof value === 'boolean' ? null : labels.notABoolean(column.label);
    case 'select':
    case 'status':
      return typeof value === 'string' && liveOptions(column).some((option) => option.id === value) ? null : labels.notAnOption(column.label);
    case 'multiselect': {
      if (!Array.isArray(value)) return labels.notAnOption(column.label);
      const live = new Set(liveOptions(column).map((option) => option.id));
      // An archived option a value already held may stay; a new one may not be added.
      if (!value.every((id) => live.has(id) || findOption(column, id)?.archived)) return labels.notAnOption(column.label);
      if (column.maxItems !== undefined && value.length > column.maxItems) return labels.tooManyItems(column.label, column.maxItems);
      return null;
    }
    case 'person':
      return typeof value === 'string' && findPerson(context.people, value) ? null : labels.notAPerson(column.label);
    case 'rating':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= ratingMax(column)
        ? null
        : labels.notARating(column.label, ratingMax(column));
    default: {
      const parsed = parseText(column, editText(column, value, context), context);
      return parsed.ok ? null : parsed.error;
    }
  }
}

/** Orders two values of a column: empty last, then by the column's own order. */
export function compareValues(column: SheetColumn, a: SheetValue, b: SheetValue, context: SheetValueContext): number {
  const emptyA = column.type !== 'checkbox' && isEmptyValue(a);
  const emptyB = column.type !== 'checkbox' && isEmptyValue(b);
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
  switch (column.type) {
    case 'number':
    case 'rating':
      return (a as number) - (b as number);
    case 'checkbox':
      return Number(a === true) - Number(b === true);
    case 'select':
    case 'status': {
      const order = (id: SheetValue) => (column.options ?? []).findIndex((option) => option.id === id);
      return order(a) - order(b);
    }
    default:
      return displayText(column, a, context).localeCompare(displayText(column, b, context), context.locale, { numeric: true });
  }
}
