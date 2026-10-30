import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChangeList, ChangeListItems, ColorChip, Inline, type ChangeListRow } from '@crewlethq/ui';

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

/**
 * Values that are more than a line: a list drawn as a list, and text that
 * keeps its line breaks, each across the row under its label with its tint as
 * a block. A colour stays inline, its chip beside the hex the reader hears.
 */
const blocks: ChangeListRow[] = [
  { kind: 'fact', label: 'Seat', value: 'QA Engineer' },
  {
    kind: 'added',
    label: 'Responsibilities',
    block: true,
    isNew: true,
    to: (
      <ChangeListItems
        items={[
          'Review the tests of every pull request before merge',
          'Approve them, or send them back with specific feedback',
          'Raise missing acceptance criteria on the work item',
        ]}
      />
    ),
  },
  {
    kind: 'changed',
    label: 'Write like this',
    block: true,
    from: <ChangeListItems items={['Short sentences']} />,
    to: <ChangeListItems items={['Short sentences', 'Name the person, never the role']} />,
  },
  { kind: 'added', label: 'Summary', block: true, to: 'Settling up takes seconds.\nThe math is exact to the cent.' },
  {
    kind: 'changed',
    label: 'Dark ground colour',
    from: (
      <Inline as="span" gap={1} align="center">
        <ColorChip value="#090019" size="sm" />
        #090019
      </Inline>
    ),
    to: (
      <Inline as="span" gap={1} align="center">
        <ColorChip value="#14102b" size="sm" />
        #14102b
      </Inline>
    ),
  },
];

export const BlockValues: Story = { args: { heading: 'What will change', rows: blocks } };

/*
 * INLINE: each row one line, its values as chips, for a short change read in
 * passing (a level moved in a review). A pair still says "Changed from X to
 * Y", and an added or removed value says so before it.
 */
const levels: ChangeListRow[] = [
  { kind: 'changed', label: 'Deployments', from: 'Read-only', to: 'Read and write' },
  { kind: 'added', label: 'Checks', to: 'Read-only' },
  { kind: 'removed', label: 'Actions', from: 'Read-only' },
];

export const InlineChips: Story = {
  name: 'Inline, values as chips',
  args: { layout: 'inline', rows: levels },
};
