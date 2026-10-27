import type { Meta, StoryObj } from '@storybook/react-vite';
import { BriefCard } from '@crewlethq/ui';

/**
 * A brief, as the assistant's answer card: one sentence, at most three rows
 * that wait on the reader with one press each, one recommended next step, and
 * the questions to ask next. Nothing waiting is said in words.
 */
const meta: Meta<typeof BriefCard> = {
  title: 'UI/BriefCard',
  component: BriefCard,
  decorators: [(Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>],
  args: {
    scope: 'Inbox',
    asOf: 'Just now',
    summary: '7 decisions and 4 unread updates; PM stopped on its daily budget at 3 pm.',
    needs: [
      {
        key: 'pm',
        text: 'PM is stopped on its daily budget',
        detail: '4.0M of 4.0M tokens, resets at midnight',
        tone: 'danger',
        action: { label: 'Open budgets', onSelect: () => {} },
      },
      {
        key: 'gop-8',
        text: 'GOP-8 asks for the Plus price',
        detail: 'Blocks GOP-9 and both store listings, 2 days old',
        action: { label: 'Answer', onSelect: () => {} },
      },
      {
        key: 'gop-11',
        text: 'QA asks which build to test on GOP-11',
        detail: 'Asked 2 hours ago',
        action: { label: 'Answer', onSelect: () => {} },
      },
    ],
    recommended: {
      text: 'Answer GOP-8 first: two tasks wait on it.',
      action: { label: 'Open GOP-8', onSelect: () => {} },
    },
    followUps: [
      { key: 'budget', question: 'Why is PM out of budget so early?', onSelect: () => {} },
      { key: 'blocks', question: 'Which decision blocks the most work?', onSelect: () => {} },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof BriefCard>;

export const Page: Story = {};

/** A brief of one record: the decision open in the Inbox, its ask and its task. */
export const OneRecord: Story = {
  args: {
    scope: 'Decision on GOP-11',
    summary: 'QA asks whether to test the store build or the nightly; the beta ships Thursday.',
    needs: [
      {
        key: 'ask',
        text: 'QA waits on your answer',
        detail: 'Asked 2 hours ago on GOP-11',
        action: { label: 'Answer', onSelect: () => {} },
      },
    ],
    recommended: { text: 'Test the store build: the nightly carries the Android 12 crash.' },
    followUps: [{ key: 'crash', question: 'What happens if I hold the beta?', onSelect: () => {} }],
  },
};

export const NothingNeedsYou: Story = {
  args: {
    summary: '5 agents working, 2 tasks closed today, spend at 41% of the week.',
    needs: [],
    recommended: null,
    followUps: [{ key: 'shipped', question: 'What shipped this week?', onSelect: () => {} }],
  },
};
