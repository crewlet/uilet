import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AvatarStack,
  IconButton,
  OrgTable,
  OrgTableActions,
  OrgTableAdd,
  OrgTableName,
  Select,
  StatusDot,
  type SelectOption,
  type TreeGridColumn,
  type TreeGridContext,
  type TreeInput,
} from '@crewlethq/ui';
import { ProductMark } from '@crewlethq/icons';
import { CpuGlyph, GripVerticalGlyph, LayersGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';
import { BothThemes } from '../BothThemes';

/**
 * UI / OrgTable rows: the pieces a table of groups and their members draws.
 *
 * - Faces in a row (`AvatarStack`), cut out of the row's own ground at rest,
 *   on hover and on the selected row.
 * - An add beside a group's name that keeps its face (`OrgTableAdd onAdd`).
 * - A control strip sized to two controls (`OrgTableActions slots={2}`).
 * - A last column that asks for `align: 'left'` and keeps it.
 * - A mark in its own colours (`OrgTableName iconTone="own"`) and a quiet
 *   picker on the column's x with its statuses in one column
 *   (`Select inset="flush" hintColumn="fit"`).
 * - A press on a row draws no focus ring; a key brings it back.
 */
const meta: Meta = { title: 'UI/OrgTable Rows', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const FACES = [
  { name: 'Chief Technology', character: 'hexlet', hue: 'amber' },
  { name: 'Software Engineer', character: 'gemlet', hue: 'cyan' },
  { name: 'Jane Founder', kind: 'human' },
  { name: 'Product Lead', character: 'coglet', hue: 'purple' },
  { name: 'Designer', character: 'cloudlet', hue: 'rose' },
] as const;

const GROUPS: TreeInput[] = [
  {
    id: 'g:opus',
    label: 'Claude Opus',
    children: [
      { id: 'm:opus-main', label: 'opus-main' },
      { id: 'm:opus-team', label: 'opus-team' },
    ],
  },
  { id: 'g:sonnet', label: 'Claude Sonnet', children: [{ id: 'm:sonnet-main', label: 'sonnet-main' }] },
];

const GROUP_COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name', floor: '11rem', sortable: false },
  { key: 'status', header: 'Status', width: '6rem', sortable: false },
  { key: 'serving', header: 'Serving now', width: '6.625rem', sortable: false },
  {
    key: 'actions',
    header: 'Actions',
    action: true,
    sortable: false,
    width: 'calc(var(--size-control-sm) * 2 + var(--spacing-1) + var(--spacing-3) * 2)',
  },
];

function groupCell(id: string, column: number, grid: TreeGridContext): ReactNode {
  const key = grid.columnKey(column);
  const group = id.startsWith('g:');
  const name = id.slice(2);
  if (key === 'name')
    return group ? (
      <OrgTableName
        icon={<LayersGlyph size="sm" />}
        name={name === 'opus' ? 'Claude Opus' : 'Claude Sonnet'}
        nameAction={<OrgTableAdd label={`Add members to ${name}`} placement="name" onAdd={() => {}} />}
      />
    ) : (
      <OrgTableName icon={<CpuGlyph size="sm" />} name={name} caption="claude-opus-4 · high" />
    );
  if (key === 'status')
    return <StatusDot tone={id === 'm:opus-team' ? 'warning' : 'success'}>{id === 'm:opus-team' ? 'Near' : 'Ready'}</StatusDot>;
  if (key === 'serving')
    return <AvatarStack size="xs" max={4} decorative members={group ? FACES : FACES.slice(0, 2)} />;
  if (key === 'actions')
    return (
      <OrgTableActions shown slots={2}>
        {group ? null : (
          <IconButton label={`Move ${name}`} icon={<GripVerticalGlyph size="sm" />} size="sm" variant="ghost" tabIndex={-1} />
        )}
        <IconButton label={`Remove ${name}`} icon={<TrashGlyph size="sm" />} size="sm" variant="ghost" />
      </OrgTableActions>
    );
  return null;
}

const MODELS: SelectOption[] = [
  { value: 'opus-main', label: 'opus-main', group: 'Models', hint: <StatusDot tone="success">Ready</StatusDot> },
  { value: 'opus-team', label: 'opus-team-plan', group: 'Models', hint: <StatusDot tone="warning">Sitting out</StatusDot> },
];

const CONSUMERS: TreeInput[] = [
  { id: 'assistant', label: 'Ask Crewlet' },
  { id: 'swe', label: 'Software Engineer' },
];

const CONSUMER_COLUMNS: TreeGridColumn[] = [
  { key: 'consumer', header: 'Consumers', floor: '13rem', sortable: false },
  { key: 'runs', header: 'Runs on', floor: '12rem', sortable: false },
  { key: 'status', header: 'Status', width: '10.5rem', align: 'left', sortable: false },
];

function consumerCell(id: string, column: number, grid: TreeGridContext): ReactNode {
  const key = grid.columnKey(column);
  if (key === 'consumer')
    return id === 'assistant' ? (
      <OrgTableName iconTone="own" icon={<ProductMark product="assistant" size={14} />} name="Ask Crewlet" />
    ) : (
      <OrgTableName icon={<CpuGlyph size="sm" />} name="Software Engineer" />
    );
  if (key === 'runs')
    return (
      <Select
        width="full"
        size="sm"
        appearance="quiet"
        inset="flush"
        hintColumn="fit"
        ariaLabel={`Model for ${id}`}
        value="opus-main"
        options={MODELS}
        onChange={() => {}}
      />
    );
  if (key === 'status') return <StatusDot tone="success">Running</StatusDot>;
  return null;
}

export const GroupsAndMembers: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--spacing-5)', maxWidth: 760 }}>
        <OrgTable
          label="Groups and their members"
          layout="container"
          phoneRows="labelled"
          controls={false}
          columns={GROUP_COLUMNS}
          rows={GROUPS}
          selectedId="m:opus-main"
          renderCell={groupCell}
          cellHasControl={(_id, _column, key) => key === 'actions' || key === 'name'}
        />
        <OrgTable
          label="Who runs on which model"
          layout="container"
          controls={false}
          columns={CONSUMER_COLUMNS}
          rows={CONSUMERS}
          renderCell={consumerCell}
          cellHasControl={(_id, _column, key) => key === 'runs'}
        />
      </div>
    </BothThemes>
  ),
};
