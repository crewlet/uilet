/**
 * What a glyph puts in the document.
 *
 * Three things carry weight. The semantics: a glyph is decoration wherever a
 * label sits beside it, which is nearly everywhere, and announcing every one
 * would make a toolbar unreadable, while a titled glyph has to be exposed
 * instead and cannot be both. The frame: every glyph is one stroke weight with
 * round caps and joins on the 24 grid, and a glyph drawn otherwise looks like
 * it came from another set beside every one that is not. And the fill: a
 * stroke drawing with its inside painted is a blob unless the drawing is one
 * closed silhouette, which is what FILLABLE lists and what nothing else may
 * claim.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as Glyphs from '../dist/glyphs.js';
import { GLYPHS, glyphByName } from '../dist/glyphs-registry.js';
import { FILLABLE, componentName, glyphNames, readGlyphs } from '../scripts/glyphs.mjs';
import { attribute, render } from './support.mjs';

const { FILLABLE: EXPORTED_FILLABLE, GLYPH_NAMES, GLYPH_SIZES, GLYPH_STROKE, StarGlyph, XGlyph, cssLength } = Glyphs;
const glyphs = await readGlyphs();

/** Every element a piece of markup draws, as its tag and its attributes. */
const elementsOf = (markup) =>
  [...markup.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*?)\/?>/g)].map((match) => ({
    tag: match[1],
    attrs: Object.fromEntries([...match[2].matchAll(/([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g)].map((pair) => [pair[1], pair[2]])),
  }));

describe('the glyph exports', () => {
  it('are exactly the files in glyphs/, in both directions', async () => {
    // Read from the directory rather than through readGlyphs, so a file the
    // shared reader skipped would still be missed here.
    assert.deepEqual([...GLYPH_NAMES].sort(), await glyphNames());
    assert.ok(GLYPH_NAMES.length >= 100, `only ${GLYPH_NAMES.length} glyphs are exported`);
  });

  it('answer to their own name, drawing what the file draws', () => {
    for (const [name, elements] of glyphs) {
      const Component = Glyphs[componentName(name)];
      assert.equal(typeof Component, 'function', `${componentName(name)} is not exported`);
      assert.equal(glyphByName(name), Component, `glyphByName('${name}') is not the component exported under its own name`);
      assert.deepEqual(elementsOf(render(Component, {})), elements, name);
    }
  });

  it('register every glyph and nothing else', () => {
    assert.deepEqual(Object.keys(GLYPHS).sort(), [...GLYPH_NAMES].sort());
  });

  it('list the same FILLABLE the build was given, every one of them a glyph', () => {
    assert.deepEqual([...EXPORTED_FILLABLE], FILLABLE);
    for (const name of EXPORTED_FILLABLE) assert.ok(GLYPH_NAMES.includes(name), name);
  });
});

describe('a glyph', () => {
  it('is decoration that cannot take focus', () => {
    const markup = render(XGlyph, {});
    assert.equal(attribute(markup, 'aria-hidden'), 'true');
    assert.equal(attribute(markup, 'focusable'), 'false');
    assert.equal(attribute(markup, 'role'), null);
    assert.equal(attribute(markup, 'class'), 'crewlet-glyph');
  });

  it('is named and exposed once it has a title, and hidden no longer', () => {
    const markup = render(XGlyph, { title: 'Close' });
    assert.equal(attribute(markup, 'role'), 'img');
    assert.equal(attribute(markup, 'aria-label'), 'Close');
    assert.equal(attribute(markup, 'aria-hidden'), null);
  });

  it('keeps the class a caller adds, and its own', () => {
    assert.equal(attribute(render(XGlyph, { className: 'toolbar__icon' }), 'class'), 'crewlet-glyph toolbar__icon');
  });

  it('is a round-capped stroke on the 24 grid, at the design weight', () => {
    /*
     * Written out rather than read from the module, which would move both
     * sides of the comparison at once: 1.75 is the approved design's `.ico`
     * stroke, where Lucide's own files say 2.
     */
    const markup = render(XGlyph, {});
    assert.equal(attribute(markup, 'viewBox'), '0 0 24 24');
    assert.equal(attribute(markup, 'fill'), 'none');
    assert.equal(attribute(markup, 'stroke'), 'currentColor');
    assert.equal(attribute(markup, 'stroke-width'), '1.75');
    assert.equal(attribute(markup, 'stroke-linecap'), 'round');
    assert.equal(attribute(markup, 'stroke-linejoin'), 'round');
    assert.equal(GLYPH_STROKE, 1.75);
  });

  it('takes its weight from --crewlet-glyph-stroke, falling back to the design weight', () => {
    // The style carries the variable and the attribute the plain number, for
    // a page whose policy refuses the style attribute.
    assert.equal(attribute(render(XGlyph, {}), 'style'), 'stroke-width:var(--crewlet-glyph-stroke, 1.75)');
  });

  it('keeps the frame against a caller the types do not reach', () => {
    /*
     * GlyphProps has no fill, strokeWidth, caps, joins or viewBox, so this is
     * a caller in plain JavaScript, or one holding a spread of somebody else's
     * props. The drawing is the frame's either way.
     */
    const markup = render(XGlyph, {
      fill: 'red',
      viewBox: '0 0 48 48',
      strokeWidth: 3,
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
      style: { color: 'red', strokeWidth: 3 },
    });
    assert.equal(attribute(markup, 'fill'), 'none');
    assert.equal(attribute(markup, 'viewBox'), '0 0 24 24');
    assert.equal(attribute(markup, 'stroke-width'), '1.75');
    assert.equal(attribute(markup, 'stroke-linecap'), 'round');
    assert.equal(attribute(markup, 'stroke-linejoin'), 'round');
    // The caller's own style survives beside the frame's weight.
    assert.equal(attribute(markup, 'style'), 'color:red;stroke-width:var(--crewlet-glyph-stroke, 1.75)');
  });

  it('sizes from a step, a number or a length, and defaults to one em', () => {
    /*
     * The steps are written out rather than read from GLYPH_SIZES, which would
     * move both sides of the comparison at once and assert nothing. They are a
     * contract: a glyph sits beside type, so its steps are the type scale's.
     */
    assert.deepEqual({ ...GLYPH_SIZES }, { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 });
    assert.equal(attribute(render(XGlyph, {}), 'width'), '1em');
    assert.equal(attribute(render(XGlyph, { size: 'sm' }), 'height'), '14px');
    assert.equal(attribute(render(XGlyph, { size: 18 }), 'width'), '18px');
    assert.equal(attribute(render(XGlyph, { size: '1.5rem' }), 'width'), '1.5rem');
    assert.equal(cssLength('xl'), '24px');
  });
});

describe('the filled state', () => {
  it('paints a FILLABLE glyph solid in the text colour, and keeps its stroke', () => {
    const markup = render(StarGlyph, { filled: true });
    assert.equal(attribute(markup, 'fill'), 'currentColor');
    assert.equal(attribute(markup, 'stroke'), 'currentColor');
    assert.equal(attribute(render(StarGlyph, {}), 'fill'), 'none');
    assert.equal(attribute(render(StarGlyph, { filled: false }), 'fill'), 'none');
  });

  it('is refused by every other glyph, even untyped', () => {
    /*
     * The types keep `filled` off a glyph FILLABLE does not list; this is the
     * caller they do not reach. Filling `x` would paint nothing, but filling
     * `bell` or `flag` paints a blob with a line through it, and the prop must
     * not reach the DOM either, where React would warn about an unknown
     * boolean attribute on every render.
     */
    for (const name of GLYPH_NAMES.filter((glyph) => !FILLABLE.includes(glyph))) {
      const markup = render(glyphByName(name), { filled: true, fillable: true });
      assert.equal(attribute(markup, 'fill'), 'none', name);
      assert.equal(attribute(markup, 'filled'), null, name);
      assert.equal(attribute(markup, 'fillable'), null, name);
    }
  });
});
