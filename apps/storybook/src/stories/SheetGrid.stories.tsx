import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SheetColumnEditor, SheetGrid, SheetPendingEdits, type SheetColumn, type SheetEdit, type SheetRow, type SheetSort } from '@crewlethq/ui';
import { density } from '@crewlethq/tokens';
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
 * In a column of bounded height, a content-fit sheet gives way: a thousand
 * rows shrink to the room under the bar above them, so Add row sits on the
 * column's edge, and never below the 12rem floor the page sets.
 */
export const FitsItsColumn: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: 420,
        ['--crewlet-sheet-min-height' as string]: '12rem',
        ['--crewlet-sheet-max-height' as string]: 'none',
      }}
    >
      <p style={{ margin: 0 }}>A bar above the sheet</p>
      {/* No height of its own to stop at: the column is what bounds it. */}
      <LiveSheet start={manyRows(1_000)} fit="content" height={Number.MAX_SAFE_INTEGER} />
    </div>
  ),
};

/**
 * Scrolls only where it overflows: three rows of every column type in a box
 * narrower than the columns scroll sideways, and not down, even where the
 * platform's scrollbar takes room in the layout; the short, narrow sheet
 * beside it, with Add column, scrolls neither way.
 */
export const ScrollsOnlyWhereItOverflows: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ width: 480 }}>
        <LiveSheet start={SHEET_ROWS.slice(0, 3)} fit="content" height={480} />
      </div>
      <div style={{ width: 640 }}>
        <ShapingSheet />
      </div>
    </div>
  ),
};

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

/**
 * Opens scrolled to the given row, so a story can show a stretch deep in a
 * long sheet: row 995 to row 1010, where the numbers cross from three digits
 * to four.
 */
function ScrolledTo({ row, children }: { row: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = box.current?.querySelector<HTMLElement>('.crewlet-sheet-grid__scroller');
    const probe = box.current?.querySelector<HTMLElement>('.crewlet-sheet-grid__probe');
    if (scroller && probe) scroller.scrollTop = (row - 1) * probe.offsetHeight;
  }, [row]);
  return <div ref={box}>{children}</div>;
}

/**
 * THE ROW GUTTER. Each row's number sits centred in a fixed-width gutter, in
 * the tertiary ink and tabular figures, so row 9 and row 1000 stand in one
 * column. Where the host takes row actions, the number gives way, in the same
 * place, to the actions button at the small icon button step, with a tooltip
 * and the name "Actions for row N":
 *
 * - under the pointer (hover any row);
 * - on the row holding focus (press a cell, then move with the arrows);
 * - while its menu is open (Shift+F10 from any cell of the row);
 * - on a touch screen, a tap on the number opens the menu.
 *
 * A selection marks its rows' numbers as it marks its cells (Shift with an
 * arrow), on an opaque ground, so the gutter and the frozen column stay solid
 * over the values scrolling under them when the sheet scrolls sideways. The
 * sheet on the right opens at row 995, where the numbers cross to four digits.
 */
export const RowGutter: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}>
      <LiveSheet height={360} />
      <ScrolledTo row={995}>
        <LiveSheet start={manyRows(1_200)} height={360} />
      </ScrolledTo>
    </div>
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

/**
 * A sheet shaped in place: a press on a header (or Enter on it) opens that
 * column's settings in a popover, and Add column, after the last header,
 * appends one and opens it. Every change redraws the grid at once, which is
 * how a new sheet is shaped before it is made.
 */
