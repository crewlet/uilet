import { useId } from 'react';
import type { PointerEvent } from 'react';
import { cx } from '../utils/cx.js';
import { ChartTooltip } from './ChartTooltip.js';
import { DATA_COLOR_OTHER, dataColor } from './dataColor.js';
import { useChartHover } from './useChartHover.js';

export interface SeriesPoint {
  /** The bucket's start, epoch milliseconds. */
  t: number;
  v: number;
}

export interface Series {
  /** Keyed by id, so a push that reorders the series moves no other one. */
  id: string;
  name: string;
  points: readonly SeriesPoint[];
  /** Defaults to the series' own place in the data ramp. */
  color?: string;
}

export interface TimeSeriesProps {
  series: readonly Series[];
  /** The window the chart draws, epoch milliseconds. */
  from: number;
  to: number;
  /**
   * What the chart is, read in place of the picture: "tokens spent per hour".
   * Required, because a picture with no name is announced as "image" and the
   * reader is left to guess.
   */
  label: string;
  /** How tall the plot is, as a CSS length. */
  height?: string;
  /** How a value reads out. Defaults to the reader's own locale. */
  format?: (value: number) => string;
  /** How an instant reads out under the plot. Defaults to the reader's locale. */
  formatTime?: (at: number) => string;
  /**
   * The chart's own sentence, where the name is not the whole story. The
   * default names the window and each series' peak, which is what the shape
   * shows.
   */
  summary?: (facts: { from: number; to: number; peak: number; series: { name: string; peak: number }[] }) => string;
  className?: string;
}

/**
 * A quantity over time, when TIME is the question.
 *
 * THE X DOMAIN IS THE WINDOW, NOT THE DATA. A series that covers only the last
 * ten minutes of a twenty-four hour window is drawn in the last twentieth of
 * the plot, never stretched across it. Stretching is how a quiet company came
 * to look busy.
 *
 * THE PICTURE IS NOT THE ONLY COPY. The window's ends and the peak are drawn
 * as text under the plot, and the summary sentence is the plot's own name, so
 * a reader who cannot see it has the same facts rather than an "image".
 *
 * ONCE, THOUGH. The sentence was the plot's `aria-label` AND a visually
 * hidden line beside it, so a screen reader read the whole of it, then the
 * scale, then the whole of it again. A name is how a graphic carries its
 * meaning; a second copy in the text is not a fallback, it is a repeat.
 *
 * A READING, BY POINTER OR BY KEY. Over the plot a crosshair stands on the
 * nearest instant any series has a point at, and a tooltip beside it reads
 * every series at that instant. The plot is one tab stop, and ←/→ walk the
 * same instants (see `useChartHover`), so what a mouse can read a keyboard
 * can too; the tooltip is the live region, so a screen reader hears each one.
 *
 * The plot is hand drawn rather than taken from a charting library for one
 * reason that decides it: every mark here reads tokens, in two themes, at the
 * contrast floors the palette suite measures, and a library's theming surface
 * is a second design system to keep in step with this one.
 */
