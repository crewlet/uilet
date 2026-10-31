import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AddReaction, ReactionBar, type ReactionSummary } from '@crewlethq/ui';

/**
 * A message's reactions. At rest a pill is a soft fill with no edge; under
 * the pointer it takes the strong edge. Yours is the accent's soft fill in
 * an accent ring with its count at the medium weight. Each pill's hint says
 * who reacted, you first. The add pill opens the emoji picker.
 */
const meta: Meta<typeof ReactionBar> = {
  title: 'UI/ReactionBar',
  component: ReactionBar,
};

export default meta;
type Story = StoryObj<typeof ReactionBar>;

const START: ReactionSummary[] = [
  { emoji: '✅', count: 3, mine: true, people: ['Designer', 'Product Manager'] },
  { emoji: '👀', count: 1, mine: false, people: ['Senior Backend Engineer'] },
  { emoji: '🚀', count: 6, mine: false },
];

function Live({ disabledReason }: { disabledReason?: string }) {
  const [list, setList] = useState(START);
  const toggle = (emoji: string) =>
    setList((was) => {
      const found = was.find((r) => r.emoji === emoji);
      if (!found) return [...was, { emoji, count: 1, mine: true }];
      const next = { ...found, mine: !found.mine, count: found.count + (found.mine ? -1 : 1) };
      return next.count === 0 ? was.filter((r) => r.emoji !== emoji) : was.map((r) => (r.emoji === emoji ? next : r));
    });
  return (
    <ReactionBar
      reactions={list}
      onToggle={toggle}
      disabledReason={disabledReason}
      add={disabledReason ? undefined : <AddReaction onPick={toggle} />}
    />
  );
}

/** Toggle a pill, or add a reaction from the picker. */
export const Default: Story = { render: () => <Live /> };

/** A reader who is not in the room: the pills say who reacted, and why they hold. */
export const Held: Story = { render: () => <Live disabledReason="Join the room to react." /> };
