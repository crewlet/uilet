import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Card,
  Copyable,
  DataTable,
  EmptyValue,
  Select,
  Tag,
  TimeWindowPicker,
  type DataTableItemsPerPage,
  type TimeWindowValue,
} from '@crewlethq/ui';
import { ArrowForwardGlyph, BlockGlyph, CachedGlyph, DeleteGlyph, GroupGlyph } from '@crewlethq/icons/glyphs';

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
interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
  joined: string;
}

const people: Person[] = [
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
        actionIcon={<DeleteGlyph size="sm" />}
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
      <DataTable<Person>
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
              }}>{String(value)}</span>
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
 * the table placed inside a Card surface.
 */
export const CardSectionTable: Story = {
  name: 'Archetypes / Card section (title + description)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <SettingsHint>
        Section card: title + description in the table header, inside a Card
        surface.
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
 * THE PANEL: a card whose header names the rows and holds the table's own
 * controls. The card publishes the header row and the table draws its pager
 * and its settings cog into it, so the screen writes a card, a header and a
 * table and nothing else: no lifted page state, no stylesheet of its own, and
 * no second bar of chrome between the name of the rows and the rows.
 *
 * The header keeps its icon, its title and its count on the left. The card's
 * own actions, where it has them, keep the end of the row and the table's
 * controls close onto them.
 */
export const APanelCard: Story = {
  name: 'Archetypes / The panel (the card header holds the chrome)',
  render: () => (
    <div style={{ padding: 20, maxWidth: 1100, display: 'grid', gap: 'var(--spacing-5)' }}>
      <SettingsHint>
        The pager and the cog are the table's. The row they sit on is the
        card's. Nothing is passed between them.
      </SettingsHint>
      <Card as="section" padding="none">
        <Card.Header
          icon={<GroupGlyph size="sm" />}
          count={people.length}
          actions={<Button size="small" variant="secondary">Invite</Button>}
        >
          <Card.Title>Members</Card.Title>
        </Card.Header>
        <DataTable
          variant="compact"
          paginated
          defaultItemsPerPage={5}
          storageKey="story-panel-card"
          rowKey="id"
          data={people}
          columns={columns}
        />
      </Card>
      <SettingsHint>
        And the same table with no card of its own keeps its own bar, which is
        where these controls have always been drawn.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        defaultItemsPerPage={5}
        storageKey="story-panel-bare"
        rowKey="id"
        data={people}
        columns={columns}
      />
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
 * onClearFilters + filtersActive surface the built-in "Clear filters"
 * link while a filter is set.
 */
/*
 * A story that holds state is a COMPONENT, declared as one. Written as an
 * inline `render: () => { const [x] = useState() }`, the hooks run in a
 * function React does not know is a component: it has no identity to attach
 * state to, and the rules-of-hooks lint says so.
 */
function FilterFeed() {
  const [outcome, setOutcome] = useState('');
  const filtered = outcome ? auditEvents.filter((e) => e.outcome === outcome) : auditEvents;
  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <SettingsHint>
        Filter toolbar + pagination + settings cog on a single row at the top.
        Pick an outcome to surface the built-in Clear filters link.
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Outcome</span>
            <Select
              ariaLabel="Outcome"
              value={outcome}
              onChange={(v) => setOutcome(String(v))}
              size="sm"
              options={[
                { value: '',        label: 'All' },
                { value: 'success', label: 'Success' },
                { value: 'denied',  label: 'Denied' },
              ]}
            />
          </span>
        )}
      />
    </div>
  );
}

export const FilterFeedTable: Story = {
  name: 'Archetypes / Filter feed (toolbar filters, rich settings)',
  render: () => <FilterFeed />,
};

/*
 * Cursor pagination with a Load more footer.
 * Server-driven pagination: the caller fetches a page, appends rows,
 * and passes hasMore + onLoadMore. The terminal state is silent (no
 * "End of feed" indicator).
 */
function CursorPaginated() {
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
}

