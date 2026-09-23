/**
 * The palette suite, over the CSS this package just built.
 *
 * The rules live in palette.mjs, which is published, so this file and a
 * consumer's own suite measure the same table. What is here is the reading of
 * dist/css in IMPORT order, the assertion, and the guards on the suite itself:
 * a rule table that measured nothing would pass for any stylesheet, and a
 * structural rule no edit can trip is a claim rather than a check.
 *
 * It ships in the tarball and runs from an installed copy, so it reads only
 * what the tarball carries: dist/, never the token source.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { describeFailure, paletteStates, runPalette, tightest } from './palette.mjs';
import { themes as typed } from '../dist/index.js';

const read = (name) => readFileSync(fileURLToPath(new URL(`../dist/css/${name}`, import.meta.url)), 'utf8');
// tokens.css first, themes.css second: they share the :root selector, neither
// adds specificity, and the later import is the one that paints.
const sources = { tokens: read('tokens.css'), themes: read('themes.css') };

const STATES = ['base', 'dark', 'light (media query)', 'light (attribute)'];
const THEME_STATES = STATES.filter((state) => state !== 'base');

const DARK_ROOT = ':root {';
const LIGHT_MEDIA_BLOCK = ':root:not([data-theme="dark"]) {';
const LIGHT_ATTRIBUTE_BLOCK = ':root[data-theme="light"] {';

/**
 * The theme file with ONE of its blocks edited, found by the block's own
 * opening line so the edit cannot land in a neighbouring block. `edit`
 * receives the block's body and returns the new one.
 */
function editBlock(css, opening, edit) {
  const start = css.indexOf(opening);
  assert.ok(start >= 0, `themes.css has no block opening with ${opening}`);
  const bodyStart = start + opening.length;
  const bodyEnd = css.indexOf('}', bodyStart);
  const body = css.slice(bodyStart, bodyEnd);
  const edited = edit(body);
  assert.notEqual(edited, body, 'the mutation changed nothing, so it proves nothing');
  return css.slice(0, bodyStart) + edited + css.slice(bodyEnd);
}

/** The structural rules a theme file fails, by name. */
const structuralFailures = (themes) =>
  runPalette({ ...sources, themes })
    .failures.filter((check) => check.state === 'the token files')
    .map((check) => check.rule);

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
    assert.deepEqual(Object.keys(states), STATES);
    for (const [name, values] of Object.entries(states)) {
      assert.ok(values.size > 80, `${name} resolved only ${values.size} tokens`);
      assert.ok(values.has('--color-text-primary'), `${name} has no --color-text-primary`);
    }
    assert.notEqual(
      states['light (attribute)'].get('--color-surface-background'),
      states.dark.get('--color-surface-background'),
      'the light and dark states resolved to the same page colour, so the theme blocks were not read',
    );
    assert.ok(checks.length > 400, `only ${checks.length} checks ran`);
  });

  test('every measured rule runs in each theme state, and the marketing root runs its share', () => {
    // Each state is its own route through the cascade, so a rule that ran in
    // one light state and not the other would leave a whole route unmeasured.
    // The marketing root is exempt from the product palette's separation and
    // rail rules by design (see checkState), so what it owes is the part of
    // the table it is held to.
    const byRule = new Map();
    for (const check of checks) {
      if (check.state === 'the token files') continue;
      byRule.set(check.rule, (byRule.get(check.rule) ?? new Set()).add(check.state));
    }
    assert.ok(byRule.size > 20, `only ${byRule.size} measured rules ran`);
    for (const [rule, states] of byRule) {
      for (const state of THEME_STATES) assert.ok(states.has(state), `"${rule}" never ran in the ${state} state`);
    }
    const onBase = [...byRule].filter(([, states]) => states.has('base')).map(([rule]) => rule);
    assert.ok(onBase.length > 10, `only ${onBase.length} rules ran on the marketing root`);
    assert.ok(onBase.includes('text step clears its floor'));
  });

  test('the theme layer is dark first, and wins over the token layer', () => {
    // themes.css is imported second on purpose. If that ever stopped being
    // true the dark state would silently be the marketing palette; and if the
    // bare root stopped being the dark palette, a document that sets nothing
    // would stop being drawn in the palette the product is designed in.
    const states = paletteStates(sources);
    assert.equal(states.base.get('--color-surface-background'), '#000000');
    assert.equal(states.dark.get('--color-surface-background'), typed.dark.color.surface.background);
    for (const state of ['light (media query)', 'light (attribute)']) {
      assert.equal(states[state].get('--color-surface-background'), typed.light.color.surface.background, state);
    }
  });
});

describe('the structure of the theme file', () => {
  test('the file as built passes every structural rule', () => {
    // The control for every case below: each mutation has to be the only
    // thing that turned its rule red.
    assert.deepEqual(structuralFailures(sources.themes), []);
  });

  test('a light slot that drifts in ONE light block is caught, whichever block it is', () => {
    for (const opening of [LIGHT_MEDIA_BLOCK, LIGHT_ATTRIBUTE_BLOCK]) {
      const themes = editBlock(sources.themes, opening, (body) =>
        body.replace(/--color-text-primary: [^;]+;/, '--color-text-primary: #123456;'),
      );
      assert.deepEqual(structuralFailures(themes), ['the two light blocks agree'], opening);
    }
  });

  test('a slot only one light block declares is drift, not agreement', () => {
    // Dropped from the media block, the slot is painted DARK for a reader on
    // a light system and light for one who chose light. A comparison that
    // walked only the media block's own keys would call that agreement.
    const themes = editBlock(sources.themes, LIGHT_MEDIA_BLOCK, (body) =>
      body.replace(/\s*--color-text-primary: [^;]+;/, ''),
    );
    assert.deepEqual(structuralFailures(themes), ['the two light blocks agree']);
  });

  test('a theme file with no light media block is caught', () => {
    const start = sources.themes.indexOf('@media (prefers-color-scheme: light)');
    const end = sources.themes.indexOf('\n}\n', start) + 3;
    assert.ok(start >= 0 && end > start, 'themes.css has no light media block to remove');
    const themes = sources.themes.slice(0, start) + sources.themes.slice(end);
    assert.deepEqual(structuralFailures(themes), ['the light media block is present', 'the two light blocks agree']);
  });

  test('a slot the dark root lacks is caught', () => {
    // Missing from the bare root, the slot falls through to the MARKETING
    // palette's value in tokens.css, which no measured rule can tell apart
    // from a dark value somebody chose.
    const themes = editBlock(sources.themes, DARK_ROOT, (body) => body.replace(/\s*--color-text-primary: [^;]+;/, ''));
    assert.deepEqual(structuralFailures(themes), ['the light block declares exactly the key set the dark block declares']);
  });
});
