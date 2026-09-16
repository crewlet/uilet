import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Menu, TreeGrid, type TreeGridColumn, type TreeGridContext, type TreeInput } from '@crewlethq/ui';

/**
 * UI / TreeGrid.
 *
 * A hierarchy as rows and columns: the view a keyboard or a screen reader user
 * works fastest in, and the one a narrow screen falls back to.
 *
 * Try it: Up and Down walk the rows, Right opens a closed row and then steps
 * into its cells, Left steps back out and climbs, Home and End jump, typing a
 * name finds a row, and the ContextMenu key opens the focused row's actions. A
 * cell holding a control focuses the control, so what it does is one Enter
 * away, and the grid keeps exactly one tab stop wherever focus actually is.
 */
const meta: Meta<typeof TreeGrid> = {
  title: 'UI/TreeGrid',
  component: TreeGrid,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof TreeGrid>;

type Kind = 'company' | 'unit' | 'seat';
interface Entity {
  name: string;
  kind: Kind;
  parent: string | null;
  handle?: string;
  lead?: string;
  problems?: number;
}

const COMPANY = 'company:nimbus';
const ENTITIES: Record<string, Entity> = {
  [COMPANY]: { name: 'Nimbus', kind: 'company', parent: null },
  'seat:ceo': { name: 'Chief Executive', kind: 'seat', parent: COMPANY, handle: '@ceo', lead: 'No manager' },
  'unit:eng': { name: 'Engineering', kind: 'unit', parent: COMPANY, lead: 'VP Engineering' },
  'seat:vp': { name: 'VP Engineering', kind: 'seat', parent: 'unit:eng', handle: '@vp-engineering', lead: 'Chief Executive' },
  'seat:dev': { name: 'Software Engineer', kind: 'seat', parent: 'unit:eng', handle: '@software-engineer', lead: 'VP Engineering', problems: 1 },
  'unit:platform': { name: 'Platform', kind: 'unit', parent: 'unit:eng', lead: 'No lead' },
  'seat:sre': { name: 'Reliability', kind: 'seat', parent: 'unit:platform', handle: '@reliability', lead: 'VP Engineering' },
  'unit:sales': { name: 'Sales', kind: 'unit', parent: COMPANY, lead: 'No lead' },
  'seat:ae': { name: 'Account Executive', kind: 'seat', parent: 'unit:sales', handle: '@account-executive', lead: 'Chief Executive' },
};

const ADD = 'add:';
const addId = (parent: string) => `${ADD}${parent}`;
const addParent = (id: string) => (id.startsWith(ADD) ? id.slice(ADD.length) : null);

const ADD_BUTTONS = ['Add agent seat', 'Add human seat', 'Add unit'];

const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', width: 'minmax(0, 3fr)' },
  { key: 'kind', header: 'Kind or type', width: 'minmax(0, 1.5fr)' },
  { key: 'handle', header: 'Handle', width: 'minmax(0, 1.5fr)' },
  { key: 'lead', header: 'Lead or reports to', width: 'minmax(0, 2fr)' },
  { key: 'problems', header: 'Problems', width: 'minmax(0, 1fr)' },
  { key: 'actions', header: 'Actions', headerHidden: true, width: 'var(--size-control-md)' },
];

function rowsOf(withAddRows: boolean): TreeInput[] {
  const node = (id: string): TreeInput => {
    const children = Object.keys(ENTITIES)
      .filter((child) => ENTITIES[child]!.parent === id)
      .map(node);
    // An empty label: type ahead finds rows by the name a person reads, and an
    // add row names nothing.
    if (withAddRows && ENTITIES[id]!.kind !== 'seat') children.push({ id: addId(id), label: '' });
    return { id, label: ENTITIES[id]!.name, children };
  };
  return [node(COMPANY)];
}

