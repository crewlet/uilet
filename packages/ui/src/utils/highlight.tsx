import type { ReactNode } from 'react';

/** Where a match is looked for first: the start of the text, or the start of any word in it. */
export type MatchPreference = 'start' | 'word';

/** What separates words for a `word` match: a space, a dash, an underscore, a slash or a middle dot. */
const WORD_BREAK = /[\s\-_/·]/;

/**
 * Where `query` matches in `text`, ignoring case: first where `prefer` asks
 * (the start of the text, or the start of a word), then anywhere. `null` for
 * no match, an empty query, or text whose lowercase form is a different
 * length, where an index into one would point at the wrong letters of the
 * other.
 */
export function findMatch(text: string, query: string, prefer: MatchPreference): readonly [number, number] | null {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return null;
  const low = text.toLowerCase();
  if (low.length !== text.length) return null;
  let at = -1;
  if (prefer === 'start') {
    at = low.startsWith(wanted) ? 0 : -1;
  } else {
    for (let i = 0; i < low.length; i += 1) {
      const atWord = i === 0 || WORD_BREAK.test(low.charAt(i - 1));
      if (atWord && low.startsWith(wanted, i)) {
        at = i;
        break;
      }
    }
  }
  if (at < 0) at = low.indexOf(wanted);
  return at < 0 ? null : [at, at + wanted.length];
}

/**
 * The text with the letters `query` matched drawn bold, in a `<b>` of the
 * given class. The words are unchanged, so what a screen reader reads and what
 * a find in page finds are the text itself.
 */
export function highlightMatch(text: string, query: string | undefined, prefer: MatchPreference, className: string): ReactNode {
  const range = query ? findMatch(text, query, prefer) : null;
  if (!range) return text;
  const [from, to] = range;
  return (
    <>
      {text.slice(0, from)}
      <b className={className}>{text.slice(from, to)}</b>
      {text.slice(to)}
    </>
  );
}
