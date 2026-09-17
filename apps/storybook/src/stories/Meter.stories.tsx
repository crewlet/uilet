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
    polarity: { control: 'inline-radio', options: ['spent', 'progress'] },
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

/**
 * The tone ramp has a POLARITY, because the same arithmetic reaches the
 * opposite conclusion depending on what is being measured. `spent` is the
 * default and reads a full bar as a fault, which is right for a budget.
 * `progress` reads it as an achievement, which is right for a goal: the top
 * row below is the bar a goals screen could not use, because a finished goal
 * came out painted as a crisis.
 *
 * The progress ramp has two steps rather than three. A budget carries two
 * escalating facts — near the limit somebody should look, past it something is
 * already wrong — and a goal carries one: it is done or it is not. "Nearly
 * done" is not a warning, and "barely started" is only a fault against a
 * deadline this component is never told.
 *
 * The polarity moves the tone ramp and nothing else. A goal eight tenths
 * achieved is a scalar measurement within a known range — a meter. An
 * operation the user is waiting on is a `progressbar`, which is a different
 * role and not this component.
 */
export const Polarity: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Meter label="Onboarding, spent ramp" value={100} max={100} valueText="10 of 10 steps" />
      <Meter label="Onboarding, progress ramp" value={100} max={100} valueText="10 of 10 steps" polarity="progress" />
      <Meter label="Under way, spent ramp" value={82} max={100} valueText="8.2 of 10" />
      <Meter label="Under way, progress ramp" value={82} max={100} valueText="8.2 of 10" polarity="progress" />
    </div>
  ),
};

/**
 * A NON-POSITIVE MAXIMUM IS NOT A METER, because ARIA gives the meter role no
 * way to say "there is no ceiling". `max={0}` states a range of zero width, in
 * which the fraction offered to a reader is 0/0 and any value but 0 breaks the
 * role's own rule that `aria-valuenow` must not fall outside the computed
 * minimum and maximum. Leaving the attribute off is worse, not better: missing
 * is exactly when the role's implicit maximum of 100 takes over, and the bar
 * announces a confident fraction of a ceiling nobody set. So the bar drops the
 * role and every value attribute and becomes decoration; the legend still
 * carries the name and the figure, which is the whole of what there is to say.
 *
 * The empty track is deliberate rather than a bug: there is no proportion to
 * draw, and the bar stays so the row keeps the height and rhythm of the meters
 * around it.
 */
export const Unbounded: Story = {
  args: { value: 12_400, max: 0, label: 'Tokens used', valueText: '12.4K tokens, no limit' },
};
