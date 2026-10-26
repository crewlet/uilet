import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ChatThread, MessageBubble, Prose, Stack, ThinkingIndicator } from '@crewlethq/ui';

/**
 * The assistant at work, drawn where its answer will be: the Assistant's mark
 * with its main spark making a quarter turn while its companion twinkles, and,
 * before the answer's first words, a line saying what it is doing under a slow
 * shimmer. Under a reduced-motion preference the mark holds a still working
 * pose instead (the spark tucked, the companion dimmed). It replaces a caret
 * after streamed text, which landed on a line of its own.
 */
const meta: Meta<typeof ThinkingIndicator> = {
  title: 'UI/ThinkingIndicator',
  component: ThinkingIndicator,
  args: { status: 'Thinking' },
};

export default meta;
type Story = StoryObj<typeof ThinkingIndicator>;

export const Thinking: Story = {};

/** The step that runs, in its own words. */
export const ReadingAStep: Story = { args: { status: 'Listing the agents' } };

/** While the answer's words arrive, the mark stands alone after them. */
export const MarkAlone: Story = { args: { status: undefined } };

const ANSWER =
  'Both of your agents are idle. The Product Manager finished its last turn four minutes ago, and the Software Engineer is waiting on a review.';

const STEPS = ['Thinking', 'Listing the agents', 'Reading Worklet'];

function Turn() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t > 40 ? 0 : t + 1)), 160);
    return () => window.clearInterval(id);
  }, []);
  const step = Math.min(STEPS.length - 1, Math.floor(tick / 5));
  const words = ANSWER.split(' ');
  const shown = tick < 15 ? 0 : Math.min(words.length, (tick - 15) * 2);
  const done = shown === words.length && tick > 38;
  return (
    <div style={{ maxWidth: 420 }}>
      <ChatThread label="Conversation" busy={!done}>
        <MessageBubble from="self">What are my agents doing now?</MessageBubble>
        <Stack gap={2}>
          {shown > 0 ? <Prose measure="narrow">{words.slice(0, shown).join(' ')}</Prose> : null}
          {done ? null : <ThinkingIndicator status={shown > 0 ? undefined : STEPS[step]} />}
        </Stack>
      </ChatThread>
    </div>
  );
}

/**
 * A turn from question to answer, on a loop: the status line names each step,
 * the words arrive above the mark, and nothing moves when they start.
 */
export const InATurn: Story = { render: () => <Turn /> };
