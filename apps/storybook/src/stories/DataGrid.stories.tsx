import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Card, ChooserList, ColumnChooser, DataGrid, Menu, Tag, columnChoicesOf, type DataGridColumn } from '@crewlethq/ui';
import { BugGlyph, InboxGlyph } from '@crewlethq/icons/glyphs';

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

function DefaultOrder() {
  const [sort, setSort] = useState('');
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)', maxWidth: 960 }}>
      <DataGrid
        rows={TASKS}
        columns={COLUMNS}
        rowKey={(t: Task) => t.key}
        rowHref={(t: Task) => `#/worklet/${t.key}`}
        sort={sort}
        // Updated is in minutes ago, so the most recent first is ascending.
        defaultSort="updated"
        onSortChange={setSort}
        cols="key,title,status,assignee,updated,open"
        footer="That is all of it, 4 items match"
      />
      <code>sort={JSON.stringify(sort)}</code>
    </div>
  );
}

/**
 * SORTED AT THE HEAD, FROM A DEFAULT. Every sortable head shows its two-way
 * arrow under the pointer and on focus; the sorted head names its direction.
 * With nothing chosen the rows are in the default order (most recently
 * updated), and Updated's head says so. A press steps ascending, descending,
 * then back to the default, and the value the grid writes (below the grid) is
 * empty whenever the order is the default, so an address holds only what the
 * reader chose. The foot is a caption: smaller, quieter and plainly the end.
 */
export const SortedFromADefault: Story = { render: () => <DefaultOrder /> };

const ALIGNED: DataGridColumn<Task>[] = [
  // A SORTABLE MARK COLUMN: its arrow alone, on the track's middle.
  { key: 'type', header: '', label: 'Type', icon: true, cell: () => <BugGlyph size="sm" aria-hidden="true" />, sortValue: (t) => t.key },
  { key: 'key', header: 'Key', shrink: true, cell: (t) => t.key, sortValue: (t) => t.key },
  {
    key: 'status',
    header: 'Status',
    shrink: true,
    // A VALUE CHOSEN IN PLACE: the menu's trigger is the value, so the pill starts
    // on the column's line with the head and every plain value.
    cell: (t) => (
      <Menu
        label={`Status of ${t.key}`}
        trigger={<Tag size="sm">{t.status}</Tag>}
        valueTrigger
        items={[{ key: 'done', label: 'Done', onSelect: () => {} }]}
      />
    ),
  },
  { key: 'title', header: 'Title', floor: '12rem', cell: (t) => t.title, sortValue: (t) => t.title },
  {
    key: 'updated',
    header: 'Updated',
    align: 'right',
    shrink: true,
    cell: (t) => `${t.updated}m ago`,
    sortValue: (t) => t.updated,
  },
  // A CENTRED SORTABLE HEAD: its word stays on the column's middle.
  { key: 'seen', header: 'Seen', align: 'center', cell: (t) => (t.assignee ? 'Yes' : 'No'), sortValue: (t) => (t.assignee ? 1 : 0) },
];

function Aligned() {
  const [sort, setSort] = useState('');
  return (
    <div style={{ maxWidth: 960 }}>
      <DataGrid
        rows={TASKS}
        columns={ALIGNED}
        rowKey={(t: Task) => t.key}
        sort={sort}
        onSortChange={setSort}
        footer="That is all of it, 4 items match"
      />
    </div>
  );
}

/**
 * ONE EDGE PER COLUMN. Each column's head and values share an edge and an
 * inset: words on the left, times on the right with tabular digits so "4m ago"
 * and "12m ago" end together, and an `icon` column (Type) centred in a fixed
 * track and named for assistive technology. The status picker's trigger is
 * the value (`valueTrigger`), so its pill starts on the head's line.
 */
export const AlignedColumns: Story = { render: () => <Aligned /> };

/**
 * A grid that cannot fit even after its give-way columns have gone, in a
 * 360px column on any window (a screen beside a wide aside): it stacks into
 * the card rows a phone draws rather than cutting its values short. Widen the
 * column past the width it stacked at and its columns come back.
 */
export const StacksWhenNothingFits: Story = {
  render: () => (
    <div style={{ width: 360, resize: 'horizontal', overflow: 'auto', paddingBottom: 'var(--spacing-2)' }}>
      <DataGrid
        rows={TASKS}
        columns={COLUMNS.map((c) => ({ ...c, drop: undefined, optional: false }))}
        rowKey={(t: Task) => t.key}
        rowHref={(t: Task) => `#/worklet/${t.key}`}
      />
    </div>
  ),
};

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
