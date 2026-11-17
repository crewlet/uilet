/**
 * NumberField: a number typed or stepped, held to its bounds, with the
 * default as its placeholder and, where asked, as a chip.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { NumberField, typedNumber, type NumberFieldProps } from './index.js';

afterEach(cleanup);

function Field(props: Partial<NumberFieldProps> & { start?: string }) {
  const [value, setValue] = useState(props.start ?? '');
  return (
    <>
      <NumberField aria-label="Shortest password" defaultValue={12} min={8} max={64} {...props} value={value} onValueChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const typed = () => screen.getByTestId('value').textContent;

test('is a spin button showing its default as the placeholder, with its bounds', () => {
  render(<Field />);
  const field = screen.getByRole('spinbutton', { name: 'Shortest password' });
  expect(field.getAttribute('placeholder')).toBe('12');
  expect(field.getAttribute('aria-valuemin')).toBe('8');
  expect(field.getAttribute('aria-valuemax')).toBe('64');
  expect(field.getAttribute('aria-valuenow')).toBe('12');
});

test('steps from the default when empty, and from what is typed otherwise', () => {
  render(<Field />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
  expect(typed()).toBe('13');
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
  expect(typed()).toBe('19');
});

test('steps with the arrows, ten at a time with Page Up and Page Down', () => {
  render(<Field start="20" />);
  const field = screen.getByRole('spinbutton');
  fireEvent.keyDown(field, { key: 'ArrowUp' });
  expect(typed()).toBe('21');
  fireEvent.keyDown(field, { key: 'PageDown' });
  expect(typed()).toBe('11');
});

test('holds a step to its bounds, and holds the button at a bound', () => {
  render(<Field start="63" />);
  const field = screen.getByRole('spinbutton');
  fireEvent.keyDown(field, { key: 'PageUp' });
  expect(typed()).toBe('64');
  expect((screen.getByRole('button', { name: 'Increase' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Decrease' }) as HTMLButtonElement).disabled).toBe(false);
});

test('keeps its steppers out of the tab order', () => {
  render(<Field />);
  for (const name of ['Increase', 'Decrease']) {
    expect(screen.getByRole('button', { name }).getAttribute('tabindex')).toBe('-1');
  }
});

test('steps a decimal field without float noise', () => {
  render(<Field defaultValue={0.1} min={0} max={1} step={0.1} start="0.2" />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
  expect(typed()).toBe('0.3');
});

test('leaves what is typed alone: refusing it is the caller’s', () => {
  render(<Field />);
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1.' } });
  expect(typed()).toBe('1.');
  expect(typedNumber('1.')).toBeNull();
  expect(typedNumber(' 42 ')).toBe(42);
});

test('offers the default and its presets as chips, the matching one chosen', () => {
  render(<Field presets={[{ value: '16', label: '16' }, { value: '24', label: '24' }]} formatValue={(n) => `${n} characters`} />);
  const chips = screen.getByRole('radiogroup', { name: 'Common values' });
  const options = [...chips.querySelectorAll('[role="radio"]')];
  expect(options.map((o) => o.textContent)).toEqual(['Default (12 characters)', '16', '24']);
  expect(options[0]!.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(options[2]!);
  expect(typed()).toBe('24');
  expect(options[2]!.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(options[0]!);
  expect(typed()).toBe('');
});

test('draws no chips unless asked', () => {
  render(<Field />);
  expect(screen.queryByRole('radiogroup')).toBeNull();
});

test('takes the focus once drawn where asked', () => {
  render(<Field focusOnMount />);
  expect(document.activeElement).toBe(screen.getByRole('spinbutton'));
});
