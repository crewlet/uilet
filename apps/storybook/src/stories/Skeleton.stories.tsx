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
    rows: { control: 'number' },
    rowHeight: { control: 'number' },
    columns: { control: 'number' },
    count: { control: 'number' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

/**
 * ONE SWEEP EVERYWHERE, where the small blocks used to fade in place. A block
 * that fades beside one that travels reads as two things loading in two
 * different ways, and the sweep is the honest shape: it moves along the row
 * the way the text will arrive. Under reduced motion every block holds still
 * on the inset step rather than wherever the sweep stopped.
 */
export const Card: Story = {};
export const Text: Story = { args: { variant: 'text', rows: 4 } };
export const TextWithARowHeight: Story = { args: { variant: 'text', rows: 4, rowHeight: 20 } };
export const Grid: Story = { args: { variant: 'grid', rows: 2, columns: 3 } };
export const List: Story = { args: { variant: 'list', rows: 4 } };
export const Table: Story = { args: { variant: 'table', rows: 5, columns: 4 } };
export const InfoGrid: Story = { args: { variant: 'info-grid', rows: 2, columns: 4 } };
export const PricingCard: Story = { args: { variant: 'pricing-card', count: 4 } };

/**
 * One sweep, in the hover overlay, where there used to be five glow colours.
 * A placeholder stands in for content that has not arrived, and a blue one and
 * a red one say nothing different about that.
 */
export const Box: Story = {
  args: { variant: 'box', height: 240 },
};

/**
 * THE `aria-busy` BELONGS TO WHAT IS LOADING, not to the placeholder: a
 * placeholder is what is there instead of the content, so marking it busy says
 * the placeholder is loading. The label is what a reader who cannot see the
 * shape is told, said once in a polite region.
 */
export const Announced: Story = {
  render: () => (
    <section aria-busy="true" aria-label="Seats">
      <Skeleton variant="list" rows={3} label="Loading seats" />
    </section>
  ),
};
