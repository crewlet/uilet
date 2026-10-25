import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SendButton } from '@crewlethq/ui';

/**
 * A chat composer's send button, which becomes Stop while a request runs: the
 * accent square with an arrow, then the bordered square with a filled square,
 * on one element so focus stays on it. In a `Composer`'s `trailing` slot its
 * corner nests in the composer's.
 */
const meta: Meta<typeof SendButton> = {
  title: 'UI/SendButton',
  component: SendButton,
  args: { mode: 'send', onPress: () => {} },
  argTypes: { mode: { control: 'inline-radio', options: ['send', 'stop'] } },
};

export default meta;
type Story = StoryObj<typeof SendButton>;

export const Send: Story = {};

export const Stop: Story = { args: { mode: 'stop' } };

/** Soft disabled, with its reason: it stays in the tab order and says why. */
export const Disabled: Story = { args: { disabledReason: 'Write a question first' } };

function Toggling() {
  const [running, setRunning] = useState(false);
  return <SendButton mode={running ? 'stop' : 'send'} onPress={() => setRunning(!running)} />;
}

/** Press to start and stop a pretend request. */
export const Toggle: Story = { render: () => <Toggling /> };
