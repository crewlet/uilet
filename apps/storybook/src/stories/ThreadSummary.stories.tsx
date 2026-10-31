import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ThinkingIndicator, ThreadSummary } from '@crewlethq/ui';

/**
 * The line under a message with replies: the repliers' faces, "4 replies" at
 * the medium weight in the accent's ink, how many are new, and when the last
 * reply came. Under the pointer it is lifted onto the transcript's ground in
 * a hairline and says View thread in the time's place.
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
