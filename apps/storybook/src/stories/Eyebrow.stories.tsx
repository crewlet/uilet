import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow, Text } from '@crewlethq/ui';

const meta: Meta<typeof Eyebrow> = {
  title: 'UI/Eyebrow',
  component: Eyebrow,
  argTypes: {
    variant: { control: 'inline-radio', options: ['muted', 'accent', 'gradient'] },
  },
  args: { variant: 'muted', children: 'WHAT THE ENGINE DOES' },
};

export default meta;
type Story = StoryObj<typeof Eyebrow>;

export const Muted: Story = {};

export const Accent: Story = { args: { variant: 'accent', children: 'GOAL ALIGNMENT' } };

export const Gradient: Story = { args: { variant: 'gradient', children: 'OPEN SOURCE' } };

export const AboveATitle: Story = {
  render: (args) => (
    <div>
      <Eyebrow {...args} />
      <Text
        as="h2"
        variant="display"
        style={{ display: 'block', margin: 'var(--spacing-2) 0 0' }}
      >
        The org chart is the execution graph.
      </Text>
    </div>
  ),
};

/**
 * ONE REGISTER. A kicker over a marketing band and a table's column head name
 * the same thing, the block under them, so they are set the same way: 11px,
 * medium, the wide track, uppercase, on the tertiary step. Drawn side by side
 * they are indistinguishable, which is the point; a suite asserts the tie.
 */
export const TheSameAsALabel: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
      <Eyebrow>WHAT THE ENGINE DOES</Eyebrow>
      <Text variant="label" as="div">
        WHAT THE ENGINE DOES
      </Text>
    </div>
  ),
};