export const CursorPagination: Story = {
  name: 'Archetypes / Cursor pagination (Load more)',
  render: () => <CursorPaginated />,
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
          key.status === 'active' && { label: 'Rotate key', icon: <CachedGlyph size="sm" />, onClick: () => alert(`Rotate ${key.name}`) },
          key.status === 'active' && { label: 'Revoke key', icon: <BlockGlyph size="sm" />, onClick: () => alert(`Revoke ${key.name}`), danger: true },
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
 * The settings frame
 * ============================================================
 *
 * Open the gear in either story: every table opens the same frame,
 * holding the items-per-page chips, the Wrap lines toggle and the
 * drag-to-reorder column list with its visibility ticks, under one
 * footer (Reset to Default, Cancel, Apply).
 */
export const SettingsFrame: Story = {
  name: 'Settings / The frame',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        Open the gear icon. Items-per-page chips, Wrap lines, and the column
        list: drag a handle or press its arrow keys to reorder, untick to
        hide. Nothing lands on the table until Apply.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        storageKey="story-settings-frame"
        rowKey="id"
        data={people}
        columns={columns}
      />
    </div>
  ),
};

/*
 * A card-style table (title, description, icon) used to open a shorter frame
 * that held no column list at all, so the only way to its columns was the
 * Columns panel in the toolbar. That panel is gone and this frame is the way
 * in, so it is the same frame here.
 */
export const SettingsFrameOnACard: Story = {
  name: 'Settings / The frame on a card-style table',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        A header is present, and the gear opens the same frame it opens on a
        table with none: the columns of a titled table are reachable too.
      </SettingsHint>
      <DataTable
        variant="compact"
        paginated
        storageKey="story-settings-frame-card"
        title="Projects"
        description="A header changes the table's chrome, not its settings."
        icon={<GroupGlyph size="md" />}
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

/* ============================================================
 * The states a live table is read in
 * ============================================================ */

interface Run {
  id: string;
  seat: string;
  phase: string;
  tokens: number | null;
  failed: boolean;
}

const runs: Run[] = [
  { id: 'r1', seat: 'planner', phase: 'Execute', tokens: 12400, failed: false },
  { id: 'r2', seat: 'reviewer', phase: 'Review', tokens: 3100, failed: false },
  { id: 'r3', seat: 'builder', phase: 'Execute', tokens: null, failed: true },
  { id: 'r4', seat: 'greeter', phase: 'Onboarding', tokens: 780, failed: false },
];

const runColumns = {
  seat: { label: 'Seat', sortValue: (row: Run) => row.seat },
  phase: { label: 'Phase', shrink: true },
  tokens: {
    label: 'Tokens',
    align: 'right' as const,
    firstDirection: 'desc' as const,
    sortValue: (row: Run) => row.tokens,
    render: (row: Run) => (row.tokens === null ? '–' : row.tokens.toLocaleString()),
  },
};

/*
 * A row that navigates is a LINK: the leading cell carries an anchor whose
 * hit area covers the row, so the row opens in a new tab, its address can be
 * copied, and it is read as the link it is. One tab stop per row.
 */
export const RowLink: Story = {
  name: 'States / Row link',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>Every row is an anchor. The Phase chip inside a row keeps its own press.</SettingsHint>
      <DataTable<Run>
        variant="compact"
        data={runs}
        columns={runColumns}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `#/runs/${row.id}`}
        paginated={false}
        showSettings={false}
      />
    </div>
  ),
};

/*
 * The selected row and the failed row, together: the accent means "where the
 * reader is" and never anything else, so a failed row takes the danger rail
 * plus a word a screen reader reads.
 */
export const SelectedAndToned: Story = {
  name: 'States / Selected row and failed row',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <SettingsHint>
        The accent tint is the selection. The rail is the state, and it comes with a word.
      </SettingsHint>
      <DataTable<Run>
        variant="compact"
        data={runs}
        columns={runColumns}
        getRowKey={(row) => row.id}
        isSelected={(row) => row.id === 'r2'}
        rowTone={(row) => (row.failed ? 'danger' : null)}
        labels={{ tone: { info: 'Working', warning: 'Needs attention', danger: 'Failed' } }}
        paginated={false}
        showSettings={false}
      />
    </div>
  ),
};

/* The end of a feed, said once, for a reader who paged to the bottom. */
export const EndOfFeed: Story = {
  name: 'States / End of the rows',
  render: () => (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <DataTable<Run>
        variant="compact"
        data={runs}
        columns={runColumns}
        getRowKey={(row) => row.id}
        endMessage="That is every run in this window."
        paginated={false}
        showSettings={false}
      />
    </div>
  ),
};

