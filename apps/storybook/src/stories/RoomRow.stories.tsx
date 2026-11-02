import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, ButtonLink, Callout, List, RoomRow, Tag } from '@crewlethq/ui';
import { HashGlyph, LockGlyph, UsersGlyph } from '@crewlethq/icons/glyphs';

/**
 * A room as a directory of rooms lists it: its kind's mark, its name and
 * state, what it is about, a line of facts, and one control beside the row's
 * own link. Drawn by `List`, so a directory of rooms is a divided list.
 */
const meta: Meta<typeof RoomRow> = {
  title: 'UI/RoomRow',
  component: RoomRow,
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof RoomRow>;

/** Browse rooms: Join where the room takes one, Open where it does not, and why. */
export const Directory: Story = {
  render: function Directory() {
    const [joined, setJoined] = useState(false);
    return (
      <List aria-label="Rooms">
        <RoomRow
          href="#/chat/launch"
          mark={<HashGlyph size="sm" />}
          name="launch"
          tags={joined ? <Tag size="xs" variant="success" dot>Joined</Tag> : undefined}
          topic="Friday's release, and what is left before it"
          facts={['12 members', 'last message 4 minutes ago']}
          action={
            joined ? (
              <ButtonLink size="small" variant="ghost" href="#/chat/launch">
                Open
              </ButtonLink>
            ) : (
              <Button size="small" variant="secondary" onClick={() => setJoined(true)}>
                Join
              </Button>
            )
          }
        />
        <RoomRow
          href="#/chat/team"
          mark={<UsersGlyph size="sm" />}
          name="team"
          topic="Plan, design, build, test and ship"
          facts={['6 members', 'last message 1 hour ago', "This is the core team's own room. Anyone can read it, and its members are the team's, set in the org chart."]}
          action={
            <ButtonLink size="small" variant="ghost" href="#/chat/team">
              Open
            </ButtonLink>
          }
        />
        <RoomRow
          href="#/chat/q3-planning"
          mark={<LockGlyph size="sm" />}
          name="q3-planning"
          tags={<Tag size="xs">Archived</Tag>}
          facts={['4 members']}
          action={
            <ButtonLink size="small" variant="ghost" href="#/chat/q3-planning">
              Open
            </ButtonLink>
          }
        />
      </List>
    );
  },
};

/** What pressing Join came to, under the row, when it needs saying. */
export const WithANote: Story = {
  render: () => (
    <List aria-label="Rooms">
      <RoomRow
        href="#/chat/ops"
        mark={<HashGlyph size="sm" />}
        name="anunbrokenroomnamewithnohyphensthatwrapsratherthanrunningunderjoin"
        facts={['2 members']}
        action={
          <Button size="small" variant="secondary">
            Join
          </Button>
        }
        note={<Callout variant="warning">The room was archived a moment ago, so it takes nobody new.</Callout>}
      />
    </List>
  ),
};
