/**
 * The choice of an entity's hue: six chips, each a swatch and the hue's name,
 * because a swatch alone is a choice some readers cannot make.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { NODE_HUES, NODE_HUE_NAMES } from '../utils/nodeHue.js';
import { HuePicker } from './index.js';

afterEach(cleanup);

test('is a named radio group of the six hues, each named in words', () => {
  render(<HuePicker label="Color" value="cyan" onValueChange={() => {}} />);
  screen.getByRole('radiogroup', { name: 'Color' });
  const radios = screen.getAllByRole('radio');
  expect(radios.map((radio) => radio.textContent)).toEqual(NODE_HUES.map((hue) => NODE_HUE_NAMES[hue]));
  expect(screen.getByRole('radio', { checked: true }).textContent).toBe('Cyan');
});

test('chooses as the arrows move', () => {
  const onValueChange = vi.fn();
  render(<HuePicker label="Color" value="cyan" onValueChange={onValueChange} />);
  const chosen = screen.getByRole('radio', { checked: true });
  chosen.focus();
  fireEvent.keyDown(chosen, { key: 'ArrowRight' });
  expect(onValueChange).toHaveBeenLastCalledWith('green');
});

test('draws each swatch in its own hue', () => {
  const { container } = render(<HuePicker label="Color" value="blue" onValueChange={() => {}} />);
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'HuePicker.css'), 'utf8');
  for (const hue of NODE_HUES) {
    expect(container.querySelector(`.crewlet-hue-picker__swatch--${hue}`), hue).not.toBeNull();
    expect(sheet, hue).toMatch(
      new RegExp(`\\.crewlet-hue-picker__swatch--${hue}\\s*\\{\\s*background:\\s*var\\(--color-node-${hue}\\);`),
    );
  }
});
