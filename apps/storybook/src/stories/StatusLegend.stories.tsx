import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StatusLegend, type StatusLegendItem } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * UI / StatusLegend.
 *
 * Each status with its dot, its word and a quiet count, on one line that
 * wraps: the key to a chart's status colours, in the tones `StatusDot` and
 * `StatusLine` draw. With `onValueChange` each item is a toggle that filters
 * (`aria-pressed`): pressed is the selected surface with a light accent line,
 * and pressing it again clears the filter. A status nothing holds stays drawn,
 * in the quieter ink. Each item is named in full: "Working, 4 agents".
 */
const meta: Meta<typeof StatusLegend> = {
  title: 'UI/StatusLegend',
  component: StatusLegend,
};

export default meta;
type Story = StoryObj<typeof StatusLegend>;

const ITEMS: StatusLegendItem[] = [
  { key: 'working', label: 'Working', tone: 'info', count: 4 },
  { key: 'needs', label: 'Needs you', tone: 'warning', count: 1 },
  { key: 'stopped', label: 'Paused or stopped', tone: 'danger', count: 1 },
  { key: 'idle', label: 'Idle', tone: 'neutral', count: 0 },
];
const agents = (count: number) => (count === 1 ? '1 agent' : `${count} agents`);

/** A canvas bar's surface, as the chart's end slot draws it. */
const bar = {
  display: 'inline-flex',
  maxWidth: '100%',
  padding: 'var(--spacing-1)',
  background: 'var(--color-surface-glass)',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-xs)',
} as const;

function Filter({ start = null, width }: { start?: string | null; width?: number }) {
  const [value, setValue] = useState<string | null>(start);
  return (
    <div style={{ ...bar, ...(width ? { width } : {}) }}>
      <StatusLegend label="Filter by status" items={ITEMS} value={value} onValueChange={setValue} countLabel={agents} />
    </div>
  );
}

/** The legend as a filter, nothing pressed. */
export const Filter_: Story = {
  name: 'Filter',
  render: () => (
    <BothThemes>
      <Filter />
    </BothThemes>
  ),
};

/** One status pressed: the selected surface, never a filled chip. Press it again to clear. */
export const OnePressed: Story = {
  render: () => (
    <BothThemes>
      <Filter start="needs" />
    </BothThemes>
  ),
};

/** A phone's width: the items wrap onto a second line inside the bar, never past it. */
export const Narrow: Story = {
  render: () => (
    <BothThemes>
      <Filter width={240} />
    </BothThemes>
  ),
};

/** Without `onValueChange` it is a key: a list, each status read in full. */
export const AKey: Story = {
  render: () => (
    <BothThemes>
      <div style={bar}>
        <StatusLegend label="Statuses" items={ITEMS} countLabel={agents} />
      </div>
    </BothThemes>
  ),
};
