import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { VersionTimeline, type VersionItem } from '@crewlethq/ui';

const meta: Meta<typeof VersionTimeline> = {
  title: 'UI/VersionTimeline',
  component: VersionTimeline,
};

export default meta;
type Story = StoryObj<typeof VersionTimeline>;

const NOW = Date.parse('2026-10-17T12:00:00Z');
const PM = { id: 'pm', kind: 'agent' as const, name: 'Product Manager', character: 'gemlet' as const, hue: 'rose' as const };
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };

const VERSIONS: VersionItem[] = [
  { version: 12, summary: 'Added totals row', author: PM, at: NOW - 4 * 60_000, source: 'ENG-412, turn 3' },
  { version: 11, author: PM, at: NOW - 2 * 3_600_000 },
  { version: 10, label: 'Review draft', author: MAYA, at: NOW - 86_400_000 },
  { version: 9, kind: 'schema', summary: 'Added column "Owner"', author: MAYA, at: NOW - 2 * 86_400_000 },
  { version: 8, kind: 'capabilities', summary: 'Now reads the datastore', author: PM, at: NOW - 3 * 86_400_000 },
  { version: 7, kind: 'restore', restoredFrom: 5, author: MAYA, at: NOW - 4 * 86_400_000 },
  { version: 6, author: PM, at: NOW - 5 * 86_400_000 },
  { version: 5, author: PM, at: NOW - 6 * 86_400_000 },
];

/**
 * Choosing a row shows that version; Compare is a toggle on any other row;
 * Restore publishes an old version as a new one, so nothing here rewrites
 * history, and the newest version offers none.
 */
export const Interactive: Story = {
  render: function Render() {
    const [selected, setSelected] = useState(12);
    const [against, setAgainst] = useState<number | undefined>(undefined);
    return (
      <div style={{ maxWidth: 360 }}>
        <VersionTimeline
          versions={VERSIONS}
          selected={selected}
          against={against}
          onSelect={setSelected}
          onCompare={(version) => setAgainst(version ?? undefined)}
          onRestore={() => {}}
          onLabel={() => {}}
          oldestKept={5}
          now={NOW}
        />
      </div>
    );
  },
};

/** A reader without the manage role sees the list and the comparison, and no restore or name control. */
export const ReadOnly: Story = {
  render: function Render() {
    const [selected, setSelected] = useState(10);
    return (
      <div style={{ maxWidth: 360 }}>
        <VersionTimeline versions={VERSIONS} selected={selected} onSelect={setSelected} now={NOW} />
      </div>
    );
  },
};

/** Versions the engine no longer keeps are an absence that says so. */
export const RetentionGap: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <VersionTimeline versions={VERSIONS.slice(0, 3)} selected={12} onSelect={() => {}} oldestKept={10} now={NOW} />
    </div>
  ),
};
