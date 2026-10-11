import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** One marked stretch of a text, as `[start, end)` offsets into it. */
export type HighlightRange = readonly [start: number, end: number];

/**
 * The words of a query a reader typed, as the terms a match is made of:
 * folded to lower case, each one once, the longest first, and none shorter than
 * two characters.
 *
 * A ONE LETTER TERM MARKS NOTHING. "a plan for q3" would otherwise mark every
 * `a` in a snippet, and a page of yellow is a page with nothing marked.
 *
 * THE LONGEST FIRST, so where two terms start at the same place the mark covers
 * the longer one: "settle" and "settlement" in one query mark "settlement"
 * whole rather than its first six letters.
 */
export function highlightTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => [...word].length >= 2);
  return [...new Set(words)].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Where `terms` start a word of `text`, as ranges in reading order.
 *
 * A TERM MATCHES THE START OF A WORD, never its middle: "cent" marks "cents"
 * and "centre" but not "percent", because a search engine matches words, and a
 * mark inside a word points at a match the engine never made.
 *
 * THE OFFSETS ARE THE TEXT'S OWN. The match is made by one case-insensitive
 * Unicode pattern over the original string rather than over a lower-cased copy,
 * because lower-casing can change a string's length ("İ" becomes two code
 * units) and every offset after it would point one character off.
 */
export function highlightRanges(text: string, terms: readonly string[]): HighlightRange[] {
  const wanted = terms.map((term) => term.trim()).filter((term) => term !== '');
  if (text === '' || wanted.length === 0) return [];
  const ordered = [...new Set(wanted)].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${ordered.map(escape).join('|')})`, 'giu');
  const ranges: HighlightRange[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const last = ranges[ranges.length - 1];
    // One pattern scans the text once, so matches never overlap; but a term a
    // caller passed with punctuation in it ("q3:") can end exactly where the
    // next match begins. A run of marks is drawn as one mark.
    if (last && start <= last[1]) ranges[ranges.length - 1] = [last[0], Math.max(last[1], end)];
    else ranges.push([start, end]);
  }
  return ranges;
}

export interface HighlightProps extends HTMLAttributes<HTMLSpanElement> {
  /** The text to draw. */
  text: string;
  /** What to mark, usually `highlightTerms(query)`. */
  terms: readonly string[];
}

/**
 * A line of text with the words a search matched marked in it: a result's
 * title, its snippet, a passage of a page opened from a search.
 *
 * A `mark` ELEMENT, because a match is part of what the text says to a reader
 * who came looking for it, and the element is what tells assistive technology
 * so. The ink stays the text's own and the mark is a ground behind it, so a
 * marked word reads at the same contrast as the words beside it.
 */
export function Highlight({ text, terms, className, ...rest }: HighlightProps) {
  const ranges = highlightRanges(text, terms);
  const parts: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([start, end], index) => {
    if (start > at) parts.push(<Fragment key={`t${index}`}>{text.slice(at, start)}</Fragment>);
    parts.push(
      <mark key={`m${index}`} className="crewlet-highlight__match">
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  });
  if (at < text.length) parts.push(<Fragment key="tail">{text.slice(at)}</Fragment>);
  return (
    <span {...rest} className={cx('crewlet-highlight', className)}>
      {parts}
    </span>
  );
}
