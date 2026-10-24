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
  /**
   * Which set of values: one of the four `paletteStates` names ('base',
   * 'dark', 'light (media query)', 'light (attribute)'), or 'the token files'
   * for a structural rule, which reads the theme file rather than a state.
   */
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
  /**
   * The text of the built themes.css, followed by the sheet of a named theme
   * (css/themes/<id>.css, or css/themes/all.css) when `palette` names one.
   */
  themes: string;
  /** A named theme's id, measured under its data-palette blocks; absent for the default. */
  palette?: string | null;
  /** The tint a theme declares for its grounds, measured in place of the neutral cap. */
  tint?: { hue: number; chroma: number } | null;
  /** 'high' holds the theme to the high-contrast floors as well. */
  contrast?: 'standard' | 'high';
}

export interface PaletteResult {
  /** The resolved values in each state of the cascade. */
  states: Record<string, Map<string, string>>;
  checks: PaletteCheck[];
  failures: PaletteCheck[];
}

/** Measure the whole rule table over one built pair of stylesheets. */
export function runPalette(sources: PaletteSources): PaletteResult;

/**
 * The four sets of values a browser can end up with, keyed 'base' (tokens.css
 * alone, the marketing palette), 'dark' (the theme layer's bare root, which a
 * document that sets nothing gets), 'light (media query)' and 'light
 * (attribute)', in that order.
 */
export function paletteStates(sources: PaletteSources): Record<string, Map<string, string>>;

/** The three selectors that paint a theme: the default on the bare root, a named one under data-palette. */
export function paletteSelectors(palette: string | null | undefined): { dark: string; lightMedia: string; lightAttribute: string };

/** The chroma under which a ground reads as neutral, and the cap an untinted theme's rungs keep. */
export const NEUTRAL_CHROMA: number;
/** How far, in OKLCh degrees, a tinted rung's hue may sit from its theme's declared tint. */
export const TINT_HUE_RANGE: number;
/** How many times the most tinted rung's chroma the accent carries. */
export const ACCENT_OVER_TINT: number;
/** The floors a high-contrast theme is held to on top of the table. */
export const HIGH_CONTRAST: { readonly text: number; readonly ink: number; readonly muted: number; readonly hairline: number };
/** How far the selected edge sits from a hairline, in OKLab dE, on every rung. */
export const SELECTED_EDGE_SEPARATION: number;

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
export function luminance(colour: Rgb): number;
export function deltaE(a: Rgb, b: Rgb): number;
export function chroma(colour: Rgb): number;
export function flatten(value: string, backdrop: Rgb): Rgb;
export function parseHex(hex: string): Rgb | null;
export function simulate(colour: Rgb, kind: string): Rgb;
export function separation(a: Rgb, b: Rgb): number[];
export const VISIONS: readonly string[];

/**
 * The four opaque rungs, by custom-property name, lowest first: the frame, the
 * sheet (`--color-surface-background`), the card (`-subtle`) and raised
 * (`-elevated`). Every ground a piece of text can end up on; a component suite
 * measures on these rather than on a copy of them.
 */
export const OPAQUE_SURFACES: readonly string[];

/**
 * The neutral text steps that carry a FACT, each as [custom property, the
 * contrast floor it clears on every opaque rung].
 */
export const TEXT_STEPS: readonly (readonly [string, number])[];

/**
 * A dimmed word against the word being read, as [read, dimmed, contrast]: the
 * two text steps clear that contrast between themselves.
 */
export const DIMMED_TEXT: readonly [string, string, number];

/**
 * The steps of the ladder, each as [rule, upper rung, lower rung, the dE the
 * upper rung has to sit off the lower one].
 */
export const RUNG_STEPS: readonly (readonly [string, string, string, number])[];

/** The line that finds a card, as [border, card, sheet]: it clears HAIRLINE_DE against both. */
export const CARD_HAIRLINE: readonly [string, string, string];
export const HAIRLINE_DE: number;

/**
 * The overlays that have to be seen, each as [rule, overlay, the overlay it is
 * measured against or null for the bare rung], and the dE each clears.
 */
export const OVERLAY_STEPS: readonly (readonly [string, string, string | null])[];
export const OVERLAY_DE: number;

/**
 * The translucent overlays composited onto each opaque rung: a hovered row, a
 * pressed row and an inset well. A component suite measuring what a mark
 * stands on includes these grounds as well as the bare rungs.
 */
export const OVERLAYS: readonly string[];

/** The ground the application rail stands on. */
export const RAIL_GROUND: string;

/**
 * The row the reader is on in the rail, as [fill, hairline]: raised, with the
 * plain border drawn round it. The fill lifts off the rail by
 * RAIL_CURRENT_LIFT and the hairline clears HAIRLINE_DE on the fill.
 */
export const RAIL_CURRENT_ROW: readonly [string, string];
export const RAIL_CURRENT_LIFT: number;

/**
 * A chip on the raised rung inside the strong hairline, as [fill, edge]: its
 * boundary clears HAIRLINE_DE on every opaque rung and every overlay on one.
 */
export const RAISED_CHIP: readonly [string, string];

/**
 * The four chart series, by custom-property name, in the order a figure
 * assigns them. Past the fourth a figure takes `--color-data-other`, which is
 * not a series and is not in the list.
 */
export const DATA: readonly string[];

/**
 * How far apart two neighbouring series sit, in OKLab dE: DATA_ADJACENT_DE
 * under every vision, and DATA_ADJACENT_NORMAL_DE under normal vision.
 */
export const DATA_ADJACENT_DE: number;
export const DATA_ADJACENT_NORMAL_DE: number;

/**
 * The filled actions' steps, each as [rule, the step, the fill it follows]:
 * the primary action's hover and press, and the destructive action's hover.
 * Each clears ACTION_DE against the one before it and raises the contrast of
 * ACTION_LABEL on it.
 */
export const ACTION_STEPS: readonly (readonly [string, string, string])[];
/**
 * Each state fill with the ink an avatar's status glyph is drawn in on it:
 * [ink, fill], held to 3:1 over every ground the fill can sit on.
 */
export const MARK_ON_FILL: readonly (readonly [string, string])[];
export const ACTION_LABEL: string;
/** The destructive action's label, which each step of the danger fill moves away from. */
export const DESTRUCTIVE_LABEL: string;
/** The label drawn on the scrim and on a seeded tint, white in every palette. */
export const SCRIM_LABEL: string;
export const ACTION_DE: number;

/** The token name of the modal veil. */
export const VEIL: string;

/** The rung the veil is drawn in: each root's own frame. */
export const VEIL_GROUND: string;

/** The band the veiled page has to stay inside, as [floor, ceiling]. */
export const VEIL_BAND: readonly number[];

/** The alpha the veil draws its own root's frame at. */
export const VEIL_ALPHA: number;

/** The six node hues a collaborator's presence marks are drawn in, held to 3:1 as marks on every rung. */
export const PRESENCE_HUES: readonly string[];

/** The ink of the name on a presence flag, held to 4.5:1 on every presence hue. */
export const PRESENCE_FLAG_TEXT: string;
