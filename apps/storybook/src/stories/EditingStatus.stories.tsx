import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, EditingStatus } from '@crewlethq/ui';

/**
 * UI / EditingStatus.
 *
 * The quiet state a page is in while somebody edits it, beside the caller's
 * own Cancel and Save: "Editing", and "Unsaved changes" with an accent dot
 * once anything differs from what was opened.
 */
const meta: Meta<typeof EditingStatus> = {
  title: 'UI/EditingStatus',
  component: EditingStatus,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof EditingStatus>;

export const Clean: Story = { args: { dirty: false } };

export const Unsaved: Story = { args: { dirty: true } };

export const Saving: Story = { args: { dirty: true, saving: true } };

/** In a page bar, where it belongs. */
export const InABar: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <EditingStatus dirty />
      <span style={{ flex: 1 }} />
      <Button size="small" variant="ghost">
        Cancel
      </Button>
      <Button size="small" variant="primary">
        Save
      </Button>
    </div>
  ),
};
