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

/** Three rows, the cap: ranked, the first marked to do first. */
export const ThreeNeeds: Story = {
  args: {
    about: 'Three decisions wait on you before Thursday’s beta.',
    needs: [
      {
        key: 'gop-8',
        text: 'Answer GOP-8: set the Plus price',
        detail: 'Blocks GOP-9 and both store listings',
        action: { label: 'Open GOP-8', onSelect: () => {} },
      },
      {
        key: 'gop-11',
        text: 'Answer GOP-11: which build QA tests',
        detail: 'Asked 2 hours ago',
        action: { label: 'Open GOP-11', onSelect: () => {} },
      },
      {
        key: 'gop-14',
        text: 'Review GOP-14: the store listing copy',
        detail: 'Waiting since yesterday',
        action: { label: 'Open GOP-14', onSelect: () => {} },
      },
    ],
    followUps: [],
  },
};

/** A stopped agent ranked first: the row and the verdict in the head are both danger. */
export const DangerFirst: Story = {
  args: {
    about: 'PM stopped on its daily budget, and GOP-11 waits on your answer.',
    needs: [
      {
        key: 'pm',
        text: "Raise PM's daily budget",
        detail: 'Stopped at 3 pm, resets at midnight',
        tone: 'danger',
        action: { label: 'Open the agent', onSelect: () => {} },
      },
      {
        key: 'gop-11',
        text: 'Answer GOP-11: which build QA tests',
        detail: 'Asked 2 hours ago',
        action: { label: 'Open GOP-11', onSelect: () => {} },
      },
    ],
    followUps: [{ key: 'budget', question: 'Why did PM run out so early?', onSelect: () => {} }],
  },
};

/** Words with no break in them (a URL, a branch, a hash) wrap inside the card rather than spill out of it. */
export const LongText: Story = {
  args: {
    scope: 'Decision GOP-27',
    about:
      'QA asks whether https://builds.example.com/android/release-candidates/2026-10-27/build-8f3a9c2e1b7d4f60 is the one to test.',
    needs: [
      {
        key: 'gop-27',
        text: 'Answer GOP-27: test feature/store-listing-copy-and-screenshots-for-the-autumn-release',
        detail: 'Commit 8f3a9c2e1b7d4f6012ab34cd56ef7890a1b2c3d4',
        action: { label: 'Open GOP-27', onSelect: () => {} },
      },
    ],
    context: 'The review window opens tomorrow at 09:00, and the signing key is due back the same morning.',
    followUps: [],
  },
};

/**
 * A ROOM'S CATCH UP: what was said, a point to a row, each citing the message
 * it came from with the host's own press (a reply opens its thread), under
 * what the room is about and anything that needs the reader.
 */
export const RoomCatchUp: Story = {
  args: {
    scope: '#engineering',
    asOf: 'Just now',
    about: 'The release branch is cut and two pull requests wait for review.',
    needs: [
      {
        key: 'review',
        text: 'Review the payments pull request',
        detail: 'Senior Backend Engineer asked you by name',
        action: { label: 'Open', onSelect: () => {} },
      },
    ],
    points: [
      { key: 'p1', text: 'Miles cut the release branch at 09:40.', source: { label: "Open Miles's message", onSelect: () => {} } },
      { key: 'p2', text: 'The payments pull request passed CI and waits for review.', source: { label: 'Open the thread', onSelect: () => {} } },
      { key: 'p3', text: 'The deploy window moved to Friday morning.', source: { label: 'Open the message', onSelect: () => {} } },
    ],
  },
};
