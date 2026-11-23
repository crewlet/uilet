import { Skeleton } from '../Skeleton/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/** A word's room in a chart's scale or legend while the chart loads. */
export function LoadingWord({ wide = false }: { wide?: boolean }) {
  return <span className={cx('crewlet-skeleton__line', 'crewlet-chart-loading__word', wide && 'crewlet-chart-loading__word--wide')} />;
}

/** The plot's room while a chart loads, at the height it will draw at. */
export function LoadingPlot({ height }: { height: string }) {
  return <Skeleton variant="box" height={height} borderRadius="var(--radius-sm)" className="crewlet-chart-loading__plot" />;
}

/** What a reader who cannot see the placeholder is told, once, in a polite region. */
export function LoadingSaid({ children }: { children: string }) {
  return (
    <VisuallyHidden>
      <span role="status">{children}</span>
    </VisuallyHidden>
  );
}