/*
 * The controlled pair, for a surface that keeps the choice somewhere a reader
 * can come back to. The toolbar used to carry a Columns panel for this caller
 * alone; the settings frame is the one way in now, and what the pair changes
 * is where the answer is KEPT, not how it is reached.
 */
export const ColumnsHeldByTheCaller: Story = {
  name: 'States / Columns held by the caller',
  render: function ColumnsHeldByTheCallerStory() {
    const [visible, setVisible] = useState<Record<string, boolean>>({
      seat: true,
      phase: false,
      tokens: true,
    });
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <SettingsHint>
          visibleColumns and onVisibleColumnsChange, with no storage key: open
          the gear, tick Phase and Apply, and the answer lands above the table.
        </SettingsHint>
        <DataTable<Run>
          variant="compact"
          data={runs}
          columns={runColumns}
          getRowKey={(row) => row.id}
          visibleColumns={visible}
          onVisibleColumnsChange={setVisible}
          paginated={false}
        />
      </div>
    );
  },
};


/*
 * THE FRAME A SCREEN HOLDS, which is the shape a dashboard uses: the page,
 * its size and the column order are the screen's, so a link carries them, and
 * only the wrapping and the widths are this browser's, under the storage key.
 * The identity column is declared `hideable: false`, so the row can never be
 * reduced to numbers belonging to nobody.
 */
export const SettingsHeldByTheScreen: Story = {
  name: 'Settings / Held by the screen (page, size, order)',
  render: function HeldByTheScreenStory() {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState<DataTableItemsPerPage>(5);
    const [order, setOrder] = useState<string[]>(['name', 'email', 'role', 'joined']);
    const [visible, setVisible] = useState<Record<string, boolean>>({
      name: true,
      email: true,
      role: true,
      joined: true,
    });
    return (
      <div style={{ padding: 20, maxWidth: 900 }}>
        <SettingsHint>
          {`Open the gear. Every choice in the frame is held above the table, the way a dashboard keeps it in the URL: page ${page}, ${size} per page.`}
        </SettingsHint>
        <DataTable<Person>
          variant="compact"
          storageKey="story-held-by-the-screen"
          data={people}
          rowKey="id"
          columns={{
            name: { label: 'Name', hideable: false, defaultWidth: 180 },
            email: { label: 'Email', defaultWidth: 240 },
            role: { label: 'Role', defaultWidth: 120 },
            joined: { label: 'Joined', defaultWidth: 140 },
          }}
          page={page}
          onPageChange={setPage}
          itemsPerPage={size}
          onItemsPerPageChange={setSize}
          columnOrder={order}
          onColumnOrderChange={setOrder}
          visibleColumns={visible}
          onVisibleColumnsChange={setVisible}
        />
      </div>
    );
  },
};

/*
 * THE TABLE REGISTER, both variants side by side.
 *
 * What is the same in both: a micro-label header on the panel's own ground
 * with one rule under it and no column dividers, hairline rows, cells at the
 * compact step, a row as tall as the row token, and a hover tint on the rows
 * that are controls and on no others. What differs is what the two variants
 * DO, which is where they were always meant to differ.
 *
 * Switch the toolbar's density between compact, normal and comfortable: every
 * inset and every row height here is a spacing token, so the table tightens
 * with the rest of the screen rather than against it.
 */
export const TheRegister: Story = {
  name: 'The table register',
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
      <Card>
        <DataTable<Person>
          variant="compact"
          paginated={false}
          storageKey="story-register-compact"
          title="Compact, with rows that navigate"
          description="A hovered row says it can be pressed, because here it can."
          rowKey="id"
          defaultColumnOrder={['name', 'email', 'role', 'joined']}
          data={people}
          columns={columns}
          onRowClick={(row) => alert(row.name)}
        />
      </Card>
      <Card>
        <DataTable<Person>
          variant="default"
          rowKey="id"
          defaultColumnOrder={['name', 'email', 'role', 'joined']}
          data={people}
          columns={columns}
        />
      </Card>
    </div>
  ),
};

