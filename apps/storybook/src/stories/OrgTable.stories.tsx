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
  type OrgTableTone,
  type TreeGridColumn,
  type TreeGridContext,
  type TreeInput,
} from '@crewlethq/ui';
import {
  AccountTreeGlyph,
  ApartmentGlyph,
  CreateNewFolderGlyph,
  DeleteGlyph,
  EditGlyph,
  MoreVertGlyph,
  PersonAddGlyph,
  PersonGlyph,
  SmartToyGlyph,
} from '@crewlethq/icons/glyphs';

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

const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', width: 'minmax(0, 3fr)' },
  { key: 'handle', header: 'Handle', width: 'minmax(0, 2fr)' },
  { key: 'lead', header: 'Lead or reports to', width: 'minmax(0, 2fr)' },
  { key: 'problems', header: 'Problems', width: 'minmax(0, 1fr)' },
  { key: 'actions', header: 'Actions', headerHidden: true, width: 'auto' },
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

const ICONS: Record<Kind, typeof PersonGlyph> = {
  company: ApartmentGlyph,
  unit: AccountTreeGlyph,
  agent: SmartToyGlyph,
  human: PersonGlyph,
};

function Demo() {
  const rows = useMemo(forest, []);
  const [selected, setSelected] = useState<string>('unit:eng');
  const [added, setAdded] = useState<string | null>(null);

  const cell = (id: string, column: number, grid: TreeGridContext) => {
    const entity = ENTITIES[id]!;
    const Icon = ICONS[entity.kind];
    if (column === 1) {
      return (
        <OrgTableName
          icon={<Icon />}
          iconRing={entity.kind === 'human' ? 'dashed' : 'none'}
          name={entity.name}
          caption={entity.caption}
          tone={entity.tone}
        />
      );
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
                icon: <CreateNewFolderGlyph />,
                onSelect: () => setAdded(`a unit in ${entity.name}`),
              },
              {
                key: 'agent',
                label: 'Add an agent seat',
                icon: <SmartToyGlyph />,
                onSelect: () => setAdded(`an agent seat in ${entity.name}`),
              },
              {
                key: 'human',
                label: 'Add a human seat',
                icon: <PersonAddGlyph />,
                onSelect: () => setAdded(`a human seat in ${entity.name}`),
              },
            ]}
          />
        )}
        <OrgTableActions>
          <IconButton size="sm" label={`Edit ${entity.name}`} icon={<EditGlyph />} />
          {entity.kind !== 'company' && (
            <IconButton
              size="sm"
              variant="ghost-danger"
              label={`Delete ${entity.name}`}
              icon={<DeleteGlyph />}
            />
          )}
          <Menu
            label="Row actions"
            icon={<MoreVertGlyph />}
            align="end"
            open={grid.menuOpen(id)}
            onOpenChange={(open) => grid.setMenuOpen(id, open)}
            items={[
              { key: 'edit', label: 'Edit', icon: <EditGlyph />, onSelect: () => {} },
              { key: 'move', label: 'Move to', icon: <AccountTreeGlyph />, onSelect: () => {} },
              { kind: 'separator', key: 'sep' },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteGlyph />,
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
