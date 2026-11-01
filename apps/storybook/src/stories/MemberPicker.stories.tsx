import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, MemberPicker, type MemberPickerGroup, type MemberPickerValue } from '@crewlethq/ui';
import { themeScope } from '../themeScope';

/**
 * Who gets something, as one list: teams with a three-state box, their member
 * count and, once chosen, that they reach agents who join later; each team
 * opens to its agents, each with its face, its name and one quiet line. An
 * agent a chosen team reaches says so, and unticking it leaves it out of that
 * grant; an agent of an unchosen team is chosen on its own. The count stays on
 * top as the choice moves.
 */
const meta: Meta<typeof MemberPicker> = {
  title: 'UI/MemberPicker',
  component: MemberPicker,
  decorators: [(Story) => <div style={{ maxWidth: 560 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof MemberPicker>;

const agent = (key: string, name: string, detail: string, character: 'crewlet' | 'gemlet' | 'hexlet' | 'prismlet' | 'peaklet' | 'shieldlet', hue: 'rose' | 'cyan' | 'purple' | 'amber' | 'green' | 'blue') => ({
  key,
  name,
  detail,
  avatar: <Avatar name={name} kind="agent" character={character} hue={hue} size="sm" />,
});

const TEAMS: MemberPickerGroup[] = [
  {
    key: 'product',
    label: 'Product and Engineering',
    members: [
      agent('pm', 'PM', 'Turns direction into a prioritised backlog', 'crewlet', 'rose'),
      agent('backend', 'Backend Engineer', 'Builds the API from the backlog', 'gemlet', 'cyan'),
      agent('app', 'App Engineer', 'Builds the iOS and Android apps', 'hexlet', 'purple'),
      agent('designer', 'Designer', 'Designs every lesson screen', 'prismlet', 'amber'),
    ],
  },
  {
    key: 'ops',
    label: 'Operations',
    members: [
      agent('qa', 'QA', 'Tests every change before it ships', 'peaklet', 'green'),
      agent('sre', 'SRE', 'Keeps the API up and answers alerts', 'shieldlet', 'blue'),
    ],
  },
];

function Picker({ initial, open = [] }: { initial: MemberPickerValue; open?: string[] }) {
  const [value, setValue] = useState<MemberPickerValue>(initial);
  return <MemberPicker label="Who gets Sentry" groups={TEAMS} value={value} onChange={setValue} defaultOpen={open} />;
}

/** One team chosen whole, one agent left out of it, and an agent of the other team chosen on its own. */
export const TeamWithOverrides: Story = {
  render: () => <Picker initial={{ groups: ['product'], members: ['sre'], except: ['designer'] }} open={['product', 'ops']} />,
};

/** Nothing chosen yet, every team closed. */
export const Empty: Story = { render: () => <Picker initial={{ groups: [], members: [], except: [] }} /> };

/**
 * Every agent of a team chosen on its own: the team's box is mixed, not
 * ticked, because the team itself is not chosen and an agent who joins it
 * later would not be reached.
 */
export const EveryAgentOnTheirOwn: Story = {
  render: () => <Picker initial={{ groups: [], members: ['qa', 'sre'], except: [] }} open={['ops']} />,
};

/** People rather than agents: members in no team listed after the teams, and the words the caller's. */
export const PeopleWithUngrouped: Story = {
  render: function Render() {
    const [value, setValue] = useState<MemberPickerValue>({ groups: ['leads'], members: ['grace'], except: [] });
    return (
      <MemberPicker
        label="Who can approve"
        groups={[
          {
            key: 'leads',
            label: 'Unit leads',
            members: [
              { key: 'ada', name: 'Ada Lovelace', detail: 'Product lead', avatar: <Avatar name="Ada Lovelace" size="sm" /> },
              { key: 'alan', name: 'Alan Turing', detail: 'Operations lead', avatar: <Avatar name="Alan Turing" size="sm" /> },
            ],
          },
        ]}
        ungrouped={[
          { key: 'grace', name: 'Grace Hopper', detail: 'Admin', avatar: <Avatar name="Grace Hopper" size="sm" /> },
          { key: 'edsger', name: 'Edsger Dijkstra', detail: 'Admin', avatar: <Avatar name="Edsger Dijkstra" size="sm" /> },
        ]}
        value={value}
        onChange={setValue}
        defaultOpen={['leads']}
        labels={{
          later: 'Includes people who become leads later',
          summary: (chosen, total) => `${chosen} of ${total} ${total === 1 ? 'person' : 'people'}`,
          count: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
          expand: (group) => `Show the people in ${group}`,
        }}
      />
    );
  },
};

/** Both themes, a team partly chosen. */
export const BothThemes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...themeScope(theme), padding: 'var(--spacing-4)', background: 'var(--color-surface-background)' }}>
          <Picker initial={{ groups: ['product'], members: [], except: ['app'] }} open={['product']} />
        </div>
      ))}
    </div>
  ),
};
