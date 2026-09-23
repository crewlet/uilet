#!/usr/bin/env node
// Refuses a value a component should have taken from a token, over the folders
// it is given. The package's own lint runs it over all of src/, so every
// component keeps these rules at every commit.
//
// WHY IT TAKES FOLDERS. It is also the published bin, `crewlet-css-check`, so
// a consumer can hold its own stylesheets to the same rules, and a consumer's
// stylesheets live wherever its build puts them.
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
//  4. EVERY MOTION IS PAIRED WITH ITS STOP. A rule that starts an animation or
//     a transition is named again, selector for selector, by a later rule in
//     the same file inside `@media (prefers-reduced-motion: reduce)` that sets
//     it to `none` (or takes the element out with `display: none`), unless it
//     only starts inside `@media (prefers-reduced-motion: no-preference)`.
//     The document baseline collapses motion too, but a component is also
//     used in an application that does not import the baseline.
//     THE SAME SELECTOR, LATER, because that is the one arrangement the
//     cascade guarantees: the two tie on specificity and the stop wins on
//     source order. The rule was "the file mentions prefers-reduced-motion",
//     and three components passed it while still moving for a reader who had
//     asked them not to. DataTable stopped everything under a catch-all,
//     `.crewlet-data-table.crewlet-data-table *`, which is two classes, and
//     its row's transition was two classes and two elements. TreeCanvas
//     stopped `.crewlet-tree-canvas__card--composing`, one class, where the
//     ghost's arrival started on two. And TreeCanvas stopped its node
//     controls ABOVE the rules that started them, so source order handed
//     every tie back to the motion. A stop that looks broader is not one the
//     check can verify, and all three of those looked right. LATER is where
//     a browser places it: declarations written after a block nested in their
//     rule come after that block, so a motion below a nested stop beats it.
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

/** The declarations that start a motion, and the one each belongs to. */
const MOTION = new Map([
  ['animation', 'animation'],
  ['animation-name', 'animation'],
  ['transition', 'transition'],
  ['transition-property', 'transition'],
]);

/** The one query a stop is read inside: exactly this, with nothing else around it. */
const REDUCE = /^@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/;

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
 * One selector, spelled one way: whitespace collapsed, none round a combinator,
 * and one kind of quote. Two spellings of one selector are one selector here,
 * so a stop is never refused for its layout.
 */
function normalSelector(selector) {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/"/g, "'")
    .trim();
}

/** A selector list split at its own commas, not the ones inside `:not(…)` or `[…]`. */
function selectorList(list) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let at = 0; at < list.length; at += 1) {
    const char = list[at];
    if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(list.slice(from, at));
      from = at + 1;
    }
  }
  parts.push(list.slice(from));
  return parts;
}

/**
 * The selectors a block's own declarations apply to, with any nesting
 * resolved, or null for a block that declares for no element: a top-level
 * at-rule, or a keyframe.
 */
function appliesTo(block) {
  let list = null;
  for (const head of [...block.context, block.selector]) {
    if (/^@keyframes\b/.test(head)) return null;
    if (head.startsWith('@')) continue;
    const parts = selectorList(head);
    list =
      list === null
        ? parts
        : list.flatMap((parent) => parts.map((part) => (part.includes('&') ? part.replaceAll('&', parent) : `${parent} ${part}`)));
  }
  return list === null ? null : list.map(normalSelector);
}

/** The conditional heads a block sits under, its own included when it is one. */
function conditions(block) {
  return [...block.context, block.selector].filter((head) => head.startsWith('@')).map((head) => head.replace(/\s+/g, ' '));
}

/**
 * Whether a block's declarations reach a browser only when the reader has NOT
 * asked for less motion. Only a plain conjunction counts: under `not`, `or` or
 * a comma list the same block also applies to a reader who has.
 */
function onlyWithMotion(heads) {
  return heads.some(
    (head) =>
      /^@media\b/.test(head) && /\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/.test(head) && !/,|\bor\b|\bnot\b/.test(head),
  );
}

/**
 * Rule 4: every rule that starts a motion, answered selector for selector by a
 * later stop in the same file. Returns the findings.
 */
function unpairedMotion(file) {
  const starts = [];
  const stops = [];
  for (const block of rules(file.text)) {
    const selectors = appliesTo(block);
    if (selectors === null) continue;
    const heads = conditions(block);
    const reduced = heads.some((head) => /prefers-reduced-motion\s*:\s*reduce/.test(head));
    const isStop = heads.length === 1 && REDUCE.test(heads[0] ?? '');
    for (const { property, value } of declarations(block.body)) {
      const important = /!\s*important\s*$/i.test(value);
      const bare = value.replace(/!\s*important\s*$/i, '').trim().toLowerCase();
      if (isStop && property === 'display' && bare === 'none') {
        for (const family of ['animation', 'transition']) stops.push({ family, selectors, index: block.index, important });
        continue;
      }
      const family = MOTION.get(property);
      if (family === undefined) continue;
      if (isStop && bare === 'none') stops.push({ family, selectors, index: block.index, important });
      // Motion declared for a reader who asked for less is a deliberate
      // alternative, such as a fade in place of a slide, and motion declared
      // only for a reader who did not ask needs no stop.
      if (reduced || onlyWithMotion(heads) || bare === 'none') continue;
      starts.push({ family, property, selectors, index: block.index, important });
    }
  }

  const problems = [];
  for (const start of starts) {
    for (const selector of start.selectors) {
      const stopped = stops.some(
        (stop) =>
          stop.family === start.family &&
          stop.index > start.index &&
          (stop.important || !start.important) &&
          stop.selectors.includes(selector),
      );
      if (stopped) continue;
      problems.push(
        `${file.where}:${lineOf(file.text, start.index)}: ${start.property} on ${selector} has no reduced-motion stop. Name the same selector in a later rule of this file inside @media (prefers-reduced-motion: reduce) and set ${start.family}: none, or start it inside @media (prefers-reduced-motion: no-preference): a stop naming another selector can lose on specificity, and one above the rule it stops loses on source order`,
      );
    }
  }
  return problems;
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

    for (const { selector, body, index, nestedDeclarations } of rules(file.text)) {
      const where = at(index);

      // Declarations resumed after a nested block carry their block's head
      // again, and the head was read with the block.
      if (/^@media\b/.test(selector) && !nestedDeclarations) {
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

    problems.push(...unpairedMotion(file));
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
