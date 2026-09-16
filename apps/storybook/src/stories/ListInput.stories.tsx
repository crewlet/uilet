import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Announcer, ListInput } from '@crewlethq/ui';

const meta: Meta<typeof ListInput> = {
  title: 'UI/ListInput',
  component: ListInput,
};

export default meta;
type Story = StoryObj<typeof ListInput>;

/**
 * The order is the meaning: the first policy is read first. Enter in the new
 * box appends, Enter in an item moves on, Alt+Arrow reorders, and every
 * change is announced.
 */
export const Goals: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['Ship the beta', 'Hire two engineers']);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            label="Goals"
            itemName="goal"
            value={value}
            onChange={setValue}
            helper="The first goal is the one the unit reads first."
            placeholder="Add a goal"
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/** Items that are paragraphs, where Shift+Enter is a newline. */
export const Multiline: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState([
        'Never merge to main without a review from somebody outside the change.',
      ]);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            multiline
            label="Policies"
            itemName="policy"
            value={value}
            onChange={setValue}
            placeholder="Add a policy"
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const WithError: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['']);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            label="Responsibilities"
            itemName="responsibility"
            value={value}
            onChange={setValue}
            helper="One sentence each."
            error="A responsibility cannot be empty."
          />
        </div>
      );
    }
    return <Demo />;
  },
};
