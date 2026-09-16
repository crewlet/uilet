/**
 * What an illustration puts in the document, and what the build did to it.
 *
 * Both cases here guard a bug this package shipped, and both were invisible:
 * the build forced `fill="currentColor"` onto every root, which painted the
 * inside of every closed path in all eleven stroke illustrations; and a titled
 * icon kept the `aria-hidden` the generated component declares, so it looked
 * named and stayed silent.
 */

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { ICON_NAMES, Icon } from '../dist/index.js';
import { PACKAGE, attribute, componentName, render } from './support.mjs';

const root = (markup) => /<svg\b[^>]*>/.exec(markup)[0];

describe('an illustration', () => {
  it('keeps the fill its source declares', async () => {
    /*
     * A source that declares nothing takes currentColor, which is what makes
     * the brand artwork recolour. A source that says fill="none" means it.
     *
     * Read off what is rendered rather than off the generated source: the
     * generated source is what the build wrote, and the question is what a
     * page gets.
     */
    const sources = (await readdir(resolve(PACKAGE, 'svg'), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map((entry) => entry.name);
    assert.equal(sources.length, ICON_NAMES.length);
    let declaringNone = 0;
    for (const file of sources) {
      const source = await readFile(resolve(PACKAGE, 'svg', file), 'utf8');
      const declared = attribute(root(source), 'fill');
      if (declared === 'none') declaringNone += 1;
      assert.equal(attribute(root(render(Icon, { name: componentName(file) })), 'fill'), declared ?? 'currentColor', file);
    }
    // The stroke illustrations are the reason the rule exists, so a tree that
    // has none of them left would pass it for the wrong reason. The floor is
    // the count in the tree: eight agent poses and six feature illustrations.
    // It moves with the set, because a floor left behind the set stops
    // covering the drawings added since.
    assert.ok(declaringNone >= 14, `only ${declaringNone} sources declare fill="none"`);
  });

  it('is decoration until it is titled, and then it is exposed', () => {
    const hidden = render(Icon, { name: 'AgentIdle' });
    assert.equal(attribute(hidden, 'aria-hidden'), 'true');
    assert.equal(attribute(hidden, 'role'), null);

    const named = render(Icon, { name: 'AgentIdle', title: 'Waiting' });
    assert.equal(attribute(named, 'role'), 'img');
    assert.equal(attribute(named, 'aria-label'), 'Waiting');
    assert.equal(attribute(named, 'aria-hidden'), null);
  });
});
