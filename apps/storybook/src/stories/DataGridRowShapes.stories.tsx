import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  DataGrid,
  TableDateCell,
  TableNumberCell,
  TableStatusCell,
  TableTextCell,
  Tag,
  type DataGridColumn,
} from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * UI / DataGrid / Row shapes.
 *
 * The shapes a row can take beyond a line of cells: open in place, a line
 * under it, a tone on its edge, moved by hand with its position, a summary
 * that is not a record, a compact or loading grid, a column's overflow rule
 * and hover text, a head that asks a server for its order, and a foot that
 * holds a legend. Every story is drawn light over dark.
 */
const meta: Meta<typeof DataGrid> = {
  title: 'UI/DataGrid/Row shapes',
  component: DataGrid,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

interface Seat {
  handle: string;
  name: string;
  on: boolean;
  access: string;
  projects: number;
  status: 'Ready' | 'Needs sign-in' | 'Refused';
  tokens: number | null;
  spent: number;
}

const SEATS: Seat[] = [
  {
    handle: 'reviewer',
    name: 'Code reviewer',
    on: true,
    access: 'Read and write',
    projects: 4,
    status: 'Ready',
    tokens: 182_400,
    spent: 41.2,
  },
  {
    handle: 'planner',
    name: 'Release planner',
    on: true,
    access: 'Read only',
    projects: 2,
    status: 'Needs sign-in',
    tokens: 64_100,
    spent: 12.75,
  },
  {
    handle: 'triage',
    name: 'Support triage',
    on: false,
    access: 'No access',
    projects: 0,
    status: 'Refused',
    tokens: null,
    spent: 0,
  },
  {
    handle: 'docs',
    name: 'Docs writer with a name long enough to be cut in a narrow column',
    on: true,
    access: 'Read only',
    projects: 1,
    status: 'Ready',
    tokens: 9_800,
    spent: 2.1,
  },
];

const TONE = { Ready: 'success', 'Needs sign-in': 'warning', Refused: 'danger' } as const;

const COLUMNS: DataGridColumn<Seat>[] = [
  {
    key: 'name',
    header: 'Agent',
    floor: '10rem',
    overflow: 'truncate',
    phoneLead: true,
    cell: (s) => s.name,
    sortValue: (s) => s.name,
  },
  { key: 'access', header: 'Access', shrink: true, drop: 2, cell: (s) => s.access, sortValue: (s) => s.access },
  {
    key: 'projects',
    header: 'Projects',
    align: 'right',
    shrink: true,
    cell: (s) => s.projects,
    sortValue: (s) => s.projects,
  },
  {
    key: 'status',
    header: 'Status',
    shrink: true,
    cell: (s) => <TableStatusCell label={s.status} glyph="●" tone={TONE[s.status]} />,
    sortValue: (s) => s.status,
  },
  {
    key: 'tokens',
    header: 'Tokens',
    align: 'right',
    shrink: true,
    drop: 1,
    cell: (s) => <TableNumberCell value={s.tokens} />,
    sortValue: (s) => s.tokens,
  },
];

const Frame = ({ children }: { children: ReactNode }) => (
  <BothThemes>
    {/* Sized by the panel, never by the grid's content, as a page section is. */}
    <div style={{ maxWidth: 960, containerType: 'inline-size' }}>{children}</div>
  </BothThemes>
);

function Expandable() {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set(['planner']));
  return (
    <DataGrid
      aria-label="Agent access"
      rows={SEATS}
      columns={COLUMNS}
      rowKey={(s) => s.handle}
      expansion={{
        isExpanded: (s) => open.has(s.handle),
        onToggle: (s) =>
          setOpen((was) => {
            const next = new Set(was);
            if (next.has(s.handle)) next.delete(s.handle);
            else next.add(s.handle);
            return next;
          }),
        render: (s) => (
          <span>
            {s.name} reads {s.projects} projects. Access is granted per project; a project it cannot read is not listed.
          </span>
        ),
        label: (s, isOpen) => `${isOpen ? 'Hide' : 'Show'} the projects of ${s.name}`,
        canExpand: (s) => s.projects > 0,
      }}
    />
  );
}

/**
 * ROWS THAT OPEN IN PLACE (`expansion`). A chevron before the first column,
 * named for what a press does, opens the row's detail on a full-width row
 * under it, which starts on the first of the caller's columns. A row with
 * nothing to open draws no chevron. Controlled: the host keeps which rows are
 * open.
 */
export const ExpandableRows: Story = {
  render: () => (
    <Frame>
      <Expandable />
    </Frame>
  ),
};

/**
 * A LINE UNDER A ROW AND A TONE ON ITS EDGE (`rowAccessory`, `rowTone`). The
 * line says what the row cannot say in its cells, always shown, and describes
 * the row's link. The tone is a second signal on the edge (the status column
 * says it in words) and runs down the line under the row. `isFailed` is the
 * danger tone.
 */
