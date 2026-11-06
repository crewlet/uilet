import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid, TableKeyCell, TableNumberCell, TableTextCell, type DataGridColumn } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * The data grid on a phone's compact row (open the story at a phone's width)
 * and a summary row an application reveals and marks. Drawn light over dark.
 */
const meta: Meta = {
  title: 'UI/Data grid sweep fixes',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

interface Task {
  id: string;
  key: string;
  title: string;
  tokens: number;
}

const TASKS: Task[] = [
  { id: 't1', key: 'MPL-7', title: 'Keep long phrase results inside the result card', tokens: 1_240_000 },
  { id: 't2', key: 'MPL-142', title: 'Draw a stored reaction as its glyph', tokens: 86_000 },
  { id: 't3', key: 'TSO-31', title: 'Take-down requests from rights holders', tokens: 4_100 },
];

const COLUMNS: DataGridColumn<Task>[] = [
  { key: 'key', header: 'Key', shrink: true, phoneLead: true, cell: (t) => <TableKeyCell value={t.key} /> },
  { key: 'title', header: 'Title', phoneLead: true, cell: (t) => <TableTextCell>{t.title}</TableTextCell> },
  { key: 'tokens', header: 'Tokens', align: 'right', cell: (t) => <TableNumberCell value={t.tokens} /> },
];

function Picking() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(['t2']));
  return (
    <DataGrid
      aria-label="Tasks"
      rows={TASKS}
      columns={COLUMNS}
      rowKey={(t) => t.id}
      phoneRows="compact"
      selection={{ selected, onChange: setSelected, rowLabel: (t) => `Select ${t.key}` }}
      summaryRows={[{ key: 'total', id: 'tasks-total', label: 'Total', cells: { tokens: <TableNumberCell value={1_330_100} /> }, selected: true }]}
    />
  );
}

/** At a phone's width: the box keeps its width, every title starts at one x. */
export const CompactRowsAndSummary: Story = {
  render: () => (
    <BothThemes>
      <Picking />
    </BothThemes>
  ),
};
