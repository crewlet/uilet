import type { Meta, StoryObj } from '@storybook/react-vite';
import { StepList, type StepListStep } from '@crewlethq/ui';

/**
 * The steps a request took, each with its own state, its duration and what
 * it asked for, on the inset ground. One 16px state column; the mark and the
 * duration stay on the label's first line however far the detail wraps, and
 * a detail breaks only at a space or after `/`, `?` or `&`. Under reduced
 * motion the running ring stops and stays open.
 */
const meta: Meta<typeof StepList> = {
  title: 'UI/StepList',
  component: StepList,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof StepList>;

const read: StepListStep = {
  id: 'read',
  label: 'Read token spend by agent',
  state: 'done',
  duration: '0.4s',
  detail: 'get_spend · GET /tokens/breakdown?group=seat&window=week',
};
const ceiling: StepListStep = {
  id: 'ceiling',
  label: 'Read the weekly ceiling',
  state: 'running',
  detail: 'list_budgets · GET /budgets',
};

export const Working: Story = { args: { label: 'Steps', summary: '1 of 2 done', steps: [read, ceiling] } };

export const AllDone: Story = {
  args: { label: 'Steps', steps: [read, { ...ceiling, state: 'done', duration: '0.2s' }] },
};

export const FailedAtTwo: Story = {
  args: { label: 'Steps', steps: [read, { ...ceiling, state: 'failed', duration: '30s' }] },
};

export const Stopped: Story = {
  args: { label: 'Steps', steps: [read, { ...ceiling, state: 'stopped' }] },
};

export const Refused: Story = {
  args: {
    label: 'Steps',
    steps: [{ id: 'file', label: 'File a task', state: 'refused', detail: 'create_task · needs Tracker access' }],
  },
};

export const WaitingForApproval: Story = {
  args: {
    label: 'Steps',
    steps: [
      { id: 'search', label: 'Search for duplicates', state: 'done', duration: '0.3s', detail: 'search_work · GET /work/search?q=flaky+sign-in+test' },
      { id: 'prepare', label: 'Prepare the task', state: 'waiting', detail: 'create_task' },
    ],
  },
};

/** Long labels and a long request wrap under the label; the mark and duration stay on its first line. */
export const LongLabels: Story = {
  args: {
    label: 'Steps',
    steps: [
      {
        id: 'long',
        label: 'Read every open task in Core and Executives that has been blocked for more than two days',
        state: 'done',
        duration: '1.2s',
        detail: 'list_work · GET /work?blocked=true&unit=core,executives&sort=-spend_tokens&blocked_for=2d&limit=200',
      },
      ceiling,
    ],
  },
};
