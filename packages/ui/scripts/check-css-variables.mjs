#!/usr/bin/env node
// The rules EVERY component in the package keeps, checked over all of src/.
//
// Its sibling, check-css-literals.mjs, holds the rules a folder opts into as
// it is rewritten onto the token layer. These are the ones nothing may break
// at any point, because each of them fails silently in production:
//
//   1. A name in a token namespace (--color-*, --font-*, --spacing-* and the
//      rest of TOKEN_PREFIXES) must be one the @crewlethq/tokens build emits,
//      whether or not the reference carries a fallback. A `var(--name)` that
//      resolves to nothing is not an error the browser reports: the property
//      falls back to its initial value, and a `var(--name, x)` with a misspelt
//      name quietly renders `x` forever.
//   2. Every other name belongs to a component and is namespaced --crewlet-*,
//      both where it is read and where it is declared, so a component never
//      claims a name an application stylesheet may already use.
//   3. A --crewlet-* name read without a fallback must be declared somewhere
//      in the scanned source.
//   4. No glyph is drawn as a Material Symbols ligature. A component that
//      spells `material-symbols-outlined` renders the WORD until a stylesheet
//      it does not own has fetched a font from a third-party host, and renders
//      that word for good on a closed network.
//   5. Nothing loads from a host: no `url()` with a scheme or a protocol
//      relative path, and no `@import` of a remote stylesheet. A design system
//      that phones home is one an air-gapped deployment cannot use and a
//      strict Content-Security-Policy refuses.
//   6. No `body.theme-*` selector. The theme is a contract on the ROOT element
//      now, and a body class silently paints nothing.
//   7. `--color-text-muted` is the DECORATION step, measured into the 2.8 to
//      4.5 band on purpose, so it is never the `color` of anything but an svg.
//      Anything a reader has to make out takes --color-text-tertiary.
//   8. A `:focus-visible` rule does not turn the outline off without putting
//      one back. Forced-colors mode drops every box-shadow and keeps outlines,
//      so a ring drawn as a shadow alone disappears for exactly the readers
//      who most need one. A component that also wants a shadow pairs it with a
//      transparent outline, which forced colors then substitutes into.
//
// It reads the built token stylesheets, so it runs after the tokens build; the
// turbo lint task depends on it.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineOf, readSources, report, rules, withoutComments } from './css-source.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TOKEN_PREFIXES = [
  '--blur-',
  '--breakpoint-',
  '--color-',
  '--density',
  '--font-',
  '--motion-',
  '--radius-',
  '--shadow-',
  '--size-',
  '--spacing-',
  '--z-index-',
];
const COMPONENT_PREFIX = '--crewlet-';

const NAME = '--[A-Za-z0-9_-]+';
const REFERENCE = new RegExp(`var\\(\\s*(${NAME})\\s*(,)?`, 'g');
// A declaration in a stylesheet: the name at the start of a declaration.
const CSS_DECLARATION = new RegExp(`(?:^|[{;\\s])(${NAME})\\s*:`, 'g');
// A declaration from a script: a quoted name used as a style key or passed to
// style.setProperty().
const SCRIPT_DECLARATION = new RegExp(`['"\`](${NAME})['"\`]`, 'g');

