/**
 * ColorChip: a colour as a small chip, hidden from a screen reader, through
 * the same `#rrggbb` gate as every brand part.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { Button } from '../Button/index.js';
import { ColorChip } from './index.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

const chip = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-color-chip')!;
const custom = ['--', 'crewlet-color-chip-value'].join('');

test('draws a colour through its custom property, lowercased, and is hidden from a screen reader', () => {
  const { container } = render(<ColorChip value="#007F7F" />);
  expect(chip(container).style.getPropertyValue(custom)).toBe('#007f7f');
  expect(chip(container).getAttribute('aria-hidden')).toBe('true');
  expect(chip(container).classList.contains('is-empty')).toBe(false);
});

test('a value that is not #rrggbb draws the hatch and never reaches a style', () => {
  for (const value of ['', null, undefined, 'red', '#0bb', 'url(x)']) {
    cleanup();
    const { container } = render(<ColorChip value={value} />);
    expect(chip(container).classList.contains('is-empty'), String(value)).toBe(true);
    expect(chip(container).getAttribute('style'), String(value)).toBeNull();
  }
});

test('12px by default and 16px small, round by default and square on request', () => {
  uninstall = installSheets('ColorChip/ColorChip.css');
  const { container, rerender } = render(<ColorChip value="#007f7f" />);
  expect(px(chip(container), 'width')).toBe(12);
  expect(px(chip(container), 'height')).toBe(12);
  expect(chip(container).classList.contains('crewlet-color-chip--round')).toBe(true);
  rerender(<ColorChip value="#007f7f" size="sm" shape="square" />);
  expect(px(chip(container), 'width')).toBe(16);
  expect(chip(container).classList.contains('crewlet-color-chip--square')).toBe(true);
});

test('on a button it is the mark, and the button is named by its words alone', async () => {
  const { container } = render(
    <main>
      <Button size="small" variant="outline" leadingIcon={<ColorChip value="#007f7f" />}>
        Use #007f7f · 4.5:1
      </Button>
    </main>,
  );
  expect(screen.getByRole('button', { name: 'Use #007f7f · 4.5:1' })).toBeTruthy();
  const result = await axe.run(container, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('its edge is the control border, a boundary a reader can see, unless its ground names another', () => {
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ColorChip.css'), 'utf8');
  const base = sheet.slice(sheet.indexOf('.crewlet-color-chip {'), sheet.indexOf('}', sheet.indexOf('.crewlet-color-chip {')));
  expect(base).toContain('box-shadow: inset 0 0 0 1px var(--crewlet-color-chip-ring, var(--color-border-control))');
});

test('at the text size it is sized by the words around it, and nearly square', () => {
  const { container } = render(
    <p>
      Accent <ColorChip value="#ffe100" size="text" shape="square" /> #ffe100
    </p>,
  );
  const drawn = chip(container);
  expect(drawn.classList.contains('crewlet-color-chip--text')).toBe(true);
  expect(drawn.getAttribute('aria-hidden')).toBe('true');
  expect(drawn.style.getPropertyValue(custom)).toBe('#ffe100');
});
