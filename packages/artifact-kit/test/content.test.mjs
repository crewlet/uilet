// The built content stylesheet, held to what it promises a page: it is a file
// a page opts into (kit.css carries none of it), it styles only what the
// page's author wrote and never what the kit draws, a class of the page's own
// always outweighs it, and every value it paints with is a token kit.css
// defines, so it follows every theme and reaches nothing off its origin.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { BUDGETS } from '../scripts/budgets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const content = readFileSync(join(dist, 'content.css'), 'utf8');
const kit = readFileSync(join(dist, 'kit.css'), 'utf8');

// The filter every rule's subject is held to, as the minifier writes it.
const FILTER =
  ':where(:not(crewlet-sheet,crewlet-sheet *,[class^=crewlet-],[class^=crewlet-] *,[class*=" crewlet-"],[class*=" crewlet-"] *,[data-crewlet-content=off],[data-crewlet-content=off] *))';

/** Splits text on `separator` where it stands outside brackets, parentheses and quotes. */
function splitTopLevel(text, isSeparator) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === ']') {
      depth -= 1;
    } else if (depth === 0 && isSeparator(char)) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Every selector of every style rule, at-rule preludes skipped. */
function selectorsOf(css) {
  const selectors = [];
  let prelude = '';
  let quote = '';
  for (const char of css) {
    if (quote) {
      prelude += char;
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      prelude += char;
      quote = char;
    } else if (char === '{') {
      const trimmed = prelude.trim();
      if (!trimmed.startsWith('@')) selectors.push(...splitTopLevel(trimmed, (c) => c === ','));
      prelude = '';
    } else if (char === '}' || char === ';') {
      prelude = '';
    } else {
      prelude += char;
    }
  }
  return selectors;
}

/** The selector with every `:where(...)` taken out, which is the part that weighs anything. */
function weighed(selector) {
  let out = '';
  let i = 0;
  while (i < selector.length) {
    if (selector.startsWith(':where(', i)) {
      let depth = 0;
      for (let j = i + ':where'.length; j < selector.length; j += 1) {
        if (selector[j] === '(') depth += 1;
        else if (selector[j] === ')' && (depth -= 1) === 0) {
          i = j + 1;
          break;
        }
      }
    } else {
      out += selector[i];
      i += 1;
    }
  }
  return out;
}

const selectors = selectorsOf(content);

describe('content.css', () => {
  test('is under its gzipped budget', () => {
    assert.ok(gzipSync(content).length <= BUDGETS.contentGzip, `${gzipSync(content).length} bytes`);
  });

  test('is opt in: kit.css carries none of it, so a page that does not link it paints as before', () => {
    assert.ok(selectors.length > 50, `${selectors.length} selectors`);
    assert.ok(!kit.includes('data-crewlet-content'));
  });

  test('is exported by the package under its own name', () => {
    const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.equal(exports['./content.css'], './dist/content.css');
  });

  test('styles only what the author wrote: the subject of every selector carries the filter', () => {
    for (const selector of selectors) {
      const compounds = splitTopLevel(selector, (c) => c === ' ' || c === '>' || c === '+' || c === '~').filter(Boolean);
      assert.ok(compounds.at(-1).startsWith(FILTER), selector);
    }
  });

  test('never outweighs a class of the page: nothing is weighed but elements, a focus ring and one hover', () => {
    for (const selector of selectors) {
      const rest = weighed(selector);
      assert.doesNotMatch(rest, /[.#[]/, selector);
      const pseudoClasses = [...rest.matchAll(/(?<!:):([a-z-]+)/g)].map((match) => match[1]);
      for (const name of pseudoClasses) {
        const allowed = name === 'is' || name === 'focus-visible' || (name === 'hover' && rest.includes('::file-selector-button:hover'));
        assert.ok(allowed, `${name} in ${selector}`);
      }
    }
  });

  test('never selects the document itself: no root, html, body or bare universal subject', () => {
    for (const selector of selectors) {
      assert.doesNotMatch(selector, /(^|[\s>+~,(])(html|body|:root)\b/, selector);
    }
  });

  test('paints only with tokens kit.css defines, and reaches nothing off its origin', () => {
    const read = new Set([...content.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((match) => match[1]));
    assert.ok(read.size > 20);
    for (const property of read) assert.ok(kit.includes(`${property}:`), `${property} is not defined by kit.css`);
    assert.doesNotMatch(content, /#[0-9a-f]{3,8}\b/i);
    assert.doesNotMatch(content, /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/);
    assert.doesNotMatch(content, /url\(|@import/);
  });

  test('ships flat: the nesting in its source is gone from what a browser reads', () => {
    assert.ok(!content.includes('&'));
  });
});
