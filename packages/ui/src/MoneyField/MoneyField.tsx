import { forwardRef, useId } from 'react';
import { Input, type InputWidth } from '../Input/index.js';
import { minorUnits, parseMoney } from '../Money/amounts.js';
import { cx } from '../utils/cx.js';

/** Every sentence the field says about an amount it cannot take. */
export interface MoneyFieldLabels {
  /** Why an empty field is not an amount, where one is required. */
  empty: string;
  /** Why what was typed is not an amount at all. */
  notAnAmount: string;
  /** Why an amount has more digits after the point than its currency: "EUR takes at most 2 decimal places." */
  tooManyDigits: (currency: string, digits: number) => string;
}

export const MONEY_FIELD_LABELS: MoneyFieldLabels = {
  empty: 'Type an amount.',
  notAnAmount: 'Type an amount in digits, such as 50.00, with no sign or grouping.',
  tooManyDigits: (currency, digits) =>
    digits === 0 ? `${currency} takes whole amounts only.` : `${currency} takes at most ${digits} decimal places.`,
};

/**
 * Why `value` is not an amount of `currency`, in a sentence, or `null` where
 * it is one. An empty value says `labels.empty`: whether an amount is
 * required is the form's to decide, so it may ignore that one.
 */
export function moneyFieldProblem(value: string, currency: string, labels: Partial<MoneyFieldLabels> = {}): string | null {
  const words = { ...MONEY_FIELD_LABELS, ...labels };
  const read = parseMoney(value, currency);
  if ('micros' in read) return null;
  switch (read.problem.kind) {
    case 'empty':
      return words.empty;
    case 'not_an_amount':
      return words.notAnAmount;
    case 'too_many_digits':
      return words.tooManyDigits(currency, read.problem.digits);
  }
}

export interface MoneyFieldProps {
  id?: string | undefined;
  /** What is typed, as typed: a plain decimal ("50.00"). Never a number, so nothing passes through a float. */
  value: string;
  onValueChange: (value: string) => void;
  /** The ISO 4217 code the amount is in, drawn inside the field after the amount and read as its description. */
  currency: string;
  placeholder?: string | undefined;
  /** Draws the field as refused. The sentence is the form's (`moneyFieldProblem`). */
  error?: boolean | undefined;
  disabled?: boolean | undefined;
  width?: InputWidth | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  className?: string | undefined;
}

/**
 * An amount of money a person types: a spending cap, a budget.
 *
 * A STRING IN, A STRING OUT. The field never turns what is typed into a
 * number, which would pass it through a float; `parseMoney` reads it into
 * micros and `moneyDecimal` writes micros back as the decimal a document
 * stores.
 *
 * THE CURRENCY IS INSIDE THE FIELD, after the amount, and is read as the
 * field's description, so "50" is never read without saying fifty of what.
 * The placeholder shows the currency's own digits ("0.00", "0", "0.000").
 */
export const MoneyField = forwardRef<HTMLInputElement, MoneyFieldProps>(function MoneyField(
  { id, value, onValueChange, currency, placeholder, error, disabled, width, className, ...aria },
  ref,
) {
  const currencyId = `${useId()}-currency`;
  const digits = minorUnits(currency) ?? 2;
  const describedBy = [aria['aria-describedby'], currencyId].filter(Boolean).join(' ');
  return (
    <Input
      ref={ref}
      id={id}
      value={value}
      inputMode={digits === 0 ? 'numeric' : 'decimal'}
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder ?? (digits === 0 ? '0' : `0.${'0'.repeat(digits)}`)}
      error={error}
      disabled={disabled}
      width={width}
      aria-label={aria['aria-label']}
      aria-describedby={describedBy}
      containerClassName={cx('crewlet-money-field', className)}
      trailing={
        <span id={currencyId} className="crewlet-money-field__currency">
          {currency}
        </span>
      }
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
});
