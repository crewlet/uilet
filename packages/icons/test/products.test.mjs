/**
 * The marks of Crewlet's own products. What needs holding: the list is the
 * drawings the package carries, each product draws its own mark, a mark is
 * decoration until it is named, the soon state is a class (a strict policy
 * refuses a style attribute) that the soon rule reads through each drawing's
 * parts, and every drawing fills the 48 grid it is drawn on.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { PRODUCTS, ProductMark } from '../dist/index.js';
import { PACKAGE, attribute, render } from './support.mjs';

describe('a product mark', () => {
  it('is listed for exactly the drawings the package carries', async () => {
    const files = (await readdir(resolve(PACKAGE, 'svg/product')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length))
      .sort();
    assert.deepEqual([...PRODUCTS].sort(), files);
  });

  it('gives each product its own drawing', () => {
    const drawn = PRODUCTS.map((product) => render(ProductMark, { product }).replace(/class="[^"]*"/, ''));
    assert.equal(new Set(drawn).size, PRODUCTS.length);
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

  it('carries the soon state as a class, and every drawing has the parts it reads', () => {
    const soon = render(ProductMark, { product: 'chat', soon: true });
    assert.match(attribute(soon, 'class'), /\bcrewlet-product-mark--soon\b/);
    assert.equal(attribute(soon, 'style'), null);
    for (const product of PRODUCTS) {
      const markup = render(ProductMark, { product });
      assert.match(markup, /data-part="body"/, product);
      assert.match(markup, /data-part="detail"/, product);
    }
  });

  it('is drawn on the 48 grid, square', async () => {
    for (const product of PRODUCTS) {
      const source = await readFile(resolve(PACKAGE, `svg/product/${product}.svg`), 'utf8');
      assert.match(source, /viewBox="0 0 48 48"/, product);
    }
  });
});
