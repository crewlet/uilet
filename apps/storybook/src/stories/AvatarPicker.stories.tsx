import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvatarPicker, type AvatarPickerValue } from '@crewlethq/ui';

/**
 * An agent's badge that opens its own picker: the characters and the hues in a
 * popover, each choice applied as it is made.
 */
const meta: Meta<typeof AvatarPicker> = {
  title: 'UI/AvatarPicker',
  component: AvatarPicker,
};

export default meta;
type Story = StoryObj<typeof AvatarPicker>;

function Chosen() {
  const [value, setValue] = useState<AvatarPickerValue>({ character: 'gemlet', hue: 'cyan' });
  return <AvatarPicker name="Software Engineer" value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Chosen /> };

/** Read only: the badge alone, with nothing to press. */
export const Disabled: Story = {
  render: () => (
    <AvatarPicker name="Software Engineer" value={{ character: 'gemlet', hue: 'cyan' }} onChange={() => {}} disabled />
  ),
};
