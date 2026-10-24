/**
 * A font-family list somebody chose, as the one grammar every brand part
 * accepts before it reaches a style: up to MAX_NAMES comma-separated family
 * names, each a quoted name (no quotes, back slashes or line breaks inside),
 * a run of plain CSS identifiers (`Segoe UI`, `-apple-system`), or one of the
 * package's own family tokens (`var(--font-family-sans)` and its siblings).
 *
 * WHY A GRAMMAR AND NOT A SANITISER. A family list is drawn into a custom
 * property, where nothing a person typed can break out of the declaration,
 * but a value that is not a list of names (a `var()` of something else, a
 * CSS-wide keyword, a stray function) still changes what the page draws.
 * Anything that does not read as names is refused whole, and the caller
 * falls back to the package's face, rather than half of it being kept.
 *
 * IT TAKES EVERY LIST THE ENGINE WRITES. The engine resolves a brand's face to
 * one list (brandformat `FaceFamilies`, mirrored in the dashboard contract as
 * `BRAND_FACE_FAMILIES`): a kit face or a curated system stack of bare
 * identifiers, `-apple-system` among them, or an uploaded family quoted in
 * front of the system sans stack. The suite walks those lists verbatim.
 */

const QUOTED = String.raw`"[^"\\\r\n]{1,80}"|'[^'\\\r\n]{1,80}'`;
/*
 * ONE CSS IDENTIFIER: a letter, or one hyphen and then a letter (a vendor
 * name such as `-apple-system`), then letters, digits, hyphens and
 * underscores. Never two hyphens first (that is a custom property's name) and
 * never a digit first, which CSS reads as a number rather than a name.
 */
const IDENTIFIER = String.raw`-?[A-Za-z][A-Za-z0-9_-]*`;
/** A family written bare: identifiers separated by single spaces, as `Apple Color Emoji`. */
const WORDS = `${IDENTIFIER}(?: ${IDENTIFIER}){0,5}`;
const TOKEN = String.raw`var\(--font-family-(?:sans|mono|display)\)`;
const NAME = `(?:${QUOTED}|${TOKEN}|${WORDS})`;

/*
 * THE MOST NAMES A LIST HOLDS: the engine's longest stack, the Geist face's
 * ten names (brandformat `FaceFamilies.geist`), with one more for a family an
 * application registers in front of a stack (the dashboard's uploaded face,
 * quoted ahead of the system sans stack, is ten). Raise it with the engine's
 * list, never past what a person could mean by one face.
 */
const MAX_NAMES = 11;
const LIST = new RegExp(`^${NAME}(?:\\s*,\\s*${NAME}){0,${MAX_NAMES - 1}}$`);

/** The words CSS reads as a keyword rather than a family, which a list may not be made of. */
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'default']);

/**
 * The longest list accepted, in characters. The engine's longest list is
 * about 120, and about 150 with an uploaded family (40 bytes at most) quoted
 * in front; this holds those with room to spare and refuses a value nobody
 * wrote as a face.
 */
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
