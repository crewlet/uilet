/**
 * Colour values and WCAG contrast: the one implementation every caller uses.
 *
 * Three callers, one source:
 *
 * - the published `@crewlethq/tokens` entry re-exports `parseHex`,
 *   `luminance`, `contrast` and `WCAG_CONTRAST`, so an interface that has to
 *   say whether two colours a person chose read on each other (a brand's text
 *   on its ground, a label on a fill) measures exactly as the palette suite
 *   does;
 * - the palette suite (`test/color.mjs`, published as
 *   `@crewlethq/tokens/test/palette`) imports it from `dist/`, so the ratio a
 *   consumer's suite holds a theme to is the ratio its interface shows;
 * - the token build (`scripts/build.mjs`) imports this source directly, before
 *   `tsc` has run, to derive each palette's tints. That is why the file uses
 *   only syntax Node can strip without compiling: type annotations and
 *   interfaces, no enums, namespaces or parameter properties.
 */

/** A colour as sRGB channels from 0 to 255. Channels may be fractional (a composite over a ground). */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/**
 * The WCAG 2 contrast floors, as ratios. `aa` and `aaa` are for body text;
 * `aaLarge` and `aaaLarge` for large text (24px, or 18.66px bold) and, for
 * `aaLarge`, for a graphical mark or a control's boundary. Compare the
 * unrounded ratio against them: a ratio that passes only once rounded does
 * not pass.
 */
export const WCAG_CONTRAST = Object.freeze({ aa: 4.5, aaLarge: 3, aaa: 7, aaaLarge: 4.5 } as const);

/**
 * A `#rrggbb` value as channels, or null for anything else. Surrounding white
 * space is ignored and case does not matter; the three and eight digit forms,
 * names and functional notations are not colours here, because every token
 * and every brand colour is authored as six digits.
 */
export function parseHex(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = Number.parseInt(match[1] as string, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** An `rgb()` or `rgba()` value as channels and an alpha, or null for anything else. */
export function parseRgba(value: string): { rgb: Rgb; a: number } | null {
  const match = /^rgba?\(([^)]+)\)$/i.exec(value.trim());
  if (!match) return null;
  const [r, g, b, a] = (match[1] as string)
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  if (r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b].some(Number.isNaN)) return null;
  return { rgb: { r, g, b }, a: a === undefined ? 1 : a };
}

/** The same colour at a new alpha, as the CSS value the build emits. */
export function withAlpha(value: string, alpha: number): string {
  const rgb = parseHex(value) ?? parseRgba(value)?.rgb;
  if (!rgb) throw new Error(`cannot re-alpha "${value}"`);
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

/** One sRGB channel, 0 to 255, as linear light, 0 to 1. */
export function linearChannel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, from 0 (black) to 1 (white). */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

/**
 * The WCAG 2 contrast ratio between two opaque colours, from 1 to 21, in
 * either order. Unrounded: round only to display it, and compare the raw
 * ratio against `WCAG_CONTRAST`.
 */
export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
