import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DatasetSource, DatasetSourceList } from '@crewlethq/ui';

/*
 * A dashboard's Sources rail: every dataset the board draws from, with what it
 * reads, how it is kept current and where it stands now. Selecting one shows
 * the host's preview of its rows under it.
 */
const NOW = Date.parse('2026-10-18T12:00:00Z');

const meta: Meta<typeof DatasetSource> = {
  title: 'UI/DatasetSource',
  component: DatasetSource,
  args: {
    title: 'My open work',
    kind: 'engine',
    definition: 'tracker.items, scope mine',
    refresh: 'On change',
    status: 'ready',
    asOf: NOW - 2 * 60_000,
    rows: 12,
    now: NOW,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DatasetSource>;

/** One entry on its own. */
export const Basic: Story = {};

/** The rail with its selection, a component so it may hold state. */
function Rail() {
  const [selected, setSelected] = useState('open');
  const pick = (id: string) => () => setSelected((current) => (current === id ? '' : id));
  return (
    <DatasetSourceList label="Sources">
      <DatasetSource
        title="My open work"
        kind="engine"
        definition="tracker.items, scope mine"
        refresh="On change"
        status="ready"
        asOf={NOW - 2 * 60_000}
        rows={12}
        now={NOW}
        selected={selected === 'open'}
        onSelect={pick('open')}
      >
        <ul
          style={{
            margin: 0,
            paddingInlineStart: 16,
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <li>ENG-12 Ship the dashboard kind</li>
          <li>ENG-14 Write the ADR</li>
        </ul>
      </DatasetSource>
      <DatasetSource
        title="Release checklist"
        kind="store"
        definition="collection checklist"
        refresh="Live"
        status="live"
        rows={8}
        selected={selected === 'checklist'}
        onSelect={pick('checklist')}
      />
      <DatasetSource
        title="Targets"
        kind="file"
        definition="data/targets.csv"
        status="ready"
        asOf={NOW - 86_400_000}
        rows={4}
        now={NOW}
        selected={selected === 'targets'}
        onSelect={pick('targets')}
      />
      <DatasetSource
        title="Open per assignee"
        kind="calc"
        definition="group My open work by assignee, count"
        status="ready"
        asOf={NOW - 2 * 60_000}
        rows={3}
        now={NOW}
        selected={selected === 'calc'}
        onSelect={pick('calc')}
      />
      <DatasetSource
        title="Spend by seat"
        kind="engine"
        definition="spend.seats, days 7"
        refresh="Every 5 min"
        status="refused"
        detail="Reading spend needs access to the overview."
        selected={selected === 'spend'}
        onSelect={pick('spend')}
      />
    </DatasetSourceList>
  );
}

/** The whole rail, each entry a toggle; the selected one shows its rows. */
export const TheRail: Story = {
  render: () => <Rail />,
};

/** Older than its refresh promises: marked, in words to a screen reader. */
export const Stale: Story = {
  args: { status: 'stale', asOf: NOW - 3 * 3_600_000 },
};

/** Not read yet. */
export const Loading: Story = {
  args: { status: 'loading', asOf: undefined, rows: undefined },
};
