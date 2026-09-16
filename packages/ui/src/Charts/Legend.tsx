import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { dataColor } from './dataColor.js';

export interface LegendItem {
  /**
   * The series this entry is for. KEYED BY ID, never by position: a legend
   * beside a live chart is re-ranked on every push, and index keys hand one
   * series' node to another, so the swatch a reader was looking at changes
   * meaning underneath them.
   */
  id: string;
  label: ReactNode;
  /** Defaults to the series' own place in the data ramp. */
  color?: string;
  /** The number beside the name, where the legend doubles as the readout. */
  value?: ReactNode;
}

export interface LegendProps {
  items: LegendItem[];
  className?: string;
}

/**
 * What the colours in a chart mean.
 *
 * A STACKED BAR IS NEVER DRAWN WITHOUT ONE. A proportional bar with no legend
 * is a picture of some numbers: the reader can see that one part is bigger
 * than another and cannot learn which parts they are. The same goes for any
 * mark that carries a data hue; the hue is a pointer into this list and
 * nothing else.
 *
 * A list, and read as one, so a screen reader says how many series there are
 * before it reads them.
 */
export function Legend({ items, className }: LegendProps) {
  return (
    /*
     * `role="list"` although a `ul` already has one, which is why the lint
     * rule that calls it redundant is silenced here rather than obeyed: the
     * stylesheet takes the markers off, and WebKit answers a marker-less list
     * as a group of paragraphs, so a reader is no longer told how many series
     * there are before they are read. The role puts that back.
     */
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" className={cx('crewlet-legend', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="crewlet-legend__item">
          <span
            className="crewlet-legend__swatch"
            aria-hidden
            style={{ '--crewlet-legend-swatch-color': item.color ?? dataColor(index) } as CSSProperties}
          />
          <span className="crewlet-legend__label">{item.label}</span>
          {item.value != null && <span className="crewlet-legend__value">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
