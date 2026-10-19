/**
 * The pointer cursors: each a complete CSS `cursor` value whose image is the
 * vendored glyph it names, drawn in the operating system's ink, with a hotspot
 * inside the image and a keyword a browser without image cursors falls back to.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CURSORS } from '../dist/glyphs.js';
import { readGlyphs } from '../scripts/glyphs.mjs';

const glyphs = await readGlyphs();

const DRAWN_FROM = {
  pointer: ['mouse-pointer-2', 'default'],
  hand: ['hand', 'grab'],
  grabbing: ['hand-grab', 'grabbing'],
  crosshair: ['plus', 'crosshair'],
  text: ['text-cursor', 'text'],
};

const VALUE = /^url\("data:image\/svg\+xml,([^"]+)"\) (\d+) (\d+), ([a-z-]+)$/;

describe('CURSORS', () => {
  it('is exactly the set a canvas reads', () => {
    assert.deepEqual(Object.keys(CURSORS).sort(), Object.keys(DRAWN_FROM).sort());
  });

  for (const [name, [glyph, fallback]] of Object.entries(DRAWN_FROM)) {
    it(`${name} is the ${glyph} glyph in black over a white halo, falling back to ${fallback}`, () => {
      const match = VALUE.exec(CURSORS[name]);
      assert.ok(match, `${name} is not url("data:...") x y, keyword: ${CURSORS[name]}`);
      const [, encoded, x, y, keyword] = match;
      assert.equal(keyword, fallback);
      const svg = decodeURIComponent(encoded);
      const size = Number(/width="(\d+)"/.exec(svg)[1]);
      assert.ok(size <= 32, 'a cursor image larger than 32px is refused by some browsers');
      assert.ok(Number(x) >= 0 && Number(x) < size && Number(y) >= 0 && Number(y) < size, 'the hotspot is inside the image');
      // Twice: once as the halo, once as the ink.
      for (const { attrs } of glyphs.get(glyph)) {
        const geometry = attrs.d ?? attrs.points;
        if (geometry === undefined) continue;
        assert.equal(svg.split(geometry).length - 1, 2, `${glyph}'s geometry is drawn as halo and ink`);
      }
      assert.match(svg, /<g stroke="white"[^>]*>/);
      assert.match(svg, /<g stroke="black"[^>]*>/);
      // Nothing the image draws is fetched.
      assert.doesNotMatch(svg.replace('xmlns="http://www.w3.org/2000/svg"', ''), /https?:|href/);
    });
  }
});
