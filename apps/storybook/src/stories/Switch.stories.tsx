import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
};

export default meta;
type Story = StoryObj<typeof Switch>;

const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 480,
};

/**
 * A switch is the change, applied as it moves. A checkbox is an answer to a
 * question, read when the form is saved.
 */
export const Basic: Story = {
  render: () => {
    function Demo() {
      const [deliver, setDeliver] = useState(true);
      const [catchUp, setCatchUp] = useState(false);
      return (
        <div style={column}>
          <Switch
            label="Deliver webhooks"
            description="Pauses delivery without removing the app."
            checked={deliver}
            onCheckedChange={setDeliver}
          />
          <Switch
            label="Catch up on missed ticks"
            checked={catchUp}
            onCheckedChange={setCatchUp}
          />
          <Switch label="Unavailable here" checked={false} disabled onChange={() => {}} />
        </div>
      );
    }
    return <Demo />;
  },
};

export const Framed: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(false);
      return (
        <div style={column}>
          <Switch
            framed
            label="Run this schedule"
            description="The seat wakes at every tick in its window."
            checked={on}
            onCheckedChange={setOn}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * A switch that cannot move says why: it stays a tab stop, its reason is read
 * after its name, and a Tooltip shows the sentence to a pointer. With
 * `labelHidden` the label is still its name, for a row that already says what
 * the switch sets.
 */
export const WithAReason: Story = {
  render: () => (
    <div style={column}>
      <Switch
        label="Deliver webhooks"
        checked
        disabledReason="Only an administrator can pause deliveries."
      />
      <Switch label="Designer gets every message" labelHidden checked={false} onChange={() => {}} />
    </div>
  ),
};

/**
 * The small switch, for a compact bar such as a canvas corner: a 28 by 16
 * track in the bar's 12px type. Tab onto a switch that is on to see its focus
 * ring stand off the filled track.
 */
export const Small: Story = {
  render: function SmallStory() {
    const [on, setOn] = useState(true);
    const [off, setOff] = useState(false);
    return (
      <BothThemes>
        <div style={{ display: 'flex', gap: 'var(--spacing-5)', alignItems: 'center' }}>
          <Switch size="sm" label="Reporting view" checked={on} onCheckedChange={setOn} />
          <Switch size="sm" label="Show people" checked={off} onCheckedChange={setOff} />
          <Switch label="Medium, for comparison" checked={on} onCheckedChange={setOn} />
        </div>
      </BothThemes>
    );
  },
};
