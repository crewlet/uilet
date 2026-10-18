import type { Meta, StoryObj } from '@storybook/react-vite';
import { CursorFlag } from '@crewlethq/ui';

const meta: Meta<typeof CursorFlag> = {
  title: 'UI/CursorFlag',
  component: CursorFlag,
  args: { placement: 'inline' },
};

export default meta;
type Story = StoryObj<typeof CursorFlag>;

export const Human: Story = { args: { name: 'Maya Ortiz', hue: 'cyan' } };
export const Agent: Story = { args: { name: 'PM', hue: 'rose', kind: 'agent' } };
export const Editing: Story = { args: { name: 'Maya', hue: 'green', editing: true } };
export const MultipleNames: Story = { args: { name: ['Maya', 'PM'], hue: 'amber' } };
export const LongNameTruncates: Story = { args: { name: 'Alexandria Montgomery-Featherstonehaugh', hue: 'purple' } };

/** Pinned above the end of the element it labels, as on a sheet cell. */
export const PinnedToACell: Story = {
  render: () => (
    <div style={{ position: 'relative', marginTop: 32, width: 140, height: 32, border: '1px solid var(--color-border-default)' }}>
      <CursorFlag name="Jane Founder" hue="blue" />
    </div>
  ),
};