export const AccessoryRowsAndTones: Story = {
  render: () => (
    <Frame>
      <DataGrid
        aria-label="Agent access"
        rows={SEATS}
        columns={COLUMNS}
        rowKey={(s) => s.handle}
        rowHref={(s) => `#/seats/${s.handle}`}
        rowTone={(s) => (s.status === 'Refused' ? 'danger' : s.status === 'Needs sign-in' ? 'warning' : undefined)}
        rowAccessory={(s) =>
          s.status === 'Refused'
            ? 'The service refused this agent: its token was revoked on the provider.'
            : s.status === 'Needs sign-in'
              ? 'Waiting for a person to sign in to the service for this agent.'
              : null
        }
      />
    </Frame>
  ),
};

function Reordered() {
  const [order, setOrder] = useState(SEATS.map((s) => s.handle));
  const [pending, setPending] = useState<string | null>(null);
  const rows = order.map((handle) => SEATS.find((s) => s.handle === handle)!);
  return (
    <DataGrid
      aria-label="Priorities"
      rows={rows}
      columns={COLUMNS}
      rowKey={(s) => s.handle}
      ordinal
      reorder={{
        rowName: (s) => s.name,
        canMove: (s) => s.handle !== 'triage',
        pendingKey: pending,
        onMove: (key, before) => {
          setOrder((was) => {
            const next = was.filter((k) => k !== key);
            next.splice(before === null ? next.length : next.indexOf(before), 0, key);
            return next;
          });
          // A move is saved somewhere: the row is quieter until it lands.
          setPending(key);
          window.setTimeout(() => setPending(null), 900);
        },
      }}
    />
  );
}

/**
 * ROWS MOVED BY HAND, AND THEIR POSITION (`reorder`, `ordinal`). Drag a
 * handle, or focus it and press Up or Down; every move is said aloud. The `#`
 * column is the position drawn and never sorts, and a hand-ordered grid sorts
 * nothing. Support triage holds its place, and a row whose move is saving is
 * quieter until it lands.
 */
export const ReorderAndOrdinal: Story = {
  render: () => (
    <Frame>
      <Reordered />
    </Frame>
  ),
};

function Summaries() {
  const [sort, setSort] = useState('-tokens');
  return (
    <DataGrid
      aria-label="Spend by agent"
      rows={SEATS}
      columns={[
        ...COLUMNS.filter((c) => c.key === 'name' || c.key === 'tokens'),
        {
          key: 'spent',
          header: 'Spent',
          align: 'right',
          shrink: true,
          cell: (s: Seat) => <TableNumberCell value={s.spent} format={(v) => `$${v.toFixed(2)}`} />,
          sortValue: (s: Seat) => s.spent,
        },
      ]}
      rowKey={(s) => s.handle}
      sort={sort}
      onSortChange={setSort}
      summaryRows={[
        {
          key: 'company',
          label: 'The whole company',
          position: 'top',
          cells: {
            tokens: <TableNumberCell value={256_300} />,
            spent: <TableNumberCell value={56.05} format={(v) => `$${v.toFixed(2)}`} />,
          },
        },
        {
          key: 'total',
          label: 'Total of the agents shown',
          cells: {
            tokens: <TableNumberCell value={256_300} />,
            spent: <TableNumberCell value={56.05} format={(v) => `$${v.toFixed(2)}`} />,
          },
        },
      ]}
    />
  );
}

/**
 * SUMMARY ROWS (`summaryRows`): the whole above its parts and a total under
 * them, on the grid's own tracks so the figures stand under their heads.
 * Never sorted (press a head), picked or linked.
 */
export const SummaryRows: Story = {
  render: () => (
    <Frame>
      <Summaries />
    </Frame>
  ),
};

/**
 * A COMPACT GRID, AND ONE STILL LOADING (`density`, `loading`,
 * `loadingRows`). The compact grid is a step shorter, for a drawer or a side
 * panel. A loading grid keeps its head and draws placeholder rows on its
 * tracks, so nothing jumps when the rows land; it never shows the empty
 * state while it waits.
 */
export const CompactAndLoading: Story = {
  render: () => (
    <Frame>
      <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
        <Card padding="none">
          <Card.Header>
            <Card.Title>Compact, in a card</Card.Title>
          </Card.Header>
          <DataGrid aria-label="Compact" rows={SEATS} columns={COLUMNS} rowKey={(s) => s.handle} density="compact" />
        </Card>
        <DataGrid
          aria-label="Loading"
          rows={[]}
          columns={COLUMNS}
          rowKey={(s: Seat) => s.handle}
          loading
          loadingRows={3}
          empty={{ title: 'No agent has access yet' }}
        />
      </div>
    </Frame>
  ),
};

interface Change {
  id: string;
  when: string;
  exact: string;
  key: string;
  what: string;
  who: string;
}

