/**
 * The SSH mark as a reader meets it: named for assistive technology, and
 * visible on every theme's grounds.
 *
 * `@crewlethq/icons` holds its own markup in its own suite, and it depends on
 * no other package, so it cannot measure a theme. The SSH mark is the one
 * vendor mark drawn in a colour of ours, so this suite reads the token its
 * stylesheet names and measures it, with the tokens package's own maths, on
 * every opaque surface of every theme in light and dark: the day the rule names
 * a hue that falls under 3:1 on one of them, this fails rather than a screen.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { VendorMark } from '@crewlethq/icons';
import { DEFAULT_THEME_ID, themeRegistry, WCAG_CONTRAST } from '@crewlethq/tokens';
import { contrast, OPAQUE_SURFACES, paletteStates, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';

afterEach(cleanup);

const packages = join(dirname(fileURLToPath(import.meta.url)), '../../../packages');
const read = (path: string) => readFileSync(join(packages, path), 'utf8');

/** The token the SSH rule paints from and the value behind it. */
function sshInk(): { token: string; fallback: string } {
  const rule = /\.crewlet-vendor-mark--ssh\s*\{([^}]*)\}/.exec(read('icons/src/VendorMark.css'))?.[1] ?? '';
  const ink = /color:\s*var\(\s*(--[\w-]+)\s*,\s*(#[0-9a-f]{6})\s*\)/i.exec(rule);
  expect(ink, 'no rule sets the SSH mark to a token with a fallback').not.toBeNull();
  return { token: ink![1]!, fallback: ink![2]! };
}

describe('the SSH mark', () => {
  test('is named SSH, and is decoration without a title', () => {
    render(
      <>
        <VendorMark vendor="ssh" title="SSH" />
        <VendorMark vendor="ssh" />
      </>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'SSH' }).getAttribute('class')).toContain('crewlet-vendor-mark--ssh');
  });

  test('clears 3:1 as a mark on every surface of every theme, light and dark', () => {
    const { token, fallback } = sshInk();
    const tokens = read('tokens/dist/css/tokens.css');
    const themes = read('tokens/dist/css/themes.css');
    const measured: string[] = [];
    const failures: string[] = [];
    for (const theme of themeRegistry) {
      const named = theme.id !== DEFAULT_THEME_ID;
      const states = paletteStates({
        tokens,
        themes: named ? `${themes}\n${read(`tokens/dist/css/themes/${theme.id}.css`)}` : themes,
        palette: named ? theme.id : null,
      });
      for (const [state, values] of Object.entries(states)) {
        // The token layer on its own is the marketing palette, which draws no catalogue.
        if (state === 'base') continue;
        const value = values.get(token) ?? '';
        // A consumer without the tokens draws the fallback, so it is the same hue.
        expect(value.toLowerCase(), `${theme.id} ${state}`).toBe(fallback.toLowerCase());
        const ink = parseHex(value) as Rgb;
        for (const surface of OPAQUE_SURFACES) {
          const ground = parseHex(values.get(surface) ?? '');
          expect(ground, `${theme.id} ${state} ${surface}`).not.toBeNull();
          const ratio = contrast(ink, ground as Rgb);
          measured.push(`${theme.id} ${state} ${surface}`);
          if (ratio < WCAG_CONTRAST.aaLarge) failures.push(`${theme.id} ${state} on ${surface}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
    // Every theme, in both modes, on each of the four grounds.
    expect(measured.length).toBeGreaterThanOrEqual(themeRegistry.length * 3 * OPAQUE_SURFACES.length);
    expect(failures).toEqual([]);
  });
});