const REMOTE_URL = /url\(\s*['"]?(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const REMOTE_IMPORT = /@import\s+(?:url\()?\s*['"]?(?:[a-z][a-z0-9+.-]*:)?\/\//i;

function tokenNames() {
  const require = createRequire(import.meta.url);
  let tokensCss;
  try {
    tokensCss = require.resolve('@crewlethq/tokens/css');
  } catch (error) {
    throw new Error(
      `cannot resolve @crewlethq/tokens/css (${error.message}). Build the tokens package first: npm run build --workspace @crewlethq/tokens`,
    );
  }
  const directory = dirname(tokensCss);
  const names = new Set();
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.css'))) {
    const text = withoutComments(readFileSync(join(directory, file), 'utf8'), true);
    for (const match of text.matchAll(CSS_DECLARATION)) names.add(match[1]);
  }
  if (names.size === 0) {
    throw new Error(`found no custom properties in ${directory}; the tokens build output is empty`);
  }
  return names;
}

export async function findings(roots, base = packageRoot) {
  const tokens = tokenNames();
  const files = readSources(roots, base);
  const declared = new Set();
  const references = [];
  const problems = [];

  for (const file of files) {
    const { text, isStylesheet } = file;
    const where = (index) => `${file.where}:${lineOf(text, index)}`;

    for (const match of text.matchAll(isStylesheet ? CSS_DECLARATION : SCRIPT_DECLARATION)) {
      const name = match[1];
      declared.add(name);
      if (!name.startsWith(COMPONENT_PREFIX)) {
        problems.push(
          `${where(match.index)}: declares ${name}; a component declares only ${COMPONENT_PREFIX}* names (token values belong in @crewlethq/tokens)`,
        );
      }
    }
    for (const match of text.matchAll(REFERENCE)) {
      references.push({ name: match[1], hasFallback: match[2] === ',', where: where(match.index) });
    }

    const ligature = text.indexOf('material-symbols-outlined');
    if (ligature >= 0) {
      problems.push(
        `${where(ligature)}: draws a glyph as a Material Symbols ligature. Use a component from @crewlethq/icons/glyphs, which ships the drawing`,
      );
    }
    for (const [pattern, said] of [
      [REMOTE_URL, 'loads from a host with url(). Inline the asset or ship it in the package'],
      [REMOTE_IMPORT, 'imports a remote stylesheet. A design system must not phone home'],
      [/body\.theme-[a-z]+/, 'selects a body theme class. The theme is a contract on the root element'],
    ]) {
      const found = text.search(pattern);
      if (found >= 0) problems.push(`${where(found)}: ${said}`);
    }

    if (!isStylesheet) continue;

    for (const { selector, body, index } of rules(text)) {
      if (/(^|[;{\s])color\s*:[^;]*--color-text-muted/.test(body) && !/\bsvg\b/.test(selector)) {
        problems.push(
          `${where(index)}: paints text with --color-text-muted, which is the decoration step (2.8 to 4.5:1 by design). Use --color-text-tertiary for anything a reader has to make out`,
        );
      }
      if (!selector.includes(':focus')) continue;
      const turnsOff = /(^|[;{\s])outline\s*:\s*(none|0)\s*(;|$)/.test(body);
      const putsBack = /outline\s*:[^;]*(solid|auto|dashed|dotted)/.test(body) || /forced-colors/.test(selector);
      if (turnsOff && !putsBack) {
        problems.push(
          `${where(index)}: turns the outline off on ${selector.trim()} without putting one back. Forced-colors mode drops every box-shadow and keeps outlines, so a shadow-only ring is no ring at all there. Draw the ring as an outline, or pair --shadow-focus with "outline: 2px solid transparent"`,
        );
      }
    }
  }

  for (const { name, hasFallback, where } of references) {
    if (TOKEN_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      if (!tokens.has(name)) {
        problems.push(
          `${where}: reads ${name}, which @crewlethq/tokens does not emit. Use an existing token or add it to packages/tokens/tokens/`,
        );
      }
    } else if (!name.startsWith(COMPONENT_PREFIX)) {
      problems.push(
        `${where}: reads ${name}, which is neither a @crewlethq/tokens variable nor a ${COMPONENT_PREFIX}* component variable`,
      );
    } else if (!hasFallback && !declared.has(name)) {
      problems.push(`${where}: reads ${name} without a fallback, and nothing in the scanned source declares it`);
    }
  }

  return {
    problems,
    checked: `${references.length} custom property references over ${files.length} files, against ${tokens.size} token variables and ${declared.size} component declarations`,
  };
}

async function main() {
  const given = process.argv.slice(2).map((path) => resolve(process.cwd(), path));
  const roots = given.length > 0 ? given : [join(packageRoot, 'src')];
  const { problems, checked } = await findings(roots, given.length > 0 ? process.cwd() : packageRoot);
  report('CSS custom property check', problems, checked);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) await main();
