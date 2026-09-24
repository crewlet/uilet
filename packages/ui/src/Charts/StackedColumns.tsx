import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { ChartTooltip } from './ChartTooltip.js';
import { dataColor } from './dataColor.js';
import { Legend } from './Legend.js';
import { useChartHover } from './useChartHover.js';

export interface StackedColumnsSeries {
  /** What the series is, as a stable identity: its colour and its node follow it. */
  id: string;
  name: string;
  /** Defaults to the series' own place in `series`, in the data ramp. */
  color?: string;
}

export interface StackedColumnsBucket {
  /** The bucket's start, epoch milliseconds. It is the column's identity. */
  t: number;
  /** Each series' value in this bucket, by series id. A missing id is zero. */
  values: Readonly<Record<string, number>>;
}

/**
 * Where the chart draws its legend.
 *
 * `below`, the default, under the dates. `head` at the END of the chart's head
 * row, top right, where the design's Spend card draws it beside the card's
 * title: pass that title as `head` and the two share one line. `none` draws no
 * legend, for a screen that names the series somewhere the chart cannot reach;
 * the chart is then that screen's to caption, and a stacked figure without its
 * legend is a picture of some numbers.
 */
export type StackedColumnsLegend = 'below' | 'head' | 'none';

export interface StackedColumnsProps {
  /**
   * Every series the figure CAN draw, in stacking order: the first stands on
   * the baseline. Filter with `hidden`, never by leaving one out of this list,
   * because a series' colour is its place here.
   */
  series: readonly StackedColumnsSeries[];
  /** One column per bucket, oldest first. */
  buckets: readonly StackedColumnsBucket[];
  /**
   * The series not drawn, by id. They leave the columns, the scale, the
   * tooltip and its total, and every other series keeps its colour.
   */
  hidden?: readonly string[];
  /** What the chart is, read in place of the picture: "tokens per day by phase". */
  label: string;
  /** Where the legend goes: see the type. Defaults to `below`. */
  legend?: StackedColumnsLegend;
  /**
   * The chart's head: a title and what qualifies it, drawn at the START of a
   * row over the plot, with the legend at its end when `legend` is `head`.
   */
  head?: ReactNode;
  /** How tall the plot is, as a CSS length. */
  height?: string;
  /** How a value reads out, on the scale and in the tooltip. Defaults to a compact number. */
  format?: (value: number) => string;
  /** How a bucket reads out, under the plot and in the tooltip. Defaults to the reader's date. */
  formatTime?: (at: number) => string;
  /** The chart's own sentence. The default names the window, the tallest column and each series' total. */
  summary?: (facts: {
    from: number | null;
    to: number | null;
    peak: number;
    series: { name: string; total: number }[];
  }) => string;
  className?: string;
}

/**
 * The scale's top and its step: a round number at or above the tallest
 * column, in about four steps of 1, 2, 2.5 or 5 of a power of ten. A scale
 * that stops at the peak itself labels its lines 0, 0.33M and 0.66M, which
 * nobody reads at a glance.
 */
export function niceScale(peak: number, steps = 4): { top: number; step: number } {
  // Nothing recorded still draws a scale, in whole units, rather than a NaN.
  if (!(peak > 0)) return { top: steps, step: 1 };
  const raw = peak / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10) * magnitude;
  /*
   * The arithmetic is binary floating point, so 3 × 0.1 is 0.30000000000000004;
   * twelve significant digits is far past anything a scale label shows and
   * well short of where the error lives.
   */
  const top = Number((Math.max(1, Math.ceil(peak / step - 1e-9)) * step).toPrecision(12));
  return { top, step: Number(step.toPrecision(12)) };
}

const COMPACT = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/**
 * A quantity per bucket over time, split into its parts: the column chart.
 *
 * A COLUMN IS ITS BUCKET'S TOTAL, and its parts share that height in
 * proportion. The parts stand 2px apart, and the gap comes out of the parts
 * rather than being added on top, so the column's top is exactly where its
 * total reads on the scale. Only the VALUE END is rounded, the top of the
 * topmost part, because the baseline is where every column starts and a
 * rounded foot would lift it off the axis.
 *
 * COLOUR FOLLOWS THE SERIES ID. A series' hue is its place in `series`, and
 * filtering is `hidden` rather than a shorter list, so hiding one part never
 * repaints the survivors: the blue a reader learnt for "execute" is still
 * "execute" after they switched "review" off. A Legend beside the chart lists
 * the same series in the same order, or passes each `color`.
 *
 * A ZERO PART IS NOT DRAWN, and an empty bucket is a column of no height: the
 * bucket happened and nothing happened in it.
 *
 * THE READING IS PER COLUMN. Pointing at a column, or walking the columns with
 * ←/→ once the plot has focus, opens a tooltip beside it with every part and
 * the total (see `useChartHover`); the tooltip is the live region, so a screen
 * reader hears the same.
 *
 * IT DRAWS ITS OWN LEGEND, from the same list and in the same colours, with
 * the hidden series left out. A legend written beside the chart by its caller
 * was a second copy of `series` that had to be kept in step by hand, and the
 * figure is never meant to be drawn without one; `legend` says only WHERE,
 * under the dates or at the end of the chart's head, top right, as the
 * design's Spend card has it.
 *
 * All of it is HTML positioned by style properties, so it holds a crisp 2px
 * gap and a true 4px corner at any width, which a stretched SVG cannot, and no
 * style element is ever drawn.
 */
