import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  DataView,
  DataViewToolbar,
  FilterAxisBar,
  Tag,
  type DataViewColumn,
  type DataViewSortState,
  type FilterDef,
  type FilterValues,
} from '@crewlethq/ui';
import { AddGlyph, ArrowDownwardGlyph } from '@crewlethq/icons/glyphs';

/*
 * The list screen, whole and in parts.
 *
 * Every screen in the product that shows rows of records is this: a header,
 * then ONE panel holding the toolbar, the chips for the filters a reader
 * added, and the rows.
 * The toolbar sits in the table's own toolbar row, beside the table's settings
 * cog, and the chips in the band between that row and the rows: a list screen
 * is one object, not a bar over a bar over a table. The stories below are the
 * composite first, because that is what a screen renders, then each part on
 * its own for a screen that needs only one of them.
 *
 * The data is synthetic and domain agnostic on purpose: what these show is a
 * pattern, not a product.
 */
const meta: Meta<typeof DataView> = {
  title: 'UI/DataView',
  component: DataView,
};

export default meta;
type Story = StoryObj<typeof DataView>;

interface Operator {
  id: string;
  email: string;
  role: string;
  lastSeen: string;
  grantedBy: string;
  revokedAt: string | null;
}

const OPERATORS: Operator[] = [
  { id: '1', email: 'jane@example.com', role: 'owner', lastSeen: '2026-09-13T08:15:00Z', grantedBy: 'bootstrap', revokedAt: null },
  { id: '2', email: 'alex@example.com', role: 'admin', lastSeen: '2026-09-12T17:40:00Z', grantedBy: 'jane@example.com', revokedAt: null },
  { id: '3', email: 'sam@example.com', role: 'support', lastSeen: '2026-09-01T11:05:00Z', grantedBy: 'jane@example.com', revokedAt: null },
  { id: '4', email: 'robin@example.com', role: 'viewer', lastSeen: '2026-08-20T09:30:00Z', grantedBy: 'alex@example.com', revokedAt: null },
  { id: '5', email: 'mika@example.com', role: 'viewer', lastSeen: '2026-07-04T14:00:00Z', grantedBy: 'alex@example.com', revokedAt: '2026-08-30T10:00:00Z' },
];

const COLUMNS: DataViewColumn<Operator>[] = [
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    copyable: true,
    filterable: true,
    filterLabel: 'Email',
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    shrink: true,
    filterable: true,
    filterKind: 'select',
    filterMultiple: true,
    filterOptions: [
      { value: 'owner', label: 'Owner' },
      { value: 'admin', label: 'Admin' },
      { value: 'support', label: 'Support' },
      { value: 'viewer', label: 'Viewer' },
    ],
    render: (row) => <Tag>{row.role}</Tag>,
  },
  {
    key: 'lastSeen',
    header: 'Last seen',
    sortable: true,
    filterable: true,
    filterKind: 'datetime',
    filterLabel: 'Last seen',
    sortValue: (row) => new Date(row.lastSeen).getTime(),
    render: (row) => new Date(row.lastSeen).toLocaleDateString(),
  },
  { key: 'grantedBy', header: 'Granted by', sortable: true, mono: true, filterable: true },
];

const SEARCH: FilterDef<Operator> = {
  name: 'search',
  label: 'Search operators',
  role: 'search',
  placeholder: 'Search by email',
};

/**
 * A whole list screen. The search box is always on the toolbar, which is the
 * table's own toolbar row, the Filter menu offers every axis the columns
 * declare, and each axis a reader adds becomes a chip in the band under that
 * row, with its own editor underneath.
 *
 * The screen holds the values and the sort, exactly as a real one does, where
 * they belong in the query string.
 */
