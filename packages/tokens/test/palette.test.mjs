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
  DATA,
  DATA_ADJACENT_DE,
  DATA_ADJACENT_NORMAL_DE,
  describeFailure,
  DIMMED_TEXT,
  fromOklab,
  hex,
  oklabToLinear,
  OPAQUE_SURFACES,
  OVERLAY_STEPS,
  paletteStates,
  parseHex,
  RAIL_CURRENT_ROW,
  RAISED_CHIP,
  runPalette,
  RUNG_STEPS,
  tightest,
  toOklab,
  VEIL_ALPHA,
  withAlpha,
} from './palette.mjs';
import { color, themes as typed } from '../dist/index.js';

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
  return [...new Set(checksAfter(palette, name, value).map((check) => check.rule))];
}

/**
 * The failing checks themselves, for a case that asserts what was MEASURED as
 * well as which rule went red, each once: light is edited in both of its
 * blocks, and the attribute block's copy of every check is left out.
 */
function checksAfter(palette, name, value) {
  const [openings, states] =
    palette === 'dark'
      ? [[DARK_ROOT], ['dark']]
      : [[LIGHT_MEDIA_BLOCK, LIGHT_ATTRIBUTE_BLOCK], ['light (media query)', 'light (attribute)']];
  let themes = sources.themes;
  for (const opening of openings) {
    themes = editBlock(themes, opening, (body) => body.replace(new RegExp(`${name}: [^;]+;`), `${name}: ${value};`));
  }
  const failing = runPalette({ ...sources, themes }).failures.filter((check) => states.includes(check.state));
  const seen = new Set();
  return failing.filter((check) => {
    const key = `${check.rule}|${check.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  test('a dimmed word is measured in every state, and one a rounding from the word being read is caught', () => {
    const DIMMED_RULE = 'a dimmed word is a step from the word being read';
    assert.deepEqual(DIMMED_TEXT, ['--color-text-primary', '--color-text-tertiary', 2]);
    for (const state of STATES) {
      assert.equal(checks.filter((check) => check.state === state && check.rule === DIMMED_RULE).length, 1, state);
    }
    // The tertiary step lifted onto the secondary one: each clears its own
    // floor, and the step between the first and the third is gone.
    assert.deepEqual(failuresAfter('dark', '--color-text-tertiary', typed.dark.color.text.secondary), [DIMMED_RULE]);
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

  test('a raised chip is measured in every theme state, and one whose edge is its own fill is caught', () => {
    const CHIP_RULE = 'the strong hairline finds a raised chip on every ground';
    const [fill, edge] = RAISED_CHIP;
    assert.deepEqual([fill, edge], ['--color-surface-elevated', '--color-border-strong']);
    for (const state of THEME_STATES) {
      assert.equal(checks.filter((check) => check.state === state && check.rule === CHIP_RULE).length, 1, state);
    }
    // The edge drawn in the chip's own fill: on a raised ground the chip is
    // loose words, and nothing else the palette measures notices.
    assert.deepEqual(darkFailures(edge, dark.surface.elevated), [CHIP_RULE]);
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
   * What `filter: brightness(1.08)` does to a colour, the usual way to light a
   * button under the pointer: each sRGB channel scaled and clipped.
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

  test('a hover that brightens the fill is caught in both palettes', () => {
    // It takes the white label under the text floor (4.25:1 in dark, 4.19:1
    // in light), which the label rule sees, and the step rule sees that it
    // moved toward the label rather than away from it.
    assert.equal(brightened(typed.dark.color.brand.accent), '#7b62f8');
    for (const palette of ['dark', 'light']) {
      assert.deepEqual(
        failuresAfter(palette, '--color-brand-accent-hover', brightened(typed[palette].color.brand.accent)),
        [LABEL_RULE, HOVER_RULE],
        palette,
      );
    }
  });

  test('a visible step toward the label is caught while the label still clears', () => {
    // The accent dulled to 0.8 of its chroma at its own lightness: a step a
    // reader sees (dE 3.94 in dark), under which the white label still clears
    // the floor (4.72:1), and which moves toward the label all the same. Only
    // the step rule's direction stands between it and a hover that fades.
    const dulled = (value) => {
      const lab = toOklab(parseHex(value));
      return hex(fromOklab({ L: lab.L, a: lab.a * 0.8, b: lab.b * 0.8 }));
    };
    assert.equal(dulled(typed.dark.color.brand.accent), '#7164d1');
    for (const palette of ['dark', 'light']) {
      assert.deepEqual(failuresAfter(palette, '--color-brand-accent-hover', dulled(typed[palette].color.brand.accent)), [HOVER_RULE], palette);
    }
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

  test('the selected tint is named as what its check measures, on each rung', () => {
    // Every measured check names the thing it measures first and the ground it
    // measured it on after, so a failure reads as what to change. This one
    // named the rung alone, which is the one thing a fix must not move.
    for (const state of THEME_STATES) {
      assert.deepEqual(
        checks.filter((check) => check.state === state && check.rule === 'the selected tint outreads the hover overlay').map((check) => check.subject),
        OPAQUE_SURFACES.map((rung) => `--color-brand-accent-soft on ${rung}`),
        state,
      );
    }
  });

  test("the rail's current row is caught when its hairline or its lift is lost", () => {
    const [fill, line] = RAIL_CURRENT_ROW;
    assert.deepEqual([fill, line], ['--color-surface-elevated', '--color-border-default']);
    // The line drawn in the row's own colour is no line at all.
    assert.deepEqual(failuresAfter('dark', line, typed.dark.color.surface.elevated), [
      "the hairline round the rail's current row is visible on it",
    ]);
    // Raised two steps off the dark frame: every other rule raised is held
    // to still holds, and the row is no longer there. In light the hairline
    // sits dE 1.23 from the frame, so a row lowered onto the frame loses its
    // line as well, and only dark shows the lift on its own.
    const { r, g, b } = parseHex(typed.dark.color.surface.frame);
    assert.deepEqual(failuresAfter('dark', fill, hex({ r: r + 2, g: g + 2, b: b + 2 })), [
      "the rail's current row lifts off the rail",
    ]);
  });
});

describe('the state and chart hues', () => {
  const { checks } = runPalette(sources);
  const LABEL_RULE = 'a label clears 4.5:1 on its own fill';
  const STATUS_RULE = 'status hues stay separable';
  const DANGER_RULE = 'no data hue collides with danger';
  const MARK_RULE = 'fill step clears 3:1 as a mark';
  const ADJACENT_RULE = 'adjacent data hues stay separable';
  const DESTRUCTIVE_RULE = ACTION_STEPS[2][0];
  const summary = (check) => `${check.rule}: ${check.subject}: ${check.detail}`;

  test('the chart ramp is four series, in every theme state and in the typed export', () => {
    // A fifth series would have to sit between two of the four in a hue
    // budget the reserved red and the accent have spent, so it is the
    // residual; a state that still resolved a fifth would be a hue nothing
    // measures against its neighbours.
    assert.deepEqual(DATA, ['--color-data-1', '--color-data-2', '--color-data-3', '--color-data-4']);
    for (const [state, values] of Object.entries(paletteStates(sources))) {
      for (const name of DATA) assert.ok(parseHex(values.get(name) ?? ''), `${state}: ${name} is not an opaque colour`);
      assert.equal(values.get('--color-data-5'), undefined, `${state} still declares --color-data-5`);
    }
    for (const palette of ['dark', 'light']) {
      assert.deepEqual(Object.keys(typed[palette].color.data), ['1', '2', '3', '4', 'other'], palette);
    }
    for (const state of THEME_STATES) {
      const pairs = checks.filter((check) => check.state === state && check.rule === ADJACENT_RULE).map((check) => check.subject);
      assert.deepEqual(pairs, ['--color-data-1 vs --color-data-2', '--color-data-2 vs --color-data-3', '--color-data-3 vs --color-data-4'], state);
    }
  });

  test('a phase is a category, so no palette spends a hue on one', () => {
    // A phase, like a unit or a model, is drawn in the neutral colour with its
    // word, and inside a figure as the series its legend names. A category
    // family would spend hues the rule table holds apart for meanings, and a
    // family the table did not name would ship with nothing measuring it at
    // all, so the removed one stays removed in every state and in the typed
    // export, where an application reads a colour by name.
    for (const [state, values] of Object.entries(paletteStates(sources))) {
      assert.deepEqual([...values.keys()].filter((name) => name.startsWith('--color-phase-')), [], state);
    }
    assert.equal(Object.hasOwn(color, 'phase'), false, 'color');
    for (const palette of ['dark', 'light']) assert.equal(Object.hasOwn(typed[palette].color, 'phase'), false, palette);
  });

  test("the design's stopped red is caught by its label, by deuteranopia and by the chart hues", () => {
    // The approved #f0506e carries a destructive action's white label at
    // 3.46:1, and a deuteranopic reader finds it dE 5.9 from done. It also
    // sits under the floors the reserved red keeps from the orange (11.4
    // under normal vision, 6.8 under deuteranopia) and from the green
    // (deuteranopia 4.9).
    const failing = checksAfter('dark', '--color-feedback-danger', '#f0506e').map(summary);
    assert.deepEqual(failing, [
      `${LABEL_RULE}: --color-text-on-accent on --color-feedback-danger: 3.46:1 (worst on --color-feedback-danger on --color-surface-frame)`,
      `${STATUS_RULE}: --color-feedback-success vs --color-feedback-danger: dE n34.5/p18.6/d5.9 >= 10`,
      `${DANGER_RULE}: --color-data-2: dE n11.4/p9.9/d6.8 >= 14 normal, 8 dichromat`,
      `${DANGER_RULE}: --color-data-3: dE n32.5/p12.7/d4.9 >= 14 normal, 8 dichromat`,
    ]);
  });

  test("the design's light yellow is caught as a mark nobody can see on the frame", () => {
    // #edb302 on the light frame is 1.61:1, and that is the only rule it
    // breaks: a yellow dark enough to be seen on a light page is an ochre.
    assert.deepEqual(checksAfter('light', '--color-data-4', '#edb302').map(summary), [
      `${MARK_RULE}: --color-data-4: 1.61:1 (worst on --color-surface-frame)`,
    ]);
  });

  test('a neighbour that clears every dichromat floor is still caught under normal vision', () => {
    // A teal fourth series beside the aqua green third: dE 13.0 apart under
    // protanopia and 12.3 under deuteranopia, which the dichromat floor alone
    // passes, and 13.0 under normal vision, two shades of one hue to every
    // reader who sees colour. Nothing else it touches fails, so the
    // normal-vision floor is the only thing standing between it and a chart.
    const failing = checksAfter('dark', '--color-data-4', '#008c87');
    assert.deepEqual(failing.map(summary), [
      `${ADJACENT_RULE}: --color-data-3 vs --color-data-4: dE n13.0/p13.0/d12.3 >= ${DATA_ADJACENT_NORMAL_DE} normal, ${DATA_ADJACENT_DE} every vision`,
    ]);
    assert.ok(failing[0].value >= DATA_ADJACENT_DE, 'the mutation has to clear the dichromat floor, or it proves nothing about the normal one');
  });

  test('a destructive action whose hover is its rest state is caught, in both palettes', () => {
    // The danger fill carries a white label on a toast's destructive action,
    // and its hover is the whole of the feedback there: a hover that IS the
    // fill does not answer the pointer, and nothing else measures that.
    for (const palette of ['dark', 'light']) {
      const fill = typed[palette].color.feedback.danger;
      assert.deepEqual(failuresAfter(palette, '--color-feedback-danger-hover', fill), [DESTRUCTIVE_RULE], palette);
    }
    for (const state of STATES) {
      assert.equal(checks.filter((check) => check.state === state && check.rule === DESTRUCTIVE_RULE).length, 1, state);
    }
  });
});

describe('the colour maths', () => {
  test('a colour a screen shows round-trips through OKLab, and one past the gamut says so', () => {
    // fromOklab reads its channels from oklabToLinear and clips them, so a
    // colour inside sRGB comes back as the same hex with every linear channel
    // in [0, 1]. A colour past what sRGB can show has a channel outside, which
    // is the one thing a search that walks chroma needs to know: clipped one
    // channel at a time, it would come back a different hue without a word.
    // The published matrices are good to seven places, so white and a channel
    // at zero land within a millionth of the edge rather than on it.
    for (const value of ['#000000', '#ffffff', '#7c56ff', '#101013', '#c98500', '#0f766e']) {
      const lab = toOklab(parseHex(value));
      assert.equal(hex(fromOklab(lab)), value);
      assert.ok(Object.values(oklabToLinear(lab)).every((c) => c >= -1e-6 && c <= 1 + 1e-6), `${value} left the gamut`);
    }
    // Past the gamut on each side of each channel in turn, the grey that stays
    // inside it on the other two: the channel says so and the others do not,
    // so no one channel can be clipped where the others would give it away.
    for (const channel of ['r', 'g', 'b']) {
      for (const [value, outside] of [
        [300, (c) => c > 1],
        [-30, (c) => c < 0],
      ]) {
        const linear = oklabToLinear(toOklab({ r: 128, g: 128, b: 128, [channel]: value }));
        assert.ok(outside(linear[channel]), `${channel} at ${value} came back as ${linear[channel]}`);
        for (const other of ['r', 'g', 'b'].filter((name) => name !== channel)) {
          assert.ok(linear[other] > 0 && linear[other] < 1, `${other} left the gamut with ${channel} at ${value}`);
        }
      }
    }
  });
});
