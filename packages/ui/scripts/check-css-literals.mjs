#!/usr/bin/env node
// Refuses a value a component should have taken from a token, over the folders
// it is given.
//
// WHY IT TAKES FOLDERS. Its sibling, check-css-variables.mjs, runs over the
// whole package and holds rules no component may break at any point. This one
// holds the rules a folder OPTS INTO as it is rewritten onto the token layer,
// so a component that has not been rewritten yet does not have to be
// allow-listed to keep the build green. The list of folders in the package's
// lint script is the record of which are done; when the last one lands, the
// list becomes `src` and this paragraph goes with it.
//
// It is also the published bin, `crewlet-css-check`, so a consumer can hold
// its own stylesheets to the same rules.
//
// THE RULES.
//
//  1. No colour literal. A hex, an rgb(), an hsl() or a named colour is a
//     colour that does not follow the theme, and a fallback literal inside
//     var() is the same thing with a comforting shape: it is what renders
//     whenever the token name is misspelt, so it hides the very failure it
//     looks like insurance against.
//  2. No px font size, no literal radius, no literal duration, no literal
//     z-index. Each of those is a scale, and a component that spends a number
//     off the scale is a component that drifts from the one beside it.
//  3. No color-mix(). Mixing two tokens produces a third colour nobody
//     measured, which is how a "warning text" step ended up at 4.41:1.
//  4. An animation or a transition is paired with a reduced-motion rule IN THE
//     SAME FILE. The document baseline collapses motion too, but a component
//     is also used in an application that does not import the baseline.
//  5. A media query's length is one of the breakpoint tokens. A media query
//     cannot read a custom property, so the number has to be written out; this
//     is what says it is still the same number.
//  6. No hover overlay on a pseudo element. A row shows the selected tint or
//     the hover overlay, never both, because both are a background on the same
//     element and the selected state wins. Drawing the hover on a ::before is
//     the one way to stack them, and it produces a composite nothing measured.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lineOf, readSources, report, rules } from './css-source.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const NAMED_COLOURS =
  /\b(aqua|black|blue|fuchsia|gray|grey|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|orange|pink|brown|violet|indigo|gold|beige|coral|crimson|cyan|magenta|salmon|tan|turquoise)\b/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOUR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/;
const DURATION = /(?<![\w-])\d*\.?\d+m?s\b/;
const LENGTH_IN_QUERY = /(\d*\.?\d+)px/g;

/** Properties whose value is a colour, so a literal in one is a colour literal. */
const COLOUR_PROPERTY =
  /^(color|background|background-color|border(-(top|right|bottom|left))?-color|border|border-(top|right|bottom|left)|outline|outline-color|fill|stroke|box-shadow|text-shadow|caret-color|column-rule-color|text-decoration-color|accent-color|scrollbar-color|--crewlet-[\w-]*)$/;

function declarations(body) {
  const found = [];
  for (const part of body.split(';')) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    found.push({ property: part.slice(0, at).trim().toLowerCase(), value: part.slice(at + 1).trim() });
  }
  return found;
}

/** A value with every var() reference removed, so only its own literals remain. */
function withoutTokens(value) {
  let text = value;
  let previous;
  do {
    previous = text;
    // Innermost var() first, so a nested fallback is stripped with its parent.
    text = text.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, ' ');
  } while (text !== previous);
  return text;
}

/**
 * The breakpoint steps, from the tokens package's own typed export.
 *
 * `import.meta.resolve` rather than `createRequire().resolve`: the tokens
 * package declares only an `import` condition, so CJS resolution refuses its
 * main entry outright.
 */
async function breakpoints() {
  const { breakpoint } = await import(import.meta.resolve('@crewlethq/tokens'));
  return new Set(Object.values(breakpoint).map((value) => Number.parseFloat(String(value))));
}

export async function findings(roots, base = packageRoot) {
  const files = readSources(roots, base, /\.css$/);
  const problems = [];
  const allowed = await breakpoints();

  for (const file of files) {
    const at = (index) => `${file.where}:${lineOf(file.text, index)}`;
    const hasReducedMotion = file.text.includes('prefers-reduced-motion');

    for (const { selector, body, index } of rules(file.text)) {
      const where = at(index);
      const inQuery = /@media/.test(selector);

      if (inQuery) {
        for (const match of selector.matchAll(LENGTH_IN_QUERY)) {
          if (!allowed.has(Number(match[1]))) {
            problems.push(
              `${where}: the media query switches at ${match[0]}, which is not a breakpoint token. Use one of ${[...allowed].sort((a, b) => a - b).join('px, ')}px, or add the step to packages/tokens/tokens/breakpoint.json`,
            );
          }
        }
      }

      if (/:hover\s*::?(before|after)\b/.test(selector) && /(^|;|\s)background/.test(body)) {
        problems.push(
          `${where}: draws a hover overlay on a pseudo element. A row shows the selected tint or the hover overlay, never both, and a pseudo element is the one way to stack them into a composite nothing has measured`,
        );
      }

      for (const { property, value } of declarations(body)) {
        const bare = withoutTokens(value);
        const colourish = COLOUR_PROPERTY.test(property);
        if (colourish && (HEX.test(bare) || COLOUR_FUNCTION.test(bare) || NAMED_COLOURS.test(bare))) {
          problems.push(`${where}: ${property} carries a colour literal (${value.trim()}). Every colour comes from a token`);
        }
        if (value.includes('color-mix(')) {
          problems.push(
            `${where}: ${property} uses color-mix(), which makes a colour nobody measured. Add the step to packages/tokens/tokens/ instead`,
          );
        }
        if (property === 'font-size' && /(?<![\w-])\d*\.?\d+(px|rem|em)\b/.test(bare)) {
          problems.push(`${where}: font-size is a literal (${value.trim()}). Use a --font-size-* token`);
        }
        if (/^border(-[a-z]+)?-radius$/.test(property) && /(?<![\w-])\d*\.?\d+(px|rem|em)\b/.test(bare)) {
          problems.push(`${where}: ${property} is a literal (${value.trim()}). Use a --radius-* token`);
        }
        if (/^(transition|animation)(-duration|-delay)?$/.test(property) && DURATION.test(bare)) {
          problems.push(`${where}: ${property} carries a literal duration (${value.trim()}). Use a --motion-duration-* token`);
        }
        if (property === 'z-index' && /^-?\d+$/.test(bare.trim()) && Math.abs(Number(bare.trim())) > 1) {
          problems.push(`${where}: z-index is a literal (${value.trim()}). Use a --z-index-* token, or the Layer module's own depth`);
        }
      }
    }

    if (!hasReducedMotion && /(^|[;{\s])(animation|transition)\s*:/.test(file.text)) {
      problems.push(
        `${file.where}: animates or transitions with no prefers-reduced-motion rule in the file. The document baseline is opt-in, so a component states its own`,
      );
    }
  }

  return { problems, checked: `${files.length} stylesheets in ${roots.length} folder(s)` };
}

async function main() {
  const roots = process.argv.slice(2).map((path) => resolve(process.cwd(), path));
  if (roots.length === 0) {
    console.error('usage: check-css-literals.mjs <folder> [folder...]');
    process.exitCode = 2;
    return;
  }
  const { problems, checked } = await findings(roots);
  report('CSS literal check', problems, checked);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) await main();
