import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Composer } from '@crewlethq/ui';

/**
 * A message written in place: a field that grows with its text and a footer
 * with the send shortcut, a counter near the limit, and the actions.
 */
const meta: Meta<typeof Composer> = {
  title: 'UI/Composer',
  component: Composer,
};

export default meta;
type Story = StoryObj<typeof Composer>;

function Reply({ initial = '' }: { initial?: string }) {
  const [text, setText] = useState(initial);
  return (
    <div style={{ maxWidth: 560 }}>
      <Composer
        label="Your reply"
        value={text}
        onChange={setText}
        onSubmit={() => {}}
        maxLength={200}
        placeholder="Tell them what you want instead"
        actions={
          <>
            <Button size="small" variant="ghost">
              Cancel
            </Button>
            <Button size="small" variant="primary" disabled={!text.trim()}>
              Submit
            </Button>
          </>
        }
      />
    </div>
  );
}

export const Default: Story = { render: () => <Reply /> };

/** Past four fifths of the limit, the counter appears. */
export const NearTheLimit: Story = {
  render: () => <Reply initial={'Keep greedy settlement for groups above twelve, and exact search below. '.repeat(3)} />,
};
