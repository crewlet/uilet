/**
 * Money as integer micros: one unit of a currency is 1,000,000 micros.
 *
 * NEVER A FLOAT. A float holds 0.1 as 0.1000000000000000055 and loses whole
 * units past 2^53, so every step here is BigInt arithmetic on integer micros,
 * and the one hand-off to `Intl.NumberFormat` is a decimal STRING already
 * rounded to the currency's digits, which the formatter reads exactly.
 *
 * ISO 4217 DECIDES THE DIGITS, not the locale's data. CLDR draws some
 * currencies with fewer digits than ISO lists (the Iraqi dinar with none,
 * where ISO says three), so the table below is ISO's own List One, and the
 * formatter is told the digits rather than asked for them.
 *
 * FOR DISPLAY ONLY. A vendor's own amounts follow the vendor's table (some
 * differ from ISO), so nothing here may feed a spending cap or a comparison
 * the engine makes. `parseMoney` reads what a person typed into micros, and
 * the engine parses the decimal string again at its own edge.
 */

/** An amount in micros: a bigint, a safe integer, or a decimal integer string (`"-1250000"`). */
export type Micros = bigint | number | string;

const MICROS_DIGITS = 6;
const MICROS = 1_000_000n;

/**
 * ISO 4217 List One currencies whose minor unit is not two digits. Every
 * other code in `ISO_4217` takes two.
 */
const MINOR_UNITS_NOT_TWO: Readonly<Record<string, number>> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};

/**
 * Every ISO 4217 List One code with a minor unit, plus recently withdrawn
 * codes a vendor's history still reports (ANG, BGN, CUC, HRK, SLL, ZWL). Funds without a minor unit (XAU, XDR and the like) are not money a
 * vendor bills in, and are left out.
 */
const ISO_4217 = new Set(
  (
    'AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD ' +
    'CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP ' +
    'GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW ' +
    'KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD ' +
    'NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE ' +
    'SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD USN UYI UYU UYW UZS VED ' +
    'VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG ZWL'
  ).split(' '),
);

const CODE = /^[A-Z]{3}$/;

/** `currency` as ISO writes it, upper case: some vendors send `usd`. Throws for anything else. */
function codeOf(currency: string): string {
  const code = currency.trim().toUpperCase();
  if (!CODE.test(code)) throw new RangeError(`"${currency}" is not an ISO 4217 currency code`);
  return code;
}

/**
 * The digits after the decimal point ISO 4217 gives `currency` (2 for EUR,
 * 0 for JPY, 3 for KWD, 4 for CLF), or `undefined` for a code it does not
 * list, in either case. Throws a `RangeError` for anything that is not a
 * three-letter code.
 */
export function minorUnits(currency: string): number | undefined {
  const code = codeOf(currency);
  if (!ISO_4217.has(code)) return undefined;
  return MINOR_UNITS_NOT_TWO[code] ?? 2;
}

/**
 * Reads an amount in micros, exactly. A number must be a safe integer, since
 * past 2^53 the value it holds is already not the one that was sent; a string
 * must be a decimal integer. Anything else is a `RangeError`, never a guess.
 */
