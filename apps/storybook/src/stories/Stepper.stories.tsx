import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Stepper, type StepperStep } from '@crewlethq/ui';

/** A turn's four phases, as the Agent screen's current-turn card draws them. */
const TURN: StepperStep[] = [
  { id: 'context', label: 'Context 0.8s' },
  { id: 'execute', label: 'Execute · round 7 of 25' },
  { id: 'review', label: 'Review' },
  { id: 'deliver', label: 'Deliver' },
];

const meta: Meta<typeof Stepper> = {
  title: 'UI/Stepper',
  component: Stepper,
  args: {
    label: 'Turn progress',
    steps: TURN,
    current: 'execute',
    tone: 'info',
    pulse: true,
  },
  argTypes: {
    current: { control: 'inline-radio', options: [...TURN.map((step) => step.id), null] },
    tone: { control: 'inline-radio', options: ['info', 'warning', 'danger', 'success', 'brand'] },
    pulse: { control: 'boolean' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  /* On a card, which is where the design draws every step row. */
  render: (args) => (
    <Card>
      <Card.Body>
        <Stepper {...args} />
      </Card.Body>
    </Card>
  ),
};

export default meta;
type Story = StoryObj<typeof Stepper>;

/**
 * A TURN UNDER WAY, the approved design's step row: the finished phase in the
 * secondary ink behind a check, the current one in the working tint with its
 * dot breathing, and the phases still to come in the tertiary ink. An ordered
 * list to a screen reader, with `aria-current="step"` on the phase under way
 * and "Done" said before every finished one.
 */
export const Basic: Story = {};

/**
 * A FINISHED RUN has every step done and none current: `current={null}`. The
 * task's timeline draws a turn's history this way, "Execute ✓ — Review ✓".
 */
export const Finished: Story = {
  args: { label: 'Turn 1', steps: TURN.slice(1, 3), current: null },
};

/**
 * THE CURRENT STEP'S TONE says what state it is in: work under way (info, the
 * default), parked on a person (warning), stopped (danger), finished at this
 * step (success), or where the reader is (brand). The tone is drawn and never
 * spoken, so a step whose state is not ordinary work says so in its own words.
 */
export const Tones: Story = {
  render: () => (
    <Card>
      <Card.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <Stepper label="Working" steps={TURN} current="execute" pulse />
          <Stepper
            label="Parked"
            steps={[TURN[0]!, { id: 'execute', label: 'Execute · asked the founder' }, TURN[2]!, TURN[3]!]}
            current="execute"
            tone="warning"
          />
          <Stepper
            label="Stopped"
            steps={[TURN[0]!, TURN[1]!, { id: 'review', label: 'Review · sent back' }, TURN[3]!]}
            current="review"
            tone="danger"
          />
          <Stepper label="Delivered" steps={TURN} current="deliver" tone="success" />
          <Stepper
            label="Setup"
            steps={[
              { id: 'company', label: 'Company' },
              { id: 'seats', label: 'Seats' },
              { id: 'keys', label: 'Model keys' },
            ]}
            current="seats"
            tone="brand"
          />
        </div>
      </Card.Body>
    </Card>
  ),
};

/**
 * AT THE START, the first step is the current one and the rest are to come.
 */
export const Starting: Story = {
  args: { current: 'context', pulse: false },
};

/** The brand setup wizard's six steps, part way through. */
const SETUP: StepperStep[] = [
  { id: 'identity', label: 'Identity', description: 'Name and tagline' },
  { id: 'logos', label: 'Logos', description: 'Light, dark and mark', status: 'attention' },
  { id: 'colours', label: 'Colours', description: 'Primary, text and grounds' },
  { id: 'typography', label: 'Typography', description: 'Heading and body', status: 'optional' },
  { id: 'voice', label: 'Voice', description: 'How agents write', status: 'optional' },
  { id: 'review', label: 'Review', description: 'Check and adopt' },
];

/**
 * STATUSES. A step's position says done or still to come; a `status` says
 * the rest. An optional step reads "Optional", and one with something to look
 * at again (a low-contrast pair, a refused file) carries the warning glyph and
 * says "Needs attention". In a row the words are said rather than shown, since
 * a pill has no room for them.
 */
export const Statuses: Story = {
  args: { label: 'Setup progress', steps: SETUP, current: 'colours', tone: 'brand', pulse: false },
};

/**
 * THE COLUMN, a setup wizard's rail: a mark per step on a hairline that joins
 * them, the label beside it, and the description and the status words under
 * it. A step still to come shows its number.
 */
export const Vertical: Story = {
  args: { label: 'Setup steps', steps: SETUP, current: 'colours', tone: 'brand', pulse: false, orientation: 'vertical' },
  render: (args) => (
    <Card style={{ maxWidth: 260 }}>
      <Card.Body>
        <Stepper {...args} />
      </Card.Body>
    </Card>
  ),
};

/**
 * A RAIL OF BUTTONS. With `onSelect`, every visited step is a button: the
 * current one, every step before it, and every step up to `reached`, so a
 * person who walked back to Logos can go forward to Voice again. A step not
 * reached yet stays words, reachable only by Continue. The current step's
 * button carries `aria-current="step"`.
 */
export const Selectable: Story = {
  render: function Render() {
    const [current, setCurrent] = useState('colours');
    return (
      <Card style={{ maxWidth: 260 }}>
        <Card.Body>
          <nav aria-label="Setup steps">
            <Stepper
              label="Setup steps"
              steps={SETUP}
              current={current}
              reached="voice"
              tone="brand"
              orientation="vertical"
              onSelect={setCurrent}
            />
          </nav>
        </Card.Body>
      </Card>
    );
  },
};

/**
 * THE SAME STEPS AS A ROW OF BUTTONS, as the wizard draws them on a phone,
 * where the rail has no room beside the content.
 */
export const SelectableRow: Story = {
  render: function Render() {
    const [current, setCurrent] = useState('colours');
    return (
      <Card style={{ maxWidth: 390 }}>
        <Card.Body>
          <Stepper label="Setup steps" steps={SETUP} current={current} reached="voice" tone="brand" onSelect={setCurrent} />
        </Card.Body>
      </Card>
    );
  },
};
