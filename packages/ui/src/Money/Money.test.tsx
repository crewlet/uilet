/**
 * Money is drawn from integer micros and never passes through a float: every
 * amount, however large, keeps every digit, each currency rounds to its own
 * ISO 4217 digits, and amounts in two currencies never add.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Money, decimalOf, formatMoney, minorUnits, moneyDecimal, parseMoney, sumByCurrency, toMicros } from './index.js';

afterEach(cleanup);

/** The digits of a formatted amount, the sign and the point, with the currency and the grouping taken out. */
const figure = (text: string) => text.replace(/[^\d.\-−+]/g, '').replace('−', '-');

/** A small, seeded generator, so a failing case is the same case on every run. */
function generator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The amount rounded half away from zero to `digits`, by hand on the decimal
 * digits of the micros: a second way of doing what `decimalOf` does with
 * division, so the two can check each other.
 */
function reference(micros: bigint, digits: number): string {
  const negative = micros < 0n;
  const text = (negative ? -micros : micros).toString().padStart(7, '0');
  const whole = text.slice(0, -6);
  const fraction = text.slice(-6);
  let kept = BigInt(whole + fraction.slice(0, digits));
  if (digits < 6 && fraction[digits]! >= '5') kept += 1n;
  const shown = kept.toString().padStart(digits + 1, '0');
  const body = digits === 0 ? shown : `${shown.slice(0, -digits)}.${shown.slice(-digits)}`;
  return kept === 0n || !negative ? body : `-${body}`;
}

describe('ISO 4217 digits', () => {
  test.each([
    ['EUR', 2],
    ['USD', 2],
    ['JPY', 0],
    ['KRW', 0],
    ['ISK', 0],
    ['KWD', 3],
    ['BHD', 3],
    ['IQD', 3],
    ['CLF', 4],
    ['HUF', 2],
    ['TWD', 2],
    ['COP', 2],
  ] as const)('%s takes %i', (currency, digits) => {
    expect(minorUnits(currency)).toBe(digits);
  });

  test('a code ISO does not list has no digits to guess, and a malformed one is refused', () => {
    expect(minorUnits('XYZ')).toBeUndefined();
    expect(() => minorUnits('eur')).toThrow(RangeError);
    expect(() => minorUnits('EURO')).toThrow(RangeError);
  });
});

describe('an amount in micros', () => {
  test('is read exactly, or refused, and never guessed', () => {
    expect(toMicros(1_250_000)).toBe(1_250_000n);
    expect(toMicros('-1250000')).toBe(-1_250_000n);
    expect(toMicros(12345678901234567890n)).toBe(12345678901234567890n);
    // A fraction of a micro, a number past 2^53 and a decimal string are not micros.
    expect(() => toMicros(1.5)).toThrow(RangeError);
    expect(() => toMicros(2 ** 53 + 2)).toThrow(RangeError);
    expect(() => toMicros('12.5')).toThrow(RangeError);
    expect(() => toMicros('1e6')).toThrow(RangeError);
  });

  test('rounds half away from zero to the digits asked for', () => {
    expect(decimalOf(1_005_000n, 2)).toBe('1.01');
    expect(decimalOf(1_004_999n, 2)).toBe('1.00');
    expect(decimalOf(-1_005_000n, 2)).toBe('-1.01');
    expect(decimalOf(500_000n, 0)).toBe('1');
    expect(decimalOf(-500_000n, 0)).toBe('-1');
    expect(decimalOf(-4_999n, 2)).toBe('0.00');
    expect(decimalOf(1_234_500n, 3)).toBe('1.235');
  });
});

