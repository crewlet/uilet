import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { SheetGrid, SheetPendingEdits, type SheetEdit, type SheetRow, type SheetSort } from '@crewlethq/ui';
import { SHEET_COLUMNS, SHEET_PEOPLE, SHEET_PRESENCE, SHEET_ROWS, manyRows } from '../fixtures/sheet.js';

const meta: Meta<typeof SheetGrid> = {
  title: 'UI/SheetGrid',
  component: SheetGrid,
};

export default meta;
type Story = StoryObj<typeof SheetGrid>;

/**
 * A host that writes every edit at once and confirms it after a beat: the
 * honest instant edit (D23). A value is drawn straight away, underlined dashed
 * and described as Saving, and turns solid when the "engine" answers. A Score
 * over 9 is refused by the engine here, to show a refusal reverting the cell
 * and saying why on it.
 */
function LiveSheet({ start = SHEET_ROWS, height = 360, ...rest }: { start?: SheetRow[]; height?: number } & Partial<Parameters<typeof SheetGrid>[0]>) {
  const [rows, setRows] = useState(start);
  const [sort, setSort] = useState<SheetSort | null>(null);
  const [, redraw] = useState(0);
  const edits = useMemo(() => {
    const tracker = new SheetPendingEdits();
    tracker.subscribe(() => redraw((n) => n + 1));
    return tracker;
  }, []);
  const write = (batch: readonly SheetEdit[]) => {
    const before = rows;
    setRows((current) => apply(current, batch));
    for (const edit of batch) {
      const settle = edits.begin(edit.rowId, edit.field);
      window.setTimeout(() => {
        if (edit.field === 'score' && typeof edit.value === 'number' && edit.value > 9) {
          setRows((current) => apply(current, [{ ...edit, value: before.find((row) => row.id === edit.rowId)?.values['score'] as number }]));
          settle({ ok: false, message: 'Scores above 9 need a second reviewer.' });
        } else {
          settle({ ok: true });
        }
      }, 900);
    }
  };
  return (
    <SheetGrid
      label="Vendor scorecard"
      columns={SHEET_COLUMNS}
      rows={edits.decorate(rows)}
      people={SHEET_PEOPLE}
      sort={sort}
      onSortChange={setSort}
      onEdit={write}
      onAddRow={() => setRows((current) => [...current, { id: `new-${current.length}`, values: { vendor: `New vendor ${current.length + 1}` } }])}
      onShowHistory={(cell) => window.alert(`History of ${cell.field} on ${cell.rowId}`)}
      sync={edits.sync()}
      onDismissRefused={() => edits.dismissAll()}
      onDeleteRow={(rowId) => setRows((current) => current.filter((row) => row.id !== rowId))}
      height={height}
      {...rest}
    />
  );
}

function apply(rows: readonly SheetRow[], edits: readonly SheetEdit[]): SheetRow[] {
  return rows.map((row) => {
    const mine = edits.filter((edit) => edit.rowId === row.id);
    if (mine.length === 0) return row;
    const values = { ...row.values };
    for (const edit of mine) values[edit.field] = edit.value;
    return { ...row, values };
  });
}

/** Every column type, editable, with the keyboard of a spreadsheet. Try typing on a cell, Enter, Escape, Space on a checkbox, Mod+C and Mod+V. */
export const EveryCellType: Story = { render: () => <LiveSheet /> };

/** The same sheet for a reader who can view but not edit: every edit is refused with the sheet's own words. */
export const ReadOnly: Story = {
  render: () => <SheetGrid label="Vendor scorecard" columns={SHEET_COLUMNS} rows={SHEET_ROWS} people={SHEET_PEOPLE} mode="read" height={320} />,
};

/** Cells the engine has not confirmed yet, drawn as Saving, and the strip that counts them. */
export const Pending: Story = {
  render: () => (
    <SheetGrid
      label="Vendor scorecard"
      columns={SHEET_COLUMNS}
      rows={SHEET_ROWS.map((row) => (row.id === 'acme' ? { ...row, pending: ['score', 'approved'] } : row))}
      people={SHEET_PEOPLE}
      onEdit={() => {}}
      sync={{ saving: 2 }}
      height={320}
    />
  ),
};

/** A refused edit, reverted, with the reason on the cell; and the strip after a failed write, with Retry. */
export const Refused: Story = {
  render: () => (
    <SheetGrid
      label="Vendor scorecard"
      columns={SHEET_COLUMNS}
      rows={SHEET_ROWS.map((row) => (row.id === 'globex' ? { ...row, refused: { score: 'You can view this sheet but not edit it.' } } : row))}
      people={SHEET_PEOPLE}
      onEdit={() => {}}
      sync={{ saving: 0, failed: 1 }}
      onRetry={() => {}}
      height={320}
    />
  ),
};

