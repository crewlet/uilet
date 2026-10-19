import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MergeConflicts, type MergeChoice } from '@crewlethq/ui';

const meta: Meta<typeof MergeConflicts> = {
  title: 'UI/MergeConflicts',
  component: MergeConflicts,
};

export default meta;
type Story = StoryObj<typeof MergeConflicts>;

const CLASHES = [
  { theirs: ['Page the escalation lead within five minutes.'], mine: ['Page the escalation lead within ten minutes.'] },
  { theirs: [], mine: ['If nobody answers, call the founder.'] },
];

/**
 * Two people edited the same lines of one text: each clash shows their lines
 * beside the draft's, and Apply waits until every place has an answer.
 */
export const TwoPlaces: Story = {
  render: function Render() {
    const [applied, setApplied] = useState<MergeChoice[] | null>(null);
    return applied ? (
      <p>Applied: {applied.join(', ')}</p>
    ) : (
      <MergeConflicts clashes={CLASHES} theirs="version 4" onApply={setApplied} onCancel={() => setApplied([])} />
    );
  },
};
