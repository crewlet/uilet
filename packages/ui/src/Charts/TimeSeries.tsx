import { useId } from 'react';
import { cx } from '../utils/cx.js';
import { dataColor } from './dataColor.js';

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

  const sentence = summary
    ? summary({ from, to, peak, series: series.map((one, index) => ({ name: one.name, peak: peaks[index] ?? 0 })) })
    : `${label}. ${formatTime(from)} to ${formatTime(to)}, peak ${format(peak)}.`;

  return (
    <figure className={cx('crewlet-time-series', className)}>
      <svg
        className="crewlet-chart"
        viewBox={`0 0 ${width} ${plot}`}
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label={sentence}
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
      </svg>
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
  /** The line's colour. Defaults to the accent, which is what a trend takes. */
  color?: string;
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
 * Fewer than two values draw nothing, and the box keeps its height, so a row
 * of figures does not jump as one of them gains its second point.
 */
export function Sparkline({ values, color = 'var(--color-brand-accent)', height = '1.75rem', className }: SparklineProps) {
  const width = 200;
  const box = 28;
  if (values.length < 2) return <div className={cx('crewlet-spark', className)} style={{ height }} aria-hidden />;
  const peak = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(2)},${(box - (value / peak) * (box - 2) - 1).toFixed(2)}`)
    .join(' ');
  return (
    <svg
      className={cx('crewlet-spark', className)}
      viewBox={`0 0 ${width} ${box}`}
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden
    >
      <polyline className="crewlet-chart__series" points={points} stroke={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