describe('formatMoney', () => {
  test('draws each currency at its own ISO digits', () => {
    expect(formatMoney(1_250_000_000n, 'EUR', 'en-US')).toBe('€1,250.00');
    expect(formatMoney(3_400_000_000n, 'JPY', 'en-US')).toBe('¥3,400');
    expect(formatMoney(1_250_000n, 'KWD', 'en-US', { currencyDisplay: 'code' })).toBe('KWD 1.250');
    expect(formatMoney(1_234_567n, 'CLF', 'en-US', { currencyDisplay: 'code' })).toBe('CLF 1.2346');
    // The locale's own grouping and decimal sign.
    expect(formatMoney(1_250_000_000n, 'EUR', 'de-DE')).toBe('1.250,00 €');
  });

  test('keeps every digit of an amount no float could hold', () => {
    // 2^53 + 1 euros, and a sum of micros past 2^63: a float would round both.
    expect(formatMoney(9_007_199_254_740_993_000_000n, 'EUR', 'en-US')).toBe('€9,007,199,254,740,993.00');
    expect(formatMoney('12345678901234567890123', 'USD', 'en-US')).toBe('$12,345,678,901,234,567.89');
  });

  test('never passes an amount through a float, over currencies with 0, 2, 3 and 4 digits', () => {
    const random = generator(4217);
    for (const currency of ['JPY', 'EUR', 'USD', 'KWD', 'CLF']) {
      const digits = minorUnits(currency)!;
      for (let run = 0; run < 400; run += 1) {
        // Up to 24 decimal digits of micros, either sign: far past 2^53.
        const length = 1 + Math.floor(random() * 24);
        const text = Array.from({ length }, () => Math.floor(random() * 10)).join('');
        const micros = BigInt(text) * (random() < 0.3 ? -1n : 1n);
        const shown = formatMoney(micros, currency, 'en-US', { currencyDisplay: 'code' });
        expect(figure(shown), `${micros} ${currency}`).toBe(reference(micros, digits));
      }
    }
  });

  test('says the sign of a change when asked', () => {
    expect(formatMoney(20_000_000n, 'EUR', 'en-US', { signDisplay: 'exceptZero' })).toBe('+€20.00');
    expect(formatMoney(-5_000_000n, 'EUR', 'en-US', { signDisplay: 'exceptZero' })).toBe('-€5.00');
    expect(formatMoney(0n, 'EUR', 'en-US', { signDisplay: 'exceptZero' })).toBe('€0.00');
  });

  test('draws a code ISO does not list with every digit it has, rounded to nothing', () => {
    expect(formatMoney(1_234_567n, 'XYZ', 'en-US')).toContain('1.234567');
    expect(formatMoney(1_500_000n, 'XYZ', 'en-US')).toContain('1.5');
  });

  test('rounds on purpose only in compact notation', () => {
    expect(formatMoney(1_234_000_000n, 'EUR', 'en-US', { notation: 'compact' })).toBe('€1.2K');
  });
});

describe('parseMoney', () => {
  test('reads what a person typed into micros, exactly', () => {
    expect(parseMoney('50', 'EUR')).toEqual({ micros: 50_000_000n });
    expect(parseMoney(' 50.25 ', 'EUR')).toEqual({ micros: 50_250_000n });
    expect(parseMoney('50,5', 'EUR')).toEqual({ micros: 50_500_000n });
    expect(parseMoney('1.250', 'KWD')).toEqual({ micros: 1_250_000n });
    expect(parseMoney('3400', 'JPY')).toEqual({ micros: 3_400_000_000n });
    expect(parseMoney('90071992547409931', 'EUR')).toEqual({ micros: 90_071_992_547_409_931_000_000n });
  });

  test("refuses what is not an amount of the currency, with its reason", () => {
    expect(parseMoney('', 'EUR')).toEqual({ problem: { kind: 'empty' } });
    expect(parseMoney('50.123', 'EUR')).toEqual({ problem: { kind: 'too_many_digits', digits: 2 } });
    expect(parseMoney('50.5', 'JPY')).toEqual({ problem: { kind: 'too_many_digits', digits: 0 } });
    for (const typed of ['-5', '1e3', '1,000.00', '€5', '5 EUR', '.5', 'NaN', 'Infinity']) {
      expect(parseMoney(typed, 'EUR'), typed).toEqual({ problem: { kind: 'not_an_amount' } });
    }
  });

  test('writes micros back as the decimal a document stores', () => {
    expect(moneyDecimal(50_000_000n, 'EUR')).toBe('50.00');
    expect(moneyDecimal(1_250_000n, 'KWD')).toBe('1.250');
    expect(moneyDecimal(3_400_000_000n, 'JPY')).toBe('3400');
    const read = parseMoney('199.99', 'EUR');
    expect('micros' in read && moneyDecimal(read.micros, 'EUR')).toBe('199.99');
  });
});

describe('sumByCurrency', () => {
  test('adds within a currency and never across two', () => {
    expect(
      sumByCurrency([
        { micros: 1_000_000n, currency: 'EUR' },
        { micros: '2000000', currency: 'JPY' },
        { micros: 3_000_000, currency: 'EUR' },
      ]),
    ).toEqual([
      { currency: 'EUR', micros: 4_000_000n },
      { currency: 'JPY', micros: 2_000_000n },
    ]);
  });

  test('sums past 2^53 exactly', () => {
    const total = sumByCurrency([
      { micros: 9_007_199_254_740_993n, currency: 'USD' },
      { micros: 9_007_199_254_740_993n, currency: 'USD' },
    ]);
    expect(total).toEqual([{ currency: 'USD', micros: 18_014_398_509_481_986n }]);
  });
});

describe('Money', () => {
  test('draws one amount in its currency, marked as money', () => {
    const { container } = render(<Money micros={1_250_000_000n} currency="EUR" locale="en-US" />);
    const money = container.querySelector('.crewlet-money')!;
    expect(money.textContent).toBe('€1,250.00');
    expect(money.getAttribute('data-currency')).toBe('EUR');
  });

  test('passes the sign and the notation on', () => {
    const { container } = render(<Money micros="20000000" currency="EUR" locale="en-US" signDisplay="exceptZero" />);
    expect(container.textContent).toBe('+€20.00');
  });
});
