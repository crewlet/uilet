// The brand mapping's one source (stylesheets/brand.css) and the two
// stylesheets built from it: css/brand.css, the root layer the artifact kit
// bundles, and css/brand-scope.css, the same mapping moved onto a scope of its
// own. Held to declaring one mapping, to the shape the build accepts, and to
// capturing every public token the mapping falls back to.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseBlocks } from './color.mjs';
import {
  BRAND_SCOPE_CLASS,
  BRAND_SCOPE_LAYER_CLASS,
  BRAND_THEME_PREFIX,
  brandScopeCss,
  brandSlots,
  brandThemeName,
  parseBrandLayer,
} from '../dist/index.js';

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const source = read('../stylesheets/brand.css');
const rootLayer = read('../dist/css/brand.css');
const scope = read('../dist/css/brand-scope.css');
const themes = read('../dist/css/themes.css');

const LAYER = `.${BRAND_SCOPE_LAYER_CLASS}`;
const SCOPE = `.${BRAND_SCOPE_CLASS}`;

/** The declarations every block whose selector is `selector` makes, in order, merged. */
function declared(css, selector, atRule = null) {
  const merged = new Map();
  for (const block of parseBlocks(css)) {
    if (block.selector === selector && block.atRule === atRule) for (const [name, value] of block.declarations) merged.set(name, value);
  }
  return merged;
}

/** A Map with every value's white space collapsed, the form the generator writes. */
const collapsed = (map) => new Map([...map].map(([name, value]) => [name, value.replace(/\s+/g, ' ').trim()]));

