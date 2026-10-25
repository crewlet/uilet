import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChangeList, type ChangeListRow } from '@crewlethq/ui';

/**
 * What a change will do, field by field, as a before and after (decision
 * D10): the old value struck through, an arrow and the new value on the added
 * tint; added and removed values on their tints; long text as a word diff
 * with "Show the whole change" opening the path-by-path DiffList. DiffList's
 * tones and grammar, on PropertyList's grid.
 */
const meta: Meta<typeof ChangeList> = {
  title: 'UI/ChangeList',
  component: ChangeList,
  decorators: [(Story) => <div style={{ maxWidth: 356 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ChangeList>;

const changed: ChangeListRow[] = [
  { kind: 'changed', label: 'Status', from: 'Any open status', to: 'Blocked' },
  { kind: 'changed', label: 'Unit', from: 'Every unit', to: 'Core' },
  { kind: 'changed', label: 'Sort', from: 'Manual order', to: 'Most tokens' },
];

export const ChangedFields: Story = { args: { heading: 'What will change', rows: changed } };

export const Create: Story = {
  args: {
    heading: 'What will be created',
    rows: [
      { kind: 'added', label: 'Title', to: 'Fix the flaky sign-in test', note: 'No open task matches this title' },
      { kind: 'added', label: 'Project', to: 'Core' },
      { kind: 'added', label: 'Assignee', to: 'Agent SWE' },
      { kind: 'added', label: 'Priority', to: 'High' },
      { kind: 'added', label: 'Due', to: 'Fri 31 Oct', note: 'End of day, Berlin time' },
    ],
  },
};

export const MixedWithNewAndRemoved: Story = {
  args: {
    heading: 'What will change',
    rows: [
      { kind: 'fact', label: 'Artifact', value: 'Q4 pricing brief', note: 'A doc by Agent PM' },
      { kind: 'changed', label: 'Readers', from: 'Product Management', to: 'Everyone at Nimbus' },
      { kind: 'removed', label: 'Labels', from: 'draft' },
      { kind: 'added', label: 'Reviewer', to: 'Agent CTO', isNew: true },
    ],
  },
};

const longText: ChangeListRow[] = [
  { kind: 'fact', label: 'Page', value: 'On-call runbook', note: 'Version 14, read 2 min ago' },
  {
    kind: 'text',
    label: 'Escalation',
    words: [
      { op: '=', text: 'If the incident is not resolved within ' },
      { op: '-', text: 'one hour' },
      { op: '+', text: '30 minutes' },
      { op: '=', text: ', page ' },
      { op: '-', text: 'the founder' },
      { op: '+', text: 'Agent CTO' },
      {
        op: '=',
        text: ' and post an update in the incidents channel, keeping the status page in step with what the team knows, and ',
      },
      { op: '+', text: 'every 15 minutes' },
      { op: '=', text: ' until it is resolved.' },
    ],
    whole: [
      { kind: 'changed', path: 'Escalation › wait', from: 'one hour', to: '30 minutes' },
      { kind: 'changed', path: 'Escalation › page', from: 'the founder', to: 'Agent CTO' },
      { kind: 'added', path: 'Escalation › updates', to: 'every 15 minutes' },
    ],
  },
  { kind: 'removed', label: 'Labels', from: 'draft' },
  { kind: 'added', label: 'Reviewer', to: 'Agent CTO', isNew: true },
];

/** A page edit: the word diff, its long unchanged run shortened, and the whole change behind a disclosure. */
export const LongTextWithWholeChange: Story = { args: { heading: 'What will change', rows: longText } };

/** On a 390px phone sheet: pairs drop the arrow and new value under the old one, and the DiffList stacks. */
export const Narrow: Story = {
  args: { heading: 'What will change', rows: [...changed, ...longText] },
  decorators: [(Story) => <div style={{ maxWidth: 300 }}>{Story()}</div>],
};

/** Settled: the values step back to the secondary ink, and every pair stays. */
export const Settled: Story = { args: { heading: 'What changed', rows: changed, settled: true } };
