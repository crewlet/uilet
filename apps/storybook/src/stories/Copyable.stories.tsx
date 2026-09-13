import type { Meta, StoryObj } from '@storybook/react-vite';
import { Copyable } from '@crewlethq/ui';

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
