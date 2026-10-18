import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CommentThread, type CommentThreadComment } from '@crewlethq/ui';

const meta: Meta<typeof CommentThread> = {
  title: 'UI/CommentThread',
  component: CommentThread,
};

export default meta;
type Story = StoryObj<typeof CommentThread>;

const NOW = Date.parse('2026-10-18T12:00:00Z');
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };
const PM = { id: 'pm', kind: 'agent' as const, name: 'Product Manager', character: 'gemlet' as const, hue: 'rose' as const };

const THREAD: CommentThreadComment[] = [
  {
    id: 'c1',
    author: MAYA,
    body: <p>Should the rollout wait for the security review?</p>,
    createdAt: NOW - 3 * 3_600_000,
  },
  {
    id: 'c2',
    author: PM,
    body: (
      <p>
        Yes. The review closes on <strong>Friday</strong>, and the rollout starts the Monday after.
      </p>
    ),
    createdAt: NOW - 2 * 3_600_000,
    editedAt: NOW - 90 * 60_000,
    replyTo: 'c1',
  },
  { id: 'c3', body: <p>This page moved to Runbooks.</p>, createdAt: NOW - 30 * 60_000 },
];

/**
 * A thread a reader can add to. Reply moves focus to the field, which names
 * whom it answers; the post clears the draft once the host says it landed.
 */
export const Interactive: Story = {
  render: function Render() {
    const [comments, setComments] = useState(THREAD);
    return (
      <div style={{ maxWidth: 640 }}>
        <CommentThread
          comments={comments}
          subject="Onboarding"
          now={NOW}
          hint="The page's watchers are told, and anyone you mention."
          onSubmit={(body, replyTo) => {
            setComments((list) => [
              ...list,
              {
                id: `c${list.length + 1}`,
                author: MAYA,
                body: <p>{body}</p>,
                createdAt: NOW,
                ...(replyTo ? { replyTo: replyTo.id } : {}),
              },
            ]);
            return true;
          }}
        />
      </div>
    );
  },
};

/** A reader who cannot post sees the thread and the reason, in the open. */
export const ReadOnlyWithReason: Story = {
  args: {
    comments: THREAD,
    now: NOW,
    onSubmit: () => {},
    disabledReason: 'Your token can read this space but not write to it.',
  },
};

/** Nobody has commented yet. */
export const Empty: Story = {
  args: { comments: [], onSubmit: () => {} },
};
