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

const SIX = /^#?([0-9a-f]{6})$/i;
const THREE = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const RGB = /^rgb\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})\s*\)$/i;

/**
 * A colour as a person types or pastes it, read into the one stored spelling
 * (`#` and six lowercase hex digits), or null for anything else.
 *
 * Taken: `#rrggbb` and `rrggbb`, the three digit shorthand with or without
 * its `#` (each digit doubled), and `rgb(r, g, b)` or `rgb(r g b)` with each
 * channel a whole number from 0 to 255. Refused: the eight and four digit
 * forms (a stored brand colour has no alpha), percentages, names and every
 * other notation, so what is stored is never a value a stylesheet would read
 * as something else. The result passes `normalizeHex`, the gate every brand
 * part reads a colour through.
 */
export function parseColourInput(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const six = SIX.exec(text);
  if (six) return normalizeHex(`#${six[1]}`);
  const three = THREE.exec(text);
  if (three) return normalizeHex(`#${three[1]}${three[1]}${three[2]}${three[2]}${three[3]}${three[3]}`);
  const rgb = RGB.exec(text);
  if (rgb) {
    const channels = [rgb[1], rgb[2], rgb[3]].map(Number);
    if (channels.some((channel) => channel > 255)) return null;
    return normalizeHex(`#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`);
  }
  return null;
}
