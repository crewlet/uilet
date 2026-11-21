import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FormField, MoneyField, moneyFieldProblem } from '@crewlethq/ui';

/**
 * An amount a person types, such as a spending cap. It hands back the text as
 * typed and never a number, wears its currency inside the field, and the form
 * says why an amount is refused in the currency's own terms.
 */
const meta: Meta<typeof MoneyField> = {
  title: 'UI/MoneyField',
  component: MoneyField,
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof MoneyField>;

function Cap({ currency, initial, label }: { currency: string; initial: string; label: string }) {
  const [value, setValue] = useState(initial);
  const problem = value === '' ? null : moneyFieldProblem(value, currency);
  return (
    <FormField label={label} helper="Most one change may add to the account's daily budgets." error={problem ?? undefined}>
      {({ id, describedBy }) => (
        <MoneyField id={id} aria-describedby={describedBy} value={value} onValueChange={setValue} currency={currency} error={problem !== null} />
      )}
    </FormField>
  );
}

export const Euros: Story = { render: () => <Cap currency="EUR" initial="50.00" label="Per change" /> };
export const Yen: Story = { render: () => <Cap currency="JPY" initial="" label="Daily" /> };
export const KuwaitiDinar: Story = { render: () => <Cap currency="KWD" initial="1.250" label="Per change" /> };
export const TooManyDigits: Story = { render: () => <Cap currency="EUR" initial="50.125" label="Per change" /> };
export const Disabled: Story = { args: { 'aria-label': 'Daily', value: '200.00', currency: 'EUR', disabled: true, onValueChange: () => {} } };
