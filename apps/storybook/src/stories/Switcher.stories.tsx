import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Announcer,
  Breadcrumb,
  Button,
  Switcher,
  Tag,
  type SwitcherGroup,
  type SwitcherMessage,
  type SwitcherOption,
} from '@crewlethq/ui';
import {
  Columns3Glyph,
  KeyGlyph,
  LayersGlyph,
  PlusGlyph,
  RefreshCwGlyph,
  SearchGlyph,
  SquareKanbanGlyph,
} from '@crewlethq/icons/glyphs';

/**
 * UI / Switcher.
 *
 * The page's subject as a button, and the panel that switches it: a search
 * band, a list that scrolls, and a footer that does not. It knows nothing about
 * projects; the stories below rank and group the way the engine's dashboard
 * does, so every state the panel can be in is here.
 *
 * Anchored under its button where a page names its subject, centred when it
 * is opened by a key from anywhere else, and a sheet from the bottom edge on a
 * phone: narrow the window below 640px to see the sheet.
 */
const meta: Meta<typeof Switcher> = {
  title: 'UI/Switcher',
  component: Switcher,
};

export default meta;
type Story = StoryObj<typeof Switcher>;

interface Project {
  key: string;
  name: string;
  open: number;
}

const FAIRSPLIT: Project[] = [
  { key: 'FAIR', name: 'Product and Engineering', open: 2 },
  { key: 'SPLIT', name: 'Split engine', open: 4 },
  { key: 'APP', name: 'Mobile app', open: 3 },
  { key: 'GROW', name: 'Growth', open: 5 },
  { key: 'RCPT', name: 'Receipt scanning', open: 1 },
  { key: 'SETL', name: 'Settle up', open: 0 },
];

const WORDS = ['Billing', 'Ledger', 'Onboarding', 'Search', 'Insights', 'Payouts', 'Support', 'Security'];
const MANY: Project[] = [
  ...FAIRSPLIT,
  ...Array.from({ length: 42 }, (_, i) => ({
    key: `P${String(i + 1).padStart(2, '0')}`,
    name: `${WORDS[i % WORDS.length]} ${Math.floor(i / WORDS.length) + 1}`,
    open: (i * 7) % 9,
  })),
];

/** Exact key, then keys that start with it, then a word of a name, then anywhere; ties by key. */
function rank(project: Project, query: string): number {
  const key = project.key.toLowerCase();
  const name = project.name.toLowerCase();
  if (key === query) return 0;
  if (key.startsWith(query)) return 1;
  if (name.split(/[\s-]+/).some((word) => word.startsWith(query))) return 2;
  if (key.includes(query)) return 3;
  if (name.includes(query)) return 4;
  return -1;
}

type State = 'ready' | 'loading' | 'error';

interface DemoProps {
  projects?: Project[];
  state?: State;
  held?: boolean;
  truncated?: boolean;
  /** Without a button the panel opens centred; this opens it from a plain button. */
  centred?: boolean;
  startOpen?: boolean;
  startQuery?: string;
}

