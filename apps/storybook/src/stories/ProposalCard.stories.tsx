import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CodeBlock, ProposalCard, type ChangeListRow, type ProposalCardProps, type ProposalState } from '@crewlethq/ui';
import { themeScope } from '../themeScope';

/**
 * A change prepared for the person to approve, and what became of it. The
 * head is the action and the Tag its state; the body is a summary, the change
 * as before and after pairs and a consequence; the foot is the decision or a
 * strip that says what happened. Nothing takes focus when it arrives, and
 * while the approved change is carried out the primary keeps its label.
 */
const meta: Meta<typeof ProposalCard> = {
  title: 'UI/ProposalCard',
  component: ProposalCard,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ProposalCard>;

const filter: Omit<ProposalCardProps, 'state'> = {
  title: 'Filter this list',
  subtitle: 'This list only',
  scope: 'page',
  summary: 'Show only blocked tasks in the Core team, with the ones that used the most tokens first.',
  changes: [
    { kind: 'changed', label: 'Status', from: 'Any open status', to: 'Blocked' },
    { kind: 'changed', label: 'Unit', from: 'Every unit', to: 'Core' },
    { kind: 'changed', label: 'Sort', from: 'Manual order', to: 'Most tokens' },
  ],
  note: 'Replaces the filters and the sort on this list, and leaves your saved views as they are. Each filter can be removed from its chip.',
  approveLabel: 'Apply to this list',
  receipt: 'Applied to Work › Tasks · 3 of 8 tasks shown',
  onApprove: () => {},
  onDecline: () => {},
  onPrepareAgain: () => {},
};

const create: Omit<ProposalCardProps, 'state'> = {
  title: 'Create task',
  subtitle: 'Saved for the company',
  kind: 'create',
  summary: 'File a new task in Core and assign it to Agent SWE.',
  changes: [
    { kind: 'added', label: 'Title', to: 'Fix the flaky sign-in test', note: 'No open task matches this title' },
    { kind: 'added', label: 'Project', to: 'Core' },
    { kind: 'added', label: 'Assignee', to: 'Agent SWE' },
    { kind: 'added', label: 'Priority', to: 'High' },
    { kind: 'added', label: 'Due', to: 'Fri 31 Oct' },
  ],
  note: 'Everyone with Tracker access can see it. Agent SWE will pick it up on its next turn.',
  approveLabel: 'Create task',
  receipt: 'Created ENG-156 · assigned to Agent SWE',
  onApprove: () => {},
  onDecline: () => {},
};

const share: Omit<ProposalCardProps, 'state'> = {
  title: 'Share artifact',
  subtitle: 'Saved for the company',
  summary: 'Share the Q4 pricing brief with everyone at Nimbus.',
  changes: [
    { kind: 'fact', label: 'Artifact', value: 'Q4 pricing brief', note: 'A doc by Agent PM' },
    { kind: 'changed', label: 'Readers', from: 'Product Management', to: 'Everyone at Nimbus' },
  ],
  note: 'Everyone in the company will be able to open and comment on it.',
  approveLabel: 'Share artifact',
  failure: 'You no longer have access to share this artifact.',
  onApprove: () => {},
  onDecline: () => {},
};

const editRows: ChangeListRow[] = [
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
      { op: '=', text: ' and post an update in the incidents channel ' },
      { op: '+', text: 'every 15 minutes' },
      { op: '=', text: '.' },
    ],
    whole: [
      { kind: 'changed', path: 'Escalation › wait', from: 'one hour', to: '30 minutes' },
      { kind: 'changed', path: 'Escalation › page', from: 'the founder', to: 'Agent CTO' },
      { kind: 'added', path: 'Escalation › updates', to: 'every 15 minutes' },
      { kind: 'removed', path: 'labels', from: 'draft' },
      { kind: 'added', path: 'reviewer', to: 'Agent CTO' },
    ],
  },
  { kind: 'removed', label: 'Labels', from: 'draft' },
  { kind: 'added', label: 'Reviewer', to: 'Agent CTO', isNew: true },
];

const edit: Omit<ProposalCardProps, 'state'> = {
  title: 'Edit page',
  subtitle: 'Saved for the company',
  summary: 'Save a new version of the on-call runbook that escalates sooner, to Agent CTO.',
  changes: editRows,
  note: 'Everyone who can open Engineering › Runbooks sees the new version. It is saved only if the page is still at version 14 when you approve.',
  approveLabel: 'Save new version',
  onApprove: () => {},
  onDecline: () => {},
};

const removeSeat: Omit<ProposalCardProps, 'state'> = {
  title: 'Remove seat QA Engineer',
  subtitle: 'Saved for the company',
  tone: 'danger',
  summary: 'Remove the QA Engineer seat from the Core unit. Its open tasks go back to the unit lead.',
  changes: [
    { kind: 'fact', label: 'Unit', value: 'Core' },
    { kind: 'removed', label: 'Seat', from: 'QA Engineer' },
  ],
  note: 'You can bring the seat back from the configuration history.',
  approveLabel: 'Remove seat',
  receipt: 'Removed the QA Engineer seat from Core',
  onApprove: () => {},
  onDecline: () => {},
};

const removeConfirmation = { label: 'I understand the QA Engineer seat stops working in Core' };

const removeDetails = (
  <CodeBlock language="http" code={'PUT /config/units/core\n\n{ "roles": ["lead", "swe", "pm"] }'} />
);

