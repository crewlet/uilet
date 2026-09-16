import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from '@crewlethq/ui';

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
