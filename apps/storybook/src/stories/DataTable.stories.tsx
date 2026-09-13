import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Copyable, DataTable, Select } from '@crewlethq/ui';

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
};

export default meta;
type Story = StoryObj<typeof DataTable>;

/*
 * Reusable fixtures for the archetype stories. The data is synthetic and
 * domain-agnostic (people, projects, API keys, build artifacts) so each
 * archetype shows a table pattern rather than any particular product.
 */
const people = [
  { id: 1, name: 'Jane Cooper',  email: 'jane@example.com',  role: 'Owner',  joined: '2025-03-12' },
  { id: 2, name: 'Alex Park',    email: 'alex@example.com',  role: 'Admin',  joined: '2025-04-01' },
  { id: 3, name: 'Sam Lin',      email: 'sam@example.com',   role: 'Member', joined: '2025-05-09' },
  { id: 4, name: 'Robin Vega',   email: 'robin@example.com', role: 'Member', joined: '2025-06-22' },
  { id: 5, name: 'Mika Patel',   email: 'mika@example.com',  role: 'Member', joined: '2025-07-15' },
];

const columns = {
  name:   { label: 'Name',   defaultWidth: 180 },
  email:  { label: 'Email',  defaultWidth: 240 },
  role:   { label: 'Role',   defaultWidth: 120 },
  joined: { label: 'Joined', defaultWidth: 140 },
};

const projects = [
  { project_id: '00000000-0000-4000-8000-000000000001', name: 'Website refresh', owner: 'Jane Cooper', status: 'active',   tasks: '12 / 40', storage: '1.2 GB' },
  { project_id: '00000000-0000-4000-8000-000000000002', name: 'Mobile app',      owner: 'Alex Park',   status: 'planning', tasks: '0 / 8',   storage: '0 B' },
  { project_id: '00000000-0000-4000-8000-000000000003', name: 'Annual report',   owner: 'Sam Lin',     status: 'archived', tasks: '25 / 25', storage: '340 MB' },
];

const auditEvents = [
  { id: 'e1', when: '4h ago', event: 'user.invited',    outcome: 'success', actor: 'jane@example.com', target: 'sam@example.com' },
  { id: 'e2', when: '6h ago', event: 'project.updated', outcome: 'success', actor: 'jane@example.com', target: 'Website refresh' },
  { id: 'e3', when: '1d ago', event: 'role.changed',    outcome: 'denied',  actor: 'alex@example.com', target: 'robin@example.com' },
  { id: 'e4', when: '3d ago', event: 'api_key.created', outcome: 'success', actor: 'jane@example.com', target: 'CI runner' },
];

const apiKeys = [
  { id: 'k1', name: 'CI runner',         prefix: 'aaaa1111', last_used: '2h ago',    expires: 'Never',   status: 'active'  },
  { id: 'k2', name: 'Local development', prefix: 'bbbb2222', last_used: 'Yesterday', expires: '2027-01', status: 'active'  },
  { id: 'k3', name: 'Old script',        prefix: 'cccc3333', last_used: 'Mar 2025',  expires: '2025-12', status: 'revoked' },
];

const artifacts = [
  { id: 'a1', when: '2026-05-24 10:14', name: 'web-app.tar.gz', size: '18.4 MB', digest: 'sha256:0000000000000001' },
  { id: 'a2', when: '2026-05-23 14:32', name: 'api-server.zip', size: '42.0 MB', digest: 'sha256:0000000000000002' },
  { id: 'a3', when: '2026-05-22 09:01', name: 'docs-site.tgz',  size: '6.7 MB',  digest: 'sha256:0000000000000003' },
];

const SettingsHint = ({ children }: { children: string }) => (
  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
    {children}
  </p>
);

/* ============================================================
 * Legacy default variant
 * ============================================================
 *
 * The default variant: resizable columns, settings cog inside the
 * actions header. Kept for tables that already use it. Most new
 * tables should use the compact variant archetypes below.
 */
