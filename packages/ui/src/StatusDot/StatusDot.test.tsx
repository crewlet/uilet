/**
 * The dot's contract: that it never speaks, that it can be SEEN, and that its
 * pulse is a breath that stops for a reader who asked for stillness.
 *
 * The second half is the one a component test cannot reach. A 7px mark is read
 * the way a glyph is rather than the way text is, so every fill it can take
 * has to clear 3:1 against every surface it can sit on, and against whatever
 * touches it while it pulses. The fills and the halos are read out of
 * StatusDot.css rather than listed here, because a tone added without a
 * measurement would otherwise pass this file by not being in the list.
 *
 * The third half is put to the CASCADE rather than to the source: the
 * stylesheet goes into the document with its reduced-motion query answered,
 * and the rule that wins is the rule that is read back, off a stand-in for the
 * ring box, since jsdom computes no style for a pseudo-element.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { motion } from '@crewlethq/tokens';
import {
  contrast,
  deltaE,
  flatten,
  OPAQUE_SURFACES,
  OVERLAY_DE,
  paletteStates,
  parseHex,
} from '@crewlethq/tokens/test/palette';
import { installCss, installMotion, installSheets, pseudoElement } from '../../../../apps/ui-tests/src/cascade.js';
import type { Tone } from '../utils/tone.js';
import { StatusDot, type StatusDotProps } from './index.js';

/** The stylesheet a case put into the document, taken out again whatever the case did. */
let remove: (() => void) | null = null;
afterEach(() => {
  cleanup();
  remove?.();
  remove = null;
});

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, 'StatusDot.css'), 'utf8');
/** The stylesheet with its comments blanked, so prose about a rule is never read as the rule. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
const tokensCss = resolve(here, '../../../tokens/dist/css');
const states = paletteStates({
  tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
  themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
});

/*
 * The token names are spelled without their leading dashes and prefixed at
 * use: the package's variable check reads a quoted `--name` inside a .tsx file
 * as a DECLARATION, and a component may declare only `--crewlet-*` names.
 */
const token = (name: string) => `--${name}`;
/**
 * Every tone the stylesheet paints, the neutral default included, with the
 * fill it binds and the halo a pulse breathes out in. A tone is reported
 * WITHOUT the modifier's leading dashes, because the package's variable check
 * reads a quoted `--name` in a .tsx file as a declaration.
 */
function declaredTones(): { tone: string; fill: string; halo: string }[] {
  const found: { tone: string; fill: string; halo: string }[] = [];
  for (const match of code.matchAll(/\.crewlet-status-dot(--[\w-]+)?\s*\{([^}]*)\}/g)) {
    const body = match[2] ?? '';
    const fill = /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(body)?.[1];
    const halo = /(?:^|;|\s)--crewlet-status-dot-halo:\s*var\((--[\w-]+)\)/.exec(body)?.[1];
    if (fill === undefined && halo === undefined) continue;
    found.push({ tone: match[1] === undefined ? 'neutral' : match[1].slice(2), fill: fill ?? '', halo: halo ?? '' });
  }
  return found;
}

/**
 * The rule that starts the pulse: the first to name its keyframes, since the
 * reduced-motion stop that names the same selector later sets `none`.
 */
function pulseRule(): { selector: string; body: string } {
  const found = /([^{}]+)\{([^{}]*\banimation:\s*crewlet-status-dot-pulse\b[^{}]*)\}/.exec(code);
  if (!found) throw new Error('StatusDot.css starts no crewlet-status-dot-pulse');
  return { selector: (found[1] ?? '').trim(), body: found[2] ?? '' };
}

/**
 * How far the box that casts the halo stands off the dot's edge, in px, read
 * from the rule that starts the pulse: 0 when the dot casts it itself, since a
 * spread shadow starts at the edge of the box that casts it, and the ring
 * box's own outset when a pseudo-element does.
 */
function haloGap(): number {
  const { selector, body } = pulseRule();
  if (!/::(before|after)$/.test(selector)) return 0;
  const inset = /(?:^|;|\s)inset:\s*(-?[\d.]+)(?:px)?\s*;/.exec(body);
  if (!inset) throw new Error(`${selector} casts the halo with no inset to measure its gap by`);
  return -Number(inset[1]);
}

