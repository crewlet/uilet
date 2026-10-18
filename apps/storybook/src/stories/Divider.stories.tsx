import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from '@crewlethq/ui';

const meta: Meta<typeof Divider> = {
  title: 'UI/Divider',
  component: Divider,
  args: { label: 'History' },
};

export default meta;
type Story = StoryObj<typeof Divider>;

/** A named rule: a screen reader hears where "History" begins. */
export const Labelled: Story = {};

/** A plain rule between two parts of a page. */
export const Plain: Story = { args: { label: undefined } };

/** The name in the middle of the rule. */
export const Centered: Story = { args: { align: 'center' } };
