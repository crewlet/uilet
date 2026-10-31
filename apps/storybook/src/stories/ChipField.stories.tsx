import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { Announcer, Avatar, ChipField, PersonRow, Tag } from '@crewlethq/ui';

/**
 * The chosen items of a picker as chips inside the field, before a bare text
 * box. Type to narrow the suggestions, Enter takes the first match,
 * Backspace in an empty box removes the last chip, and focus stays in the
 * box throughout. The suggestions under the field are PersonRows.
 */
const meta: Meta<typeof ChipField> = {
  title: 'UI/ChipField',
  component: ChipField,
  decorators: [
    (Story) => (
      <>
        <Announcer />
        {Story()}
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChipField>;

interface Seat {
  handle: string;
  name: string;
  agent: boolean;
  doing: string;
  character?: (typeof CREWLET_CHARACTERS)[number];
}

const SEATS: Seat[] = [
  { handle: 'pm', name: 'Product Manager', agent: true, doing: 'Writing the October brief', character: CREWLET_CHARACTERS[12] },
  { handle: 'backend', name: 'Senior Backend Engineer', agent: true, doing: 'Reviewing pull request 41', character: CREWLET_CHARACTERS[7] },
  { handle: 'designer', name: 'Designer', agent: true, doing: 'Drawing the onboarding screens', character: CREWLET_CHARACTERS[3] },
  { handle: 'ada', name: 'Ada Park', agent: false, doing: 'Head of Engineering' },
  { handle: 'lee', name: 'Lee Park', agent: false, doing: 'Founder' },
];

const face = (seat: Seat, size: 'xs' | 32) =>
  seat.agent ? (
    <Avatar name={seat.name} kind="agent" character={seat.character} size={size} decorative />
  ) : (
    <Avatar name={seat.name} kind="human" size={size} decorative />
  );

/** Add people to a room: the field boxed, the suggestions under it as toggling rows. */
export const AddPeople: Story = {
  render: function AddPeople() {
    const [chosen, setChosen] = useState<string[]>(['pm']);
    const [query, setQuery] = useState('');
    const box = useRef<HTMLInputElement | null>(null);
    const matches = SEATS.filter((seat) => !query || seat.name.toLowerCase().includes(query.toLowerCase()) || seat.doing.toLowerCase().includes(query.toLowerCase()));
    const toggle = (handle: string) => {
      setChosen((all) => (all.includes(handle) ? all.filter((one) => one !== handle) : [...all, handle]));
      setQuery('');
      box.current?.focus();
    };
    return (
      <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        <ChipField
          inputRef={box}
          label="Find people and agents"
          placeholder={chosen.length ? 'Add someone else' : 'Enter a name or role'}
          items={chosen.map((handle) => {
            const seat = SEATS.find((one) => one.handle === handle)!;
            return { id: handle, label: seat.name, leading: face(seat, 'xs') };
          })}
          onRemove={(handle) => setChosen((all) => all.filter((one) => one !== handle))}
          query={query}
          onQueryChange={setQuery}
          onCommit={() => {
            const first = matches.find((seat) => !chosen.includes(seat.handle));
            if (first) toggle(first.handle);
          }}
        />
        <ul aria-label={query ? 'Matches' : 'Suggestions'} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {matches.map((seat) => (
            <li key={seat.handle}>
              <PersonRow
                avatar={face(seat, 32)}
                name={seat.name}
                tag={seat.agent ? <Tag size="xs">Agent</Tag> : undefined}
                detail={seat.doing}
                mark="toggle"
                selected={chosen.includes(seat.handle)}
                onSelect={() => toggle(seat.handle)}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  },
};

/** The address line at the top of a new message: full width, a rule under it, focus a bar along the rule. */
export const ToLine: Story = {
  render: function ToLine() {
    const [chosen, setChosen] = useState<string[]>(['ada']);
    const [query, setQuery] = useState('');
    return (
      <div style={{ maxWidth: 720, border: '1px solid var(--color-border-default)', borderRadius: 14, overflow: 'hidden' }}>
        <ChipField
          variant="bare"
          prefix="To:"
          label="Who the message is to"
          placeholder="Names, agents or a #room"
          items={chosen.map((handle) => {
            const seat = SEATS.find((one) => one.handle === handle)!;
            return { id: handle, label: seat.name, leading: face(seat, 'xs') };
          })}
          onRemove={(handle) => setChosen((all) => all.filter((one) => one !== handle))}
          query={query}
          onQueryChange={setQuery}
        />
        <div style={{ height: 160 }} />
      </div>
    );
  },
};
