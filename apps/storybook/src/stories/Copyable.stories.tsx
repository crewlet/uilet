import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copyable, CopyButton, Text } from '@crewlethq/ui';

const meta: Meta<typeof Copyable> = {
  title: 'UI/Copyable',
  component: Copyable,
  args: {
    value: '00000000-0000-4000-8000-000000000000',
    variant: 'chip',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['chip', 'inline', 'block'] },
    monospace: { control: 'boolean' },
    truncate: { control: 'boolean' },
    truncateLength: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Copyable>;

export const Chip: Story = {};

export const Inline: Story = { args: { variant: 'inline' } };

export const Block: Story = {
  args: {
    variant: 'block',
    value: 'https://cluster-1234.crewlet.example/api',
  },
};

export const BlockMonospace: Story = {
  args: {
    variant: 'block',
    monospace: true,
    value: 'kubectl get pods --all-namespaces',
  },
};

export const TruncatedChip: Story = {
  args: {
    value: 'a-very-long-identifier-that-should-be-truncated-aggressively',
    truncate: true,
    truncateLength: 12,
  },
};

/**
 * The labelled form. The outcome is announced from a region OUTSIDE the
 * button, because an accessible name is computed from an element's contents:
 * inside it, the control was named "Copied copied to the clipboard".
 */
export const TheLabelledButton: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
      <CopyButton text={'{"turn_id":"t-1"}'} />
      <CopyButton text={'{"turn_id":"t-1"}'} variant="secondary" label="Copy the record" />
    </div>
  ),
};

/** One tab stop: the value is text, and the control is the only control. */
export const OneTabStop: Story = {
  render: () => (
    <Text as="p" variant="cell">
      Turn <Copyable value="0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44" ariaLabel="Copy the turn id" /> ran on
      node-a.
    </Text>
  ),
};
