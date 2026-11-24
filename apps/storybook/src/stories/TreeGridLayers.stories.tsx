import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  ConfirmModal,
  IconButton,
  Menu,
  OrgTable,
  OrgTableActions,
  OrgTableName,
  type TreeGridColumn,
  type TreeGridContext,
  type TreeInput,
} from '@crewlethq/ui';
import { EllipsisGlyph, LayersGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / TreeGrid layers: what a row opens.
 *
 * A dialog opened from a cell sits over the screen, centred, never inside the
 * table; a row's menu opens beside its button in the table's own layer. The
 * row under the pointer is the one highlighted, a menu opened by a press lights
 * nothing until the pointer or a key moves, and a disabled row never lights.
 */
const meta: Meta = { title: 'UI/TreeGrid layers', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const ROWS: TreeInput[] = [
  { id: 'advisor', label: 'Advisor' },
  { id: 'default-fleet', label: 'default-fleet' },
];

const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', floor: '12rem', sortable: false },
  { key: 'runs', header: 'Runs on', floor: '10rem', sortable: false },
  {
    key: 'actions',
    header: 'Actions',
    action: true,
    sortable: false,
    width: 'calc(var(--size-control-sm) + var(--spacing-3) * 2)',
  },
];

function MoveButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
        Fleet · default-fleet
      </Button>
      <ConfirmModal
        open={open}
        title={`Move ${name} to Fleet · default-fleet?`}
        message={`${name} runs on default-fleet from its next turn.`}
        confirmLabel="Move"
        onConfirm={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function RowMenu({ name }: { name: string }) {
  return (
    <OrgTableActions shown slots={1}>
      <Menu
        label={`Actions for ${name}`}
        align="end"
        activeDescendant
        entrance="instant"
        renderTrigger={(props) => (
          <IconButton {...props} label={`Actions for ${name}`} icon={<EllipsisGlyph size="sm" />} size="sm" variant="ghost" />
        )}
        items={[
          { key: 'settings', label: 'Settings', onSelect: () => {} },
          { key: 'rename', label: 'Rename', onSelect: () => {} },
          { kind: 'separator' as const, key: 'sep' },
          {
            key: 'delete',
            label: 'Delete fleet',
            danger: true,
            disabled: true,
            hint: "The default fleet can't be deleted",
            onSelect: () => {},
          },
        ]}
      />
    </OrgTableActions>
  );
}

function cell(id: string, column: number, grid: TreeGridContext): ReactNode {
  const key = grid.columnKey(column);
  const name = id === 'advisor' ? 'Advisor' : 'default-fleet';
  if (key === 'name') return <OrgTableName icon={<LayersGlyph size="sm" />} name={name} />;
  if (key === 'runs') return <MoveButton name={name} />;
  if (key === 'actions') return <RowMenu name={name} />;
  return null;
}

/** A row's button opens a confirm (centred on the screen); its "More actions" menu opens beside it. */
export const RowDialogAndMenu: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <OrgTable
        label="Who runs on which model"
        layout="container"
        controls={false}
        columns={COLUMNS}
        rows={ROWS}
        renderCell={cell}
        cellHasControl={(_id, _column, key) => key === 'runs' || key === 'actions'}
      />
    </div>
  ),
};
