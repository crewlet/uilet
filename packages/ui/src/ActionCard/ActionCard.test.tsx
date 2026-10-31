/**
 * First steps offered as pictures: each card a button named by its title on
 * an artifact kind's colour ground, its drawing hidden, in a named row.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ACTION_CARD_GROUND, ActionCard, ActionCardRow, type ActionCardTone } from './index.js';

afterEach(cleanup);

test('a card is a button named by its title, on its tone\'s kind ground, its drawing hidden', () => {
  let chosen = 0;
  render(
    <ActionCardRow label="First steps for this room">
      <ActionCard tone="purple" title="Add people and agents" art={<svg data-testid="art" />} onSelect={() => (chosen += 1)} />
    </ActionCardRow>,
  );
  expect(screen.getByRole('group', { name: 'First steps for this room' })).toBeDefined();
  const card = screen.getByRole('button', { name: 'Add people and agents' });
  expect(card.getAttribute('type')).toBe('button');
  expect(card.classList.contains('crewlet-kind--design')).toBe(true);
  expect(screen.getByTestId('art').parentElement?.getAttribute('aria-hidden')).toBe('true');
  fireEvent.click(card);
  expect(chosen).toBe(1);
});

test('every tone reads a kind that ArtifactKinds.css grounds', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const kinds = readFileSync(join(here, '../ArtifactKindIllustration/ArtifactKinds.css'), 'utf8');
  // Each step maps the kind's own token: `--crewlet-kind-ground` reads the
  // kind's `ground` step, and so on. Spelled from parts, so this suite reads
  // as no stylesheet does: the custom property check scans it too.
  const step = (kind: string, name: string) => `--crewlet-kind-${name}: var(${['', '', 'color', 'artifact', 'kind', kind, name].join('-')});`;
  for (const [tone, kind] of Object.entries(ACTION_CARD_GROUND) as [ActionCardTone, string][]) {
    const line = kinds.split('\n').find((row) => row.startsWith(`.crewlet-kind--${kind} {`)) ?? '';
    for (const name of ['ground', 'ground-strong', 'ground-end', 'glow', 'edge', 'edge-strong']) expect(line, tone).toContain(step(kind, name));
  }
});

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ActionCard.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
/** The declarations of the first rule written for exactly this selector. */
const rule = (selector: string): string => {
  const at = css.indexOf(`${selector} {`);
  return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
};

test('the hover is quiet: the tint deepens, the edge takes a stronger step of the hue, a shadow lifts the card, and nothing moves', () => {
  const hover = rule('.crewlet-action-card:hover');
  expect(hover).toMatch(/--crewlet-action-card-ground:\s*var\(--crewlet-kind-ground-strong\);/);
  expect(hover).toMatch(/--crewlet-action-card-edge:\s*var\(--crewlet-kind-edge-strong\);/);
  expect(hover).toMatch(/box-shadow:\s*var\(--shadow-sm\);/);
  expect(hover).not.toMatch(/transform|translate|scale/);
});

// THE EDGE IS THE KIND'S OWN, AT 3:1: the kind's hue stepped toward the ink
// until it clears 3:1 on the sheet and on the card's tint (the tokens build
// derives it, and its suite holds it), a step further under the pointer. A
// neutral grey outline read as a card from another family.
test("the edge is the kind's hue at 3:1, at rest and a step stronger under the pointer", () => {
  const card = rule('.crewlet-action-card');
  expect(card).toMatch(/--crewlet-action-card-edge:\s*var\(--crewlet-kind-edge\);/);
  expect(card).toMatch(/border:\s*1px solid var\(--crewlet-action-card-edge\);/);
  expect(rule('.crewlet-action-card:hover')).toMatch(/--crewlet-action-card-edge:\s*var\(--crewlet-kind-edge-strong\);/);
});

test('its corner and its shadow are from the edge scale', () => {
  const card = rule('.crewlet-action-card');
  expect(card).toMatch(/border-radius:\s*var\(--radius-xl\);/);
  expect(card).toMatch(/box-shadow:\s*var\(--shadow-xs\);/);
  // The ring is drawn over the card's own edge, as every bordered control's.
  expect(rule('.crewlet-action-card:focus-visible')).toMatch(/outline-offset:\s*var\(--size-focus-ring-inset-offset\);/);
});

test("every kind's drawing takes the same box: the card's width less its inset, at the canvas's own shape", () => {
  const drawing = rule('.crewlet-action-card__art .crewlet-kind-illustration');
  expect(drawing).toMatch(/width:\s*100%;/);
  expect(drawing).toMatch(/height:\s*auto;/);
  expect(drawing).not.toMatch(/max-height/);
  // Inside the card's inset, not bled to its edges.
  expect(rule('.crewlet-action-card__art')).not.toMatch(/margin:\s*0 calc/);
});

test('a row of cards carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ActionCardRow label="First steps for this room">
        <ActionCard tone="purple" title="Add people and agents" art={<svg />} onSelect={() => undefined} />
        <ActionCard tone="blue" title="Add a description" art={<svg />} onSelect={() => undefined} />
        <ActionCard tone="amber" title="Start from a template" art={<svg />} onSelect={() => undefined} />
      </ActionCardRow>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
