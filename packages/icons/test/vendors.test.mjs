/**
 * The marks of the third-party tools, which are the one place this design
 * system draws somebody else's colours.
 *
 * The rules that need holding are the ones a reader cannot see: that a mark is
 * decoration until it is named, that the muted state is a class rather than an
 * inline style a strict Content-Security-Policy would refuse, that the
 * monochrome marks and only those take the current text colour, and that two
 * marks on one page do not share an id.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { VENDORS, VendorMark } from '../dist/index.js';
import { PACKAGE, attribute, render } from './support.mjs';

describe('the vendor list', () => {
  it('is exactly the drawings the package carries', async () => {
    const files = (await readdir(resolve(PACKAGE, 'svg/vendor')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length))
      .sort();
    assert.deepEqual([...VENDORS].sort(), files);
  });

  it('gives each vendor its own drawing', () => {
    // A typo in the map from a vendor to its component draws the wrong
    // company's mark beside the right company's name, and every other rule
    // here would still pass.
    const drawn = new Map(VENDORS.map((vendor) => [vendor, render(VendorMark, { vendor })]));
    for (const [vendor, markup] of drawn) {
      const twins = [...drawn].filter(([other, theirs]) => other !== vendor && theirs === markup).map(([other]) => other);
      assert.deepEqual(twins, [], `${vendor} draws the same mark as ${twins.join(', ')}`);
    }
  });
});

describe('a vendor mark', () => {
  it('draws every vendor, decorative and unfocusable by default', () => {
    for (const vendor of VENDORS) {
      const markup = render(VendorMark, { vendor });
      assert.match(markup, /<path/, vendor);
      assert.equal(attribute(markup, 'aria-hidden'), 'true', vendor);
      assert.equal(attribute(markup, 'focusable'), 'false', vendor);
      assert.equal(attribute(markup, 'role'), null, vendor);
    }
  });

  it('is named and exposed once it has a title, and hidden no longer', () => {
    const markup = render(VendorMark, { vendor: 'slack', title: 'Slack' });
    assert.equal(attribute(markup, 'role'), 'img');
    assert.equal(attribute(markup, 'aria-label'), 'Slack');
    assert.equal(attribute(markup, 'aria-hidden'), null);
  });

  it('carries the muted state as a class, never as a style attribute', () => {
    const muted = render(VendorMark, { vendor: 'gitlab', muted: true });
    assert.match(attribute(muted, 'class'), /\bcrewlet-vendor-mark--muted\b/);
    assert.equal(attribute(muted, 'style'), null);
    assert.doesNotMatch(attribute(render(VendorMark, { vendor: 'gitlab' }), 'class'), /--muted/);
  });

  it('sizes like a glyph, and defaults to one em', () => {
    assert.equal(attribute(render(VendorMark, { vendor: 'slack' }), 'width'), '1em');
    assert.equal(attribute(render(VendorMark, { vendor: 'slack', size: 'lg' }), 'height'), '20px');
    assert.equal(attribute(render(VendorMark, { vendor: 'slack', size: 40 }), 'width'), '40px');
  });

  it('draws the monochrome marks in the current text colour and nobody else in it', () => {
    /*
     * GitHub and Notion each publish one mark, black on a light ground and
     * white on a dark one, so the current text colour is the vendor's own
     * instruction and a fixed hex would be wrong in one theme whichever was
     * picked. Every other mark is the vendor's own colours, which is the one
     * sanctioned exception to colour carrying state rather than identity, and
     * a mark quietly joining this list is a mark that has lost them.
     */
    const monochrome = ['github', 'notion'];
    const inherited = VENDORS.filter((vendor) => attribute(render(VendorMark, { vendor }), 'fill') === 'currentColor');
    assert.deepEqual([...inherited].sort(), monochrome);
  });

  it('reads no token, because a vendor hue is not ours to theme', async () => {
    /*
     * The other half of the exception. A mark is the one place here that draws
     * somebody else's colours, and the moment one of them is a token it starts
     * moving with a palette decision nobody made about that vendor: a themed
     * Slack aubergine is not Slack's, and the next contrast sweep would have
     * every reason to move it.
     */
    const directory = resolve(PACKAGE, 'svg/vendor');
    const files = (await readdir(directory)).filter((file) => file.endsWith('.svg'));
    for (const file of files) {
      const source = await readFile(resolve(directory, file), 'utf8');
      assert.doesNotMatch(source, /var\(\s*--/, `${file} paints from a token`);
    }
  });

  it('keeps the ids of each mark to itself', () => {
    // Inline SVGs share the document's id space, so two marks on one page with
    // the same gradient id both paint with whichever came first.
    const markup = render(VendorMark, { vendor: 'atlassian' });
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(ids.length > 0);
    for (const id of ids) assert.match(id, /^crewlet-vendor-atlassian/);
  });
});
