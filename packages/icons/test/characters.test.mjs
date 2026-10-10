/**
 * The Crewlet characters, and what keeps thirty drawings one family.
 *
 * A character's id is stored in a company's configuration, so the set is a
 * contract before it is a picture: an id that changes or goes away is a seat
 * that draws nothing. The drawings are held to the rules the family is cut
 * from, measured on the geometry itself, because nobody looks at thirty
 * pictures closely enough to notice one that drifted.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { Fragment, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CREWLET_CHARACTERS, CREWLET_CHARACTER_GEOMETRY, CrewletCharacter, isCrewletCharacter } from '../dist/index.js';
import { markPaths } from '../scripts/mark.mjs';
import { PACKAGE, attribute, render } from './support.mjs';

const ALL = [...CREWLET_CHARACTERS];

/** The number of elements of a kind in some markup. */
const count = (markup, pattern) => (markup.match(pattern) ?? []).length;

describe('the character set', () => {
  it('is thirty ids, each a lowercase word ending in -let, the mark first', () => {
    assert.equal(ALL.length, 30);
    assert.equal(new Set(ALL).size, ALL.length, 'an id is listed twice');
    assert.equal(ALL[0], 'crewlet');
    for (const id of ALL) assert.match(id, /^[a-z]+let$/, `${id} is not an id a configuration can store as written`);
  });

  it('has a geometry, a name and a shape for every id and for nothing else', () => {
    assert.deepEqual(Object.keys(CREWLET_CHARACTER_GEOMETRY).sort(), [...ALL].sort());
    const names = ALL.map((id) => CREWLET_CHARACTER_GEOMETRY[id].name);
    assert.equal(new Set(names).size, names.length, 'two characters share a name');
    for (const id of ALL) {
      const { name, shape } = CREWLET_CHARACTER_GEOMETRY[id];
      assert.equal(name.toLowerCase(), id, `${id} is labelled ${name}`);
      assert.ok(shape.length > 0 && !/\u2014/.test(shape), `${id} has no plain description`);
    }
  });

  it('recognises its own ids and nothing else off the wire', () => {
    for (const id of ALL) assert.ok(isCrewletCharacter(id));
    for (const value of ['', 'Hexlet', 'starlet', 'crewlet ', null, 7, undefined]) {
      assert.equal(isCrewletCharacter(value), false, `${String(value)} was taken for a character`);
    }
  });
});

describe('the drawings', () => {
  it('draw the original Crewlet from the mark itself', async () => {
    const mark = markPaths(await readFile(resolve(PACKAGE, 'svg/crewlet-icon.svg'), 'utf8'));
    const crewlet = CREWLET_CHARACTER_GEOMETRY.crewlet;
    assert.equal(crewlet.kind, 'mark');
    assert.deepEqual([crewlet.keyline, ...crewlet.body], mark, 'the original character has drifted from the mark');
  });

  it('keep every face inside its body and every body on the stage', () => {
    for (const id of ALL) {
      const geometry = CREWLET_CHARACTER_GEOMETRY[id];
      const { x, y, width, height } = geometry.bounds;
      assert.ok(width > 0 && height > 0, `${id} occupies nothing`);
      // The stage is 100 units with the ground at 96; the mark's raised arms
      // are the widest thing drawn on it.
      assert.ok(x >= -20 && x + width <= 120 && y >= 0 && y + height <= 100, `${id} leaves the stage`);
      if (geometry.kind !== 'drawn') continue;
      const v = geometry.visor;
      assert.ok(
        v.x > x && v.y > y && v.x + v.width < x + width && v.y + v.height < y + height,
        `${id}'s visor is outside its own outline`,
      );
    }
  });

  it('wind every part of a character one way, so the parts fill as one union', () => {
    // Twice the signed area of one polygon path; positive is clockwise on screen.
    const winding = (d) => {
      const n = d.match(/-?\d*\.?\d+/g).map(Number);
      let sum = 0;
      for (let i = 0; i < n.length; i += 2) {
        const j = (i + 2) % n.length;
        sum += n[i] * n[j + 1] - n[j] * n[i + 1];
      }
      return Math.sign(sum);
    };
    for (const id of ALL) {
      const geometry = CREWLET_CHARACTER_GEOMETRY[id];
      if (geometry.kind !== 'drawn') continue;
      for (const shape of geometry.shapes) assert.equal(winding(shape), 1, `a part of ${id} winds the other way`);
    }
  });
});

