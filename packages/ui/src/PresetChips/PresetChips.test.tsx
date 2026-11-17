/** PresetChips: a row of common values that fill a field in. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PresetChips } from './index.js';

afterEach(cleanup);

const OPTIONS = [
  { value: '', label: 'Default (3)' },
  { value: '5', label: '5' },
];

test('is a named radio group whose chip of the value is chosen', () => {
  render(<PresetChips label="Common values" options={OPTIONS} value="5" onPick={() => undefined} />);
  const radios = screen.getAllByRole('radio');
  expect(screen.getByRole('radiogroup', { name: 'Common values' })).toBeTruthy();
  expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
});

test('chooses none while what the field holds matches no chip', () => {
  render(<PresetChips label="Common values" options={OPTIONS} value="7" onPick={() => undefined} />);
  expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
});

test('hands a pick to the field', () => {
  const onPick = vi.fn();
  render(<PresetChips label="Common values" options={OPTIONS} value="5" onPick={onPick} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Default (3)' }));
  expect(onPick).toHaveBeenCalledWith('');
});
