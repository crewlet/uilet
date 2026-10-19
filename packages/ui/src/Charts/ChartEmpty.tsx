import type { ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ChartEmptyProps {
  children: ReactNode;
  /**
   * The height of the plot it stands in for, as a CSS length, so a chart with
   * nothing to draw keeps the height it would have drawn and a row of figures
   * stays even. Left out, it is as tall as its sentence, or as its container
   * when that is given a height.
   */
  height?: string | undefined;
  /**
   * Where the sentence stands: `center`, the default, in the middle of the
   * plot it stands in for; `start` at the start of a list, where its rows
   * would have begun.
   */
  align?: 'center' | 'start' | undefined;
  className?: string | undefined;
}

/**
 * What a chart says when it has nothing to draw.
 *
 * ONE SENTENCE IN THE CHART'S PLACE, the same for every chart in the kit. A
 * chart of no data drew its scaffolding (an empty grid, a scale of 0 to 4, a
 * track with nothing on it, a window starting at the epoch), which is a
 * picture of a measurement that was never taken.
 *
 * IN THE MIDDLE OF THE PLOT, AT ITS HEIGHT. At the top left of a tall empty
 * card the sentence read as a card that had failed to draw; centred in the
 * area the plot would have filled, in the quiet ink, it reads as a chart with
 * nothing in it, and the card keeps its height. A list's sentence stands
 * where its rows would have begun (`align="start"`).
 */
export function ChartEmpty({ children, height, align = 'center', className }: ChartEmptyProps) {
  return (
    <p
      className={cx('crewlet-chart-empty', align === 'start' && 'crewlet-chart-empty--start', className)}
      style={height === undefined ? undefined : { minHeight: height }}
    >
      {children}
    </p>
  );
}
