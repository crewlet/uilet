import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import { formatMoney, type FormatMoneyOptions, type Micros } from './amounts.js';

export interface MoneyProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, FormatMoneyOptions {
  /** The amount in micros of `currency` (one unit is 1,000,000): a bigint, a safe integer or a decimal integer string. */
  micros: Micros;
  /** The ISO 4217 code the amount is in: `EUR`, `JPY`, `KWD`. */
  currency: string;
  /** The locale it is read in. Defaults to the reader's own. */
  locale?: string | readonly string[] | undefined;
}

/**
 * An amount of money, drawn from integer micros and never through a float
 * (`formatMoney`): "€1,250.00", "￥3,400", "KWD 1.250".
 *
 * ONE CURRENCY PER FIGURE. It draws one amount in the currency it was given
 * and adds nothing to it: a total over several currencies is one figure per
 * currency (`sumByCurrency`), never a sum that adds euros to yen.
 *
 * TABULAR AND WHOLE. Its digits take one width each, so a column of amounts
 * lines up, and it never breaks across lines, where "€1,250." over ".00"
 * reads as two figures.
 */
export function Money({ micros, currency, locale, signDisplay, currencyDisplay, notation, className, ...rest }: MoneyProps) {
  return (
    <span
      {...rest}
      className={cx('crewlet-money', className)}
      data-currency={currency}
    >
      {formatMoney(micros, currency, locale, { signDisplay, currencyDisplay, notation })}
    </span>
  );
}
