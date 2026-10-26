/**
 * The marks of Crewlet's own products. What needs holding: the list is the
 * drawings the package carries, each product has its 48 unit master, its
 * 16 pixel grid drawing and its 180 px app tile, ProductMark mounts the right
 * drawing for the size, a mark is decoration until it is named, the soon state
 * is a class (a strict policy refuses a style attribute) that the soon rule
 * reads through each drawing's own hidden keyline, the Assistant's two moving
 * parts are tagged for ThinkingIndicator, and every file draws in the violet
 * family and white alone.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { PRODUCTS, ProductMark } from '../dist/index.js';
import { PACKAGE, attribute, render } from './support.mjs';

/** The three sets of files, each one drawing per product. */
const SETS = {
  master: { dir: 'svg/product', viewBox: '0 0 48 48', parts: ['body', 'shade', 'keyline', 'detail'] },
  small: { dir: 'svg/product/small', viewBox: '0 0 16 16', parts: ['body', 'keyline', 'detail'] },
  tile: { dir: 'svg/product/app-tile', viewBox: '0 0 180 180', parts: ['ground', 'body', 'shade', 'detail'] },
};

/** The violet family and white. The deepest violet is the app tile's facet alone. */
const MARK_FILLS = new Set(['#7c56ff', '#6a3cff', '#ffffff', 'none']);
const TILE_FILLS = new Set([...MARK_FILLS, '#5c24ff']);

const source = (set, product) => readFile(resolve(PACKAGE, SETS[set].dir, `${product}.svg`), 'utf8');

/** Every <path> in a file, as its attributes. */
const paths = (svg) =>
  [...svg.matchAll(/<path\b([^>]*)\/>/g)].map(([, attrs]) =>
    Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])),
  );

