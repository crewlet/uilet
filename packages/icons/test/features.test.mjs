/**
 * The feature illustrations as a family.
 *
 * Six marks, one per capability the platform leads with, drawn to one brief:
 * an 80x80 canvas, a #111 disc so each reads on a light ground as well as a
 * dark one, and a two-stop cut of the brand ramp. What holds them together is
 * that brief and nothing else, and a seventh drawn without it does not look
 * wrong on its own page, only beside the other six. By then the set has
 * already shipped.
 *
 * So the list below is the definition of the family, and the rules run in both
 * directions: every name in it is drawn, and every 80x80 drawing in `svg/` is
 * in it. The second direction is the one that catches a mark added to the set
 * by dropping a file in, which is how this package's build takes every other
 * illustration.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { ICON_NAMES } from '../dist/index.js';
import { PACKAGE, attribute, componentName } from './support.mjs';

/** The family, in the order the README lists it. */
const FEATURES = ['hierarchy', 'company-as-code', 'turn-engine', 'code-sandbox', 'knowledge', 'human-in-loop'];

/*
 * The brand ramp, indigo through violet to pink. Each mark takes a two-stop
 * cut of it rather than a hue of its own, which is what lets six of them sit
 * on one scrolling page without reading as six different palettes.
 */
const RAMP = ['#6a5cff', '#a055ff', '#e24a90'];

const root = (source) => /<svg\b[^>]*>/.exec(source)[0];

const stops = (source) => [...source.matchAll(/<stop\b[^>]*>/g)].map((match) => match[0]);

/** A stop's colour, however it carries it: an inline style or the attribute. */
function colourOf(stop) {
  const styled = /stop-color\s*:\s*([^;"']+)/.exec(stop);
  return (styled === null ? attribute(stop, 'stop-color') : styled[1])?.trim();
}

const read = (name) => readFile(resolve(PACKAGE, 'svg', `${name}.svg`), 'utf8');

describe('a feature illustration', () => {
  it('is drawn for every capability the family names', async () => {
    for (const name of FEATURES) {
      const source = await read(name);
      assert.ok(source.length > 0, name);
      assert.ok(ICON_NAMES.includes(componentName(name)), `${name} is not exported as a component`);
    }
  });

  it('is the only thing in svg/ drawn on the 80x80 canvas', async () => {
    // The other direction: a drawing added to the set by dropping a file in,
    // which is how every other illustration here arrives, and which no rule
    // above would notice.
    const files = (await readdir(resolve(PACKAGE, 'svg'), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map((entry) => entry.name);
    const square = [];
    for (const file of files) {
      const source = await readFile(resolve(PACKAGE, 'svg', file), 'utf8');
      if (attribute(root(source), 'viewBox') === '0 0 80 80') square.push(file.replace(/\.svg$/, ''));
    }
    assert.deepEqual(square.sort(), [...FEATURES].sort());
  });

  it('carries the disc that lets it read on a light ground', async () => {
    for (const name of FEATURES) {
      const source = await read(name);
      assert.equal(attribute(root(source), 'fill'), 'none', name);
      assert.match(
        source,
        /<circle\s+cx="40"\s+cy="40"\s+r="40"\s+fill="#111"\s*\/>/,
        `${name} has no #111 disc, so its near-white and gradient details vanish on a light page`,
      );
    }
  });

  it('paints from the brand ramp and from no hue of its own', async () => {
    for (const name of FEATURES) {
      const source = await read(name);
      const colours = stops(source).map(colourOf);
      assert.ok(colours.length >= 2, name);
      for (const colour of colours) {
        assert.ok(RAMP.includes(colour), `${name}: ${colour} is not a stop on the brand ramp`);
      }
    }
  });
});
