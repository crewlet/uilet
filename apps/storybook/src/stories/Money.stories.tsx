import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { Money, formatMoney, sumByCurrency } from '@crewlethq/ui';
import { themeScope } from '../themeScope';

/**
 * Money drawn from integer micros, never through a float. Each currency takes
 * its own ISO 4217 digits (none for yen, three for the Kuwaiti dinar), the
 * digits line up in a column, an amount never breaks across lines, and a
 * total over several currencies is one figure per currency.
 */
const meta: Meta<typeof Money> = {
  title: 'UI/Money',
  component: Money,
  args: { micros: 1_250_000_000n, currency: 'EUR' },
};

export default meta;
type Story = StoryObj<typeof Money>;

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  display: 'grid',
  gap: 'var(--spacing-3)',
  fontSize: 'var(--font-size-sm)',
};

const caption: CSSProperties = { color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', margin: 0 };

export const Default: Story = {};

const AMOUNTS = [
  ['EUR', 1_250_000_000n],
  ['USD', 199_990_000n],
  ['JPY', 3_400_000_000n],
  ['KWD', 1_250_000n],
  ['CLF', 12_345_600n],
  ['HUF', 125_000_000_000n],
  ['GBP', 9_007_199_254_740_993_000_000n],
] as const;

/** One amount per currency, each at its own digits, in a column whose figures line up. */
export const Currencies: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
          <p style={caption}>{theme}</p>
          {AMOUNTS.map(([currency, micros]) => (
            <div key={currency} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-4)' }}>
              <span>{currency}</span>
              <Money micros={micros} currency={currency} locale="en-US" />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/** A change carries its sign; a small tile can round on purpose; the locale chooses the marks. */
export const SignsAndNotation: Story = {
  render: () => (
    <div style={panel}>
      <p style={caption}>a change</p>
      <Money micros={20_000_000n} currency="EUR" signDisplay="exceptZero" locale="en-US" />
      <Money micros={-5_000_000n} currency="EUR" signDisplay="exceptZero" locale="en-US" />
      <p style={caption}>compact, for a small tile</p>
      <Money micros={1_234_000_000n} currency="EUR" notation="compact" locale="en-US" />
      <p style={caption}>de-DE, ja-JP, ar-KW</p>
      <Money micros={1_250_000_000n} currency="EUR" locale="de-DE" />
      <Money micros={3_400_000_000n} currency="JPY" locale="ja-JP" />
      <Money micros={1_250_000n} currency="KWD" locale="ar-KW" />
    </div>
  ),
};

/** Spend across three accounts: one total per currency, never one sum of euros and yen. */
export const TotalsPerCurrency: Story = {
  render: () => {
    const totals = sumByCurrency([
      { micros: 120_000_000n, currency: 'EUR' },
      { micros: 34_000_000_000n, currency: 'JPY' },
      { micros: 80_500_000n, currency: 'EUR' },
      { micros: 1_250_000n, currency: 'KWD' },
    ]);
    return (
      <div style={panel}>
        <p style={caption}>Ad spend, last 7 days</p>
        <span>{totals.map(({ micros, currency }) => formatMoney(micros, currency, 'en-US')).join(' · ')}</span>
      </div>
    );
  },
};
