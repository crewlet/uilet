import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Announcer,
  ArrangeBoard,
  ArrangeFrame,
  ArrangeGrid,
  ArrangeGroup,
  Button,
  Card,
  List,
  ListItem,
  Note,
  useReorderLists,
} from '@crewlethq/ui';

const meta: Meta<typeof ArrangeFrame> = {
  title: 'UI/ArrangeFrame',
  component: ArrangeFrame,
};

export default meta;
type Story = StoryObj<typeof ArrangeFrame>;

interface Block {
  columns: number;
  rows: number | null;
}

const ROW = 16;

function Board() {
  const [editing, setEditing] = useState(true);
  const [lists, setLists] = useState<Record<string, string[]>>({
    page: ['Needs your decision', 'Live now', 'group'],
    'group:group': ['Projects', 'This week'],
  });
  const [sizes, setSizes] = useState<Record<string, Block>>({
    'Needs your decision': { columns: 8, rows: null },
    'Live now': { columns: 4, rows: null },
    group: { columns: 12, rows: null },
    Projects: { columns: 8, rows: null },
    'This week': { columns: 4, rows: null },
  });
  const [collapsed, setCollapsed] = useState(false);
  const reorder = useReorderLists({
    lists,
    onReorder: setLists,
    nameOf: (k) => (k === 'group' ? 'Delivery' : k),
    accepts: (k, list) => list === 'page' || k !== 'group',
    axis: 'grid',
  });
  const frame = (k: string) => {
    const size = sizes[k]!;
    return (
      <ArrangeFrame
        key={k}
        {...reorder.itemProps(k)}
        name={k === 'group' ? 'Delivery' : k}
        editing={editing}
        columns={size.columns}
        rows={size.rows}
        rowHeight={ROW}
        container={k === 'group'}
        handle={reorder.handleProps(k)}
        resize={{ minColumns: 3, vertical: k !== 'group', onResize: (next) => setSizes({ ...sizes, [k]: next }) }}
        onRemove={() => undefined}
      >
        {k === 'group' ? (
          <ArrangeGroup
            title="Delivery"
            tone="blue"
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            count={reorder.lists['group:group']?.length}
            bodyProps={editing ? reorder.listProps('group:group') : undefined}
            empty="Drag widgets here."
          >
            {(reorder.lists['group:group'] ?? []).map(frame)}
          </ArrangeGroup>
        ) : k === 'This week' ? (
          <Note tone="amber">
            <p>
              <strong>This week:</strong> answer the scope questions before standup.
            </p>
          </Note>
        ) : (
          <Card>
            <Card.Header>
              <Card.Title as="h3">{k}</Card.Title>
            </Card.Header>
            <Card.Body>
              <a href="#inert">This link does nothing while arranging.</a>
            </Card.Body>
          </Card>
        )}
      </ArrangeFrame>
    );
  };
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Announcer />
      <Button variant="secondary" style={{ justifySelf: 'start' }} onClick={() => setEditing(!editing)}>
        {editing ? 'Done' : 'Edit'}
      </Button>
      {/* The page's grid is the board's own, so its lanes are the columns a block snaps to. */}
      <ArrangeBoard editing={editing}>
        <ArrangeGrid {...reorder.listProps('page')}>{(reorder.lists.page ?? []).map(frame)}</ArrangeGrid>
      </ArrangeBoard>
    </div>
  );
}

/**
 * A page being arranged. Hover a block for its ring, toolbar and resize
 * handle; drag it by its surface (into or out of the group, which moves by
 * its header); resize it from its corner bracket (snapped to twelve columns
 * and 16px rows), or the group from its edge grip. Focus a block and use the
 * arrow keys; double click a corner to fit the height to the content again.
 */
export const Basic: Story = { render: () => <Board /> };

/** A card of `items` rows that shows the rows its block has room for, and counts the rest. */
function FittedCard({ name, items }: { name: string; items: number }) {
  const [shown, setShown] = useState(items);
  return (
    <Card padding="none">
      <Card.Header>
        <Card.Title>{name}</Card.Title>
      </Card.Header>
      <List fit onFit={setShown}>
        {Array.from({ length: items }, (_, i) => (
          <ListItem key={i} href="#">{`Row ${i + 1}`}</ListItem>
        ))}
      </List>
      <Card.Footer variant="meta">{shown < items ? `+${items - shown} more` : 'All rows shown'}</Card.Footer>
    </Card>
  );
}

/**
 * Blocks given a height, on a page taller than the window. Neither scrolls:
 * the wheel always moves the page, and the long list shows the rows that fit
 * its block whole and counts the rest. Resize the window to see it refit.
 */
export const FixedHeightOnAScrollingPage: Story = {
  render: () => (
    <div style={{ paddingBottom: '150vh' }}>
      <ArrangeGrid>
        {[
          { name: 'Live now', items: 2 },
          { name: 'Recent activity', items: 30 },
        ].map(({ name, items }) => (
          <ArrangeFrame key={name} name={name} editing={false} columns={6} rows={14} rowHeight={ROW}>
            <FittedCard name={name} items={items} />
          </ArrangeFrame>
        ))}
      </ArrangeGrid>
    </div>
  ),
};
