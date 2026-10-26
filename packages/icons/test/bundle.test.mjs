/**
 * What a consumer's build actually carries.
 *
 * This package ships over a hundred glyph drawings and a 670 KB illustration,
 * so the whole question is whether importing one of them brings the rest.
 * Nothing else in the build says: the bundle is valid, the types are right,
 * every test passes, and the page is half a megabyte heavier than it should
 * be.
 *
 * Two module-scope shapes cost exactly that, and both looked harmless:
 * `Component.displayName = 'Component'` is a statement a bundler cannot prove
 * is safe to drop, and `export * as Icons` compiles to a call that names every
 * member. One glyph carried every one of them (67 KB against 1 KB) and one
 * illustration carried all thirteen (515 KB against 4 KB). Neither has a
 * symptom a reader would notice.
 *
 * A glyph is identified in a bundle by its elements, each as the props object
 * the build hands React: `{d:"M18 6 6 18"}`, `{cx:"12",cy:"12",r:"10"}`. A
 * single value is not enough, because nineteen glyphs draw nothing another
 * glyph does not also draw somewhere (`minus` is the bar of `plus`), while
 * no two glyphs draw the same SET of elements. The positive case below reads
 * the same signature, so a bundler that printed the props differently fails
 * loudly there rather than making the negative case pass on nothing.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { build } from 'esbuild';

import { readGlyphs } from '../scripts/glyphs.mjs';

const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const glyphs = await readGlyphs();

// One consumer build, minified, with React left external, so what comes back
// is this package's own bytes and nothing else.
async function bundle(source) {
  const result = await build({
    stdin: { contents: source, resolveDir: PACKAGE, sourcefile: 'consumer.js', loader: 'js' },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    // The consumer's bundler reads a stylesheet; esbuild here is asked about
    // the JavaScript, so the rules are dropped rather than measured.
    loader: { '.css': 'empty' },
    external: ['react', 'react/jsx-runtime', 'react-dom'],
    // A side-effect-only chunk import that the sideEffects field lets esbuild
    // drop is exactly what this suite wants; the note about it is noise.
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

const oneGlyph = await bundle("import { XGlyph } from './dist/glyphs.js';\nconsole.log(XGlyph);\n");
const oneIllustration = await bundle("import { CrewletIcon } from './dist/index.js';\nconsole.log(CrewletIcon);\n");

/** A glyph's elements as a minified bundle prints them. */
const signature = (elements) =>
  elements.map(({ attrs }) => `{${Object.entries(attrs).map(([key, value]) => `${key}:${JSON.stringify(value)}`).join(',')}}`);

/** Whether a bundle draws every element of a glyph. */
const carries = (output, elements) => signature(elements).every((element) => output.includes(element));

describe('a build that imports one glyph', () => {
  const output = oneGlyph;

  it('carries that glyph', () => {
    assert.ok(carries(output, glyphs.get('x')), 'the x drawing is missing from the bundle');
  });

  it('carries no other glyph', () => {
    const others = [...glyphs].filter(([name, elements]) => name !== 'x' && carries(output, elements)).map(([name]) => name);
    assert.deepEqual(others, []);
  });

  it('stays under 4 KB', () => {
    // The drawing, the frame around it and the JSX call. A number rather than
    // a ratio, because the failure this catches is the whole set arriving,
    // which is ten times this.
    assert.ok(output.length < 4 * 1024, `one glyph bundles to ${output.length} bytes`);
  });
});

describe('a build that imports one illustration', () => {
  const output = oneIllustration;

  it('carries the illustration, under its own name', async () => {
    const { CrewletIcon } = await import('../dist/index.js');
    assert.equal(typeof CrewletIcon, 'function');
  });

  it('stays under 5 KB', async () => {
    assert.ok(output.length < 5 * 1024, `CrewletIcon bundles to ${output.length} bytes`);
  });

  it('leaves the 670 KB illustration behind', async () => {
    const reading = await readFile(resolve(PACKAGE, 'svg/crewlet-reading.svg'), 'utf8');
    // Any one of its paths would do; the first is enough to prove the file is
    // not in there.
    const path = /\sd="([^"]{200,})"/.exec(reading)[1].slice(0, 120);
    assert.ok(!output.includes(path), 'crewlet-reading is in a bundle that only asked for the mark');
  });
});

describe('a build that looks a glyph up by name', () => {
  it('carries every glyph, which is what the registry is for', async () => {
    const output = await bundle(
      "import { glyphByName } from './dist/glyphs-registry.js';\nconsole.log(glyphByName('x'));\n",
    );
    const missing = [...glyphs].filter(([, elements]) => !carries(output, elements)).map(([name]) => name);
    assert.deepEqual(missing, []);
  });
});

/*
 * THE PRODUCT MARKS' OWN ENTRY. An application draws the Assistant's mark in
 * its first paint (the Ask button), so the entry it imports from must reach
 * the four marks (both drawings of each) and the glyph frame and nothing
 * else. Held two ways: the
 * entry's own import graph, which no bundler setting can widen, never reaches
 * the root or another component's stylesheet; and a consumer's build of it
 * carries no vendor mark, no Crewlet figure and no glyph.
 */
describe('a build that imports a product mark from its own entry', () => {
  /** Every file a dist module reaches through its static imports, itself included. */
  async function graphOf(file) {
    const seen = new Set();
    const visit = async (name) => {
      if (seen.has(name)) return;
      seen.add(name);
      const source = await readFile(resolve(PACKAGE, 'dist', name), 'utf8');
      if (!name.endsWith('.js')) return;
      for (const [, spec] of source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"]*['"](\.\/[^'"]+)['"]/g)) {
        await visit(spec.slice(2));
      }
    };
    await visit(file);
    return [...seen];
  }

  it('never reaches the root or another component through its imports', async () => {
    const graph = await graphOf('product-mark.js');
    assert.ok(!graph.includes('index.js'), `the entry reaches the root: ${graph.join(', ')}`);
    const sheets = graph.filter((name) => name.endsWith('.css'));
    assert.deepEqual(
      sheets.map((name) => name.replace(/-[A-Z0-9]+\.css$/, '.css')),
      ['ProductMark.css'],
    );
  });

  it('carries the marks and nothing else the root draws', async () => {
    const output = await bundle("import { ProductMark } from './dist/product-mark.js';\nconsole.log(ProductMark);\n");
    assert.ok(output.includes('crewlet-product-mark'), 'the product mark is missing from the bundle');
    assert.ok(!output.includes('crewlet-vendor-mark'), 'a vendor mark is in a bundle that only asked for a product mark');
    assert.ok(!output.includes('crewlet-figure'), 'the Crewlet figure is in a bundle that only asked for a product mark');
    const drawn = [...glyphs].filter(([, elements]) => carries(output, elements)).map(([name]) => name);
    assert.deepEqual(drawn, []);
    // The eight drawings (each product's 48 unit master and its 16 pixel grid
    // drawing), their frame and the JSX calls: about 6 KB. The failure this
    // catches is the root arriving, which is a hundred times this.
    assert.ok(output.length < 8 * 1024, `the product mark bundles to ${output.length} bytes`);
  });

  it('exports what the root exports for the marks, the same functions', async () => {
    const entry = await import('../dist/product-mark.js');
    const root = await import('../dist/index.js');
    assert.deepEqual(Object.keys(entry).sort(), ['PRODUCTS', 'ProductMark']);
    assert.equal(entry.ProductMark, root.ProductMark);
    assert.equal(entry.PRODUCTS, root.PRODUCTS);
  });
});