export function StackedColumns({
  series,
  buckets,
  hidden = [],
  label,
  legend = 'below',
  head,
  height = '11.5rem',
  format = (value) => COMPACT.format(value),
  formatTime = (at) => new Date(at).toLocaleDateString(),
  summary,
  className,
}: StackedColumnsProps) {
  // Every series keeps the colour of its place in the FULL list.
  const colored = series.map((one, index) => ({ ...one, color: one.color ?? dataColor(index) }));
  const shown = colored.filter((one) => !hidden.includes(one.id));
  const valueOf = (bucket: StackedColumnsBucket, id: string) => Math.max(0, bucket.values[id] ?? 0);
  const totals = buckets.map((bucket) => shown.reduce((sum, one) => sum + valueOf(bucket, one.id), 0));
  const peak = Math.max(0, ...totals);
  const { top, step } = niceScale(peak);
  const intervals = Math.round(top / step);
  const ticks = Array.from({ length: intervals + 1 }, (_, index) =>
    Number(((intervals - index) * step).toPrecision(12)),
  );

  const hover = useChartHover(buckets.length);
  const active = hover.active == null ? null : buckets[hover.active]!;

  const first = buckets[0]?.t ?? null;
  const last = buckets[buckets.length - 1]?.t ?? null;
  // The middle label names the column nearest the middle, and stands on it.
  const centre = Math.floor((buckets.length - 1) / 2);
  const middle = buckets.length > 2 ? buckets[centre]!.t : null;
  const facts = {
    from: first,
    to: last,
    peak,
    series: shown.map((one) => ({
      name: one.name,
      total: buckets.reduce((sum, bucket) => sum + valueOf(bucket, one.id), 0),
    })),
  };
  const sentence = summary
    ? summary(facts)
    : first == null || last == null
      ? `${label}. Nothing recorded.`
      : `${label}. ${formatTime(first)} to ${formatTime(last)}, tallest ${format(peak)}. ${facts.series
          .map((one) => `${one.name} ${format(one.total)}`)
          .join(', ')}.`;

  const key =
    legend === 'none' ? null : (
      <Legend
        className={cx('crewlet-stacked-columns__legend', `crewlet-stacked-columns__legend--${legend}`)}
        items={shown.map((one) => ({ id: one.id, label: one.name, color: one.color }))}
      />
    );
  const hasHead = head !== undefined && head !== null && head !== false;

  return (
    <figure className={cx('crewlet-stacked-columns', className)}>
      {hasHead || legend === 'head' ? (
        <div className="crewlet-stacked-columns__head">
          {hasHead ? <div className="crewlet-stacked-columns__heading">{head}</div> : null}
          {legend === 'head' ? key : null}
        </div>
      ) : null}
      <div className="crewlet-stacked-columns__axis" aria-hidden style={{ height }}>
        {ticks.map((tick) => (
          <span key={tick} className="crewlet-stacked-columns__tick">
            {format(tick)}
          </span>
        ))}
      </div>
      <div className="crewlet-chart-frame" role="group" aria-label={label} {...hover.plotProps}>
        <div
          className="crewlet-stacked-columns__plot"
          role="img"
          aria-label={sentence}
          style={{ height }}
        >
          <div className="crewlet-stacked-columns__grid" aria-hidden>
            {ticks.map((tick) => (
              <span key={tick} className="crewlet-stacked-columns__grid-line" />
            ))}
          </div>
          {buckets.map((bucket, index) => {
            const total = totals[index] ?? 0;
            const parts = shown.filter((one) => valueOf(bucket, one.id) > 0);
            return (
              <div
                key={bucket.t}
                className={cx('crewlet-stacked-columns__slot', hover.active === index && 'is-active')}
                onPointerEnter={() => hover.point(index)}
              >
                <div
                  className="crewlet-stacked-columns__column"
                  style={{ height: `${((total / top) * 100).toFixed(3)}%` }}
                >
                  {parts.map((one) => (
                    <span
                      key={one.id}
                      className="crewlet-stacked-columns__segment"
                      data-series={one.id}
                      style={
                        {
                          flexGrow: valueOf(bucket, one.id),
                          '--crewlet-stacked-columns-segment-color': one.color,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ChartTooltip
          open={active != null}
          anchor={
            hover.active == null
              ? undefined
              : { start: hover.active / buckets.length, end: (hover.active + 1) / buckets.length }
          }
          title={active == null ? undefined : formatTime(active.t)}
          rows={
            active == null
              ? []
              : shown.map((one) => ({ id: one.id, name: one.name, value: format(valueOf(active, one.id)), color: one.color }))
          }
          total={active == null || hover.active == null ? undefined : { value: format(totals[hover.active] ?? 0) }}
        />
      </div>
      <figcaption className="crewlet-stacked-columns__scale">
        <span>{first == null ? '' : formatTime(first)}</span>
        {middle != null && (
          <span
            className="crewlet-stacked-columns__middle"
            style={{ left: `${(((centre + 0.5) / buckets.length) * 100).toFixed(3)}%` }}
          >
            {formatTime(middle)}
          </span>
        )}
        <span>{last == null || last === first ? '' : formatTime(last)}</span>
      </figcaption>
      {legend === 'below' ? key : null}
    </figure>
  );
}
