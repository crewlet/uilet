import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeepWorkCard, type DeepWorkMeasure, type DeepWorkState, type StepListStep } from '@crewlethq/ui';

/**
 * A long, bounded run an assistant switched to: its goal, where it stands,
 * how much of each limit it has used, its latest activity in the mono face,
 * and the steps it took nested under it, folded behind their count once there
 * are more than a few. The run is re-sent as it moves and the card is redrawn
 * in place. A note at its foot says why a run stopped or failed, or what a
 * waiting run waits on.
 */
const meta: Meta<typeof DeepWorkCard> = {
  title: 'UI/DeepWorkCard',
  component: DeepWorkCard,
  decorators: [(Story) => <div style={{ maxWidth: 388, paddingInline: 16 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof DeepWorkCard>;

const measures = (minutes: number, calls: number, budget: number): DeepWorkMeasure[] => [
  { key: 'time', label: 'Time', value: minutes, max: 20, hint: `${minutes}m of 20m`, valueText: `${minutes} minutes of 20` },
  { key: 'calls', label: 'Crewlet calls', value: calls, max: 60, hint: `${calls} of 60` },
  { key: 'budget', label: 'Budget used', value: budget, max: 100, hint: `${budget}%` },
];

const steps: StepListStep[] = [
  { id: 'a', label: 'Read token spend by agent', state: 'done', duration: '0.4s', detail: 'get_spend · GET /tokens/breakdown?group=seat' },
  { id: 'b', label: 'Read the weekly ceiling', state: 'done', duration: '0.2s', detail: 'list_budgets · GET /budgets' },
  { id: 'c', label: 'List last week\'s turns', state: 'done', duration: '1.1s', detail: 'list_turns · GET /turns?window=week' },
  { id: 'd', label: 'Read the costliest turn', state: 'running', detail: 'get_turn · GET /turns/t_91' },
];

const activity = ['Grouping 412 turns by agent', 'python3 summarize.py --window week', 'Writing spend-by-agent.csv'];

const NOTES: Partial<Record<DeepWorkState, string>> = {
  waiting: 'Waiting for your approval of the change below.',
  stopped: 'You stopped it. The files it wrote so far are kept.',
  failed: 'The run reached its time limit before it finished.',
};

const card = (state: DeepWorkState) => (
  <DeepWorkCard
    key={state}
    state={state}
    goal="Find which agents drove last week's spend and draft a ceiling for the costliest one"
    measures={state === 'starting' ? measures(0, 0, 0) : measures(state === 'failed' ? 20 : 7, 18, 41)}
    activity={state === 'starting' ? [] : activity}
    steps={state === 'starting' ? [] : steps.map((s) => (state === 'running' || s.state === 'done' ? s : { ...s, state: state === 'failed' ? 'failed' : state === 'waiting' ? 'waiting' : 'stopped' }))}
    note={NOTES[state]}
  />
);

/** A run at work: four steps, so they fold behind their count. */
export const Running: Story = { render: () => card('running') };

/** Every state, each with the note it carries. */
export const EveryState: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['starting', 'running', 'waiting', 'finished', 'stopped', 'failed'] as const).map(card)}
    </div>
  ),
};

/** A few steps are drawn open. */
export const FewSteps: Story = {
  render: () => <DeepWorkCard state="finished" goal="Summarize this week's incidents" measures={measures(3, 4, 9)} steps={steps.slice(0, 2)} />,
};
