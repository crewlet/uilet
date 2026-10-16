import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ConfirmField, Inline, Stack, Text, confirmMatches } from '@crewlethq/ui';

const meta: Meta<typeof ConfirmField> = {
  title: 'UI/ConfirmField',
  component: ConfirmField,
};

export default meta;
type Story = StoryObj<typeof ConfirmField>;

/**
 * A gesture that cannot be undone asks for a value typed back. The field is a
 * form field like every other, and the phrase keeps its own case inside the
 * label's capitals, because the reader types it exactly. The button waits for
 * `confirmMatches`.
 */
export const InADialog: Story = {
  render: function Render() {
    const [typed, setTyped] = useState('');
    const phrase = 'jane.founder';
    return (
      <Stack gap={4} style={{ maxWidth: 420 }}>
        <Text as="p">
          Removing Jane signs her out everywhere and frees her seat. This cannot be undone.
        </Text>
        <ConfirmField phrase={phrase} value={typed} onValueChange={setTyped} />
        <Inline gap={2} justify="end">
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" disabled={!confirmMatches(typed, phrase)}>
            Remove
          </Button>
        </Inline>
      </Stack>
    );
  },
};
