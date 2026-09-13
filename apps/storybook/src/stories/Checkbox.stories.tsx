import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Checkbox } from '@crewlethq/ui';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Basic: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(false);

      return (
        <Checkbox
          label="Email me when an agent needs attention"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
      );
    }

    return <Demo />;
  },
};

/* A choice worth explaining before it is made. */
export const WithDescription: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(false);

      return (
        <Checkbox
          label="Keep the workspace in sync"
          description="Agents are added to new channels as they are created."
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
      );
    }

    return <Demo />;
  },
};

/*
 * Danger is for a choice that destroys something. It colours the box
 * rather than the label, so the tick reads as the dangerous part: the
 * sentence stays legible and the state is what stands out.
 */
export const Danger: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(false);

      return (
        <Checkbox
          tone="danger"
          label="Also remove the accounts Crewlet created"
          description="They are deleted in the provider. Anything they own stays, but they can no longer be used."
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
      );
    }

    return <Demo />;
  },
};

export const Disabled: Story = {
  render: () => (
    <Checkbox
      label="Not available in this workspace"
      description="Ask an administrator to turn this on."
      disabled
    />
  ),
};
