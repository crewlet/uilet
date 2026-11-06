import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  IconButton,
  Menu,
  OrgTable,
  OrgTableActions,
  OrgTableAdd,
  OrgTableName,
  Tag,
  type OrgTableSelection,
  type OrgTableTone,
  type TreeGridColumn,
  type TreeGridContext,
  type TreeInput,
} from '@crewlethq/ui';
import {
  BotGlyph,
  BuildingComplexGlyph,
  EllipsisVerticalGlyph,
  FolderPlusGlyph,
  NetworkGlyph,
  PencilGlyph,
  TrashGlyph,
  UserPlusGlyph,
} from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

/**
 * UI / OrgTable.
 *
 * An organization as an indented, editable table of rows: the console's own
 * org table, drawn on this package's treegrid.
 *
 * Try it: the wires down the gutter say where a row sits, Up and Down walk the
 * rows and Right steps into their cells, the plus at the end of a unit opens
 * into the kinds it can take (Escape closes it and gives focus back), and the
 * tab on the table's top edge opens or closes the whole hierarchy. The row's
 * own controls stay quiet until the row is reached, by the pointer, by focus
 * or by being the selected row.
 */
const meta: Meta<typeof OrgTable> = {
  title: 'UI/OrgTable',
  component: OrgTable,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof OrgTable>;

type Kind = 'company' | 'unit' | 'agent' | 'human';

interface Entity {
  name: string;
  kind: Kind;
  parent: string | null;
  caption: string;
  handle?: string;
  lead?: string;
  problems?: number;
  tone?: OrgTableTone;
}

const COMPANY = 'company:nimbus';
const ENTITIES: Record<string, Entity> = {
  [COMPANY]: { name: 'Nimbus', kind: 'company', parent: null, caption: 'Company' },
  'seat:ceo': {
    name: 'Chief Executive',
    kind: 'agent',
    parent: COMPANY,
    caption: 'Agent seat',
    handle: '@ceo',
    lead: 'No manager',
    tone: 'cyan',
  },
  'unit:eng': {
    name: 'Engineering',
    kind: 'unit',
    parent: COMPANY,
    caption: 'Department',
    lead: 'VP Engineering',
  },
  'seat:vp': {
    name: 'VP Engineering',
    kind: 'agent',
    parent: 'unit:eng',
    caption: 'Agent seat',
    handle: '@vp-engineering',
    lead: 'Chief Executive',
    tone: 'purple',
  },
  'seat:dev': {
    name: 'Software Engineer',
    kind: 'agent',
    parent: 'unit:eng',
    caption: 'Agent seat',
    handle: '@software-engineer',
    lead: 'VP Engineering',
    problems: 1,
    tone: 'amber',
  },
  'unit:platform': { name: 'Platform', kind: 'unit', parent: 'unit:eng', caption: 'Team', lead: 'No lead' },
  'seat:sre': {
    name: 'Reliability',
    kind: 'agent',
    parent: 'unit:platform',
    caption: 'Agent seat',
    handle: '@reliability',
    lead: 'VP Engineering',
    tone: 'green',
  },
  'seat:design': {
    name: 'Design Partner',
    kind: 'human',
    parent: 'unit:platform',
    caption: 'Human seat',
    handle: '@design-partner',
    lead: 'VP Engineering',
  },
  'unit:sales': { name: 'Sales', kind: 'unit', parent: COMPANY, caption: 'Department', lead: 'No lead' },
  'seat:ae': {
    name: 'Account Executive',
    kind: 'agent',
    parent: 'unit:sales',
    caption: 'Agent seat',
    handle: '@account-executive',
    lead: 'Chief Executive',
    tone: 'rose',
  },
};

/*
 * THE ACTIONS TRACK IS THE TABLE'S OWN FIXED ONE, never `auto`: every row is
 * a grid of its own, so an auto track was as wide as that row's controls (none
 * in the heading, the add and the strip on a unit, the strip alone on a seat)
 * and each kind of row started its Handle, Lead and Problems columns somewhere
 * else, none of them under its heading.
 */
const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', width: 'minmax(0, 3fr)' },
  { key: 'handle', header: 'Handle', width: 'minmax(0, 2fr)' },
  { key: 'lead', header: 'Lead or reports to', width: 'minmax(0, 2fr)' },
  { key: 'problems', header: 'Problems', width: 'minmax(0, 1fr)' },
  { key: 'actions', header: 'Actions', headerHidden: true, width: 'var(--crewlet-org-table-actions)' },
];

