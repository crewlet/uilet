import type { Meta, StoryObj } from '@storybook/react-vite';
import { Popover, Button } from '@crewlethq/ui';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
};

export default meta;
type Story = StoryObj<typeof Popover>;

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
        <div style={{ padding: 12, minWidth: 220 }}>
          <p style={{ margin: '0 0 8px 0' }}>Popover content.</p>
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
        <div style={{ padding: 12, minWidth: 180 }}>
          <Button size="small" variant="tertiary">Edit</Button>
          <Button size="small" variant="danger">Delete</Button>
        </div>
      </Popover>
    </div>
  ),
};
