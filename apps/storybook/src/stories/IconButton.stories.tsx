import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '@crewlethq/ui';

const Icon = ({ name }: { name: string }) => (
  <span className="material-symbols-outlined" aria-hidden>{name}</span>
);

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    'aria-label': 'Add',
    size: 'sm',
    variant: 'soft-brand',
    children: <Icon name="add" />,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    variant: { control: 'inline-radio', options: ['ghost', 'ghost-brand', 'ghost-danger', 'soft-brand'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const SoftBrandAdd: Story = {
  args: { variant: 'soft-brand', size: 'sm', children: <Icon name="add" />, 'aria-label': 'Add policy' },
};

export const GhostCopy: Story = {
  args: { variant: 'ghost-brand', size: 'sm', children: <Icon name="content_copy" />, 'aria-label': 'Copy to clipboard' },
};

export const GhostDangerRemove: Story = {
  args: { variant: 'ghost-danger', size: 'sm', children: <Icon name="close" />, 'aria-label': 'Remove tag' },
};

export const GhostNeutralDrag: Story = {
  args: { variant: 'ghost', size: 'md', children: <Icon name="drag_indicator" />, 'aria-label': 'Drag to reorder' },
};

export const Disabled: Story = {
  args: { variant: 'soft-brand', size: 'sm', disabled: true, children: <Icon name="add" />, 'aria-label': 'Add disabled' },
};

export const Medium: Story = {
  args: { variant: 'soft-brand', size: 'md', children: <Icon name="add" />, 'aria-label': 'Add larger' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton variant="soft-brand"    size="sm" aria-label="Soft brand">     <Icon name="add" /></IconButton>
      <IconButton variant="ghost"         size="sm" aria-label="Ghost">          <Icon name="settings" /></IconButton>
      <IconButton variant="ghost-brand"   size="sm" aria-label="Ghost brand">    <Icon name="content_copy" /></IconButton>
      <IconButton variant="ghost-danger"  size="sm" aria-label="Ghost danger">   <Icon name="close" /></IconButton>
    </div>
  ),
};
