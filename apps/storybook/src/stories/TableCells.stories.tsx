import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  DataGrid,
  PrincipalAvatar,
  Table,
  TableDateCell,
  TableEntityCell,
  TableKeyCell,
  TableNumberCell,
  TableStatusCell,
  TableTagsCell,
  TableTextCell,
  TableTwoLineCell,
  type DataGridColumn,
} from '@crewlethq/ui';
import { VendorMark, type Vendor } from '@crewlethq/icons';
import { DatabaseGlyph, SquareTerminalGlyph } from '@crewlethq/icons/glyphs';
import { themeScope } from '../themeScope';

const meta: Meta = {
  title: 'UI/TableCells',
};

export default meta;
type Story = StoryObj;

const NOW = Date.parse('2026-10-18T12:00:00Z');
const PM = { id: 'pm', kind: 'agent' as const, name: 'Product Manager', character: 'gemlet' as const, hue: 'rose' as const };

const duration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

/**
 * Every read-only cell in one table, each row with a present value and one
 * with every value absent. An absent value is a dash that says what kind of
 * absence it is; a zero is a figure.
 */
export const AllCells: Story = {
  render: () => (
    <Table
      caption="Runs"
      headers={['Key', 'Owner', 'Status', 'Tokens', 'Took', 'Updated', 'Tags', 'Store']}
      data={[
        [
          <TableKeyCell key="key" value="work:task:0b4c6f0e-29a1-4c55-9a7e" text="work:task:0b4c" href="#" />,
          <TableEntityCell key="owner" name={PM.name} badge={<PrincipalAvatar principal={PM} size="xs" />} href="#" />,
          <TableStatusCell key="status" glyph="●" label="Running" tone="success" />,
          <TableNumberCell key="tokens" value={12_400} />,
          <TableNumberCell key="took" value={1840} format={duration} />,
          <TableDateCell key="updated" value={NOW - 4 * 60_000} now={NOW} />,
          <TableTagsCell key="tags" tags={['billing', 'q4', 'audit', 'eu', 'migration']} />,
          <TableTextCell key="store" icon={<DatabaseGlyph size="xs" />}>
            primary-eu
          </TableTextCell>,
        ],
        [
          <TableKeyCell key="key" value="" />,
          <TableEntityCell key="owner" name={null} />,
          <TableStatusCell key="status" glyph="○" label="No apply reported" tone="neutral" />,
          <TableNumberCell key="tokens" value={0} />,
          <TableNumberCell key="took" value={null} emptyLabel="Not measured" />,
          <TableDateCell key="updated" value={null} />,
          <TableTagsCell key="tags" tags={[]} />,
          <TableTextCell key="store">Plain text, cut on one line when the column is narrow</TableTextCell>,
        ],
      ]}
    />
  ),
};

interface Connection {
  key: string;
  vendor?: Vendor;
  name: string;
  where: string;
  command?: boolean;
  model: string;
  modelId: string;
  last: string;
  lastDetail?: string;
}

const CONNECTIONS: Connection[] = [
  {
    key: 'linear',
    vendor: 'linear',
    name: 'Linear',
    where: 'api.linear.app',
    model: 'planner',
    modelId: 'claude-sonnet-5-5',
    last: 'Answered',
    lastDetail: '4 minutes ago',
  },
  {
    key: 'github',
    vendor: 'github',
    name: 'GitHub for the production organisation, read only',
    where: 'api.github.com/orgs/production/repos?visibility=private',
    model: 'reviewer-with-a-long-key',
    modelId: 'claude-opus-5-5-with-extended-thinking',
    last: 'Timed out after 30 seconds while listing its repositories',
    lastDetail: 'Product Manager, 12 minutes ago',
  },
  {
    key: 'backup',
    name: 'Nightly backup',
    where: 'rsync -a --delete --exclude=.cache /srv/shared backup:/vault/shared',
    command: true,
    model: 'fast',
    modelId: 'claude-haiku-5-5',
    last: 'Never answered',
  },
];

const CONNECTION_COLUMNS: DataGridColumn<Connection>[] = [
  {
    key: 'name',
    header: 'Connection',
    floor: '12rem',
    cell: (c) =>
      c.vendor ? (
        <TableTwoLineCell
          mark={<VendorMark vendor={c.vendor} size="xl" title={c.name} />}
          value={c.name}
          detail={c.where}
        />
      ) : (
        <TableTwoLineCell icon={<SquareTerminalGlyph size="xl" />} value={c.name} detail={c.where} mono={c.command ? 'detail' : undefined} />
      ),
  },
  {
    key: 'model',
    header: 'Model',
    floor: '9rem',
    cell: (c) => <TableTwoLineCell value={c.model} detail={c.modelId} mono="both" />,
  },
  {
    key: 'last',
    header: 'Last answer',
    floor: '9rem',
    cell: (c) => <TableTwoLineCell value={c.last} detail={c.lastDetail} />,
  },
];

function Connections() {
  return <DataGrid rows={CONNECTIONS} columns={CONNECTION_COLUMNS} rowKey={(c: Connection) => c.key} />;
}

/**
 * A value over a quieter line, each cut on one line with its whole words on
 * hover: a connection's name over where it runs (a vendor's mark, or a column
 * glyph, centred against both), a model's key over its id (both literals, so
 * both mono), and the last answer over who asked and when. A row with one
 * line ("Never answered") keeps the row's height. Drag the corner to narrow
 * the grid and watch every line cut rather than wrap.
 */
export const TwoLineCells: Story = {
  render: () => (
    <div style={{ width: 720, resize: 'horizontal', overflow: 'auto', paddingBottom: 'var(--spacing-2)' }}>
      <Connections />
    </div>
  ),
};

/** The same grid right to left: the mark leads from the right, and each line is cut at its left end. */
export const TwoLineCellsRightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ width: 560 }}>
      <Connections />
    </div>
  ),
};

/** Narrow enough that the grid stacks its rows: the column's label stands on the value's line, not the mark's foot. */
export const TwoLineCellsStacked: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <Connections />
    </div>
  ),
};

/** Both themes: the caption line in the secondary ink on each ground. */
export const TwoLineCellsBothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', maxWidth: 720 }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Connections />
        </div>
      ))}
    </div>
  ),
};
