/**
 * A colour swatch prints its role and its value (so the chip is decoration),
 * copies the value and says whether it landed, and draws a value only once it
 * has passed `#rrggbb`.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, parseHex } from '@crewlethq/tokens/test/palette';
import { themeColour } from '../../../../apps/ui-tests/src/cascade.js';
import { ColorSwatch } from './index.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(cleanup);

test('prints the role and the value, and hides the chip from assistive technology', () => {
  const { container } = render(<ColorSwatch name="Primary" value="#5B3DF5" description="Links, buttons and accents" />);
  expect(screen.getByText('Primary')).toBeDefined();
  expect(screen.getByText('#5b3df5')).toBeDefined();
  expect(screen.getByText('Links, buttons and accents')).toBeDefined();
  const chip = container.querySelector<HTMLElement>('.crewlet-color-swatch__chip')!;
  expect(chip.getAttribute('aria-hidden')).toBe('true');
  expect(chip.style.getPropertyValue('--crewlet-color-swatch-value')).toBe('#5b3df5');
});

test('copies the value, and says so', async () => {
  render(<ColorSwatch name="Primary" value="#5b3df5" />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy the Primary colour' }));
  });
  expect(writeText).toHaveBeenCalledWith('#5b3df5');
  expect(screen.getByRole('status').textContent).toBe('#5b3df5 copied to the clipboard');
});

test('a role with no colour, or a value that is not one, draws the hatch and says so', () => {
  const { container, rerender } = render(<ColorSwatch name="Secondary" value="" />);
  expect(screen.getByText('Not set')).toBeDefined();
  expect(screen.queryByRole('button')).toBeNull();
  const chip = () => container.querySelector<HTMLElement>('.crewlet-color-swatch__chip')!;
  expect(chip().classList.contains('is-empty')).toBe(true);
  rerender(<ColorSwatch name="Secondary" value="red; background: url(x)" />);
  expect(chip().getAttribute('style')).toBeNull();
  expect(screen.getByText('Not set')).toBeDefined();
});

test('can print the value without a copy control', () => {
  render(<ColorSwatch name="Text" value="#121625" copyable={false} size="sm" />);
  expect(screen.getByText('#121625')).toBeDefined();
  expect(screen.queryByRole('button')).toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Colours</h1>
      <ColorSwatch name="Primary" value="#5b3df5" />
      <ColorSwatch name="Secondary" value="" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test("a swatch's edge stands off the card in both themes, so a colour like the card's still reads as a chip", () => {
  // At the hover step the ring stood 1.5:1 off the card: a dark colour on a
  // dark card read as a gap above its caption.
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'ColorSwatch.css'), 'utf8');
  const token = /\.crewlet-color-swatch__chip\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\((--[\w-]+)\)/.exec(sheet.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1];
  expect(token).toBeDefined();
  for (const theme of ['light', 'dark'] as const) {
    const edge = parseHex(themeColour(theme, token!));
    // Spelled without its dashes: the variable check reads a quoted name as a declaration.
    const card = parseHex(themeColour(theme, `--${'color-surface-subtle'}`));
    expect(contrast(edge, card), theme).toBeGreaterThanOrEqual(1.9);
  }
});
