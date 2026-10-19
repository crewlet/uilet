import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { ChartEmpty } from './ChartEmpty.js';
import { ChartTooltip } from './ChartTooltip.js';
import { useChartHover } from './useChartHover.js';

export interface ActivityBucket {
  /** The bucket's start, epoch milliseconds. It is also the cell's key. */
  t: number;
  /** How much happened in it. */
  v: number;
}

export interface ActivityStripProps {
  buckets: ActivityBucket[];
  /**
   * What the strip is, read in place of the picture: "activity over the last
   * hour". Required, because a picture with no name is announced as "image"
   * and the reader is left to guess.
   */
  label: string;
  /**
   * The strip's own sentence, where the label is not the whole story. The
   * default adds the peak and the total, which is what the shape shows.
   */
  summary?: (facts: { peak: number; total: number; buckets: number }) => string;
  /**
   * Makes every cell READABLE, as every other chart's marks are: pointing at a
   * cell, or walking the cells with ←/→ once the strip has focus, opens a
   * tooltip with the bucket's time and value. Opt-in, because a strip is also
   * a glance beside a row (a seat's last hour on Live), where a tab stop and a
   * tooltip on every row of a list would be noise; a strip that is a figure of
   * its own, on a dashboard, passes it.
   */
  reading?: { formatTime: (at: number) => string; format?: (value: number) => string } | undefined;
  /** What the strip says in place of the cells when it has no bucket. */
  emptyLabel?: ReactNode;
  className?: string;
}

/**
 * One cell per bucket, oldest to newest: the shape of a window's activity.
 *
 * KEYED BY BUCKET, NEVER BY INDEX. The board this replaces keyed 60 cells
 * `p0..p59` over a window recomputed from the clock on every render, so at
 * each minute roll every cell's content shifted one position left and the
 * whole strip was rewritten. A time-anchored key moves exactly one node.
 *
 * HEIGHT IS THE WHOLE ENCODING. The strip used to scale opacity with the
 * value as well, which said the same thing twice and put the quietest
 * buckets under 3:1 against the surface, so the marks that meant "something
 * happened here, but not much" were the ones nobody could see. Every drawn
 * cell is now the same solid colour and only its height varies; an empty
 * bucket is a neutral hairline at the baseline, which is a different mark
 * rather than a fainter one.
 *
 * ONE IMAGE, not sixty. The cells are marks in a single picture, so the
 * strip is the `img` and its label is the sentence.
 */
export function ActivityStrip({
  buckets,
  label,
  summary,
  reading,
  emptyLabel = 'Nothing recorded in this window',
  className,
}: ActivityStripProps) {
  const hover = useChartHover(buckets.length);
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.v));
  const total = buckets.reduce((sum, bucket) => sum + bucket.v, 0);
  const format = reading?.format ?? ((value: number) => value.toLocaleString());
  const sentence = summary
    ? summary({ peak, total, buckets: buckets.length })
    : `${label}. ${format(total)} in ${buckets.length} buckets, peak ${format(peak)}.`;

  // A strip of no buckets is a sentence, as every chart's empty state is.
  if (buckets.length === 0) return <ChartEmpty className={className}>{emptyLabel}</ChartEmpty>;

  const active = reading && hover.active != null ? buckets[hover.active]! : null;
  const strip = (
    <div className={cx('crewlet-activity-strip', className)} role="img" aria-label={sentence}>
      {buckets.map((bucket, index) => (
        <span
          key={bucket.t}
          className={cx(
            'crewlet-activity-strip__cell',
            bucket.v > 0 && 'is-active',
            reading && hover.active === index && 'is-read',
          )}
          onPointerEnter={reading ? () => hover.point(index) : undefined}
          style={{
            /*
             * A floor of a fifth, so a bucket with one event in it reads as a
             * mark rather than as a line nobody can resolve, and an empty one
             * keeps the baseline hairline that says the bucket existed.
             */
            '--crewlet-activity-strip-fill': bucket.v > 0 ? `${Math.max(20, (bucket.v / peak) * 100)}%` : '10%',
          } as CSSProperties}
        />
      ))}
    </div>
  );
  if (!reading) return strip;
  return (
    <div className="crewlet-chart-frame" role="group" aria-label={label} {...hover.plotProps}>
      {strip}
      <ChartTooltip
        open={active != null}
        anchor={
          hover.active == null
            ? undefined
            : { start: hover.active / buckets.length, end: (hover.active + 1) / buckets.length }
        }
        title={active == null ? undefined : reading.formatTime(active.t)}
        rows={active == null ? [] : [{ id: 'value', name: label, value: format(active.v) }]}
      />
    </div>
  );
}
