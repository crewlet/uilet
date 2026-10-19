import type { ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ChartEmptyProps {
  children: ReactNode;
  className?: string | undefined;
}

/**
 * What a chart says when it has nothing to draw.
 *
 * ONE SENTENCE IN THE CHART'S PLACE, the same for every chart in the kit. A
 * chart of no data drew its scaffolding (an empty grid, a scale of 0 to 4, a
 * track with nothing on it, a window starting at the epoch), which is a
 * picture of a measurement that was never taken; one chart said so in words
 * and the others did not. The sentence takes the inset of whatever holds the
 * chart and none of its own, as the rows it stands in for would.
 */
export function ChartEmpty({ children, className }: ChartEmptyProps) {
  return <p className={cx('crewlet-chart-empty', className)}>{children}</p>;
}
