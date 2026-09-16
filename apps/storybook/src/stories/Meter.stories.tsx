import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meter } from '@crewlethq/ui';

const meta: Meta<typeof Meter> = {
  title: 'UI/Meter',
  component: Meter,
  args: {
    label: 'Token budget',
    value: 12_400,
    max: 20_000,
    valueText: '12.4K of 20K tokens',
    size: 'default',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: [undefined, 'brand', 'success', 'warning', 'danger', 'neutral'] },
    size: { control: 'inline-radio', options: ['default', 'compact'] },
    hideLabel: { control: 'boolean' },
  },
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof Meter>;

/**
 * A 4px track, which is the engine's. A meter sits under a line of 12px text
 * inside a card, and a 6px bar read as a divider rather than as a reading of
 * something; four is the height at which the fill is still unmistakably a
 * proportion and the bar unmistakably chrome. The compact step keeps the same
 * track and drops the legend a type step.
 */
export const Basic: Story = {};

/**
 * The tone is DERIVED from the fill unless a caller overrides it, so a bar
 * that is nearly full says so without every call site remembering to: at least
 * 100 percent is a fault, at least 75 percent wants a person, below that it is
 * just a number.
 */
export const Derived: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Meter label="Under way" value={40} max={100} valueText="40 of 100" />
      <Meter label="Nearly full" value={82} max={100} valueText="82 of 100" />
      <Meter label="Over" value={140} max={100} valueText="140 of 100" />
      <Meter label="Quiet" value={82} max={100} valueText="82 of 100" tone="neutral" />
    </div>
  ),
};

/** Inside a table cell, where the column header is already the name. */
export const Compact: Story = {
  args: { size: 'compact', hideLabel: true },
};

/**
 * The track is ALWAYS drawn. A bar with no track is a bar whose maximum a
 * reader has to guess, and at 8 percent it is indistinguishable from a bar
 * that is simply short.
 */
export const NearlyEmpty: Story = {
  args: { value: 1_600, max: 20_000, valueText: '1.6K of 20K tokens' },
};
