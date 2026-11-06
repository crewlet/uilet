import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  DataGrid,
  OrgTable,
  OrgTableName,
  TableDateCell,
  TableNumberCell,
  TableStatusCell,
  TreeGrid,
  type DataGridColumn,
  type TreeGridColumn,
  type TreeGridContext,
  type TreeInput,
} from '@crewlethq/ui';
import { BuildingComplexGlyph, FileTextGlyph, FolderGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

/**
 * UI / TreeGrid / Data grid parity.
 *
 * A tree table on a data grid's terms: the same head (sort buttons and their
 * marks, right-aligned figures and times, plain heads, icon and action
 * columns), the same give-way columns and "Hidden to fit" foot, the same row
 * link and failed edge. A sort orders each level among itself and never lifts
 * a row out of its parent; with no sort chosen the rows are in the tree's own
 * order and no head is marked. Every story is drawn light over dark.
 */
const meta: Meta<typeof TreeGrid> = {
  title: 'UI/TreeGrid/Data grid parity',
  component: TreeGrid,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof TreeGrid>;

interface Page {
  title: string;
  folder?: boolean;
  by: string;
  saved: string;
  size: number | null;
  failed?: boolean;
  parent: string | null;
}

const PAGES: Record<string, Page> = {
  handbook: {
    title: 'Handbook',
    folder: true,
    by: 'Docs writer',
    saved: '2026-11-05T10:00:00Z',
    size: null,
    parent: null,
  },
  billing: {
    title: 'Billing',
    folder: true,
    by: 'Release planner',
    saved: '2026-11-02T08:30:00Z',
    size: null,
    parent: 'handbook',
  },
  invoices: {
    title: 'Invoices and the monthly close, step by step',
    by: 'Docs writer',
    saved: '2026-11-05T09:10:00Z',
    size: 14,
    parent: 'billing',
  },
  refunds: {
    title: 'Refunds',
    by: 'Support triage',
    saved: '2026-10-21T12:00:00Z',
    size: 6,
    parent: 'billing',
    failed: true,
  },
  access: { title: 'Access', by: 'Code reviewer', saved: '2026-11-04T17:45:00Z', size: 9, parent: 'handbook' },
  onboarding: {
    title: 'Onboarding',
    folder: true,
    by: 'Release planner',
    saved: '2026-09-30T11:00:00Z',
    size: null,
    parent: 'handbook',
  },
  laptop: { title: 'Laptop setup', by: 'Docs writer', saved: '2026-10-02T09:00:00Z', size: 3, parent: 'onboarding' },
  calendar: { title: 'Calendar', by: 'Code reviewer', saved: '2026-11-01T15:20:00Z', size: 2, parent: 'handbook' },
};

const MORE = 'more:';

function forestOf(more: boolean): TreeInput[] {
  const node = (id: string): TreeInput => {
    const children = Object.keys(PAGES)
      .filter((child) => PAGES[child]!.parent === id)
      .map(node);
    if (more && PAGES[id]!.folder) children.push({ id: `${MORE}${id}`, label: '' });
    return { id, label: PAGES[id]!.title, children };
  };
  return Object.keys(PAGES)
    .filter((id) => PAGES[id]!.parent === null)
    .map(node);
}

const COLUMNS: TreeGridColumn[] = [
  { key: 'title', header: 'Title', floor: '12rem', sortValue: (id) => PAGES[id]?.title },
  { key: 'kind', header: '', label: 'Kind', icon: true },
  { key: 'by', header: 'Last saved by', shrink: true, drop: 2, sortValue: (id) => PAGES[id]?.by },
  { key: 'size', header: 'Words (k)', align: 'right', shrink: true, drop: 1, sortValue: (id) => PAGES[id]?.size },
  { key: 'saved', header: 'Last saved', align: 'right', shrink: true, sortValue: (id) => PAGES[id]?.saved },
  { key: 'edit', header: 'Edit', action: true, width: 'calc(var(--size-control-sm) + var(--spacing-3) * 2)' },
];

function cellOf(id: string, column: number, grid: TreeGridContext): ReactNode {
  if (id.startsWith(MORE))
    return (
      <Button size="small" variant="ghost">
        More pages
      </Button>
    );
  const page = PAGES[id]!;
  switch (grid.columnKey(column)) {
    case 'title':
      return (
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {page.title}
        </span>
      );
    case 'kind':
      return page.folder ? (
        <FolderGlyph size="sm" aria-hidden="true" />
      ) : (
        <FileTextGlyph size="sm" aria-hidden="true" />
      );
    case 'by':
      return page.by;
    case 'size':
      return <TableNumberCell value={page.size} emptyLabel="A folder" />;
    case 'saved':
      return <TableDateCell value={page.saved} now={Date.parse('2026-11-06T12:00:00Z')} />;
    default:
      return (
        <Button size="small" variant="ghost" tabIndex={grid.tabStop(id, column) ? 0 : -1}>
          Edit
        </Button>
      );
  }
}

function Pages({
  initialSort = '',
  more = true,
  ...rest
}: { initialSort?: string; more?: boolean } & Partial<ComponentProps<typeof TreeGrid>>) {
  const [sort, setSort] = useState(initialSort);
  const [cols, setCols] = useState('');
  const rows = useMemo(() => forestOf(more), [more]);
  return (
    <TreeGrid
      label="Pages in the handbook"
      columns={COLUMNS}
      rows={rows}
      sort={sort}
      onSortChange={setSort}
      cols={cols}
      onColsChange={setCols}
      layout="container"
      renderCell={cellOf}
      cellHasControl={(id, _column, key) => id.startsWith(MORE) || key === 'edit'}
      addRow={(id) => (id.startsWith(MORE) ? { label: 'More pages', cells: 1 } : null)}
      rowHref={(id) => `#/pages/${id}`}
      isFailed={(id) => Boolean(PAGES[id]?.failed)}
      footer={`${Object.keys(PAGES).length} pages`}
      {...rest}
    />
  );
}

const Frame = ({ children, width = 960 }: { children: ReactNode; width?: number }) => (
  <BothThemes>
    {/* Sized by the panel, never by the grid's content, as a page section is. */}
    <div style={{ maxWidth: width, containerType: 'inline-size' }}>{children}</div>
  </BothThemes>
);

/**
 * SORTED WITHIN EACH PARENT. Press Title, Last saved by, Words or Last saved:
 * each level is ordered among itself, a folder's "More pages" row stays last
 * in it, and the hierarchy never changes. With no sort the rows are in the
 * tree's own order and no head is marked. Figures and times are on the right,
 * the Kind column is one centred mark, and Edit is an action column whose
 * head is read but not seen. Refunds failed, and is marked on its edge.
 */
export const SortedWithinEachParent: Story = {
  render: () => (
    <Frame>
      <Pages />
    </Frame>
  ),
};

/** The same tree, sorted by the time it was last saved, newest first. */
export const SortedNewestFirst: Story = {
  render: () => (
    <Frame>
      <Pages initialSort="-saved" />
    </Frame>
  ),
};

/**
 * COLUMNS THAT GIVE WAY, AND THE FOOT. In a column of at most 560px the grid drops
 * Words, then Last saved by, in their `drop` order, and the foot names them
 * ("Hidden to fit"), beside the caller's own words. Drag the corner to widen
 * it and they come back.
 */
export const GivesWayAndSaysSo: Story = {
  render: () => (
    <BothThemes>
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          resize: 'horizontal',
          overflow: 'auto',
          paddingBottom: 'var(--spacing-2)',
        }}
      >
        <Pages loadedNote="8 of 8 loaded" onLoadMore={() => {}} />
      </div>
    </BothThemes>
  ),
};

