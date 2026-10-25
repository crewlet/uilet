import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Composer, Inline, SendButton } from '@crewlethq/ui';

/**
 * A chat composer's send button, which becomes Stop while a request runs: the
 * accent square with an arrow, then the bordered square with a small filled
 * square and an accent arc travelling round its edge, on one element so focus
 * stays on it. With nothing to send it is the accent's soft tint, and its
 * tooltip says why. In a `Composer`'s `trailing` slot its corner nests in the
 * composer's.
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

/** A request runs: the arc travels round the edge until it ends. */
export const Stop: Story = { args: { mode: 'stop' } };

/** Soft disabled, with its reason: it stays in the tab order and says why. */
export const Disabled: Story = { args: { disabledReason: 'Type a question first' } };

/** A stop already under way holds a second press. */
export const Stopping: Story = { args: { mode: 'stop', disabledReason: 'Stopping' } };

/** Every state side by side. */
export const States: Story = {
  render: () => (
    <Inline gap={3} align="center">
      <SendButton mode="send" onPress={() => {}} disabledReason="Type a question first" />
      <SendButton mode="send" onPress={() => {}} />
      <SendButton mode="stop" onPress={() => {}} />
      <SendButton mode="stop" onPress={() => {}} disabledReason="Stopping" />
    </Inline>
  ),
};

function Toggling() {
  const [running, setRunning] = useState(false);
  return <SendButton mode={running ? 'stop' : 'send'} onPress={() => setRunning(!running)} />;
}

/** Press to start and stop a pretend request: the glyphs cross fade in place. */
export const Toggle: Story = { render: () => <Toggling /> };

function InComposer() {
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const send = () => {
    if (draft.trim() === '') return;
    setDraft('');
    setRunning(true);
  };
  return (
    <div style={{ maxWidth: 420 }}>
      <Composer
        label="Ask the assistant"
        value={draft}
        onChange={setDraft}
        onSubmit={send}
        onKeyDown={(event) => {
          if (running && event.key === 'Escape') {
            event.preventDefault();
            setRunning(false);
          }
        }}
        submitOn="enter"
        placeholder="Ask about agents, tasks or spend"
        trailing={
          <SendButton
            mode={running ? 'stop' : 'send'}
            onPress={running ? () => setRunning(false) : send}
            labels={{ stop: 'Stop answering' }}
            title={running ? 'Stop answering (Esc)' : undefined}
            disabledReason={running ? undefined : draft.trim() === '' ? 'Type a question first' : undefined}
          />
        }
      />
    </div>
  );
}

/** In the composer's corner: Enter sends, and Escape or the button stops. */
export const InAComposer: Story = { render: () => <InComposer /> };
