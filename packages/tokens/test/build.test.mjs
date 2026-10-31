/**
 * What the build promises about the shape of what it emits.
 *
 * These are the claims the palette suite cannot make, because they are about
 * units, arithmetic and provenance rather than about colour: a font size is a
 * number of pixels in the typed export and a number of rem in the stylesheet,
 * a density-scaled token carries its calc(), a small target cannot shrink
 * under the size a finger can hit, a soft tint still belongs to the fill it
 * was derived from, and the font files the package ships are the ones its
 * family stacks name. What those files are is test/fonts.test.mjs's subject.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { atLightness, cascade, flatten, fromOklab, hex, oklabHex, parseBlocks, parseHex, parseRgba, toOklab, withAlpha } from './color.mjs';
import * as palette from './palette.mjs';
import { ARTIFACT_KINDS, ARTIFACT_KIND_FILL_ALPHA, SOFT_ALPHA, paletteSelectors, paletteStates } from './palette.mjs';
import * as exported from '../dist/index.js';
import { DEFAULT_THEME_ID, breakpoint, font, isThemeId, size, spacing, themeGroups, themeRegistry, themes } from '../dist/index.js';

const read = (name) => readFileSync(fileURLToPath(new URL(`../dist/css/${name}`, import.meta.url)), 'utf8');
const tokensCss = read('tokens.css');
const themesCss = read('themes.css');
const source = (css) => [{ name: 'css', css }];
const root = (css) => cascade(source(css), (block) => block.atRule === null && block.selector === ':root');
const tokens = root(tokensCss);

/** The sheets that paint one theme: the default palettes, and a named theme's own over them. */
const sourcesOf = (id) =>
  id === DEFAULT_THEME_ID
    ? { tokens: tokensCss, themes: themesCss }
    : { tokens: tokensCss, themes: `${themesCss}\n${read(`themes/${id}.css`)}`, palette: id };

