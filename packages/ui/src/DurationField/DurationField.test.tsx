/**
 * DurationField: an amount and a unit, never a count of seconds or a letter
 * code, with common durations as chips.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { DurationField, durationSeconds, durationValue, durationWords, type DurationValue } from './index.js';

afterEach(cleanup);

function Field({ start = null, presets }: { start?: number | null; presets?: number[] }) {
  const [value, setValue] = useState<DurationValue>(() => durationValue(start, 43_200));
  return (
    <>
      <DurationField
        aria-label="Signed out when unused for"
        value={value}
        onValueChange={setValue}
        defaultValue={43_200}
        min={300}
        max={2_592_000}
        presets={presets}
      />
      <output data-testid="seconds">{String(durationSeconds(value))}</output>
    </>
  );
}

const seconds = () => screen.getByTestId('seconds').textContent;

test('reads a number of seconds in its largest whole unit', () => {
  expect(durationValue(86_400)).toEqual({ amount: '1', unit: 'days' });
  expect(durationValue(5_400)).toEqual({ amount: '90', unit: 'minutes' });
  expect(durationValue(45)).toEqual({ amount: '45', unit: 'seconds' });
  expect(durationValue(null, 43_200)).toEqual({ amount: '', unit: 'hours' });
  expect(durationWords(43_200)).toBe('12 hours');
  expect(durationWords(60)).toBe('1 minute');
});

test('says what it holds in seconds: null for the default, NaN for a word', () => {
  expect(durationSeconds({ amount: '', unit: 'hours' })).toBeNull();
  expect(durationSeconds({ amount: '2', unit: 'hours' })).toBe(7_200);
  expect(Number.isNaN(durationSeconds({ amount: 'soon', unit: 'hours' }))).toBe(true);
});

test("shows the default's amount as the placeholder, in the default's unit", () => {
  render(<Field />);
  expect(screen.getByRole('spinbutton').getAttribute('placeholder')).toBe('12');
  expect(screen.getByRole('combobox', { name: 'Unit' }).textContent).toContain('hours');
});

test('steps the amount in the unit beside it, held to the bounds in that unit', () => {
  render(<Field start={2_592_000} />);
  expect(screen.getByRole('spinbutton').getAttribute('aria-valuemax')).toBe('30');
  fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
  expect(seconds()).toBe(String(29 * 86_400));
});

test('a preset fills the amount and its own unit, and the matching chip is chosen', () => {
  render(<Field presets={[3_600, 86_400, 604_800]} />);
  const chips = screen.getByRole('radiogroup', { name: 'Common durations' });
  const options = within(chips).getAllByRole('radio');
  expect(options.map((o) => o.textContent)).toEqual(['Default (12 hours)', '1 hour', '1 day', '7 days']);
  fireEvent.click(options[3]!);
  expect(seconds()).toBe('604800');
  expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('7');
  expect(options[3]!.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(options[0]!);
  expect(seconds()).toBe('null');
});
