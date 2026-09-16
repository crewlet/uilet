import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '@crewlethq/ui';
import {
  AddGlyph,
  CloseGlyph,
  ContentCopyGlyph,
  DeleteGlyph,
  DragIndicatorGlyph,
  SettingsGlyph,
} from '@crewlethq/icons/glyphs';

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    label: 'Add',
    size: 'md',
    variant: 'soft-brand',
    icon: <AddGlyph />,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'inline-radio',
      options: ['secondary', 'ghost', 'ghost-brand', 'ghost-danger', 'soft-brand'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

/**
 * The bordered square: a secondary Button with no room for a label. It is
 * what an icon-only control takes when there is nothing around it to say it
 * is a control, such as a month's back and forward or a step in a toolbar.
 */
export const Secondary: Story = {
  args: { variant: 'secondary', icon: <SettingsGlyph />, label: 'Column settings' },
};

export const SoftBrandAdd: Story = {
  args: { variant: 'soft-brand', icon: <AddGlyph />, label: 'Add policy' },
};

export const GhostCopy: Story = {
  args: { variant: 'ghost-brand', icon: <ContentCopyGlyph />, label: 'Copy to clipboard' },
};

export const GhostDangerRemove: Story = {
  args: { variant: 'ghost-danger', icon: <CloseGlyph />, label: 'Remove tag' },
};

export const GhostNeutralDrag: Story = {
  args: { variant: 'ghost', icon: <DragIndicatorGlyph />, label: 'Drag to reorder' },
};

export const Disabled: Story = {
  args: { variant: 'soft-brand', disabled: true, icon: <AddGlyph />, label: 'Add disabled' },
};

/**
 * Soft disabled: unavailable, and it says why. It keeps its focus and its
 * pointer events on purpose, because the explanation is unreachable otherwise.
 */
export const WithDisabledReason: Story = {
  args: {
    variant: 'ghost-danger',
    icon: <DeleteGlyph />,
    label: 'Delete unit',
    disabledReason: 'A unit with seats in it cannot be deleted',
  },
};

/** Every step is a control token, so the smallest is 24px at every density. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton variant="ghost" size="sm" label="Small" icon={<SettingsGlyph />} />
      <IconButton variant="ghost" size="md" label="Medium" icon={<SettingsGlyph />} />
      <IconButton variant="ghost" size="lg" label="Large" icon={<SettingsGlyph />} />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton variant="soft-brand" label="Soft brand" icon={<AddGlyph />} />
      <IconButton variant="ghost" label="Ghost" icon={<SettingsGlyph />} />
      <IconButton variant="ghost-brand" label="Ghost brand" icon={<ContentCopyGlyph />} />
      <IconButton variant="ghost-danger" label="Ghost danger" icon={<CloseGlyph />} />
    </div>
  ),
};