/** Every state of every theme the registry lists, as [label, values]. */
const everyState = () =>
  themeRegistry.flatMap((theme) => Object.entries(paletteStates(sourcesOf(theme.id))).map(([state, values]) => [`${theme.id} ${state}`, values]));

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
    assert.equal(size.control.md, '30px');
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
    // 26 x 0.82 is 21.32px for a control, and 28 x 0.82 is 22.96px for a
    // row. The floor is what makes the compact setting safe
    // for a finger, and it is checked at the three densities the density
    // stylesheet can actually set.
    const densities = { compact: 0.82, normal: 1, comfortable: 1.16 };
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
    assert.equal(resolvePx(tokens.get('--size-control-sm'), 1.16), 30.159999999999997);
  });

  test('the density stylesheet declares the three steps the tokens name', () => {
    const density = read('density.css');
    assert.match(density, /:root\s*\{\s*--density: 1;/);
    assert.match(density, /:root\[data-density="compact"\]\s*\{\s*--density: 0\.82;/);
    assert.match(density, /:root\[data-density="comfortable"\]\s*\{\s*--density: 1\.16;/);
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
    assert.equal(breakpoint.shell, '1024px');
    assert.equal(breakpoint.phone, '640px');
  });
});

describe('the display, body, sheet, shell, breakpoint and breath tokens', () => {
  /**
   * The type a TypeScript consumer sees, read out of the generated
   * declaration file: every leaf as its dotted path and its literal type.
   * The export is `as const`, so a token is typed as its own value; a leaf
   * that arrived as `string` (a build that lost the assertion) or not at all
   * is missing here, and the consumer that spells it gets no check.
   */
  function declaredLiterals(declarations) {
    const found = new Map();
    const path = [];
    for (const raw of declarations.split('\n')) {
      const line = raw.trim();
      const group = /^export declare const (\w+): \{$/.exec(line);
      if (group) {
        path.splice(0, path.length, group[1]);
        continue;
      }
      const branch = /^readonly ("?)([\w-]+)\1: \{$/.exec(line);
      if (branch) {
        path.push(branch[2]);
        continue;
      }
      const leaf = /^readonly ("?)([\w-]+)\1: ("(?:[^"\\]|\\.)*");$/.exec(line);
      if (leaf) {
        found.set([...path, leaf[2]].join('.'), JSON.parse(leaf[3]));
        continue;
      }
      if (line === '};') path.pop();
    }
    return found;
  }

  const declarations = readFileSync(fileURLToPath(new URL('../dist/index.d.ts', import.meta.url)), 'utf8');
  const typed = declaredLiterals(declarations);

  // Each one: its path in the typed export, the value authored, and what the
  // stylesheet carries for it. A font size is emitted in rem and a gap in
  // its density calc(); everything else as authored.
  const added = [
    ['font.size.display', '28px', '1.75rem'],
    ['font.lineHeight.body', '1.45', '1.45'],
    ['radius.sheet', '14px', '14px'],
    ['size.shell.rail', '236px', '236px'],
    ['size.shell.topbar', '52px', '52px'],
    ['size.shell.inset', '8px', 'calc(8px * var(--density, 1))'],
    ['size.nav.row', '30px', 'calc(30px * var(--density, 1))'],
    ['breakpoint.shell', '1024px', '1024px'],
    ['breakpoint.phone', '640px', '640px'],
    ['motion.duration.breath', '2200ms', '2200ms'],
    ['motion.duration.turn', '1000ms', '1000ms'],
    ['motion.duration.sweep', '1500ms', '1500ms'],
    ['motion.duration.spark', '1600ms', '1600ms'],
  ];
  const property = (path) => `--${path.split('.').map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-')}`;

  test('the declaration reader finds every leaf the export has', () => {
    // Without this, a reader that matched nothing would make every case
    // below fail for the wrong reason, and one that matched too little would
    // make the next token added look untyped.
    const leaves = (tree) =>
      Object.values(tree).reduce((count, value) => count + (value !== null && typeof value === 'object' ? leaves(value) : 1), 0);
    // The palettes and the theme registry are re-exported from themes.js, the
    // colour maths from color.js and the brand mapping's contract from
    // brand.js, rather than declared in index.d.ts, so the reader does not see
    // them.
    const reExported = new Set([
      'themes',
      'themeGroups',
      'themeRegistry',
      'DEFAULT_THEME_ID',
      'isThemeId',
      'WCAG_CONTRAST',
      'contrast',
      'luminance',
      'nearestContrastShade',
      'parseHex',
      'BRAND_SCOPE_CLASS',
      'BRAND_SCOPE_LAYER_CLASS',
      'BRAND_THEME_PREFIX',
      'brandScopeCss',
      'brandSlots',
      'brandThemeName',
      'parseBrandLayer',
    ]);
    const expected = Object.entries(exported)
      .filter(([name]) => !reExported.has(name))
      .reduce((count, [, tree]) => count + leaves(tree), 0);
    assert.equal(typed.size, expected);
  });

  for (const [path, authored, emitted] of added) {
    test(`${path} is emitted, exported and typed`, () => {
      const value = path.split('.').reduce((node, key) => node?.[key], exported);
      assert.equal(value, authored, `${path} in the typed export`);
      assert.equal(typed.get(path), authored, `${path} in index.d.ts`);
      assert.equal(tokens.get(property(path)), emitted, `${property(path)} in tokens.css`);
    });
  }

  test('the shell inset scales with the density, and the rail and the bar do not', () => {
    // The inset is a gap, and every gap follows the density. The rail and
    // the bar are fixed, because breakpoint.shell is derived from the rail
    // and a rail that grew with the density would move a breakpoint that a
    // density cannot move.
    assert.equal(resolvePx(tokens.get('--size-shell-inset'), 0.82), 6.56);
    assert.equal(resolvePx(tokens.get('--size-shell-inset'), 1.16), 9.28);
    for (const fixed of ['--size-shell-rail', '--size-shell-topbar']) {
      assert.equal(resolvePx(tokens.get(fixed), 0.82), resolvePx(tokens.get(fixed), 1.16), fixed);
    }
  });

  test('the working ring turns at a calm pace, and its arc breathes out of step with the turn', () => {
    // The ring turned once per slow step (300ms), more than three turns a
    // second, which read as alarm rather than as work. A turn of 0.9 to 1.1s
    // and a sweep of 1.4 to 1.6s is the pace mature systems settle on, and a
    // sweep that is a whole multiple of the turn would bring the arc's longest
    // reach back to the same angle every round.
    const ms = (path) => Number(/^(\d+)ms$/.exec(path.split('.').reduce((node, key) => node?.[key], exported))?.[1]);
    const turn = ms('motion.duration.turn');
    const sweep = ms('motion.duration.sweep');
    assert.ok(turn >= 900 && turn <= 1100, `turn is ${turn}ms`);
    assert.ok(sweep >= 1400 && sweep <= 1600, `sweep is ${sweep}ms`);
    assert.notEqual(sweep % turn, 0, 'the sweep is not a whole number of turns');
  });
});

describe('the font faces', () => {
  const declared = [...read('fonts.css').matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    family: /font-family:\s*'([^']+)';/.exec(body)?.[1],
    file: /url\('[^']*\/([^'/]+)'\)/.exec(body)?.[1],
  }));

  test('fonts.css declares the Geist and Geist Mono files, and fonts/ ships nothing else', () => {
    // Every file is also an import path (`@crewlethq/tokens/fonts/<name>`) an
    // application may preload, so a renamed or dropped file is a breaking
    // change, and this list is where it shows up in a diff.
    const files = ['geist-latin-ext.woff2', 'geist-latin.woff2', 'geist-mono-latin-ext.woff2', 'geist-mono-latin.woff2'];
    assert.deepEqual(declared.map(({ file }) => file).sort(), files);
    const shipped = readdirSync(fileURLToPath(new URL('../fonts/', import.meta.url))).filter((name) => name.endsWith('.woff2'));
    assert.deepEqual(shipped.sort(), files);
  });

  test('each family stack leads with a family fonts.css declares', () => {
    // A stack that leads with a family no rule declares never loads the
    // self-hosted files: it renders the next family in the list, and the
    // files ship for nothing.
    const lead = (stack) => stack.split(',')[0].trim();
    assert.equal(lead(font.family.sans), "'Geist'");
    assert.equal(lead(font.family.mono), "'Geist Mono'");
    assert.equal(font.family.display, font.family.sans);
    assert.deepEqual([...new Set(declared.map(({ family }) => family))].sort(), ['Geist', 'Geist Mono']);
    assert.equal(tokens.get('--font-family-sans'), font.family.sans);
    assert.equal(tokens.get('--font-family-mono'), font.family.mono);
  });
});

describe('the derived tints', () => {
  test('every soft and line step is its own fill at the declared alpha', () => {
    // The tint is derived at build time so it follows the fill. This checks
    // that it still does, in every state of every theme, which a hand-edited
    // value would not.
    for (const [state, values] of everyState()) {
      for (const family of ['success', 'warning', 'danger', 'info']) {
        const fill = values.get(`--color-feedback-${family}`);
        assert.equal(values.get(`--color-feedback-${family}-soft`), withAlpha(fill, SOFT_ALPHA), `${state} ${family} soft`);
        assert.equal(values.get(`--color-feedback-${family}-line`), withAlpha(fill, 0.3), `${state} ${family} line`);
      }
    }
  });

  test("the brand kind's fill and line are its own hue at the node alphas, in every palette", () => {
    // Brand is the one artifact kind whose hue is not an alias of a node hue,
    // so its steps are derived by the build rather than aliased, at the
    // alphas a node hue's are, and the palette suite recomputes the fill at
    // the same alpha.
    const hues = new Set();
    for (const [state, values] of everyState()) {
      const hue = values.get('--color-artifact-kind-brand');
      assert.ok(parseHex(hue), `${state} brand is ${hue}, not an opaque colour`);
      hues.add(hue);
      assert.equal(values.get('--color-artifact-kind-brand-fill'), withAlpha(hue, ARTIFACT_KIND_FILL_ALPHA), `${state} brand fill`);
      assert.equal(values.get('--color-artifact-kind-brand-fill'), withAlpha(hue, 0.12), `${state} brand fill at the node fill alpha`);
      assert.equal(values.get('--color-artifact-kind-brand-line'), withAlpha(hue, 0.38), `${state} brand line at the node line alpha`);
      assert.ok(parseHex(values.get('--color-artifact-kind-brand-ink')), `${state} brand ink`);
    }
    // One value per mode: the hue is the kind's identity, not a palette's step.
    assert.equal(hues.size, 2, [...hues].join(', '));
  });

  test("the accent's companions are the accent, in every palette", () => {
    // The accent is per palette, so a companion copied from one palette into
    // another is a tint of a hue that palette does not have. The triple and
    // the strong line are derived by the build; the soft fill is written per
    // palette, because its alpha is fitted per palette, and it is held here
    // to the accent's own channels.
    const accents = new Set();
    for (const [state, values] of everyState()) {
      const accent = values.get('--color-brand-accent');
      const { r, g, b } = parseHex(accent);
      accents.add(accent);
      assert.equal(values.get('--color-brand-accent-rgb'), `${r}, ${g}, ${b}`, `${state} accent-rgb`);
      assert.equal(values.get('--color-brand-accent-soft-strong'), withAlpha(accent, 0.32), `${state} accent-soft-strong`);
      // The selected edge is the accent at 0.6, a tint of the hue this palette
      // has, or the full accent under a high-contrast theme.
      const edge = values.get('--color-border-selected');
      assert.ok(edge === withAlpha(accent, 0.6) || edge === accent, `${state} border-selected is ${edge}, not a tint of ${accent}`);
      const soft = parseRgba(values.get('--color-brand-accent-soft'));
      assert.deepEqual(soft?.rgb, { r, g, b }, `${state} accent-soft is a tint of ${accent}`);
      assert.ok(soft.a > 0 && soft.a < 1, `${state} accent-soft is translucent`);
      // The glow is the accent's own light, composed from the triple, so an
      // application that rebinds the accent retints it too.
      assert.match(values.get('--shadow-glow'), /rgba\(var\(--color-brand-accent-rgb\), 0\.\d+\)/, `${state} glow`);
    }
    // And the palettes really do differ, which is what makes the above a check
    // rather than one value compared with itself in every state.
    assert.ok(accents.size >= themeRegistry.length, `the states resolved only ${accents.size} accents, ${[...accents].join(', ')}`);
  });
});

describe('the edge scale and the quiet fills', () => {
  /** Every state of every theme, with the theme's contrast profile. */
  const profiled = () =>
    themeRegistry.flatMap((theme) =>
      Object.entries(paletteStates(sourcesOf(theme.id))).map(([state, values]) => [`${theme.id} ${state}`, values, theme.contrast]),
    );

  test("every step is the palette's own ink or control edge at its alpha, in every palette", () => {
    // Derived per palette, so a theme's edge follows its own ink and its own
    // control edge. A high-contrast theme draws the three tints at full
    // strength, because a tint is the opposite of what it promises.
    for (const [state, values, contrast] of profiled()) {
      const text = values.get('--color-text-primary');
      const control = values.get('--color-border-control');
      // The base state is the marketing root under every theme, so it is
      // always drawn at the standard strength.
      const high = contrast === 'high' && !state.endsWith(' base');
      assert.equal(values.get('--color-edge-hairline'), high ? control : withAlpha(text, 0.13), `${state} hairline`);
      assert.equal(values.get('--color-edge-soft'), high ? control : withAlpha(control, 0.3), `${state} soft`);
      assert.equal(values.get('--color-edge-medium'), high ? control : withAlpha(control, 0.5), `${state} medium`);
      assert.equal(values.get('--color-edge-strong'), control, `${state} strong`);
      assert.equal(values.get('--color-fill-row'), withAlpha(text, 0.04), `${state} row fill`);
      assert.equal(values.get('--color-fill-soft'), withAlpha(text, 0.06), `${state} soft fill`);
    }
    // The marketing root carries them too, so the token layer alone has a value.
    assert.equal(tokens.get('--color-edge-hairline'), withAlpha(tokens.get('--color-text-primary'), 0.13));
  });

  test('every sheet draws the edge scale at full strength for a reader who asks for more contrast', () => {
    // One block per sheet, under the sheet's own three selectors, after the
    // palette blocks it shadows: a selector there ties the specificity of the
    // block it overrides and wins by coming later.
    const sheets = [
      ['tokens.css', tokensCss, [':root']],
      ['themes.css', themesCss, Object.values(paletteSelectors(null))],
      ...themeRegistry
        .filter((theme) => theme.id !== DEFAULT_THEME_ID)
        .map((theme) => [`themes/${theme.id}.css`, read(`themes/${theme.id}.css`), Object.values(paletteSelectors(theme.id))]),
    ];
    for (const [name, css, selectors] of sheets) {
      const blocks = parseBlocks(css).filter((block) => block.declarations.size > 0);
      const contrast = blocks.filter((block) => block.atRule === '@media (prefers-contrast: more)');
      assert.deepEqual(contrast.map((block) => block.selector), selectors, `${name} more-contrast selectors`);
      const last = Math.max(...blocks.map((block, index) => (block.atRule !== '@media (prefers-contrast: more)' && block.declarations.has('--color-edge-hairline') ? index : -1)));
      for (const block of contrast) {
        assert.ok(blocks.indexOf(block) > last, `${name}: ${block.selector} comes after every palette block`);
        for (const step of ['hairline', 'soft', 'medium']) {
          assert.equal(block.declarations.get(`--color-edge-${step}`), 'var(--color-border-control)', `${name}: ${block.selector} ${step}`);
        }
      }
    }
    // And all.css carries every named theme's block.
    const all = parseBlocks(read('themes/all.css')).filter((block) => block.atRule === '@media (prefers-contrast: more)');
    assert.equal(all.length, (themeRegistry.length - 1) * 3);
  });

  test("the start sheet's shadow is the sheet's, mirrored, in every palette", () => {
    // Each layer's horizontal offset negated and nothing else, so a palette
    // that retunes the sheet's shadow retunes both.
    const offsets = (value) => value.split(/,(?![^(]*\))/).map((layer) => layer.trim().split(/\s+/));
    for (const [state, values] of everyState()) {
      const sheet = offsets(values.get('--shadow-sheet'));
      const start = offsets(values.get('--shadow-sheet-start'));
      assert.equal(start.length, sheet.length, state);
      sheet.forEach((layer, i) => {
        assert.equal(parseFloat(start[i][0]), -parseFloat(layer[0]), `${state} layer ${i} x`);
        assert.deepEqual(start[i].slice(1), layer.slice(1), `${state} layer ${i} rest`);
      });
    }
  });

  test('the count badge is one pill: a 16px height, the first spacing step and a 10px figure', () => {
    assert.equal(tokens.get('--size-badge'), 'calc(16px * var(--density, 1))');
    assert.equal(tokens.get('--size-badge-pad'), 'var(--spacing-1)');
    assert.equal(tokens.get('--font-size-badge'), '0.625rem');
    assert.equal(size.badge, '16px');
    assert.equal(font.size.badge, '10px');
  });

  test("the artifact kind grounds are the kind's own hue, vivid, at the card's lightness mix, in every palette", () => {
    // Opaque, at the hue's own hue and chroma (as much as a screen shows), at
    // a lightness mixed from the hue's and the card's neutral: so a ground
    // keeps its colour where a tint of it went grey.
    const chroma = ({ a, b }) => Math.hypot(a, b);
    const angle = ({ a, b }) => (Math.atan2(b, a) * 180) / Math.PI;
    for (const [state, values] of everyState()) {
      const sheet = parseHex(values.get('--color-surface-background'));
      const card = toOklab(flatten(values.get('--color-surface-subtle'), sheet));
      for (const kind of ARTIFACT_KINDS) {
        let hue = values.get(`--color-artifact-kind-${kind}`);
        const alias = /^var\((--[a-z0-9-]+)\)$/.exec(hue ?? '');
        if (alias) hue = values.get(alias[1]);
        const hueLab = toOklab(parseHex(hue));
        for (const [step, weight] of [['ground', 0.26], ['ground-strong', 0.3]]) {
          const value = values.get(`--color-artifact-kind-${kind}-${step}`);
          assert.equal(value, atLightness(hue, weight * hueLab.L + (1 - weight) * card.L), `${state} ${kind} ${step}`);
          const lab = toOklab(parseHex(value));
          // The hue's own hue, within what eight bits a channel can hold.
          assert.ok(chroma(lab) < 0.02 || Math.abs(((angle(lab) - angle(hueLab) + 540) % 360) - 180) < 4, `${state} ${kind} ${step} keeps its hue`);
        }
        const ground = toOklab(parseHex(values.get(`--color-artifact-kind-${kind}-ground`)));
        assert.equal(
          values.get(`--color-artifact-kind-${kind}-ground-end`),
          oklabHex({ L: 0.7 * ground.L + 0.3 * card.L, a: 0.7 * ground.a, b: 0.7 * ground.b }),
          `${state} ${kind} ground-end`,
        );
        assert.equal(values.get(`--color-artifact-kind-${kind}-glow`), withAlpha(hue, 0.46), `${state} ${kind} glow`);
      }
    }
  });
});

describe('the quiet link', () => {
  /**
   * A link inside running text or a row, which must not compete with the
   * words around it: the accent ink mixed 65% with the secondary text, in
   * OKLab, in every palette of every theme and in the base. Written per
   * palette rather than derived, so a floor can move it; and when one does it
   * moves along lightness alone, keeping the mix's hue and chroma, and its
   * comment says why. The palette suite measures it as an ink.
   */
  const source = (path) => JSON.parse(readFileSync(fileURLToPath(new URL(`../tokens/${path}`, import.meta.url)), 'utf8'));
  const mix = (ink, secondary) => {
    const a = toOklab(parseHex(ink));
    const b = toOklab(parseHex(secondary));
    return toOklab(parseHex(hex(fromOklab({ L: 0.65 * a.L + 0.35 * b.L, a: 0.65 * a.a + 0.35 * b.a, b: 0.65 * a.b + 0.35 * b.b }))));
  };
  const palettes = [
    ['the base', source('color.json')],
    ...themeRegistry.flatMap((theme) => ['dark', 'light'].map((mode) => [`${theme.id} ${mode}`, source(`themes/${theme.id}/${mode}.json`)])),
  ];

  test('every palette writes it, as the mix or the mix moved along lightness with its reason', () => {
    assert.equal(palettes.length, 1 + themeRegistry.length * 2);
    for (const [where, json] of palettes) {
      const { linkQuiet, secondary } = json.color.text;
      assert.ok(linkQuiet, `${where} writes no quiet link`);
      const want = mix(json.color.brand.accentInk.value, secondary.value);
      const got = toOklab(parseHex(linkQuiet.value));
      // Within what eight bits a channel can hold.
      const sameHue = Math.abs(got.a - want.a) < 0.006 && Math.abs(got.b - want.b) < 0.006;
      assert.ok(sameHue, `${where}: ${linkQuiet.value} is not the mix along lightness`);
      if (Math.abs(got.L - want.L) > 0.004) {
        assert.match(linkQuiet.comment ?? '', /along lightness/, `${where}: ${linkQuiet.value} moved off the mix and says nothing about why`);
      }
    }
  });

  test("the default theme's is the approved design's", () => {
    assert.equal(themes.dark.color.text.linkQuiet, '#a9b0ea');
    assert.equal(themes.light.color.text.linkQuiet, '#484e99');
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

  test('focus handed back after a pointer press draws no ring, and keeps its outline', () => {
    // A trigger focused again when its palette closes matches :focus-visible
    // because the palette's field did. Under the pointer it is quiet; the
    // outline turns transparent rather than going, so forced colors paints it.
    assert.match(
      base,
      /:root\[data-crewlet-focus='pointer'\] \[data-crewlet-focus-returned\]:focus-visible\s*\{\s*outline-color: transparent;\s*\}/,
    );
  });

  test('it honours a reduced-motion preference', () => {
    assert.match(base, /@media \(prefers-reduced-motion: reduce\)/);
  });

  test('it paints the body with the frame, the lowest rung', () => {
    // Whatever an application floats on the body (a sheet, a rail) brings its
    // own ground; the body is the application ground under all of it.
    assert.match(base, /\nbody\s*\{[^}]*background: var\(--color-surface-frame\);/);
  });

  test("it sets the body on the design's dense base: 13px on the body leading", () => {
    // The document's own type is what every component that does not set a
    // size of its own inherits, and what the ones set on the document's line
    // (a keycap, a monogram, the rail's lockup) read their leading from.
    const body = /\nbody\s*\{([^}]*)\}/.exec(base.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] ?? '';
    assert.match(body, /font-size: var\(--font-size-compact\);/);
    assert.match(body, /line-height: var\(--font-line-height-body\);/);
    assert.equal(font.size.compact, '13px');
    assert.equal(font.lineHeight.body, '1.45');
  });
});

describe('the stylesheets that read tokens', () => {
  test('every token base.css and legacy.css read is one the token layer declares', () => {
    // A var() naming a token the build does not emit is dropped by the
    // browser without a word, and neither file is linted by anything else:
    // removing a token (the topbar rungs, say) would leave both still pointing
    // at it, painting nothing, with a green build.
    for (const name of ['base.css', 'legacy.css']) {
      const css = read(name).replace(/\/\*[\s\S]*?\*\//g, '');
      const declared = new Set([...tokens.keys(), ...[...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])]);
      const used = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]))];
      assert.ok(used.length > 5, `${name} reads only ${used.length} tokens`);
      assert.deepEqual(used.filter((token) => !declared.has(token)), [], `${name} reads tokens nothing declares`);
    }
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

  // Dark is the bare root and light the attribute block. The light media
  // block is not compared here: the palette suite holds it to the attribute
  // block, key for key and value for value, so it cannot hold anything this
  // comparison would miss.
  const blocks = {
    light: cascade(source(themesCss), (block) => block.atRule === null && block.selector === ':root[data-theme="light"]'),
    dark: cascade(source(themesCss), (block) => block.atRule === null && block.selector === ':root'),
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

describe('the named themes', () => {
  /**
   * The registry is what a picker reads, and each named sheet is what paints
   * the theme it lists, so the two are held to each other here: a swatch that
   * drifts from its sheet shows the reader a thumbnail of a palette that never
   * paints. What the palettes themselves must clear is the palette suite's
   * subject; this is about what the build emits and where.
   */
  const named = themeRegistry.filter((theme) => theme.id !== DEFAULT_THEME_ID);

  /** The swatch keys, and the slot each one is drawn from. */
  const SWATCH = {
    frame: '--color-surface-frame',
    sheet: '--color-surface-background',
    card: '--color-surface-subtle',
    raised: '--color-surface-elevated',
    hairline: '--color-border-default',
    text: '--color-text-primary',
    muted: '--color-text-muted',
    accent: '--color-brand-accent',
    onAccent: '--color-text-on-accent',
    info: '--color-feedback-info',
    warning: '--color-feedback-warning',
    danger: '--color-feedback-danger',
    success: '--color-feedback-success',
  };

  test('the default paints the bare root and ships no sheet of its own; every named theme ships one', () => {
    assert.equal(themeRegistry[0].id, DEFAULT_THEME_ID);
    const shipped = readdirSync(fileURLToPath(new URL('../dist/css/themes/', import.meta.url))).sort();
    assert.deepEqual(shipped, ['all.css', ...named.map((theme) => `${theme.id}.css`)].sort());
  });

  test('a named sheet paints only under its own data-palette attribute', () => {
    // A block on the bare root, or under another theme's attribute, would
    // repaint every document that imports the sheet, and so every document
    // that imports all.css.
    // The more-contrast block repeats the same three selectors, and is held
    // by 'the edge scale and the quiet fills'.
    const own = (id) => [`:root[data-palette="${id}"]`, `:root[data-palette="${id}"]:not([data-theme="dark"])`, `:root[data-palette="${id}"][data-theme="light"]`];
    for (const theme of named) {
      // A wrapper's closing brace reads as an empty block; only blocks that
      // declare something paint.
      const blocks = parseBlocks(read(`themes/${theme.id}.css`)).filter((block) => block.declarations.size > 0);
      const palette = blocks.filter((block) => block.atRule !== '@media (prefers-contrast: more)').map((block) => block.selector);
      assert.deepEqual(palette, own(theme.id), theme.id);
      const contrast = blocks.filter((block) => block.atRule === '@media (prefers-contrast: more)').map((block) => block.selector);
      assert.deepEqual(contrast, own(theme.id), `${theme.id} more contrast`);
    }
  });

  test('every swatch colour is the one its theme paints, in both modes', () => {
    for (const theme of themeRegistry) {
      const states = paletteStates(sourcesOf(theme.id));
      for (const [mode, state] of [['dark', 'dark'], ['light', 'light (attribute)']]) {
        assert.deepEqual(Object.keys(theme.swatch[mode]), Object.keys(SWATCH), `${theme.id} ${mode}`);
        const drift = Object.entries(SWATCH)
          .filter(([key, slot]) => theme.swatch[mode][key] !== states[state].get(slot))
          .map(([key, slot]) => `${key}: ${theme.swatch[mode][key]} in the registry, ${states[state].get(slot)} in the sheet`);
        assert.deepEqual(drift, [], `${theme.id} ${mode}`);
      }
    }
  });

  test('every theme names a group the picker lists, in the order the groups are listed', () => {
    const order = themeGroups.map((group) => group.id);
    for (const theme of themeRegistry) assert.ok(order.includes(theme.group), `${theme.id} names the group ${theme.group}`);
    const listed = themeRegistry.map((theme) => order.indexOf(theme.group));
    assert.deepEqual(listed, [...listed].sort((a, b) => a - b), 'the registry is not in group order');
    for (const group of order) assert.ok(themeRegistry.some((theme) => theme.group === group), `the ${group} group lists no theme`);
  });

  test('isThemeId names exactly the themes the registry lists', () => {
    // It is what a stored preference is read back through, so anything else a
    // store can hold answers false: the sheet that is not a theme, a name in
    // the wrong case, and the keys every object inherits.
    for (const theme of themeRegistry) assert.equal(isThemeId(theme.id), true, theme.id);
    for (const value of ['', 'all', 'Crewlet', ' crewlet', 'constructor', '__proto__', 'toString', null, undefined, 1, {}, ['crewlet']]) {
      assert.equal(isThemeId(value), false, JSON.stringify(value) ?? String(value));
    }
  });
});

describe('the palettes and the theme registry', () => {
  const module = (name) => readFileSync(fileURLToPath(new URL(`../dist/${name}`, import.meta.url)), 'utf8');

  test('are modules apart, so a consumer of the registry never carries the palette values', async () => {
    // A bundler keeps or drops a module's values by what is imported from it
    // and splits code by module. With the palettes in the registry's module,
    // an application that read only the registry at boot (a theme
    // preference) carried every palette value in its entry as soon as a
    // later screen imported `themes`.
    const registry = module('themes.js');
    assert.doesNotMatch(registry, /from\s+['"]\.\/palettes\.js['"]/, 'the registry module neither imports nor re-exports the palettes');
    assert.doesNotMatch(registry, /\blinkQuiet\b/, 'the registry module holds no palette value');
    assert.doesNotMatch(registry, /export\s+const\s+themes\b/);
    const palettes = await import('../dist/palettes.js');
    assert.equal(exported.themes, palettes.themes, 'the entry hands out the palettes module\'s own object');
    assert.deepEqual(Object.keys(palettes), ['themes']);
    const entry = module('index.js');
    assert.match(entry, /export \{ themes \} from '\.\/palettes\.js';/);
    assert.match(entry, /export \{ themeGroups, themeRegistry, DEFAULT_THEME_ID, isThemeId \} from '\.\/themes\.js';/);
  });
});

describe('the colour maths at runtime', () => {
  test('the package exports the implementation the palette suite measures with', () => {
    // One implementation: the published entry and the published suite hand a
    // caller the same functions, so the ratio an interface shows is the ratio
    // a theme is held to.
    for (const name of ['contrast', 'luminance', 'parseHex']) {
      assert.equal(typeof exported[name], 'function', name);
      assert.equal(exported[name], palette[name], `${name} is the suite's own`);
    }
  });

  test('contrast is the WCAG 2 ratio, in either order', () => {
    const black = exported.parseHex('#000000');
    const white = exported.parseHex('#ffffff');
    assert.equal(exported.contrast(black, white), 21);
    assert.equal(exported.contrast(white, black), 21);
    assert.equal(exported.contrast(white, white), 1);
    // #767676 is the lightest grey that clears 4.5:1 on white; #777777 is not.
    assert.ok(exported.contrast(exported.parseHex('#767676'), white) >= exported.WCAG_CONTRAST.aa);
    assert.ok(exported.contrast(exported.parseHex('#777777'), white) < exported.WCAG_CONTRAST.aa);
    assert.equal(exported.luminance(white), 1);
    assert.equal(exported.luminance(black), 0);
  });

  test('parseHex reads #rrggbb and nothing else, and never throws', () => {
    assert.deepEqual(exported.parseHex(' #AbCdEf '), { r: 171, g: 205, b: 239 });
    for (const value of ['', '#fff', '#ffffffff', 'fff000', 'red', 'rgb(0, 0, 0)', '#gggggg', '#12345']) {
      assert.equal(exported.parseHex(value), null, JSON.stringify(value));
    }
  });

  test('the WCAG floors are the standard ones, and frozen', () => {
    assert.deepEqual({ ...exported.WCAG_CONTRAST }, { aa: 4.5, aaLarge: 3, aaa: 7, aaaLarge: 4.5 });
    assert.ok(Object.isFrozen(exported.WCAG_CONTRAST));
  });
});

describe('the parsers these tests rely on', () => {
  test('they read a value rather than answering null for everything', () => {
    assert.deepEqual(parseHex('#5469d4'), { r: 84, g: 105, b: 212 });
    assert.deepEqual(parseRgba('rgba(84, 105, 212, 0.14)'), { rgb: { r: 84, g: 105, b: 212 }, a: 0.14 });
    assert.equal(parseHex('not a colour'), null);
    assert.ok(tokens.size > 100, `tokens.css resolved only ${tokens.size} declarations`);
  });
});
