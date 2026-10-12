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

import { CREWLET_CHARACTERS, CREWLET_CHARACTER_GEOMETRY, CrewletCharacter, isCrewletCharacter } from '../dist/index.js';
import { markPaths } from '../scripts/mark.mjs';
import { PACKAGE, attribute, render } from './support.mjs';

const ALL = [...CREWLET_CHARACTERS];
const DRAWN = ALL.filter((id) => CREWLET_CHARACTER_GEOMETRY[id].kind === 'drawn');

/** The number of elements of a kind in some markup. */
const count = (markup, pattern) => (markup.match(pattern) ?? []).length;

/*
 * The rules, restated rather than imported, so a change to one is a change a
 * reviewer sees here too: the keyline floats 0.9 off the outline and is 1.35
 * wide, mitred as a stroke is.
 */
const GAP = 0.9;
const LINE = 1.35;

/** The rings of a path drawn as `M x yL x y…Z` polygons, which is all a drawn character paints. */
const ringsOf = (d) =>
  d
    .split('M')
    .filter(Boolean)
    .map((ring) => {
      const n = ring.match(/-?\d*\.?\d+/g).map(Number);
      const points = [];
      for (let i = 0; i < n.length; i += 2) points.push([n[i], n[i + 1]]);
      return points;
    });

