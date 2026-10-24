/**
 * A font-family list somebody chose, as the one grammar every brand part
 * accepts before it reaches a style: up to eight comma-separated family
 * names, each a quoted name (no quotes, back slashes or line breaks inside),
 * a run of plain words (letters, digits, `-` and `_`), or one of the
 * package's own family tokens (`var(--font-family-sans)` and its siblings).
 *
 * WHY A GRAMMAR AND NOT A SANITISER. A family list is drawn into a custom
 * property, where nothing a person typed can break out of the declaration,
 * but a value that is not a list of names (a `var()` of something else, a
 * CSS-wide keyword, a stray function) still changes what the page draws.
 * Anything that does not read as names is refused whole, and the caller
 * falls back to the package's face, rather than half of it being kept.
 */

const QUOTED = String.raw`"[^"\\\r\n]{1,80}"|'[^'\\\r\n]{1,80}'`;
const WORDS = String.raw`[A-Za-z][A-Za-z0-9_-]*(?: [A-Za-z0-9_-]+){0,5}`;
const TOKEN = String.raw`var\(--font-family-(?:sans|mono|display)\)`;
const NAME = `(?:${QUOTED}|${TOKEN}|${WORDS})`;
const LIST = new RegExp(`^${NAME}(?:\\s*,\\s*${NAME}){0,7}$`);

/** The words CSS reads as a keyword rather than a family, which a list may not be made of. */
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'default']);

/** The longest list accepted: eight long names and their separators. */
const MAX_LENGTH = 400;

/** The list, trimmed, when it reads as family names; null for anything else. */
export function safeFontFamily(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const list = value.trim();
  if (list === '' || list.length > MAX_LENGTH || !LIST.test(list)) return null;
  const keyword = list.split(',').some((name) => KEYWORDS.has(name.trim().toLowerCase()));
  return keyword ? null : list;
}

/**
 * A family list that always ends in a face the page has: the chosen list
 * when it reads as names, then `fallback` (a package family token), so a face
 * still loading or never uploaded draws as the package's type rather than as
 * the browser's default.
 */
export function fontStack(value: string | null | undefined, fallback: string): string {
  const list = safeFontFamily(value);
  return list ? `${list}, ${fallback}` : fallback;
}