function forest(): TreeInput[] {
  const node = (id: string): TreeInput => ({
    id,
    label: ENTITIES[id]!.name,
    children: Object.keys(ENTITIES)
      .filter((child) => ENTITIES[child]!.parent === id)
      .map(node),
  });
  return [node(COMPANY)];
}

/* A container's glyph. A seat is drawn as its badge instead, whose outline is
   its kind: a squircle for an agent, a circle for a person. */
const ICONS: Record<'company' | 'unit', typeof NetworkGlyph> = {
  company: BuildingComplexGlyph,
  unit: NetworkGlyph,
};

function Demo({ shown = false }: { shown?: boolean }) {
  const rows = useMemo(forest, []);
  const [selected, setSelected] = useState<string>('unit:eng');
  const [added, setAdded] = useState<string | null>(null);

  const cell = (id: string, column: number, grid: TreeGridContext) => {
    const entity = ENTITIES[id]!;
    if (column === 1) {
      if (entity.kind === 'agent' || entity.kind === 'human') {
        return (
          <OrgTableName
            avatar={{ name: entity.name, kind: entity.kind }}
            name={entity.name}
            caption={entity.caption}
            tone={entity.tone}
          />
        );
      }
      const Icon = ICONS[entity.kind];
      return <OrgTableName icon={<Icon />} name={entity.name} caption={entity.caption} tone={entity.tone} />;
    }
    if (column === 2) return entity.handle ?? '';
    if (column === 3) return entity.lead ?? '';
    if (column === 4) {
      return entity.problems ? <Tag variant="danger">{entity.problems} problem</Tag> : null;
    }
    return (
      <>
        {/* The add is a SIBLING of the strip: it is drawn on every row that can
            take a child, where the controls that act on the row itself wait to
            be reached. */}
        {entity.kind !== 'agent' && entity.kind !== 'human' && (
          <OrgTableAdd
            label={`Add to ${entity.name}`}
            onOpen={() => grid.opened(id, column)}
            sections={[
              {
                key: 'unit',
                label: 'Add a unit',
                icon: <FolderPlusGlyph />,
                onSelect: () => setAdded(`a unit in ${entity.name}`),
              },
              {
                key: 'agent',
                label: 'Add an agent seat',
                icon: <BotGlyph />,
                onSelect: () => setAdded(`an agent seat in ${entity.name}`),
              },
              {
                key: 'human',
                label: 'Add a human seat',
                icon: <UserPlusGlyph />,
                onSelect: () => setAdded(`a human seat in ${entity.name}`),
              },
            ]}
          />
        )}
        <OrgTableActions shown={shown}>
          <IconButton size="sm" label={`Edit ${entity.name}`} icon={<PencilGlyph />} />
          {entity.kind !== 'company' && (
            <IconButton
              size="sm"
              variant="ghost-danger"
              label={`Delete ${entity.name}`}
              icon={<TrashGlyph />}
            />
          )}
          <Menu
            label="Row actions"
            icon={<EllipsisVerticalGlyph />}
            align="end"
            open={grid.menuOpen(id)}
            onOpenChange={(open) => grid.setMenuOpen(id, open)}
            items={[
              { key: 'edit', label: 'Edit', icon: <PencilGlyph />, onSelect: () => {} },
              { key: 'move', label: 'Move to', icon: <NetworkGlyph />, onSelect: () => {} },
              { kind: 'separator', key: 'sep' },
              {
                key: 'delete',
                label: 'Delete',
                icon: <TrashGlyph />,
                danger: true,
                onSelect: () => {},
              },
            ]}
          />
        </OrgTableActions>
      </>
    );
  };

  return (
    <>
      <OrgTable
        label="Organization"
        columns={COLUMNS}
        rows={rows}
        tone={(id) => ENTITIES[id]?.tone}
        cellHasControl={(_id, column) => column === 5}
        selectedId={selected}
        onSelect={setSelected}
        hasRowMenu={() => true}
        renderCell={cell}
      />
      <p aria-live="polite">{added ? `Would add ${added}.` : ''}</p>
    </>
  );
}

export const Playground: Story = { render: () => <Demo /> };

/**
 * Row actions drawn at rest (`OrgTableActions shown`), for a table whose rows
 * are edited as often as they are read: no hover or focus is needed to see them.
 */