/* ============================================================
 * The fidelity fixture
 * ============================================================
 *
 * THE THREE TABLES CONLET RENDERS, drawn from the markup its owner pasted as
 * "the design I want". They are the reference this component is measured
 * against: put this story beside the saved markup and the same table has to
 * come back. Each one names which part of the surface it pins down.
 *
 *   1. the toolbar with an empty screen slot, the pagination cluster and the
 *      settings cog on the right, an expand-all column, one sortable header
 *      and four plain ones, a resizer on each, the chrome spacer, and the
 *      screen's own sentence in a full-width empty row;
 *   2. the same table with filter controls in the screen slot, each under its
 *      own small label, and every header sortable;
 *   3. a titled table: the header block carrying the title and description on
 *      the left with the same controls on the right, a frozen right pane
 *      holding a row action, and real cells including a monospace id under a
 *      name, a status pill and a value nobody reported.
 */
interface ActivityRow {
  id: string;
  when: string;
  event: string;
  type: string;
  trace: string;
}

interface CompanyRow {
  id: string;
  company: string;
  plan: string;
  status: string;
  agents: string;
  events: string | null;
  invoice: string;
}

const companyRows: CompanyRow[] = [
  {
    id: 'deec12db-3c7f-4acd-939d-feb7917a3e16',
    company: 'infrado',
    plan: 'Free',
    status: 'No subscription',
    agents: '5 / 2',
    events: null,
    invoice: 'None',
  },
];

/* A filter and its own small label, stacked, which is what the screen puts in
   the table's toolbar slot. */
const FilterLabel = ({ children, name }: { children: ReactNode; name: string }) => (
  <label style={{ display: 'grid', gap: 'var(--spacing-1)' }}>
    <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>{name}</span>
    {children}
  </label>
);

const FixtureCaption = ({ children }: { children: string }) => (
  <p
    style={{
      margin: '0 0 var(--spacing-3)',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)',
    }}
  >
    {children}
  </p>
);

