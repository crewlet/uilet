import { useMemo, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  DataGrid,
  FilterChip,
  FilterChipGroup,
  Input,
  RailList,
  TableTwoLineCell,
  Tag,
  type DataGridColumn,
  type RailListItem,
} from '@crewlethq/ui';
import { SearchGlyph } from '@crewlethq/icons/glyphs';
import { themeScope } from '../themeScope';

/**
 * A directory in a card: the categories its items are filed in as a rail
 * beside the chosen category's list, so a long catalogue reads as a few
 * short lists. The rail is the application's rail, denser; each category is
 * a row with its count, and the chosen one's description stands over its
 * list. Under 44rem of the card's own width the rail goes and a picker of
 * the same categories joins the bar across the top.
 */
const meta: Meta<typeof RailList> = {
  title: 'UI/RailList',
  component: RailList,
};

export default meta;
type Story = StoryObj<typeof RailList>;

type Access = 'read' | 'write' | 'admin';

interface App {
  name: string;
  summary: string;
  category: string;
  access: Access;
}

const CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: 'chat', label: 'Chat', description: 'Where people and agents talk.' },
  { key: 'work', label: 'Work tracking', description: 'Issues, projects and the boards they move across.' },
  { key: 'docs', label: 'Docs and knowledge', description: 'Pages and wikis an agent can read and write.' },
  { key: 'incidents', label: 'Observability and incident response', description: 'Errors, logs and who is on call.' },
];

const APPS: App[] = [
  { name: 'Slack', summary: 'Messages, channels and threads.', category: 'chat', access: 'write' },
  { name: 'Discord', summary: 'Channels, threads and direct messages.', category: 'chat', access: 'write' },
  { name: 'Linear', summary: 'Issues, cycles and projects.', category: 'work', access: 'write' },
  { name: 'Jira', summary: 'Issues and boards, read through the Atlassian connection.', category: 'work', access: 'read' },
  { name: 'Confluence', summary: 'Spaces and pages.', category: 'docs', access: 'read' },
  { name: 'Notion', summary: 'Pages and databases.', category: 'docs', access: 'write' },
  { name: 'Sentry', summary: 'Errors and the releases that raised them.', category: 'incidents', access: 'read' },
  {
    name: 'Datadog logs and metrics for every production region',
    summary: 'Logs, metrics and monitors across every region the company runs in, with the on-call rota that answers them.',
    category: 'incidents',
    access: 'admin',
  },
];

const ACCESS_LABEL: Record<Access, string> = { read: 'Reads', write: 'Writes', admin: 'Administers' };

const COLUMNS: DataGridColumn<App>[] = [
  {
    key: 'name',
    header: 'App',
    floor: '14rem',
    cell: (app) => <TableTwoLineCell value={app.name} detail={app.summary} />,
  },
  { key: 'access', header: 'Access', shrink: true, cell: (app) => <Tag size="sm">{ACCESS_LABEL[app.access]}</Tag> },
];

function items(apps: readonly App[], allLabel: string): RailListItem[] {
  return [
    { key: '', label: allLabel, count: apps.length },
    ...CATEGORIES.map((category) => ({
      ...category,
      count: apps.filter((app) => app.category === category.key).length,
    })),
  ];
}

function Directory({
  toolbar = true,
  note = 'Every app here is reviewed before it is listed, and each one asks for its own access.',
  allLabel = 'All apps',
}: {
  toolbar?: boolean;
  note?: ReactNode;
  allLabel?: string;
}) {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [access, setAccess] = useState<string | null>('all');
  const shown = useMemo(
    () =>
      APPS.filter(
        (app) =>
          (category === '' || app.category === category) &&
          (access === 'all' || access === null || app.access === access) &&
          app.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [category, query, access],
  );
  return (
    <RailList
      label="Categories"
      items={items(APPS, allLabel)}
      value={category}
      onChange={setCategory}
      labels={{ counted: 'apps' }}
      note={note}
      toolbar={
        toolbar
          ? (picker) => (
              <>
                <span style={{ flex: '1 1 12rem', minInlineSize: '10rem', maxInlineSize: '16rem' }}>
                  <Input
                    type="search"
                    aria-label="Search apps"
                    placeholder="Search apps"
                    inputSize="sm"
                    width="full"
                    leading={<SearchGlyph size="sm" />}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </span>
                {picker}
                <FilterChipGroup label="Access" hideLabel semantics="radio" value={access} onValueChange={setAccess}>
                  <FilterChip value="all">All</FilterChip>
                  <FilterChip value="read">Reads</FilterChip>
                  <FilterChip value="write">Writes</FilterChip>
                  <FilterChip value="admin">Administers</FilterChip>
                </FilterChipGroup>
              </>
            )
          : undefined
      }
    >
      <DataGrid
        rows={shown}
        columns={COLUMNS}
        rowKey={(app: App) => app.name}
        flush
        empty={{ title: 'No app matches', hint: query ? `Nothing is called "${query.trim()}".` : undefined }}
      />
    </RailList>
  );
}

/**
 * A page's width: the rail beside the list, a search and filter chips over
 * both, and a quiet note under the rail. Choose a category to see its
 * description over its list; a long category name is cut in the rail.
 */
export const OnAPage: Story = {
  render: () => (
    <div style={{ maxWidth: 960 }}>
      <Directory />
    </div>
  ),
};

/**
 * In a 560px sheet the card is under the rail's room, so the rail folds into
 * a picker of the same categories, which joins the bar between the search
 * and the chips.
 */
export const InASheet: Story = {
  render: () => (
    <div style={{ width: 560 }}>
      <Directory />
    </div>
  ),
};

/** Drag the corner across 44rem to watch the rail fold into the picker and back. */
export const Resizable: Story = {
  render: () => (
    <div style={{ width: 760, resize: 'horizontal', overflow: 'auto', paddingBottom: 'var(--spacing-2)' }}>
      <Directory />
    </div>
  ),
};

/** No bar of the caller's: wide, nothing stands over the rail and list; narrow, a bar holds the picker alone. */
export const WithoutAToolbar: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', maxWidth: 960 }}>
      <Directory toolbar={false} note={null} />
      <div style={{ width: 480 }}>
        <Directory toolbar={false} note={null} />
      </div>
    </div>
  ),
};

/** Right to left: the rail stands at the right, on its hairline, and the list reads from the right. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ maxWidth: 960 }}>
      <Directory allLabel="كل التطبيقات" note="كل تطبيق هنا تمت مراجعته قبل إدراجه." />
    </div>
  ),
};

/** Both themes. */
export const BothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', maxWidth: 960 }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Directory />
        </div>
      ))}
    </div>
  ),
};
