/**
 * The six hues, and the tokens they are drawn from.
 *
 * The union and the tokens package are two lists that have to agree: a hue
 * named here with no `--color-node-*` behind it draws a plate and a card with
 * no fill at all, and a hue the tokens add that nothing names can never be
 * chosen.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { NODE_HUES, NODE_HUE_NAMES, isNodeHue } from './nodeHue.js';

const tokens = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../tokens/tokens/color.json'), 'utf8'),
) as { color: { node: Record<string, unknown> } };

test('names exactly the hues the tokens package draws', () => {
  const drawn = Object.keys(tokens.color.node).filter((name) => !name.endsWith('Ink'));
  expect([...NODE_HUES].sort()).toEqual(drawn.sort());
});

test('gives every hue a name, and recognises its own hues and nothing else', () => {
  for (const hue of NODE_HUES) {
    expect(NODE_HUE_NAMES[hue].toLowerCase()).toBe(hue);
    expect(isNodeHue(hue)).toBe(true);
  }
  for (const value of ['', 'Purple', 'red', 'accent', null, 3]) expect(isNodeHue(value)).toBe(false);
});
