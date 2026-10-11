import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyChip } from '@crewlethq/ui';

/**
 * A project's key as the small mono chip every surface draws: a rail row, a
 * crumb, a switcher row, a directory cell. A search's letters are drawn bold.
 */
const meta: Meta<typeof KeyChip> = {
  title: 'UI/KeyChip',
  component: KeyChip,
  args: { children: 'FAIR' },
};

export default meta;
type Story = StoryObj<typeof KeyChip>;

export const Default: Story = {};

export const BesideAName: Story = {
  render: () => (
    <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <KeyChip>FAIR</KeyChip>
      <span>Product and Engineering</span>
    </p>
  ),
};

export const Matched: Story = {
  args: { children: 'SPLIT', highlight: 'sp' },
};
