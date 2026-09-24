import {
  OPAQUE_SURFACES,
  deltaE,
  flatten,
  paletteStates,
  parseHex,
  runPalette,
  tightest,
  type PaletteCheck,
  type PaletteSources,
  type Rgb,
} from '@crewlethq/tokens/test/palette';
// The approved design's palette. A record in the tokens workspace rather than
// a published file (the build skips it and the tarball does not carry it), so
// the showroom reads it where it lives.
import intent from '../../../packages/tokens/tokens/intent.json' with { type: 'json' };

/**
 * The fit, as a table: every colour the approved design declares, what ships
 * for it, how far the two are apart, and what fails when that value alone goes
 * back to the design.
 *
 * `packages/tokens/scripts/fit-palette.mjs` is what FINDS the shipped values;
 * this is what a reader checks them against, and it deliberately shares
 * nothing with the fit but the published suite. The last column is not read
 * out of a comment or a table kept beside the tokens: it is `runPalette` run
 * again over the built theme file with that one declaration put back, and the
 * tightest failure under each rule it breaks (`tightest`), leaving out what
 * already failed as built. So a value whose
 * move stopped being forced reads "nothing fails" here the day it stops,
 * whatever its comment still says.
 */

/** One declaration of the design, in one palette. */
export interface FitRow {
  /** The design's own name: its custom property, or where a literal is drawn. */
  label: string;
  token: string;
  design: string;
  shipped: string;
  /** The shipped value's distance from the design in OKLab dE, as a reader sees it. */
  distance: number;
  /**
   * The value measured in the design's place: the design's own, or for an
   * overlay the design drew opaque, the overlay's ink at the alpha nearest it.
   */
  restored: string;
  /** What fails with `restored` in place, the tightest check under each rule; empty when nothing does. */
  binding: PaletteCheck[];
}

export interface FitPalette {
  name: 'dark' | 'light';
  /** The suite state whose values ship for this palette. */
  state: string;
  rows: FitRow[];
  /** The frame, which a translucent value is shown composited over. */
  frame: Rgb;
}

/**
 * Less than this is the same colour: an 8-bit rounding, not a move. It is the
 * threshold fit-palette.mjs reports a binding rule from, for the same reason.
 */
export const MOVED_DE = 0.005;

/** Each palette's blocks in themes.css, and the suite states that measure them. */
export const PALETTES = {
  dark: { openings: [':root {'], states: ['dark'] },
  light: {
    openings: [':root:not([data-theme="dark"]) {', ':root[data-theme="light"] {'],
    states: ['light (media query)', 'light (attribute)'],
  },
} as const;

export interface Channels extends Rgb {
  a: number;
}

const RGBA = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

export function channels(value: string): Channels | null {
  const hex = parseHex(value);
  if (hex) return { ...hex, a: 1 };
  const match = RGBA.exec(value.trim());
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: Number(match[4]) } : null;
}

