import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Announcer, ArrangeBoard, ArrangeFrame, ArrangeGroup, Button, Card, Note, useReorderLists } from '@crewlethq/ui';

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
      <Button variant="secondary" onClick={() => setEditing(!editing)}>
        {editing ? 'Done' : 'Edit'}
      </Button>
      <ArrangeBoard editing={editing}>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 20 }}
          {...reorder.listProps('page')}
        >
          {(reorder.lists.page ?? []).map(frame)}
        </div>
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
