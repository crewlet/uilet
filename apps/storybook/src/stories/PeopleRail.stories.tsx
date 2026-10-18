import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ButtonLink, FollowBanner, PeopleRail, PresenceStack, peopleRailKey, type PresenceMember } from '@crewlethq/ui';

const meta: Meta<typeof PeopleRail> = {
  title: 'UI/PeopleRail',
  component: PeopleRail,
};

export default meta;
type Story = StoryObj<typeof PeopleRail>;

const ROOM: PresenceMember[] = [
  { id: 's1', seat: 'maya', name: 'Maya Ortiz', kind: 'human', activity: 'editing', hue: 'purple', location: 'Editing row Acme Corp' },
  { id: 's2', seat: 'pm', name: 'Product Manager', kind: 'agent', activity: 'viewing', hue: 'rose', character: 'gemlet', location: 'Reading version 12 for ENG-412' },
  { id: 's3', seat: 'jane', name: 'Jane Founder', kind: 'human', activity: 'viewing', hue: 'cyan' },
  { id: 's4', seat: 'ops', name: 'Ops Agent', kind: 'agent', activity: 'idle', hue: 'green' },
];

/**
 * The rail beside the presence stack and the follow strip, as an artifact's
 * page draws them: Follow on a row starts the strip, and Stop or Escape ends
 * it.
 */
export const WithFollowMode: Story = {
  render: function Render() {
    const [following, setFollowing] = useState<PresenceMember | null>(null);
    return (
      <div style={{ display: 'grid', gap: 12, maxWidth: 380 }}>
        <PresenceStack members={ROOM} />
        {following && <FollowBanner name={following.name} onStop={() => setFollowing(null)} />}
        <PeopleRail
          members={ROOM}
          self={{ name: 'Miles', kind: 'human' }}
          following={following ? peopleRailKey(following) : undefined}
          onFollow={setFollowing}
          onClose={() => {}}
          actions={(member) =>
            member.kind === 'agent' && member.activity !== 'idle' ? (
              <ButtonLink size="small" variant="ghost" href="#">
                Open turn
              </ButtonLink>
            ) : null
          }
        />
      </div>
    );
  },
};

/** Only the reader is here. */
export const Alone: Story = {
  args: { members: [], self: { name: 'Miles', kind: 'human' } },
};
