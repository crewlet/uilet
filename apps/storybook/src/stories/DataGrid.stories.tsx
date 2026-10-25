import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Card, ChooserList, ColumnChooser, DataGrid, Tag, columnChoicesOf, type DataGridColumn } from '@crewlethq/ui';
import { InboxGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof DataGrid> = {
  title: 'UI/DataGrid',
  component: DataGrid,
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

interface Task {
  key: string;
  title: string;
  status: string;
  assignee?: string;
  updated: number;
}

const TASKS: Task[] = [
  { key: 'ENG-12', title: 'Rotate the signing key before the audit', status: 'In progress', assignee: 'Ada', updated: 3 },
  { key: 'ENG-9', title: 'Write the backup runbook', status: 'To do', updated: 30 },
  { key: 'ENG-14', title: 'Audit the token grants', status: 'Done', assignee: 'Grace', updated: 1 },
  { key: 'ENG-15', title: 'Move the storage quotas to File storage', status: 'In review', assignee: 'Ada', updated: 8 },
];

const COLUMNS: DataGridColumn<Task>[] = [
  { key: 'key', header: 'Key', shrink: true, phoneLead: true, cell: (t) => t.key, sortValue: (t) => t.key },
  { key: 'title', header: 'Title', floor: '12rem', phoneLead: true, cell: (t) => t.title, sortValue: (t) => t.title },
  { key: 'status', header: 'Status', shrink: true, drop: 2, cell: (t) => <Tag size="sm">{t.status}</Tag>, sortValue: (t) => t.status },
  { key: 'assignee', header: 'Assignee', shrink: true, drop: 1, cell: (t) => t.assignee ?? null, sortValue: (t) => t.assignee },
  {
    key: 'updated',
    header: 'Updated',
    align: 'right',
    shrink: true,
    optional: true,
    cell: (t) => `${t.updated}m ago`,
    sortValue: (t) => t.updated,
  },
  { key: 'open', header: '', action: true, cell: (t) => <Button size="small" variant="ghost">Open {t.key}</Button> },
];

function Sorted({ phoneRows }: { phoneRows?: 'labelled' | 'compact' }) {
  const [sort, setSort] = useState('-updated');
  const [cols, setCols] = useState('');
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', maxWidth: 960 }}>
      <ColumnChooser choices={columnChoicesOf(COLUMNS)} value={cols} onChange={setCols} />
      <DataGrid
        rows={TASKS}
        columns={COLUMNS}
        rowKey={(t: Task) => t.key}
        rowHref={(t: Task) => `#/worklet/${t.key}`}
        isSelected={(t: Task) => t.key === 'ENG-15'}
        sort={sort}
        onSortChange={setSort}
        cols={cols}
        onColsChange={setCols}
        phoneRows={phoneRows}
        loadedNote="4 of 4 loaded"
      />
    </div>
  );
}

/**
 * A sortable list with a link per row, a selected row, a column chooser and an
 * optional column. The sort and the column set are controlled: an application
 * keeps them where it keeps state, its address. Narrow the frame to watch
 * Assignee, then Status, give way and the foot name them.
 */
export const Sortable: Story = { render: () => <Sorted /> };

/** On a phone, the compact row: the key and title on the first line, the marks under it. */
export const CompactOnAPhone: Story = {
  render: () => <Sorted phoneRows="compact" />,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

/** A grouped answer: each band carries the source's count beside the rows loaded, a band inside a band for a second axis. */
export const Bands: Story = {
  render: () => (
    <div style={{ maxWidth: 960 }}>
      <DataGrid
        columns={COLUMNS}
        rowKey={(t: Task) => t.key}
        bands={[
          { key: 'ada', label: 'Ada', total: 9, rows: TASKS.filter((t) => t.assignee === 'Ada') },
          {
            key: 'rest',
            label: 'Everybody else',
            rows: [],
            bands: [
              { key: 'grace', label: 'Grace', rows: TASKS.filter((t) => t.assignee === 'Grace') },
              { key: 'none', label: 'Unassigned', rows: TASKS.filter((t) => !t.assignee) },
            ],
          },
        ]}
      />
    </div>
  ),
};

/** In a card the grid is the card's body: one edge, the card's. Empty, it says so with its next step. */
export const InACardAndEmpty: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)', maxWidth: 960 }}>
      <Card padding="none">
        <Card.Header>
          <Card.Title>Open tasks</Card.Title>
        </Card.Header>
        <DataGrid rows={TASKS} columns={COLUMNS} rowKey={(t: Task) => t.key} />
      </Card>
      <Card padding="none">
        <Card.Header>
          <Card.Title>Archived</Card.Title>
        </Card.Header>
        <DataGrid
          rows={[]}
          columns={COLUMNS}
          rowKey={(t: Task) => t.key}
          empty={{
            title: 'Nothing is archived',
            hint: 'A task moves here a week after it is done.',
            icon: <InboxGlyph size={32} />,
          }}
        />
      </Card>
    </div>
  ),
};

function Facts() {
  const [hidden, setHidden] = useState<Set<string>>(new Set(['owner']));
  const facts = [
    { key: 'due', label: 'Due' },
    { key: 'owner', label: 'Owner' },
    { key: 'labels', label: 'Labels' },
    { key: 'estimate', label: 'Estimate' },
  ];
  return (
    <div style={{ maxWidth: 320 }}>
      <ChooserList
        label="Card shows"
        items={facts.map((fact) => ({ ...fact, checked: !hidden.has(fact.key) }))}
        onToggle={(key) =>
          setHidden((was) => {
            const next = new Set(was);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          })
        }
      />
    </div>
  );
}

/** The plain checklist the column chooser is drawn with, for any set of facts a view shows. */
export const AChooserList: Story = { render: () => <Facts /> };

/**
 * ROWS PICKED FOR A BULK ACTION (`selection`): a box before the first column
 * on every row, and one in the head over every row drawn, mixed while some
 * are picked. Shift with a box sets every row between it and the box pressed
 * before it. A row the reader cannot act on has a disabled box. A picked row
 * takes the selected fill; the current row keeps its own mark.
 */
export const Selection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(['ENG-9']));
    return (
      <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: 960 }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{selected.size} selected</span>
        <DataGrid
          rows={TASKS}
          columns={COLUMNS}
          rowKey={(t: Task) => t.key}
          rowHref={(t: Task) => `#/worklet/${t.key}`}
          isSelected={(t: Task) => t.key === 'ENG-15'}
          selection={{
            selected,
            onChange: setSelected,
            rowLabel: (t: Task) => `Select ${t.key}`,
            isSelectable: (t: Task) => t.status !== 'Done',
          }}
          phoneRows="compact"
          aria-label="Tasks"
        />
      </div>
    );
  },
};