export const ActionsAtRest: Story = {
  render: () => (
    <BothThemes>
      <Demo shown />
    </BothThemes>
  ),
};

/** Every seat under a row, the row itself for a seat. */
function seatsUnder(id: string): string[] {
  const entity = ENTITIES[id]!;
  if (entity.kind === 'agent' || entity.kind === 'human') return [id];
  return Object.keys(ENTITIES)
    .filter((child) => ENTITIES[child]!.parent === id)
    .flatMap(seatsUnder);
}

/** The agents a row's box picks: a seat's own, or every agent a team or the company holds. */
const agentsUnder = (id: string) => seatsUnder(id).filter((seat) => ENTITIES[seat]!.kind === 'agent');

const LIVE_COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', width: 'minmax(14rem, 3fr)' },
  { key: 'lead', header: 'Reports to', width: 'minmax(9rem, 1.2fr)', hideBelow: 760 },
  { key: 'problems', header: 'Problems', width: 'minmax(6.5rem, 1fr)', hideBelow: 640 },
  { key: 'actions', header: 'Edit', width: 'calc(var(--crewlet-org-table-strip) + var(--spacing-2) * 2)' },
];

/** A container-width table with a box before every name that can pick an agent. */
function Picking() {
  const rows = useMemo(forest, []);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['seat:dev']));
  const selection: OrgTableSelection = {
    checked: (id) => {
      const agents = agentsUnder(id);
      if (agents.length === 0) return null;
      const on = agents.filter((agent) => picked.has(agent)).length;
      return on === 0 ? false : on === agents.length ? true : 'mixed';
    },
    label: (id) =>
      ENTITIES[id]!.kind === 'agent' ? `Select ${ENTITIES[id]!.name}` : `Select every agent in ${ENTITIES[id]!.name}`,
    onCheckedChange: (id, on) =>
      setPicked((was) => {
        const next = new Set(was);
        for (const agent of agentsUnder(id)) {
          if (on) next.add(agent);
          else next.delete(agent);
        }
        return next;
      }),
  };
  const cell = (id: string, column: number, grid: TreeGridContext) => {
    const entity = ENTITIES[id]!;
    const key = grid.columnKey(column);
    if (key === 'name') {
      const seat = entity.kind === 'agent' || entity.kind === 'human';
      const caption = grid.shown('lead') || !entity.lead ? entity.caption : `${entity.caption} · ${entity.lead}`;
      return seat ? (
        <OrgTableName avatar={{ name: entity.name, kind: entity.kind as 'agent' | 'human' }} name={entity.name} caption={caption} tone={entity.tone} />
      ) : (
        <OrgTableName icon={entity.kind === 'company' ? <BuildingComplexGlyph /> : <NetworkGlyph />} name={entity.name} caption={caption} tone={entity.tone} />
      );
    }
    if (key === 'lead') return entity.lead ?? '';
    if (key === 'problems') return entity.problems ? <Tag variant="danger">{entity.problems} problem</Tag> : null;
    return (
      <OrgTableActions shown>
        <IconButton size="sm" label={`Edit ${entity.name}`} icon={<PencilGlyph />} tabIndex={grid.tabStop(id, column) ? 0 : -1} />
      </OrgTableActions>
    );
  };
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-2)' }}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{picked.size} picked</span>
      <OrgTable
        label="Organization"
        layout="container"
        controls={false}
        columns={LIVE_COLUMNS}
        rows={rows}
        tone={(id) => ENTITIES[id]?.tone}
        selection={selection}
        cellHasControl={(_id, _column, key) => key === 'actions'}
        renderCell={cell}
      />
    </div>
  );
}

/**
 * A select box before every name (`selection`), after the row's indent, in a
 * slot every row keeps: a team's or the company's box picks every agent it
 * holds and shows a part pick as mixed, and a person's row keeps the slot
 * empty so the names stay in line. The table fits its container
 * (`layout="container"`): drag a box's corner and the columns its width
 * cannot hold are left out, Reports to moving into the caption, while the
 * indent steps in so a nested name keeps its room.
 */
export const SelectionAndContainerWidth: Story = {
  render: () => (
    <BothThemes>
      <div style={{ resize: 'horizontal', overflow: 'auto', width: 880, minWidth: 320, maxWidth: '100%' }}>
        <Picking />
      </div>
    </BothThemes>
  ),
};
