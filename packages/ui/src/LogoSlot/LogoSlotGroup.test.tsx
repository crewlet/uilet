/**
 * LogoSlotGroup: slots side by side aligned row by row, with the caption of
 * what may be brought written once and describing every picker.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { LogoSlot, LogoSlotGroup } from './index.js';

afterEach(cleanup);

const HINT = 'SVG up to 512 KB; PNG or WebP up to 2 MB and 4096 px.';

function Logos() {
  return (
    <LogoSlotGroup label="Logos" hint={HINT}>
      <LogoSlot editable label="Primary logo" description="Doc headers, light slides and pages" ground="light" alt="Acme logo" onFile={() => {}} />
      <LogoSlot
        editable
        label="For dark grounds"
        description="Dark slides and dark mode. Recommended, and drawn on the brand's dark ground."
        ground="dark"
        alt="Acme logo on dark"
        onFile={() => {}}
        error="The file is 3 MB. PNG and WebP files can be up to 2 MB."
      />
      <LogoSlot editable label="Mark" description="Square: chips and slide corners" ground="light" shape="square" alt="Acme mark" onFile={() => {}} />
    </LogoSlotGroup>
  );
}

test('the caption is written once under the row, and every picker is described by it', () => {
  const { container } = render(<Logos />);
  expect(screen.getAllByText(HINT)).toHaveLength(1);
  expect(container.querySelectorAll('.crewlet-logo-slot__hint')).toHaveLength(0);
  const hint = container.querySelector('.crewlet-logo-slot-group__hint')!;
  const pickers = screen.getAllByRole('button', { name: /Choose a file/ });
  expect(pickers).toHaveLength(3);
  for (const picker of pickers) expect((picker.getAttribute('aria-describedby') ?? '').split(' ')).toContain(hint.id);
});

test('is a named group of the slots, each still a group of its own, the caption after them', () => {
  const { container } = render(<Logos />);
  const group = screen.getByRole('group', { name: 'Logos' });
  expect(group.querySelectorAll('[role="group"]')).toHaveLength(3);
  expect(group.lastElementChild!.className).toBe('crewlet-logo-slot-group__hint');
  // What is said under a stage is one part of the slot, so it can take one row.
  expect(container.querySelectorAll('.crewlet-logo-slot__notes')).toHaveLength(1);
});

test('each slot is a subgrid of four rows: name and description, stage, notes, actions', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'LogoSlot.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };
  const slot = rule('.crewlet-logo-slot-group__slots > .crewlet-logo-slot');
  expect(slot).toMatch(/grid-row: span 4;/);
  expect(slot).toMatch(/grid-template-rows: subgrid;/);
  // Margins, not the gap, so a row no slot uses takes no room.
  expect(slot).toMatch(/row-gap: 0;/);
  expect(rule('.crewlet-logo-slot-group__slots > .crewlet-logo-slot > .crewlet-logo-slot__head')).toMatch(/grid-row: 1;/);
  expect(rule('.crewlet-logo-slot-group__slots > .crewlet-logo-slot > :is(.crewlet-logo-slot__stage, .crewlet-file-drop)')).toMatch(/grid-row: 2;/);
  expect(rule('.crewlet-logo-slot-group__slots > .crewlet-logo-slot > .crewlet-logo-slot__notes')).toMatch(/grid-row: 3;/);
  expect(rule('.crewlet-logo-slot-group__slots > .crewlet-logo-slot > .crewlet-logo-slot__foot')).toMatch(/grid-row: 4;/);
});

test('a slot on its own keeps its caption', () => {
  render(<LogoSlot editable label="Primary" ground="light" alt="Acme logo" onFile={() => {}} />);
  expect(screen.getByText('SVG, PNG or WebP, up to 2 MB.')).toBeTruthy();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <Logos />
    </main>,
  );
  const result = await axe.run(container, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
