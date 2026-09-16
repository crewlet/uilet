import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem, RelativeTime, StatusDot, Text } from '@crewlethq/ui';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof List> = {
  title: 'UI/List',
  component: List,
  argTypes: {
    variant: { control: 'inline-radio', options: ['plain', 'bulleted', 'numbered', 'divided'] },
  },
};

export default meta;
type Story = StoryObj<typeof List>;

const AGO = () => new Date(Date.now() - 4 * 60 * 1000).toISOString();

/** A feed. Every row is a link, so every row can be opened in a tab. */
export const AFeed: Story = {
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <List {...args} template="auto 1fr auto">
        <ListItem href="#/turns/t-1" leading={<StatusDot tone="success" />} trailing={<RelativeTime value={AGO()} />}>
          <Text variant="cell">Chief Executive answered a brief</Text>
        </ListItem>
        <ListItem href="#/turns/t-2" leading={<StatusDot tone="info" pulse />} trailing={<Text variant="caption">now</Text>}>
          <Text variant="cell">Backend Lead is running a coding job</Text>
        </ListItem>
        <ListItem
          href="#/turns/t-3"
          tone="danger"
          leading={<StatusDot tone="danger" />}
          trailing={<RelativeTime value={AGO()} />}
        >
          <Text variant="cell">publish_event was refused</Text>
        </ListItem>
      </List>
    </div>
  ),
};

/** The row the reader is on takes the accent, and says so out loud. */
export const Selected: Story = {
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <List {...args} variant="plain">
        <ListItem href="#/a" trailing={<ChevronRightGlyph size="sm" />}>
          Overview
        </ListItem>
        <ListItem href="#/b" selected trailing={<ChevronRightGlyph size="sm" />}>
          Coding runs
        </ListItem>
        <ListItem href="#/c" trailing={<ChevronRightGlyph size="sm" />}>
          Spend
        </ListItem>
      </List>
    </div>
  ),
};

/** Prose furniture: the bullets and numbers sit on the paragraph's own edge. */
export const InProse: Story = {
  render: () => (
    <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
      <List variant="bulleted">
        <ListItem>A seat is a queue-driven runtime.</ListItem>
        <ListItem>A unit is a group of seats with a lead.</ListItem>
      </List>
      <List variant="numbered">
        <ListItem>Seal the credential.</ListItem>
        <ListItem>Point the configuration at it.</ListItem>
        <ListItem>Advance the epoch.</ListItem>
      </List>
    </div>
  ),
};

/**
 * The four framings. `divided` is the DEFAULT, because it is the list every
 * screen draws: a feed, a set of results, a conversation, where rows a reader
 * scans down want a boundary they can count. `plain` is for a group where a
 * hairline would draw a table nobody asked for, and the two prose framings sit
 * on the paragraph's own left edge.
 *
 * Switch the Theme toolbar to see both palettes.
 */
export const Framings: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: '1fr 1fr', maxWidth: 640 }}>
      {(['divided', 'plain'] as const).map((variant) => (
        <div key={variant}>
          <Text variant="label" as="div" style={{ marginBottom: 'var(--spacing-2)' }}>
            {variant === 'divided' ? 'divided (the default)' : 'plain'}
          </Text>
          <List variant={variant}>
            <ListItem href="#/a">publish_event</ListItem>
            <ListItem href="#/b" selected>
              deliver_event
            </ListItem>
            <ListItem href="#/c">turn_completed</ListItem>
          </List>
        </div>
      ))}
    </div>
  ),
};
