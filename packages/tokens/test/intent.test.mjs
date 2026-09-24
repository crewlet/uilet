/**
 * The design record, tokens/intent.json, held to what it says it is.
 *
 * It is the approved palette every shipped colour is measured from: a moved
 * token's comment quotes it, and scripts/fit-palette.mjs fits from it. It is
 * not a token file, so nothing the palette suite measures reaches it, and the
 * ways it can go wrong are its own: a token renamed out from under it, leaving
 * a design value that maps to nothing; one palette's record edited and not the
 * other's; a value spelled so a reader cannot parse it; or the build starting
 * to read it as a token group and emitting the design's own names. The
 * artboards themselves are not in this repository, so what the record says the
 * design is cannot be checked here, only that it is a record.
 *
 * It reads the token source, which the tarball does not carry, so it stays out
 * of the tarball, like build.test.mjs.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cascade, parseHex, parseRgba } from './color.mjs';
import * as typed from '../dist/index.js';

const intent = JSON.parse(readFileSync(fileURLToPath(new URL('../tokens/intent.json', import.meta.url)), 'utf8'));
const read = (name) => readFileSync(fileURLToPath(new URL(`../dist/css/${name}`, import.meta.url)), 'utf8');
const themesCss = read('themes.css');
const tokensCss = read('tokens.css');

const PALETTES = ['dark', 'light'];

/** The block that paints each palette: dark on the bare root, light by attribute. */
const blocks = {
  dark: cascade([{ name: 'themes.css', css: themesCss }], (block) => block.atRule === null && block.selector === ':root'),
  light: cascade([{ name: 'themes.css', css: themesCss }], (block) => block.atRule === null && block.selector === ':root[data-theme="light"]'),
};

/** Every entry of one palette's record, the literals included, as [where, entry]. */
const entriesOf = (palette) => [
  ...Object.entries(intent[palette]),
  ...intent.literals.map((literal) => [literal.where, literal]),
];

/** A colour as the record spells one: a lower-case #rrggbb, or rgba() with spaced channels and a leading zero. */
const colour = (value) => /^#[0-9a-f]{6}$/.test(value) || /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0?\.\d+\)$/.test(value);

describe('the design record', () => {
  test('it records both palettes, and the artboards they come from', () => {
    assert.deepEqual(Object.keys(intent).filter((key) => !key.startsWith('$')), ['artboards', 'dark', 'light', 'literals']);
    assert.equal(intent.artboards.length, 12);
    for (const palette of PALETTES) assert.ok(Object.keys(intent[palette]).length >= 30, `${palette} records ${Object.keys(intent[palette]).length} declarations`);
  });

  test('the two palettes declare the same names, in the same order, for the same tokens', () => {
    // The artboards' two blocks are one list of names with two sets of values:
    // a name one palette records and the other does not is an edit to one of
    // them, and a name mapped to two different tokens says the design means
    // two different things by it.
    assert.deepEqual(Object.keys(intent.light), Object.keys(intent.dark));
    for (const [name, entry] of Object.entries(intent.dark)) {
      assert.equal(intent.light[name].token, entry.token, `${name} ships as ${entry.token} in dark and ${intent.light[name].token} in light`);
    }
  });

  test('every token it names is one the palette it names declares', () => {
    // A renamed or removed token leaves the design value it shipped pointing
    // at nothing, which reads exactly like a design value nothing ships.
    for (const palette of PALETTES) {
      const missing = entriesOf(palette)
        .filter(([, entry]) => entry.token !== null && !blocks[palette].has(entry.token))
        .map(([where, entry]) => `${where}: ${entry.token}`);
      assert.deepEqual(missing, [], `${palette} names tokens themes.css does not declare`);
    }
    assert.ok(blocks.dark.size > 80 && blocks.light.size > 80, 'the theme blocks were not read');
  });

  test('no token is claimed by two of the design values of one palette', () => {
    for (const palette of PALETTES) {
      const tokens = entriesOf(palette).map(([, entry]) => entry.token).filter((token) => token !== null);
      assert.deepEqual(tokens.filter((token, i) => tokens.indexOf(token) !== i), [], palette);
    }
  });

  test('every value that maps to a token is a colour, and every one that maps to none says why', () => {
    for (const palette of PALETTES) {
      for (const [where, entry] of Object.entries(intent[palette])) {
        if (entry.token === null) assert.ok(typeof entry.note === 'string' && entry.note.length > 0, `${palette} ${where} maps to no token and gives no reason`);
        else assert.ok(colour(entry.value), `${palette} ${where} is "${entry.value}"`);
      }
    }
    for (const literal of intent.literals) {
      if (literal.token === null) assert.ok(typeof literal.note === 'string' && literal.note.length > 0, `${literal.where} maps to no token and gives no reason`);
      // The one literal that is a rule rather than a colour, the design's
      // hover, says so rather than passing as one.
      else assert.ok(colour(literal.value) || typeof literal.note === 'string', `${literal.where} is "${literal.value}"`);
    }
  });

  test('the values parse as the colours they spell', () => {
    // The spelling check above is a regex; this is the reader every other
    // colour in the package goes through, so the record cannot hold a value
    // only the regex accepts.
    for (const palette of PALETTES) {
      for (const [where, entry] of Object.entries(intent[palette])) {
        if (entry.token === null) continue;
        const parsed = parseHex(entry.value) ?? parseRgba(entry.value)?.rgb;
        assert.ok(parsed && [parsed.r, parsed.g, parsed.b].every((c) => c >= 0 && c <= 255), `${palette} ${where}: ${entry.value}`);
      }
    }
  });
});

describe('the build and the design record', () => {
  test('nothing is emitted from it', () => {
    // Merged as a token group, the record would put the design's own names on
    // :root (--dark-bg, --light-t3 and the rest) and in the typed export,
    // where a stylesheet could start reading them.
    const groups = Object.keys(intent).filter((key) => !key.startsWith('$'));
    const declared = [...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name);
    for (const group of groups) {
      assert.deepEqual(declared.filter((name) => name.startsWith(`--${group}-`)), [], `tokens.css declares the ${group} group`);
      assert.equal(typed[group], undefined, `the typed export has a ${group} group`);
    }
    assert.ok(declared.length > 100, `tokens.css declared only ${declared.length} custom properties`);
  });
});