export const PageLocalPending: Story = { args: { ...filter, state: 'pending' } };
export const ServerPending: Story = { args: { ...create, state: 'pending' } };
export const StepUp: Story = { args: { ...share, state: 'stepup' } };
export const Applying: Story = { args: { ...filter, state: 'applying' } };
export const Saving: Story = { args: { ...create, state: 'applying' } };
export const Applied: Story = { args: { ...filter, state: 'applied' } };
export const Saved: Story = { args: { ...create, state: 'applied' } };
export const Declined: Story = { args: { ...filter, state: 'declined' } };
export const Expired: Story = {
  args: { ...filter, state: 'expired', notice: 'It was prepared 12 min ago and expired before it was applied. Nothing changed.' },
};
export const Stale: Story = {
  args: { ...filter, state: 'stale', notice: 'The list changed after this was prepared, so it was not applied. Nothing changed.' },
};
export const NotApplied: Story = { args: { ...share, state: 'failed' } };

/** NOT APPLIED, WITH THE NEXT STEP: the route's hint on its own quieter line after "Nothing changed.". */
export const NotAppliedWithHint: Story = {
  args: { ...share, state: 'failed', failureHint: 'Ask an owner of the artifact to share it, or to give you edit access.' },
};

/**
 * NOT CONFIRMED: the approved change was sent but no answer came back, so it
 * may have landed. The Tag reads "Not confirmed" and the strip never adds
 * "Nothing changed.". Try again resends it under the same operation key.
 */
export const NotConfirmed: Story = {
  args: { ...share, state: 'failed', failureOutcome: 'unknown', failure: undefined, onRetry: () => {} },
};

/**
 * DECISION REFUSED: the approval came back refused (a fresh sign-in is
 * needed), but the proposal still stands. The engine's sentence and its hint
 * sit above the decision, announced politely from a live region the foot
 * keeps, and the card can be decided again.
 */
export const DecisionRefused: Story = {
  args: {
    ...share,
    state: 'stepup',
    decisionRefusal: {
      sentence: 'This approval needs a fresh sign-in.',
      hint: 'Confirm it’s you, then the change is applied.',
    },
  },
};

/**
 * APPROVAL BLOCKED: the screen refuses the prepared change, so the primary is
 * held soft disabled with the reason, shown above the decision and said as its
 * description. Decline stays available.
 */
export const ApprovalBlocked: Story = {
  args: { ...filter, state: 'pending', approveBlocked: 'This list cannot filter by Unit, so these filters cannot be applied here.' },
};

/** The same hold at a step-up: Confirm it's you is held too. */
export const ApprovalBlockedAtStepUp: Story = {
  args: { ...share, state: 'stepup', approveBlocked: 'Sharing with the whole company is turned off for this artifact.' },
};
export const LongTextPending: Story = { args: { ...edit, state: 'pending' } };

/** On a 390px phone sheet: the subtitle under the title, pairs wrapping, the decision as two blocks. */
export const Narrow: Story = {
  args: { ...edit, state: 'pending' },
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};

function Walkthrough({ receipt = true }: { receipt?: boolean }) {
  const [state, setState] = useState<ProposalState>('pending');
  return (
    <ProposalCard
      {...create}
      {...(receipt ? null : { receipt: undefined })}
      state={state}
      onApprove={() => {
        setState('applying');
        setTimeout(() => setState('applied'), 1500);
      }}
      onDecline={() => setState('declined')}
    />
  );
}

/**
 * Approve or decline to walk the card through its states. From the keyboard
 * (Tab to a button, then Enter), focus stays in the card when it settles: it
 * lands on the strip that says what happened, with the focus ring.
 */
export const Interactive: Story = { render: () => <Walkthrough /> };

/** The same walk, with no receipt: focus lands on the card itself when it is saved. */
export const InteractiveWithoutReceipt: Story = { render: () => <Walkthrough receipt={false} /> };

/**
 * DANGER: a change that removes something. The danger rail runs down the
 * leading edge, the title is in the danger ink and the primary is the danger
 * button; the Tag still says the state.
 */
export const Danger: Story = { args: { ...removeSeat, state: 'pending' } };

/** The same card once declined: a settled card steps back, with no danger tone. */
export const DangerDeclined: Story = { args: { ...removeSeat, state: 'declined' } };

/**
 * WITH A CONFIRMATION: the primary is held, described by why, until the box
 * above the decision is ticked. Tick it to arm Remove seat.
 */
export const WithConfirmation: Story = {
  args: { ...removeSeat, state: 'pending', confirmation: removeConfirmation },
};

/** WITH DETAILS: the precise request, folded under "Technical details" and collapsed by default. */
export const WithDetails: Story = { args: { ...create, state: 'pending', details: removeDetails } };

/** EVERYTHING TOGETHER: the danger tone, a confirmation and the technical details. */
export const DangerCombined: Story = {
  args: { ...removeSeat, state: 'pending', confirmation: removeConfirmation, details: removeDetails },
};

/**
 * THE COMBINED CARD IN BOTH PALETTES, light over dark at the card's own
 * width, each panel painted by `themeScope` (the theme layer paints on the
 * root alone, so a data-theme on a panel would paint nothing).
 */
export const DangerCombinedBothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div
          key={theme}
          style={{
            ...themeScope(theme),
            background: 'var(--color-surface-background)',
            color: 'var(--color-text-primary)',
            padding: 'var(--spacing-5)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <ProposalCard
            {...removeSeat}
            state="pending"
            confirmation={removeConfirmation}
            details={removeDetails}
          />
        </div>
      ))}
    </div>
  ),
};
