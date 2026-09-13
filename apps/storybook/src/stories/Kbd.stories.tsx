import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from '@crewlethq/ui';

const meta: Meta<typeof Kbd> = {
  title: 'UI/Kbd',
  component: Kbd,
  args: { children: 'Enter' },
  argTypes: { subtle: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = {};
export const Subtle: Story = { args: { subtle: true } };
export const Shortcut: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </span>
  ),
};