function ConletFixture() {
  const [window, setWindow] = useState<TimeWindowValue>({ kind: 'relative', duration: '7d' });
  const [eventType, setEventType] = useState('');
  const [outcome, setOutcome] = useState('');

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-8)', padding: 'var(--spacing-5)' }}>
      <section>
        <FixtureCaption>
          1. Toolbar slot, pagination, settings, expand-all, one sortable header, an empty row.
        </FixtureCaption>
        <DataTable<ActivityRow>
          variant="compact"
          rowKey="id"
          data={[]}
          defaultColumnOrder={['when', 'event', 'type', 'trace']}
          columns={{
            when: { label: 'When', defaultWidth: 142 },
            event: { label: 'Event', sortable: false, defaultWidth: 670 },
            type: { label: 'Type', sortable: false, defaultWidth: 180 },
            trace: { label: 'Trace', sortable: false, defaultWidth: 284 },
          }}
          renderExpandedRow={() => null}
          renderToolbar={<div />}
          emptyMessage="No activity yet. Once your agents are running, their events appear here in real time."
        />
      </section>

      <section>
        <FixtureCaption>
          2. The same table with a time window and two selects in the screen slot, each under its own label.
        </FixtureCaption>
        <DataTable<ActivityRow>
          variant="compact"
          rowKey="id"
          data={[]}
          defaultColumnOrder={['when', 'event', 'outcome', 'actor', 'target']}
          columns={{
            when: { label: 'When', defaultWidth: 150 },
            event: { label: 'Event', defaultWidth: 134 },
            outcome: { label: 'Outcome', defaultWidth: 110 },
            actor: { label: 'Actor', defaultWidth: 134 },
            target: { label: 'Target', defaultWidth: 134 },
          }}
          renderExpandedRow={() => null}
          renderToolbar={(
            <>
              <FilterLabel name="Time window">
                <TimeWindowPicker size="sm" value={window} onChange={setWindow} ariaLabel="Time window" />
              </FilterLabel>
              <FilterLabel name="Event type">
                <Select
                  size="sm"
                  ariaLabel="Event type"
                  value={eventType}
                  onChange={(next) => setEventType(String(next))}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'turn', label: 'Turn' },
                    { value: 'tool', label: 'Tool' },
                  ]}
                />
              </FilterLabel>
              <FilterLabel name="Outcome">
                <Select
                  size="sm"
                  ariaLabel="Outcome"
                  value={outcome}
                  onChange={(next) => setOutcome(String(next))}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'success', label: 'Success' },
                    { value: 'denied', label: 'Denied' },
                  ]}
                />
              </FilterLabel>
            </>
          )}
          emptyMessage="No activity recorded in this window. Try widening the date range."
        />
      </section>

      <section>
        <FixtureCaption>
          3. A titled table with a description, a frozen right pane holding a row action, and real cells.
        </FixtureCaption>
        <DataTable<CompanyRow>
          variant="compact"
          rowKey="id"
          data={companyRows}
          title="Companies"
          description="One row per company you own. Click through to manage that company's plan or view its invoices."
          defaultColumnOrder={['company', 'plan', 'status', 'agents', 'events', 'invoice', 'open']}
          columns={{
            company: {
              label: 'Company',
              defaultWidth: 86,
              render: (row) => (
                <span style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                  <strong>{row.company}</strong>
                  <code
                    title={row.id}
                    style={{
                      fontSize: 'var(--font-size-2xs)',
                      color: 'var(--color-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.id}
                  </code>
                </span>
              ),
            },
            plan: { label: 'Plan', defaultWidth: 86 },
            status: {
              label: 'Status',
              defaultWidth: 86,
              render: (row) => <Tag variant="neutral">{row.status}</Tag>,
            },
            agents: {
              label: 'Agents',
              defaultWidth: 86,
              render: (row) => <span style={{ color: 'var(--color-feedback-danger-ink)' }}>{row.agents}</span>,
            },
            events: {
              label: 'Events used',
              defaultWidth: 100,
              render: (row) => (row.events === null ? <EmptyValue /> : row.events),
            },
            invoice: { label: 'Open invoice', defaultWidth: 104 },
            open: {
              label: '',
              sortable: false,
              sticky: 'right',
              width: 120,
              render: () => (
                <a
                  href="#invoices"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                    color: 'var(--color-brand-accent-ink)',
                  }}
                >
                  Invoices
                  <ArrowForwardGlyph size="sm" aria-hidden />
                </a>
              ),
            },
          }}
        />
      </section>
    </div>
  );
}

export const ConletSamples: Story = {
  name: 'The fidelity fixture (conlet)',
  render: () => <ConletFixture />,
};

/*
 * THE ONE STATE A WIDE STORY CANNOT SHOW.
 *
 * Every other table here is drawn in a container its columns fit, which is
 * where the fit pass keeps them. This one is not: three columns at the
 * `minColumnWidth` floor plus a pinned pane need more room than the box
 * holds, so the row scrolls and the pane stays at its right edge with the
 * columns passing behind it. The scroller under a frozen rail used to be
 * locked shut, and the columns it could not fit were simply cut off.
 */
export const FrozenAndTooNarrow: Story = {
  name: 'A frozen table too narrow for its columns',
  render: () => (
    <div style={{ padding: 'var(--spacing-5)', display: 'grid', gap: 'var(--spacing-4)' }}>
      <SettingsHint>
        Drag the preview narrower: the pinned column holds the right edge and the
        rest of the row scrolls under it.
      </SettingsHint>
      <div style={{ width: '380px', maxWidth: '100%' }}>
        <Card padding="none">
          <DataTable<Person>
            variant="compact"
            data={people}
            getRowKey={(row) => row.id}
            paginated={false}
            columns={{
              name: { label: 'Name', defaultWidth: 180 },
              email: { label: 'Email', defaultWidth: 240 },
              role: { label: 'Role', defaultWidth: 120 },
              joined: { label: 'Joined', defaultWidth: 140 },
              open: {
                label: '',
                sortable: false,
                sticky: 'right',
                width: 120,
                render: () => (
                  <a
                    href="#profile"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-1)',
                      color: 'var(--color-brand-accent-ink)',
                    }}
                  >
                    Profile
                    <ArrowForwardGlyph size="sm" aria-hidden />
                  </a>
                ),
              },
            }}
          />
        </Card>
      </div>
    </div>
  ),
};
