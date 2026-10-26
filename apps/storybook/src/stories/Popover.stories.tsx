import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, Button, Inline } from '@crewlethq/ui';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
};

export default meta;
type Story = StoryObj<typeof Popover>;

/**
 * A panel its own content closes hands focus back to the trigger, as Escape
 * does: the Close button goes with the panel, and focus left on it would fall
 * to the page's body.
 */
export const Basic: Story = {
  render: () => (
    <Popover
      label="Details"
      trigger={(open, toggle) => (
        <Button variant="outline" onClick={toggle}>
          {open ? 'Close menu' : 'Open menu'}
        </Button>
      )}
    >
      {(close) => (
        <div style={{ padding: 'var(--spacing-3)' }}>
          <p style={{ margin: '0 0 var(--spacing-2)' }}>Popover content.</p>
          <Button size="small" onClick={close}>Close</Button>
        </div>
      )}
    </Popover>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Popover
        label="Actions"
        align="end"
        trigger={(_open, toggle) => (
          <Button variant="outline" onClick={toggle}>Actions</Button>
        )}
      >
        <Inline gap={2} style={{ padding: 'var(--spacing-3)' }}>
          <Button size="small" variant="ghost">Edit</Button>
          <Button size="small" variant="danger">Delete</Button>
        </Inline>
      </Popover>
    </div>
  ),
};
