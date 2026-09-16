import type { CSSProperties } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { dataColor } from './dataColor.js';

export interface StackedSegment {
  /** Keyed by id, so a push that re-ranks the parts moves no other part. */
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface StackedBarProps {
  segments: StackedSegment[];
  /**
   * How the parts are read out, for anybody who cannot see the bar. The
   * default names each part and its share; a caller with a better sentence
   * (units, an total worth saying) passes its own.
   */
  summary?: (parts: { label: string; value: number; percent: number }[]) => string;
  className?: string;
}

/**
 * One whole, split into its parts.
 *
 * ALWAYS BESIDE ITS LEGEND. The bar carries no labels of its own, so without
 * a Legend the parts are anonymous colours; pair the two, always, and key
 * both from the same list.
 *
 * A ZERO PART IS NOT DRAWN. Every segment used to get at least two pixels so
 * that it existed, which drew a phase that never ran as a thin slice of one
 * that did, and made the eleven-part bar of a quiet company look busy.
 *
 * THE VALUES ARE IN THE MARKUP, not only in a `title`. A tooltip on a
 * fragment of a bar is reachable by a mouse and by nothing else: no keyboard,
 * no screen reader, no touch. The summary sentence is what a reader who
 * cannot hover is left with, so it says everything the picture does.
 */
export function StackedBar({ segments, summary, className }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const drawn = segments.filter((segment) => segment.value > 0);
  const parts = drawn.map((segment) => ({
    label: segment.label,
    value: segment.value,
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }));
  const sentence = summary
    ? summary(parts)
    : parts.map((part) => `${part.label}: ${part.value.toLocaleString()} (${part.percent}%)`).join(', ');

  return (
    <div className={cx('crewlet-stacked-bar', className)}>
      <div className="crewlet-stacked-bar__track" aria-hidden>
        {drawn.map((segment) => {
          const index = segments.indexOf(segment);
          return (
            <span
              key={segment.id}
              className="crewlet-stacked-bar__segment"
              style={{
                width: `${(segment.value / total) * 100}%`,
                '--crewlet-stacked-bar-segment-color': segment.color ?? dataColor(index),
              } as CSSProperties}
            />
          );
        })}
      </div>
      <VisuallyHidden>{sentence}</VisuallyHidden>
    </div>
  );
}
