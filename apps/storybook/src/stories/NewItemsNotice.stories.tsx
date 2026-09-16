import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Announcer, Card, NewItemsNotice } from '@crewlethq/ui';

const meta: Meta<typeof NewItemsNotice> = {
  title: 'UI/NewItemsNotice',
  component: NewItemsNotice,
  args: { count: 3, noun: 'new phase' },
  argTypes: { count: { control: { type: 'number', min: 0, max: 20 } } },
  decorators: [
    (Story) => (
      <>
        {/* The sentence it says goes through the shared announcer, which an
            application mounts once in its shell. */}
        <Announcer />
        <div style={{ maxWidth: 520 }}>{Story()}</div>
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NewItemsNotice>;

/**
 * The accent on hover, and only there: what is behind the pill IS where the
 * reader is about to be. Two steps of the one hue, because they answer two
 * different questions: the boundary takes the fill step, measured at 3:1 as a
 * mark, and the label the ink step, measured at 4.5:1 as text.
 */
export const Basic: Story = {
  render: (args) => <NewItemsNotice {...args} onShow={() => {}} />,
};

/** Nothing held, nothing drawn. */
export const Empty: Story = {
  args: { count: 0 },
  render: (args) => <NewItemsNotice {...args} onShow={() => {}} />,
};

/**
 * WHY IT EXISTS. Splicing finished rows in at the top pushes the page down by
 * a card mid-sentence, which on a busy company happens every few seconds. The
 * list only moves when the reader says so.
 */
export const InAFeed: Story = {
  render: function InAFeed() {
    const [shown, setShown] = useState(2);
    const [waiting, setWaiting] = useState(3);
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <NewItemsNotice
          count={waiting}
          noun="new phase"
          onShow={() => {
            setShown((rows) => rows + waiting);
            setWaiting(0);
          }}
        />
        {Array.from({ length: shown }, (_, i) => (
          <Card key={i}>
            <Card.Body>Phase {shown - i}</Card.Body>
          </Card>
        ))}
      </div>
    );
  },
};
