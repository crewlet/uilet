import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarList, DataTable, IconButton, StatCard, WidgetFrame } from '@crewlethq/ui';
import { EllipsisGlyph } from '@crewlethq/icons/glyphs';

/*
 * One figure on a dashboard. Every figure cites its dataset and when it was
 * true; a figure whose reader may not read the data draws a calm sentence in
 * its place and nothing of the figure.
 */
const NOW = Date.parse('2026-10-18T12:00:00Z');

const meta: Meta<typeof WidgetFrame> = {
  title: 'UI/WidgetFrame',
  component: WidgetFrame,
  args: {
    title: 'Open tasks',
    source: { label: 'My open work', status: 'ready', asOf: NOW - 2 * 60_000 },
    now: NOW,
    children: <StatCard label="Open" value="12" flush />,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, height: 220, padding: 16, background: 'var(--color-surface-background)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WidgetFrame>;

/** The citation is the dataset's title and "as of" a relative time, the exact instant on hover. */
export const Ready: Story = {};

/** A datastore collection on the socket is kept current, so it says "live" and no time. */
export const Live: Story = {
  args: { source: { label: 'Release checklist', status: 'live' } },
};

/** With `onCite`, the citation is a button that opens the host's Sources rail at this dataset; `actions` holds the host's menu. */
export const CitedWithActions: Story = {
  args: {
    title: 'Tokens by model',
    source: { label: 'Spend by model', status: 'ready', asOf: NOW - 60_000 },
    onCite: () => undefined,
    actions: <IconButton label="Figure options" icon={<EllipsisGlyph size="sm" />} variant="ghost" size="sm" />,
    children: (
      <BarList
        data={[
          { id: 'sonnet', label: 'claude-sonnet', value: 412_000, display: '412k' },
          { id: 'opus', label: 'claude-opus', value: 96_400, display: '96.4k' },
        ]}
      />
    ),
  },
};

/** Older than its source promises: still drawn, and the citation is marked. */
export const Stale: Story = {
  args: { source: { label: 'Spend by seat', status: 'stale', asOf: NOW - 3 * 3_600_000 } },
};

/** The reader may not read the data: a calm sentence in place of the figure, never an alarm. */
export const Refused: Story = {
  args: {
    source: { label: 'My open work', status: 'refused', detail: 'Reading the tracker needs the tracker permission.' },
  },
};

/** The read did not complete. */
export const Failed: Story = {
  args: { source: { label: 'Agent status', status: 'failed' } },
};

/** Not read yet: busy, with a placeholder. */
export const Loading: Story = {
  args: { source: { label: 'My open work', status: 'loading' } },
};

/**
 * A table is `flush`: its row rules meet the frame's border and its first
 * column starts under the title. The short columns are held at what they hold
 * (`width`); the title column alone is fitted (`defaultWidth`), no narrower
 * than its `minWidth`.
 */
export const FlushTable: Story = {
  args: {
    title: 'Open work',
    flush: true,
    source: { label: 'Open work', status: 'ready', asOf: NOW - 60_000 },
    children: (
      <DataTable
        variant="compact"
        paginated={false}
        showSettings={false}
        defaultWrapLines={false}
        columns={{
          key: { label: 'Key', width: 88, sortable: false },
          title: { label: 'Title', defaultWidth: 300, minWidth: 180, sortable: false },
          status: { label: 'Status', width: 112, sortable: false },
        }}
        data={[
          { id: 1, key: 'FAIR-2', title: 'README and MVP acceptance run-through', status: 'In review' },
          { id: 2, key: 'FAIR-1', title: 'Write the FairSplit product brief', status: 'In progress' },
        ]}
        getRowKey={(row) => Number(row.id)}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 520, height: 220, padding: 16, background: 'var(--color-surface-background)' }}>
        <Story />
      </div>
    ),
  ],
};

/** In a frame narrower than 18rem the citation stacks: the dataset's title, then when it was true. */
export const Narrow: Story = {
  args: {
    title: 'Tokens, last 14 days',
    source: { label: 'Token spend per seat, 14 days', status: 'ready', asOf: NOW - 60_000 },
    children: <StatCard label="Tokens" value="0" flush />,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 200, height: 220, padding: 16, background: 'var(--color-surface-background)' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * In a row of stats read across, `holdTitle` keeps the title's two lines so
 * every number starts on one line, and a narrow frame's citation takes a
 * second line before it ends (the whole source is its tooltip).
 */
export const ARowOfNumbers: Story = {
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: 'var(--color-surface-background)' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 190px)', gap: 16, height: 220 }}>
      <WidgetFrame holdTitle title="Open work items" now={NOW} source={{ label: 'Open work', status: 'live' }}>
        <StatCard flush hideLabel label="Open work" value="12" />
      </WidgetFrame>
      <WidgetFrame holdTitle title="Tokens, last 14 days" now={NOW} source={{ label: 'Token spend per seat, 14 days', status: 'live' }}>
        <StatCard flush hideLabel label="Tokens" value="831.3k" />
      </WidgetFrame>
      <WidgetFrame holdTitle title="Deploys this month" now={NOW} source={{ label: 'Deploys for the chosen service', status: 'live' }}>
        <StatCard flush hideLabel label="Deploys" value="0" />
      </WidgetFrame>
    </div>
  ),
};
