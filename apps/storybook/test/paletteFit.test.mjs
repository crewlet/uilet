/**
 * The fit table the Palette story renders (src/paletteFit.ts), over the built
 * stylesheets of this checkout.
 *
 * The story is the one place a reader sees, per token, what fails when the
 * shipped value goes back to the approved design's. Nothing else reads that
 * column, so nothing else would notice it saying the wrong thing: a restore
 * that left a fill's derived tints behind, an overlay put back as an opaque
 * fill, or failures from the other palette's states reported against this
 * one. These cases hold each of those.
 *
 * Node runs the TypeScript module directly (type stripping), so this needs no
 * build of its own beyond @crewlethq/tokens'.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { MOVED_DE, PALETTES, channels, fitPalettes, restore } from '../src/paletteFit.ts';
import { flatten, hex } from '@crewlethq/tokens/test/palette';
import intent from '../../../packages/tokens/tokens/intent.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const css = dirname(require.resolve('@crewlethq/tokens/css'));
const sources = {
  tokens: readFileSync(join(css, 'tokens.css'), 'utf8'),
  themes: readFileSync(join(css, 'themes.css'), 'utf8'),
};
const fitted = fitPalettes(sources);
const palette = (name) => fitted.find((entry) => entry.name === name);
const row = (name, token) => {
  const found = palette(name).rows.find((entry) => entry.token === token);
  assert.ok(found, `${name} has no row for ${token}`);
  return found;
};
const rules = (entry) => entry.binding.map((check) => check.rule);

/** The declarations of the block opening with `opening`, as a map. */
function block(themes, opening) {
  const start = themes.indexOf(opening);
  const body = themes.slice(start + opening.length, themes.indexOf('}', start));
  return new Map([...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

test('both palettes are tabled, from the state that ships them', () => {
  assert.deepEqual(
    fitted.map(({ name, state }) => [name, state]),
    [
      ['dark', 'dark'],
      ['light', 'light (attribute)'],
    ],
  );
  for (const { name, rows } of fitted) assert.ok(rows.length >= 30, `${name}: ${rows.length} rows, the design declares over 30 colours`);
});

test('a value that ships as designed binds nothing', () => {
  const frame = row('dark', '--color-surface-frame');
  assert.equal(frame.shipped, frame.design);
  assert.ok(frame.distance < MOVED_DE);
  assert.deepEqual(frame.binding, []);
  for (const { name, rows } of fitted) {
    for (const entry of rows) {
      if (entry.distance < MOVED_DE) assert.deepEqual(entry.binding, [], `${name} ${entry.token} did not move and reports a binding`);
    }
  }
});

test('a moved value names the rule that fails at the design, measured in its own palette', () => {
  const sheet = row('dark', '--color-surface-background');
  assert.equal(sheet.design, '#0c0e15');
  assert.equal(sheet.shipped, '#0c0e16');
  assert.ok(Math.abs(sheet.distance - 0.22) < 0.01, `dE ${sheet.distance}`);
  const lift = sheet.binding.find((check) => check.rule === 'the sheet lifts off the frame');
  assert.ok(lift, `binding: ${rules(sheet).join('; ')}`);
  assert.equal(lift.state, 'dark');
  assert.match(lift.detail, /dE 2\.96/);

  // The light yellow is the other palette's move; it must not bleed into dark.
  const yellow = row('light', '--color-data-4');
  assert.ok(rules(yellow).includes('fill step clears 3:1 as a mark'), `binding: ${rules(yellow).join('; ')}`);
  for (const check of yellow.binding) assert.ok(PALETTES.light.states.includes(check.state) || check.state === 'the token files', check.state);
  assert.deepEqual(row('dark', '--color-data-4').binding, []);
});

test('a failure the built palette already has is not reported as what a restore breaks', () => {
  // The light yellow put back in the BUILT file, so the shipped light palette
  // fails as a mark; the dark sheet's row must still name only what putting
  // the dark sheet back breaks.
  const themes = restore(sources.themes, PALETTES.light.openings, '--color-data-4', channels('#c27600'), '#edb302');
  const broken = fitPalettes({ tokens: sources.tokens, themes });
  const sheet = broken.find(({ name }) => name === 'dark').rows.find(({ token }) => token === '--color-surface-background');
  assert.deepEqual(
    sheet.binding.map((check) => check.rule),
    rules(row('dark', '--color-surface-background')),
  );
  const frame = broken.find(({ name }) => name === 'light').rows.find(({ token }) => token === '--color-surface-frame');
  assert.deepEqual(frame.binding, []);
});

test('a fill goes back with the steps the build derives from it', () => {
  const opening = PALETTES.dark.openings[0];
  const before = block(sources.themes, opening);
  const shipped = channels(before.get('--color-feedback-danger'));
  const after = block(restore(sources.themes, PALETTES.dark.openings, '--color-feedback-danger', shipped, '#f0506e'), opening);
  assert.equal(after.get('--color-feedback-danger'), '#f0506e');
  assert.equal(after.get('--color-feedback-danger-soft'), 'rgba(240, 80, 110, 0.12)');
  assert.equal(after.get('--color-feedback-danger-line'), 'rgba(240, 80, 110, 0.3)');
  // A step with a colour of its own is not a derivation, and stays.
  assert.equal(after.get('--color-feedback-danger-ink'), before.get('--color-feedback-danger-ink'));
  assert.equal(after.get('--color-feedback-danger-hover'), before.get('--color-feedback-danger-hover'));

  const accent = block(restore(sources.themes, PALETTES.dark.openings, '--color-brand-accent', channels(before.get('--color-brand-accent')), '#5469d4'), opening);
  assert.equal(accent.get('--color-brand-accent-rgb'), '84, 105, 212');
  assert.equal(accent.get('--color-brand-accent-soft-strong'), 'rgba(84, 105, 212, 0.32)');
});

test('the light palette goes back in both of its blocks, and dark is left alone', () => {
  const shipped = channels(block(sources.themes, PALETTES.light.openings[1]).get('--color-data-4'));
  const themes = restore(sources.themes, PALETTES.light.openings, '--color-data-4', shipped, '#edb302');
  for (const opening of PALETTES.light.openings) assert.equal(block(themes, opening).get('--color-data-4'), '#edb302', opening);
  assert.equal(block(themes, PALETTES.dark.openings[0]).get('--color-data-4'), block(sources.themes, PALETTES.dark.openings[0]).get('--color-data-4'));
});

test('an overlay the design drew opaque goes back as an overlay, at the alpha nearest the design', () => {
  // The approved hover is an overlay itself, so the case stands in its own
  // record: the hover drawn as the opaque colour the shipped overlay lands on
  // the card as, darkened a step so there is a move to put back.
  const record = structuredClone(intent);
  for (const name of ['dark', 'light']) {
    const card = block(sources.themes, PALETTES[name].openings.at(-1)).get('--color-surface-subtle');
    const landed = flatten(row(name, '--color-surface-hover').shipped, channels(card));
    record[name]['--hover'].value = hex({ r: landed.r - 4, g: landed.g - 4, b: landed.b - 4 });
  }
  const opaque = fitPalettes(sources, record);
  for (const name of ['dark', 'light']) {
    const hover = opaque.find((entry) => entry.name === name).rows.find((entry) => entry.token === '--color-surface-hover');
    assert.equal(channels(hover.design).a, 1, `${name}: the design's hover is opaque`);
    const restored = channels(hover.restored);
    const shipped = channels(hover.shipped);
    assert.ok(restored.a > 0 && restored.a < 1, `${name}: restored as ${hover.restored}`);
    assert.deepEqual([restored.r, restored.g, restored.b], [shipped.r, shipped.g, shipped.b], `${name}: the overlay keeps its own ink`);
  }
});