function Outline({ readOnly = false }: { readOnly?: boolean }) {
  const [selected, setSelected] = useState<string | null>('seat:dev');
  const rows = useMemo(() => rowsOf(!readOnly), [readOnly]);

  const renderCell = (id: string, column: number, grid: TreeGridContext) => {
    const parent = addParent(id);
    if (parent !== null) {
      const which = ADD_BUTTONS[column - 1]!;
      return (
        <Button size="small" variant="tertiary" tabIndex={grid.tabStop(id, column) ? 0 : -1} onClick={() => {}}>
          {which}
        </Button>
      );
    }
    const entity = ENTITIES[id]!;
    switch (column) {
      case 1:
        return <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</span>;
      case 2:
        return entity.kind === 'seat' ? 'Agent seat' : entity.kind === 'unit' ? 'Unit' : 'Company';
      case 3:
        return entity.handle ? <span style={{ fontFamily: 'var(--font-family-mono)' }}>{entity.handle}</span> : null;
      case 4:
        return entity.kind === 'unit' && !readOnly ? (
          <Menu
            label={`Lead of ${entity.name}`}
            trigger={entity.lead ?? 'No lead'}
            items={[
              { key: 'none', label: 'No lead', checked: entity.lead === 'No lead', onSelect: () => {} },
              { key: 'vp', label: 'VP Engineering', checked: entity.lead === 'VP Engineering', onSelect: () => {} },
            ]}
            triggerTabIndex={grid.tabStop(id, column) ? 0 : -1}
            onOpenChange={(open) => open && grid.opened(id, column)}
          />
        ) : (
          (entity.lead ?? null)
        );
      case 5:
        return entity.problems ? (
          <span
            style={{
              padding: '1px var(--spacing-2)',
              borderRadius: 'var(--radius-pill)',
              fontSize: 'var(--font-size-2xs)',
              color: 'var(--color-feedback-danger-ink)',
              background: 'var(--color-feedback-danger-soft)',
            }}
          >
            {`${entity.problems} problem`}
          </span>
        ) : null;
      default:
        return (
          <Menu
            label={`Actions for ${entity.name}`}
            items={[
              { key: 'edit', label: 'Edit', onSelect: () => {} },
              { key: 'move', label: 'Move to', onSelect: () => {} },
              { kind: 'separator', key: 'sep' },
              { key: 'delete', label: 'Delete', danger: true, onSelect: () => {} },
            ]}
            triggerTabIndex={grid.tabStop(id, column) ? 0 : -1}
            open={grid.menuOpen(id)}
            onOpenChange={(open) => {
              if (open) grid.opened(id, column);
              grid.setMenuOpen(id, open);
            }}
          />
        );
    }
  };

  return (
    <TreeGrid
      label="Organization outline"
      columns={COLUMNS}
      rows={rows}
      renderCell={renderCell}
      cellHasControl={(id, column) =>
        addParent(id) !== null || column === 6 || (column === 4 && ENTITIES[id]?.kind === 'unit' && !readOnly)
      }
      addRow={(id) => {
        const parent = addParent(id);
        return parent === null ? null : { label: `Add to ${ENTITIES[parent]!.name}`, cells: ADD_BUTTONS.length };
      }}
      hasRowMenu={() => true}
      onRowKey={() => true}
      selectedId={selected}
      onSelect={setSelected}
      readOnly={readOnly}
    />
  );
}

/**
 * An add row closes the company's rows and each unit's. It is a row of the
 * grid like any other, so it counts in its siblings' position and set size; it
 * just holds controls rather than a node's own data.
 */
export const Default: Story = { render: () => <Outline /> };

/**
 * Narrower than the grid's minimum width, so it scrolls sideways in its own
 * box and the page does not.
 *
 * The menus open in a layer OVER that box: a box that scrolls on one axis
 * clips on both, so a menu drawn under a trigger in the last rows would be cut
 * off and would scroll the grid down instead of opening. Scroll sideways with
 * one open and watch it follow its trigger, then leave with it.
 */
export const ScrollsSideways: Story = {
  render: () => (
    <div style={{ width: 520, maxWidth: '100%' }}>
      <Outline />
    </div>
  ),
};

/** Read only: no add rows, no lead to choose, and the grid says so. */
export const ReadOnly: Story = { render: () => <Outline readOnly /> };
