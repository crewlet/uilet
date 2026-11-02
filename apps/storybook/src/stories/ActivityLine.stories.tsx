import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityLine } from '@crewlethq/ui';

/**
 * Who is typing and which agent is working, in one quiet line under a
 * composer. It keeps one line's height when it is empty, so the box above it
 * never moves.
 */
const meta: Meta<typeof ActivityLine> = {
  title: 'UI/ActivityLine',
  component: ActivityLine,
  decorators: [(Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ActivityLine>;

export const Typing: Story = { args: { typing: 'Product Manager is typing' } };

export const Working: Story = {
  args: {
    working: 'Senior Backend Engineer is writing a reply · Reading the diff',
    workingLabel: 'Senior Backend Engineer is writing a reply',
  },
};

/**
 * The agent has not started on it yet: the request waits behind something it
 * is already doing, so the mark rests and the line is still.
 */
export const Queued: Story = {
  args: { working: 'Product Manager is queued behind its current task', queued: true },
};

/** Both at once; a narrow column truncates the working line rather than widening. */
export const Both: Story = {
  args: {
    typing: 'Designer and CTO are typing',
    working: 'Senior Backend Engineer is writing a reply · Running the integration tests',
    workingLabel: 'Senior Backend Engineer is writing a reply',
  },
};

export const Empty: Story = { args: {} };
