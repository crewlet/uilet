import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, SendKeysHint, Text, Textarea, useSendOnEnter } from '@crewlethq/ui';

/**
 * THE SEND KEYS OF EVERY MESSAGE BOX: Enter sends, Shift+Enter writes a new
 * line, and Command+Enter (Control+Enter elsewhere) sends too, for the habit.
 * Never while an input method is composing, never an Enter an open list
 * claimed, and never a touch keyboard's Return, which writes a line while the
 * Send button sends. `Composer` is built on it; a box that is not a
 * `Composer` uses `useSendOnEnter`, and the hint is `SendKeysHint`.
 */
const meta: Meta<typeof SendKeysHint> = {
  title: 'UI/SendKeys',
  component: SendKeysHint,
};

export default meta;
type Story = StoryObj<typeof SendKeysHint>;

/** The hint, in each platform's notation, and with a rewrite's words. */
export const Hint: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
      <SendKeysHint apple />
      <SendKeysHint apple={false} />
      <SendKeysHint labels={{ send: 'to save' }} />
    </div>
  ),
};

function Box() {
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const send = () => {
    setSent((all) => [...all, text.trim()]);
    setText('');
  };
  const keys = useSendOnEnter({ onSend: send, canSend: text.trim() !== '' });
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)', maxWidth: 480 }}>
      {sent.map((message, index) => (
        <Text key={index} as="p">
          {message}
        </Text>
      ))}
      <Textarea
        aria-label="Reply"
        aria-describedby={keys.describedBy}
        placeholder="Reply"
        rows={2}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={keys.onKeyDown}
      />
      {keys.description}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
        <SendKeysHint />
        <span style={{ flex: 1 }} />
        <Button size="small" variant="primary" disabled={!text.trim()} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}

/** A plain field that sends like every message box, through the hook. */
export const OnAField: Story = { render: () => <Box /> };
