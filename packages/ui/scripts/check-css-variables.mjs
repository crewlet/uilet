// Checks every CSS custom property the components read or declare against
// the contract they rely on, and fails the lint step on any mismatch.
//
// A `var(--name)` that resolves to nothing is not an error the browser
// reports: the property silently falls back to its initial value (a
// transparent background, an inherited colour), and a `var(--name, x)` with
// a misspelt name quietly renders `x` forever. Both shapes shipped before
// this check existed, so the rules are enforced here rather than remembered:
//
//   1. A name in a token namespace (--color-*, --font-*, --spacing-* and the
//      rest of TOKEN_PREFIXES) must be one the @crewlethq/tokens build
//      emits, whether or not the reference carries a fallback.
//   2. Every other name belongs to a component and is namespaced --crewlet-*,
//      both where it is read and where it is declared, so a component never
//      claims a name an application stylesheet may already use.
//   3. A --crewlet-* name read without a fallback must be declared somewhere
//      in src/, in a stylesheet or through an inline style.
//
// It reads the built token stylesheets, so it runs after the tokens build;
// the turbo lint task depends on it.

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(packageRoot, 'src');

const TOKEN_PREFIXES = [
  '--blur-',
  '--breakpoint-',
  '--color-',
  '--font-',
  '--motion-',
  '--radius-',
  '--shadow-',
  '--spacing-',
  '--z-index-',
];
const COMPONENT_PREFIX = '--crewlet-';

const NAME = '--[A-Za-z0-9_-]+';
const REFERENCE = new RegExp(`var\\(\\s*(${NAME})\\s*(,)?`, 'g');
// A declaration in a stylesheet: the name at the start of a declaration.
const CSS_DECLARATION = new RegExp(`(?:^|[{;\\s])(${NAME})\\s*:`, 'g');
// A declaration from a script: a quoted name used as a style key or passed
// to style.setProperty().
const SCRIPT_DECLARATION = new RegExp(`['"\`](${NAME})['"\`]`, 'g');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(css|tsx?)$/.test(entry.name) ? [path] : [];
  });
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

// Comments are blanked rather than removed, so line numbers stay exact.
function withoutComments(text, isStylesheet) {
  const pattern = isStylesheet ? /\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  return text.replace(pattern, (comment) => comment.replace(/[^\n]/g, ' '));
}

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

const tokens = tokenNames();
const declared = new Set();
const references = [];
const problems = [];

for (const path of sourceFiles(sourceRoot)) {
  const isStylesheet = path.endsWith('.css');
  const text = withoutComments(readFileSync(path, 'utf8'), isStylesheet);
  const where = (index) => `${relative(packageRoot, path)}:${lineOf(text, index)}`;

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
    problems.push(`${where}: reads ${name} without a fallback, and nothing in src/ declares it`);
  }
}

if (problems.length > 0) {
  console.error(`CSS custom property check failed:\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.warn(
    `[ui] ${references.length} custom property references checked against ${tokens.size} token variables and ${declared.size} component declarations`,
  );
}
