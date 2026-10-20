import StyleDictionary from 'style-dictionary';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve, sep } from 'node:path';
// One implementation of the colour maths, and the build is its second caller:
// the soft and line steps below are the theme's own fill at a fixed alpha, and
// a second hex-to-rgba helper here would be the first place a tint could drift
// from the one the palette suite measures.
import { parseHex, withAlpha } from '../test/color.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// The token source
// ---------------------------------------------------------------------------

// tokens/*.json holds the base: the marketing palette weblet reads, and every
// token that does not change with a theme. tokens/themes/<id>/ holds one THEME
// each: dark.json and light.json carry the slots that change with the palette,
// theme.json says what the theme is called and where a picker lists it, and
// intent.json records the design the theme was fitted from. The base carries a
// value for every themed slot (the marketing palette's, which is dark), so an
// application that imports tokens.css alone still has a value for all of them;
// the palette suite asserts it.
const tokensDir = resolve(root, 'tokens');
const themesDir = resolve(tokensDir, 'themes');
const fontsDir = resolve(root, 'fonts');
const stylesheetsDir = resolve(root, 'stylesheets');
const cssDir = resolve(root, 'dist/css');
const fontsUrlBase = relative(cssDir, fontsDir).split(sep).join('/');

// A tint is its own fill at a fixed alpha, and these are the two alphas the
// Tag and Callout components already draw: `soft` is the fill behind a badge
// or a callout, `line` the border beside it. They are DERIVED rather than
// written down, per theme, because a hand-copied rgba is how a tint comes to
// belong to a hue the fill no longer is.
const SOFT_ALPHA = 0.12;
const LINE_ALPHA = 0.3;
const SOFT_AND_LINE = ['success', 'warning', 'danger', 'info'];

// A node hue's three drawn steps, on the same principle: the hue is the one
// source and every alpha follows it. They are their own numbers rather than
// the two above because they are drawn on a different thing. A tag's soft fill
// sits on a panel and is read against the words beside it; a chart node's fill
// IS the card, its line IS the card's whole boundary, and its halo is a ring
// outside that boundary saying the card is tinted at all, which has to stay
// under the boundary or it reads as a second border.
const NODE_FILL_ALPHA = 0.12;
const NODE_LINE_ALPHA = 0.38;
const NODE_HALO_ALPHA = 0.16;
const NODE_HUES = ['purple', 'cyan', 'green', 'amber', 'rose', 'blue'];

// The accent's two companions, on the same principle, and per palette because
// the accent is: `accentRgb` is the accent as an r, g, b triple, for a
// stylesheet composing a translucent tint of its own, and `accentSoftStrong`
// is the accent at this alpha, the border paired with the soft fill. Neither
// has a free parameter per palette, so neither is written down. The soft fill
// itself IS written, in each palette's file, because its alpha is fitted per
// palette against the hover overlay it has to outread; the build suite holds
// its r, g, b to the accent's.
const ACCENT_LINE_ALPHA = 0.32;

// THE SELECTED EDGE, `border.selected`: the one-pixel line round a chosen
// option (a theme card, the slide being edited, a starting template), drawn
// as the accent at this alpha so it is the accent mixed toward whatever
// ground it lands on. It replaced the full accent, which on a page of options
// read as the loudest edge on the screen and as a second focus ring beside the
// real one. It is a TINT, so it is never the state's only cue: every selected
// component pairs it with the soft fill or a mark of its own that clears 3:1,
// and the palette suite holds it to reading apart from the resting hairline.
// A high-contrast theme draws it as the full accent instead, because a tint
// is the opposite of what that theme promises its reader.
const SELECTED_EDGE_ALPHA = 0.6;

// The theme that paints the bare root. Every other theme paints under its own
// data-palette attribute, so a document that names none gets this one, and an
// application that never adopts the attribute is unchanged.
const DEFAULT_THEME = 'crewlet';

// A theme's id is its folder's name and the value of data-palette, so it is
// spelled as an attribute value a stylesheet can quote without escaping.
const THEME_ID = /^[a-z][a-z0-9-]*$/;

// What a theme's theme.json may say, and nothing else: an unknown key is a
// typo of one of these, and a typo here is a picker that silently lists a
// theme wrong.
const THEME_KEYS = new Set(['$comment', 'name', 'group', 'tag', 'description', 'order', 'tint', 'contrast']);