describe('a drawn character', () => {
  it('draws in the current colour, injects no style and carries no style attribute', () => {
    for (const id of ALL) {
      const markup = render(CrewletCharacter, { character: id });
      assert.doesNotMatch(markup, /<style/);
      assert.equal(attribute(markup, 'style'), null, `${id} writes a style attribute`);
      assert.match(markup, /currentColor/);
      assert.doesNotMatch(markup, /fill="#(?!fff"|000")/, `${id} paints in a colour of its own`);
    }
  });

  it('is a picture with nothing to say on its own', () => {
    const markup = render(CrewletCharacter, { character: 'hexlet' });
    assert.equal(attribute(markup, 'aria-hidden'), 'true');
    assert.equal(attribute(markup, 'focusable'), 'false');
  });

  it('frames itself square and centred on what it draws', () => {
    for (const id of ALL) {
      const [left, top, width, height] = attribute(render(CrewletCharacter, { character: id }), 'viewBox')
        .split(' ')
        .map(Number);
      assert.equal(width, height, `${id} is not framed square`);
      const box = CREWLET_CHARACTER_GEOMETRY[id].bounds;
      assert.ok(Math.abs(left + width / 2 - (box.x + box.width / 2)) < 0.01, `${id} is not centred across`);
      assert.ok(Math.abs(top + height / 2 - (box.y + box.height / 2)) < 0.01, `${id} is not centred down`);
      assert.ok(Math.abs(Math.max(box.width, box.height) - width) < 0.01, `${id} does not fill its frame`);
    }
  });

  it('draws the keyline and the visor gap at full detail, and neither when compact', () => {
    for (const id of ALL) {
      const full = render(CrewletCharacter, { character: id });
      const compact = render(CrewletCharacter, { character: id, detail: 'compact' });
      if (CREWLET_CHARACTER_GEOMETRY[id].kind === 'mark') {
        assert.equal(count(full, /<path/g), 3, 'the full mark is its keyline, body and visor');
        assert.equal(count(compact, /<path/g), 2, 'the compact mark drops its keyline');
        continue;
      }
      assert.equal(count(full, /<mask/g), 2, `${id} at full detail has no keyline mask`);
      assert.equal(count(compact, /<mask/g), 1, `${id} compact still draws a keyline`);
      assert.match(full, /stroke="#000"[^>]*stroke-width="1.3"/, `${id} at full detail has no visor gap`);
      assert.doesNotMatch(compact, /stroke-width="1.3"/, `${id} compact still cuts a visor gap`);
    }
  });

  it('gives every instance masks of its own, since a mask is found by id across the page', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(CrewletCharacter, { character: 'hexlet' }),
        createElement(CrewletCharacter, { character: 'hexlet' }),
      ),
    );
    const ids = [...markup.matchAll(/<mask id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, 4);
    assert.equal(new Set(ids).size, 4, 'two characters on one page share a mask');
    for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]+$/, `${id} is not safe inside url()`);
  });

  it('cuts the face out of the body rather than painting it over', () => {
    // A face painted in a ground colour shows that colour on any other ground;
    // a face cut out shows whatever is behind the character.
    const markup = render(CrewletCharacter, { character: 'octlet' });
    const face = /<mask id="([^"]+)"/.exec(markup)[1];
    assert.match(markup, new RegExp(`<path [^>]*mask="url\\(#${face}\\)" fill="currentColor"`));
  });
});