export const Basic: Story = {
  name: 'Legacy / Basic',
  render: () => (
    <div style={{ padding: 20 }}>
      <SettingsHint>Legacy default variant. Resizable columns, header settings cog.</SettingsHint>
      <DataTable
        data={people}
        columns={columns}
        storageKey="story-people"
        showActions={false}
        getRowKey={(row) => row.id}
      />
    </div>
  ),
};

export const WithRowAction: Story = {
  name: 'Legacy / With row action',
  render: () => (
    <div style={{ padding: 20 }}>
      <SettingsHint>Legacy variant with a single per-row action button.</SettingsHint>
      <DataTable
        data={people}
        columns={columns}
        storageKey="story-people-actions"
        onRowAction={(row) => alert(`Deleting ${row.name}`)}
        actionLabel="Delete"
        actionIcon="delete"
        getRowKey={(row) => row.id}
      />
    </div>
  ),
};

export const Empty: Story = {
  name: 'Legacy / Empty state',
  render: () => (
    <div style={{ padding: 20 }}>
      <SettingsHint>Empty data set with a custom message.</SettingsHint>
      <DataTable
        data={[]}
        columns={columns}
        storageKey="story-people-empty"
        emptyMessage="Invite a teammate to populate this directory."
        getRowKey={(row) => row.id}
      />
    </div>
  ),
};

export const CustomRender: Story = {
  name: 'Legacy / Custom cell render',
  render: () => (
    <div style={{ padding: 20 }}>
      <SettingsHint>Custom cell renderer that paints a pill around the Role value.</SettingsHint>
      <DataTable
        data={people}
        columns={{
          name:   { label: 'Name', defaultWidth: 180 },
          email:  { label: 'Email', defaultWidth: 240 },
          role:   {
            label: 'Role',
            defaultWidth: 120,
            render: (_row, value) => (
              <span style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: value === 'Owner' ? 'rgba(84, 105, 212, 0.18)' : 'rgba(100, 100, 100, 0.15)',
                fontSize: 12,
                fontWeight: 600,
              }}>{value}</span>
            ),
          },
          joined: { label: 'Joined', defaultWidth: 140 },
        }}
        storageKey="story-people-custom"
        showActions={false}
        getRowKey={(row) => row.id}
      />
    </div>
  ),
};

/* ============================================================
 * Archetypes (compact variant)
 * ============================================================
 *
 * Each story below is a common table pattern. Use it as a starting
 * template when you build a new table: pick the archetype that fits
 * the surface, copy the props, swap in your columns and data.
 */

/*
 * Card section table. Title + description in the table header, with
 * the table placed inside a Card surface. The compact settings modal
 * (page size + Wrap lines) is auto-selected because a header is
 * present.
 */
export const CardSectionTable: Story = {
  name: 'Archetypes / Card section (title + description)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <SettingsHint>
        Section card: title + description in the table header, inside a Card
        surface. Auto-resolves to the compact settings modal.
      </SettingsHint>
      <Card>
        <DataTable
          variant="compact"
          paginated={false}
          storageKey="story-card-section"
          title="Projects"
          description="One row per project in this workspace. Click through to open a project."
          rowKey="project_id"
          defaultColumnOrder={['name', 'owner', 'status', 'tasks', 'storage']}
          data={projects}
          columns={{
            name: {
              label: 'Project',
              render: (row) => (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong>{row.name}</strong>
                  <code style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {row.project_id.slice(-8)}
                  </code>
                </span>
              ),
            },
            owner:   { label: 'Owner' },
            status:  { label: 'Status' },
            tasks:   { label: 'Tasks done', align: 'right' },
            storage: { label: 'Storage',    align: 'right' },
          }}
        />
      </Card>
    </div>
  ),
};

/*
 * Section card with leading icon. Same as Card section but the header
 * carries a Material Symbols icon on the left of the title so the
 * section reads as a settings card.
 */