/** How many times some rings wind round a point. */
function winding(rings, [x, y]) {
  let turns = 0;
  for (const ring of rings) {
    ring.forEach(([x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      const side = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
      if (y1 <= y && y2 > y && side > 0) turns += 1;
      else if (y1 > y && y2 <= y && side < 0) turns -= 1;
    });
  }
  return turns;
}

/** The paths a character paints, in order. */
const pathsOf = (markup) => [...markup.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

/*
 * Points half a unit apart across a box, set off the stage's own lattice: the
 * geometry sits on round numbers, and a point exactly on an edge is inside or
 * out at the whim of the arithmetic.
 */
function* samples({ x, y, width, height }) {
  for (let px = x + 0.137; px <= x + width; px += 0.5) {
    for (let py = y + 0.071; py <= y + height; py += 0.5) yield [px, py];
  }
}

/** How far a point outside some rings is from the nearest of their edges, and how near an end of that edge it falls. */
function nearest(rings, [x, y]) {
  let best = { distance: Infinity, fromEnd: 0 };
  for (const ring of rings) {
    ring.forEach(([x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      const length = Math.hypot(x2 - x1, y2 - y1);
      const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / length ** 2));
      const distance = Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
      if (distance < best.distance) best = { distance, fromEnd: Math.min(t, 1 - t) * length };
    });
  }
  return best;
}

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
  it('paints its paths in the current colour and nothing else: no style, mask, clip, pattern or id', () => {
    // A mask's colour is paint a host stylesheet can repaint, and a mask is
    // found by id across the page, so two characters rendered apart (each
    // server render counts its ids from the start) once drew one face.
    for (const id of ALL) {
      for (const detail of ['full', 'compact']) {
        const markup = render(CrewletCharacter, { character: id, detail });
        assert.doesNotMatch(markup, /<style/);
        assert.equal(attribute(markup, 'style'), null, `${id} writes a style attribute`);
        assert.doesNotMatch(markup, /<(mask|clipPath|pattern|defs)\b|\sid="|url\(/, `${id} draws through a reference`);
        assert.match(markup, /fill="currentColor"/);
        assert.doesNotMatch(markup, /fill="(?!currentColor")/, `${id} paints in a colour of its own`);
        assert.deepEqual(
          [...new Set(markup.match(/<\w+/g))].sort(),
          ['<g', '<path', '<svg'],
          `${id} draws with an element that is not a path`,
        );
      }
    }
  });

  it('is a picture with nothing to say on its own', () => {
    const markup = render(CrewletCharacter, { character: 'hexlet' });
    assert.equal(attribute(markup, 'aria-hidden'), 'true');
    assert.equal(attribute(markup, 'focusable'), 'false');
  });

  it('frames itself square and centred on what it draws, holding all of it', () => {
    for (const id of ALL) {
      const markup = render(CrewletCharacter, { character: id });
      const [left, top, width, height] = attribute(markup, 'viewBox').split(' ').map(Number);
      assert.equal(width, height, `${id} is not framed square`);
      const box = CREWLET_CHARACTER_GEOMETRY[id].bounds;
      assert.ok(Math.abs(left + width / 2 - (box.x + box.width / 2)) < 0.01, `${id} is not centred across`);
      assert.ok(Math.abs(top + height / 2 - (box.y + box.height / 2)) < 0.01, `${id} is not centred down`);
      assert.ok(Math.abs(Math.max(box.width, box.height) - width) < 0.01, `${id} does not fill its frame`);
      if (CREWLET_CHARACTER_GEOMETRY[id].kind !== 'drawn') continue;
      // Every point it paints, the keyline's mitred corners with the rest.
      for (const [x, y] of pathsOf(markup).flatMap(ringsOf).flat()) {
        assert.ok(x >= left - 0.01 && x <= left + width + 0.01 && y >= top - 0.01 && y <= top + height + 0.01, `${id} paints ${x},${y} outside its frame`);
      }
    }
  });

  it('draws the keyline at full detail and leaves it out compact', () => {
    for (const id of ALL) {
      const full = render(CrewletCharacter, { character: id });
      const compact = render(CrewletCharacter, { character: id, detail: 'compact' });
      const mark = CREWLET_CHARACTER_GEOMETRY[id].kind === 'mark';
      // The mark is its keyline, body and visor; a drawn character its keyline and body.
      assert.equal(count(full, /<path/g), mark ? 3 : 2, `${id} at full detail has no keyline`);
      assert.equal(count(compact, /<path/g), mark ? 2 : 1, `${id} compact still draws a keyline`);
    }
  });

  it('floats the keyline a gap off the outline, its width wide', () => {
    for (const id of DRAWN) {
      const { shapes, bounds } = CREWLET_CHARACTER_GEOMETRY[id];
      const parts = shapes.flatMap(ringsOf);
      const keyline = ringsOf(pathsOf(render(CrewletCharacter, { character: id }))[0]);
      for (const point of samples(bounds)) {
        if (winding(parts, point) !== 0) continue;
        const { distance, fromEnd } = nearest(parts, point);
        const drawn = winding(keyline, point) !== 0;
        // Never inside the gap, and never further out than a mitred corner reaches.
        if (drawn) {
          const off = distance >= GAP - 0.05 && distance <= (GAP + LINE) * 4;
          assert.ok(off, `${id} draws its keyline ${distance.toFixed(2)} off at ${point}`);
        }
        // Along an edge, clear of any corner, the band is the keyline's own.
        if (fromEnd >= 2.5 && distance > GAP + 0.1 && distance < GAP + LINE - 0.1) {
          assert.ok(drawn, `${id} has a hole in its keyline at ${point}`);
        }
      }
    }
  });

  it('cuts every hole through the body, so neither a fill rule nor a host\'s paint can fill one', () => {
    for (const id of DRAWN) {
      const { shapes, holes, visor, notch, bounds } = CREWLET_CHARACTER_GEOMETRY[id];
      const parts = shapes.flatMap(ringsOf);
      const solid = (p) => winding(parts, p) !== 0;
      for (const detail of ['full', 'compact']) {
        const paths = pathsOf(render(CrewletCharacter, { character: id, detail }));
        const body = ringsOf(paths[paths.length - 1]);
        const painted = (p) => winding(body, p) !== 0;
        // A cut winds against the outline round it, so the even-odd rule agrees; nothing is painted off the silhouette.
        for (const point of samples(bounds)) {
          const evenOdd = winding(body, point) % 2 !== 0;
          assert.equal(painted(point), evenOdd, `${id} ${detail} is not cut alike by both fill rules at ${point}`);
          if (painted(point)) assert.ok(solid(point), `${id} ${detail} paints off its silhouette at ${point}`);
        }
        // Two slits across the middle of the visor, either side of its centre.
        const row = visor.y + visor.height / 2;
        const runs = [];
        for (let x = visor.x + 1; x <= visor.x + visor.width - 1; x += 0.05) {
          const open = solid([x, row]) && !painted([x, row]);
          if (open && (!runs.length || runs[runs.length - 1].end < x - 0.06)) runs.push({ start: x, end: x });
          else if (open) runs[runs.length - 1].end = x;
        }
        assert.equal(runs.length, 2, `${id} ${detail} has ${runs.length} slits`);
        const middle = visor.x + visor.width / 2;
        const reach = runs.map(({ start, end }) => Math.abs((start + end) / 2 - middle));
        assert.ok(Math.abs(reach[0] - reach[1]) < 0.15, `${id} ${detail} has its slits off the visor's centre`);
        if (notch) assert.ok(!painted([notch[0], notch[1] + 0.6]), `${id} ${detail} has no crown notch`);
        // The visor gap: cut at full detail, left out compact.
        const edge = [visor.x, row];
        if (solid(edge)) assert.equal(painted(edge), detail === 'compact', `${id} ${detail} draws its visor gap wrong`);
        for (const hole of holes.map(ringsOf).map(([ring]) => ring)) {
          const xs = hole.map(([x]) => x);
          const ys = hole.map(([, y]) => y);
          const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
          assert.ok(!painted(centre), `${id} ${detail} paints over a hole`);
        }
      }
    }
  });
});
