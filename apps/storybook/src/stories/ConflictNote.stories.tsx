import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ConflictNote } from '@crewlethq/ui';

const meta: Meta<typeof ConflictNote> = {
  title: 'UI/ConflictNote',
  component: ConflictNote,
};

export default meta;
type Story = StoryObj<typeof ConflictNote>;

/** The host has looked up who won the race, so the note names them. */
export const Named: Story = {
  render: function Render() {
    const [shown, setShown] = useState(true);
    return shown ? (
      <ConflictNote subject="ENG-412" changedBy="Maya Ortiz" onDismiss={() => setShown(false)} />
    ) : (
      <p>Dismissed.</p>
    );
  },
};

/** Until the host knows, the server's own sentence stands. */
export const ServerSentence: Story = {
  args: {
    subject: 'ENG-412',
    message: 'This task changed after you loaded it (version 7 is current).',
    onDismiss: () => {},
  },
};

/** A host control beside Dismiss. */
export const WithReload: Story = {
  args: {
    subject: 'Q4 roadmap',
    changedBy: 'Product Manager',
    actions: (
      <Button size="small" variant="secondary">
        Reload
      </Button>
    ),
    onDismiss: () => {},
  },
};