const rgba = ({ r, g, b }: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `body` with `token` declared as `value`, if it declares it. */
const declare = (body: string, token: string, value: string) =>
  body.replace(new RegExp(`(\\n\\s*${escape(token)}:\\s*)[^;]+;`), `$1${value};`);

/** Apply `edit` to the declarations of every block that opens with one of `openings`. */
function rewrite(themes: string, openings: readonly string[], edit: (body: string) => string): string {
  let out = themes;
  for (const opening of openings) {
    const start = out.indexOf(opening);
    if (start < 0) throw new Error(`themes.css has no block opening "${opening}"`);
    const end = out.indexOf('}', start + opening.length);
    out = out.slice(0, start) + edit(out.slice(start, end)) + out.slice(end);
  }
  return out;
}

/**
 * `token` put back at `restored` in one palette's blocks, with the steps the
 * build derives from its channels (a state's -soft and -line, the accent's
 * -rgb and -soft-strong) following it at their own alphas, as they would if
 * the design's value were the one written.
 */
export function restore(themes: string, openings: readonly string[], token: string, shipped: Channels, restored: string): string {
  const next = channels(restored);
  return rewrite(themes, openings, (body) => {
    let out = declare(body, token, restored);
    if (shipped.a !== 1 || next === null || next.a !== 1) return out;
    for (const [, step, value] of body.matchAll(new RegExp(`\\n\\s*(${escape(token)}-[a-z-]+):\\s*([^;]+);`, 'g'))) {
      if (step === undefined || value === undefined) continue;
      if (value === `${shipped.r}, ${shipped.g}, ${shipped.b}`) out = declare(out, step, `${next.r}, ${next.g}, ${next.b}`);
      const own = channels(value);
      if (own && own.a < 1 && own.r === shipped.r && own.g === shipped.g && own.b === shipped.b) {
        out = declare(out, step, rgba(next, own.a));
      }
    }
    return out;
  });
}

/** Every colour one palette of the design declares, with the token that ships it. */
function declarations(name: 'dark' | 'light') {
  const own = Object.entries(intent[name]).map(([variable, entry]) => ({ label: variable, value: entry.value, token: entry.token }));
  const literals = intent.literals.map((entry) => ({ label: entry.where, value: entry.value, token: entry.token }));
  return [...own, ...literals].filter(
    (entry): entry is { label: string; value: string; token: string } => entry.token !== null && channels(entry.value) !== null,
  );
}

const keyOf = (check: PaletteCheck) => `${check.state}\u0000${check.rule}\u0000${check.subject}`;

export function fitPalettes(sources: PaletteSources): FitPalette[] {
  const states = paletteStates(sources);
  // What already fails as built is no answer to what one declaration put back
  // breaks: a failure of the shipped palette would otherwise be reported on
  // every row of both palettes.
  const standing = new Set(runPalette(sources).failures.map(keyOf));
  return (['dark', 'light'] as const).map((name) => {
    const palette = PALETTES[name];
    const state = palette.states[palette.states.length - 1] as string;
    const built = states[state];
    if (built === undefined) throw new Error(`the palette suite has no "${state}" state`);
    const rungs = OPAQUE_SURFACES.map((token) => parseHex(built.get(token) ?? '') as Rgb);
    // A translucent value is as far from another as the farthest of its
    // composites over the four rungs, which is how the fit measures it too.
    const apart = (a: string, b: string) => {
      const x = parseHex(a);
      const y = parseHex(b);
      if (x && y) return deltaE(x, y);
      return Math.max(...rungs.map((rung) => deltaE(flatten(a, rung), flatten(b, rung))));
    };

    const rows = declarations(name).map(({ label, value, token }): FitRow => {
      const shipped = built.get(token);
      if (shipped === undefined) throw new Error(`${name}: the design names ${token}, which the built palette does not declare`);
      const own = channels(shipped);
      if (own === null) throw new Error(`${name}: ${token} ships "${shipped}", which is not a colour`);
      const design = channels(value) as Channels;
      // An overlay the design drew opaque: the kit's overlay is translucent on
      // purpose, so what goes back is its own ink at the alpha nearest the
      // design's colour across the four rungs, never an opaque fill.
      let restored = value;
      if (own.a < 1 && design.a === 1) {
        let best = { alpha: 0, cost: Infinity };
        for (let i = 0; i <= 1000; i += 1) {
          const candidate = rgba(own, i / 1000);
          const cost = rungs.reduce((sum, rung) => sum + deltaE(flatten(candidate, rung), flatten(value, rung)), 0);
          if (cost < best.cost) best = { alpha: i / 1000, cost };
        }
        restored = rgba(own, best.alpha);
      }
      const distance = apart(shipped, restored);
      if (distance < MOVED_DE) return { label, token, design: value, shipped, distance, restored, binding: [] };
      const themes = restore(sources.themes, palette.openings, token, own, restored);
      const { failures } = runPalette({ tokens: sources.tokens, themes });
      const binding = tightest(failures.filter((check) => !standing.has(keyOf(check))));
      return { label, token, design: value, shipped, distance, restored, binding };
    });
    return { name, state, rows, frame: rungs[0] as Rgb };
  });
}
