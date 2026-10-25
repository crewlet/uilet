import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListChecksGlyph } from '@crewlethq/icons/glyphs';
import { Avatar, ButtonLink, EntityList } from '@crewlethq/ui';

/**
 * People, seats or records an answer names: the avatar or glyph, the name
 * over one fact, and the row's own link. As a card under a title, or bare.
 */
const meta: Meta<typeof EntityList> = {
  title: 'UI/EntityList',
  component: EntityList,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof EntityList>;

const open = (href: string, label = 'Open') => (
  <ButtonLink href={href} variant="ghost" size="small">
    {label}
  </ButtonLink>
);

export const People: Story = {
  args: {
    title: 'Who can approve spend',
    items: [
      { id: 'jane', name: 'Jane Founder', fact: 'Owner', avatar: <Avatar name="Jane Founder" size="sm" />, action: open('#/people/jane', 'Profile') },
      { id: 'sam', name: 'Sam Rivera', fact: 'Admin', avatar: <Avatar name="Sam Rivera" size="sm" />, action: open('#/people/sam', 'Profile') },
    ],
  },
};

export const Seats: Story = {
  args: {
    title: 'Agents in Core',
    items: [
      { id: 'swe', name: 'Agent SWE', fact: 'Working on ENG-142', avatar: <Avatar name="Agent SWE" kind="agent" size="sm" />, action: open('#/agents/swe', 'Profile') },
      { id: 'ai', name: 'Agent AI Systems Engineer', fact: 'Idle for 2 hours', avatar: <Avatar name="Agent AI Systems Engineer" kind="agent" size="sm" />, action: open('#/agents/ai', 'Profile') },
    ],
  },
};

export const Tasks: Story = {
  args: {
    label: 'Blocked tasks',
    items: [
      { id: 'eng-142', name: 'ENG-142 · Migrate the build cache', fact: 'Blocked · Core', avatar: <ListChecksGlyph size="sm" />, action: open('#/work/ENG-142') },
      { id: 'eng-133', name: 'ENG-133 · Remove the legacy export endpoint', fact: 'Blocked · Executives', avatar: <ListChecksGlyph size="sm" />, action: open('#/work/ENG-133') },
    ],
  },
};
