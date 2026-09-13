import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from '@crewlethq/ui';

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
      <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--font-family-display)', fontSize: 32 }}>
        The org chart is the execution graph.
      </h2>
    </div>
  ),
};
