import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActivityStrip, BarList, Legend, Sparkline, StackedBar, TimeSeries, dataColor } from '@crewlethq/ui';

/*
 * The chart kit, and the rules that travel with it:
 *
 *  - A data hue only ever appears inside a chart that carries a legend.
 *  - A stacked bar is never drawn without that legend.
 *  - A quantity of nothing is drawn as nothing.
 *  - The values are in the markup, not only in a tooltip a mouse can reach.
 */
const meta: Meta = {
  title: 'UI/Charts',
};

export default meta;
type Story = StoryObj;

const Frame = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <section style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
    <h3 style={{ margin: 0, font: 'var(--font-weight-semibold) var(--font-size-md)/1.3 var(--font-family-sans)' }}>
      {title}
    </h3>
    <p style={{ margin: 0, fontSize: 'var(--font-size-compact)', color: 'var(--color-text-secondary)' }}>{hint}</p>
    {children}
  </section>
);

const spend = [
  { id: 'sonnet', label: 'claude-sonnet', value: 412_000, display: '412k' },
  { id: 'opus', label: 'claude-opus', value: 96_400, display: '96.4k' },
  { id: 'haiku', label: 'claude-haiku', value: 21_050, display: '21k' },
  { id: 'embed', label: 'text-embedding', value: 0, display: '0' },
];

export const Ranked: Story = {
  name: 'BarList / Ranked comparison',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Tokens by model"
        hint="Bars are a fraction of the largest value, because the question is how this compares with the biggest one. The model that never ran draws no bar."
      >
        <BarList data={spend} />
      </Frame>
    </div>
  ),
};

/**
 * NOTHING TO DRAW IS STILL A BOX. The sentence stands where the bars would
 * have, at the inset the panel holding them carries, so it reads as this chart
 * saying it has no data rather than as a caption belonging to the title above
 * it. Drawn here inside a card with no padding of its own, which is how every
 * panel on a dashboard holds one.
 */
export const RankedWithNothing: Story = {
  name: 'BarList / Nothing in the window',
  render: () => (
    <div style={{ padding: 20 }}>
      <div
        style={{
          maxWidth: 520,
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <BarList data={[]} emptyLabel="No model calls in this window." />
      </div>
    </div>
  ),
};

export const RankedWithRows: Story = {
  name: 'BarList / Rows that lead somewhere',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Tokens by seat"
        hint="A row with a destination is a link; a row with an action is a button. Both keep their identity when the ranking changes."
      >
        <BarList
          limit={3}
          moreLabel={(remaining) => `and ${remaining} more, ranked`}
          data={[
            { id: 'planner', label: 'planner', value: 180, display: '180', href: '#/seats/planner' },
            { id: 'builder', label: 'builder', value: 96, display: '96', sub: 'last run 4 minutes ago', href: '#/seats/builder' },
            { id: 'reviewer', label: 'reviewer', value: 41, display: '41', href: '#/seats/reviewer' },
            { id: 'greeter', label: 'greeter', value: 12, display: '12', href: '#/seats/greeter' },
            { id: 'scribe', label: 'scribe', value: 3, display: '3', href: '#/seats/scribe' },
          ]}
        />
      </Frame>
    </div>
  ),
};

export const Split: Story = {
  name: 'StackedBar / One whole, with its legend',
  render: () => {
    const segments = [
      { id: 'execute', label: 'Execute', value: 640 },
      { id: 'review', label: 'Review', value: 210 },
      { id: 'onboarding', label: 'Onboarding', value: 0 },
    ];
    return (
      <div style={{ padding: 20 }}>
        <Frame
          title="Turns by phase"
          hint="Never drawn without the legend beside it: a proportional bar with no legend is a picture of some numbers."
        >
          <StackedBar segments={segments} />
          <Legend
            items={segments.map((segment) => ({
              id: segment.id,
              label: segment.label,
              value: segment.value.toLocaleString(),
            }))}
          />
        </Frame>
      </div>
    );
  },
};

export const Ramp: Story = {
  name: 'Legend / The data ramp',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Five series, and the rest"
        hint="Five hues a reader can tell apart from each other and from the accent. Everything past the fifth takes the residual."
      >
        <Legend
          items={['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'].map((label, index) => ({
            id: label,
            label,
            color: dataColor(index),
          }))}
        />
      </Frame>
    </div>
  ),
};

const hour = Array.from({ length: 36 }, (_, index) => ({
  t: 1_760_000_000_000 + index * 60_000,
  v: [0, 0, 1, 4, 9, 6, 2, 0, 0, 3, 12, 18, 7, 1, 0, 0, 0, 2][index % 18]!,
}));

export const Strip: Story = {
  name: 'ActivityStrip / A window at a glance',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Events in the last 36 minutes"
        hint="Height is the whole encoding, and a cell is keyed by its bucket in time, so a rolling window moves one node rather than rewriting the strip."
      >
        <ActivityStrip label="Events in the last 36 minutes" buckets={hour} />
      </Frame>
    </div>
  ),
};

const day = 24 * 3_600_000;
const start = 1_760_000_000_000;

/* A busy morning and a quiet afternoon, inside a window that runs a full day. */
const turns = Array.from({ length: 13 }, (_, index) => ({
  t: start + index * 1_800_000,
  v: [2, 9, 14, 22, 31, 28, 19, 11, 6, 4, 7, 3, 1][index]!,
}));
const reviews = turns.map((point) => ({ t: point.t, v: Math.round(point.v * 0.4) }));

export const OverTime: Story = {
  name: 'TimeSeries / A quantity over time',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Turns per half hour"
        hint="The x domain is the WINDOW, not the data: these six and a half hours are drawn in the first quarter of a day, never stretched across it. The peak and both ends of the window are text under the plot, so the figures are there for a reader who cannot see the shape."
      >
        <TimeSeries
          label="Turns per half hour"
          from={start}
          to={start + day}
          series={[
            { id: 'turns', name: 'turns', points: turns },
            { id: 'reviews', name: 'reviews', points: reviews },
          ]}
          formatTime={(at) => new Date(at).toUTCString().slice(17, 22)}
        />
        <Legend
          items={[
            { id: 'turns', label: 'turns' },
            { id: 'reviews', label: 'reviews' },
          ]}
        />
      </Frame>
    </div>
  ),
};

export const BesideANumber: Story = {
  name: 'Sparkline / A shape beside a number',
  render: () => (
    <div style={{ padding: 20 }}>
      <Frame
        title="Never on its own"
        hint="A sparkline has no scale, no axis and no labels, so it cannot be read without the figure it is captioned by. It is hidden from assistive technology for the same reason: the number beside it already says everything the shape could."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--spacing-3)', alignItems: 'center' }}>
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>412k</strong>
          <Sparkline values={turns.map((point) => point.v)} />
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>96.4k</strong>
          <Sparkline values={reviews.map((point) => point.v)} color="var(--color-data-2)" />
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>0</strong>
          <Sparkline values={[]} />
        </div>
      </Frame>
    </div>
  ),
};
