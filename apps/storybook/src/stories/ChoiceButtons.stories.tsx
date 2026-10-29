import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ChoiceButtons, ColorChip } from '@crewlethq/ui';

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

/**
 * An answer read back: the chosen option stands on the selected fill inside an
 * edge in the accent's ink, with a check mark, so the choice is never colour
 * alone. The recommended option keeps its mark whether or not it was chosen;
 * against the recommendation it is drawn as a plain option, so the chosen one
 * is the most prominent. The same cues in the small size, and, last, the live
 * question nobody has answered, where the recommended option keeps the accent.
 */
export const RecommendedChosen: Story = {
  render: () => {
    const options = [
      { value: 'greedy', label: 'Greedy only', detail: 'Simple and fast.' },
      { value: 'exact', label: 'Exact search', detail: 'Fewest transfers.' },
    ];
    return (
      <div style={{ display: 'grid', gap: 24, maxWidth: 520 }}>
        <ChoiceButtons
          label="Answered, as recommended"
          recommended="exact"
          chosen="exact"
          disabledReason="This question is answered."
          onChoose={() => {}}
          options={options}
        />
        <ChoiceButtons
          label="Answered, against the recommendation"
          recommended="exact"
          chosen="greedy"
          disabledReason="This question is answered."
          onChoose={() => {}}
          options={options}
        />
        <ChoiceButtons
          label="Answered, small"
          size="sm"
          recommended="exact"
          chosen="greedy"
          disabledReason="This question is answered."
          onChoose={() => {}}
          options={options}
        />
        <ChoiceButtons label="Not answered yet" recommended="exact" onChoose={() => {}} options={options} />
      </div>
    );
  },
};

/**
 * SMALL, WITH A PICTURE AND A CHOICE: the same option, compact, in a row that
 * wraps, as the brand setup offers shades for a low-contrast colour. Each
 * leads with a `ColorChip`, and `chosen` keeps the applied one marked (the
 * selected fill, an edge in the accent's ink and a check mark) with every
 * option a toggle button saying whether it is the one applied. Hover, press
 * and focus are the Inbox's own.
 */
export const SmallSuggestions: Story = {
  render: function Render() {
    const [chosen, setChosen] = useState<string | null>(null);
    return (
      <div style={{ maxWidth: 520 }}>
        <ChoiceButtons
          label="Suggestions for Primary"
          size="sm"
          chosen={chosen}
          onChoose={setChosen}
          options={[
            { value: '#00a0a0', label: '#00a0a0', detail: '3:1, meets the minimum', media: <ColorChip value="#00a0a0" /> },
            { value: '#007f7f', label: '#007f7f', detail: '4.5:1, best for text links', media: <ColorChip value="#007f7f" /> },
            { value: 'dark', label: 'Use on dark grounds', detail: 'Keep #00baba, use it on dark grounds' },
          ]}
        />
      </div>
    );
  },
};