export const SectionWithIcon: Story = {
  name: 'Archetypes / Section with icon (members)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <SettingsHint>
        Icon + title + description in the table header, the settings card
        section pattern.
      </SettingsHint>
      <DataTable
        variant="compact"
        density="comfortable"
        paginated={false}
        storageKey="story-section-with-icon"
        icon="group"
        title="Members"
        description="Everyone who can access this workspace, with the role that decides what they can change."
        rowKey="id"
        defaultColumnOrder={['name', 'email', 'role', 'joined']}
        data={people}
        columns={columns}
      />
    </div>
  ),
};

/*
 * Loading skeleton: shimmer rows inside the real table structure.
 * While `loading` is true and no rows are present, one shimmer bar
 * renders per visible column so the layout matches the data that
 * replaces it.
 */
export const LoadingSkeleton: Story = {
  name: 'States / Loading skeleton',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <DataTable
        variant="compact"
        title="Scheduled jobs"
        description="Recurring jobs and when each one runs next."
        loading
        data={[]}
        rowKey="id"
        defaultColumnOrder={['name', 'scope', 'cron', 'next']}
        columns={{
          name:  { label: 'Schedule' },
          scope: { label: 'Scope', width: 160 },
          cron:  { label: 'Cron', width: 140 },
          next:  { label: 'Next run', width: 140 },
        }}
      />
    </div>
  ),
};

/*
 * Filter feed table, such as an activity feed or audit trail.
 * No internal header. Filters live in renderToolbar (toolbar-start);
 * pagination + settings cog sit on the right of the same toolbar row.
 * Rich settings modal (column reorder + visibility) is auto-selected
 * because no header is present. onClearFilters + filtersActive
 * surface the built-in "Clear filters" link while a filter is set.
 */
export const FilterFeedTable: Story = {
  name: 'Archetypes / Filter feed (toolbar filters, rich settings)',
  render: () => {
    const [outcome, setOutcome] = useState('');
    const filtered = outcome ? auditEvents.filter((e) => e.outcome === outcome) : auditEvents;
    return (
      <div style={{ padding: 20, maxWidth: 1100 }}>
        <SettingsHint>
          Filter toolbar + pagination + settings cog on a single row at the top.
          Pick an outcome to surface the built-in Clear filters link.
          Auto-resolves to the rich settings modal (column reorder + visibility).
        </SettingsHint>
        <DataTable
          variant="compact"
          paginated={false}
          storageKey="story-filter-feed"
          rowKey="id"
          defaultColumnOrder={['when', 'event', 'outcome', 'actor', 'target']}
          data={filtered}
          onClearFilters={() => setOutcome('')}
          filtersActive={outcome !== ''}
          columns={{
            when:    { label: 'When',    width: 110 },
            event:   { label: 'Event',   render: (row) => <code>{row.event}</code> },
            outcome: { label: 'Outcome', width: 110 },
            actor:   { label: 'Actor' },
            target:  { label: 'Target' },
          }}
          renderToolbar={(
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Outcome</span>
              <Select
                value={outcome}
                onChange={(v) => setOutcome(String(v))}
                size="sm"
                options={[
                  { value: '',        label: 'All' },
                  { value: 'success', label: 'Success' },
                  { value: 'denied',  label: 'Denied' },
                ]}
              />
            </label>
          )}
        />
      </div>
    );
  },
};

/*
 * Cursor pagination with a Load more footer.
 * Server-driven pagination: the caller fetches a page, appends rows,
 * and passes hasMore + onLoadMore. The terminal state is silent (no
 * "End of feed" indicator).
 */
