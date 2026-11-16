import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommentPin } from '@crewlethq/ui';

const meta: Meta<typeof CommentPin> = {
  title: 'UI/CommentPin',
  component: CommentPin,
  args: { mark: '3', label: 'Avery on the comparison: say which plan most teams pick', style: { position: 'relative', top: 32 } },
};

export default meta;
type Story = StoryObj<typeof CommentPin>;

export const Open: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Resolved: Story = { args: { state: 'resolved', label: 'Resolved in version 3' } };
export const Draft: Story = { args: { state: 'draft', mark: 'A', label: 'Your new comment' } };

/** Pins over content: each tip on its point, a section's pin at the section's top end corner. */
export const OverContent: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: 360,
        height: 200,
        border: '1px solid var(--color-border-default)',
        borderRadius: 12,
        background: 'var(--color-surface-elevated)',
      }}
    >
      <div style={{ position: 'absolute', left: 24, top: 40, width: 200, height: 90, outline: '2px dashed var(--color-brand-accent)', borderRadius: 8 }} />
      <CommentPin mark="1" label="On the section" selected style={{ left: 224, top: 40 }} />
      <CommentPin mark="2" label="On a point" style={{ left: 300, top: 150 }} />
      <CommentPin mark="" label="Resolved" state="resolved" style={{ left: 80, top: 170 }} />
    </div>
  ),
};
