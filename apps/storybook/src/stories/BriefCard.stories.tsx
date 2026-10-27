import type { Meta, StoryObj } from '@storybook/react-vite';
import { BriefCard } from '@crewlethq/ui';

/**
 * A brief, as the assistant's answer card: the verdict in the head, one line
 * on what the page is about, and at most three ranked things to do, the first
 * marked as the one to do first. Nothing waiting is said once, in the head.
 */
const meta: Meta<typeof BriefCard> = {
  title: 'UI/BriefCard',
  component: BriefCard,
  decorators: [(Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>],
  args: {
    scope: 'Home',
    asOf: 'Just now',
    about: 'GOP-4 waits on your answer and 2 agents are stopped on their budgets.',
    needs: [
      {
        key: 'gop-4',
        text: 'Answer GOP-4: how backend PRs prove fail-before, pass-after',
        detail: 'Asked 9 hours ago, blocks the merge',
        action: { label: 'Open GOP-4', onSelect: () => {} },
      },
      {
        key: 'backend',
        text: "Raise Senior Backend Engineer's daily budget",
        detail: 'Stopped 9 hours ago',
        tone: 'danger',
        action: { label: 'Open the agent', onSelect: () => {} },
      },
    ],
    followUps: [
      { key: 'budget', question: 'Why did the budget run out so early?', onSelect: () => {} },
      { key: 'blocks', question: 'What else is blocked on GOP-4?', onSelect: () => {} },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof BriefCard>;

/** Two things need the reader: the first is the one to do first, with the primary press. */
export const TwoNeeds: Story = {};

/** Nothing needs the reader: the head says so once, and the body is what the page is about. */
export const NothingNeedsYou: Story = {
  args: {
    scope: 'Inbox',
    about: 'Inbox: 8 open decisions, every one asked of someone else.',
    needs: [],
    followUps: [{ key: 'blocked', question: 'Which of these blocks the most work?', onSelect: () => {} }],
  },
};

/** A brief of one record, with one fact from elsewhere that bears on what to do. */
export const OneRecordWithContext: Story = {
  args: {
    scope: 'Decision GOP-11',
    about: 'QA asks whether to test the store build or the nightly.',
    needs: [
      {
        key: 'gop-11',
        text: 'Answer GOP-11: test the store build',
        detail: 'Asked 2 hours ago',
        action: { label: 'Open GOP-11', onSelect: () => {} },
      },
    ],
    context: 'The nightly carries the Android 12 crash, and the beta ships Thursday.',
    followUps: [],
  },
};