export const CursorPagination: Story = {
  name: 'Archetypes / Cursor pagination (Load more)',
  render: () => {
    const [rows, setRows] = useState(auditEvents.slice(0, 2));
    const [loadingMore, setLoadingMore] = useState(false);
    const hasMore = rows.length < auditEvents.length;
    const onLoadMore = () => {
      setLoadingMore(true);
      setTimeout(() => {
        setRows(auditEvents.slice(0, Math.min(rows.length + 2, auditEvents.length)));
        setLoadingMore(false);
      }, 400);
    };
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <SettingsHint>
          Cursor-paginated table with a centered Load more button below the rows.
          Footer hides when hasMore is false.
        </SettingsHint>
        <DataTable
          variant="compact"
          paginated={false}
          storageKey="story-cursor"
          rowKey="id"
          data={rows}
          defaultColumnOrder={['when', 'event', 'actor']}
          columns={{
            when:  { label: 'When',  width: 110 },
            event: { label: 'Event', render: (row) => <code>{row.event}</code> },
            actor: { label: 'Actor' },
          }}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          loadMoreLabel="Load older events"
        />
      </div>
    );
  },
};

/*
 * Row actions kebab, for example on a list of API keys.
 * Trailing column renders a multi-action kebab menu. Combine with
 * archivedPredicate to dim revoked rows with a left-edge accent.
 */
export const RowActions: Story = {
  name: 'Archetypes / Row actions kebab',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <SettingsHint>
        rowActions builds a kebab menu per row. archivedPredicate dims
        revoked rows and tints the left edge.
      </SettingsHint>
      <DataTable
        variant="compact"
        density="comfortable"
        paginated={false}
        storageKey="story-row-actions"
        rowKey="id"
        archivedPredicate={(t) => t.status === 'revoked'}
        archivedLabel="revoked"
        defaultColumnOrder={['name', 'prefix', 'last_used', 'expires', 'status']}
        data={apiKeys}
        columns={{
          name:      { label: 'Name' },
          prefix:    { label: 'Prefix',    render: (row) => <code>key_{row.prefix}_********</code> },
          last_used: { label: 'Last used' },
          expires:   { label: 'Expires' },
          status:    { label: 'Status' },
        }}
        rowActions={(key) => [
          key.status === 'active' && { label: 'Rotate key', icon: 'cached', onClick: () => alert(`Rotate ${key.name}`) },
          key.status === 'active' && { label: 'Revoke key', icon: 'block',  onClick: () => alert(`Revoke ${key.name}`), variant: 'danger' },
        ]}
      />
    </div>
  ),
};

/*
 * Click-to-detail row.
 * The whole row becomes a button that navigates somewhere. Hover
 * shows a pointer; row actions still stop propagation so the kebab
 * doesn't fire navigation.
 */
export const ClickToDetail: Story = {
  name: 'Archetypes / Click-to-detail row',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <SettingsHint>
        Whole row reacts to clicks (cursor flips to pointer). Wire onRowClick
        to your navigation handler.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated={false}
        storageKey="story-click-to-detail"
        rowKey="project_id"
        data={projects}
        defaultColumnOrder={['name', 'owner', 'status', 'storage']}
        columns={{
          name:    { label: 'Project' },
          owner:   { label: 'Owner' },
          status:  { label: 'Status' },
          storage: { label: 'Storage', align: 'right' },
        }}
        onRowClick={(row) => alert(`Open ${row.name}`)}
      />
    </div>
  ),
};

/*
 * Expandable rows, such as a per-event detail panel in an activity feed.
 * Each row reveals a full-width detail strip below itself when the
 * built-in chevron is toggled. Single-row expansion only.
 */
export const ExpandableRows: Story = {
  name: 'Archetypes / Expandable detail rows',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <SettingsHint>
        Click a row (or its chevron) to reveal a per-row detail panel. Only one
        row is open at a time.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated={false}
        storageKey="story-expandable"
        rowKey="id"
        data={auditEvents}
        defaultColumnOrder={['when', 'event', 'actor']}
        columns={{
          when:  { label: 'When',  width: 110 },
          event: { label: 'Event', render: (row) => <code>{row.event}</code> },
          actor: { label: 'Actor' },
        }}
        renderExpandedRow={(row) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Outcome</div>
            <div>{row.outcome}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>Target</div>
            <div>{row.target}</div>
          </div>
        )}
      />
    </div>
  ),
};

