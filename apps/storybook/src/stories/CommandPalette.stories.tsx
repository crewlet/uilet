import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { Button, CommandPalette, Kbd, type CommandPaletteGroup } from '@crewlethq/ui';
import {
  DashboardGlyph,
  DescriptionGlyph,
  GroupGlyph,
  PersonGlyph,
  TimelineGlyph,
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
      icon: <DashboardGlyph size="sm" />,
      label: screen.name,
      hint: screen.hint,
      onSelect: () => setChosen(screen.name),
    }));
    const seats = SEATS.filter((seat) => matches(seat.name)).map((seat) => ({
      id: `seat-${seat.handle}`,
      icon: <PersonGlyph size="sm" />,
      label: seat.name,
      hint: `@${seat.handle}`,
      onSelect: () => setChosen(seat.name),
    }));
    const search = term
      ? [
          {
            id: 'search-events',
            icon: <TimelineGlyph size="sm" />,
            label: `Events mentioning ${term}`,
            hint: 'the event log, filtered',
            onSelect: () => setChosen('Activity'),
          },
          {
            id: 'search-knowledge',
            icon: <DescriptionGlyph size="sm" />,
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
      <Button leadingIcon={<GroupGlyph size="sm" />} onClick={() => setOpen(true)}>
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
