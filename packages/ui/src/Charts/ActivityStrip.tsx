import type { CSSProperties } from 'react';
import { cx } from '../utils/cx.js';

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
export function ActivityStrip({ buckets, label, summary, className }: ActivityStripProps) {
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.v));
  const total = buckets.reduce((sum, bucket) => sum + bucket.v, 0);
  const sentence = summary
    ? summary({ peak, total, buckets: buckets.length })
    : `${label}. ${total.toLocaleString()} in ${buckets.length} buckets, peak ${peak.toLocaleString()}.`;

  return (
    <div className={cx('crewlet-activity-strip', className)} role="img" aria-label={sentence}>
      {buckets.map((bucket) => (
        <span
          key={bucket.t}
          className={cx('crewlet-activity-strip__cell', bucket.v > 0 && 'is-active')}
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
}
