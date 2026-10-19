import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrangeBoard, ArrangeFrame, ArrangeGrid, Card } from '@crewlethq/ui';

const meta: Meta<typeof ArrangeGrid> = {
  title: 'UI/ArrangeGrid',
  component: ArrangeGrid,
};

export default meta;
type Story = StoryObj<typeof ArrangeGrid>;

const blocks: { name: string; columns: number }[] = [
  { name: 'Open work', columns: 3 },
  { name: 'Tokens', columns: 3 },
  { name: 'Deploys', columns: 3 },
  { name: 'Lead time', columns: 3 },
  { name: 'Spend per day', columns: 8 },
  { name: 'Who spent it', columns: 4 },
];

/**
 * A board's page grid: each frame spans the columns it says, so four stats
 * share a row and a chart sits beside its breakdown.
 */
export const Board: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <ArrangeBoard editing={false}>
        <ArrangeGrid>
          {blocks.map((b) => (
            <ArrangeFrame key={b.name} name={b.name} editing={false} columns={b.columns}>
              <Card>{b.name}</Card>
            </ArrangeFrame>
          ))}
        </ArrangeGrid>
      </ArrangeBoard>
    </div>
  ),
};

/** One column: every block spans the page, as a narrow page stacks them. */
export const Stacked: Story = {
  render: () => (
    <div style={{ padding: 16, maxWidth: 360 }}>
      <ArrangeGrid columns={1}>
        {blocks.slice(0, 3).map((b) => (
          <ArrangeFrame key={b.name} name={b.name} editing={false} columns={1}>
            <Card>{b.name}</Card>
          </ArrangeFrame>
        ))}
      </ArrangeGrid>
    </div>
  ),
};
