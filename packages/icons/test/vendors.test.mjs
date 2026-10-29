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

import { CrewletIcon, VENDORS, VendorMark } from '../dist/index.js';
import { extent, markPaths } from '../scripts/mark.mjs';
import { PACKAGE, attribute, render } from './support.mjs';

describe('the vendor list', () => {
  it('is exactly the drawings the package carries, and Crewlet', async () => {
    const files = (await readdir(resolve(PACKAGE, 'svg/vendor')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length))
      .sort();
    assert.deepEqual(VENDORS.filter((vendor) => vendor !== 'crewlet').sort(), files);
  });

  it("draws Crewlet's own services with the brand mark, never a second copy of it", () => {
    // The built-in services stand beside the apps they replace, and their
    // mark is the one the product is known by: the same paths as CrewletIcon,
    // so a change to the brand mark reaches the catalogue too.
    const paths = (markup) => [...markup.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    const mark = render(VendorMark, { vendor: 'crewlet' });
    assert.deepEqual(paths(mark), paths(render(CrewletIcon, {})));
    assert.ok(paths(mark).length > 0);
    assert.match(attribute(render(VendorMark, { vendor: 'crewlet', muted: true }), 'class'), /--muted/);
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
     * GitHub, Notion and OpenCode each publish one mark, dark on a light
     * ground and light on a dark one, so the current text colour is the vendor's own
     * instruction and a fixed hex would be wrong in one theme whichever was
     * picked. Every other mark is the vendor's own colours, which is the one
     * sanctioned exception to colour carrying state rather than identity, and
     * a mark quietly joining this list is a mark that has lost them.
     */
    const monochrome = ['github', 'notion', 'opencode'];
    // Monochrome is the current text colour AND no colour of the mark's own
    // beneath it: Crewlet's drawing is rooted in currentColor, as every
    // illustration is, and paints its brand violet on the group inside.
    const inherited = VENDORS.filter((vendor) => {
      const markup = render(VendorMark, { vendor });
      return attribute(markup, 'fill') === 'currentColor' && !/fill="#/.test(markup);
    });
    assert.deepEqual([...inherited].sort(), monochrome);
  });

  it('names its vendor in a class, so a rule can reach one mark', () => {
    for (const vendor of VENDORS.filter((v) => v !== 'crewlet')) {
      const markup = render(VendorMark, { vendor });
      assert.match(attribute(markup, 'class') ?? '', new RegExp(`(^| )crewlet-vendor-mark--${vendor}( |$)`));
    }
  });

  it('draws Mattermost reversed on the dark themes, as Mattermost publishes it for a dark ground', async () => {
    // Its blue under 3:1 on the dark ground; reversed it is the text's ink.
    // The dark themes are chosen as the tokens choose them: dark is the
    // default, unless the document or the system asks for light.
    const sheet = await readFile(resolve(PACKAGE, 'src/VendorMark.css'), 'utf8');
    assert.match(sheet, /:root\[data-theme='dark'\] \.crewlet-vendor-mark--mattermost \{\s*fill: currentColor;/);
    assert.match(
      sheet,
      /@media not \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme='light'\]\) \.crewlet-vendor-mark--mattermost \{\s*fill: currentColor;/,
    );
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

/**
 * The points a path's commands end on, in user units: enough to tell how much
 * of its frame a drawing takes, where a bounding box would need every curve
 * and arc solved. A curve or an arc bulging past its end points is not seen,
 * so the extent read here is never larger than the drawing.
 */
function anchors(d) {
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const points = [];
  let at = 0;
  // An arc's two flags are one digit each and may be written run together
  // ("0 01.4.4"), so they are read a character at a time.
  const flag = () => {
    while (/[\s,]/.test(d[at] ?? '')) at += 1;
    return Number(d[at++]);
  };
  const number = () => {
    const match = /^[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/i.exec(d.slice(at));
    if (!match) throw new Error(`no number at ${at} in ${d.slice(at, at + 12)}`);
    at += match[0].length;
    return Number(match[1]);
  };
  const more = () => /^[\s,]*[-.\d]/.test(d.slice(at));
  let command = 'M';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  while (at < d.length) {
    const letter = /^[\s,]*([A-Za-z])/.exec(d.slice(at));
    if (letter) {
      command = letter[1];
      at += letter[0].length;
    } else if (!more()) break;
    const upper = command.toUpperCase();
    const relative = command !== upper;
    if (upper === 'Z') {
      [x, y] = [startX, startY];
      continue;
    }
    const args = Array.from({ length: arity[upper] }, (_, i) => (upper === 'A' && (i === 3 || i === 4) ? flag() : number()));
    if (upper === 'H') x = relative ? x + args[0] : args[0];
    else if (upper === 'V') y = relative ? y + args[0] : args[0];
    else {
      const [ex, ey] = args.slice(-2);
      x = relative ? x + ex : ex;
      y = relative ? y + ey : ey;
    }
    if (upper === 'M') {
      [startX, startY] = [x, y];
      command = relative ? 'l' : 'L';
    }
    points.push([x, y]);
  }
  return points;
}

describe('a vendor mark in its square', () => {
  it('fills its frame, so the marks in a catalogue stand at one weight', async () => {
    /*
     * GitLab's press-kit file framed the logo in a 380 unit square with the
     * logo 186 units across, and drew at half the size of every mark beside
     * it (10px in a 20px slot). Every drawing's own end points span at least
     * four fifths of its frame's longer side, and none falls outside it. Four
     * fifths rather than the whole, because end points sit inside the curves
     * between them: Figma's round shapes fill their frame and their end points
     * span 83 percent of it.
     */
    const directory = resolve(PACKAGE, 'svg/vendor');
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.svg'))) {
      const source = await readFile(resolve(directory, file), 'utf8');
      const [x, y, width, height] = attribute(/<svg\b[^>]*>/.exec(source)[0], 'viewBox').split(/\s+/).map(Number);
      const points = markPaths(source).flatMap(anchors);
      const xs = points.map(([px]) => px);
      const ys = points.map(([, py]) => py);
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      assert.ok(span / Math.max(width, height) >= 0.8, `${file} draws ${Math.round((span / Math.max(width, height)) * 100)} percent of its frame`);
      // A fiftieth of the frame: Atlassian's own drawing runs a third of a
      // unit past its 24 unit frame, which no reader sees.
      const slack = Math.max(width, height) * 0.02;
      assert.ok(Math.min(...xs) >= x - slack && Math.max(...xs) <= x + width + slack, `${file} draws outside its frame across`);
      assert.ok(Math.min(...ys) >= y - slack && Math.max(...ys) <= y + height + slack, `${file} draws outside its frame down`);
    }
  });

  it("frames Crewlet's mark in the square its own extent fits, centred", async () => {
    /*
     * The wide file keeps artwork margins round the mark, and fitted to a
     * square slot it drew 17 by 9 pixels where the marks beside it drew 20 by
     * 20. The vendor mark frames the same paths in the square the mark's own
     * extent fits, so it draws the slot's full width.
     */
    const mark = extent(markPaths(await readFile(resolve(PACKAGE, 'svg/crewlet-icon.svg'), 'utf8')));
    const [x, y, width, height] = attribute(render(VendorMark, { vendor: 'crewlet' }), 'viewBox').split(/\s+/).map(Number);
    assert.equal(width, height, 'the frame is square');
    assert.ok(x <= mark.left && x + width >= mark.right, 'the frame crops the mark across');
    assert.ok(y <= mark.top && y + height >= mark.bottom, 'the frame crops the mark down');
    const off = (edge, low, high) => Math.abs(edge + width / 2 - (low + high) / 2);
    assert.ok(off(x, mark.left, mark.right) <= 2, 'the mark is not centred across');
    assert.ok(off(y, mark.top, mark.bottom) <= 2, 'the mark is not centred down');
    assert.ok(width / (mark.right - mark.left) <= 1.01, 'the frame leaves air beside the mark');
    // Every other vendor keeps its own file's frame.
    assert.equal(attribute(render(VendorMark, { vendor: 'slack' }), 'viewBox'), '0 0 24 24');
  });
});
