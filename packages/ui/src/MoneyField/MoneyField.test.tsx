/**
 * A money field hands back what was typed, as typed, and says the currency it
 * is in: nothing it does turns the amount into a number.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MoneyField, moneyFieldProblem } from './index.js';

afterEach(cleanup);

test('reads its currency as its description, and shows the currency\'s own digits as the placeholder', () => {
  render(
    <>
      <span id="help">Most one change may add.</span>
      <MoneyField aria-label="Per change" aria-describedby="help" value="" onValueChange={() => {}} currency="EUR" />
    </>,
  );
  const field = screen.getByRole('textbox', { name: 'Per change' });
  expect(field.getAttribute('placeholder')).toBe('0.00');
  expect(field.getAttribute('inputmode')).toBe('decimal');
  const described = (field.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
  expect(described).toEqual(['Most one change may add.', 'EUR']);
});

test('a whole-unit currency asks for whole numbers', () => {
  render(<MoneyField aria-label="Daily" value="" onValueChange={() => {}} currency="JPY" />);
  const field = screen.getByRole('textbox', { name: 'Daily' });
  expect(field.getAttribute('placeholder')).toBe('0');
  expect(field.getAttribute('inputmode')).toBe('numeric');
});

test('hands back the text exactly as typed, never a number', () => {
  const onValueChange = vi.fn();
  render(<MoneyField aria-label="Daily" value="" onValueChange={onValueChange} currency="EUR" />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Daily' }), { target: { value: '0.10' } });
  expect(onValueChange).toHaveBeenCalledWith('0.10');
});

test('is marked refused when the form says so', () => {
  render(<MoneyField aria-label="Daily" value="5.123" onValueChange={() => {}} currency="EUR" error />);
  expect(screen.getByRole('textbox', { name: 'Daily' }).getAttribute('aria-invalid')).toBe('true');
});

test('says why an amount is refused, in the currency\'s own terms', () => {
  expect(moneyFieldProblem('50.00', 'EUR')).toBeNull();
  expect(moneyFieldProblem('', 'EUR')).toBe('Type an amount.');
  expect(moneyFieldProblem('5.123', 'EUR')).toBe('EUR takes at most 2 decimal places.');
  expect(moneyFieldProblem('5.5', 'JPY')).toBe('JPY takes whole amounts only.');
  expect(moneyFieldProblem('-5', 'EUR')).toBe('Type an amount in digits, such as 50.00, with no sign or grouping.');
  expect(moneyFieldProblem('5.1234', 'KWD', { tooManyDigits: (c, d) => `${c}: ${d}` })).toBe('KWD: 3');
});