/** A refused edit held in the strip as "1 change not saved" until the reader dismisses it. */
export const RefusedHeld: Story = {
  render: () => (
    <SheetGrid
      label="Vendor scorecard"
      columns={SHEET_COLUMNS}
      rows={SHEET_ROWS.map((row) => (row.id === 'globex' ? { ...row, refused: { score: 'It changed since it was read.' } } : row))}
      people={SHEET_PEOPLE}
      onEdit={() => {}}
      sync={{ saving: 0, refused: 1 }}
      onDismissRefused={() => {}}
      height={320}
    />
  ),
};

/**
 * As tall as its rows (`fit="content"`): no empty bordered slab under the last
 * row, and Add row right under it. Hover a row's number, or press Shift+F10
 * on a cell, for its actions; the host confirms a delete.
 */
export const FitContent: Story = { render: () => <LiveSheet fit="content" height={480} /> };

/**
 * A remote write landing on the cell being edited. Press Enter on Globex's
 * Score to edit it: two seconds later Maya changes it to 6.5, and the editor
 * stays open and names her.
 */
export const Conflict: Story = {
  render: function Render() {
    const [rows, setRows] = useState(SHEET_ROWS);
    return (
      <SheetGrid
        label="Vendor scorecard"
        columns={SHEET_COLUMNS}
        rows={rows}
        people={SHEET_PEOPLE}
        onEdit={(edits) => setRows((current) => apply(current, edits))}
        onEditingChange={(cell) => {
          if (cell?.rowId === 'globex' && cell.field === 'score') {
            window.setTimeout(() => {
              setRows((current) =>
                apply(current, [{ rowId: 'globex', field: 'score', value: 6.5 }]).map((row) =>
                  row.id === 'globex' ? { ...row, changed: { score: { by: 'Maya', at: new Date(), previous: 6.8 } } } : row,
                ),
              );
            }, 2000);
          }
        }}
        height={320}
      />
    );
  },
};

/** Collaborators on cells (D22): a ring in each one's hue and a flag with the name, dashed when idle, a pencil while editing. */
export const Presence: Story = {
  render: () => <LiveSheet presence={SHEET_PRESENCE} />,
};

/** Cells changed since the reader last looked: a corner mark, and a tooltip naming who, when and what it was. */
export const ChangedMarks: Story = {
  render: () => (
    <SheetGrid
      label="Vendor scorecard"
      columns={SHEET_COLUMNS}
      rows={SHEET_ROWS.map((row) =>
        row.id === 'acme'
          ? { ...row, changed: { score: { by: 'Maya Ortiz', at: '2026-10-17T10:42:00Z', previous: 6.8 }, status: { by: 'PM', at: '2026-10-17T11:05:00Z', previous: 'blocked' } } }
          : row,
      )}
      people={SHEET_PEOPLE}
      height={320}
    />
  ),
};

/** Ten thousand rows: only the rows in view are in the document. */
export const TenThousandRows: Story = {
  render: () => <LiveSheet start={manyRows(10_000)} height={480} />,
};

/**
 * The leading column stays in view while the sheet scrolls sideways, at a
 * phone's width, and once scrolled its trailing hairline turns strong: the
 * frozen edge the other columns pass under.
 */
export const MobileWidth: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <LiveSheet height={420} />
    </div>
  ),
};

/**
 * A sheet with its columns and no rows yet: the header keeps the shape the
 * rows will land in, and Add row sits right under it.
 */
export const NoRows: Story = {
  render: () => <LiveSheet start={[]} fit="content" />,
};

/**
 * Columns sized to what they hold: a status wide enough for its longest
 * choice, a checkbox for its long name, and a title column that stops at its
 * ceiling and ellipsises rather than pushing every other column away.
 */
export const FittedColumns: Story = {
  render: () => (
    <SheetGrid
      label="Launch gates"
      fit="content"
      columns={[
        { field: 'gate', label: 'Gate', type: 'text', frozen: true },
        {
          field: 'status',
          label: 'Status',
          type: 'status',
          options: [
            { id: 'ready', label: 'Ready', category: 'done' },
            { id: 'changes', label: 'Changes requested', category: 'blocked' },
          ],
        },
        { field: 'approved', label: 'Finance approved', type: 'checkbox' },
        { field: 'effort', label: 'Effort (days)', type: 'number' },
      ]}
      rows={[
        { id: 'g1', values: { gate: 'Settlement algorithm returns the fewest payments for every group', status: 'ready', approved: true, effort: 4 } },
        { id: 'g2', values: { gate: 'CSV import of a group\'s expenses', status: 'changes', approved: false, effort: 0.5 } },
      ]}
    />
  ),
};
