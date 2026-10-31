import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { Avatar, PersonRow, Tag } from '@crewlethq/ui';

/**
 * A person or an agent as one row of a list: the face with its status, the
 * name (and an Agent label), what they are doing now or their title, and, for
 * a row that adds and takes away, a plus that turns into a check. One design
 * for every list of people, the composer's @ list included.
 */
const meta: Meta<typeof PersonRow> = {
  title: 'UI/PersonRow',
  component: PersonRow,
  decorators: [(Story) => <div style={{ maxWidth: 440 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof PersonRow>;

const agent = (name: string, index: number, status?: 'working' | 'needs') => (
  <Avatar name={name} kind="agent" character={CREWLET_CHARACTERS[index]} size={32} status={status} decorative />
);

/** Rows that toggle, as a picker's suggestions draw them. */
export const Toggles: Story = {
  render: function Toggles() {
    const [chosen, setChosen] = useState<string[]>(['designer']);
    const toggle = (id: string) => setChosen((all) => (all.includes(id) ? all.filter((one) => one !== id) : [...all, id]));
    const rows = [
      { id: 'pm', name: 'Product Manager', detail: 'Writing the October brief', face: agent('Product Manager', 12, 'working'), agent: true },
      { id: 'designer', name: 'Designer', detail: 'Drawing the onboarding screens', face: agent('Designer', 3), agent: true },
      { id: 'ada', name: 'Ada Park', detail: 'Head of Engineering', face: <Avatar name="Ada Park" kind="human" size={32} decorative />, agent: false },
    ];
    return (
      <ul aria-label="Suggestions" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li key={row.id}>
            <PersonRow
              avatar={row.face}
              name={row.name}
              tag={row.agent ? <Tag size="xs">Agent</Tag> : undefined}
              detail={row.detail}
              mark="toggle"
              selected={chosen.includes(row.id)}
              onSelect={() => toggle(row.id)}
            />
          </li>
        ))}
      </ul>
    );
  },
};

/** Rows that open something (a member list, a search's people): no mark, trailing words at the end. */
export const Members: Story = {
  render: () => (
    <ul aria-label="Members" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <li>
        <PersonRow avatar={agent('Senior Backend Engineer', 7, 'needs')} name="Senior Backend Engineer" tag={<Tag size="xs">Agent</Tag>} detail="Waiting on a decision" meta="Needs you" />
      </li>
      <li>
        <PersonRow avatar={<Avatar name="Lee Park" kind="human" size={32} decorative />} name="Lee Park" detail="Founder" meta="Admin" />
      </li>
    </ul>
  ),
};

/** One line, for a list that opens under a caret, as options of a listbox a field owns. */
export const CompactOptions: Story = {
  render: () => (
    <ul role="listbox" aria-label="People and agents" style={{ listStyle: 'none', margin: 0, padding: 4 }}>
      <PersonRow as="option" id="c-0" density="compact" avatar={<Avatar name="Product Manager" kind="agent" character={CREWLET_CHARACTERS[12]} size="sm" status="working" decorative />} name="Product Manager" detail="Writing the October brief" meta="Working" selected highlighted />
      <PersonRow as="option" id="c-1" density="compact" avatar={<Avatar name="Ada Park" kind="human" size="sm" decorative />} name="Ada Park" detail="ada" selected={false} />
    </ul>
  ),
};
