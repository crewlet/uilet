/**
 * The dot's contract: that it never speaks, and that it can be SEEN.
 *
 * The second half is the one a component test cannot reach. A 6px mark is read
 * the way a glyph is rather than the way text is, so every fill it can take
 * has to clear 3:1 against every surface it can sit on. The fills are read out
 * of StatusDot.css rather than listed here, because a tone added without a
 * measurement would otherwise pass this file by not being in the list.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { contrast, flatten, paletteStates, parseHex } from '@crewlethq/tokens/test/palette';
import { StatusDot } from './index.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, 'StatusDot.css'), 'utf8');
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
const SURFACES = [
  'color-surface-background',
  'color-surface-subtle',
  'color-surface-muted',
  'color-surface-elevated',
  'color-surface-topbar',
].map(token);

/**
 * Every fill the stylesheet binds, the neutral default included. The tone is
 * reported WITHOUT the modifier's leading dashes, because the package's
 * variable check reads a quoted `--name` in a .tsx file as a declaration.
 */
function declaredFills(): { tone: string; fill: string }[] {
  const found: { tone: string; fill: string }[] = [];
  for (const match of css.matchAll(/\.crewlet-status-dot(--[\w-]+)?\s*\{([^}]*)\}/g)) {
    const fill = /(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(match[2] ?? '');
    if (fill) found.push({ tone: match[1] === undefined ? 'neutral' : match[1].slice(2), fill: fill[1] ?? '' });
  }
  return found;
}

describe('StatusDot', () => {
  test('it is hidden from assistive technology, because the word beside it says the state', () => {
    const { container } = render(<StatusDot tone="danger" />);
    const dot = container.querySelector('.crewlet-status-dot');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    // Nothing to read: a dot that announced itself would say the state twice.
    expect(dot?.textContent).toBe('');
  });

  test('the suite reads the tones the stylesheet actually declares', () => {
    expect(declaredFills().map((each) => each.tone).sort()).toEqual([
      'brand',
      'danger',
      'info',
      'neutral',
      'phase-execute',
      'phase-onboarding',
      'phase-review',
      'success',
      'warning',
    ]);
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
      for (const { tone, fill } of declaredFills()) {
        const raw = values.get(fill);
        if (raw === undefined) throw new Error(`StatusDot.css reads ${fill}, which @crewlethq/tokens does not emit`);
        const mark = parseHex(raw) ?? flatten(raw, ground);
        for (const surface of SURFACES) {
          const beneath = parseHex(values.get(surface) ?? '') ?? flatten(values.get(surface) ?? '', ground);
          const ratio = contrast(mark, beneath);
          if (ratio < 3) failures.push(`${state}: ${tone} (${fill}) on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test('the pulse is a breath, not a flash', () => {
    // It alternates, so the round trip is twice the declared duration. Three
    // slow steps each way is 1.8s, the engine's own period and 0.55 flashes a
    // second: three a second is the seizure threshold.
    const pulse = /\.crewlet-status-dot\.is-pulsing\s*\{([^}]*)\}/.exec(css);
    expect(pulse?.[1]).toContain('calc(var(--motion-duration-slow) * 3)');
    expect(pulse?.[1]).toContain('alternate');
    // And it never goes to nothing: a mark that disappears reads as a fault.
    const frames = /@keyframes crewlet-status-dot-pulse\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(frames?.[1]).toContain('opacity: 0.35');
    expect(frames?.[1]).not.toContain('opacity: 0;');
    expect(css).toContain('prefers-reduced-motion');
  });
});
