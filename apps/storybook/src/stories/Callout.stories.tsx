import type { Meta, StoryObj } from '@storybook/react-vite';
import { Callout } from '@crewlethq/ui';

const meta: Meta<typeof Callout> = {
  title: 'UI/Callout',
  component: Callout,
  args: {
    variant: 'info',
    children: 'The engine is syncing; live data resumes automatically.',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['info', 'success', 'warning', 'danger'] },
  },
};

export default meta;
type Story = StoryObj<typeof Callout>;

export const Info: Story = {};

export const Success: Story = {
  args: { variant: 'success', children: 'Revision restored as the new active config.' },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Heads up',
    children: 'The config changed while you were editing. Reload and reapply your change.',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'The engine is unreachable. Live data is unavailable until it reconnects.',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'danger',
    icon: <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_off</span>,
    children: 'No engine is connected yet. Connect one to see live data.',
  },
};
