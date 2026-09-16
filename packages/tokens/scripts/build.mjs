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
import { withAlpha } from '../test/color.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// The token source
// ---------------------------------------------------------------------------

// tokens/*.json holds the base: the marketing palette weblet reads, and every
// token that does not change with a theme. tokens/themes/*.json holds the
// slots that do. The base carries the DARK value of every themed slot, so an
// application that imports tokens.css alone still has a value for all of them.
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
const SOFT_ONLY = ['onboarding', 'execute', 'review'];

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
function deriveTints(tokens, where) {
  const fill = (group, name) => {
    const token = tokens.color?.[group]?.[name];
    if (token === undefined) throw new Error(`${where}: color.${group}.${name} is missing, and its soft tint is derived from it`);
    return token.value;
  };
  for (const name of SOFT_AND_LINE) {
    tokens.color.feedback[`${name}Soft`] = { value: withAlpha(fill('feedback', name), SOFT_ALPHA) };
    tokens.color.feedback[`${name}Line`] = { value: withAlpha(fill('feedback', name), LINE_ALPHA) };
  }
  for (const name of SOFT_ONLY) {
    tokens.color.phase[`${name}Soft`] = { value: withAlpha(fill('phase', name), SOFT_ALPHA) };
  }
  for (const name of NODE_HUES) {
    tokens.color.node[`${name}Fill`] = { value: withAlpha(fill('node', name), NODE_FILL_ALPHA) };
    tokens.color.node[`${name}Line`] = { value: withAlpha(fill('node', name), NODE_LINE_ALPHA) };
    tokens.color.node[`${name}Halo`] = { value: withAlpha(fill('node', name), NODE_HALO_ALPHA) };
  }
  return tokens;
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
  /* Brand */
  --accent: var(--color-brand-primary);
  --primary-blue: var(--color-brand-primary);
  --accent-purple: var(--color-brand-primary);
  --accent-purple-deep: var(--color-brand-accent-deep);
  --accent-pink: var(--color-brand-highlight);
  --accent-slate: var(--color-brand-slate);
  --accent-gradient: var(--color-brand-gradient);

  /* Surface ramp */
  --bg-primary: var(--color-surface-topbar);
  --bg-secondary: var(--color-surface-topbar-lift);
  --bg-tertiary: var(--color-surface-topbar-active);
  --bg-elevated: var(--color-surface-topbar-active);

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
 * The theme contract, in three states.
 *
 *   :root                                                  light
 *   @media (prefers-color-scheme: dark) :root:not([data-theme="light"])   dark
 *   :root[data-theme="dark"]                               dark
 *
 * Light on the bare :root, so a document that sets nothing is light; the media
 * block for a reader whose system asks for dark; the attribute block so an
 * explicit choice wins in BOTH directions, which a media query alone cannot
 * do. The two dark blocks are written from one generated string, and the
 * palette suite compares them anyway.
 *
 * This file is imported AFTER tokens.css. Both use the :root selector and
 * neither adds specificity, so the later import is the one that paints, and
 * the palette suite reads the cascade in that same order.
 */
function themeOverrides(light, dark) {
  return `/* Generated by style-dictionary. The light and dark palettes, as a
   three-state contract on the root element. Import it after tokens.css:
       import '@crewlethq/tokens/css';
       import '@crewlethq/tokens/css/themes';

   A document with no data-theme attribute is light, or dark if its system
   asks for dark. Setting data-theme="light" or data-theme="dark" on
   <html> pins one, and wins in both directions. Remove the attribute to
   follow the system again. Both dark blocks are generated from one source. */

/* Light. The default, on the bare root, so a document that sets nothing gets
   a complete palette. */
:root {
  color-scheme: light;

${light}
}

/* Dark, for a reader whose system asks for it and who has not pinned light. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

${dark
  .split('\n')
  .map((line) => (line === '' ? line : `  ${line}`))
  .join('\n')}
  }
}

/* An explicit choice, which wins whichever way the system is set. */
:root[data-theme="dark"] {
  color-scheme: dark;

${dark}
}
`;
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
// Fonts stylesheet responses the files were downloaded from, so a page that
// renders only basic Latin text downloads a single file per family.
// latin-ext is declared first: the two ranges share
// U+0304, U+0308 and U+0329, and when faces with identical descriptors
// overlap the browser checks the one declared last first, so those combining
// marks resolve from the latin file a Latin page has already downloaded.
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

// `weight` is the wght axis range recorded in each shipped file's fvar table
// (Inter 100 to 900, JetBrains Mono 100 to 800). Declaring the real range lets
// the browser render every font.weight token inside it from the variable font
// instead of synthesising bold; a narrower range would clamp the heavier
// weights the file can actually draw.
const FONT_FAMILIES = [
  { family: 'Inter', file: 'inter', weight: '100 900' },
  { family: 'JetBrains Mono', file: 'jetbrains-mono', weight: '100 800' },
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

   Inter and JetBrains Mono are licensed under the SIL Open Font License 1.1.
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
  const light = validate(deriveTints(await readTokenFile(resolve(themesDir, 'light.json')), 'tokens/themes/light.json'), 'tokens/themes/light.json');
  const dark = validate(deriveTints(await readTokenFile(resolve(themesDir, 'dark.json')), 'tokens/themes/dark.json'), 'tokens/themes/dark.json');

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
    ].join('\n'),
  );
  await writeFile(
    resolve(root, 'src/index.ts'),
    `${await readFile(resolve(root, 'src/index.ts'), 'utf8')}\nexport { themes } from './themes.js';\nexport type { ThemeName } from './themes.js';\n`,
  );

  console.warn(
    '[tokens] built CSS, light and dark themes, density, breakpoints, the document baseline, legacy aliases, font faces, the Material Symbols loader, and the TS module',
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
