import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { ChartEmpty } from './ChartEmpty.js';

export interface HistogramBar {
  /** The bucket's start, epoch milliseconds. It is also the bar's key. */
  t: number;
  /** How many things fell in the bucket. */
  v: number;
  /**
   * How many of `v` failed, where the caller has the split. Drawn as the
   * danger-toned foot of the same fill, so the column's height is still the
   * bucket's whole count. Absent draws the plain fill, because a split the
   * data did not carry is not a split of zero.
   */
  part?: number | undefined;
}

export interface HistogramProps {
  bars: HistogramBar[];
  /** What the chart is, as the name of its group: "Turns that ended over the window". */
  label: string;
  /**
   * The total and what it is a total of, read in place of the picture:
   * "212 turns in this window". Required, and never summed here: the caller
   * knows whether the bars cover the whole window or only the rows it holds,
   * and a number whose scope is guessed is wrong on the second caller.
   */
  summary: string;
  /** A bar's own sentence, for its tooltip and its accessible name. */
  formatTitle: (bar: HistogramBar, index: number) => string;
  /**
   * A tick's label, which turns the axis on. Left out, the chart draws no
   * dates, for a strip narrower than its own labels.
   */
  formatTick?: ((bar: HistogramBar, index: number) => string) | undefined;
  /**
   * Narrow the window to one bar. Given, every bar is a button; left out, the
   * bars are a picture and take no tab stop.
   */
  onSelect?: ((bar: HistogramBar, index: number) => void) | undefined;
  /** The plot's height in pixels. */
  height?: number | undefined;
  /** What the chart says in place of the bars when it has none. */
  emptyLabel?: ReactNode;
  className?: string | undefined;
}

/**
 * How many labels an axis carries at most: five, which is what a 320px chart
 * holds with a compact date (about 45px) every 80px.
 */
const MAX_TICKS = 5;

/**
 * Which bars get a label: the first, the last, and an even whole stride
 * between, so a seven-day window reads every other day rather than gaps of
 * two, one, two and one days (which reads as days missing from the data).
 * The stride is the smallest whole number of bars that keeps the labels at or
 * under five, preferring one that lands exactly on the last bar; where none
 * does, a label nearer the last one than half a stride gives way to it.
 */
export function histogramTicks(bars: number): number[] {
  if (bars <= 0) return [];
  if (bars <= MAX_TICKS) return Array.from({ length: bars }, (_, i) => i);
  const span = bars - 1;
  const least = Math.ceil(span / (MAX_TICKS - 1));
  // An exact stride where one is near: up to half again the least one, so a
  // prime span does not fall back to its two ends alone.
  let stride = least;
  for (let s = least; s <= Math.ceil(least * 1.5); s++) {
    if (span % s === 0) {
      stride = s;
      break;
    }
  }
  const out: number[] = [];
  for (let at = 0; at < span; at += stride) out.push(at);
  if (span - out[out.length - 1]! < stride / 2) out.pop();
  out.push(span);
  return out;
}

/**
 * Where one tick sits: on its bucket's centre, `(i + 0.5) / n` of the width,
 * with the two ends pinned to the edges, where a centred label would hang
 * half its width off the chart. Physical sides, because time runs left to
 * right on this axis in every writing direction, as it does on every chart.
 */
function tickPlace(index: number, bars: number): CSSProperties {
  if (index === 0) return { left: 0 };
  if (index === bars - 1) return { right: 0 };
  return { left: `${((index + 0.5) / bars) * 100}%`, transform: 'translateX(-50%)' };
}

/**
 * A log's own time axis: where in a window things happened, which a page of
 * rows cannot say.
 *
 * THE SLOT IS THE CONTROL AND THE FILL INSIDE IT IS THE BAR. The fill takes
 * the column proportion `StackedColumns` uses, so one bucket and ninety draw
 * with the same geometry, while the click target stays the whole slot.
 *
 * THE HEIGHT IS THE TRUE RATIO, with a floor in pixels rather than percent:
 * a percentage floor grows with the panel and draws a bucket of 4 and one of
 * 400 at the same height. An empty bucket stands one pixel under the smallest
 * real count, because a zero-height element is invisible and an empty stretch
 * would read as a gap in the chart rather than a quiet stretch in the data.
 *
 * A BUTTON WHEN IT DOES SOMETHING AND A DIV WHEN IT DOES NOT: a keyboard
 * reader tabbing through eighty inert controls is worse served than one told
 * there is nothing to operate.
 */
export function Histogram({
  bars,
  label,
  summary,
  formatTitle,
  formatTick,
  onSelect,
  height = 96,
  emptyLabel = 'Nothing recorded in this window',
  className,
}: HistogramProps) {
  if (bars.length === 0) {
    return (
      <ChartEmpty className={className} height={`${height}px`}>
        {emptyLabel}
      </ChartEmpty>
    );
  }
  const peak = Math.max(1, ...bars.map((bar) => bar.v));
  return (
    <div className={cx('crewlet-histogram', className)}>
      <div
        className="crewlet-histogram__plot"
        role="group"
        aria-label={label}
        style={{ '--crewlet-histogram-height': `${height}px` } as CSSProperties}
      >
        {bars.map((bar, index) => {
          const part = Math.min(bar.v, Math.max(0, bar.part ?? 0));
          const title = formatTitle(bar, index);
          const empty = bar.v === 0 ? '' : undefined;
          // The failed share is the foot of the same fill, not a second bar
          // beside it, so a reader compares totals as before and reads the
          // failures as a part of each.
          const fill = (
            <span
              className="crewlet-histogram__fill"
              style={{ '--crewlet-histogram-fill': `${(bar.v / peak) * 100}%` } as CSSProperties}
            >
              {part > 0 && (
                <span
                  className="crewlet-histogram__part"
                  style={{ '--crewlet-histogram-part': `${(part / bar.v) * 100}%` } as CSSProperties}
                />
              )}
            </span>
          );
          return onSelect ? (
            <button
              key={bar.t}
              type="button"
              className="crewlet-histogram__bar"
              title={title}
              aria-label={title}
              data-empty={empty}
              onClick={() => onSelect(bar, index)}
            >
              {fill}
            </button>
          ) : (
            <div key={bar.t} className="crewlet-histogram__bar" title={title} data-empty={empty}>
              {fill}
            </div>
          );
        })}
        <VisuallyHidden>{summary}</VisuallyHidden>
      </div>
      {formatTick && (
        // Hidden from assistive technology: every bar carries its own bucket
        // in its name, and five loose dates under a chart place nothing.
        <div className="crewlet-histogram__axis" aria-hidden="true">
          {histogramTicks(bars.length).map((index) => (
            <span key={bars[index]!.t} className="crewlet-histogram__tick" style={tickPlace(index, bars.length)}>
              {formatTick(bars[index]!, index)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
