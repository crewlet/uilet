// The brand layer (src/brand.css), held to its two promises: with no
// `--brand-*` input set, every token it declares is exactly the theme's own
// value, in every state of every theme; and with inputs set, one input
// restyles its whole family in both modes, and the logo draws from the
// brand's own files or not at all.
//
// The cascade is the palette suite's own (`paletteStates`), over the token
// stylesheets with their brand-driven declarations moved aside exactly as the
// build moves them, followed by the layer. Custom properties are then
// resolved the way a browser resolves them on the root element: a var() with
// no value and no fallback makes the whole declaration invalid, which is what
// lets a derived step fall back to the theme's value when its input is unset.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_THEME_ID, themeRegistry } from '@crewlethq/tokens';
import { paletteStates, parseBlocks } from '@crewlethq/tokens/test/palette';
import { THEME_PREFIX, brandSlots, moveThemeValues, renameSlots, themeName } from '../scripts/brand.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokenSheet = (specifier) => readFileSync(fileURLToPath(import.meta.resolve(specifier)), 'utf8');
const brandCss = readFileSync(join(root, 'src', 'brand.css'), 'utf8');
const kitCss = readFileSync(join(root, 'dist', 'kit.css'), 'utf8');
const SLOTS = brandSlots(brandCss);
const LIGHT_STATES = ['light (media query)', 'light (attribute)'];

const tokensCss = tokenSheet('@crewlethq/tokens/css');
const themesCss = `${tokenSheet('@crewlethq/tokens/css/themes')}\n${tokenSheet('@crewlethq/tokens/css/themes/all')}`;

/**
 * The theme's own states, and the same states as the kit paints them: tokens
 * moved aside, then the layer, then the inputs. The kit always carries the
 * theme layer, so its states are the three a theme paints, never the token
 * layer's marketing root alone.
 */
function statesOf(palette, inputs = '') {
  const id = palette === DEFAULT_THEME_ID ? null : palette;
  const theme = paletteStates({ tokens: tokensCss, themes: themesCss, palette: id });
  const { base: _base, ...kit } = paletteStates({
    // Every slot has its base value in the token layer; the theme layer
    // declares the ones a theme repaints.
    tokens: moveThemeValues(tokensCss, SLOTS),
    themes: `${renameSlots(themesCss, SLOTS).css}\n${brandCss}\n${inputs}`,
    palette: id,
  });
  assert.deepEqual(Object.keys(kit), ['dark', ...LIGHT_STATES]);
  return { theme, kit };
}

/** The text between a var( and its closing parenthesis, split at its first top-level comma. */
function splitVar(text, open) {
  let depth = 0;
  let comma = -1;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        const body = text.slice(open + 1, i);
        const at = comma === -1 ? -1 : comma - open - 1;
        return {
          end: i + 1,
          name: (at === -1 ? body : body.slice(0, at)).trim(),
          fallback: at === -1 ? null : body.slice(at + 1).trim(),
        };
      }
    } else if (ch === ',' && depth === 1 && comma === -1) comma = i;
  }
  throw new Error(`unbalanced var() in ${text}`);
}

/**
 * A custom property's value on the element whose declarations `values` are,
 * with every var() substituted, or null where it is invalid at computed-value
 * time (a var() with no value and no fallback, or a cycle).
 */
function resolveValue(values, text, seen = new Set()) {
  let out = '';
  let index = 0;
  for (;;) {
    const at = text.indexOf('var(', index);
    if (at === -1) return out + text.slice(index);
    out += text.slice(index, at);
    const { end, name, fallback } = splitVar(text, at + 3);
    let substituted = null;
    if (values.has(name) && !seen.has(name)) substituted = resolveValue(values, values.get(name), new Set([...seen, name]));
    if (substituted === null && fallback !== null) substituted = resolveValue(values, fallback, seen);
    if (substituted === null) return null;
    out += substituted;
    index = end;
  }
}

const valueOf = (values, name) => (values.has(name) ? resolveValue(values, values.get(name), new Set([name])) : null);