/**
 * WHERE NOTHING FITS, A ROW IS A CARD (`phoneRows`). In a column of at most
 * 360px (a phone's room) each value is a named line under the row's name, at the name's
 * indent, so the hierarchy still reads down the left. `compact` puts the
 * values on one line under the name instead.
 */
export const CardsWhereNothingFits: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)', containerType: 'inline-size' }}>
        <div style={{ flex: '1 1 300px', maxWidth: 360, minWidth: 0 }}>
          <Pages phoneRows="labelled" columns={COLUMNS.map((c) => ({ ...c, drop: undefined }))} />
        </div>
        <div style={{ flex: '1 1 300px', maxWidth: 360, minWidth: 0 }}>
          <Pages phoneRows="compact" columns={COLUMNS.map((c) => ({ ...c, drop: undefined }))} />
        </div>
      </div>
    </BothThemes>
  ),
};

/** In a card the grid is the card's body (`flush`); and an empty tree says so, with its next step. */
export const FlushInACardAndEmpty: Story = {
  render: () => (
    <Frame>
      <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
        <Card padding="none">
          <Card.Header>
            <Card.Title>Handbook</Card.Title>
          </Card.Header>
          <Pages flush />
        </Card>
        <Pages
          rows={[]}
          empty={{ title: 'Nothing is filed in this space yet', action: <Button size="small">Create a page</Button> }}
        />
      </div>
    </Frame>
  ),
};

interface Schedule {
  name: string;
  scope: string;
  next: string;
  last: string;
}

const SCHEDULES: Schedule[] = [
  { name: 'Nightly backup check', scope: 'Platform', next: '2026-11-06T23:00:00Z', last: '2026-11-05T23:00:00Z' },
  {
    name: 'Weekly release notes',
    scope: 'Release planner',
    next: '2026-11-09T08:00:00Z',
    last: '2026-11-02T08:00:00Z',
  },
];

