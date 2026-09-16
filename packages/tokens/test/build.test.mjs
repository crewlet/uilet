/**
 * What the build promises about the shape of what it emits.
 *
 * These are the claims the palette suite cannot make, because they are about
 * units, arithmetic and provenance rather than about colour: a font size is a
 * number of pixels in the typed export and a number of rem in the stylesheet,
 * a density-scaled token carries its calc(), a small target cannot shrink
 * under the size a finger can hit, and a soft tint still belongs to the fill
 * it was derived from.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cascade, parseHex, parseRgba, withAlpha } from './color.mjs';
import { SOFT_ALPHA, paletteStates } from './palette.mjs';
import { breakpoint, font, size, spacing, themes } from '../dist/index.js';

const read = (name) => readFileSync(fileURLToPath(new URL(`../dist/css/${name}`, import.meta.url)), 'utf8');
const tokensCss = read('tokens.css');
const themesCss = read('themes.css');
const source = (css) => [{ name: 'css', css }];
const root = (css) => cascade(source(css), (block) => block.atRule === null && block.selector === ':root');
const tokens = root(tokensCss);

/**
 * Resolve the two value shapes the density transform emits, and nothing else.
 * A third shape is a change to the build that this arithmetic no longer
 * describes, so it fails here rather than being silently mis-measured.
 */
function resolvePx(value, density) {
  const scaled = /^calc\((-?\d*\.?\d+)px \* var\(--density, 1\)\)$/.exec(value);
  if (scaled) return Number(scaled[1]) * density;
  const floored = /^max\((-?\d*\.?\d+)px, calc\((-?\d*\.?\d+)px \* var\(--density, 1\)\)\)$/.exec(value);
  if (floored) return Math.max(Number(floored[1]), Number(floored[2]) * density);
  const plain = /^(-?\d*\.?\d+)px$/.exec(value);
  if (plain) return Number(plain[1]);
  throw new Error(`"${value}" is not a length this test knows how to resolve`);
}

