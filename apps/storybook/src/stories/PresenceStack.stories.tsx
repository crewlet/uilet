import type { Meta, StoryObj } from '@storybook/react-vite';
import { PresenceStack, type PresenceMember } from '@crewlethq/ui';

const meta: Meta<typeof PresenceStack> = {
  title: 'UI/PresenceStack',
  component: PresenceStack,
};

export default meta;
type Story = StoryObj<typeof PresenceStack>;

const ROOM: PresenceMember[] = [
  { id: 's1', name: 'Maya Ortiz', kind: 'human', activity: 'editing', hue: 'cyan', location: 'editing row Acme Corp' },
  { id: 's2', name: 'PM', kind: 'agent', activity: 'viewing', hue: 'rose', character: 'gemlet', location: 'reading version 12 for ENG-412' },
  { id: 's3', name: 'Jane Founder', kind: 'human', activity: 'viewing', hue: 'green' },
  { id: 's4', name: 'CTO', kind: 'agent', activity: 'editing', hue: 'amber', character: 'hexlet' },
  { id: 's5', name: 'Sam Lee', kind: 'human', activity: 'idle', hue: 'blue' },
  { id: 's6', name: 'Priya Shah', kind: 'human', activity: 'viewing', hue: 'purple' },
];

/** Nobody else here: the stack draws nothing. */
export const Empty: Story = { args: { members: [] } };

/** One other person. */
export const OnePerson: Story = { args: { members: ROOM.slice(0, 1) } };

/** People and agents together, ordered by what they are doing, each ringed in their presence hue. */
export const PeopleAndAgents: Story = { args: { members: ROOM.slice(0, 4) } };

/** Past four, the rest are counted in a chip and still read out. */
export const Overflow: Story = { args: { members: ROOM } };

/** An idle collaborator loses the ring and fades, and says Idle in words. */
export const Idle: Story = { args: { members: ROOM.filter((member) => member.activity === 'idle' || member.kind === 'agent') } };

/** With onSelect each badge is a button: a host opens Follow or Open turn from it. */
export const KeyboardSelection: Story = {
  args: { members: ROOM, onSelect: (member: PresenceMember) => window.alert(`Follow ${member.name}`) },
};

/** Forced colours keep a system outline round each present badge; check with the forced colours emulation. */
export const ForcedColours: Story = { args: { members: ROOM.slice(0, 3) } };
