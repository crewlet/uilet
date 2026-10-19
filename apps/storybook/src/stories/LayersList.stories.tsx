import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type CSSProperties } from 'react';
import { LayersList, type LayersListItem } from '@crewlethq/ui';

/**
 * UI / LayersList.
 *
 * The list of a canvas's items beside it, as a design tool's layers are: the
 * caller holds the selection and hands it to the list and the canvas both.
 *
 * Try it: Tab onto the list (one stop), walk it with the arrows, Home and End,
 * pick with Space or a click, and open with Enter or a double-click. Hover a
 * cut name for the whole of it.
 */
const meta: Meta<typeof LayersList> = {
  title: 'UI/LayersList',
  component: LayersList,
};

export default meta;
type Story = StoryObj<typeof LayersList>;

const BOARDS: LayersListItem[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'signup', label: 'Sign up' },
];

const MANY: LayersListItem[] = Array.from({ length: 40 }, (_, i) => ({
  id: `screen-${i + 1}`,
  label:
    i === 3 ? 'Account settings, billing and invoices for a workspace with a very long name' : `Screen ${i + 1}`,
}));

/** The column a design view gives the list: as wide as its names, to 12rem, and the canvas's height. */
const COLUMN: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'minmax(0, 1fr)',
  width: 'fit-content',
  maxWidth: '12rem',
  height: '24rem',
  paddingInlineStart: 'var(--spacing-4)',
};

function Picked({ items, initial, heading }: { items: LayersListItem[]; initial: string | null; heading?: string }) {
  const [selected, setSelected] = useState<string | null>(initial);
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
      <div style={COLUMN}>
        <LayersList
          label="Boards"
          items={items}
          selected={selected}
          onSelect={setSelected}
          onOpen={setOpened}
          heading={heading}
        />
      </div>
      <p style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
        {opened ? `Opened ${opened}` : 'Press Enter or double-click an entry to open it'}
      </p>
    </div>
  );
}

/** A design's four boards, one of them picked on the canvas. */
export const Selected: Story = { render: () => <Picked items={BOARDS} initial="features" /> };

/** Forty entries under a count that stays: the list scrolls on its own, and a long name is cut to one line. */
export const ManyEntries: Story = { render: () => <Picked items={MANY} initial="screen-4" heading="40 boards" /> };

/** A column narrower than its names: every name is cut, its whole self on hover. */
export const Narrow: Story = {
  render: () => (
    <div style={{ ...COLUMN, width: '6rem' }}>
      <LayersList label="Boards" items={MANY.slice(0, 8)} selected="screen-2" heading="8 boards" />
    </div>
  ),
};
