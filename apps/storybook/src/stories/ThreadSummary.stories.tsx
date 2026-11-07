import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Avatar, ChatDivider, ChatMessage, ThinkingIndicator, ThreadSummary } from '@crewlethq/ui';

/**
 * The line under a message with replies: the repliers' faces, "4 replies" at
 * the medium weight in the accent's ink, and how many are new. Under the
 * pointer it is set into the transcript's ground in a hairline, when the last
 * reply came fades in, and View thread with a chevron stands at its end. While
 * open, the message it hangs off wears the selected surface.
 */
const meta: Meta<typeof ThreadSummary> = {
  title: 'UI/ThreadSummary',
  component: ThreadSummary,
};

export default meta;
type Story = StoryObj<typeof ThreadSummary>;

const participants = [
  { name: 'Senior Backend Engineer', character: 'gemlet' as const, hue: 'cyan' as const },
  { name: 'Designer', kind: 'human' as const },
  { name: 'Product Manager', kind: 'human' as const },
  { name: 'CTO', character: 'crewlet' as const, hue: 'rose' as const },
];

function Toggling(props: { unread?: number; working?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <ThreadSummary
      replies={4}
      participants={participants}
      last="12m ago"
      unread={open ? 0 : (props.unread ?? 0)}
      open={open}
      onOpen={() => setOpen((was) => !was)}
      working={
        props.working ? (
          <ThinkingIndicator status="Senior Backend Engineer is writing a reply · Reading the diff" label="Senior Backend Engineer is writing a reply" />
        ) : undefined
      }
    />
  );
}

/** Point at it, then press it: the thread opens and the line says so. */
export const Default: Story = { render: () => <Toggling /> };

/** Two replies the reader has not seen. */
export const WithNewReplies: Story = { render: () => <Toggling unread={2} /> };

/** An agent writing a reply in the thread, under the line. */
export const WithAgentWorking: Story = { render: () => <Toggling unread={1} working /> };

/** Under its message, open: the message wears the selected surface, the line says so. */
export const OpenUnderItsMessage: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <ChatMessage
        id="m-1"
        label="Designer, 9:41 AM"
        avatar={<Avatar name="Designer" kind="human" size="md" />}
        author="Designer"
        time="9:41 AM"
        timeTitle="Thursday, October 30 at 9:41 AM"
        footer={<ThreadSummary replies={4} participants={participants} last="12m ago" open onOpen={() => {}} />}
      >
        The release checklist is in the doc; reply here with anything that blocks it.
      </ChatMessage>
    </div>
  ),
};

/** The reply count between a thread's root and its replies, on the faces' edge. */
export const CountDivider: Story = {
  render: () => (
    <div style={{ maxWidth: 400 }}>
      <ChatDivider variant="count" label="4 replies" />
    </div>
  ),
};