describe('the root layer', () => {
  test('is the source as written', () => {
    assert.equal(rootLayer, source);
  });

  test('declares the public tokens the artifact kit moves aside, and only custom properties', () => {
    assert.deepEqual(brandSlots(source), [
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
    assert.equal(brandThemeName('--color-brand-accent'), `${BRAND_THEME_PREFIX}color-brand-accent`);
  });

  test('every public token falls back to its theme value, and every mode names the same steps', () => {
    const { dark, light } = parseBrandLayer(source);
    for (const slot of brandSlots(source)) assert.ok(dark.get(slot)?.includes(`var(${brandThemeName(slot)})`), slot);
    for (const step of light.keys()) assert.ok(dark.has(step), step);
    assert.equal(dark.get('--crewlet-brand-text'), 'initial');
  });
});

describe('the build accepts the mapping in its shape and nothing else', () => {
  /** A mapping in the source's shape: the bare root's block, and the light block twice. */
  const layer = ({ dark = '--crewlet-brand-accent: var(--brand-primary);', light = '--crewlet-brand-accent: var(--brand-primary);', attribute = light } = {}) =>
    `:root { ${dark} } @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { ${light} } } :root[data-theme="light"] { ${attribute} }`;

  test('reads the three blocks', () => {
    const { dark, light } = parseBrandLayer(layer({ dark: '--crewlet-brand-accent: var(--brand-primary); --color-brand-accent: var(--crewlet-brand-accent, var(--crewlet-theme-color-brand-accent));' }));
    assert.deepEqual([...light.keys()], ['--crewlet-brand-accent']);
    assert.equal(dark.size, 2);
  });

  test('refuses a rule under another selector, which would reach one built stylesheet and not the other', () => {
    assert.throws(() => parseBrandLayer(`${layer()} .card { --crewlet-brand-accent: var(--brand-primary); }`), /may declare under/);
    assert.throws(() => parseBrandLayer(layer().replace(':root[data-theme="light"]', 'html[data-theme="light"]')), /may declare under/);
  });

  test('refuses two light blocks that differ, a light step the root lacks, an input, a file and a property', () => {
    assert.throws(() => parseBrandLayer(layer({ attribute: '--crewlet-brand-accent: var(--brand-secondary);' })), /two light blocks differ/);
    assert.throws(() => parseBrandLayer(layer({ light: '--crewlet-brand-accent: var(--brand-primary); --crewlet-brand-extra: 1;' })), /bare root does not/);
    assert.throws(() => parseBrandLayer(layer({ dark: '--brand-primary: #000000;', light: '', attribute: '' })), /declares the input/);
    assert.throws(() => parseBrandLayer(layer({ dark: '--crewlet-brand-logo: url(x.svg);', light: '', attribute: '' })), /names a file/);
    assert.throws(() => parseBrandLayer(layer({ dark: 'color: red;', light: '', attribute: '' })), /custom properties only/);
  });
});

describe('the scope', () => {
  const { dark, light } = parseBrandLayer(source);

  test('is the generator\'s own output over the source', () => {
    const values = (block) => new Map([...declared(themes, block.selector, block.atRule)]);
    const lightValues = values({ selector: ':root[data-theme="light"]', atRule: null });
    const darkValues = values({ selector: ':root', atRule: null });
    // The pinned modes are the default theme's values, as themes.css paints them.
    assert.equal(brandScopeCss(source, { light: lightValues, dark: darkValues }), scope);
  });

  test('captures the page\'s value of every public token one element above the mapping', () => {
    const capture = declared(scope, SCOPE);
    assert.deepEqual([...capture.keys()], brandSlots(source).map(brandThemeName));
    for (const slot of brandSlots(source)) assert.equal(capture.get(brandThemeName(slot)), `var(${slot})`);
  });

  test('declares the mapping on its layer exactly as the root layer does, in each mode', () => {
    assert.deepEqual(declared(scope, LAYER), collapsed(dark));
    assert.deepEqual(declared(scope, `:root:not([data-theme="dark"]) ${LAYER}`, '@media (prefers-color-scheme: light)'), collapsed(light));
    assert.deepEqual(declared(scope, `:root[data-theme="light"] ${LAYER}`), collapsed(light));
  });

  test('a pinned mode takes that mode\'s steps whatever the page is in, and the default theme\'s whole palette for it', () => {
    const slots = new Set(brandSlots(source));
    for (const [mode, steps, themeBlock] of [
      ['light', collapsed(light), ':root[data-theme="light"]'],
      ['dark', new Map([...collapsed(dark)].filter(([name]) => light.has(name))), ':root'],
    ]) {
      const onLayer = declared(scope, `${SCOPE}[data-mode="${mode}"] > ${LAYER}`);
      for (const [name, value] of steps) assert.equal(onLayer.get(name), value, `${mode}: ${name}`);
      // Every other token of the mode is declared on the layer, and a token the
      // mapping drives never is: it is captured, so the mapping falls back to it.
      for (const [name, value] of declared(themes, themeBlock)) {
        if (slots.has(name)) assert.equal(onLayer.has(name), false, `${mode}: ${name} is the mapping's`);
        else assert.equal(onLayer.get(name), value, `${mode}: ${name}`);
      }
    }
    const pinnedLight = declared(scope, `${SCOPE}[data-mode="light"]`);
    const themeLight = declared(themes, ':root[data-theme="light"]');
    assert.ok(pinnedLight.size > 0);
    for (const [name, value] of pinnedLight) {
      assert.ok(name.startsWith(BRAND_THEME_PREFIX), name);
      assert.equal(value, themeLight.get(`--${name.slice(BRAND_THEME_PREFIX.length)}`), name);
    }
    assert.equal(declared(scope, `${SCOPE}[data-mode="dark"]`).get(brandThemeName('--color-surface-background')), declared(themes, ':root').get('--color-surface-background'));
  });

  test('a pinned dark scope comes after every light block, so it wins their ties', () => {
    const pinned = scope.indexOf(`${SCOPE}[data-mode="dark"] > ${LAYER}`);
    assert.ok(pinned > scope.indexOf(`:root[data-theme="light"] ${LAYER}`));
    assert.ok(pinned > scope.indexOf('@media (prefers-color-scheme: light)'));
  });
});