export function toMicros(value: Micros): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${value} is not a whole number of micros held exactly`);
    return BigInt(value);
  }
  const text = value.trim();
  if (!/^-?\d+$/.test(text)) throw new RangeError(`"${value}" is not a whole number of micros`);
  return BigInt(text);
}

/**
 * `micros` as a plain decimal string with exactly `digits` after the point,
 * rounded half away from zero: `decimalOf(1_235_000n, 2)` is `"1.24"`, and
 * `decimalOf(-1_235_000n, 2)` is `"-1.24"`.
 */
export function decimalOf(micros: bigint, digits: number): string {
  if (!Number.isInteger(digits) || digits < 0 || digits > MICROS_DIGITS) {
    throw new RangeError(`${digits} is not a number of digits between 0 and ${MICROS_DIGITS}`);
  }
  const negative = micros < 0n;
  let magnitude = negative ? -micros : micros;
  const drop = 10n ** BigInt(MICROS_DIGITS - digits);
  // Half away from zero, on the magnitude: the sign is put back after.
  magnitude = (magnitude + drop / 2n) / drop;
  const scale = 10n ** BigInt(digits);
  const whole = (magnitude / scale).toString();
  const fraction = digits === 0 ? '' : `.${(magnitude % scale).toString().padStart(digits, '0')}`;
  return `${negative && magnitude !== 0n ? '-' : ''}${whole}${fraction}`;
}

/** `micros` exactly, with no rounding: as many digits as it needs, and none past six. */
function exactDecimal(micros: bigint): string {
  return decimalOf(micros, MICROS_DIGITS).replace(/\.?0+$/, '');
}

export interface FormatMoneyOptions {
  /** Whether a sign is drawn: `exceptZero` for a change ("+€20.00", "−€5.00"). Intl's own values. */
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never' | undefined;
  /** How the currency is named: a symbol (the default), the ISO code, or its name. */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name' | undefined;
  /** `compact` for a figure on a small tile ("€1.2K"). Rounds, so never where the exact amount matters. */
  notation?: 'standard' | 'compact' | undefined;
}

/**
 * `micros` of `currency` in the reader's words: `formatMoney(1_250_000n,
 * 'EUR', 'en-US')` is "€1.25", and `formatMoney(1_250_000n, 'JPY', 'ja-JP')`
 * is "￥1". Rounded half away from zero to the currency's ISO digits; a code
 * ISO does not list is drawn with every digit it has, never rounded to a
 * guess. `locale` defaults to the reader's own.
 */
export function formatMoney(
  micros: Micros,
  currency: string,
  locale?: string | readonly string[],
  options: FormatMoneyOptions = {},
): string {
  const amount = toMicros(micros);
  const code = codeOf(currency);
  const digits = minorUnits(code);
  const compact = options.notation === 'compact';
  const format = new Intl.NumberFormat(locale as string | string[] | undefined, {
    style: 'currency',
    currency: code,
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    signDisplay: options.signDisplay ?? 'auto',
    ...(compact
      ? { notation: 'compact' }
      : digits === undefined
        ? { minimumFractionDigits: 0, maximumFractionDigits: MICROS_DIGITS }
        : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  });
  // A decimal string is read exactly (ECMA-402's string-to-decimal rule), so
  // the rounding above is the only one; compact notation rounds further on
  // purpose, never into digits the currency does not have.
  const text = digits === undefined ? exactDecimal(amount) : decimalOf(amount, digits);
  return format.format(text as unknown as number);
}

/**
 * What a person typed as an amount of `currency`, in micros, or the reason it
 * is not one. Digits with at most one decimal point, no more digits after it
 * than the currency has, and no sign, grouping or exponent: an amount typed
 * into a cap or a budget is never negative. A full stop is the decimal point;
 * a comma is read as one too, as many keyboards type it, except before
 * exactly three digits, where "1,500" groups thousands for some readers and
 * marks decimals for others, and is refused rather than guessed.
 */
export function parseMoney(text: string, currency: string): { micros: bigint } | { problem: MoneyProblem } {
  const digits = minorUnits(currency) ?? MICROS_DIGITS;
  const trimmed = text.trim();
  if (trimmed === '') return { problem: { kind: 'empty' } };
  const match = /^(\d+)(?:([.,])(\d*))?$/.exec(trimmed);
  if (!match) return { problem: { kind: 'not_an_amount' } };
  const fraction = match[3] ?? '';
  if (match[2] === ',' && fraction.length === 3) return { problem: { kind: 'ambiguous_comma' } };
  if (fraction.length > digits) return { problem: { kind: 'too_many_digits', digits } };
  const micros = BigInt(match[1]!) * MICROS + BigInt(fraction.padEnd(MICROS_DIGITS, '0') || '0');
  return { micros };
}

/** Why a typed amount was refused. */
export type MoneyProblem =
  | { kind: 'empty' }
  | { kind: 'not_an_amount' }
  /** A comma before exactly three digits, which reads as grouping to some and as decimals to others. */
  | { kind: 'ambiguous_comma' }
  /** More digits after the point than the currency has: `digits` is how many it takes. */
  | { kind: 'too_many_digits'; digits: number };

/**
 * `micros` as the decimal string a document stores ("50.00", "1500", "1.250"),
 * at the currency's ISO digits: what a caps editor writes back.
 */
export function moneyDecimal(micros: Micros, currency: string): string {
  return decimalOf(toMicros(micros), minorUnits(currency) ?? MICROS_DIGITS);
}

/** One amount in one currency. */
export interface MoneyAmount {
  micros: Micros;
  currency: string;
}

/**
 * One total per currency, never one across them: euros and yen do not add.
 * Exact (BigInt), in the order each currency first appears.
 */
export function sumByCurrency(amounts: Iterable<MoneyAmount>): { currency: string; micros: bigint }[] {
  const totals = new Map<string, bigint>();
  for (const { micros, currency } of amounts) {
    const code = codeOf(currency);
    totals.set(code, (totals.get(code) ?? 0n) + toMicros(micros));
  }
  return [...totals].map(([currency, micros]) => ({ currency, micros }));
}