/** A token's value in one palette state, composited onto the page when it is translucent. */
function paint(values: ReadonlyMap<string, string>, name: string, ground: { r: number; g: number; b: number }) {
  const raw = values.get(name);
  if (raw === undefined) throw new Error(`StatusDot.css reads ${name}, which @crewlethq/tokens does not emit`);
  return parseHex(raw) ?? flatten(raw, ground);
}

const TONES: readonly Tone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'brand'];

describe('StatusDot', () => {
  test('it is hidden from assistive technology, because the word beside it says the state', () => {
    const { container } = render(<StatusDot tone="danger" />);
    const dot = container.querySelector('.crewlet-status-dot');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    // Nothing to read: a dot that announced itself would say the state twice.
    expect(dot?.textContent).toBe('');
  });

  test("it is the design's 7px mark, square, at every density", () => {
    // The approved design draws a 7px dot. A density token here would shrink
    // the mark with the gaps around it, and a round mark needs its two sides
    // to agree or it is an ellipse.
    const root = /\.crewlet-status-dot\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(/(?:^|;|\s)width:\s*([^;]+);/.exec(root)?.[1]?.trim()).toBe('7px');
    expect(/(?:^|;|\s)height:\s*([^;]+);/.exec(root)?.[1]?.trim()).toBe('7px');
    expect(root).toContain('border-radius: var(--radius-circle)');
  });

  test('the suite reads the tones the stylesheet actually declares, each with a fill and a halo', () => {
    const tones = declaredTones();
    expect(tones.map((each) => each.tone).sort()).toEqual([...TONES].sort());
    // A tone with one of the two is a tone whose pulse, or whose dot, is
    // painted in whatever the neutral rule left behind.
    for (const { tone, fill, halo } of tones) {
      expect(fill, `${tone} has no fill`).not.toBe('');
      expect(halo, `${tone} has no halo`).not.toBe('');
    }
  });

  test('a phase is not a tone: the type refuses one', () => {
    /*
     * The `@ts-expect-error` is the ASSERTION, and `npm run typecheck` is where
     * it runs: the build fails if the error ever stops happening. A phase is a
     * category, and a category is the neutral dot beside its word; the three
     * phase hues this dot used to take are gone from the palette, so a tone
     * that named one would draw a class no stylesheet paints.
     */
    // @ts-expect-error a phase takes the neutral dot and its word, not a hue
    const phase: StatusDotProps['tone'] = 'phase-execute';
    const category: StatusDotProps['tone'] = 'neutral';
    expect([phase, category]).toHaveLength(2);
  });

  test('every fill clears 3:1 as a mark, on every surface, in both palettes', () => {
    // This is what refuses the engine's own neutral. It draws the quiet dot in
    // --color-text-muted, which is the decoration step and measures 2.33:1 on
    // a light page: a mark nobody can find is not a mark.
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const ground = parseHex(values.get(token('color-surface-background')) ?? '');
      if (ground === null) throw new Error(`${state} has no opaque page colour`);
      for (const { tone, fill } of declaredTones()) {
        const mark = paint(values, fill, ground);
        for (const surface of OPAQUE_SURFACES) {
          const beneath = parseHex(values.get(surface) ?? '') ?? flatten(values.get(surface) ?? '', ground);
          const ratio = contrast(mark, beneath);
          if (ratio < 3) failures.push(`${state}: ${tone} (${fill}) on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test('while it pulses, the dot still stands on the surface its fill was measured against', () => {
    /*
     * THE HALO NEVER TOUCHES THE DOT. The design casts it from the dot itself,
     * and a spread shadow starts at the edge of the box that casts it, so the
     * dot's ground for the whole round would be its own soft step on the
     * surface. There the light info, success and warning fills measure 2.65:1
     * to 2.95:1: a mark under its own floor, which is why the fade this pulse
     * replaced was refused. So the fill is measured against whatever touches
     * its edge, read from the stylesheet: the surface when a band of it stands
     * between the dot and the box casting the halo, and the halo on the
     * surface when none does.
     */
    const gap = haloGap();
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      for (const { tone, fill, halo } of declaredTones()) {
        const mark = paint(values, fill, page);
        for (const surface of OPAQUE_SURFACES) {
          const beneath = paint(values, surface, page);
          const ground = gap > 0 ? beneath : flatten(values.get(halo) ?? '', beneath);
          const ratio = contrast(mark, ground);
          if (ratio < 3) failures.push(`${state}: ${tone} (${fill}) touching ${gap > 0 ? surface : `${halo} on ${surface}`}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test("a tone's halo is its own soft step, and the quiet dot's is the pressed overlay", () => {
    /*
     * A halo in another tone's hue is a second state drawn round the first.
     * The neutral family has no soft step, so it takes the neutral overlay
     * that stands off its ground as far as the tones' halos do; the case below
     * is what measures that, and this one says which step it is.
     */
    const halos = Object.fromEntries(declaredTones().map(({ tone, fill, halo }) => [tone, { fill, halo }]));
    for (const tone of TONES) {
      if (tone === 'neutral') continue;
      expect(halos[tone]?.halo, tone).toBe(`${halos[tone]?.fill}-soft`);
    }
    expect(halos['neutral']?.halo).toBe(token('color-surface-pressed'));
  });

  test('every halo can be seen, on every surface, in both palettes', () => {
    /*
     * Held to the dE 3 the palette suite holds every "can a reader notice it"
     * difference to, not to a contrast ratio: the dot is the mark and clears
     * 3:1 on its own, and the halo only has to be there at all. This is what
     * refuses the inset well for the quiet dot, which stands dE 1.79 off the
     * light frame: a pulse nobody can see is a dot that says nothing is
     * happening.
     */
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const ground = parseHex(values.get(token('color-surface-background')) ?? '');
      if (ground === null) throw new Error(`${state} has no opaque page colour`);
      for (const { tone, halo } of declaredTones()) {
        for (const surface of OPAQUE_SURFACES) {
          const beneath = paint(values, surface, ground);
          const ring = flatten(values.get(halo) ?? '', beneath);
          const distance = deltaE(ring, beneath);
          if (distance < OVERLAY_DE) failures.push(`${state}: ${tone} (${halo}) on ${surface}: dE ${distance.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test('the pulse is one breath a round, not a flash', () => {
    /*
     * `--motion-duration-breath` is a PERIOD: one full round, out and back.
     * So the animation runs it once per round and does NOT alternate, which
     * would play each half as a whole duration and take twice as long. Read
     * against the token's own value, so a faster breath is caught here too:
     * three flashes a second is the seizure threshold.
     */
    const pulse = pulseRule().body;
    expect(pulse).toMatch(
      /animation:\s*crewlet-status-dot-pulse var\(--motion-duration-breath\) var\(--motion-easing-in-out\) infinite;/,
    );
    expect(pulse).not.toContain('alternate');
    const rounds = 1000 / Number.parseFloat(motion.duration.breath);
    expect(rounds).toBeLessThan(3);
  });

  test("the halo breathes out to the design's 5px, and the dot never fades", () => {
    /*
     * The keyframes move a box-shadow and NOTHING ELSE. The pulse this
     * replaced faded the dot to 0.35, where every fill measured 1.35:1 to
     * 2.17:1 against its ground: for part of every round, a mark under its
     * own floor. A shadow is painted outside the box that casts it, so the
     * fill never moves.
     *
     * THE REACH IS THE DESIGN'S 5PX, split as 2 of ground and 3 of halo: the
     * ring box stands 2px off the dot, the offset the Avatar state ring and
     * the outer focus ring stand at, and its shadow spreads 3px beyond it.
     */
    const frames = /@keyframes crewlet-status-dot-pulse\s*\{([\s\S]*?)\n\}/.exec(code)?.[1];
    expect(frames, 'the keyframes are where the rule names them').toBeDefined();
    const properties = new Set([...(frames ?? '').matchAll(/([\w-]+)\s*:/g)].map((match) => match[1]));
    expect([...properties]).toEqual(['box-shadow']);
    // Out from nothing and back, in the tone's halo.
    const shadows = [...(frames ?? '').matchAll(/([\d%,\s]+)\{\s*box-shadow:\s*([^;]+);/g)].map((match) => [
      (match[1] ?? '').replace(/\s+/g, ''),
      (match[2] ?? '').trim(),
    ]);
    expect(shadows).toEqual([
      ['0%,100%', '0 0 0 0 var(--crewlet-status-dot-halo)'],
      ['50%', '0 0 0 3px var(--crewlet-status-dot-halo)'],
    ]);
    const peak = Number(/0 0 0 ([\d.]+)px/.exec(shadows[1]?.[1] ?? '')?.[1]);
    expect(haloGap()).toBe(2);
    expect(haloGap() + peak).toBe(5);
    // And nothing in the stylesheet dims the mark at any point.
    expect(code).not.toMatch(/(^|[;{\s])opacity\s*:/);
  });

  test('the ring box takes no room, is never a target, and yields to a position of your own', () => {
    /*
     * The pulsing dot is the ring box's containing block through a rule that
     * weighs NOTHING, so a class of yours that positions the dot wins even
     * written first; any position but static keeps the ring on the dot. Put
     * to the cascade, because a `.crewlet-status-dot.is-pulsing` without the
     * :where() reads as the same rule and outranks every one-class override.
     */
    const { container } = render(
      <>
        <StatusDot tone="info" pulse />
        <StatusDot tone="info" pulse className="placed" />
        <StatusDot tone="info" />
      </>,
    );
    const [pulsing, placed, still] = [...container.querySelectorAll('.crewlet-status-dot')];
    const ring = pseudoElement(pulsing!, 'after');
    const removeOwn = installCss('.placed { position: absolute; }');
    remove = installSheets('StatusDot/StatusDot.css');
    try {
      expect(getComputedStyle(pulsing!).position).toBe('relative');
      expect(getComputedStyle(placed!).position).toBe('absolute');
      // A dot that does not pulse is left exactly as it was.
      expect(getComputedStyle(still!).position).not.toBe('relative');
      expect(getComputedStyle(ring).position).toBe('absolute');
      expect(getComputedStyle(ring).pointerEvents).toBe('none');
    } finally {
      removeOwn();
    }
  });

  test('every tone pulses, and every pulse is held under reduced motion', () => {
    /*
     * Put to the cascade, not read off the source: a stop that names a
     * selector one class short of the start, or that is written above it,
     * reads perfectly and loses. Both happened elsewhere in this package. The
     * pulse runs on the ring box, so each dot is given the stand-in the
     * harness measures a pseudo-element on.
     */
    const { container } = render(
      <>
        {TONES.map((tone) => (
          <StatusDot key={`${tone}-pulse`} tone={tone} pulse />
        ))}
        {TONES.map((tone) => (
          <StatusDot key={`${tone}-still`} tone={tone} />
        ))}
      </>,
    );
    const dots = [...container.querySelectorAll('.crewlet-status-dot')];
    const rings = dots.map((dot) => ({ dot, ring: pseudoElement(dot, 'after') }));
    const pulsing = rings.slice(0, TONES.length);
    const still = rings.slice(TONES.length);
    expect(pulsing).toHaveLength(TONES.length);

    remove = installMotion('no-preference', 'StatusDot/StatusDot.css');
    for (const { dot, ring } of pulsing) expect(getComputedStyle(ring).animation, dot.className).toContain('crewlet-status-dot-pulse');
    for (const { dot, ring } of still) expect(getComputedStyle(ring).animation, dot.className).toBe('');
    // The dot itself never animates: its ring box does.
    for (const { dot } of rings) expect(getComputedStyle(dot).animation, dot.className).toBe('');
    remove();

    remove = installMotion('reduce', 'StatusDot/StatusDot.css');
    for (const { dot, ring } of pulsing) expect(getComputedStyle(ring).animation, dot.className).toBe('none');
    for (const { dot, ring } of still) expect(getComputedStyle(ring).animation, dot.className).toBe('');
  });
});
