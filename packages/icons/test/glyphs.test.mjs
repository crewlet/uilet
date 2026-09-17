/**
 * What a glyph puts in the document.
 *
 * The two that carry weight are the semantics and the optical size. A glyph is
 * decoration wherever a label sits beside it, which is nearly everywhere, and
 * announcing every one of them would make a toolbar unreadable; a titled glyph
 * has to be exposed instead, and cannot be both. And the optical size is a
 * different drawing rather than a scaled one, so picking the wrong one is a
 * glyph at the wrong weight beside a surface drawing the right one, which
 * nothing else in the build would notice.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BugReportGlyph,
  CloseGlyph,
  GLYPH_NAMES,
  GLYPH_SIZES,
  StarFillGlyph,
  StarGlyph,
  ViewColumnGlyph,
  glyphOpticalSize,
  glyphPixels,
} from '../dist/glyphs.js';
import { glyphByName } from '../dist/glyphs-registry.js';
import { readGlyphs } from '../scripts/symbols.mjs';
import { attribute, render } from './support.mjs';

const glyphs = await readGlyphs();
const close = glyphs.get('close');

describe('the glyph exports', () => {
  it('are exactly the drawings the package vendored', () => {
    assert.deepEqual([...GLYPH_NAMES].sort(), [...glyphs.keys()]);
  });

  it('answer to their own name, drawing what the name says', () => {
    for (const [name, drawing] of glyphs) {
      assert.equal(attribute(render(glyphByName(name), {}), 'd'), drawing[20], name);
    }
  });

  it('carry a mark for each meaning a surface would otherwise vendor for itself', () => {
    /*
     * These four were vendored into a consumer's own tree, with this package's
     * own pinned commit and checksum idiom, because nothing here meant what
     * they mean and a stroked outline among a hundred filled Material Symbols
     * reads as artwork from somewhere else. Nothing in the set stands in:
     * `flag` marks a thing for attention rather than a thing somebody chose to
     * keep, `error` and `warning` are a live failure rather than a filed
     * defect, and `dashboard` already means a landing screen, so borrowing it
     * would give one drawing two meanings.
     *
     * The assertion is the whole chain rather than the files, because a glyph
     * that is vendored but not exported is invisible to every consumer: the
     * name has to reach GLYPH_NAMES, which is what the GlyphName union is
     * built from; the component under that name has to draw the vendored path;
     * and the registry has to answer with that same component rather than a
     * second copy of it.
     */
    const marks = [
      ['star', StarGlyph],
      ['star-fill', StarFillGlyph],
      ['bug_report', BugReportGlyph],
      ['view_column', ViewColumnGlyph],
    ];
    for (const [name, Drawing] of marks) {
      assert.ok(GLYPH_NAMES.includes(name), `${name} is not in GLYPH_NAMES, so no consumer can name it`);
      assert.equal(attribute(render(Drawing, {}), 'd'), glyphs.get(name)?.[20], name);
      assert.equal(glyphByName(name), Drawing, `glyphByName('${name}') is not the component exported under its own name`);
    }
  });
});

describe('a glyph', () => {
  it('is decoration that cannot take focus', () => {
    const markup = render(CloseGlyph, {});
    assert.equal(attribute(markup, 'aria-hidden'), 'true');
    assert.equal(attribute(markup, 'focusable'), 'false');
    assert.equal(attribute(markup, 'role'), null);
    assert.equal(attribute(markup, 'class'), 'crewlet-glyph');
    assert.equal(attribute(markup, 'fill'), 'currentColor');
    assert.equal(attribute(markup, 'viewBox'), '0 -960 960 960');
  });

  it('is named and exposed once it has a title, and hidden no longer', () => {
    const markup = render(CloseGlyph, { title: 'Close' });
    assert.equal(attribute(markup, 'role'), 'img');
    assert.equal(attribute(markup, 'aria-label'), 'Close');
    assert.equal(attribute(markup, 'aria-hidden'), null);
  });

  it('keeps the class a caller adds, and its own', () => {
    assert.equal(attribute(render(CloseGlyph, { className: 'toolbar__icon' }), 'class'), 'crewlet-glyph toolbar__icon');
  });

  it('sizes from a step, a number or a length, and defaults to one em', () => {
    /*
     * The steps are written out rather than read from GLYPH_SIZES, which would
     * move both sides of the comparison at once and assert nothing. They are a
     * contract: a glyph sits beside type, so its steps are the type scale's,
     * and the whole platform draws them at these five.
     */
    assert.deepEqual({ ...GLYPH_SIZES }, { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 });
    assert.equal(attribute(render(CloseGlyph, {}), 'width'), '1em');
    assert.equal(attribute(render(CloseGlyph, { size: 'sm' }), 'height'), '14px');
    assert.equal(attribute(render(CloseGlyph, { size: 18 }), 'width'), '18px');
    assert.equal(attribute(render(CloseGlyph, { size: '1.5rem' }), 'width'), '1.5rem');
  });

  it('draws the optical size its rendered size asks for', () => {
    // At and below 20 the smaller drawing, above it the larger one, and the
    // default 1em resolves to neither so it takes the smaller.
    assert.equal(attribute(render(CloseGlyph, { size: 'md' }), 'd'), close[20]);
    assert.equal(attribute(render(CloseGlyph, { size: 'lg' }), 'd'), close[20]);
    assert.equal(attribute(render(CloseGlyph, { size: 'xl' }), 'd'), close[24]);
    assert.equal(attribute(render(CloseGlyph, { size: 21 }), 'd'), close[24]);
    assert.equal(attribute(render(CloseGlyph, {}), 'd'), close[20]);
  });

  it('takes an explicit optical size over the one its size implies', () => {
    // The only way a glyph sized by an ancestor's font size can be told which
    // drawing it wants, because CSS cannot hand a computed font size back to
    // the component that would have to choose.
    assert.equal(attribute(render(CloseGlyph, { size: 'xl', opsz: 20 }), 'd'), close[20]);
    assert.equal(attribute(render(CloseGlyph, { opsz: 24 }), 'd'), close[24]);
  });
});

describe('the size a glyph reads', () => {
  it('is a number of px only when the size says so', () => {
    assert.equal(glyphPixels(undefined), null);
    assert.equal(glyphPixels('md'), 16);
    assert.equal(glyphPixels(28), 28);
    assert.equal(glyphPixels('24px'), 24);
    assert.equal(glyphPixels('1em'), null);
    assert.equal(glyphPixels('100%'), null);
  });

  it('decides the drawing at the 20 px boundary, and defaults below it', () => {
    assert.equal(glyphOpticalSize(undefined), 20);
    assert.equal(glyphOpticalSize('lg'), 20);
    assert.equal(glyphOpticalSize(20), 20);
    assert.equal(glyphOpticalSize(21), 24);
    assert.equal(glyphOpticalSize('xl'), 24);
    assert.equal(glyphOpticalSize('2em'), 20);
  });
});
