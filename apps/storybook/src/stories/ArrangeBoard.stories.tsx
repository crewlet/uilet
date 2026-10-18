import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrangeBoard, Button, Card } from '@crewlethq/ui';

const meta: Meta<typeof ArrangeBoard> = {
  title: 'UI/ArrangeBoard',
  component: ArrangeBoard,
};

export default meta;
type Story = StoryObj<typeof ArrangeBoard>;

function Page() {
  const [editing, setEditing] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      <Button variant="secondary" onClick={() => setEditing(!editing)}>
        {editing ? 'Done' : 'Edit'}
      </Button>
      <ArrangeBoard editing={editing} columns={12}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 16 }}>
          <Card style={{ gridColumn: 'span 8' }}>Needs your decision</Card>
          <Card style={{ gridColumn: 'span 4' }}>Live now</Card>
        </div>
      </ArrangeBoard>
    </div>
  );
}

/**
 * The fine hatch says "arranging" at rest, and takes no width from the cards.
 * Drag or resize a block on a page and the columns show as lanes.
 */
export const Basic: Story = { render: () => <Page /> };