describe('the slots', () => {
  test('are the public tokens the layer declares, and every one is moved aside in the built kit', () => {
    assert.deepEqual(SLOTS, [
      '--color-border-selected',
      '--color-brand-accent',
      '--color-brand-accent-active',
      '--color-brand-accent-deep',
      '--color-brand-accent-hover',
      '--color-brand-accent-ink',
      '--color-brand-accent-soft',
      '--color-brand-accent-soft-strong',
      '--color-brand-gradient',
      '--color-brand-highlight',
      '--color-brand-mark',
      '--color-surface-background',
      '--color-surface-frame',
      '--color-text-link-quiet',
      '--color-text-on-accent',
      '--color-text-primary',
      '--font-family-display',
      '--font-family-sans',
      '--shadow-glow',
    ]);
    for (const slot of SLOTS) {
      // Declared once in the whole stylesheet: by the layer, on the bare root.
      const declared = [...kitCss.matchAll(new RegExp(`[{;]${slot}:`, 'g'))];
      assert.equal(declared.length, 1, `${slot} is declared ${declared.length} times`);
      assert.ok(kitCss.includes(`${themeName(slot)}:`), `${themeName(slot)} is declared by the token stylesheets`);
    }
  });

  test('the inputs are read and never declared: a page or the engine sets them', () => {
    const declared = [...brandCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[{;\s])(--brand-[a-z0-9-]+)\s*:/g)].map((match) => match[1]);
    assert.deepEqual(declared, []);
    assert.doesNotMatch(brandCss.replace(/\/\*[\s\S]*?\*\//g, ''), /url\(/, 'the layer names no file: every logo is an input');
  });

  test('moving a theme value renames declarations only, and refuses a slot the stylesheet never declares', () => {
    const css = ':root{--color-brand-accent:#7c56ff;--shadow-selection:inset 0 0 0 2px var(--color-brand-accent)}';
    assert.equal(
      moveThemeValues(css, ['--color-brand-accent']),
      `:root{${THEME_PREFIX}color-brand-accent:#7c56ff;--shadow-selection:inset 0 0 0 2px var(--color-brand-accent)}`,
    );
    // A longer name that starts with a slot's is a different token.
    assert.equal(moveThemeValues(':root{--color-brand-accent-hover:#000;--color-brand-accent:#111}', ['--color-brand-accent']), `:root{--color-brand-accent-hover:#000;${THEME_PREFIX}color-brand-accent:#111}`);
    assert.throws(() => moveThemeValues(':root{--color-text-primary:#000}', ['--color-brand-accent']), /--color-brand-accent/);
  });
});

describe('with no brand input', () => {
  test('every slot is the theme\'s own value, in every state of every theme', () => {
    for (const { id } of themeRegistry) {
      const { theme, kit } = statesOf(id);
      for (const [state, values] of Object.entries(kit)) {
        for (const slot of SLOTS) {
          const expected = valueOf(theme[state], slot);
          assert.notEqual(expected, null, `${id} ${state}: the theme resolves ${slot}`);
          assert.equal(valueOf(values, slot), expected, `${id} ${state}: ${slot}`);
        }
      }
    }
  });
});

describe('with a brand', () => {
  const BRAND = ':root { --brand-primary: #0a7f5a; --brand-secondary: #f2a33a; --brand-text: #1d2b24; --brand-light-ground: #f7f4ec; --brand-dark-ground: #0b1410; --brand-font-heading: "Acme Display", serif; --brand-font-body: "Acme Text", sans-serif; }';

  test('one input restyles the accent family in both modes, under every theme', () => {
    for (const { id } of themeRegistry) {
      const { kit } = statesOf(id, BRAND);
      for (const [state, values] of Object.entries(kit)) {
        const light = LIGHT_STATES.includes(state);
        assert.equal(valueOf(values, '--color-brand-accent'), '#0a7f5a', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-accent-hover'), 'color-mix(in oklab, #0a7f5a 90%, black)', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-accent-active'), 'color-mix(in oklab, #0a7f5a 80%, black)', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-accent-deep'), 'color-mix(in oklab, #0a7f5a 70%, black)', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-accent-soft-strong'), 'color-mix(in srgb, #0a7f5a 32%, transparent)', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-border-selected'), 'color-mix(in srgb, #0a7f5a 60%, transparent)', `${id} ${state}`);
        assert.equal(valueOf(values, '--shadow-glow'), '0 4px 24px color-mix(in srgb, #0a7f5a 30%, transparent)', `${id} ${state}`);
        // The ink is the accent as text: lighter on the dark ground, darker on the light one.
        assert.equal(
          valueOf(values, '--color-brand-accent-ink'),
          light ? 'color-mix(in oklab, #0a7f5a 70%, black)' : 'color-mix(in oklab, #0a7f5a 55%, white)',
          `${id} ${state}`,
        );
        assert.equal(
          valueOf(values, '--color-brand-accent-soft'),
          light ? 'color-mix(in srgb, #0a7f5a 12.5%, transparent)' : 'color-mix(in srgb, #0a7f5a 16%, transparent)',
          `${id} ${state}`,
        );
        assert.match(valueOf(values, '--color-text-on-accent'), /^color\(\s*from #0a7f5a srgb-linear /, `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-mark'), '#0a7f5a', `${id} ${state}`);
        assert.equal(valueOf(values, '--color-brand-highlight'), '#f2a33a', `${id} ${state}`);
        assert.match(valueOf(values, '--color-brand-gradient'), /#0a7f5a 0%,\s*#f2a33a 100%/, `${id} ${state}`);
      }
    }
  });

  test('the grounds, the text and the faces follow their own inputs, each in its own mode', () => {
    const { theme, kit } = statesOf(DEFAULT_THEME_ID, BRAND);
    for (const [state, values] of Object.entries(kit)) {
      const light = LIGHT_STATES.includes(state);
      for (const ground of ['--color-surface-frame', '--color-surface-background']) {
        assert.equal(valueOf(values, ground), light ? '#f7f4ec' : '#0b1410', `${state} ${ground}`);
      }
      // The brand's text is written for its light ground; on the dark one the theme's text stays.
      assert.equal(valueOf(values, '--color-text-primary'), light ? '#1d2b24' : valueOf(theme[state], '--color-text-primary'), state);
      assert.equal(valueOf(values, '--font-family-sans'), '"Acme Text", sans-serif', state);
      assert.equal(valueOf(values, '--font-family-display'), '"Acme Display", serif', state);
    }
  });

  test('a brand with a colour for dark grounds draws its accent family from it in dark mode only', () => {
    const { kit } = statesOf(DEFAULT_THEME_ID, ':root { --brand-primary: #0a7f5a; --brand-primary-on-dark: #3fd69a; }');
    assert.equal(valueOf(kit.dark, '--color-brand-accent'), '#3fd69a');
    assert.equal(valueOf(kit.dark, '--color-brand-accent-hover'), 'color-mix(in oklab, #3fd69a 90%, black)');
    for (const state of LIGHT_STATES) assert.equal(valueOf(kit[state], '--color-brand-accent'), '#0a7f5a', state);
    // The mark is the logo's colour, the same in every mode.
    assert.equal(valueOf(kit.dark, '--color-brand-mark'), '#0a7f5a');
  });

  test('an input left out keeps its slot on the theme: a body face alone also sets the headings, and no colour moves', () => {
    const { theme, kit } = statesOf(DEFAULT_THEME_ID, ':root { --brand-font-body: "Acme Text", sans-serif; }');
    for (const [state, values] of Object.entries(kit)) {
      // The theme's display face is an alias of its sans face, so it follows the brand's body face.
      assert.equal(valueOf(values, '--font-family-display'), '"Acme Text", sans-serif', state);
      for (const slot of SLOTS.filter((name) => name.startsWith('--color-') || name.startsWith('--shadow-'))) {
        assert.equal(valueOf(values, slot), valueOf(theme[state], slot), `${state} ${slot}`);
      }
    }
  });
});

/**
 * Every rule of a stylesheet as { selector, declarations }, with ALL of its
 * declarations (parseBlocks keeps only custom properties, and a logo's size
 * is a block-size and an inline-size).
 */
function rulesOf(css) {
  const rules = [];
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = new Map();
    for (const line of match[2].split(';')) {
      const colon = line.indexOf(':');
      if (colon > 0) declarations.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
    }
    rules.push({ selector: match[1].trim(), declarations });
  }
  return rules;
}

describe('the logo', () => {
  const blocks = rulesOf(brandCss).filter((block) => block.selector.includes('.crewlet-logo'));
  /** The declarations that reach a logo of one variant in one mode, in cascade order. */
  function logo({ variant = null, mode = 'dark', size = null } = {}) {
    const ruleApplies = (selector) => {
      if (selector === '.crewlet-logo') return true;
      if (/:where\(:root(:not\(\[data-theme="dark"\]\)|\[data-theme="light"\])\) \.crewlet-logo$/.test(selector)) return mode === 'light';
      const variantMatch = /^\.crewlet-logo\[data-variant="(.+)"\]$/.exec(selector.replace(/'/g, '"'));
      if (variantMatch) return variantMatch[1] === variant;
      const sizeMatch = /^\.crewlet-logo\[data-size="(.+)"\]$/.exec(selector.replace(/'/g, '"'));
      if (sizeMatch) return sizeMatch[1] === size;
      throw new Error(`a logo rule this suite does not model: ${selector}`);
    };
    // Specificity: the variant and size rules weigh more than the base and the light rules, which weigh the same.
    const weight = (selector) => (/\[data-(variant|size)=/.test(selector) ? 1 : 0);
    const applied = blocks.filter((block) => ruleApplies(block.selector)).sort((a, b) => weight(a.selector) - weight(b.selector));
    const declarations = new Map();
    for (const block of applied) for (const [name, value] of block.declarations) declarations.set(name, value);
    return declarations;
  }
  const LOGOS = ':root { --brand-logo-primary: url(/_crewlet/brand/1.svg); --brand-logo-primary-ratio: 3.2; --brand-logo-on-dark: url(/_crewlet/brand/2.svg); --brand-logo-on-dark-ratio: 3; --brand-logo-mark: url(/_crewlet/brand/3.svg); --brand-logo-mark-ratio: 1; }';
  const inputs = (css) => new Map([...parseBlocks(css)].flatMap((block) => [...block.declarations]));
  const drawn = (element, given) => {
    const values = new Map([...given, ...element]);
    return {
      src: valueOf(values, '--crewlet-logo-src'),
      width: resolveValue(values, element.get('inline-size')),
      height: resolveValue(values, element.get('block-size')),
    };
  };

  test('is a crewlet- class, so the content stylesheet leaves it to the kit', () => {
    const content = readFileSync(join(root, 'src', 'content.css'), 'utf8');
    assert.match(content, /\[class\^='crewlet-'\]/);
    assert.ok(kitCss.includes('.crewlet-logo{'), 'the built kit carries the class');
  });

  test('draws the primary logo on a light ground and the on-dark logo in dark mode, at the logo\'s own ratio', () => {
    const given = inputs(LOGOS);
    assert.deepEqual(drawn(logo({ mode: 'light' }), given), { src: 'url(/_crewlet/brand/1.svg)', width: 'calc(2rem * 3.2)', height: 'calc(2rem + 0px * 3.2)' });
    assert.deepEqual(drawn(logo({ mode: 'dark' }), given), { src: 'url(/_crewlet/brand/2.svg)', width: 'calc(2rem * 3)', height: 'calc(2rem + 0px * 3)' });
    assert.deepEqual(drawn(logo({ variant: 'primary', mode: 'dark' }), given).src, 'url(/_crewlet/brand/2.svg)');
  });

  test('keeps the primary logo in dark mode for a brand with no on-dark logo', () => {
    const given = inputs(':root { --brand-logo-primary: url(/_crewlet/brand/1.svg); --brand-logo-primary-ratio: 3.2; }');
    assert.deepEqual(drawn(logo({ mode: 'dark' }), given), { src: 'url(/_crewlet/brand/1.svg)', width: 'calc(2rem * 3.2)', height: 'calc(2rem + 0px * 3.2)' });
  });

  test('draws the variant it names, whatever the mode, and a size step', () => {
    const given = inputs(LOGOS);
    for (const mode of ['dark', 'light']) {
      assert.equal(drawn(logo({ variant: 'on-dark', mode }), given).src, 'url(/_crewlet/brand/2.svg)', mode);
      assert.deepEqual(drawn(logo({ variant: 'mark', mode, size: 'lg' }), given), { src: 'url(/_crewlet/brand/3.svg)', width: 'calc(3rem * 1)', height: 'calc(3rem + 0px * 1)' }, mode);
    }
  });

  test('draws nothing and takes no room where the brand has no logo for it', () => {
    // Every length is computed through the ratio, which is unset with the
    // logo, so the box's size is invalid and falls to auto: an empty box.
    for (const mode of ['dark', 'light']) {
      assert.deepEqual(drawn(logo({ mode }), new Map()), { src: null, width: null, height: null }, mode);
      assert.deepEqual(drawn(logo({ variant: 'mark', mode }), inputs(':root { --brand-logo-primary: url(/_crewlet/brand/1.svg); --brand-logo-primary-ratio: 3.2; }')), { src: null, width: null, height: null }, mode);
    }
  });
});