const SCHEDULE_COLUMNS: DataGridColumn<Schedule>[] = [
  { key: 'name', header: 'Name', floor: '12rem', cell: (s) => s.name, sortValue: (s) => s.name },
  { key: 'scope', header: 'Scope', shrink: true, cell: (s) => s.scope, sortValue: (s) => s.scope },
  {
    key: 'next',
    header: 'Next',
    align: 'right',
    shrink: true,
    cell: (s) => <TableDateCell value={s.next} now={Date.parse('2026-11-06T12:00:00Z')} />,
    sortValue: (s) => s.next,
  },
  {
    key: 'last',
    header: 'Last',
    align: 'right',
    shrink: true,
    cell: (s) => <TableDateCell value={s.last} now={Date.parse('2026-11-06T12:00:00Z')} />,
    sortValue: (s) => s.last,
  },
];

function Beside() {
  const [sort, setSort] = useState('');
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
      <DataGrid
        aria-label="Schedules"
        rows={SCHEDULES}
        columns={SCHEDULE_COLUMNS}
        rowKey={(s) => s.name}
        rowHref={() => '#/schedules'}
        sort={sort}
        onSortChange={setSort}
        defaultSort="next"
        footer="2 schedules"
      />
      <Pages />
    </div>
  );
}

/**
 * BESIDE A DATA GRID. The schedules list above and the tree below draw one
 * head: the same register, the same sort button and marks, figures and times
 * on the right, the same foot.
 */
export const BesideADataGrid: Story = {
  render: () => (
    <Frame>
      <Beside />
    </Frame>
  ),
};

const ORG: Record<
  string,
  { name: string; caption: string; status: string; tone: 'success' | 'warning' | 'neutral'; parent: string | null }
> = {
  company: { name: 'Northwind', caption: 'Company', status: 'Running', tone: 'success', parent: null },
  sales: { name: 'Sales', caption: 'Unit', status: 'Running', tone: 'success', parent: 'company' },
  eng: { name: 'Engineering', caption: 'Unit', status: 'Paused', tone: 'warning', parent: 'company' },
  reviewer: { name: 'Code reviewer', caption: 'Agent seat', status: 'Running', tone: 'success', parent: 'eng' },
  planner: { name: 'Release planner', caption: 'Agent seat', status: 'Idle', tone: 'neutral', parent: 'eng' },
  ae: { name: 'Account executive', caption: 'Human seat', status: 'Idle', tone: 'neutral', parent: 'sales' },
};

function Org() {
  const [sort, setSort] = useState('');
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['planner']));
  const rows = useMemo(() => {
    const node = (id: string): TreeInput => ({
      id,
      label: ORG[id]!.name,
      children: Object.keys(ORG)
        .filter((child) => ORG[child]!.parent === id)
        .map(node),
    });
    return [node('company')];
  }, []);
  const seats = (id: string): string[] =>
    ORG[id]!.caption.endsWith('seat')
      ? [id]
      : Object.keys(ORG)
          .filter((c) => ORG[c]!.parent === id)
          .flatMap(seats);
  return (
    <OrgTable
      label="Organization"
      layout="container"
      controls={false}
      rows={rows}
      sort={sort}
      onSortChange={setSort}
      columns={[
        { key: 'name', header: 'Name', floor: '14rem', sortValue: (id) => ORG[id]?.name },
        { key: 'status', header: 'Status', width: '9rem', drop: 1, sortValue: (id) => ORG[id]?.status },
      ]}
      rowHref={(id) => `#/org/${id}`}
      selection={{
        checked: (id) => {
          const under = seats(id);
          const on = under.filter((s) => picked.has(s)).length;
          return on === 0 ? false : on === under.length ? true : 'mixed';
        },
        label: (id) => `Select ${ORG[id]!.name}`,
        onCheckedChange: (id, on) =>
          setPicked((was) => {
            const next = new Set(was);
            for (const s of seats(id)) {
              if (on) next.add(s);
              else next.delete(s);
            }
            return next;
          }),
      }}
      renderCell={(id, column, grid) =>
        grid.columnKey(column) === 'name' ? (
          <OrgTableName name={ORG[id]!.name} caption={ORG[id]!.caption} icon={<BuildingComplexGlyph />} />
        ) : (
          <TableStatusCell label={ORG[id]!.status} glyph="●" tone={ORG[id]!.tone} />
        )
      }
    />
  );
}

/**
 * AN ORG TABLE, SORTED. OrgTable passes the sort through: press Name or
 * Status and each unit's seats are ordered among themselves, and the wires
 * follow the order drawn, ending each trunk at the row drawn last. Its rows
 * link, and its select boxes sit after the wires.
 */
export const OrgTableSorted: Story = {
  render: () => (
    <Frame>
      <Org />
    </Frame>
  ),
};
