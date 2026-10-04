/**
 * The list the Foundations/Tokens/Colors story draws (src/tokenSwatches.ts).
 *
 * The story used to list the typed `color` export, which is the BASE root:
 * under the theme toolbar it drew the marketing black for the frame and the
 * sheet in the light palette, and never showed the grounds either palette
 * paints. These cases hold the list to what the cascade paints.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { color, themes } from '@crewlethq/tokens';
import { swatchesFor } from '../src/tokenSwatches.ts';

const flatten = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, child]) =>
    typeof child === 'string' ? [[prefix + key, child]] : flatten(child, `${prefix}${key}.`),
  );
const valueOf = (list, name) => list.find((swatch) => swatch.name === name)?.value;

for (const theme of ['dark', 'light']) {
  test(`the ${theme} list paints every slot the ${theme} palette declares with its own value`, () => {
    const list = swatchesFor(theme);
    const declared = flatten(themes[theme].color);
    assert.ok(declared.length > 0);
    for (const [name, value] of declared) {
      assert.deepEqual(list.find((swatch) => swatch.name === name), { name, value, source: 'palette' }, name);
    }
  });

  test(`the ${theme} list falls back to the base root only where the palette declares nothing`, () => {
    const own = new Set(flatten(themes[theme].color).map(([name]) => name));
    const inherited = swatchesFor(theme).filter((swatch) => swatch.source === 'base');
    assert.ok(inherited.length > 0, 'the brand marks and avatar tints are shared by every root');
    for (const swatch of inherited) {
      assert.ok(!own.has(swatch.name), swatch.name);
      assert.equal(swatch.value, valueOf(swatchesFor('base'), swatch.name), swatch.name);
    }
  });
}

test('the two palettes paint their own grounds, not the base root\'s black', () => {
  const grounds = ['surface.frame', 'surface.background', 'surface.subtle'];
  const dark = swatchesFor('dark');
  const light = swatchesFor('light');
  assert.deepEqual(grounds.map((name) => valueOf(dark, name)), ['#07080d', '#0c0e16', '#11141d']);
  assert.deepEqual(grounds.map((name) => valueOf(light, name)), ['#e9ecf3', '#f6f7fb', '#fcfcfc']);
  // The frame and the sheet are two rungs in either palette.
  assert.notEqual(valueOf(dark, 'surface.frame'), valueOf(dark, 'surface.background'));
  assert.notEqual(valueOf(light, 'surface.frame'), valueOf(light, 'surface.background'));
});

test('the base list is the typed color export, in its order, and every list shares that order', () => {
  const base = flatten(color);
  assert.deepEqual(
    swatchesFor('base').map(({ name, value }) => [name, value]),
    base,
  );
  assert.ok(swatchesFor('base').every((swatch) => swatch.source === 'base'));
  for (const theme of ['dark', 'light']) {
    assert.deepEqual(
      swatchesFor(theme).map(({ name }) => name),
      base.map(([name]) => name),
    );
  }
});
