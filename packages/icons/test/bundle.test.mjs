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
