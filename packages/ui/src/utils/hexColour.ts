import { parseHex } from '@crewlethq/tokens';

/**
 * A colour somebody chose, as the one spelling every brand part stores and
 * draws: `#` and six lowercase hex digits, or null for anything else.
 *
 * WHY ONE FUNCTION. A brand's colours are data, typed or pasted by a person
 * and drawn into a custom property, so every part that takes one reads it
 * through the same gate: the tokens package's `parseHex`, which accepts
 * `#rrggbb` alone (any case, surrounding space trimmed) and nothing a
 * stylesheet would read as something else. The lowercase form is the one the
 * engine stores, so a value read back compares equal to the value written.
 */
export function normalizeHex(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return parseHex(value) === null ? null : value.trim().toLowerCase();
}