const svgFiles = async (dir) =>
  (await readdir(resolve(PACKAGE, dir), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name.slice(0, -'.svg'.length))
    .sort();

describe('a product mark', () => {
  it('is listed for exactly the drawings the package carries, in every set', async () => {
    for (const { dir } of Object.values(SETS)) {
      assert.deepEqual([...PRODUCTS].sort(), await svgFiles(dir), dir);
    }
  });

  it('gives each product its own drawing, at both sizes', () => {
    for (const size of [16, 48]) {
      const drawn = PRODUCTS.map((product) => render(ProductMark, { product, size }).replace(/class="[^"]*"/, ''));
      assert.equal(new Set(drawn).size, PRODUCTS.length, `${size}px`);
    }
  });

  it('is decoration until it is named', () => {
    const plain = render(ProductMark, { product: 'worklet' });
    assert.equal(attribute(plain, 'aria-hidden'), 'true');
    for (const [product, title] of [['worklet', 'Worklet'], ['doclet', 'Doclet']]) {
      const named = render(ProductMark, { product, title });
      assert.equal(attribute(named, 'role'), 'img', product);
      assert.equal(attribute(named, 'aria-label'), title, product);
    }
  });

  it('carries the soon state as a class, and no style', () => {
    for (const size of [16, 48]) {
      const soon = render(ProductMark, { product: 'chat', size, soon: true });
      assert.match(attribute(soon, 'class'), /\bcrewlet-product-mark--soon\b/);
      assert.equal(attribute(soon, 'style'), null);
    }
  });
});

describe('the drawing a product mark mounts', () => {
  const viewBox = (props) => attribute(render(ProductMark, { product: 'worklet', ...props }), 'viewBox');

  it('is the 16 pixel grid drawing below 24 px', () => {
    for (const size of [12, 16, 20, 23.5, 'xs', 'sm', 'md', 'lg', '20px']) {
      assert.equal(viewBox({ size }), '0 0 16 16', String(size));
    }
  });

  it('is the master from 24 px up, and for a size it cannot measure', () => {
    for (const size of [24, 32, 48, 96, 'xl', '24px', '1em', '2rem', undefined]) {
      assert.equal(viewBox({ size }), '0 0 48 48', String(size));
    }
  });

  it('is the one the caller asks for, whatever the size', () => {
    assert.equal(viewBox({ size: 48, drawing: 'small' }), '0 0 16 16');
    assert.equal(viewBox({ size: '1em', drawing: 'small' }), '0 0 16 16');
    assert.equal(viewBox({ size: 16, drawing: 'master' }), '0 0 48 48');
    assert.equal(viewBox({ size: 16, drawing: 'auto' }), '0 0 16 16');
  });

  it('draws at the size it was given', () => {
    const markup = render(ProductMark, { product: 'doclet', size: 'md' });
    assert.equal(attribute(markup, 'width'), '16px');
    assert.equal(attribute(markup, 'height'), '16px');
  });
});

describe('the source files', () => {
  it('are square on their own grid, with no size of their own', async () => {
    for (const [set, { viewBox }] of Object.entries(SETS)) {
      for (const product of PRODUCTS) {
        const svg = await source(set, product);
        const root = /<svg\b[^>]*>/.exec(svg)[0];
        assert.match(root, new RegExp(`viewBox="${viewBox}"`), `${set}/${product}`);
        assert.doesNotMatch(root, /\s(width|height)=/, `${set}/${product}`);
      }
    }
  });

  it('draw with paths alone, filled, and nothing that runs, loads or styles', async () => {
    for (const set of Object.keys(SETS)) {
      for (const product of PRODUCTS) {
        const svg = await source(set, product);
        assert.doesNotMatch(svg, /<(style|script|text|filter|image|use|foreignObject)\b|href=|url\(|\sstyle=|\sstroke/, `${set}/${product}`);
        assert.doesNotMatch(svg, /[\u2013\u2014]/, `${set}/${product}`);
      }
    }
  });

  it('carry exactly the parts the soon rule and the app tile read', async () => {
    for (const [set, { parts }] of Object.entries(SETS)) {
      for (const product of PRODUCTS) {
        const found = paths(await source(set, product)).map((path) => path['data-part']);
        assert.deepEqual([...new Set(found)].sort(), [...parts].sort(), `${set}/${product}`);
      }
    }
  });

  it('draw in the violet family and white alone', async () => {
    for (const set of Object.keys(SETS)) {
      const allowed = set === 'tile' ? TILE_FILLS : MARK_FILLS;
      for (const product of PRODUCTS) {
        for (const path of paths(await source(set, product))) {
          assert.ok(allowed.has(path.fill?.toLowerCase()), `${set}/${product}: ${path['data-part']} fills ${path.fill}`);
        }
      }
    }
  });

  it('carry one hidden keyline in each mark, which only the soon rule paints', async () => {
    for (const set of ['master', 'small']) {
      for (const product of PRODUCTS) {
        const keylines = paths(await source(set, product)).filter((path) => path['data-part'] === 'keyline');
        assert.equal(keylines.length, 1, `${set}/${product}`);
        assert.equal(keylines[0].fill, 'none', `${set}/${product}`);
        // An outer and an inner contour: a ring, never a solid tile.
        assert.equal(keylines[0].d.match(/M/gi).length, 2, `${set}/${product}`);
      }
    }
  });

  it('keep the hidden keyline hollow through the build', () => {
    for (const size of [16, 48]) {
      for (const product of PRODUCTS) {
        const markup = render(ProductMark, { product, size });
        assert.match(markup, /<path fill="none" d="[^"]*" data-part="keyline"/, `${product} at ${size}px`);
      }
    }
  });

  it('tag the Assistant spark and its companion for the working motion, and nothing else', async () => {
    for (const set of ['master', 'small']) {
      for (const product of PRODUCTS) {
        const motion = paths(await source(set, product))
          .filter((path) => path['data-motion'] !== undefined)
          .map((path) => `${path['data-part']}:${path['data-motion']}`);
        assert.deepEqual(motion, product === 'assistant' ? ['detail:turn', 'detail:twinkle'] : [], `${set}/${product}`);
      }
    }
  });

  it('tuck only a part the soon keyline would crowd, on the 16 pixel grid', async () => {
    for (const set of ['master', 'small']) {
      for (const product of PRODUCTS) {
        const tucked = paths(await source(set, product)).filter((path) => path['data-soon'] !== undefined);
        for (const path of tucked) assert.equal(path['data-soon'], 'tuck', `${set}/${product}`);
        const expected = set === 'small' && product === 'assistant' ? 1 : 0;
        assert.equal(tucked.length, expected, `${set}/${product}`);
      }
    }
  });
});

/** How many numbers each path command takes. */
const ARGUMENTS = { M: 2, L: 2, H: 1, V: 1, A: 7, Z: 0 };

/**
 * A path's vertices in absolute coordinates, one per command, with H and V
 * read as L and a run of pairs after M read as L, as SVG does. An arc keeps
 * its radii and flags, so two figures compare arc for arc.
 */
function vertices(d) {
  const tokens = d.match(/[MLHVAZ]|-?(?:\d+\.?\d*|\.\d+)/gi);
  const out = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let command = '';
  for (let i = 0; i < tokens.length; ) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    else if (command === 'M') command = 'L';
    else if (command === 'm') command = 'l';
    const upper = command.toUpperCase();
    const relative = command !== upper;
    const n = tokens.slice(i, i + ARGUMENTS[upper]).map(Number);
    i += ARGUMENTS[upper];
    if (upper === 'Z') {
      [x, y] = [startX, startY];
      out.push({ command: 'Z' });
    } else if (upper === 'A') {
      [x, y] = relative ? [x + n[5], y + n[6]] : [n[5], n[6]];
      out.push({ command: 'A', x, y, rx: n[0], ry: n[1], flags: n.slice(2, 5).join() });
    } else {
      if (upper === 'M' || upper === 'L') [x, y] = relative ? [x + n[0], y + n[1]] : [n[0], n[1]];
      if (upper === 'H') x = relative ? x + n[0] : n[0];
      if (upper === 'V') y = relative ? y + n[0] : n[0];
      if (upper === 'M') [startX, startY] = [x, y];
      out.push({ command: upper === 'M' ? 'M' : 'L', x, y });
    }
  }
  return out;
}

/*
 * THE APP TILE BAKES THE MASTER'S FIGURE. Its figure is the master's, scaled
 * by 3 about the origin and moved by 18 units, in absolute coordinates; the
 * README promises that a change to a figure reaches its app tile too, and
 * this is what holds it. Every figure's arcs bow inward, so its vertices bound
 * it, and every vertex sits inside the maskable safe zone, a circle of
 * 72 px about the tile's centre.
 */
describe('the app tile', () => {
  const TILE_SCALE = 3;
  const TILE_OFFSET = 18;
  const SAFE_RADIUS = 72;
  const close = (a, b) => Math.abs(a - b) < 0.01;

  it('draws the master figure, scaled into the tile', async () => {
    for (const product of PRODUCTS) {
      const master = paths(await source('master', product)).filter((path) => path['data-part'] === 'detail');
      const tile = paths(await source('tile', product)).filter((path) => path['data-part'] === 'detail');
      assert.equal(tile.length, master.length, product);
      master.forEach((part, index) => {
        const label = `${product} detail ${index}`;
        assert.equal(tile[index]['data-motion'], part['data-motion'], label);
        assert.equal(tile[index]['fill-rule'], part['fill-rule'], label);
        const expected = vertices(part.d);
        const actual = vertices(tile[index].d);
        assert.equal(actual.length, expected.length, label);
        expected.forEach((vertex, at) => {
          const found = actual[at];
          assert.equal(found.command, vertex.command, `${label}, vertex ${at}`);
          if (vertex.command === 'Z') return;
          const where = `${label}, vertex ${at}: ${found.x},${found.y}`;
          assert.ok(close(found.x, vertex.x * TILE_SCALE + TILE_OFFSET), where);
          assert.ok(close(found.y, vertex.y * TILE_SCALE + TILE_OFFSET), where);
          if (vertex.command === 'A') {
            assert.ok(close(found.rx, vertex.rx * TILE_SCALE) && close(found.ry, vertex.ry * TILE_SCALE), where);
            assert.equal(found.flags, vertex.flags, where);
          }
        });
      });
    }
  });

  it('keeps every figure inside the maskable safe zone', async () => {
    for (const product of PRODUCTS) {
      for (const path of paths(await source('tile', product)).filter((part) => part['data-part'] === 'detail')) {
        for (const vertex of vertices(path.d).filter((point) => point.command !== 'Z')) {
          assert.ok(Math.hypot(vertex.x - 90, vertex.y - 90) <= SAFE_RADIUS, `${product}: ${vertex.x},${vertex.y}`);
        }
      }
    }
  });

  it('shares one frame across the four products', async () => {
    const frame = async (product) =>
      paths(await source('tile', product))
        .filter((path) => path['data-part'] !== 'detail')
        .map((path) => `${path['data-part']} ${path.fill} ${path.d}`);
    const [first, ...others] = PRODUCTS;
    const expected = await frame(first);
    for (const product of others) assert.deepEqual(await frame(product), expected, product);
  });
});

describe('the product mark stylesheet', () => {
  const read = () => readFile(resolve(PACKAGE, 'src/ProductMark.css'), 'utf8');

  it('draws soon hollow from the drawing itself: a tint, the keyline, the figure in violet and no facet', async () => {
    const css = await read();
    assert.match(css, /\.crewlet-product-mark--soon \[data-part='body'\] \{\s*fill-opacity: 0\.08;/);
    assert.match(css, /\.crewlet-product-mark--soon \[data-part='shade'\] \{\s*display: none;/);
    assert.match(css, /\.crewlet-product-mark--soon \[data-part='keyline'\] \{\s*fill: var\(--crewlet-product-mark-soon-ink\);/);
    assert.match(css, /\.crewlet-product-mark--soon \[data-part='detail'\] \{\s*fill: var\(--crewlet-product-mark-soon-ink\);/);
    assert.match(css, /\.crewlet-product-mark--soon \[data-soon='tuck'\] \{\s*transform: scale\(0\.9\);/);
    // The family has no dim or eye part any more.
    assert.doesNotMatch(css, /data-part='(dim|eye)'/);
  });

  it('draws the mono mark in the system colours under forced colours', async () => {
    const css = await read();
    const forced = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    assert.match(forced, /forced-color-adjust: none;/);
    assert.match(forced, /\[data-part='body'\],\s*\.crewlet-product-mark \[data-part='shade'\] \{\s*fill: CanvasText;/);
    assert.match(forced, /:not\(\.crewlet-product-mark--soon\) \[data-part='detail'\] \{\s*fill: Canvas;/);
    assert.match(forced, /\.crewlet-product-mark--soon \{\s*--crewlet-product-mark-soon-ink: CanvasText;/);
  });
});
