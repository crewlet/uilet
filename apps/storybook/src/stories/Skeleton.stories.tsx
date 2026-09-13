import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from '@crewlethq/ui';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  args: { variant: 'card' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['box', 'text', 'card', 'grid', 'list', 'table', 'info-grid', 'pricing-card'],
    },
    glowColor: { control: 'inline-radio', options: ['blue', 'green', 'purple', 'orange', 'red'] },
    rows: { control: 'number' },
    columns: { control: 'number' },
    count: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Card: Story = {};
export const Text: Story = { args: { variant: 'text', rows: 4 } };
export const Grid: Story = { args: { variant: 'grid', rows: 2, columns: 3 } };
export const List: Story = { args: { variant: 'list', rows: 4 } };
export const Table: Story = { args: { variant: 'table', rows: 5, columns: 4 } };
export const InfoGrid: Story = { args: { variant: 'info-grid', rows: 2, columns: 4 } };
export const PricingCard: Story = { args: { variant: 'pricing-card', count: 4 } };

export const BoxGlow: Story = {
  args: { variant: 'box', height: 240, glowColor: 'blue' },
};
export const BoxGlowGreen: Story = {
  args: { variant: 'box', height: 240, glowColor: 'green' },
};