function Demo({ projects = FAIRSPLIT, state = 'ready', held = false, truncated = false, centred = false, startOpen = false, startQuery = '' }: DemoProps) {
  const [open, setOpen] = useState(startOpen);
  const [query, setQuery] = useState(startQuery);
  const [current, setCurrent] = useState('FAIR');
  const q = query.trim().toLowerCase();

  const row = (p: Project): SwitcherOption => ({
    id: p.key,
    label: p.name,
    keyChip: p.key,
    meta: p.open,
    accessibleLabel: `${p.name}, ${p.key}, ${p.open} open`,
    href: `#/worklet/${p.key}`,
    current: p.key === current,
    onSelect: () => setCurrent(p.key),
  });

  const matched = q
    ? projects
        .map((p) => [rank(p, q), p] as const)
        .filter(([r]) => r >= 0)
        .sort((a, b) => a[0] - b[0] || a[1].key.localeCompare(b[1].key))
        .map(([, p]) => p)
    : projects;

  const groups: SwitcherGroup[] = [];
  if (state === 'ready' && !q && projects.length > 8) {
    const recent = ['SPLIT', 'APP', 'GROW'].filter((key) => key !== current);
    groups.push({ id: 'recent', label: 'Recent', options: projects.filter((p) => recent.includes(p.key)).map(row) });
  }
  if (state === 'ready' && matched.length > 0) {
    groups.push({ id: 'projects', label: 'Projects', count: matched.length, options: matched.map(row) });
  }

  let message: SwitcherMessage | undefined;
  if (state === 'error') {
    message = {
      title: 'The project list did not load',
      body: 'The page behind it is unchanged.',
      actions: [{ id: 'retry', label: 'Try again', icon: <RefreshCwGlyph size="md" />, keepsOpen: true }],
    };
  } else if (state === 'ready' && projects.length === 0) {
    message = { title: 'No projects yet', body: 'A project appears when a team or a seat in the org gets a tracker project key.' };
  } else if (state === 'ready' && q && matched.length === 0) {
    message = {
      title: `No project matches “${query.trim()}”`,
      body: 'Archived projects are listed under Projects.',
      actions: [{ id: 'search', label: `Search tasks for “${query.trim()}”`, icon: <SearchGlyph size="md" /> }],
    };
  }

  const total = projects.reduce((sum, p) => sum + p.open, 0);
  const pinned: SwitcherOption | undefined =
    state === 'ready' && (!q || ['all projects', 'projects'].some((w) => w.startsWith(q)))
      ? {
          id: 'all',
          label: 'All projects',
          icon: <LayersGlyph size="md" />,
          meta: total,
          accessibleLabel: `All projects, ${total} open`,
          href: '#/worklet',
          current: current === 'all',
          onSelect: () => setCurrent('all'),
        }
      : undefined;

  const footer: SwitcherOption[] = [
    ...(state === 'ready' && projects.length > 0
      ? [{ id: 'browse', label: 'Browse all projects', icon: <Columns3Glyph size="md" />, href: '#/worklet' }]
      : []),
    {
      id: 'new',
      label: 'New project…',
      icon: <PlusGlyph size="md" />,
      ...(held ? { held: 'Needs an operator credential', meta: <KeyGlyph size="xs" /> } : {}),
    },
  ];

  const scope = projects.find((p) => p.key === current);
  const switcher = (
    <Switcher
      label="Switch project"
      open={open}
      onOpenChange={setOpen}
      trigger={
        centred
          ? undefined
          : scope
            ? { label: scope.name, keyChip: scope.key, title: 'Switch project (G then P)' }
            : { label: 'All projects', title: 'Switch project (G then P)' }
      }
      query={query}
      onQueryChange={setQuery}
      placeholder="Find a project"
      listLabel="Projects"
      pinned={pinned}
      note={truncated && !q ? `${projects.length} of 340 listed. Type to search all of them.` : undefined}
      message={message}
      groups={groups}
      footer={footer}
      loading={state === 'loading'}
      loadingLabel="Loading projects"
      announcement={q ? (matched.length === 0 ? 'No project matches' : `${matched.length} ${matched.length === 1 ? 'project' : 'projects'}`) : undefined}
    />
  );

  return (
    <>
      <Announcer />
      {centred ? (
        <>
          <Button onClick={() => setOpen(true)}>Switch project</Button>
          {switcher}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 52, maxWidth: 720 }}>
          <Breadcrumb
            crumbs={[
              { label: 'Worklet', href: '#/worklet', icon: <SquareKanbanGlyph size="sm" /> },
              { label: scope?.name ?? 'All projects' },
            ]}
            current={switcher}
          />
        </div>
      )}
    </>
  );
}

/** Under its button in the trail. Click it, or focus it and press Down. */
export const Anchored: Story = {
  render: () => <Demo />,
};

/** Opened by a key from a page with no button: centred, and nothing behind it moves. */
export const Centred: Story = {
  render: () => <Demo centred />,
};

/** A company past eight projects: Recent leads, and the list scrolls under a fixed search and footer. */
export const ManyProjects: Story = {
  render: () => <Demo projects={MANY} />,
};

/** The listing was cut at 200: the note says so, and typing searches all of them. */
export const Truncated: Story = {
  render: () => <Demo projects={MANY} truncated />,
};

export const Searching: Story = {
  render: () => <Demo startOpen startQuery="s" />,
};

export const NoMatch: Story = {
  render: () => <Demo startOpen startQuery="invoice" />,
};

export const Loading: Story = {
  render: () => <Demo startOpen state="loading" />,
};

export const DidNotLoad: Story = {
  render: () => <Demo startOpen state="error" />,
};

export const NoProjectsYet: Story = {
  render: () => <Demo startOpen projects={[]} />,
};

/** New project stays in the footer with its reason for a viewer without the credential. */
export const Held: Story = {
  render: () => <Demo startOpen held />,
};

/** An archived project's page: its name carries a tag. */
export const ArchivedSubject: Story = {
  render: () => (
    <Breadcrumb
      crumbs={[{ label: 'Worklet', href: '#/worklet', icon: <SquareKanbanGlyph size="sm" /> }, { label: 'Legacy importer' }]}
      current={
        <Switcher
          label="Switch project"
          open={false}
          onOpenChange={() => {}}
          trigger={{
            label: 'Legacy importer',
            keyChip: 'OLD',
            tag: (
              <Tag size="xs" appearance="outline">
                Archived
              </Tag>
            ),
            title: 'Switch project (G then P)',
          }}
          query=""
          onQueryChange={() => {}}
        />
      }
    />
  ),
};
