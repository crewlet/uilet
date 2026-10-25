import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef } from 'react';
import {
  DataGrid,
  Stack,
  Text,
  countDataGridRows,
  useDataGridDriving,
  useShortcut,
  type DataGridColumn,
  type DataGridHandle,
} from '@crewlethq/ui';

/*
 * Which grid the keyboard drives, with two on one screen: the first with
 * rows until the reader points at the other. The keys are bound by the
 * story here, as an application binds them in its own keymap.
 */

const meta: Meta = {
  title: 'UI/DataGridDriving',
};

export default meta;
type Story = StoryObj;

interface Row {
  key: string;
  title: string;
}

const COLUMNS: DataGridColumn<Row>[] = [
  { key: 'key', header: 'Key', shrink: true, cell: (row) => row.key },
  { key: 'title', header: 'Title', cell: (row) => row.title },
];

function DrivenGrid({ label, rows }: { label: string; rows: Row[] }) {
  const handle = useRef<DataGridHandle>(null);
  const { driving, claim } = useDataGridDriving(countDataGridRows(rows, undefined) > 0);
  useShortcut({ keys: ['j'], onKey: () => handle.current?.step(1), enabled: driving });
  useShortcut({ keys: ['k'], onKey: () => handle.current?.step(-1), enabled: driving });
  return (
    <Stack gap={2}>
      <Text variant="caption">
        {label}: {driving ? 'takes j and k' : 'press a row here to drive it'}
      </Text>
      <DataGrid
        rows={rows}
        columns={COLUMNS}
        rowKey={(row: Row) => row.key}
        rowHref={(row: Row) => `#/work/${row.key}`}
        handleRef={handle}
        onPointerDown={claim}
      />
    </Stack>
  );
}

/** Two grids: j and k step the first until a pointer gesture on the second claims them. */
export const TwoGrids: Story = {
  render: () => (
    <Stack gap={5}>
      <DrivenGrid
        label="Open tasks"
        rows={[
          { key: 'ENG-12', title: 'Rotate the signing key' },
          { key: 'ENG-14', title: 'Audit the token grants' },
        ]}
      />
      <DrivenGrid
        label="Done this week"
        rows={[
          { key: 'ENG-9', title: 'Write the backup runbook' },
          { key: 'ENG-15', title: 'Move the storage quotas' },
        ]}
      />
    </Stack>
  ),
};
