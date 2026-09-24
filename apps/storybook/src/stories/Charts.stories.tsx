import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  ActivityStrip,
  BarList,
  Legend,
  SegmentedControl,
  Sparkline,
  StackedBar,
  StackedColumns,
  TimeSeries,
  dataColor,
} from '@crewlethq/ui';

/*
 * The chart kit, and the rules that travel with it:
 *
 *  - A data hue only ever appears inside a chart that carries a legend.
 *  - A stacked bar is never drawn without that legend.
 *  - A quantity of nothing is drawn as nothing.
 *  - The values are in the markup, not only in a tooltip a mouse can reach.
 *  - A tooltip a pointer can open, the keyboard can open too: focus a plot and
 *    walk it with ←/→, and Escape closes the reading.
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

/** A card on the design's grid, holding one figure under its head. */
const Panel = ({ title, sub, aside, children }: { title: string; sub: string; aside?: string; children: React.ReactNode }) => (
  <section
    style={{
      width: 360,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-3)',
      padding: 'var(--spacing-4) var(--spacing-5)',
      background: 'var(--color-surface-subtle)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--radius-lg)',
    }}
  >
    <header style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3 style={{ margin: 0, font: 'var(--font-weight-semibold) var(--font-size-sm)/1.3 var(--font-family-sans)' }}>{title}</h3>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{sub}</span>
      </span>
      {aside ? <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{aside}</span> : null}
    </header>
    {children}
  </section>
);

/**
 * THE DESIGN'S RANKED FIGURE: `layout="beside"`. The name and what it is in a
 * column of their own, a bar up to 12px thick, and the value at the bar's end,
 * as the Home screen's "Tokens by team" and Spend's "By model" draw it. One
 * quantity across categories, so one hue: the label names it.
 */
export const RankedBeside: Story = {
  name: 'BarList / Beside the label',
  render: () => {
    const one = dataColor(0);
    return (
      <div style={{ padding: 20, display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Panel title="Tokens by team" sub="Last 7 days · 12.6M total">
          <BarList
            layout="beside"
            data={[
              { id: 'eng', label: 'Engineering', sub: '3 agents', value: 7.9, display: '7.9M', color: one },
              { id: 'lead', label: 'Leadership', sub: '2 agents', value: 2.4, display: '2.4M', color: one },
              { id: 'product', label: 'Product', sub: 'PM', value: 1.8, display: '1.8M', color: one },
              { id: 'devrel', label: 'Developer Relations', sub: 'DevRel', value: 0.5, display: '0.5M', color: one },
            ]}
          />
        </Panel>
        <Panel title="By model" sub="Tokens per model entry" aside="30 days">
          <BarList
            layout="beside"
            data={[
              { id: 'main', label: 'anthropic-main', sub: 'engineers, PM', value: 31.2, display: '31.2M', color: one },
              { id: 'exec', label: 'anthropic-exec', sub: 'CEO, CTO', value: 12.7, display: '12.7M', color: one },
              { id: 'aux', label: 'openai-aux', sub: 'judges, summaries', value: 4.7, display: '4.7M', color: one },
            ]}
          />
        </Panel>
      </div>
    );
  },
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
          hint="Never drawn without the legend beside it: a proportional bar with no legend is a picture of some numbers. Point at a part, or tab to the bar and press ←/→, to read it with its share and the whole."
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
        title="Four series, and the rest"
        hint="Four hues a reader can tell apart from their neighbours, from the danger red and from the accent, under every vision. Everything past the fourth takes the residual."
      >
        <Legend
          items={['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'].map((label, index) => ({
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
        hint="The x domain is the WINDOW, not the data: these six and a half hours are drawn in the first quarter of a day, never stretched across it. The peak and both ends of the window are text under the plot, so the figures are there for a reader who cannot see the shape. Point at the plot, or focus it and use ←/→, to read both series at one instant on a crosshair."
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
        hint="A sparkline has no scale, no axis and no labels, so it cannot be read without the figure it is captioned by. It is hidden from assistive technology for the same reason: the number beside it already says everything the shape could. The line is the residual neutral, because nothing names it as a series, and the first one here marks its last value as now with one accent point."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--spacing-3)', alignItems: 'center' }}>
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>412k</strong>
          <Sparkline values={turns.map((point) => point.v)} current />
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>96.4k</strong>
          <Sparkline values={reviews.map((point) => point.v)} />
          <strong style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--font-size-xl)' }}>0</strong>
          <Sparkline values={[]} />
        </div>
      </Frame>
    </div>
  ),
};

const phases = [
  { id: 'execute', name: 'Execute' },
  { id: 'review', name: 'Review' },
  { id: 'workers', name: 'Workers' },
  { id: 'auxiliary', name: 'Auxiliary' },
];

/* Thirty days of tokens, execute doing the work and the rest the overhead. */
const daily = Array.from({ length: 30 }, (_, index) => {
  const weekend = index % 7 === 5 || index % 7 === 6;
  const load = weekend ? 0.25 : 0.7 + ((index * 37) % 11) / 20;
  return {
    t: Date.UTC(2026, 7, 24) + index * day,
    values: {
      execute: Math.round(load * 620_000),
      review: Math.round(load * 190_000),
      workers: Math.round(load * (index % 3 === 0 ? 40_000 : 170_000)),
      auxiliary: Math.round(load * 60_000),
    },
  };
});

const shortDate = (at: number) =>
  new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function DailyByPhase() {
  const [only, setOnly] = useState('all');
  const hidden = only === 'all' ? [] : phases.filter((phase) => phase.id !== only).map((phase) => phase.id);
  return (
    <Frame
      title="Daily tokens by phase"
      hint="A column is its day's total, and its parts stand 2px apart with only the value end rounded. Point at a column, or focus the plot and walk it with ←/→, for every part and the total. Filtering hides series rather than removing them, so the ones left keep their colour."
    >
      <SegmentedControl
        semantics="radio"
        label="Phases shown"
        value={only}
        onValueChange={setOnly}
        options={[{ value: 'all', label: 'All' }, ...phases.map((phase) => ({ value: phase.id, label: phase.name }))]}
      />
      {/* The chart draws its own legend, under the dates by default, from the
          same series in the same colours, and leaves out what is hidden. */}
      <StackedColumns label="Daily tokens by phase" series={phases} buckets={daily} hidden={hidden} formatTime={shortDate} />
    </Frame>
  );
}

export const Columns: Story = {
  name: 'StackedColumns / Parts of a total, per day',
  render: () => (
    <div style={{ padding: 20 }}>
      <DailyByPhase />
    </div>
  ),
};

/**
 * THE LEGEND IN THE CARD'S HEAD, as the design's Spend screen draws this
 * chart: `legend="head"` puts it at the end of the chart's head row, top
 * right, and `head` is the title and the sentence at that row's start.
 */
export const ColumnsLegendInHead: Story = {
  name: 'StackedColumns / Legend in the head',
  render: () => (
    <div style={{ padding: 20 }}>
      <section
        style={{
          maxWidth: 780,
          padding: 'var(--spacing-4) var(--spacing-5)',
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <StackedColumns
          label="Daily tokens by phase"
          legend="head"
          head={
            <>
              <h3 style={{ margin: 0, font: 'var(--font-weight-semibold) var(--font-size-sm)/1.3 var(--font-family-sans)' }}>
                Daily tokens by phase
              </h3>
              <p style={{ margin: 'var(--spacing-1) 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Execute does the work; review, workers and auxiliary calls are the overhead
              </p>
            </>
          }
          series={phases}
          buckets={daily}
          formatTime={shortDate}
        />
      </section>
    </div>
  ),
};
