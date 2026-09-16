import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from '@crewlethq/ui';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 480,
};

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [on, setOn] = useState(true);
      return (
        <div style={column}>
          <Checkbox label="Enabled" checked={on} onCheckedChange={setOn} />
          <Checkbox
            label="Clear lead"
            description="The unit inherits its parent's lead until somebody sets one."
            checked={false}
            onChange={() => {}}
          />
          <Checkbox label="Unavailable" checked={false} disabled onChange={() => {}} />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * The decision a dialog gives its own row, and the one case where the box
 * itself carries a tone: ticking it destroys something.
 */
export const FramedAndDestructive: Story = {
  render: () => {
    function Demo() {
      const [remove, setRemove] = useState(false);
      return (
        <div style={column}>
          <Checkbox
            framed
            tone="danger"
            label="Also remove the accounts Crewlet created"
            description="Each agent's account at the vendor is deleted. This cannot be undone."
            checked={remove}
            onCheckedChange={setRemove}
          />
          <Checkbox
            framed
            label="Send a summary when this finishes"
            description="One message in the company's default channel."
            checked
            onChange={() => {}}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/** Some of what the box stands for is ticked, which is neither on nor off. */
export const Indeterminate: Story = {
  render: () => (
    <div style={column}>
      <Checkbox label="Every seat" indeterminate checked={false} onChange={() => {}} />
      <Checkbox label="Software Engineer" checked onChange={() => {}} />
      <Checkbox label="Site Reliability" checked={false} onChange={() => {}} />
    </div>
  ),
};
