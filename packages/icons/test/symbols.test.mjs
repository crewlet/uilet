/**
 * What the vendored Material Symbols tree has to be for the build to mean
 * anything.
 *
 * The package redistributes somebody else's drawings under somebody else's
 * license. A drawing that cannot be traced back to the commit it came from is
 * worth less than one fetched at build time, and every failure here is silent
 * otherwise: a glyph vendored at one optical size and scaled for the other, a
 * checksum nobody rewrote, a file edited by hand, a path that draws nothing.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { COMMIT, OPTICAL_SIZES, SYMBOLS_DIR, checksums, glyphNames, readGlyphs, upstreamPath } from '../scripts/symbols.mjs';

// readGlyphs verifies every checksum and refuses a file that is not one path
// on the Material Symbols viewBox, so reaching this line is the first
// assertion.
const glyphs = await readGlyphs();

describe('the vendored drawings', () => {
  it('are the whole set the engine dashboard and uilet draw between them', () => {
    // A floor rather than an exact count: the set grows, and a tree that had
    // lost most of it would still pass every rule below.
    assert.ok(glyphs.size >= 98, `only ${glyphs.size} glyphs are vendored`);
  });

  it('carry the same names at every optical size', async () => {
    const names = await glyphNames();
    for (const opticalSize of OPTICAL_SIZES) {
      const found = (await readdir(resolve(SYMBOLS_DIR, String(opticalSize))))
        .filter((file) => file.endsWith('.svg'))
        .map((file) => file.slice(0, -'.svg'.length))
        .sort();
      assert.deepEqual(found, names, `symbols/${opticalSize} holds a different set of glyphs`);
    }
  });

  it('have a checksum each, and no checksum has no file', async () => {
    const recorded = await checksums();
    const expected = glyphs.keys().flatMap((name) => OPTICAL_SIZES.map((size) => `${size}/${name}.svg`));
    assert.deepEqual([...recorded.keys()].sort(), [...expected].sort());
  });

  it('are two different drawings, not one drawing twice', () => {
    /*
     * The optical size axis is the reason both are vendored. Re-vendoring a
     * glyph from the wrong upstream directory, or copying one file over the
     * other, leaves a package that still builds and still renders, drawing one
     * weight where the surface beside it draws another.
     */
    const identical = [...glyphs].filter(([, drawing]) => drawing[20] === drawing[24]).map(([name]) => name);
    assert.deepEqual(identical, []);
  });

  it('are path data that starts with a move', () => {
    // The SVG path grammar's own alphabet: commands, numbers, separators. A
    // malformed `d` draws nothing and raises no error, so the button it sits
    // in becomes an empty square with a name only a screen reader hears.
    const grammar = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/;
    const broken = [...glyphs]
      .flatMap(([name, drawing]) => OPTICAL_SIZES.map((size) => [`${size}/${name}`, drawing[size]]))
      .filter(([, d]) => d.length === 0 || !grammar.test(d) || !/^[Mm]/.test(d))
      .map(([where]) => where);
    assert.deepEqual(broken, []);
  });

  it('follow one rule for where upstream each file came from', () => {
    assert.equal(upstreamPath('close', 20), 'symbols/web/close/materialsymbolsoutlined/close_20px.svg');
    assert.equal(upstreamPath('check_circle', 24), 'symbols/web/check_circle/materialsymbolsoutlined/check_circle_24px.svg');
    assert.equal(
      upstreamPath('check_circle-fill', 20),
      'symbols/web/check_circle/materialsymbolsoutlined/check_circle_fill1_20px.svg',
    );
  });
});

describe('the notices that travel with the drawings', () => {
  it('are the Apache License 2.0 text and an attribution naming the commit', async () => {
    const license = await readFile(resolve(SYMBOLS_DIR, 'LICENSE'), 'utf8');
    assert.match(license, /Apache License\s+Version 2\.0, January 2004/);
    const notice = await readFile(resolve(SYMBOLS_DIR, 'NOTICE'), 'utf8');
    assert.match(notice, /Material Symbols by Google/);
    assert.match(notice, /Apache License 2\.0/);
    // The pin the provenance rests on, named where a reader of the package
    // finds it rather than only in a build script.
    assert.ok(notice.includes(COMMIT), 'symbols/NOTICE does not name the pinned upstream commit');
  });
});
