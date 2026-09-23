/**
 * What the vendored Lucide tree has to be for the build to mean anything.
 *
 * The package redistributes somebody else's drawings under somebody else's
 * license. A drawing that cannot be traced back to the release it came from is
 * worth less than one fetched at build time, and every failure here is silent
 * otherwise: a file edited by hand, a checksum nobody rewrote, a drawing with
 * a filled child or a transform the component would draw differently, a glyph
 * the approved design draws that nobody vendored, a README that lists a set
 * that is not the one that shipped.
 */

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  FILLABLE,
  GLYPHS_DIR,
  INTEGRITY,
  TABLE_END,
  TABLE_START,
  VERSION,
  checksums,
  fillableProblems,
  glyphTable,
  isClosed,
  parseGlyph,
  readGlyphs,
  sha256,
} from '../scripts/glyphs.mjs';

// readGlyphs verifies every checksum, refuses a file that is not a
// lucide-static drawing and refuses an open FILLABLE drawing, so reaching this
// line is the first assertion.
const glyphs = await readGlyphs();
const read = (file) => readFile(resolve(GLYPHS_DIR, file), 'utf8');
const source = await read('x.svg');

/*
 * The 59 drawings on the approved design's artboards, by the Lucide name each
 * one is. Written out because the artboards are not in this repository: this
 * is the record of what the design draws, and a glyph dropped from glyphs/
 * that a screen of the design needs fails here rather than in the product.
 */
const ARTBOARD = [
  'activity', 'arrow-down-to-line', 'arrow-right', 'arrow-up-right', 'bell', 'book-open', 'brain', 'calendar',
  'chart-no-axes-gantt', 'check', 'chevron-down', 'chevron-right', 'chevron-up', 'circle-check', 'clock', 'code',
  'coins', 'columns-3', 'command', 'corner-down-left', 'cpu', 'database', 'ellipsis', 'file-text', 'globe', 'hash',
  'house', 'inbox', 'info', 'key', 'link', 'list', 'list-filter', 'maximize-2', 'message-square', 'minus', 'network',
  'paperclip', 'pause', 'pin', 'plug', 'plus', 'search', 'send', 'server', 'settings-2', 'shield', 'sliders-vertical',
  'square-kanban', 'star', 'sun', 'table', 'triangle-alert', 'user', 'users', 'wand-sparkles', 'wrench', 'x', 'zap',
];

describe('the vendored drawings', () => {
  it('carry every drawing the approved artboards draw', () => {
    assert.equal(new Set(ARTBOARD).size, 59);
    assert.deepEqual(ARTBOARD.filter((name) => !glyphs.has(name)), []);
  });

  it('are each a round-capped stroke drawing on the 24 grid', async () => {
    /*
     * Checked on the raw text as well as through the shared parser, so a
     * parser that stopped checking would not take this rule with it. What
     * the frame draws every glyph as (1.75, round, round, no fill) is only
     * honest if each file is a stroke drawing of this shape to begin with.
     */
    const inside = (value) => Number(value) >= 0 && Number(value) <= 24;
    for (const [name, elements] of glyphs) {
      const text = await read(`${name}.svg`);
      for (const rule of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-linecap="round"', 'stroke-linejoin="round"']) {
        assert.ok(text.includes(`\n  ${rule}\n`), `glyphs/${name}.svg does not declare ${rule} on its root`);
      }
      assert.ok(elements.length > 0, `glyphs/${name}.svg draws nothing`);
      for (const { tag, attrs } of elements) {
        const where = `glyphs/${name}.svg <${tag}>`;
        if (tag === 'path') {
          // The path grammar's own alphabet, starting with a move. A malformed
          // `d` draws nothing and raises no error.
          assert.match(attrs.d, /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*$/, where);
        } else if (tag === 'circle') {
          for (const edge of [+attrs.cx - +attrs.r, +attrs.cx + +attrs.r, +attrs.cy - +attrs.r, +attrs.cy + +attrs.r]) {
            assert.ok(inside(edge), `${where} leaves the grid`);
          }
        } else if (tag === 'rect') {
          const x = Number(attrs.x ?? 0);
          const y = Number(attrs.y ?? 0);
          for (const edge of [x, y, x + Number(attrs.width), y + Number(attrs.height)]) assert.ok(inside(edge), `${where} leaves the grid`);
        } else if (tag === 'line') {
          for (const key of ['x1', 'y1', 'x2', 'y2']) assert.ok(inside(attrs[key]), `${where} leaves the grid`);
        } else if (tag === 'ellipse') {
          for (const edge of [+attrs.cx - +attrs.rx, +attrs.cx + +attrs.rx, +attrs.cy - +attrs.ry, +attrs.cy + +attrs.ry]) {
            assert.ok(inside(edge), `${where} leaves the grid`);
          }
        } else {
          for (const value of attrs.points.split(/[\s,]+/).filter(Boolean)) assert.ok(inside(value), `${where} leaves the grid`);
        }
      }
    }
  });

  it('are the upstream bytes: every file has its checksum, and every checksum a file', async () => {
    // Recomputed here rather than trusted from readGlyphs, and in both
    // directions, the LICENSE included.
    const recorded = await checksums();
    const files = (await readdir(GLYPHS_DIR)).filter((file) => file.endsWith('.svg') || file === 'LICENSE').sort();
    assert.deepEqual([...recorded.keys()].sort(), files);
    for (const file of files) {
      assert.equal(sha256(await readFile(resolve(GLYPHS_DIR, file))), recorded.get(file), file);
    }
  });

  it('come from the pinned release, whose name each file still carries', async () => {
    for (const name of glyphs.keys()) {
      assert.ok((await read(`${name}.svg`)).startsWith(`<!-- @license lucide-static v${VERSION} - ISC -->\n`), name);
    }
  });
});

