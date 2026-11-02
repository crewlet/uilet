import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CREWLET_CHARACTERS } from '@crewlethq/icons/characters';
import { Avatar, PersonRow, Switch, Tag, Tooltip } from '@crewlethq/ui';

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

/**
 * A member list where each agent's row ends in a control of its own: whether
 * every message in the room reaches it. The switch stands beside the row's
 * button, so pressing the row still opens the profile. A team's own room
 * holds the setting fixed, with the reason on the switch.
 */
export const MembersWithAnAction: Story = {
  render: function MembersWithAnAction() {
    const [following, setFollowing] = useState<Record<string, boolean>>({ pm: true, designer: false });
    const words = (on: boolean) => (on ? 'Gets every message' : 'Answers when named');
    return (
      <ul aria-label="Members" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {[
          { id: 'pm', name: 'Product Manager', face: agent('Product Manager', 12, 'working') },
          { id: 'designer', name: 'Designer', face: agent('Designer', 3) },
        ].map((row) => (
          <li key={row.id}>
            <PersonRow
              avatar={row.face}
              name={row.name}
              tag={<Tag size="xs">Agent</Tag>}
              detail={words(following[row.id] ?? false)}
              action={
                <Switch
                  label={`${row.name} gets every message`}
                  labelHidden
                  checked={following[row.id] ?? false}
                  onCheckedChange={(on) => setFollowing((all) => ({ ...all, [row.id]: on }))}
                />
              }
            />
          </li>
        ))}
        <li>
          <PersonRow
            avatar={agent('QA Engineer', 5)}
            name="QA Engineer"
            tag={<Tag size="xs">Agent</Tag>}
            detail="Gets every message"
            action={
              <Tooltip content="The org chart sets this: a team's own agents get every message in its room.">
                <Switch
                  label="QA Engineer gets every message"
                  labelHidden
                  checked
                  disabledReason="The org chart sets this: a team's own agents get every message in its room."
                />
              </Tooltip>
            }
          />
        </li>
      </ul>
    );
  },
};
