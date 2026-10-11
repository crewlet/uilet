/**
 * The design records, tokens/themes/<id>/intent.json, held to what they say
 * they are.
 *
 * Each is the design a theme's shipped colours are measured from: a moved
 * token's comment quotes it, and scripts/fit-palette.mjs fits from it. It is
 * not a token file, so nothing the palette suite measures reaches it, and the
 * ways it can go wrong are its own: a token renamed out from under it, leaving
 * a design value that maps to nothing; one palette's record edited and not the
 * other's; a value spelled so a reader cannot parse it; or the build starting
 * to read it as a token group and emitting the design's own names. The
 * designs themselves are not in this repository, so what a record says the
 * design is cannot be checked here, only that it is a record.
 *
 * It reads the token source, which the tarball does not carry, so it stays out
 * of the tarball, like build.test.mjs.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cascade, parseHex, parseRgba } from './color.mjs';
import { paletteSelectors } from './palette.mjs';
import * as typed from '../dist/index.js';

const DEFAULT_THEME = 'crewlet';
const source = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const read = (name) => readFileSync(source(`dist/css/${name}`), 'utf8');
const tokensCss = read('tokens.css');
const themeIds = readdirSync(source('tokens/themes'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const intentOf = (id) => JSON.parse(readFileSync(source(`tokens/themes/${id}/intent.json`), 'utf8'));

const PALETTES = ['dark', 'light'];

/** The block that paints each of a theme's palettes: dark on its root, light by attribute. */
function blocksOf(id) {
  const css = id === DEFAULT_THEME ? read('themes.css') : read(`themes/${id}.css`);
  const selectors = paletteSelectors(id === DEFAULT_THEME ? null : id);
  const block = (selector) => cascade([{ name: 'themes', css }], (b) => b.atRule === null && b.selector === selector);
  return { dark: block(selectors.dark), light: block(selectors.lightAttribute) };
}

/** Every entry of one palette's record, the literals included, as [where, entry]. */
const entriesOf = (intent, palette) => [
  ...Object.entries(intent[palette]),
  ...intent.literals.map((literal) => [literal.where, literal]),
];

/** A colour as a record spells one: a lower-case #rrggbb, or rgba() with spaced channels and a leading zero. */
const colour = (value) => /^#[0-9a-f]{6}$/.test(value) || /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0?\.\d+\)$/.test(value);

test('every theme carries a design record', () => {
  assert.ok(themeIds.includes(DEFAULT_THEME));
  assert.ok(themeIds.length >= 9, `${themeIds.length} themes`);
});

test("the default's record names the artboards it comes from", () => {
  const intent = intentOf(DEFAULT_THEME);
  assert.deepEqual(Object.keys(intent).filter((key) => !key.startsWith('$')), ['artboards', 'dark', 'light', 'literals']);
  assert.equal(intent.artboards.length, 12);
});

for (const id of themeIds) {
  describe(`the ${id} design record`, () => {
    const intent = intentOf(id);
    const blocks = blocksOf(id);

    test('it records both palettes', () => {
      const keys = Object.keys(intent).filter((key) => !key.startsWith('$') && key !== 'artboards');
      assert.deepEqual(keys, ['dark', 'light', 'literals']);
      for (const palette of PALETTES) assert.ok(Object.keys(intent[palette]).length >= 30, `${palette} records ${Object.keys(intent[palette]).length} declarations`);
    });

    test('the two palettes declare the same names, in the same order, for the same tokens', () => {
      // A record's two blocks are one list of names with two sets of values:
      // a name one palette records and the other does not is an edit to one
      // of them, and a name mapped to two different tokens says the design
      // means two different things by it.
      assert.deepEqual(Object.keys(intent.light), Object.keys(intent.dark));
      for (const [name, entry] of Object.entries(intent.dark)) {
        assert.equal(intent.light[name].token, entry.token, `${name} ships as ${entry.token} in dark and ${intent.light[name].token} in light`);
      }
    });

    test('every token it names is one the palette it names declares', () => {
      // A renamed or removed token leaves the design value it shipped pointing
      // at nothing, which reads exactly like a design value nothing ships.
      for (const palette of PALETTES) {
        const missing = entriesOf(intent, palette)
          .filter(([, entry]) => entry.token !== null && !blocks[palette].has(entry.token))
          .map(([where, entry]) => `${where}: ${entry.token}`);
        assert.deepEqual(missing, [], `${palette} names tokens the theme does not declare`);
      }
      assert.ok(blocks.dark.size > 80 && blocks.light.size > 80, 'the theme blocks were not read');
    });

    test('no token is claimed by two of the design values of one palette', () => {
      for (const palette of PALETTES) {
        const tokens = entriesOf(intent, palette).map(([, entry]) => entry.token).filter((token) => token !== null);
        assert.deepEqual(tokens.filter((token, i) => tokens.indexOf(token) !== i), [], palette);
      }
    });

    test('every value that maps to a token is a colour that parses, and every one that maps to none says why', () => {
      for (const palette of PALETTES) {
        for (const [where, entry] of entriesOf(intent, palette)) {
          if (entry.token === null) {
            assert.ok(typeof entry.note === 'string' && entry.note.length > 0, `${palette} ${where} maps to no token and gives no reason`);
            continue;
          }
          assert.ok(colour(entry.value), `${palette} ${where} is "${entry.value}"`);
          const parsed = parseHex(entry.value) ?? parseRgba(entry.value)?.rgb;
          assert.ok(parsed && [parsed.r, parsed.g, parsed.b].every((c) => c >= 0 && c <= 255), `${palette} ${where}: ${entry.value}`);
        }
      }
    });
  });
}

describe('the build and the design records', () => {
  test('nothing is emitted from them', () => {
    // Merged as a token group, a record would put the design's own names on
    // :root (--dark-bg, --light-t3 and the rest) and in the typed export,
    // where a stylesheet could start reading them.
    const declared = [...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name);
    for (const id of themeIds) {
      const groups = Object.keys(intentOf(id)).filter((key) => !key.startsWith('$'));
      for (const group of groups) {
        assert.deepEqual(declared.filter((name) => name.startsWith(`--${group}-`)), [], `tokens.css declares the ${group} group`);
        assert.equal(typed[group], undefined, `the typed export has a ${group} group`);
      }
    }
    assert.ok(declared.length > 100, `tokens.css declared only ${declared.length} custom properties`);
  });
});