describe('the shape the build accepts', () => {
  /*
   * A real file, bent one way at a time. Every one of these would compile into
   * a component that draws something other than the file, or claims a name
   * the file was not published under, so the parser refuses each rather than
   * the build shipping it.
   */

  it('takes the file as published', () => {
    assert.ok(glyphs.has('x'), 'x is not vendored, and every case below bends it');
    assert.deepEqual(parseGlyph('x', source), glyphs.get('x'));
  });

  for (const [what, name, text, message] of [
    ['a file renamed after it was extracted', 'close', source, /class is "lucide lucide-x"/],
    ['a drawing from another release', 'x', source.replace(`v${VERSION}`, 'v0.1.0'), /is from lucide-static 0\.1\.0/],
    ['a root with an attribute of its own', 'x', source.replace('  fill="none"\n', '  fill="none"\n  opacity="0.5"\n'), /opacity/],
    ['a root that fills', 'x', source.replace('fill="none"', 'fill="currentColor"'), /fill is "currentColor"/],
    ['a child with a transform', 'x', source.replace('<path d="M18 6 6 18" />', '<path d="M18 6 6 18" transform="scale(2)" />'), /transform, which is not geometry/],
    ['a child painted in a colour of its own', 'x', source.replace('<path d="M18 6 6 18" />', '<path d="M18 6 6 18" fill="red" />'), /filled with red/],
    ['an element that is not a drawing primitive', 'x', source.replace('<path d="M18 6 6 18" />', '<image href="a.png" />'), /<image> is not a drawing primitive/],
    ['a group', 'x', source.replace('  <path d="M18 6 6 18" />\n', '  <g>\n  <path d="M18 6 6 18" />\n  </g>\n'), /not a lucide-static drawing/],
  ]) {
    it(`refuses ${what}`, () => {
      assert.throws(() => parseGlyph(name, text), message);
    });
  }
});

describe('the drawings a caller may fill', () => {
  it('are each one closed silhouette', () => {
    assert.ok(FILLABLE.length > 0, 'nothing is FILLABLE, so the filled state has nothing to test');
    for (const name of FILLABLE) assert.ok(isClosed(glyphs.get(name)), `${name} is FILLABLE but has an open stroke`);
    assert.deepEqual(fillableProblems(glyphs), []);
  });

  it('refuse a drawing with an open stroke, and a name that is not vendored', () => {
    // `bell` has an open clapper and `flag` an open pole: filled, each is a
    // blob with a line through it.
    assert.deepEqual(fillableProblems(glyphs, ['star', 'bell', 'flag', 'heart']), [
      'FILLABLE names bell, whose drawing has an open stroke; filled, it paints a blob rather than the mark',
      'FILLABLE names flag, whose drawing has an open stroke; filled, it paints a blob rather than the mark',
      'FILLABLE names heart, which glyphs/ does not carry',
    ]);
  });

  it('tell a closed shape from an open one', () => {
    const path = (d) => [{ tag: 'path', attrs: { d } }];
    assert.equal(isClosed(path('M2 2h4v4z')), true);
    assert.equal(isClosed(path('M2 2h4v4zm8 0h4v4Z')), true);
    assert.equal(isClosed(path('M2 2h4v4')), false);
    assert.equal(isClosed(path('M2 2h4v4zm8 0h4')), false);
    assert.equal(isClosed([{ tag: 'line', attrs: { x1: '1', y1: '1', x2: '2', y2: '2' } }]), false);
    assert.equal(isClosed([{ tag: 'polyline', attrs: { points: '1 1 2 2 3 1' } }]), false);
    assert.equal(isClosed([{ tag: 'circle', attrs: { cx: '5', cy: '5', r: '2' } }]), true);
    // A dot upstream already paints solid would vanish into a filled shape.
    assert.equal(isClosed([{ tag: 'circle', attrs: { cx: '5', cy: '5', r: '1', fill: 'currentColor' } }]), false);
  });
});

describe('the notices that travel with the drawings', () => {
  it('are upstream\'s LICENSE: the ISC text and the Feather MIT text beneath it', async () => {
    const license = await read('LICENSE');
    assert.match(license, /^ISC License\n\nCopyright \(c\) \d{4} Lucide Icons and Contributors\n/);
    assert.match(license, /Permission to use, copy, modify, and\/or distribute this software/);
    assert.match(license, /The following Lucide icons are derived from the Feather project:/);
    assert.match(license, /The MIT License \(MIT\) \(for the icons listed above\)\n\nCopyright \(c\) 2013-present Cole Bemis/);
  });

  it('list every glyph in the README exactly as vendored', async () => {
    /*
     * The provenance table is written by scripts/vendor-glyphs.mjs from the
     * directory, so a file added or removed by hand, without the script that
     * writes its checksum, leaves the table behind and fails here.
     */
    const readme = await read('README.md');
    const start = readme.indexOf(TABLE_START);
    const end = readme.indexOf(TABLE_END);
    assert.ok(start !== -1 && end > start, 'glyphs/README.md has lost the markers around its table');
    assert.equal(readme.slice(start + TABLE_START.length, end).trim(), glyphTable([...glyphs.keys()]));
    // And the pin the provenance rests on, where a reader of the package finds
    // it rather than only in a script.
    assert.ok(readme.includes(`\`lucide-static\` ${VERSION}`), 'glyphs/README.md does not name the pinned version');
    assert.ok(readme.includes(INTEGRITY), 'glyphs/README.md does not name the pinned integrity');
  });
});
