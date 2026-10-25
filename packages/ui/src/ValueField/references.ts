/**
 * Completing a `${NAME}` reference from a list of stored entry names.
 *
 * A value field takes either a value or a reference to one, and the reference
 * has to be typed exactly: a name off by a character resolves to nothing,
 * which reads as configured on every surface while whatever it feeds refuses
 * every use. These helpers are what lets a field offer the names it knows
 * rather than leaving the reader to copy one across from another screen.
 */

/** The shape of a reference's name: a letter or underscore, then letters, digits and underscores. */
export const REFERENCE_NAME_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

const WHOLE_REFERENCE = new RegExp(`^\\$\\{${REFERENCE_NAME_PATTERN}\\}$`);

/**
 * Whether a value is exactly one `${NAME}` reference, trimmed first.
 *
 * This is the default a [ValueField] asks when deciding whether a secret's
 * value is a name (readable) or a credential (masked). A product whose
 * reference grammar is stricter passes its own predicate as `isReference`.
 */
export function isWholeReference(value: string): boolean {
  return WHOLE_REFERENCE.test(value.trim());
}

/** Where a reference is being typed, and what has been typed of it. */
export interface ReferenceQuery {
  /** Index of the `$` that opens it. */
  start: number;
  /** What follows the `$`, with any `{` stripped. */
  query: string;
}

/**
 * The `${...}` under the caret, or null.
 *
 * IT SCANS BACK FROM THE CARET rather than matching the whole value, because
 * a field can hold a reference among other text and the one being edited is
 * the one being completed. The scan stops at whitespace and at a `}`: the
 * first because no name contains one, the second because a reference that is
 * already closed is finished, and offering to complete it again would replace
 * a name somebody had chosen.
 */
export function referenceAt(value: string, caret: number): ReferenceQuery | null {
  const head = value.slice(0, caret);
  for (let i = head.length - 1; i >= 0; i--) {
    const ch = head.charAt(i);
    if (ch === '$') {
      const rest = head.slice(i + 1);
      // `${` and `$` both open one. Anything else after the `$` is a literal
      // dollar in a value, which is not a reference.
      const name = rest.startsWith('{') ? rest.slice(1) : rest;
      if (!/^[A-Za-z0-9_]*$/.test(name)) return null;
      return { start: i, query: name };
    }
    if (/\s/.test(ch) || ch === '}') return null;
  }
  return null;
}

/**
 * The names ordered by how closely they match what has been typed.
 *
 * Three tiers, in the order somebody means them: a name that STARTS with the
 * query, then one that CONTAINS it, then one whose letters appear in order.
 * Case is ignored, because a name is upper snake case and nobody holds shift
 * to filter a list. An empty query keeps every name in the order given: the
 * point of typing `$` alone is to see what there is.
 */
export function rankReferences(names: readonly string[], query: string): string[] {
  const q = query.toLowerCase();
  if (q === '') return [...names];
  const scored: { name: string; tier: number; index: number }[] = [];
  names.forEach((name, index) => {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) scored.push({ name, tier: 0, index });
    else if (lower.includes(q)) scored.push({ name, tier: 1, index });
    else if (isSubsequence(lower, q)) scored.push({ name, tier: 2, index });
  });
  // STABLE WITHIN A TIER, so a list does not reshuffle under somebody's
  // finger as they type a character that changes nothing about the order.
  return scored.sort((a, b) => a.tier - b.tier || a.index - b.index).map((s) => s.name);
}

/** Whether every character of `q` appears in order in `s`. */
function isSubsequence(s: string, q: string): boolean {
  let at = 0;
  for (const ch of q) {
    at = s.indexOf(ch, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
}

/**
 * The value with the chosen name written in as a whole `${NAME}`, and where
 * the caret goes.
 *
 * CLOSED BRACES, always, and the caret lands after them: a reference resolves
 * only when it is whole, and a half-written one is a literal that reaches its
 * destination as the characters somebody typed.
 */
export function completeReference(
  value: string,
  caret: number,
  at: ReferenceQuery,
  name: string,
): { value: string; caret: number } {
  const written = '${' + name + '}';
  const head = value.slice(0, at.start);
  // What follows the caret is kept, minus a `}` already typed: leaving it
  // would close the reference twice.
  const tail = value.slice(caret).replace(/^\}/, '');
  return { value: head + written + tail, caret: head.length + written.length };
}

/**
 * The scheme a value already carries, `https://`, `http://` or empty.
 *
 * Matched without regard to case, because a pasted address is whatever the
 * address bar had.
 */
export function urlSchemeOf(value: string): '' | 'https://' | 'http://' {
  const lower = value.toLowerCase();
  if (lower.startsWith('https://')) return 'https://';
  if (lower.startsWith('http://')) return 'http://';
  return '';
}
