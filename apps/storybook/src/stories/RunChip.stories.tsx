import type { Meta, StoryObj } from '@storybook/react-vite';
import { RunChip, StepList, type RunState, type StepListStep } from '@crewlethq/ui';

/**
 * A request's state, as the row a reader opens to see its steps: on the
 * disclosure trigger, its chevron hanging into the gutter, the state's mark in
 * the same 16px column as its steps', and the state's tone in the title's ink.
 * It is open while the request works and closes itself when it settles. With
 * nothing to open yet it is words, with the chevron's slot kept so the mark
 * does not move when the first step arrives.
 */
const meta: Meta<typeof RunChip> = {
  title: 'UI/RunChip',
  component: RunChip,
  decorators: [(Story) => <div style={{ maxWidth: 388, paddingInline: 16 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof RunChip>;

const done: StepListStep = { id: 'read', label: 'Read token spend by agent', state: 'done', duration: '0.4s', detail: 'get_spend · GET /tokens/breakdown?group=seat&window=week' };
const second = (state: StepListStep['state'], duration?: string): StepListStep => ({
  id: 'ceiling',
  label: 'Read the weekly ceiling',
  state,
  duration,
  detail: 'list_budgets · GET /budgets',
});

const STATES: { state: RunState; title: string; meta?: string; steps?: StepListStep[] }[] = [
  { state: 'thinking', title: 'Thinking' },
  { state: 'working', title: 'Working', meta: '3s', steps: [done, second('running')] },
  { state: 'done', title: 'Done in 5s', meta: '2 steps', steps: [done, second('done', '0.2s')] },
  { state: 'waiting', title: 'Waiting for your approval', meta: '2 steps', steps: [done, second('waiting')] },
  { state: 'applying', title: 'Applying', meta: '3 steps', steps: [done, second('done', '0.2s'), { id: 'apply', label: 'Apply to the list', state: 'running' }] },
  { state: 'stopped', title: 'Stopped after 3s', meta: '1 of 2 steps', steps: [done, second('stopped')] },
  { state: 'failed', title: 'Failed at step 1', steps: [{ ...done, state: 'failed', duration: '30s' }] },
  { state: 'refused', title: 'Not permitted', meta: '1 step', steps: [{ id: 'file', label: 'File a task', state: 'refused', detail: 'create_task' }] },
];

function chip({ state, title, meta: fact, steps }: (typeof STATES)[number]) {
  return (
    <RunChip key={state} state={state} title={title} meta={fact}>
      {steps ? <StepList label="Steps" summary={state === 'working' ? '1 of 2 done' : undefined} steps={steps} /> : undefined}
    </RunChip>
  );
}

/** Every state, each at its default: open while under way, closed once settled. */
export const EveryState: Story = {
  render: () => <div style={{ display: 'grid', gap: 12 }}>{STATES.map(chip)}</div>,
};

export const Thinking: Story = { render: () => chip(STATES[0]!) };
export const Working: Story = { render: () => chip(STATES[1]!) };
export const Done: Story = { render: () => chip(STATES[2]!) };
export const Waiting: Story = { render: () => chip(STATES[3]!) };
export const Stopped: Story = { render: () => chip(STATES[5]!) };
export const Failed: Story = { render: () => chip(STATES[6]!) };
export const Refused: Story = { render: () => chip(STATES[7]!) };

/**
 * Reduced motion: switch the motion preference in your system settings. The
 * ring stops and stays open, and the words still say Working.
 */
export const ReducedMotion: Story = { render: () => chip(STATES[1]!) };
