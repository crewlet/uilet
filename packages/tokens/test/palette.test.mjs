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
import {
  ACTION_STEPS,
  CARD_HAIRLINE,
  describeFailure,
  fromOklab,
  hex,
  OPAQUE_SURFACES,
  OVERLAY_STEPS,
  paletteStates,
  parseHex,
  RAIL_CURRENT_ROW,
  runPalette,
  RUNG_STEPS,
  tightest,
  toOklab,
  VEIL_ALPHA,
  withAlpha,
} from './palette.mjs';
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

/**
 * The measured rules a palette fails once ONE declaration is edited in its own
 * blocks (the dark root, or both light blocks alike, so the structural rule
 * that holds them together stays out of it), by name and each once. Every
 * case that uses it edits one declaration and expects exactly the rules it
 * names back, so a mutation that tripped a neighbour as well would say so.
 */
function failuresAfter(palette, name, value) {
  const [openings, states] =
    palette === 'dark'
      ? [[DARK_ROOT], ['dark']]
      : [[LIGHT_MEDIA_BLOCK, LIGHT_ATTRIBUTE_BLOCK], ['light (media query)', 'light (attribute)']];
  let themes = sources.themes;
  for (const opening of openings) {
    themes = editBlock(themes, opening, (body) => body.replace(new RegExp(`${name}: [^;]+;`), `${name}: ${value};`));
  }
  return [
    ...new Set(
      runPalette({ ...sources, themes })
        .failures.filter((check) => states.includes(check.state))
        .map((check) => check.rule),
    ),
  ];
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

describe('the four rungs', () => {
  const { checks } = runPalette(sources);
  const dark = typed.dark.color;

  const darkFailures = (name, value) => failuresAfter('dark', name, value);

  test('four opaque rungs are measured, in every theme state', () => {
    // A ladder that lost a rung, or a rung that resolved to nothing a rule
    // could measure, would leave every rule above reading fewer grounds and
    // passing for it.
    assert.deepEqual(OPAQUE_SURFACES, [
      '--color-surface-frame',
      '--color-surface-background',
      '--color-surface-subtle',
      '--color-surface-elevated',
    ]);
    const states = paletteStates(sources);
    for (const state of THEME_STATES) {
      for (const rung of OPAQUE_SURFACES) {
        assert.ok(parseHex(states[state].get(rung) ?? ''), `${state}: ${rung} is not an opaque colour`);
        for (const rule of ['the neutral ramp stays neutral', OVERLAY_STEPS[0][0]]) {
          assert.ok(
            checks.some((check) => check.state === state && check.rule === rule && (check.subject === rung || check.subject.endsWith(` on ${rung}`))),
            `${state}: "${rule}" never measured ${rung}`,
          );
        }
      }
      const ladder = checks.filter((check) => check.state === state && RUNG_STEPS.some(([rule]) => rule === check.rule));
      assert.equal(ladder.length, RUNG_STEPS.length, `${state} ran ${ladder.length} steps of the ladder`);
    }
  });

  test('a sheet at the frame\'s own value is caught', () => {
    assert.deepEqual(darkFailures('--color-surface-background', dark.surface.frame), ['the sheet lifts off the frame']);
  });

  test('a card at the sheet\'s own value is caught', () => {
    assert.deepEqual(darkFailures('--color-surface-subtle', dark.surface.background), ['a card separates from the sheet']);
  });

  test('a hairline at the card\'s own value is caught', () => {
    const [line] = CARD_HAIRLINE;
    assert.deepEqual(darkFailures(line, dark.surface.subtle), ['the hairline that finds a card is visible on both sides of it']);
  });

  test('raised at the card\'s own value is caught', () => {
    assert.deepEqual(darkFailures('--color-surface-elevated', dark.surface.subtle), ['raised separates from the card']);
  });

  test('a hover overlay nobody can see is caught, and so is a press that looks like a hover', () => {
    assert.deepEqual(darkFailures('--color-surface-hover', withAlpha(dark.surface.hover, 0.01)), [OVERLAY_STEPS[0][0]]);
    assert.deepEqual(darkFailures('--color-surface-pressed', dark.surface.hover), [OVERLAY_STEPS[1][0]]);
  });

  test('a veil drawn in the sheet rather than the frame is caught', () => {
    assert.deepEqual(darkFailures('--color-surface-veil', withAlpha(dark.surface.background, VEIL_ALPHA)), [
      "the veil is this root's frame at an alpha, not a colour of its own",
    ]);
  });
});

describe('the accent and the primary action', () => {
  const { checks } = runPalette(sources);
  const LABEL_RULE = 'a label clears 4.5:1 on its own fill';
  const [HOVER_RULE, PRESS_RULE] = ACTION_STEPS.map(([rule]) => rule);

  /**
   * What `filter: brightness(1.08)` does to a colour, which is the hover the
   * approved design drew: each sRGB channel scaled and clipped.
   */
  const brightened = (value) => {
    const { r, g, b } = parseHex(value);
    return hex({ r: Math.min(255, r * 1.08), g: Math.min(255, g * 1.08), b: Math.min(255, b * 1.08) });
  };

  test('each of the three fills is measured under its label, and each step against the one before it, in every state', () => {
    // A table that silently stopped measuring one of the three would pass the
    // one step that was ever wrong.
    for (const state of STATES) {
      for (const fill of ['--color-brand-accent', '--color-brand-accent-hover', '--color-brand-accent-active']) {
        assert.ok(
          checks.some((check) => check.state === state && check.rule === LABEL_RULE && check.subject === `--color-text-on-accent on ${fill}`),
          `${state}: the label was never measured on ${fill}`,
        );
      }
      for (const rule of [HOVER_RULE, PRESS_RULE]) {
        assert.equal(checks.filter((check) => check.state === state && check.rule === rule).length, 1, `${state}: ${rule}`);
      }
    }
  });

  test("the approved design's brightening hover is caught in both palettes", () => {
    // In dark it takes the white label under the text floor (4.18:1), which
    // the label rule sees; in light it still clears 5.01:1, and only the step
    // rule sees that it moved toward the label rather than away from it.
    assert.equal(brightened(typed.dark.color.brand.accent), '#865dff');
    assert.deepEqual(failuresAfter('dark', '--color-brand-accent-hover', brightened(typed.dark.color.brand.accent)), [
      LABEL_RULE,
      HOVER_RULE,
    ]);
    assert.deepEqual(failuresAfter('light', '--color-brand-accent-hover', brightened(typed.light.color.brand.accent)), [
      HOVER_RULE,
    ]);
  });

  test('a step nobody can see is caught, even one in the right direction', () => {
    // Darker by dE 1: the label still gains, so only the visibility floor
    // stands between this and a button that does not answer the pointer.
    const barely = (value) => {
      const lab = toOklab(parseHex(value));
      return hex(fromOklab({ ...lab, L: lab.L - 0.01 }));
    };
    const { accent, accentHover } = typed.dark.color.brand;
    assert.deepEqual(failuresAfter('dark', '--color-brand-accent-hover', barely(accent)), [HOVER_RULE]);
    assert.deepEqual(failuresAfter('dark', '--color-brand-accent-active', barely(accentHover)), [PRESS_RULE]);
    // And a press that IS the hover moves nowhere at all.
    assert.deepEqual(failuresAfter('dark', '--color-brand-accent-active', accentHover), [PRESS_RULE]);
  });

  test('a focus ring drawn in the dark accent itself is caught', () => {
    // The accent cannot clear 3:1 on the lightest dark ground and still carry
    // a white label, which is why the ring is its own step.
    assert.deepEqual(failuresAfter('dark', '--color-focus', typed.dark.color.brand.accent), ['the focus ring clears 3:1']);
  });

  test("the rail's current row is caught when its hairline or its lift is lost", () => {
    const [fill, line] = RAIL_CURRENT_ROW;
    assert.deepEqual([fill, line], ['--color-surface-elevated', '--color-border-default']);
    // The line drawn in the row's own colour is no line at all.
    assert.deepEqual(failuresAfter('dark', line, typed.dark.color.surface.elevated), [
      "the hairline round the rail's current row is visible on it",
    ]);
    // Raised two steps off the light frame: every other rule raised is held
    // to still holds, and the row is no longer there.
    const { r, g, b } = parseHex(typed.light.color.surface.frame);
    assert.deepEqual(failuresAfter('light', fill, hex({ r: r + 2, g: g + 2, b: b + 2 })), [
      "the rail's current row lifts off the rail",
    ]);
  });
});
