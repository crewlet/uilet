import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChoiceButtons } from '@crewlethq/ui';

/**
 * One answer sent with one press. The recommended option comes first, filled
 * with the accent and marked; the rest are the secondary recipe. While an
 * answer is on its way every option holds still.
 */
const meta: Meta<typeof ChoiceButtons> = {
  title: 'UI/ChoiceButtons',
  component: ChoiceButtons,
};

export default meta;
type Story = StoryObj<typeof ChoiceButtons>;

const OPTIONS = [
  { value: 'greedy', label: 'Greedy matching only', detail: 'Simple and fast; may need an extra transfer.' },
  { value: 'exact', label: 'Exact search', detail: 'Fewest transfers; slower past forty people.' },
  { value: 'later', label: 'Decide after the beta' },
];

function Answer({ reason }: { reason?: string }) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <div style={{ maxWidth: 560 }}>
      <ChoiceButtons
        label="Answers"
        options={OPTIONS}
        recommended="exact"
        pending={pending}
        disabledReason={reason}
        onChoose={(value) => {
          setPending(value);
          window.setTimeout(() => setPending(null), 1500);
        }}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <Answer />,
};

/** Nothing can be chosen now: every option keeps its focus and reads the reason. */
export const Unavailable: Story = {
  render: () => <Answer reason="Only the approver on FAIR-3 can answer." />,
};

const STARTERS = [
  { value: 'poll', label: 'Poll', detail: 'One vote per person, results live' },
  { value: 'tracker', label: 'Tracker', detail: 'A shared list with owners and status' },
  { value: 'form', label: 'Form', detail: 'Answers collected in one place' },
  { value: 'retro', label: 'Retro board', detail: 'Went well, to improve, actions' },
  { value: 'calculator', label: 'Calculator', detail: 'Inputs and a live result' },
  { value: 'explainer', label: 'Explainer', detail: 'One idea, step by step' },
];

/**
 * Laid out as tiles by the host's own grid. Every label in a row starts on
 * one line, whether its detail takes one line or two.
 */
export const AsTiles: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ChoiceButtons
        label="Start from"
        options={STARTERS}
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        onChoose={() => {}}
      />
    </div>
  ),
};
