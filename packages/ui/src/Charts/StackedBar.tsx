import { useId } from 'react';
import type { CSSProperties } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { ChartTooltip } from './ChartTooltip.js';
import { dataColor } from './dataColor.js';
import { useChartHover } from './useChartHover.js';

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
  /**
   * How a value reads out, in the default sentence and in a part's reading.
   * Defaults to the reader's own number format.
   */
  format?: (value: number) => string;
  className?: string;
}

/**
 * One whole, split into its parts.
 *
 * ALWAYS BESIDE ITS LEGEND. The bar carries no labels of its own, so without
 * a Legend the parts are anonymous colours at a glance, and only a reader who
 * stops on each one learns what it is; pair the two, always, and key both from
 * the same list.
 *
 * THE PARTS STAND 2PX APART, and the gap comes out of the parts: each part
 * GROWS by its value into the track's width less the gaps, rather than taking
 * a percentage of the whole, which with a gap between them would add up to
 * more than the track and push the last part out of it.
 *
 * A ZERO PART IS NOT DRAWN. Every segment used to get at least two pixels so
 * that it existed, which drew a phase that never ran as a thin slice of one
 * that did, and made the eleven-part bar of a quiet company look busy.
 *
 * THE VALUES ARE IN THE MARKUP, not only in a tooltip. The summary sentence
 * is what a reader who cannot see the bar is left with, so it says everything
 * the picture does, and it is the NAME of the plot, so a keyboard reader who
 * tabs onto the bar hears it before reading a single part.
 *
 * AND EACH PART CAN BE READ ON ITS OWN, by the reading layer every chart here
 * shares (see `useChartHover`): pointing at a part, or walking the parts with
 * ←/→ once the bar has focus, opens a tooltip beside it with the part's name,
 * its value and share, and the whole. A part's colour is its place in
 * `segments`, zero parts included, so the swatch in its reading is the hue the
 * Legend keyed from the same list shows.
 */
export function StackedBar({ segments, summary, format = (value) => value.toLocaleString(), className }: StackedBarProps) {
  const named = useId();
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const drawn = segments
    .map((segment, index) => ({ ...segment, color: segment.color ?? dataColor(index) }))
    .filter((segment) => segment.value > 0);
  const parts = drawn.map((segment) => ({
    label: segment.label,
    value: segment.value,
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }));
  const sentence = summary
    ? summary(parts)
    : parts.map((part) => `${part.label}: ${format(part.value)} (${part.percent}%)`).join(', ');

  const hover = useChartHover(drawn.length);
  const active = hover.active == null ? null : drawn[hover.active]!;
  // Where each part starts and ends across the track, as fractions of the
  // whole: the gaps are two pixels at any width and are left out.
  const edges = drawn.reduce<number[]>((at, segment) => [...at, at[at.length - 1]! + segment.value / total], [0]);

  return (
    <div className={cx('crewlet-stacked-bar', className)}>
      <div className="crewlet-chart-frame" role="group" aria-labelledby={named} {...hover.plotProps}>
        <div className="crewlet-stacked-bar__track" aria-hidden>
          {drawn.map((segment, index) => (
            <span
              key={segment.id}
              className="crewlet-stacked-bar__segment"
              onPointerEnter={() => hover.point(index)}
              style={{
                flexGrow: segment.value,
                '--crewlet-stacked-bar-segment-color': segment.color,
              } as CSSProperties}
            />
          ))}
        </div>
        <ChartTooltip
          open={active != null}
          anchor={hover.active == null ? undefined : { start: edges[hover.active]!, end: edges[hover.active + 1]! }}
          rows={
            active == null || hover.active == null
              ? []
              : [
                  {
                    id: active.id,
                    name: active.label,
                    value: `${format(active.value)} (${parts[hover.active]!.percent}%)`,
                    color: active.color,
                  },
                ]
          }
          total={active == null ? undefined : { value: format(total) }}
        />
      </div>
      <VisuallyHidden id={named}>{sentence}</VisuallyHidden>
    </div>
  );
}