export const ListScreen: Story = {
  render: function ListScreen() {
    const [values, setValues] = useState<FilterValues>({ search: '' });
    const [sort, setSort] = useState<DataViewSortState | null>({ key: 'lastSeen', direction: 'desc' });
    const searched = values.search
      ? OPERATORS.filter((row) => row.email.toLowerCase().includes(String(values.search).toLowerCase()))
      : OPERATORS;

    return (
      <DataView<Operator>
        title="Operators"
        description="Everyone with a platform role. Granting and revoking are recorded in the audit log."
        headerActions={
          <Button variant="primary" size="small" leadingIcon={<AddGlyph size="sm" />}>
            Grant a role
          </Button>
        }
        columns={COLUMNS}
        rows={searched}
        rowKey="id"
        framed
        filters={[SEARCH]}
        filterValues={values}
        onFilterValuesChange={setValues}
        sort={sort}
        onSortChange={setSort}
        archivedPredicate={(row) => row.revokedAt !== null}
        archivedTimestamp={(row) => row.revokedAt}
        archivedLabel="revoked"
        rowActions={(row) => [
          { label: 'Change role', onClick: () => {} },
          { label: 'Revoke', danger: true, disabled: row.role === 'owner', onClick: () => {} },
        ]}
        emptyMessage="No operator matches these filters."
      />
    );
  },
};

/**
 * The same screen under the shell breakpoint. The toolbar wraps rather than
 * scrolling sideways, the chips wrap under it, and the table takes its own
 * horizontal scroller: a control nobody can see is a control nobody has.
 */
export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
  globals: { viewport: { value: 'phone' } },
  render: (args, context) => (ListScreen.render as NonNullable<Story['render']>)(args, context),
};

/**
 * A screen that has already been narrowed. Three axes are on, each chip
 * opening its own editor, and the chips are the whole account of what was
 * asked for: nothing under the rows counts what is left.
 */
export const Narrowed: Story = {
  render: function Narrowed() {
    const [values, setValues] = useState<FilterValues>({
      search: '',
      role: ['admin', 'viewer'],
      grantedBy: 'alex',
      lastSeen: '2026-08-01T00:00:00',
    });
    return (
      <DataView<Operator>
        title="Operators"
        columns={COLUMNS}
        rows={OPERATORS}
        rowKey="id"
        filters={[SEARCH]}
        filterValues={values}
        onFilterValuesChange={setValues}
      />
    );
  },
};

/**
 * The toolbar on its own, over a screen that draws its own table. It reports
 * what a reader asks for and holds no state of its own.
 */
export const ToolbarOnly: Story = {
  render: function ToolbarOnly() {
    const [values, setValues] = useState<FilterValues>({ search: '' });
    const [names, setNames] = useState<string[]>([]);
    const [sort, setSort] = useState<DataViewSortState | null>(null);
    const [archived, setArchived] = useState(false);
    return (
      <DataViewToolbar<Operator>
        filters={[SEARCH, { name: 'role', label: 'Role', kind: 'select', multiple: true, options: [{ value: 'owner', label: 'Owner' }] }]}
        values={values}
        onValuesChange={setValues}
        displayed={names}
        onAddFilter={(name) => setNames((was) => [...was, name])}
        columns={COLUMNS}
        sort={sort}
        onSortChange={setSort}
        showArchived={archived}
        onShowArchivedChange={setArchived}
        archivedLabel="revoked"
        archivedCount={1}
        actions={
          <Button variant="secondary" size="small" leadingIcon={<ArrowDownwardGlyph size="sm" />}>
            Export
          </Button>
        }
      />
    );
  },
};

/**
 * The chip row on its own. Each chip says which axis it is and what it is set
 * to, and the cross beside it takes the axis off the list.
 */
export const Chips: Story = {
  render: function Chips() {
    const [values, setValues] = useState<FilterValues>({ role: ['admin'], grantedBy: 'alex' });
    const [names, setNames] = useState(['role', 'grantedBy']);
    const filters: FilterDef<Operator>[] = [
      {
        name: 'role',
        label: 'Role',
        kind: 'select',
        multiple: true,
        options: [
          { value: 'owner', label: 'Owner' },
          { value: 'admin', label: 'Admin' },
          { value: 'support', label: 'Support', disabled: true },
          { value: 'viewer', label: 'Viewer' },
        ],
      },
      { name: 'grantedBy', label: 'Granted by' },
    ];
    return (
      <FilterAxisBar
        filters={filters}
        values={values}
        names={names}
        onValuesChange={setValues}
        onRemove={(def) => setNames((was) => was.filter((name) => name !== def.name))}
        onClearAll={() => setNames([])}
      />
    );
  },
};
