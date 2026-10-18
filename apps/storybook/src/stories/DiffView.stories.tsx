import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffSummary, DiffView, collapseDiff, diffLines, diffStat, firstChangedLines } from '@crewlethq/ui';

const meta: Meta<typeof DiffView> = {
  title: 'UI/DiffView',
  component: DiffView,
};

export default meta;
type Story = StoryObj<typeof DiffView>;

const BEFORE = [
  '# Onboarding',
  '',
  'Every new seat starts with read access to the knowledge base.',
  'The planner assigns a first task within one working day.',
  '',
  '## Accounts',
  '',
  'Ask an operator for a token.',
  'Tokens expire after thirty days.',
  '',
  '## Escalation',
  '',
  'Raise a blocker in the team channel.',
  'If nobody answers within an hour, page the on-call lead.',
].join('\n');

const AFTER = BEFORE.replace('Ask an operator for a token.', 'Sign in with your company account; no token is needed.')
  .replace('Tokens expire after thirty days.\n', '')
  .replace('within an hour', 'within thirty minutes');

/**
 * Two edits in one document: each section keeps three lines of context, and
 * the run of unchanged lines between them is a row that says how many lines
 * it stands for.
 */
export const Document: Story = {
  render: () => {
    const lines = diffLines(BEFORE, AFTER);
    const stat = diffStat(lines);
    return (
      <div style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
        <DiffSummary added={stat.added} removed={stat.removed} against="version 4" />
        <DiffView sections={collapseDiff(lines)} />
      </div>
    );
  },
};

/** A preview: the first changed lines only, and the count of the rest. */
export const Preview: Story = {
  render: () => {
    const preview = firstChangedLines(collapseDiff(diffLines(BEFORE, AFTER), 0), 2);
    return (
      <div style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
        <DiffView sections={preview.sections} aria-label="Preview of the save" />
        <p>{preview.more} more changed lines</p>
      </div>
    );
  },
};
