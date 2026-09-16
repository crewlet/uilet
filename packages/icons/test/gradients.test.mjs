/**
 * Where a gradient in a source SVG is measured from, which decides whether the
 * shapes painted with it appear at all.
 *
 * A gradient with no `gradientUnits` is measured in `objectBoundingBox`, the
 * SVG default, and a shape whose bounding box has no width or no height is
 * then not rendered: the gradient degenerates and the shape simply does not
 * paint. A horizontal or vertical stroke is exactly that box. uilet 0.2.0
 * shipped the default on all three feature illustrations, which is why the two
 * connection arrows in `human-in-loop` and the three config lines in
 * `company-as-code` were missing from every page that drew them. Nothing said
 * so: the file is valid, the build is clean, and the picture is just short a
 * few shapes.
 *
 * So the rule is a source-file rule rather than a rendering one, and it is
 * total over the illustrations: every gradient in `svg/` spans the canvas in
 * user space. Its counterpart, that the rule is guarding something real rather
 * than passing over a set that happens to have no axis-aligned strokes left in
 * it, is asserted beside it.
 *
 * `svg/vendor/` is deliberately outside that rule and must stay outside it. A
 * vendor's gradient is the vendor's: Atlassian's stops and its
 * objectBoundingBox percentages are how Atlassian draws that mark, and
 * respanning it across the 24x24 canvas would repaint somebody else's logo.
 * What carries over there is the failure rather than the convention, so the
 * third case below holds the narrower rule the marks can actually keep.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { PACKAGE, attribute } from './support.mjs';

async function sources(directory) {
  const names = (await readdir(resolve(PACKAGE, directory), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(names.map(async (name) => [name, await readFile(resolve(PACKAGE, directory, name), 'utf8')]));
}

const gradients = (source) => [...source.matchAll(/<(?:linear|radial)Gradient\b[^>]*>/g)].map((match) => match[0]);

/** The strokes and fills a file draws, which are the shapes a paint can reach. */
const strokes = (source) => [...source.matchAll(/<(?:line|path)\b[^>]*>/g)].map((match) => match[0]);

/** The paints an element references, as the ids inside its `url(#id)` values. */
const painted = (element) => [...element.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);

/**
 * Whether an element's geometry is a straight run along one axis, which is
 * what leaves it a bounding box with no area. A `<line>` says so in its
 * coordinates; a `<path>` says so when its whole `d` is one move and one
 * straight segment, in either the explicit or the shorthand spelling.
 */
function isAxisAligned(element) {
  if (element.startsWith('<line')) {
    return attribute(element, 'x1') === attribute(element, 'x2') || attribute(element, 'y1') === attribute(element, 'y2');
  }
  const d = attribute(element, 'd')?.trim();
  if (d === undefined) return false;
  const segment = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)$/.exec(d);
  if (segment === null) return /^M[\s\d.,-]+[HVhv][\s\d.-]+$/.test(d);
  const [, x1, y1, x2, y2] = segment;
  return x1 === x2 || y1 === y2;
}

describe('a gradient in a source SVG', () => {
  it('is measured in user space, in every file that defines one', async () => {
    const files = await sources('svg');
    let defined = 0;
    for (const [name, source] of files) {
      for (const gradient of gradients(source)) {
        defined += 1;
        assert.equal(
          attribute(gradient, 'gradientUnits'),
          'userSpaceOnUse',
          `${name}: ${attribute(gradient, 'id')} falls back to objectBoundingBox, so every axis-aligned shape it paints disappears`,
        );
      }
    }
    // A rule over an empty set passes for the wrong reason.
    assert.ok(defined >= 6, `only ${defined} gradients found in svg/`);
  });

  it('is what several axis-aligned strokes in the set paint from', async () => {
    /*
     * The counterpart. Were the illustrations ever redrawn without a straight
     * stroke among them, the rule above would still pass while protecting
     * nothing, so the reason it exists is asserted rather than remembered. The
     * floor is the five shapes that were actually missing: two arrows in
     * human-in-loop and three config lines in company-as-code.
     */
    const files = await sources('svg');
    const vulnerable = files.flatMap(([name, source]) => {
      const ids = new Set(gradients(source).map((gradient) => attribute(gradient, 'id')));
      return strokes(source)
        .filter((element) => painted(element).some((id) => ids.has(id)))
        .filter(isAxisAligned)
        .map(() => name);
    });
    assert.ok(vulnerable.length >= 5, `only ${vulnerable.length} axis-aligned strokes paint from a gradient`);
  });

  it('never paints an axis-aligned shape in a vendor mark from a box-measured one', async () => {
    /*
     * The same failure one directory down, under the only rule the marks can
     * keep. A vendor mark cannot be told to span its gradient across the
     * canvas without redrawing the vendor's logo, so what is held here is the
     * consequence: a box-measured gradient is fine until an axis-aligned
     * shape paints from it, and then that shape is simply not there. Today no
     * mark is in that position, and this is what says so the day one is.
     */
    for (const [name, source] of await sources('svg/vendor')) {
      const boxed = new Set(
        gradients(source)
          .filter((gradient) => attribute(gradient, 'gradientUnits') !== 'userSpaceOnUse')
          .map((gradient) => attribute(gradient, 'id')),
      );
      for (const element of strokes(source)) {
        if (!painted(element).some((id) => boxed.has(id))) continue;
        assert.ok(
          !isAxisAligned(element),
          `${name}: an axis-aligned shape paints from a gradient measured in its own box, so it does not render`,
        );
      }
    }
  });
});
