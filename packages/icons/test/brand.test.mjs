/**
 * The Crewlet mark, and the icon-slot files cut from it.
 *
 * Four products each kept their own copy: the engine embeds one and serves a
 * raster beside it, the console copies the mark twice and recolours it for its
 * operator build, the marketing site frames it square for an icon slot, and
 * the docs site copies it out of this package at build time. Copies of one
 * drawing drift silently, because nobody sees two of them at once.
 *
 * So the rule here is that there is ONE drawing. `svg/crewlet-icon.svg` is the
 * wide mark, and the files under `favicon/` are that same geometry, path for
 * path, differing only in the viewBox that frames them and the fill that tells
 * an operator console from a tenant one. Nothing asserts a picture is right,
 * but this asserts that there is only one of it to get right.
 *
 * `favicon/crewlet.ico` is the raster the engine already serves at
 * /favicon.ico, byte for byte, because that route has a Go test pinning its
 * content type and the point of moving the file is that the swap is provable.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { PACKAGE, attribute } from './support.mjs';

const read = (path) => readFile(resolve(PACKAGE, path), 'utf8');

const root = (source) => /<svg\b[^>]*>/.exec(source)[0];

/** Every path's geometry, in document order, which is the drawing itself. */
const geometry = (source) => [...source.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);

/** The one fill the mark is painted in, which the group carries for all of it. */
const paint = (source) => /<g\s+fill="([^"]+)"/.exec(source)?.[1];

const SQUARE = ['favicon/crewlet.svg', 'favicon/crewlet-admin.svg'];

/** A viewBox as four numbers, which is the frame a file draws its paths in. */
const frame = (source) => attribute(root(source), 'viewBox').split(/\s+/).map(Number);

/*
 * What the drawing actually occupies, as the hull of every point its paths
 * name. A cubic segment stays inside the hull of its own control points, so
 * this over-states the mark rather than under-stating it, which is the safe
 * direction for a frame that has to contain it.
 *
 * The mark is traced artwork and uses five commands. Anything else is a
 * re-export this reader has never been run against, so it throws: a parser
 * that skips a command it does not know measures part of a drawing and calls
 * it the whole one.
 */
