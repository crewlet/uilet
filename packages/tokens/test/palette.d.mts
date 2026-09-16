/**
 * Types for the published palette suite.
 *
 * The implementation is plain JavaScript on purpose: it runs under `node
 * --test` from a packed tarball, with no build step between the source and the
 * gate. But it is a PUBLIC export, and both consumers of it are TypeScript,
 * so the shape is declared here rather than inferred as `any` at each of them.
 *
 * Only the entry points are declared. The colour maths underneath is re-
 * exported for a caller that wants to measure something of its own, and is
 * typed loosely for that reason.
 */

/** One measured rule, over one state of the cascade. */
export interface PaletteCheck {
  /** Which set of values: 'base', 'light', 'dark (media)', 'dark (attribute)'. */
  state: string;
  /** The rule being kept, as a sentence. */
  rule: string;
  ok: boolean;
  /** What was measured: a token name, or a pair of them. */
  subject: string;
  /** The measured number, or null for a structural rule that has none. */
  value: number | null;
  /** The measurement and its floor, ready to print. */
  detail: string;
}

export interface PaletteSources {
  /** The text of the built tokens.css. */
  tokens: string;
  /** The text of the built themes.css. */
  themes: string;
}

export interface PaletteResult {
  /** The resolved values in each state of the cascade. */
  states: Record<string, Map<string, string>>;
  checks: PaletteCheck[];
  failures: PaletteCheck[];
}

/** Measure the whole rule table over one built pair of stylesheets. */
export function runPalette(sources: PaletteSources): PaletteResult;

/** The four sets of values a browser can end up with. */
export function paletteStates(sources: PaletteSources): Record<string, Map<string, string>>;

/** One line per failing check, for an assertion message. */
export function describeFailure(check: PaletteCheck): string;

/** The tightest measured value under each rule, for a report or a story. */
export function tightest(checks: readonly PaletteCheck[]): PaletteCheck[];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function contrast(a: Rgb, b: Rgb): number;
export function deltaE(a: Rgb, b: Rgb): number;
export function chroma(colour: Rgb): number;
export function flatten(value: string, backdrop: Rgb): Rgb;
export function parseHex(hex: string): Rgb | null;
export function simulate(colour: Rgb, kind: string): Rgb;
export function separation(a: Rgb, b: Rgb): number[];
export const VISIONS: readonly string[];

/** The token name of the modal veil. */
export const VEIL: string;

/** The band the veiled page has to stay inside, as [floor, ceiling]. */
export const VEIL_BAND: readonly number[];

/** The alpha the veil draws its own root's ground at. */
export const VEIL_ALPHA: number;
