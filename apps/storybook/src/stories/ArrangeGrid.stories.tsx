import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Announcer, ArrangeBoard, ArrangeFrame, ArrangeGrid, Button, Card, useReorderLists } from '@crewlethq/ui';

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

interface Widget {
  columns: number;
  rows: number | null;
  lines: number;
}

const HOME: Record<string, Widget> = {
  'Needs your decision': { columns: 8, rows: null, lines: 14 },
  'Live now': { columns: 4, rows: null, lines: 3 },
  Completed: { columns: 4, rows: null, lines: 2 },
  Tokens: { columns: 4, rows: null, lines: 4 },
  Projects: { columns: 4, rows: null, lines: 3 },
  Feed: { columns: 12, rows: null, lines: 2 },
};

function Home({ pack, arranging }: { pack: boolean; arranging: boolean }) {
  const [editing, setEditing] = useState(arranging);
  const [loaded, setLoaded] = useState(true);
  const [sizes, setSizes] = useState(HOME);
  const [lists, setLists] = useState<Record<string, string[]>>({ page: Object.keys(HOME) });
  const reorder = useReorderLists({ lists, onReorder: setLists, nameOf: (k) => k, axis: 'grid' });
  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      <Announcer />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => setEditing(!editing)}>
          {editing ? 'Done' : 'Edit'}
        </Button>
        <Button variant="secondary" onClick={() => setLoaded(!loaded)}>
          {loaded ? 'Show loading' : 'Load'}
        </Button>
      </div>
      <ArrangeBoard editing={editing}>
        <ArrangeGrid pack={pack} {...(editing ? reorder.listProps('page') : {})}>
          {(reorder.lists.page ?? []).map((name) => {
            const w = sizes[name]!;
            return (
              <ArrangeFrame
                key={name}
                {...(editing ? reorder.itemProps(name) : {})}
                name={name}
                editing={editing}
                columns={w.columns}
                rows={w.rows}
                rowHeight={16}
                handle={reorder.handleProps(name)}
                resize={{ minColumns: 3, onResize: (next) => setSizes({ ...sizes, [name]: { ...w, ...next } }) }}
              >
                <Card padding="none">
                  <Card.Header>
                    <Card.Title as="h3">{name}</Card.Title>
                  </Card.Header>
                  <Card.Body>
                    {Array.from({ length: loaded ? w.lines : 1 }, (_, i) => (
                      <p key={i}>{loaded ? `Line ${i + 1}` : 'Loading'}</p>
                    ))}
                  </Card.Body>
                </Card>
              </ArrangeFrame>
            );
          })}
        </ArrangeGrid>
      </ArrangeBoard>
    </div>
  );
}

/**
 * `pack`: each block starts under the nearest one above it in its columns,
 * so the cards after a short one fill the columns beside a tall one. Load
 * toggles the content: the page is packed again before the next frame.
 */
export const Packed: Story = { render: () => <Home pack arranging={false} /> };

/** The same page laid in rows: each row as tall as its tallest card, the hole beside it. */
export const Rows: Story = { render: () => <Home pack={false} arranging={false} /> };

/**
 * Packed while arranged: drag a card, resize it from its corner, or focus it
 * and use the arrow keys; the page packs again around it.
 */
export const PackedWhileArranging: Story = { render: () => <Home pack arranging /> };
