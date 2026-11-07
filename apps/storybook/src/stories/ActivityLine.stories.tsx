import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityLine } from '@crewlethq/ui';

/**
 * Who is typing and which agents are working, in one quiet line under a
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

const AGENTS = [
  { id: 'swe', name: 'Senior Backend Engineer', character: 'gemlet' as const, hue: 'cyan' as const, status: 'is thinking it through...' },
  { id: 'cto', name: 'CTO', character: 'crewlet' as const, hue: 'rose' as const, status: 'is crewleting...' },
  { id: 'pm', name: 'Product Manager', character: 'peaklet' as const, hue: 'green' as const, status: 'is mulling it over...' },
];

/** The agents at work, as one `WorkingLine`: faces, one sentence and, on demand, a line per agent. */
export const Working: Story = { args: { agents: AGENTS } };

/**
 * The agent has not started on it yet: the request waits behind something it
 * is already doing, so the line is still.
 */
export const Queued: Story = {
  args: { agents: [{ ...AGENTS[2]!, queued: true, status: 'is queued behind its current task' }] },
};

/** Both at once: people typing are words and dots, agents are faces; a narrow column wraps them. */
export const Both: Story = {
  args: { typing: 'Designer is typing', agents: AGENTS.slice(0, 2) },
};

export const Empty: Story = { args: {} };
