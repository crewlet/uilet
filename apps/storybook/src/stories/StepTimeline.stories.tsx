import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepTimeline, type StepTimelineStep } from '@crewlethq/ui';

const RUN: StepTimelineStep[] = [
  { key: '1', text: 'Checks done: 4 new, 0 closed', state: 'done', time: '07:01' },
  { key: '2', text: "Read the company's numbers", state: 'done', detail: 'snapshot', time: '07:01' },
  { key: '3', text: 'Read token spend, last 7 days', state: 'done', detail: 'tokens days=7', time: '07:02' },
  { key: '4', text: 'Read token spend, the 7 days before', state: 'done', detail: 'tokens days=7 previous=true', time: '07:02' },
  {
    key: '5',
    text: 'Could not read open work items',
    state: 'failed',
    detail: 'work_items limit=30 status_group=open',
    why: 'The read refused "open": a status group is not_started, active, done or closed.',
    time: '07:02',
  },
  { key: '6', text: 'Confirmed: releases wait on one seat', state: 'done', detail: 'A2 Do releases pile up behind one seat?', time: '07:03' },
  { key: '7', text: 'Testing: review waits on one person', state: 'running', time: '07:04' },
];

const meta: Meta<typeof StepTimeline> = {
  title: 'UI/StepTimeline',
  component: StepTimeline,
};

export default meta;
type Story = StoryObj<typeof StepTimeline>;

/** A run in flight: each step a plain line, the read behind it quiet, a failure's reason under it. */
export const Running: Story = {
  render: () => (
    <div style={{ maxWidth: '40rem' }}>
      <StepTimeline label="What the run did" steps={RUN} />
    </div>
  ),
};

/** A long run folds to its last steps under a count of the rest and their failures. */
export const Folded: Story = {
  render: () => {
    const steps: StepTimelineStep[] = Array.from({ length: 24 }, (_, i) => ({
      key: `r${i}`,
      text: `Read seat activity for seat ${i + 1}, last 7 days`,
      state: i === 3 || i === 11 ? 'failed' : 'done',
      detail: `seat_activity seat=seat-${i + 1} days=7`,
      ...(i === 3 || i === 11 ? { why: 'The seat was removed during the week.' } : {}),
      time: `07:${String(i + 10).padStart(2, '0')}`,
    }));
    return (
      <div style={{ maxWidth: '40rem' }}>
        <StepTimeline label="What the run did" steps={steps} />
      </div>
    );
  },
};