function ShapingSheet() {
  const [columns, setColumns] = useState<SheetColumn[]>([
    { field: 'item', label: 'Item', type: 'text', frozen: true, required: true },
    { field: 'owner', label: 'Owner', type: 'person' },
  ]);
  const [rows, setRows] = useState<SheetRow[]>([
    { id: 'r1', values: { item: 'Pricing page copy', owner: 'seat:maya' } },
    { id: 'r2', values: { item: 'Status page', owner: null } },
  ]);
  const [open, setOpen] = useState<string | null>(null);
  const counter = useRef(columns.length);
  return (
    <SheetGrid
      label="Launch checklist"
      columns={columns}
      rows={rows}
      people={SHEET_PEOPLE}
      fit="content"
      onEdit={(edits) => setRows((now) => apply(now, edits))}
      onAddRow={() => setRows((now) => [...now, { id: `r${now.length + 1}`, values: {} }])}
      settingsColumn={open}
      onSettingsColumnChange={setOpen}
      onAddColumn={() => {
        counter.current += 1;
        const field = `column_${counter.current}`;
        setColumns((now) => [...now, { field, label: `Column ${counter.current}`, type: 'text' }]);
        setOpen(field);
      }}
      renderColumnEditor={(column, close) => {
        const at = columns.findIndex((c) => c.field === column.field);
        return (
          <SheetColumnEditor
            column={column}
            selectName
            onChange={(next) => setColumns((now) => now.map((c) => (c.field === next.field ? next : c)))}
            onDone={close}
            typeLockedReason={at === 0 ? 'Every row is named by this column, so it stays text.' : undefined}
            suggestedType={/date|due/i.test(column.label) ? 'date' : undefined}
            onMove={(step) =>
              setColumns((now) => {
                const next = [...now];
                const [moved] = next.splice(at, 1);
                next.splice(at + step, 0, moved!);
                return next;
              })
            }
            canMoveBefore={at > 1}
            canMoveAfter={at > 0 && at < columns.length - 1}
            onDelete={() => {
              setColumns((now) => now.filter((c) => c.field !== column.field));
              close();
            }}
            deleteDisabledReason={at === 0 ? 'A sheet keeps the column its rows are named by.' : undefined}
          />
        );
      }}
    />
  );
}

export const ShapeColumns: Story = { render: () => <ShapingSheet /> };

/**
 * Add column at all three densities. Its track is the small control's square
 * plus an inset on each side, so the square sits inside the header's end
 * with room around it rather than filling it edge to edge.
 */
export const AddColumnEveryDensity: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['compact', 'normal', 'comfortable'] as const).map((step) => (
        <div key={step} style={{ ['--density' as string]: density[step] }}>
          <div style={{ marginBottom: 'var(--spacing-2)' }}>{step}</div>
          <ShapingSheet />
        </div>
      ))}
    </div>
  ),
};

/** The settings panel on its own, for a column of each kind of setting: a status with its categories. */
export const ColumnSettings: Story = {
  render: function Render() {
    const [column, setColumn] = useState<SheetColumn>({
      field: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { id: 'todo', label: 'Not started', category: 'todo' },
        { id: 'doing', label: 'In progress', category: 'in_progress' },
        { id: 'done', label: 'Done', category: 'done' },
      ],
    });
    return (
      <div style={{ width: 300, padding: 12, border: '1px solid var(--color-border-default)', borderRadius: 8 }}>
        <SheetColumnEditor column={column} onChange={setColumn} onDone={() => {}} onDelete={() => {}} onMove={() => {}} />
      </div>
    );
  },
};

/**
 * A number column with its own bounds, decimals and format. Pick another type
 * and they go: the column keeps its name, width and Required, and nothing its
 * old type set (`retypeColumn`).
 */
export const ColumnSettingsRetype: Story = {
  render: function Render() {
    const [column, setColumn] = useState<SheetColumn>({
      field: 'budget',
      label: 'Budget',
      type: 'number',
      width: 140,
      required: true,
      min: 0,
      precision: 2,
      numberStyle: 'currency',
      currency: 'EUR',
    });
    return (
      <div style={{ display: 'grid', gap: 12, width: 300 }}>
        <div style={{ padding: 12, border: '1px solid var(--color-border-default)', borderRadius: 8 }}>
          <SheetColumnEditor column={column} onChange={setColumn} onDone={() => {}} onDelete={() => {}} onMove={() => {}} />
        </div>
        <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(column, null, 2)}</pre>
      </div>
    );
  },
};