const CHANGES: Change[] = [
  {
    id: '1',
    when: '2026-11-04T09:12:00Z',
    exact: '4 November 2026, 09:12',
    key: 'ENG-112',
    what: 'Moved from In review to Done, and closed the two checklist items that were still open from the review.',
    who: 'Code reviewer',
  },
  {
    id: '2',
    when: '2026-11-03T16:40:00Z',
    exact: '3 November 2026, 16:40',
    key: 'ENG-98',
    what: 'Renamed to "Rotate the signing key before the audit".',
    who: 'Release planner with a long display name',
  },
];

/**
 * A COLUMN'S OVERFLOW AND HOVER TEXT (`overflow`, `title`). What changed is
 * prose and wraps (`wrap`); Who is cut on one line (`truncate`) with its whole
 * words on hover while it is cut; When shows a relative time with the exact
 * one as the column's `title`. A `TableTextCell` that is cut also carries its
 * whole words on hover.
 */
export const OverflowAndHoverText: Story = {
  render: () => (
    <Frame>
      <DataGrid
        aria-label="History"
        rows={CHANGES}
        rowKey={(c) => c.id}
        columns={[
          {
            key: 'when',
            header: 'When',
            align: 'right',
            shrink: true,
            title: (c) => c.exact,
            cell: (c) => <TableDateCell value={c.when} />,
          },
          { key: 'key', header: 'Key', shrink: true, cell: (c) => c.key },
          { key: 'what', header: 'What changed', floor: '14rem', overflow: 'wrap', cell: (c) => c.what },
          { key: 'who', header: 'Who', width: '9rem', overflow: 'truncate', cell: (c) => c.who },
          { key: 'cell', header: 'Text cell', width: '8rem', cell: (c) => <TableTextCell>{c.who}</TableTextCell> },
        ]}
      />
    </Frame>
  ),
};

function ServerOrder() {
  const [sort, setSort] = useState('-updated');
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
      <DataGrid
        aria-label="Skills"
        rows={SEATS}
        rowKey={(s) => s.handle}
        serverSorted
        sort={sort}
        onSortChange={setSort}
        defaultSort="-updated"
        columns={[
          { key: 'name', header: 'Skill', sortable: true, cell: (s) => s.name, overflow: 'truncate' },
          { key: 'projects', header: 'Loads', align: 'right', shrink: true, cell: (s) => s.projects },
          { key: 'updated', header: 'Updated', align: 'right', shrink: true, sortable: true, cell: () => '2d ago' },
        ]}
      />
      <code>sort={JSON.stringify(sort)}</code>
    </div>
  );
}

/**
 * A HEAD THAT ASKS THE SOURCE FOR ITS ORDER (`sortable`). A server-sorted grid
 * marks Skill and Updated sortable with no comparator: a press writes the
 * order (below the grid) for the source to apply, and the rows stay as sent.
 * Loads has no order on the source, so its head stays plain.
 */
export const ServerSortedHeads: Story = {
  render: () => (
    <Frame>
      <ServerOrder />
    </Frame>
  ),
};

function Legend() {
  const [cols, setCols] = useState('name,status,projects');
  return (
    <DataGrid
      aria-label="Projects"
      rows={SEATS}
      columns={COLUMNS}
      rowKey={(s) => s.handle}
      cols={cols}
      onColsChange={setCols}
      loadedNote="4 of 4 loaded"
      onLoadMore={() => {}}
      footer={
        <ul
          aria-label="Legend"
          style={{ display: 'flex', gap: 'var(--spacing-3)', margin: 0, padding: 0, listStyle: 'none' }}
        >
          <li>
            <Tag size="xs">Ready</Tag> can act
          </li>
          <li>
            <Tag size="xs">Refused</Tag> needs a person
          </li>
        </ul>
      }
    />
  );
}

/**
 * A FOOT THAT HOLDS A LEGEND. The foot is the table's own row group, one row
 * of one cell across every column, so a list in it (and the way back from a
 * column set under it) is content a table allows. Press "Show every column".
 */
export const FootWithALegend: Story = {
  render: () => (
    <Frame>
      <Legend />
    </Frame>
  ),
};

/** Every row shape at once, in a card, for a side by side look at the edges and the rules. */
export const AllTogether: Story = {
  render: () => (
    <Frame>
      <Card padding="none">
        <Card.Header>
          <Card.Title>Agents</Card.Title>
        </Card.Header>
        <DataGrid
          aria-label="Agents"
          rows={SEATS}
          columns={[
            ...COLUMNS,
            {
              key: 'open',
              header: '',
              action: true,
              cell: (s) => (
                <Button size="small" variant="ghost">
                  Manage {s.handle}
                </Button>
              ),
            },
          ]}
          rowKey={(s) => s.handle}
          rowHref={(s) => `#/seats/${s.handle}`}
          isFailed={(s) => s.status === 'Refused'}
          rowAccessory={(s) => (s.status === 'Refused' ? 'Its token was revoked on the provider.' : null)}
          summaryRows={[
            { key: 'total', label: 'Total', cells: { projects: 7, tokens: <TableNumberCell value={256_300} /> } },
          ]}
          footer="4 agents"
        />
      </Card>
    </Frame>
  ),
};
