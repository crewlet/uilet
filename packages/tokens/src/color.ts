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

// ---------------------------------------------------------------------------
// OKLab, and the nearest shade that clears a contrast floor
// ---------------------------------------------------------------------------

/** A colour in OKLab: perceptual lightness `L` from 0 to 1, and the two opponent axes. */
export interface Oklab {
  L: number;
  a: number;
  b: number;
}

/** sRGB channels (0 to 255) in OKLab. */
export function toOklab({ r, g, b }: Rgb): Oklab {
  const lr = linearChannel(r);
  const lg = linearChannel(g);
  const lb = linearChannel(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * OKLab to LINEAR sRGB, unclipped. A channel under 0 or over 1 says the
 * colour is outside what a screen can show, which `fromOklab` hides by
 * clipping each channel on its own, and clipping one channel turns the hue: a
 * search that walks lightness has to know where the gamut ends rather than be
 * handed a different colour from the one it asked for.
 */
export function oklabToLinear({ L, a, b }: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** One linear channel, 0 to 1, as an sRGB channel, 0 to 255, clipped but not rounded. */
export function fromLinear(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, c * 255));
}

/** OKLab to sRGB, each channel clipped and rounded to a whole step. */
export function fromOklab(lab: Oklab): Rgb {
  const { r, g, b } = oklabToLinear(lab);
  return { r: Math.round(fromLinear(r)), g: Math.round(fromLinear(g)), b: Math.round(fromLinear(b)) };
}

/** Channels as lowercase `#rrggbb`. */
export function formatHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Whether linear sRGB is inside what a screen can show, with a hair of tolerance for rounding. */
function inGamut({ r, g, b }: Rgb): boolean {
  const ok = (v: number) => v >= -1e-6 && v <= 1 + 1e-6;
  return ok(r) && ok(g) && ok(b);
}

/**
 * A lightness in OKLab, at the hue of `a` and `b`, as the most chroma the
 * screen can show there, up to the colour's own: a dark or a very light shade
 * of a vivid colour cannot carry its full chroma, and giving up chroma (never
 * hue) is what keeps it the same colour.
 */
function shadeAt(L: number, a: number, b: number): Rgb {
  if (inGamut(oklabToLinear({ L, a, b }))) return fromOklab({ L, a, b });
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const k = (lo + hi) / 2;
    if (inGamut(oklabToLinear({ L, a: a * k, b: b * k }))) lo = k;
    else hi = k;
  }
  return fromOklab({ L, a: a * lo, b: b * lo });
}

/** How finely the lightness is walked: a thousandth of OKLab's range. */
const LIGHTNESS_STEP = 0.001;

/**
 * The colour nearest `hex` that clears `min` against `ground`, as lowercase
 * `#rrggbb`, or null when no shade of it can (or either value is not
 * `#rrggbb`).
 *
 * THE SAME COLOUR, LIGHTER OR DARKER. Its hue and chroma are kept in OKLab and
 * only its lightness moves, in both directions from where it stands; the
 * nearer shade that clears the floor wins, so a teal too light for a light
 * page becomes a darker teal rather than a different colour. Where a shade
 * cannot carry the colour's full chroma on a screen, chroma gives way and the
 * hue never does. A colour that already clears the floor is its own answer.
 *
 * The floor is held on the rounded value the function returns, unrounded, as
 * every contrast here is: a shade that clears it only before rounding is not
 * returned.
 */
export function nearestContrastShade(hex: string, ground: string, min: number): string | null {
  const colour = parseHex(hex);
  const base = parseHex(ground);
  if (!colour || !base || !(min >= 1)) return null;
  if (contrast(colour, base) >= min) return formatHex(colour);
  const { L, a, b } = toOklab(colour);
  for (let i = 1; i * LIGHTNESS_STEP <= 1; i += 1) {
    const dL = i * LIGHTNESS_STEP;
    // Darker first at an equal distance: on the light grounds a brand is
    // checked against most, darker is the shade that reads as the same ink.
    for (const next of [L - dL, L + dL]) {
      if (next < 0 || next > 1) continue;
      const shade = shadeAt(next, a, b);
      if (contrast(shade, base) >= min) return formatHex(shade);
    }
  }
  return null;
}
