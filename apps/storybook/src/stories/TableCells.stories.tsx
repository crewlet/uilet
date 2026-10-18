import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  PrincipalAvatar,
  Table,
  TableDateCell,
  TableEntityCell,
  TableKeyCell,
  TableNumberCell,
  TableStatusCell,
  TableTagsCell,
  TableTextCell,
} from '@crewlethq/ui';
import { DatabaseGlyph } from '@crewlethq/icons/glyphs';

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
