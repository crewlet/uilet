import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrangeList, Announcer, type ArrangeItem } from '@crewlethq/ui';

const meta: Meta<typeof ArrangeList> = {
  title: 'UI/ArrangeList',
  component: ArrangeList,
};

export default meta;
type Story = StoryObj<typeof ArrangeList>;

const SECTIONS: ArrangeItem[] = [
  { key: 'figures', label: 'Figures', description: 'Agents working, decisions waiting, tokens.', shown: true },
  { key: 'decisions', label: 'Needs your decision', description: 'Questions only you can answer.', shown: true },
  { key: 'live', label: 'Live now', description: 'The agents on a turn right now.', shown: true },
  { key: 'tokens', label: 'Tokens by team', description: 'Where the tokens went, team by team.', shown: false },
  { key: 'feed', label: 'Recent activity', description: 'What the company did.', shown: true },
];

function Arranged({ toggle, initial }: { toggle?: 'switch' | 'checkbox'; initial: ArrangeItem[] }) {
  const [items, setItems] = useState(initial);
  return (
    <div style={{ maxWidth: 520 }}>
      <Announcer />
      <ArrangeList
        label="Sections on Home"
        toggle={toggle}
        items={items}
        onReorder={(keys) => setItems(keys.map((k) => items.find((i) => i.key === k)!))}
        onShownChange={(key, shown) => setItems(items.map((i) => (i.key === key ? { ...i, shown } : i)))}
      />
    </div>
  );
}

/** Drag a handle, or focus it and press the arrow keys; every move is announced. */
export const Basic: Story = { render: () => <Arranged initial={SECTIONS} /> };

/** Ticks rather than switches, for a list read when a form is saved. */
export const Checkboxes: Story = { render: () => <Arranged toggle="checkbox" initial={SECTIONS} /> };

/** An item that cannot be turned off says why and stays reachable. */
export const Fixed: Story = {
  render: () => (
    <Arranged
      initial={SECTIONS.map((s, i) => (i === 0 ? { ...s, fixed: 'At least one section stays.' } : s))}
    />
  ),
};
