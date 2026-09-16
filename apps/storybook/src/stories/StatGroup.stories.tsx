import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard, StatGroup } from '@crewlethq/ui';

const meta: Meta<typeof StatGroup> = {
  title: 'UI/StatGroup',
  component: StatGroup,
  args: { columns: 4 },
  argTypes: {
    columns: { control: 'inline-radio', options: [2, 3, 4] },
  },
};

export default meta;
type Story = StoryObj<typeof StatGroup>;

/** A row of tiles drawn as one card, with a hairline between the columns. */
export const Basic: Story = {
  render: (args) => (
    <StatGroup {...args}>
      <StatCard label="Total tokens" value="831.3K" sub="7 days" />
      <StatCard label="Input" value="722.0K" />
      <StatCard label="Output" value="109.3K" />
      <StatCard label="LLM calls" value="48" />
    </StatGroup>
  ),
};

/**
 * THE COLUMN COUNT NEVER MOVES with what the row holds. Two tiles in a
 * four-column row leave a gap, which is the point: the board this replaces
 * reflowed as tiles appeared and vanished, and moved every number on the page
 * for a reason that had nothing to do with the numbers.
 */
export const AGapIsBetterThanAReflow: Story = {
  render: () => (
    <StatGroup columns={4}>
      <StatCard label="Seats" value="12" />
      <StatCard label="Working" value="3" tone="success" />
    </StatGroup>
  ),
};

/**
 * A tile inside the row brings no surface of its own, whether or not its
 * caller passes `flush`: the group draws the card, so a tile keeping its own
 * border would be a card inside a card.
 */
export const TheTilesAreNotCards: Story = {
  render: () => (
    <StatGroup columns={3}>
      <StatCard label="Tracked" value="61" />
      <StatCard flush label="Overdue" value="4" tone="warning" />
      <StatCard label="Blocked" value="0" />
    </StatGroup>
  ),
};

/** A row still waiting on its numbers. Each tile says so on its own. */
export const StillLoading: Story = {
  render: () => (
    <StatGroup columns={3}>
      <StatCard label="Total tokens" value="0" loading />
      <StatCard label="Input" value="0" loading />
      <StatCard label="Output" value="0" loading />
    </StatGroup>
  ),
};