describe('the emitted units', () => {
  test('a font size is rem in the stylesheet and px in the typed export', () => {
    // rem so a reader's own browser setting still moves the page; px in the
    // export so a layout can do arithmetic with it.
    for (const [step, px] of Object.entries(font.size)) {
      const value = tokens.get(`--font-size-${step}`);
      assert.match(px, /^\d+px$/, `font.size.${step} is authored in px`);
      assert.equal(value, `${Number((parseInt(px, 10) / 16).toFixed(6))}rem`, `--font-size-${step}`);
    }
    assert.equal(tokens.get('--font-size-2xs'), '0.6875rem');
    assert.equal(tokens.get('--font-size-compact'), '0.8125rem');
  });

  test('a size token is px, not rem', () => {
    // Style Dictionary's css transform group carries a size/rem transform that
    // keys on a token's type. Nothing in this package declares one, so it does
    // not fire, and a bump that changed that would silently turn every control
    // height into rem.
    assert.match(tokens.get('--size-shell-rail'), /px$/);
    assert.equal(size.control.md, '32px');
    assert.equal(spacing['4'], '16px');
  });

  test('every spacing step but zero is density-scaled', () => {
    assert.equal(tokens.get('--spacing-0'), '0px');
    for (const step of Object.keys(spacing)) {
      if (step === '0') continue;
      assert.equal(tokens.get(`--spacing-${step}`), `calc(${spacing[step]} * var(--density, 1))`);
    }
  });

  test('a small control or row cannot shrink under 24px at any density', () => {
    // 28 x 0.82 is 22.96px. The floor is what makes the compact setting safe
    // for a finger, and it is checked at the three densities the density
    // stylesheet can actually set.
    const densities = { compact: 0.82, normal: 1, comfortable: 1.14 };
    const declared = root(read('density.css'));
    for (const [name, value] of Object.entries(densities)) {
      const selector = name === 'normal' ? declared.get('--density') : null;
      if (selector !== null) assert.equal(Number(selector), value);
    }
    for (const token of ['--size-control-sm', '--size-row-sm']) {
      for (const [name, density] of Object.entries(densities)) {
        const resolved = resolvePx(tokens.get(token), density);
        assert.ok(resolved >= 24, `${token} resolves to ${resolved}px at ${name} density`);
      }
    }
    // And the floor is not simply a bigger number everywhere: at comfortable
    // density the step grows past it.
    assert.equal(resolvePx(tokens.get('--size-control-sm'), 1.14), 31.919999999999998);
  });

  test('the density stylesheet declares the three steps the tokens name', () => {
    const density = read('density.css');
    assert.match(density, /:root\s*\{\s*--density: 1;/);
    assert.match(density, /:root\[data-density="compact"\]\s*\{\s*--density: 0\.82;/);
    assert.match(density, /:root\[data-density="comfortable"\]\s*\{\s*--density: 1\.14;/);
  });
});

describe('the breakpoint partial', () => {
  test('it carries the same values as the token layer and the typed export', () => {
    // A media query cannot read a custom property, so a stylesheet spells the
    // number. Three places record it and all three have to agree, or a lint
    // that compares a query against the export is comparing against a number
    // nobody paints.
    const partial = root(read('breakpoint.css'));
    for (const [name, value] of Object.entries(breakpoint)) {
      assert.equal(partial.get(`--breakpoint-${name}`), value, `--breakpoint-${name} in breakpoint.css`);
      assert.equal(tokens.get(`--breakpoint-${name}`), value, `--breakpoint-${name} in tokens.css`);
    }
    assert.equal(breakpoint.shell, '900px');
  });
});

describe('the derived tints', () => {
  test('every soft and line step is its own fill at the declared alpha', () => {
    // The tint is derived at build time so it follows the fill. This checks
    // that it still does, in every state, which a hand-edited value would not.
    for (const [state, values] of Object.entries(paletteStates({ tokens: tokensCss, themes: themesCss }))) {
      for (const family of ['success', 'warning', 'danger', 'info']) {
        const fill = values.get(`--color-feedback-${family}`);
        assert.equal(values.get(`--color-feedback-${family}-soft`), withAlpha(fill, SOFT_ALPHA), `${state} ${family} soft`);
        assert.equal(values.get(`--color-feedback-${family}-line`), withAlpha(fill, 0.3), `${state} ${family} line`);
      }
      for (const family of ['onboarding', 'execute', 'review']) {
        const fill = values.get(`--color-phase-${family}`);
        assert.equal(values.get(`--color-phase-${family}-soft`), withAlpha(fill, SOFT_ALPHA), `${state} ${family} soft`);
      }
    }
  });
});

describe('the document baseline', () => {
  const base = read('base.css');

  test('it is the stylesheet in stylesheets/, copied', () => {
    assert.equal(base, readFileSync(fileURLToPath(new URL('../stylesheets/base.css', import.meta.url)), 'utf8'));
  });

  test('every colour in it comes from a token', () => {
    // The baseline is the one stylesheet in this package written by hand, so
    // it is the one that can carry a literal.
    const declarations = base.replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...declarations.matchAll(/(?:#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\))/gi)].map((m) => m[0]);
    assert.deepEqual(literals, []);
  });

  test('its focus indicator is an outline', () => {
    // Forced-colors mode drops every box-shadow and keeps outlines, so a ring
    // drawn as a shadow alone disappears for exactly the readers who need one.
    assert.match(base, /:focus-visible\s*\{[^}]*outline: 2px solid var\(--color-focus\)/);
    assert.doesNotMatch(base, /:focus-visible\s*\{[^}]*outline:\s*none/);
  });

  test('it honours a reduced-motion preference', () => {
    assert.match(base, /@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('the typed themes', () => {
  /**
   * The two palettes are also a JavaScript object, for the code that cannot
   * read a custom property: the tool chrome around a preview, a chart library
   * that wants a series colour as a string, a canvas painting its own pixels.
   * Two spellings of one palette is exactly the arrangement that drifts, so
   * every value is compared against the stylesheet that ships.
   *
   * Storybook's chrome is why the export exists and why this test does. It
   * listed eleven hexes per theme with a comment naming the token each came
   * from, and four of them were the values the palette had been moved away
   * from: the muted text was the step measured at 4.17:1 on a pressed row, and
   * the border was the plain step wearing the strong step's name.
   */
  const kebab = (path) => path.map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-');

  function flatten(tree, path = []) {
    const out = [];
    for (const [key, value] of Object.entries(tree)) {
      if (value !== null && typeof value === 'object') out.push(...flatten(value, [...path, key]));
      else out.push([`--${kebab([...path, key])}`, value]);
    }
    return out;
  }

  const blocks = {
    light: cascade(source(themesCss), (block) => block.atRule === null && block.selector === ':root'),
    dark: cascade(source(themesCss), (block) => block.atRule === null && block.selector === ':root[data-theme="dark"]'),
  };

  for (const name of ['light', 'dark']) {
    test(`every ${name} value is the one themes.css declares`, () => {
      const declared = blocks[name];
      const drift = flatten(themes[name])
        .filter(([variable, value]) => declared.get(variable) !== value)
        .map(([variable, value]) => `${variable}: ${value} in the export, ${declared.get(variable)} in themes.css`);
      assert.deepEqual(drift, []);
    });

    test(`the ${name} export covers every slot the stylesheet declares`, () => {
      // The other direction, because a slot the export simply lacks would pass
      // the comparison above by never being compared.
      const exported = new Set(flatten(themes[name]).map(([variable]) => variable));
      const missing = [...blocks[name].keys()].filter((variable) => variable !== '--color-scheme' && !exported.has(variable));
      assert.deepEqual(missing, []);
    });
  }
});

describe('the parsers these tests rely on', () => {
  test('they read a value rather than answering null for everything', () => {
    assert.deepEqual(parseHex('#5469d4'), { r: 84, g: 105, b: 212 });
    assert.deepEqual(parseRgba('rgba(84, 105, 212, 0.14)'), { rgb: { r: 84, g: 105, b: 212 }, a: 0.14 });
    assert.equal(parseHex('not a colour'), null);
    assert.ok(tokens.size > 100, `tokens.css resolved only ${tokens.size} declarations`);
  });
});