export function TimeSeries({
  series,
  from,
  to,
  label,
  height = '7.5rem',
  format = (value) => value.toLocaleString(),
  formatTime = (at) => new Date(at).toLocaleString(),
  summary,
  className,
}: TimeSeriesProps) {
  const id = useId();
  /*
   * The plot is drawn in a viewBox of its own and stretched to the width it is
   * given, so the geometry never depends on a measured pixel: an element that
   * has not been laid out yet has no width, and a chart that waits for one
   * draws nothing on its first frame. The stroke is `non-scaling`, which is
   * what stops the stretch turning a one pixel line into a wedge.
   */
  const width = 1000;
  const plot = 120;
  const footer = 18;
  const head = 6;
  const span = Math.max(1, to - from);
  const peaks = series.map((one) => Math.max(0, ...one.points.map((point) => point.v)));
  const peak = Math.max(1, ...peaks);
  const x = (at: number) => ((at - from) / span) * width;
  const y = (value: number) => head + (1 - value / peak) * (plot - head - footer);

  /*
   * The instants a reading can stand on: every one any series has a point
   * at, once, in order. A reading between two of them snaps to the nearer,
   * because a crosshair between points reads a value nobody recorded.
   */
  const instants = [...new Set(series.flatMap((one) => one.points.map((point) => point.t)))].sort((a, b) => a - b);
  const hover = useChartHover(instants.length);
  const reading = hover.active == null ? null : instants[hover.active]!;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0 || instants.length === 0) return;
    const at = from + ((event.clientX - box.left) / box.width) * span;
    let nearest = 0;
    for (let index = 1; index < instants.length; index += 1) {
      if (Math.abs(instants[index]! - at) < Math.abs(instants[nearest]! - at)) nearest = index;
    }
    hover.point(nearest);
  };

  const sentence = summary
    ? summary({ from, to, peak, series: series.map((one, index) => ({ name: one.name, peak: peaks[index] ?? 0 })) })
    : `${label}. ${formatTime(from)} to ${formatTime(to)}, peak ${format(peak)}.`;

  return (
    <figure className={cx('crewlet-time-series', className)}>
      <div className="crewlet-chart-frame" role="group" aria-label={label} {...hover.plotProps}>
        <svg
          className="crewlet-chart"
          viewBox={`0 0 ${width} ${plot}`}
          preserveAspectRatio="none"
          style={{ height }}
          role="img"
          aria-label={sentence}
          onPointerMove={onPointerMove}
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              className="crewlet-chart__grid-line"
              x1={0}
              x2={width}
              y1={y(peak * fraction)}
              y2={y(peak * fraction)}
            />
          ))}
          <line className="crewlet-chart__axis-line" x1={0} x2={width} y1={plot - footer} y2={plot - footer} />
          {series.map((one, index) => {
            const color = one.color ?? dataColor(index);
            const points = [...one.points].sort((a, b) => a.t - b.t);
            if (points.length === 0) return null;
            const line = points.map((point) => `${x(point.t).toFixed(2)},${y(point.v).toFixed(2)}`).join(' ');
            const first = points[0]!;
            const last = points[points.length - 1]!;
            const area = `${x(first.t).toFixed(2)},${plot - footer} ${line} ${x(last.t).toFixed(2)},${plot - footer}`;
            return (
              <g key={one.id}>
                <defs>
                  <linearGradient id={`${id}-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={area} fill={`url(#${id}-${index})`} />
                <polyline
                  className="crewlet-chart__series"
                  points={line}
                  stroke={color}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
          {reading != null && (
            <line
              className="crewlet-chart__crosshair"
              x1={x(reading)}
              x2={x(reading)}
              y1={0}
              y2={plot - footer}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <ChartTooltip
          open={reading != null}
          anchor={reading == null ? undefined : { start: (reading - from) / span }}
          title={reading == null ? undefined : formatTime(reading)}
          rows={
            reading == null
              ? []
              : series.flatMap((one, index) => {
                  const point = one.points.find((candidate) => candidate.t === reading);
                  return point
                    ? [{ id: one.id, name: one.name, value: format(point.v), color: one.color ?? dataColor(index) }]
                    : [];
                })
          }
        />
      </div>
      <figcaption className="crewlet-time-series__scale">
        <span>{formatTime(from)}</span>
        <span>peak {format(peak)}</span>
        <span>{formatTime(to)}</span>
      </figcaption>
    </figure>
  );
}

export interface SparklineProps {
  values: readonly number[];
  /**
   * The line's colour. Defaults to the residual neutral, `DATA_COLOR_OTHER`:
   * a shape beside a number is named by that number rather than by a legend,
   * and a series hue is spent only inside a figure that names it.
   */
  color?: string;
  /**
   * Marks the LAST value as now, with a point in the accent at the line's
   * end: the approved design's "you are here" on a trend. The accent means
   * where the reader is, and on a trend that is the present.
   *
   * The point is cut out of the ground it stands on by a 2px ring of
   * `--crewlet-spark-ground`, the card by default, because a sparkline sits
   * beside a number on a card; one drawn on another rung sets the variable on
   * itself or an ancestor.
   */
  current?: boolean | undefined;
  /** How tall the shape is, as a CSS length. */
  height?: string;
  className?: string;
}

/**
 * A shape beside a number. NEVER ON ITS OWN.
 *
 * It has no scale, no axis and no labels, so it cannot be read without the
 * figure it is captioned by: it says which way a quantity has been going, and
 * the number beside it says what the quantity is. That is also why it is
 * hidden from assistive technology rather than given a name of its own. A
 * reader who is told "412k, sparkline" has learnt nothing the figure did not
 * already say; a shape that genuinely carries a fact on its own is a
 * TimeSeries, which has a window, a peak and a sentence.
 *
 * THE LINE IS THE NEUTRAL AND THE PRESENT IS THE ACCENT. With `current` the
 * last value is marked by one accent point, which is the only colour the
 * shape spends: the trend is a quiet mark and "now" is where the eye lands.
 *
 * THE POINT IS NOT PART OF THE PLOT. The plot is stretched to whatever box it
 * is given, so a circle drawn in its viewBox would come out as an ellipse as
 * wide as the box is long; the point is its own element over the plot,
 * placed by the last value's height as a fraction of the box, and stays
 * round at every width.
 *
 * Fewer than two values draw nothing, and the box keeps its height, so a row
 * of figures does not jump as one of them gains its second point.
 */
export function Sparkline({
  values,
  color = DATA_COLOR_OTHER,
  current = false,
  height = '1.75rem',
  className,
}: SparklineProps) {
  const width = 200;
  const box = 28;
  const classes = cx('crewlet-spark', current && 'crewlet-spark--current', className);
  if (values.length < 2) return <div className={classes} style={{ height }} aria-hidden />;
  const peak = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const y = (value: number) => box - (value / peak) * (box - 2) - 1;
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
  const last = values[values.length - 1]!;
  return (
    <div className={classes} style={{ height }} aria-hidden>
      <svg className="crewlet-spark__plot" viewBox={`0 0 ${width} ${box}`} preserveAspectRatio="none">
        <polyline className="crewlet-chart__series" points={points} stroke={color} vectorEffect="non-scaling-stroke" />
      </svg>
      {current ? <span className="crewlet-spark__current" style={{ top: `${((y(last) / box) * 100).toFixed(2)}%` }} /> : null}
    </div>
  );
}