async function readTokenFile(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/** Every tokens/*.json merged, in name order, with tokens/themes/ left out. */
async function readBaseTokens() {
  const merged = {};
  for (const entry of (await readdir(tokensDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const group = await readTokenFile(resolve(tokensDir, entry.name));
    for (const [name, value] of Object.entries(group)) {
      if (name in merged) throw new Error(`tokens/${entry.name}: the group "${name}" is already declared by another file`);
      merged[name] = value;
    }
  }
  return merged;
}

/**
 * Add the soft and line steps a palette's own fills imply. The fill is the one
 * source: every tint follows it, in every palette, without a second edit.
 */
function deriveTints(tokens, where, { contrast = 'standard' } = {}) {
  const fill = (group, name) => {
    const token = tokens.color?.[group]?.[name];
    if (token === undefined) throw new Error(`${where}: color.${group}.${name} is missing, and its soft tint is derived from it`);
    return token.value;
  };
  for (const name of SOFT_AND_LINE) {
    tokens.color.feedback[`${name}Soft`] = { value: withAlpha(fill('feedback', name), SOFT_ALPHA) };
    tokens.color.feedback[`${name}Line`] = { value: withAlpha(fill('feedback', name), LINE_ALPHA) };
  }
  for (const name of NODE_HUES) {
    tokens.color.node[`${name}Fill`] = { value: withAlpha(fill('node', name), NODE_FILL_ALPHA) };
    tokens.color.node[`${name}Line`] = { value: withAlpha(fill('node', name), NODE_LINE_ALPHA) };
    tokens.color.node[`${name}Halo`] = { value: withAlpha(fill('node', name), NODE_HALO_ALPHA) };
  }
  const accent = parseHex(fill('brand', 'accent'));
  if (accent === null) throw new Error(`${where}: color.brand.accent is "${fill('brand', 'accent')}"; the accent is authored as #rrggbb, and its companions are derived from it`);
  tokens.color.brand.accentRgb = { value: `${accent.r}, ${accent.g}, ${accent.b}` };
  tokens.color.brand.accentSoftStrong = { value: withAlpha(fill('brand', 'accent'), ACCENT_LINE_ALPHA) };
  tokens.color.border.selected = {
    value: contrast === 'high' ? fill('brand', 'accent') : withAlpha(fill('brand', 'accent'), SELECTED_EDGE_ALPHA),
  };
  return tokens;
}

/**
 * A theme's theme.json, held to what a picker reads from it.
 *
 * `tint` is the one thing it says about the palette itself: a theme whose
 * grounds are tinted on purpose declares the hue and the chroma budget of that
 * tint, and the palette suite holds every rung to the declaration rather than
 * to the neutral cap. `contrast: "high"` puts the theme under the suite's
 * high-contrast profile.
 */
function validateThemeMeta(meta, id, groups) {
  const where = `tokens/themes/${id}/theme.json`;
  const problems = [];
  for (const key of Object.keys(meta)) if (!THEME_KEYS.has(key)) problems.push(`"${key}" is not a theme field`);
  for (const key of ['name', 'tag', 'description']) {
    if (typeof meta[key] !== 'string' || meta[key].trim() === '') problems.push(`${key} is a non-empty string`);
  }
  if (!groups.some((group) => group.id === meta.group)) problems.push(`group "${meta.group}" is not one of tokens/themes/groups.json`);
  if (!Number.isInteger(meta.order) || meta.order < 1) problems.push('order is a whole number from 1');
  if (meta.tint !== undefined) {
    const { hue, chroma } = meta.tint ?? {};
    if (!(typeof hue === 'number' && hue >= 0 && hue < 360)) problems.push('tint.hue is an OKLCh hue in degrees, from 0 to under 360');
    if (!(typeof chroma === 'number' && chroma > 0)) problems.push('tint.chroma is the largest chroma a rung may carry, above 0');
    if (Object.keys(meta.tint ?? {}).some((key) => key !== 'hue' && key !== 'chroma')) problems.push('tint carries hue and chroma only');
  }
  if (meta.contrast !== undefined && meta.contrast !== 'high') problems.push('contrast is "high", or absent for the standard floors');
  if (id === DEFAULT_THEME && (meta.tint !== undefined || meta.contrast !== undefined)) {
    problems.push('the default theme paints every document that names no theme, so it keeps the neutral ramp and the standard floors');
  }
  if (problems.length > 0) throw new Error(`${where}:\n  ${problems.join('\n  ')}`);
  return meta;
}

/**
 * Every theme in tokens/themes/, in the order a picker lists them: by group,
 * then by each theme's own order.
 */
async function readThemes() {
  const { groups } = await readTokenFile(resolve(themesDir, 'groups.json'));
  const groupIds = groups.map((group) => group.id);
  if (groupIds.length === 0 || new Set(groupIds).size !== groupIds.length || !groupIds.every((id) => THEME_ID.test(id))) {
    throw new Error('tokens/themes/groups.json: every group has a unique id spelled like a theme id');
  }
  const palettes = [];
  for (const entry of (await readdir(themesDir, { withFileTypes: true })).filter((item) => item.isDirectory())) {
    const id = entry.name;
    if (!THEME_ID.test(id)) throw new Error(`tokens/themes/${id}: a theme's folder is its id, spelled in lower case, digits and dashes`);
    const dir = resolve(themesDir, id);
    const meta = validateThemeMeta(await readTokenFile(resolve(dir, 'theme.json')), id, groups);
    const read = async (mode) => {
      const where = `tokens/themes/${id}/${mode}.json`;
      return validate(deriveTints(await readTokenFile(resolve(dir, `${mode}.json`)), where, { contrast: meta.contrast }), where);
    };
    palettes.push({ id, meta, light: await read('light'), dark: await read('dark') });
  }
  if (!palettes.some((palette) => palette.id === DEFAULT_THEME)) throw new Error(`tokens/themes/${DEFAULT_THEME} is missing, and it paints the bare root`);
  const rank = new Map(groupIds.map((id, index) => [id, index]));
  palettes.sort((a, b) => rank.get(a.meta.group) - rank.get(b.meta.group) || a.meta.order - b.meta.order || a.id.localeCompare(b.id));
  return { groups, palettes };
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

// Font sizes are authored in px, so the typed export stays a number of pixels
// a layout can do arithmetic with, and emitted in rem, so a reader's own
// browser setting still moves the page.
StyleDictionary.registerTransform({
  name: 'crewlet/font-size-rem',
  type: 'value',
  filter: (token) => token.path[0] === 'font' && token.path[1] === 'size',
  transform: (token) => {
    const px = /^(-?\d*\.?\d+)px$/.exec(token.value);
    if (!px) throw new Error(`font.size.${token.path.slice(2).join('.')} is "${token.value}"; a font size is authored in px`);
    return `${Number((Number(px[1]) / 16).toFixed(6))}rem`;
  },
});

// A token marked `"density": true` is emitted as calc(Npx * var(--density, 1)),
// so @crewlethq/tokens/css/density reaches every gap, pad, row and control
// rather than three font sizes. Unset, the var() falls back to 1 and the value
// is exactly what was authored. `floor` holds a step at a minimum whatever the
// density: 28 x 0.82 is 22.96px, and a target under 24px is one a finger
// cannot reliably hit.
StyleDictionary.registerTransform({
  name: 'crewlet/density-scale',
  type: 'value',
  filter: (token) => token.density === true,
  transform: (token) => {
    const scaled = `calc(${token.value} * var(--density, 1))`;
    return token.floor === undefined ? scaled : `max(${token.floor}, ${scaled})`;
  },
});

StyleDictionary.registerTransformGroup({
  name: 'crewlet/css',
  transforms: [...StyleDictionary.hooks.transformGroups.css, 'crewlet/font-size-rem', 'crewlet/density-scale'],
});

// Emit a TypeScript module of flat token constants alongside the CSS layer.
// Consumers get either `import "@crewlethq/tokens/css"` for the variables
// or `import { color } from "@crewlethq/tokens"` for the strongly typed object.
StyleDictionary.registerFormat({
  name: 'crewlet/ts-module',
  format: ({ dictionary }) => {
    const groups = {};
    for (const t of dictionary.allTokens) {
      const [group, ...rest] = t.path;
      groups[group] ??= {};
      let cursor = groups[group];
      for (let i = 0; i < rest.length - 1; i++) {
        cursor[rest[i]] ??= {};
        cursor = cursor[rest[i]];
      }
      cursor[rest[rest.length - 1]] = t.value;
    }
    const lines = ['/* Generated by style-dictionary. Do not edit. */'];
    for (const [name, value] of Object.entries(groups)) {
      lines.push(`export const ${name} = ${JSON.stringify(value, null, 2)} as const;`);
    }
    return lines.join('\n\n') + '\n';
  },
});

/**
 * Refuse a token whose unit the CSS transforms cannot work with, naming it.
 *
 * Style Dictionary CATCHES an error thrown inside a transform, reports "some
 * token transformations could not be applied correctly", emits the value
 * untransformed and exits 0. So a font size authored in rem would ship as rem
 * from the CSS layer AND from the typed export, with a successful build and
 * one line of output nobody reads. The source is checked here instead, before
 * Style Dictionary sees it, and `log.warnings: 'error'` below makes any other
 * transform failure loud for the same reason.
 */
function validate(tokens, where) {
  const problems = [];
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object') return;
    if (typeof node.value === 'string') {
      const name = path.join('.');
      if (path[0] === 'font' && path[1] === 'size' && !/^-?\d*\.?\d+px$/.test(node.value)) {
        problems.push(`${name} is "${node.value}"; a font size is authored in px and emitted in rem`);
      }
      if (node.density === true && !/^-?\d*\.?\d+px$/.test(node.value)) {
        problems.push(`${name} is "${node.value}"; a density-scaled token is authored in px`);
      }
      if (node.floor !== undefined && node.density !== true) {
        problems.push(`${name} carries a floor but is not density-scaled, so the floor could never apply`);
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) walk(child, [...path, key]);
  };
  walk(tokens, []);
  if (problems.length > 0) throw new Error(`${where}:\n  ${problems.join('\n  ')}`);
  return tokens;
}

function baseConfig(tokens) {
  return {
    tokens,
    // A transform that could not be applied is a build failure, not a note.
    log: { warnings: 'error' },
    platforms: {
      css: {
        transformGroup: 'crewlet/css',
        buildPath: resolve(root, 'dist/css/') + '/',
        files: [
          {
            destination: 'tokens.css',
            format: 'css/variables',
            // An alias token (for example font.family.display, which points at
            // font.family.sans) is emitted as var(--font-family-sans) rather
            // than a copy of the resolved value. A custom property holding var()
            // is resolved on the element that declares it and descendants
            // inherit the result, so the alias follows an override of the
            // referenced variable declared on :root (the <html> element) and no
            // other: an override on body, a theme class or any narrower
            // selector has to set the alias as well.
            options: { selector: ':root', outputReferences: true },
          },
        ],
      },
      ts: {
        transformGroup: 'js',
        buildPath: resolve(root, 'src/') + '/',
        files: [
          {
            destination: 'index.ts',
            format: 'crewlet/ts-module',
          },
        ],
      },
    },
  };
}

/**
 * One theme's values as a nested object, shaped exactly like the base module's
 * groups, for the JavaScript that cannot read a custom property.
 *
 * WHY IT EXISTS. The base module carries only the values on tokens.css's own
 * :root, which is the marketing palette, so anything in JavaScript that needed
 * a LIGHT colour had no way to ask for one and copied a hex instead. Storybook's
 * chrome is the proof: its two theme files list eleven literals each, with a
 * comment naming the token every one came from, and by the time the palette
 * moved four of those literals were the values the move was made to get away
 * from. A value that is copied is a value that drifts.
 *
 * It uses the JS transform group, not the CSS one, so the numbers are raw: a
 * caller here wants #52525b and 32, never `calc(32px * var(--density, 1))`.
 */
async function themeValues(tokens) {
  const sd = new StyleDictionary(
    {
      tokens,
      log: { warnings: 'error' },
      platforms: { js: { transformGroup: 'js', buildPath: resolve(root, 'src/') + '/', files: [] } },
    },
    { init: false },
  );
  await sd.init();
  const dictionary = await sd.getPlatformTokens('js');
  const groups = {};
  for (const token of dictionary.allTokens) {
    const [group, ...rest] = token.path;
    groups[group] ??= {};
    let cursor = groups[group];
    for (let i = 0; i < rest.length - 1; i += 1) {
      cursor[rest[i]] ??= {};
      cursor = cursor[rest[i]];
    }
    cursor[rest[rest.length - 1]] = token.value;
  }
  return groups;
}

/**
 * One theme's declarations, transformed exactly as tokens.css's are. The names
 * come from Style Dictionary rather than from a second kebab-case helper here,
 * because a themed slot whose name did not match the base slot would repaint
 * nothing and fail no build. The palette suite asserts the match as well.
 */
async function themeDeclarations(tokens, indent) {
  const sd = new StyleDictionary(
    {
      tokens,
      log: { warnings: 'error' },
      platforms: { css: { transformGroup: 'crewlet/css', buildPath: cssDir + '/', files: [] } },
    },
    { init: false },
  );
  await sd.init();
  const dictionary = await sd.getPlatformTokens('css');
  return dictionary.allTokens.map((token) => `${indent}--${token.name}: ${token.value};`).join('\n');
}

// ---------------------------------------------------------------------------
// The generated stylesheets
// ---------------------------------------------------------------------------

// Legacy aliases: short, unprefixed variable names that stylesheets written
// before these tokens existed commonly use. Importing
// "@crewlethq/tokens/css/legacy" lets such a stylesheet adopt the tokens without
// rewriting every `var(--accent)` or `var(--bg-primary)` site. New code should
// use the canonical `--color-*` names.
//
// Each alias holds a var() reference, which the browser resolves on the element
// that declares it and hands down to descendants as a finished value. :root is
// now the only place it has to be declared: a theme repaints the canonical
// tokens on :root itself, so an alias declared there follows the theme. It did
// not before, when a theme repainted on body, which is why this file used to
// re-declare every alias on the theme classes as well.
const legacyAliases = `/* Generated by style-dictionary. Legacy aliases mapping short, unprefixed
   variable names to the canonical token namespace. Import this in addition to
   tokens.css when migrating an existing app: import '@crewlethq/tokens/css/legacy';
   New code should reference --color-*, --spacing-*, --font-*, --radius-*,
   --shadow-* directly.

   Declared on :root only. Both themes repaint the canonical tokens on :root,
   so an alias resolved there follows a theme switch. Override an alias on
   :root or on a descendant of it. */
:root {
  /* Brand. The three names a pre-token stylesheet spelled its one brand
     colour with all read the accent, which is the primary action's fill. */
  --accent: var(--color-brand-accent);
  --primary-blue: var(--color-brand-accent);
  --accent-purple: var(--color-brand-accent);
  --accent-purple-deep: var(--color-brand-accent-deep);
  --accent-pink: var(--color-brand-highlight);
  --accent-slate: var(--color-brand-slate);
  --accent-gradient: var(--color-brand-gradient);

  /* Surface ramp: the sheet, the card and raised. A stylesheet written
     before the frame existed has no name for it; its page is the sheet. */
  --bg-primary: var(--color-surface-background);
  --bg-secondary: var(--color-surface-subtle);
  --bg-tertiary: var(--color-surface-elevated);
  --bg-elevated: var(--color-surface-elevated);

  /* Text */
  --text-primary: var(--color-text-primary);
  --text-secondary: var(--color-text-secondary);
  --text-tertiary: var(--color-text-tertiary);

  /* Borders */
  --border-color: var(--color-border-default);
  --border-hover: var(--color-border-hover);

  /* Type stacks */
  --font-sans: var(--font-family-sans);
  --font-mono: var(--font-family-mono);
}
`;

/**
 * The theme contract, in three blocks, DARK FIRST.
 *
 *   :root                                                                   dark
 *   @media (prefers-color-scheme: light) :root:not([data-theme="dark"])     light
 *   :root[data-theme="light"]                                               light
 *
 * Dark on the bare :root, because dark is the palette the product is drawn in:
 * a document that sets nothing, and a browser that reports no preference at
 * all, get the palette every screen was designed against rather than its
 * translation. The media block is for a reader whose system asks for light;
 * the attribute block is so an explicit choice wins in BOTH directions, which
 * a media query alone cannot do.
 *
 * THE GUARD ON THE MEDIA BLOCK IS WHAT MAKES AN EXPLICIT DARK WIN. There is no
 * dark attribute block, because the bare root already is one: an explicit
 * dark has only to stop the light media block from matching, and
 * `:not([data-theme="dark"])` is what does that. Without it a reader on a
 * light system who chose dark would be repainted light by the media block,
 * which comes later in the file at the same specificity. The guard names
 * "dark" rather than "any attribute" so a value nobody declares (a
 * `data-theme="system"` somebody wrote by hand) still follows the system
 * instead of freezing the page dark.
 *
 * The two light blocks are written from one generated string, and the palette
 * suite compares them anyway. The ui-tests ThemeSwitcher suite drives the
 * built file through both systems and all three choices.
 *
 * This file is imported AFTER tokens.css. Both use the :root selector and
 * neither adds specificity, so the later import is the one that paints, and
 * the palette suite reads the cascade in that same order.
 */
function themeOverrides(light, dark) {
  return `/* Generated by style-dictionary. The dark and light palettes, as a
   three-state contract on the root element. Import it after tokens.css:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/themes';

   Dark first: a document with no data-theme attribute is dark, or light if
   its system asks for light. Setting data-theme="dark" or data-theme="light"
   on <html> pins one, and wins in both directions. Remove the attribute to
   follow the system again. Both light blocks are generated from one
   source. */

/* Dark. The default, on the bare root, so a document that sets nothing, and a
   browser that reports no preference, get a complete palette. */
:root {
  color-scheme: dark;

${dark}
}

/* Light, for a reader whose system asks for it and who has not pinned dark.
   The :not() is what lets an explicit dark win on a light system: there is no
   dark attribute block, because the bare root above already is one. */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;

${light
  .split('\n')
  .map((line) => (line === '' ? line : `  ${line}`))
  .join('\n')}
  }
}

/* An explicit light, which wins whichever way the system is set. */
:root[data-theme="light"] {
  color-scheme: light;

${light}
}
`;
}

/**
 * One named theme, in the same three blocks as the default, under its own
 * attribute: `data-palette="<id>"` on the root element.
 *
 *   :root[data-palette="<id>"]                                                   dark
 *   @media (prefers-color-scheme: light) :root[data-palette="<id>"]:not(...)    light
 *   :root[data-palette="<id>"][data-theme="light"]                               light
 *
 * Mode keeps working exactly as it does for the default: data-theme pins light
 * or dark, and its absence follows the system. Every block outranks the
 * default's same block by the attribute, and the theme's light blocks outrank
 * its own dark one, so source order never decides which palette paints. A
 * theme declares every slot the default declares, key for key, so nothing of
 * the default shows through it; the palette suite holds that.
 */
function paletteBlocks(id, light, dark) {
  const root = `:root[data-palette="${id}"]`;
  return `${root} {
  color-scheme: dark;

${dark}
}

@media (prefers-color-scheme: light) {
  ${root}:not([data-theme="dark"]) {
    color-scheme: light;

${light
  .split('\n')
  .map((line) => (line === '' ? line : `  ${line}`))
  .join('\n')}
  }
}

${root}[data-theme="light"] {
  color-scheme: light;

${light}
}
`;
}

const paletteHeader = (palette) => `/* Generated by style-dictionary. The ${palette.meta.name} theme: ${palette.meta.description}
   Import it after the default palettes, and set data-palette="${palette.id}" on <html>:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/themes';
       import '@crewlethq/tokens/css/themes/${palette.id}';
   data-theme keeps choosing light or dark exactly as it does for the default. */
`;

const allPalettesHeader = `/* Generated by style-dictionary. Every named theme, each under its own
   data-palette attribute on <html>. Import it after the default palettes:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/themes';
       import '@crewlethq/tokens/css/themes/all';
   A document that sets no data-palette keeps the default theme, and
   data-theme keeps choosing light or dark for every theme alike. */
`;

/** The colours a picker draws a theme's thumbnail with, one set per mode. */
function swatchOf(values) {
  const { surface, text, brand, border, feedback } = values.color;
  return {
    frame: surface.frame,
    sheet: surface.background,
    card: surface.subtle,
    raised: surface.elevated,
    hairline: border.default,
    text: text.primary,
    muted: text.muted,
    accent: brand.accent,
    onAccent: text.onAccent,
    info: feedback.info,
    warning: feedback.warning,
    danger: feedback.danger,
    success: feedback.success,
  };
}

/**
 * The density contract. --density scales every spacing and size token, so a
 * setting is a real change to every surface rather than to three font sizes.
 * It is a separate import because a product that has no density control
 * should not ship the attribute selectors that switch one.
 */
function densityOverrides(steps) {
  return `/* Generated by style-dictionary. The density contract, as an attribute on
   the root element. Import it after tokens.css:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/density';

   Set data-density="compact" or data-density="comfortable" on <html>;
   anything else, the attribute removed included, is the normal density.
   Every spacing and size token is emitted as calc(Npx * var(--density, 1)),
   so the scale reaches every gap, pad, row and control, and every value is
   unchanged at 1. The small control and row steps carry a 24px floor, so
   compact cannot take a target under the size a finger can hit. */

:root {
  --density: ${steps.normal};
}

:root[data-density="compact"] {
  --density: ${steps.compact};
}

:root[data-density="comfortable"] {
  --density: ${steps.comfortable};
}
`;
}

/**
 * The breakpoints, as a partial a stylesheet can import on its own.
 *
 * A media query cannot read a custom property, so a stylesheet that switches
 * layout at a breakpoint spells the number. This file is what says which
 * number, in one place, for a reviewer and for a lint rule: the value here and
 * the literal in the query have to agree, and `breakpoint` in the typed export
 * carries the same value for a check that compares them.
 */
function breakpointPartial(breakpoints) {
  const declarations = Object.entries(breakpoints)
    .map(([name, value]) => `  --breakpoint-${name}: ${value};`)
    .join('\n');
  return `/* Generated by style-dictionary. The layout breakpoints, on their own, for a
   stylesheet that wants them without the rest of the token layer:
       import '@crewlethq/tokens/css/breakpoint';

   A media query cannot read a custom property, so a stylesheet that switches
   layout at a breakpoint writes the number out. These declarations are what
   says which number it must be. The same values are in the typed export as
   \`breakpoint\`, so a check can compare a query's literal against them
   instead of trusting a comment. */

:root {
${declarations}
}
`;
}

// Self-hosted font faces. The woff2 files live in fonts/ (shipped in the
// package tarball beside dist/) with their OFL.txt, so the design system
// renders identically on a closed network and makes no third-party request
// for type. Each family carries the latin and latin-ext subsets Google Fonts
// serves for it; see fonts/README.md for versions and provenance, and
// fonts/SHA256SUMS for the checksum every file is verified against below.
//
// The unicode ranges are the latin and latin-ext ranges from the same Google
// Fonts stylesheet responses the files were downloaded from (the Geist and
// Geist Mono responses declare identical ones), so a page that renders only
// basic Latin text downloads a single file per family.
// latin-ext is declared first. The two ranges share U+0131, U+0152-0153,
// U+0304, U+0308, U+0329 and U+2020, and where faces with identical
// descriptors overlap the browser tries the one declared last first, so a
// shared character resolves from the latin file a Latin page has already
// downloaded whenever that file draws it. In Geist and Geist Mono it draws all
// of them but U+2020 (the dagger, which only latin-ext draws) and U+0329
// (which neither draws).
const FONT_SUBSETS = [
  {
    name: 'latin-ext',
    unicodeRange:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  {
    name: 'latin',
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
];

// `family` is the name ID 1 every file of the family carries, and `weight` is
// the wght axis range recorded in each file's fvar table (100 to 900 for both
// Geist and Geist Mono). Declaring the real range lets the browser render
// every font.weight token inside it from the variable font instead of
// synthesising bold; a narrower range would clamp the heavier weights the file
// can actually draw. test/fonts.test.mjs reads both out of the files and holds
// the emitted rules to them.
const FONT_FAMILIES = [
  { family: 'Geist', file: 'geist', weight: '100 900' },
  { family: 'Geist Mono', file: 'geist-mono', weight: '100 900' },
];

// Reads fonts/SHA256SUMS (the `shasum -a 256` output format) into a map of
// file name to checksum.
async function fontChecksums() {
  const checksums = new Map();
  const text = await readFile(resolve(fontsDir, 'SHA256SUMS'), 'utf8');
  for (const line of text.split('\n').filter(Boolean)) {
    const match = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    if (!match) throw new Error(`fonts/SHA256SUMS: malformed line "${line}"`);
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

async function fontFaceRules() {
  const checksums = await fontChecksums();
  const referenced = new Set();
  const rules = [];
  for (const { family, file, weight } of FONT_FAMILIES) {
    for (const { name, unicodeRange } of FONT_SUBSETS) {
      const fileName = `${file}-${name}.woff2`;
      referenced.add(fileName);
      // Fail the build rather than publish a stylesheet that points at a
      // missing file (a silent fallback font), or a file whose bytes no
      // longer match the provenance recorded for it.
      const expected = checksums.get(fileName);
      if (expected === undefined) {
        throw new Error(`fonts/SHA256SUMS has no checksum for ${fileName}; see "Replacing a file" in fonts/README.md`);
      }
      const actual = createHash('sha256').update(await readFile(resolve(fontsDir, fileName))).digest('hex');
      if (actual !== expected) {
        throw new Error(
          `fonts/${fileName} has SHA-256 ${actual}, but fonts/SHA256SUMS records ${expected}; see "Replacing a file" in fonts/README.md`,
        );
      }
      rules.push(`@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('${fontsUrlBase}/${fileName}') format('woff2');
  unicode-range: ${unicodeRange};
}`);
    }
  }
  const stale = [...checksums.keys()].filter((fileName) => !referenced.has(fileName));
  if (stale.length > 0) {
    throw new Error(`fonts/SHA256SUMS lists files no @font-face rule uses: ${stale.join(', ')}`);
  }
  return rules.join('\n\n');
}

// Font face loader. Ships separately from tokens.css so consumers who already
// load fonts at the app shell can opt out. It references local files only.
const fontFacesHeader = `/* Generated by style-dictionary. Self-hosted faces for the type families
   referenced by --font-family-sans, --font-family-display (an alias of sans)
   and --font-family-mono. Import this in addition to tokens.css when uilet
   should own font loading:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/fonts';
   Apps that already load these fonts at the shell can skip this file.

   Geist and Geist Mono are licensed under the SIL Open Font License 1.1.
   See fonts/OFL.txt in this package. */
`;

// Material Symbols Outlined loader, kept out of fonts.css on purpose: it is
// the one stylesheet in this package that requests a third-party host, so an
// application has to opt in to it explicitly. No @crewlethq/ui component
// depends on it; the components draw their glyphs as SVG from
// @crewlethq/icons. It stays for an application that writes its own ligature
// spans, which conlet does in 116 files.
const materialSymbols = `/* Generated by style-dictionary. Loads the Material Symbols Outlined icon
   font, for an application that renders its own
   <span class="material-symbols-outlined"> ligatures:
       import '@crewlethq/tokens/css/material-symbols';

   No @crewlethq/ui component needs it. Those draw their glyphs as SVG from
   @crewlethq/icons, which is vendored and makes no network request.

   This stylesheet requests fonts.googleapis.com, and the browser then
   downloads the font from fonts.gstatic.com. Material Symbols is published
   by Google under the Apache License 2.0
   (https://github.com/google/material-design-icons). No part of it is
   redistributed in this package. */

@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
`;

async function build() {
  const base = validate(deriveTints(await readBaseTokens(), 'tokens/color.json'), 'tokens/');
  const { groups, palettes } = await readThemes();
  const { light, dark } = palettes.find((palette) => palette.id === DEFAULT_THEME);

  // The constructor's implicit init runs detached, so a malformed token file
  // would surface as an unhandled rejection that no caller can catch (and
  // would crash watch mode). Initialising explicitly routes that error
  // through this function's promise instead.
  const sd = new StyleDictionary(baseConfig(base), { init: false });
  await sd.init();
  await sd.cleanAllPlatforms();
  await sd.buildAllPlatforms();

  await mkdir(cssDir, { recursive: true });
  await writeFile(resolve(cssDir, 'legacy.css'), legacyAliases);
  await writeFile(
    resolve(cssDir, 'themes.css'),
    themeOverrides(await themeDeclarations(light, '  '), await themeDeclarations(dark, '  ')),
  );
  // Every named theme: a sheet of its own, for an application that offers a
  // few, and all of them in one, for one that offers the picker. One sheet
  // switches with no request and no flash at boot.
  await mkdir(resolve(cssDir, 'themes'), { recursive: true });
  const named = [];
  for (const palette of palettes.filter(({ id }) => id !== DEFAULT_THEME)) {
    const blocks = paletteBlocks(palette.id, await themeDeclarations(palette.light, '  '), await themeDeclarations(palette.dark, '  '));
    await writeFile(resolve(cssDir, 'themes', `${palette.id}.css`), `${paletteHeader(palette)}\n${blocks}`);
    named.push(`/* ${palette.meta.name} */\n${blocks}`);
  }
  await writeFile(resolve(cssDir, 'themes', 'all.css'), `${allPalettesHeader}\n${named.join('\n')}`);
  await writeFile(
    resolve(cssDir, 'density.css'),
    densityOverrides(Object.fromEntries(Object.entries(base.density).map(([name, token]) => [name, token.value]))),
  );
  await writeFile(
    resolve(cssDir, 'breakpoint.css'),
    breakpointPartial(Object.fromEntries(Object.entries(base.breakpoint).map(([name, token]) => [name, token.value]))),
  );
  // base.css is a stylesheet rather than generated text, so it lives in
  // stylesheets/ where it can be read and reviewed as CSS, and is copied into
  // the published dist/css/ beside the generated files.
  await copyFile(resolve(stylesheetsDir, 'base.css'), resolve(cssDir, 'base.css'));
  await writeFile(resolve(cssDir, 'fonts.css'), `${fontFacesHeader}\n${await fontFaceRules()}\n`);
  await writeFile(resolve(cssDir, 'material-symbols.css'), materialSymbols);

  // The two palettes as typed objects, for the JavaScript that cannot read a
  // custom property. Written after Style Dictionary's own platforms, because
  // the base module it emits is what this file is appended to.
  await writeFile(
    resolve(root, 'src/themes.ts'),
    [
      '/* Generated by style-dictionary. Do not edit. */',
      '',
      '/**',
      ' * The two palettes, for JavaScript that cannot read a custom property: the',
      " * tool chrome around a preview, a chart library that wants a series' colour",
      ' * as a string, a canvas that paints its own pixels.',
      ' *',
      ' * PREFER THE CUSTOM PROPERTY wherever CSS can reach: a value read here is a',
      ' * value taken at build time, so it does not follow a theme the reader',
      ' * changes. This is for the places where there is no element to read from.',
      ' */',
      `export const themes = ${JSON.stringify({ light: await themeValues(light), dark: await themeValues(dark) }, null, 2)} as const;`,
      '',
      'export type ThemeName = keyof typeof themes;',
      '',
      '/** The groups a theme picker lists the themes under, in order. */',
      `export const themeGroups = ${JSON.stringify(groups, null, 2)} as const;`,
      '',
      'export type ThemeGroupId = (typeof themeGroups)[number][\'id\'];',
      '',
      '/**',
      ' * Every theme, in the order a picker lists them. `id` is the value of the',
      ' * data-palette attribute that paints it (the default paints with none),',
      ' * `swatch` the colours a picker draws its thumbnail with in each mode, and',
      ' * `tint` and `contrast` the profile the palette suite measures it under.',
      ' */',
      `export const themeRegistry = ${JSON.stringify(
        await Promise.all(
          palettes.map(async (palette) => ({
            id: palette.id,
            name: palette.meta.name,
            group: palette.meta.group,
            tag: palette.meta.tag,
            description: palette.meta.description,
            tint: palette.meta.tint ?? null,
            contrast: palette.meta.contrast ?? 'standard',
            swatch: { dark: swatchOf(await themeValues(palette.dark)), light: swatchOf(await themeValues(palette.light)) },
          })),
        ),
        null,
        2,
      )} as const;`,
      '',
      'export type ThemeEntry = (typeof themeRegistry)[number];',
      'export type ThemeId = ThemeEntry[\'id\'];',
      '',
      '/** The theme a document that names none gets: it paints the bare root. */',
      `export const DEFAULT_THEME_ID: ThemeId = '${DEFAULT_THEME}';`,
      '',
      '/** Whether a stored or typed value names a theme this build ships. */',
      'export function isThemeId(value: unknown): value is ThemeId {',
      '  return typeof value === \'string\' && themeRegistry.some((theme) => theme.id === value);',
      '}',
      '',
    ].join('\n'),
  );
  await writeFile(
    resolve(root, 'src/index.ts'),
    `${await readFile(resolve(root, 'src/index.ts'), 'utf8')}\nexport { themes, themeGroups, themeRegistry, DEFAULT_THEME_ID, isThemeId } from './themes.js';\nexport type { ThemeName, ThemeGroupId, ThemeEntry, ThemeId } from './themes.js';\n`,
  );

  console.warn(
    `[tokens] built CSS, the default light and dark palettes and ${palettes.length - 1} named themes, density, breakpoints, the document baseline, legacy aliases, font faces, the Material Symbols loader, and the TS module`,
  );
}

if (process.argv.includes('--watch')) {
  await startWatching();
} else {
  // A one-shot build starts from an empty dist/. Style Dictionary only cleans
  // the files it generates itself, so anything else (the tsc output, or a
  // stylesheet a later change stopped generating) would otherwise survive
  // from an earlier build and be packed into the next tarball.
  await rm(resolve(root, 'dist'), { recursive: true, force: true });
  await build();
}

// Watch mode for `npm run dev`. The one-shot build above only regenerates the
// CSS and src/index.ts; the typed module in dist/ comes from tsc, so watch
// mode also runs tsc in watch mode against the regenerated source. Token,
// stylesheet and font changes trigger a rebuild. A failed build (for example a
// JSON syntax error mid-edit, including at startup) is reported and the
// watcher keeps running, so the next save recovers without restarting the dev
// loop.
async function startWatching() {
  // Editors often emit several events for one save; a short quiet period
  // folds them into a single rebuild without a noticeable delay.
  const REBUILD_DEBOUNCE_MS = 100;

  let timer;
  let running = false;
  let pending = false;

  const rebuild = async () => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      await build();
    } catch (error) {
      console.error('[tokens] rebuild failed:', error);
    } finally {
      running = false;
    }
    if (pending) {
      pending = false;
      await rebuild();
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, REBUILD_DEBOUNCE_MS);
  };

  // Generate src/index.ts before tsc starts, so its first pass compiles the
  // current tokens instead of reporting a missing module.
  await rebuild();

  const requireFromScript = createRequire(import.meta.url);
  const tsc = spawn(
    process.execPath,
    [requireFromScript.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'],
    { cwd: root, stdio: 'inherit' },
  );

  const watchers = [tokensDir, fontsDir, stylesheetsDir].map((dir) => watch(dir, { recursive: true }, schedule));

  const stop = (exitCode) => {
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    if (tsc.exitCode === null) tsc.kill();
    process.exit(exitCode);
  };

  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));
  // The tsc child must never outlive this process, including when it ends on
  // an uncaught exception rather than through stop().
  process.on('exit', () => {
    if (tsc.exitCode === null) tsc.kill();
  });
  tsc.on('exit', (code, signal) => {
    // An interrupt from the terminal reaches tsc as well; that is a normal
    // shutdown, not a failure.
    if (signal === 'SIGINT' || signal === 'SIGTERM') {
      stop(0);
      return;
    }
    // Without tsc the dev loop would silently stop updating dist/index.js,
    // so losing it ends watch mode rather than leaving a half-working watcher.
    console.error(`[tokens] tsc watcher exited with code ${code}; stopping watch mode`);
    stop(code || 1);
  });

  console.warn('[tokens] watching tokens/, stylesheets/ and fonts/ for changes');
}
