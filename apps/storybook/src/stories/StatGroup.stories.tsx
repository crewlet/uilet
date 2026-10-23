import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, StatCard, StatGroup } from '@crewlethq/ui';

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

/**
 * Inside a card the card is the row's surface and edge, and only the hairlines
 * between the tiles are the row's own. A row that is a card's content, or its
 * body's, is flush by where it stands, with or without `flush`: the second
 * card here passes nothing and draws no box inside its box, padded body and
 * all. `flush` is for a host that is not a Card.
 */
export const InsideACard: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
      <Card padding="none">
        <Card.Header>
          <Card.Title as="h3">Nodes</Card.Title>
        </Card.Header>
        <StatGroup columns={3}>
          <StatCard label="Live" value="3" tone="success" />
          <StatCard label="Drifted" value="0" />
          <StatCard label="Stranded seats" value="0" />
        </StatGroup>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title as="h3">Snapshots</Card.Title>
        </Card.Header>
        <Card.Body padding="md">
          <StatGroup columns={4}>
            <StatCard label="Taken" value="14" />
            <StatCard label="Size" value="1.6 MB" />
            <StatCard label="Owner" value="Not set" sub="set retention.backup_owner" />
            <StatCard label="Oldest" value="9 days" />
          </StatGroup>
        </Card.Body>
      </Card>
    </div>
  ),
};

/**
 * THE ROW FOLDS BY ITS OWN WIDTH, never the window's. At 489px (a settings
 * page at a 1024px window, beside the rail and the settings column) four
 * tiles stand two by two rather than four tiles of 120px with their figures
 * cut; at 345px (a phone) three tiles stand one a row rather than two and a
 * lone third at double width. Across a page, the same rows stand on one line.
 */
export const FoldsByItsOwnWidth: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {[960, 489, 345].map((width) => (
        <div key={width} style={{ display: 'grid', gap: 'var(--spacing-3)', width }}>
          <StatGroup columns={4} aria-label={`Four tiles in ${width}px`}>
            <StatCard label="Taken" value="14" />
            <StatCard label="Size" value="1.6 MB" />
            <StatCard label="Owner" value="Not set" sub="set retention.backup_owner" />
            <StatCard label="Behind on config" value="0" />
          </StatGroup>
          <StatGroup columns={3} aria-label={`Three tiles in ${width}px`}>
            <StatCard label="Schedules" value="6" />
            <StatCard label="Paused" value="1" tone="warning" />
            <StatCard label="Next run" value="09:00" sub="tomorrow" />
          </StatGroup>
        </div>
      ))}
    </div>
  ),
};