function extent(paths) {
  const box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const see = (x, y) => {
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  };
  for (const d of paths) {
    assert.match(d, /^[MmLlCcZz\d.,\s-]+$/, 'the mark uses a path command this reader does not know');
    const tokens = d.match(/[MmLlCcZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
    let command = null;
    let index = 0;
    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    const next = () => Number(tokens[index++]);
    while (index < tokens.length) {
      if (/^[A-Za-z]$/.test(tokens[index])) {
        command = tokens[index++];
        if (command === 'Z' || command === 'z') {
          x = startX;
          y = startY;
          continue;
        }
      }
      const relative = command === command.toLowerCase();
      if (command === 'M' || command === 'm') {
        x = relative ? x + next() : next();
        y = relative ? y + next() : next();
        startX = x;
        startY = y;
        // Extra pairs after a move are line segments, in the same case.
        command = relative ? 'l' : 'L';
      } else if (command === 'L' || command === 'l') {
        x = relative ? x + next() : next();
        y = relative ? y + next() : next();
      } else if (command === 'C' || command === 'c') {
        // The control points travel from the same current point, so x and y
        // move only once the segment has been read.
        const points = [];
        for (let point = 0; point < 3; point += 1) {
          points.push([relative ? x + next() : next(), relative ? y + next() : next()]);
        }
        for (const [px, py] of points) see(px, py);
        [x, y] = points[2];
      } else {
        throw new Error(`unhandled path command ${command}`);
      }
      see(x, y);
    }
  }
  return box;
}

describe('the brand mark', () => {
  it('is one drawing, however it is framed', async () => {
    const wide = geometry(await read('svg/crewlet-icon.svg'));
    assert.equal(wide.length, 3, 'the mark is three paths');
    for (const file of SQUARE) {
      assert.deepEqual(geometry(await read(file)), wide, `${file} has drifted from the mark`);
    }
  });

  it('frames the icon-slot files square and the wide mark wide', async () => {
    // Half of the difference: an icon slot is square, and every raster a
    // product generates from this file is rendered into one.
    assert.equal(attribute(root(await read('svg/crewlet-icon.svg')), 'viewBox'), '0 0 1467 978');
    for (const file of SQUARE) {
      const [, , width, height] = attribute(root(await read(file)), 'viewBox').split(' ');
      assert.equal(width, height, `${file} is not square`);
    }
  });

  it('frames the whole mark, centred, in a square barely wider than it is', async () => {
    /*
     * Square on its own is not the property. A square viewBox that crops the
     * mark, or parks it in a corner, or leaves it swimming in air, is square
     * and wrong, and a favicon is the one asset nobody looks at closely
     * enough to notice. So the frame is measured against the drawing it
     * carries rather than against a remembered set of four numbers.
     *
     * The ceiling is what keeps the file worth having: a frame much wider
     * than the mark is padding a browser adds anyway, and it would give back
     * the size the square framing exists to win.
     */
    const mark = extent(geometry(await read('svg/crewlet-icon.svg')));
    for (const file of SQUARE) {
      const [x, y, side] = frame(await read(file));
      assert.ok(x <= mark.left && x + side >= mark.right, `${file} crops the mark horizontally`);
      assert.ok(y <= mark.top && y + side >= mark.bottom, `${file} crops the mark vertically`);
      // Whole user units out of 1360, because a viewBox is written by hand:
      // the rule is centred to a rounding, not centred to the decimal.
      const off = (edge, low, high) => Math.abs(edge + side / 2 - (low + high) / 2);
      assert.ok(off(x, mark.left, mark.right) <= 2, `${file} does not centre the mark across`);
      assert.ok(off(y, mark.top, mark.bottom) <= 2, `${file} does not centre the mark down`);
      const air = side / (mark.right - mark.left);
      assert.ok(air <= 1.1, `${file} frames the mark in ${air.toFixed(2)}x its own width`);
    }
  });

  it('is drawn larger in an icon slot than the wide file would be', async () => {
    /*
     * The measurable half of why favicon/ exists, and the reason the README
     * puts a number on it rather than a feeling: both files fit to the width
     * of a square slot, so the mark draws at the slot divided by the frame's
     * width, and the square file's frame is the narrower of the two. It is a
     * modest win. Framing cannot make a 3:2 drawing fill a square, and a
     * claim that it does is one a reader can disprove by looking.
     */
    const [, , wide] = frame(await read('svg/crewlet-icon.svg'));
    for (const file of SQUARE) {
      const [, , side] = frame(await read(file));
      assert.ok(side < wide, `${file} draws the mark no larger in a square slot than svg/crewlet-icon.svg does`);
      assert.ok(wide / side < 1.15, `${file} claims a size win of ${Math.round((wide / side - 1) * 100)} percent`);
    }
  });

  it('paints the operator console in its own colour and nothing else in it', async () => {
    /*
     * The second half of the difference, and the reason the admin file exists:
     * a superadmin tab that looks exactly like a tenant tab is one an operator
     * acts in by mistake.
     */
    assert.equal(paint(await read('svg/crewlet-icon.svg')), '#7c56ff');
    assert.equal(paint(await read('favicon/crewlet.svg')), '#7c56ff');
    assert.equal(paint(await read('favicon/crewlet-admin.svg')), '#c46060');
  });

  it('ships the raster as a real icon file, at the sizes a tab and a bookmark ask for', async () => {
    /*
     * An .ico is a directory of images, and its header says how many and how
     * big. A single PNG renamed .ico works in a browser and is what one
     * consumer ships today, so "it is a file and it loads" proves nothing:
     * the bytes are read here rather than trusted.
     */
    const ico = await readFile(resolve(PACKAGE, 'favicon/crewlet.ico'));
    assert.equal(ico.readUInt16LE(0), 0, 'not an icon file: the reserved field is set');
    assert.equal(ico.readUInt16LE(2), 1, 'not an icon file: the type is not ICO');
    const count = ico.readUInt16LE(4);
    assert.ok(count >= 2, `only ${count} image(s) in the icon`);
    // A width or height byte of 0 means 256.
    const sizes = Array.from({ length: count }, (_, index) => ico.readUInt8(6 + index * 16) || 256);
    for (const wanted of [16, 32]) {
      assert.ok(sizes.includes(wanted), `no ${wanted}px image: the icon has ${sizes.join(', ')}`);
    }
  });
});