/*
 * Accessory rows, such as an API key's prefix strip.
 * Each main row gets a secondary row immediately below, spanning the
 * full column width. Used for tree-like surfaces where each entity
 * owns an attached detail strip.
 */
export const AccessoryRows: Story = {
  name: 'Archetypes / Accessory rows (attached detail strip)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <SettingsHint>
        renderAccessoryRow returns a secondary row that visually belongs to the
        main row but does not share its column layout.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated={false}
        storageKey="story-accessory"
        rowKey="id"
        data={apiKeys}
        defaultColumnOrder={['name', 'last_used', 'status']}
        columns={{
          name:      { label: 'Name' },
          last_used: { label: 'Last used' },
          status:    { label: 'Status' },
        }}
        renderAccessoryRow={(row) => (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '4px 8px' }}>
            <code>key_{row.prefix}_********</code>
            <span style={{ marginLeft: 8 }}>(secret hidden; only the prefix is stored in cleartext)</span>
          </div>
        )}
      />
    </div>
  ),
};

/*
 * Copyable cells, for values a reader pastes elsewhere (an artifact
 * digest here). Copyable wraps any value with an inline copy button.
 * Pair with the title/description card pattern.
 */
export const CopyableCells: Story = {
  name: 'Archetypes / Copyable cells',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        Copyable wraps any cell value with an inline copy affordance.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated={false}
        storageKey="story-copyable"
        title="Build artifacts"
        description={`${artifacts.length} artifacts`}
        rowKey="id"
        data={artifacts}
        defaultColumnOrder={['when', 'name', 'size', 'digest']}
        columns={{
          when:   { label: 'When', render: (row) => row.when },
          name:   { label: 'Artifact' },
          size:   { label: 'Size', align: 'right' },
          digest: {
            label: 'Digest',
            render: (row) => <Copyable value={row.digest} ariaLabel="Copy digest" />,
          },
        }}
      />
    </div>
  ),
};

/* ============================================================
 * Settings modal shapes
 * ============================================================
 *
 * Open the settings cog in either story to see the modal contents.
 * The compact modal has page-size chips + Wrap lines toggle with
 * Cancel / Confirm. The rich modal has items-per-page chips +
 * drag-to-reorder column list + per-column visibility checkboxes
 * with Reset / Done.
 */
export const SettingsCompactModal: Story = {
  name: 'Settings / Compact modal (page size + Wrap lines)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        Open the gear icon. Compact modal: page size chip row + Wrap lines
        toggle, Cancel / Confirm footer that commits on confirm.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        storageKey="story-settings-compact"
        title="Projects"
        description="Compact settings auto-resolved by the header presence."
        rowKey="project_id"
        data={projects}
        columns={{
          name:    { label: 'Project', render: (row) => row.name },
          owner:   { label: 'Owner' },
          status:  { label: 'Status' },
          storage: { label: 'Storage', align: 'right' },
        }}
      />
    </div>
  ),
};

export const SettingsRichModal: Story = {
  name: 'Settings / Rich modal (column reorder + visibility)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        Open the gear icon. Rich modal: items-per-page chips + drag-to-reorder
        column list + per-column visibility checkboxes, Reset / Done footer.
        Changes apply immediately.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        storageKey="story-settings-rich"
        rowKey="id"
        data={people}
        columns={columns}
      />
    </div>
  ),
};

/*
 * Explicit override: pass settingsVariant="rich" on a table that
 * would otherwise auto-resolve to compact (because it has a header).
 * Useful when a card-style table still needs column-level control.
 */
export const SettingsExplicitOverride: Story = {
  name: 'Settings / Explicit override (header + rich modal)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        Header is present, so the compact modal is the default. settingsVariant="rich"
        forces the rich modal anyway when column reorder matters.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        storageKey="story-settings-override"
        title="Members"
        description="Header present, settingsVariant explicitly set to rich."
        icon="group"
        settingsVariant="rich"
        rowKey="id"
        data={people}
        columns={columns}
      />
    </div>
  ),
};
