/**
 * The palette suite, over the CSS this package just built.
 *
 * The rules live in palette.mjs, which is published, so this file and a
 * consumer's own suite measure the same table. What is here is the reading of
 * dist/css in IMPORT order, the assertion, and two guards on the suite itself:
 * a rule table that measured nothing would pass for any stylesheet.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { describeFailure, paletteStates, runPalette, tightest } from './palette.mjs';

const read = (name) => readFileSync(fileURLToPath(new URL(`../dist/css/${name}`, import.meta.url)), 'utf8');
// tokens.css first, themes.css second: they share the :root selector, neither
// adds specificity, and the later import is the one that paints.
const sources = { tokens: read('tokens.css'), themes: read('themes.css') };

describe('the palette', () => {
  const { checks, failures } = runPalette(sources);

  test('every rule holds in every theme state', (t) => {
    for (const check of tightest(checks).sort((a, b) => a.rule.localeCompare(b.rule))) {
      t.diagnostic(`tightest ${check.rule}: ${check.subject} (${check.state}) ${check.detail}`);
    }
    assert.deepEqual(failures.map(describeFailure), []);
  });

  test('the suite measured what it claims to', () => {
    // A rule table that read an empty token map would report no failures for
    // any stylesheet at all, which is the one way this suite can lie.
    const states = paletteStates(sources);
    assert.deepEqual(Object.keys(states), ['base', 'light', 'dark (media query)', 'dark (attribute)']);
    for (const [name, values] of Object.entries(states)) {
      assert.ok(values.size > 80, `${name} resolved only ${values.size} tokens`);
      assert.ok(values.has('--color-text-primary'), `${name} has no --color-text-primary`);
    }
    assert.notEqual(
      states.light.get('--color-surface-background'),
      states['dark (attribute)'].get('--color-surface-background'),
      'the light and dark states resolved to the same page colour, so the theme blocks were not read',
    );
    assert.ok(checks.length > 400, `only ${checks.length} checks ran`);
  });

  test('the theme layer wins over the token layer', () => {
    // themes.css is imported second on purpose. If that ever stopped being
    // true the light state would silently be the marketing palette.
    const states = paletteStates(sources);
    assert.equal(states.base.get('--color-surface-background'), '#000000');
    assert.equal(states.light.get('--color-surface-background'), '#ffffff');
  });
});
