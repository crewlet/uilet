// nearestContrastShade: the one implementation behind every "Use #007f7f
// (4.51:1)" suggestion. Held to its contract: the answer clears the floor as
// rounded, keeps the colour's hue, moves lightness no further than it has to,
// and is null when no shade of the colour can clear the floor.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contrast, deltaE, hue, parseHex, toOklab } from './color.mjs';
import { WCAG_CONTRAST, nearestContrastShade } from '../dist/index.js';

const LIGHT_PAGE = '#f6f7fb';
const DARK_PAGE = '#0c0e16';

const ratio = (a, b) => contrast(parseHex(a), parseHex(b));
const lightness = (value) => toOklab(parseHex(value)).L;

/** Hue distance in degrees, around the circle. */
const hueDistance = (a, b) => {
  const d = Math.abs(hue(parseHex(a)) - hue(parseHex(b))) % 360;
  return d > 180 ? 360 - d : d;
};

describe('nearestContrastShade', () => {
  test('a teal too light for a light page becomes a darker teal at the body floor', () => {
    const shade = nearestContrastShade('#00baba', LIGHT_PAGE, WCAG_CONTRAST.aa);
    assert.equal(shade, '#007f7f');
    assert.ok(ratio(shade, LIGHT_PAGE) >= WCAG_CONTRAST.aa);
    // The suggestion the setup wizard was designed around, within one step.
    assert.ok(deltaE(parseHex(shade), parseHex('#007f80')) < 1);
  });

  test('the large-text floor asks for less, so the shade moves less', () => {
    const shade = nearestContrastShade('#00baba', LIGHT_PAGE, WCAG_CONTRAST.aaLarge);
    assert.equal(shade, '#00a0a0');
    assert.ok(ratio(shade, LIGHT_PAGE) >= WCAG_CONTRAST.aaLarge);
    // #008b8b (3.87:1) also clears 3:1, but it is further from the source
    // than it needs to be: the nearest passing shade is lighter.
    assert.ok(lightness(shade) > lightness('#008b8b'));
  });

  test('a colour that already clears the floor is its own answer, normalised', () => {
    assert.equal(nearestContrastShade('#5B3DF5', '#ffffff', WCAG_CONTRAST.aa), '#5b3df5');
    assert.equal(nearestContrastShade(' #00baba ', DARK_PAGE, WCAG_CONTRAST.aa), '#00baba');
  });

  test('on a dark ground the shade moves lighter', () => {
    const shade = nearestContrastShade('#1f3a8a', DARK_PAGE, WCAG_CONTRAST.aa);
    assert.ok(shade);
    assert.ok(lightness(shade) > lightness('#1f3a8a'));
    assert.ok(ratio(shade, DARK_PAGE) >= WCAG_CONTRAST.aa);
  });

  for (const [colour, ground, min] of [
    ['#00baba', LIGHT_PAGE, WCAG_CONTRAST.aa],
    ['#ffd400', '#ffffff', WCAG_CONTRAST.aaLarge],
    ['#ff5a1f', '#ffffff', WCAG_CONTRAST.aa],
    ['#1f3a8a', DARK_PAGE, WCAG_CONTRAST.aa],
    ['#7c3aed', DARK_PAGE, WCAG_CONTRAST.aaa],
  ]) {
    test(`${colour} on ${ground} at ${min}:1 keeps its hue and clears the floor as rounded`, () => {
      const shade = nearestContrastShade(colour, ground, min);
      assert.ok(shade, 'a shade exists');
      assert.match(shade, /^#[0-9a-f]{6}$/);
      assert.ok(ratio(shade, ground) >= min, `${shade} reads ${ratio(shade, ground)}:1`);
      // Chroma may give way at the edge of the gamut; the hue never does.
      // Rounding to whole sRGB steps moves it by a fraction of a degree.
      assert.ok(hueDistance(shade, colour) < 2, `${shade} turned ${hueDistance(shade, colour)} degrees`);
    });
  }

  test('no shade at all is null, never a different colour', () => {
    // Nothing on a mid grey reaches 21:1, which only black on white does.
    assert.equal(nearestContrastShade('#777777', '#888888', 21), null);
  });

  test('values that are not #rrggbb, and floors under 1:1, are null', () => {
    assert.equal(nearestContrastShade('teal', LIGHT_PAGE, WCAG_CONTRAST.aa), null);
    assert.equal(nearestContrastShade('#0bb', LIGHT_PAGE, WCAG_CONTRAST.aa), null);
    assert.equal(nearestContrastShade('#00baba', 'white', WCAG_CONTRAST.aa), null);
    assert.equal(nearestContrastShade('#00baba', LIGHT_PAGE, 0.5), null);
    assert.equal(nearestContrastShade('#00baba', LIGHT_PAGE, Number.NaN), null);
  });
});
