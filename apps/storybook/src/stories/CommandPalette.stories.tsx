import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo, useState } from 'react';
import { Button, CommandPalette, Kbd, Tag, type CommandPaletteGroup, type CommandPaletteScope } from '@crewlethq/ui';
import {
  BookOpenGlyph,
  BotGlyph,
  ChartNoAxesGanttGlyph,
  CircleCheckGlyph,
  CircleGlyph,
  FileTextGlyph,
  LayoutDashboardGlyph,
  MessageSquareGlyph,
  PlusGlyph,
  UserGlyph,
  UsersGlyph,
} from '@crewlethq/icons/glyphs';

/**
 * UI / CommandPalette.
 *
 * The component knows nothing about what it searches: the caller ranks and
 * groups, and hands over rows. What the page below demonstrates is the keyboard
 * and the way a screen reader hears it, which is the part every product would
 * otherwise write again.
 */
const meta: Meta<typeof CommandPalette> = {
  title: 'UI/CommandPalette',
  component: CommandPalette,
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

const SCREENS = [
  { name: 'Fleet', hint: 'nodes and seats' },
  { name: 'Activity', hint: 'the event log' },
  { name: 'Seats', hint: 'who is running' },
  { name: 'Tools', hint: 'what a seat can call' },
  { name: 'Knowledge', hint: 'the shared base' },
];

const SEATS = [
  { name: 'Software Engineer', handle: 'swe' },
  { name: 'Product Manager', handle: 'pm' },
  { name: 'Staff Engineer', handle: 'staff' },
  { name: 'Design Lead', handle: 'design' },
];

function Hints() {
  return (
    <>
      <span>
        <Kbd keys={['ArrowUp']} /> <Kbd keys={['ArrowDown']} /> move
      </span>
      <span>
        <Kbd keys={['Enter']} /> open
      </span>
      <span>
        <Kbd keys={['Escape']} /> close
      </span>
    </>
  );
}

function Demo({ empty = false }: { empty?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(empty ? 'nothing like this exists' : '');
  const [chosen, setChosen] = useState('');

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    const term = query.trim().toLowerCase();
    const matches = (text: string) => term === '' || text.toLowerCase().includes(term);
    const screens = SCREENS.filter((screen) => matches(screen.name)).map((screen) => ({
      id: `screen-${screen.name}`,
      icon: <LayoutDashboardGlyph size="sm" />,
      label: screen.name,
      hint: screen.hint,
      onSelect: () => setChosen(screen.name),
    }));
    const seats = SEATS.filter((seat) => matches(seat.name)).map((seat) => ({
      id: `seat-${seat.handle}`,
      icon: <UserGlyph size="sm" />,
      label: seat.name,
      hint: `@${seat.handle}`,
      onSelect: () => setChosen(seat.name),
    }));
    const search = term
      ? [
          {
            id: 'search-events',
            icon: <ChartNoAxesGanttGlyph size="sm" />,
            label: `Events mentioning ${term}`,
            hint: 'the event log, filtered',
            onSelect: () => setChosen('Activity'),
          },
          {
            id: 'search-knowledge',
            icon: <FileTextGlyph size="sm" />,
            label: `Knowledge base for ${term}`,
            hint: 'live search',
            onSelect: () => setChosen('Knowledge'),
          },
        ]
      : [];
    return [
      { id: 'go', label: 'Go to', items: screens },
      { id: 'seats', label: 'Seats', items: seats },
      { id: 'search', label: 'Search', items: search },
    ].filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', justifyItems: 'start', padding: 'var(--spacing-6)' }}>
      <Button leadingIcon={<UsersGlyph size="sm" />} onClick={() => setOpen(true)}>
        Open search
      </Button>
      {chosen ? <p>Opened: {chosen}</p> : null}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
        placeholder="Search screens and seats, or paste an event id"
        footer={<Hints />}
        // The chord belongs to the application, so it reaches the frame as an
        // ordinary handler rather than as a prop this component invents.
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            setOpen(false);
          }
        }}
      />
    </div>
  );
}

export const Basic: Story = {
  render: () => <Demo />,
};

/** An honest empty state: it names the kind of nothing this is. */
export const NothingMatches: Story = {
  render: () => <Demo empty />,
};

const SCOPES = ['all', 'tasks', 'pages', 'agents', 'actions'] as const;

/** A task's key in the code face and the quiet ink, ahead of its title, as the design sets it. */
function TaskTitle({ id, title }: { id: string; title: string }) {
  return (
    <>
      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-regular)', color: 'var(--color-text-tertiary)' }}>
        {id}
      </span>{' '}
      {title}
    </>
  );
}
type Scope = (typeof SCOPES)[number];

/**
 * The approved design's ⌘K: five scopes, an answer leading the rows, rows that
 * end in a fact or an accelerator, and a key legend.
 *
 * The rows arrive 400ms after the scope changes, as a network search's would,
 * so the guard can be seen: until they answer the scope the reader is on, the
 * list says it is searching instead of showing the last scope's rows.
 */
function ScopedDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('flaky e2e cluster join');
  const [scope, setScope] = useState<Scope>('all');
  const [answered, setAnswered] = useState<Scope>('all');
  const [chosen, setChosen] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setAnswered(scope), 400);
    return () => clearTimeout(timer);
  }, [scope]);

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    const term = query.trim() || 'this';
    const tasks = {
      id: 'tasks',
      label: 'Tasks',
      items: [
        {
          id: 'eng-420',
          // A task row leads with its STATE, as the design's does: the bare
          // ring is Todo, in the quiet ink, and the check is Done, in the
          // success ink, because done is the one state that hue means.
          icon: <CircleGlyph size="sm" style={{ color: 'var(--color-text-tertiary)' }} />,
          label: <TaskTitle id="ENG-420" title="Flaky e2e: cluster join under packet loss" />,
          hint: 'Todo · unassigned',
          onSelect: () => setChosen('ENG-420'),
        },
        {
          id: 'eng-387',
          icon: <CircleCheckGlyph size="sm" style={{ color: 'var(--color-feedback-success-ink)' }} />,
          label: <TaskTitle id="ENG-387" title="Cluster join: retry on partition" />,
          hint: 'Done · SWE · Aug 30',
          onSelect: () => setChosen('ENG-387'),
        },
      ],
    };
    const pages = {
      id: 'pages',
      label: 'Pages',
      items: [
        {
          id: 'on-call',
          icon: <FileTextGlyph size="sm" />,
          label: 'Scheduler on-call',
          hint: '› Known flakes › cluster join',
          meta: 'Engineering',
          onSelect: () => setChosen('Scheduler on-call'),
        },
      ],
    };
    const agents = {
      id: 'agents',
      label: 'Agents',
      items: [
        {
          id: 'swe',
          icon: <BotGlyph size="sm" />,
          label: 'Software Engineer',
          hint: '@swe · owns cluster join',
          onSelect: () => setChosen('Software Engineer'),
        },
      ],
    };
    const actions = {
      id: 'actions',
      label: 'Actions',
      items: [
        {
          id: 'assign',
          icon: <UsersGlyph size="sm" />,
          label: 'Assign ENG-420 to an agent…',
          hint: 'suggested: SWE, owns cluster join',
          meta: <Kbd keys={['A']} />,
          onSelect: () => setChosen('Assign'),
        },
        {
          id: 'ask',
          icon: <MessageSquareGlyph size="sm" />,
          label: `Ask SWE about “${term}”`,
          hint: 'opens an ask, the answer lands in your inbox',
          meta: <Kbd keys={['Mod', 'Enter']} />,
          onSelect: () => setChosen('Ask'),
        },
        {
          id: 'create',
          icon: <PlusGlyph size="sm" />,
          label: `Create task “${term}”`,
          hint: 'in ENG · Core platform',
          meta: <Kbd keys={['C']} />,
          onSelect: () => setChosen('Create'),
        },
      ],
    };
    const by: Record<Scope, CommandPaletteGroup[]> = {
      all: [tasks, pages, actions],
      tasks: [tasks],
      pages: [pages],
      agents: [agents],
      actions: [actions],
    };
    return by[answered];
  }, [answered, query]);

  const scopes: CommandPaletteScope[] = [
    { id: 'all', label: 'All' },
    { id: 'tasks', label: 'Tasks', count: 2 },
    { id: 'pages', label: 'Pages', count: 1 },
    { id: 'agents', label: 'Agents' },
    { id: 'actions', label: 'Actions' },
  ];

  const lead =
    answered === scope && (scope === 'all' || scope === 'pages') ? (
      <>
        <span style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
          <BookOpenGlyph size="sm" /> Answer from your company’s knowledge
        </span>
        <p style={{ margin: 0 }}>
          ENG-420 tracks it. Cluster join fails about one run in thirty when the harness drops 5% of packets: the join
          timeout (10s) is shorter than the election timeout under loss. It is in Todo, unassigned, due Sep 30.
        </p>
        <span style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
          Sources <Tag>ENG-420</Tag> <Tag>Scheduler on-call</Tag> <Tag>SWE turn 11</Tag>
        </span>
      </>
    ) : null;

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)', justifyItems: 'start', padding: 'var(--spacing-6)' }}>
      <Button leadingIcon={<ChartNoAxesGanttGlyph size="sm" />} onClick={() => setOpen(true)}>
        Ask or jump to…
      </Button>
      {chosen ? <p>Opened: {chosen}</p> : null}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        label="Ask or jump to"
        query={query}
        onQueryChange={setQuery}
        scopes={scopes}
        scope={scope}
        onScopeChange={(next) => setScope(SCOPES.find((known) => known === next) ?? 'all')}
        groupsScope={answered}
        groups={groups}
        lead={lead}
        escapeHint
        footer={
          <>
            <span>
              <Kbd keys={['ArrowUp']} /> <Kbd keys={['ArrowDown']} /> move
            </span>
            <span>
              <Kbd keys={['Tab']} /> scope
            </span>
            <span>
              <Kbd keys={['Enter']} /> open
            </span>
            <span>
              <Kbd keys={['Mod', 'Enter']} /> ask an agent
            </span>
          </>
        }
        // The accelerators the rows' meta draws are the application's, on the
        // frame, like the chord that opens the surface.
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            setChosen('Ask');
            setOpen(false);
          }
        }}
      />
    </div>
  );
}

/**
 * Scopes, an answer leading the rows, accelerators at the rows' ends, and a key
 * legend, under the design's field row: the search glyph the palette always
 * draws, and the `Esc` keycap `escapeHint` asks for.
 */
export const Scoped: Story = {
  render: () => <ScopedDemo />,
};
