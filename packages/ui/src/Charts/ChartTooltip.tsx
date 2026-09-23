import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ChartTooltipRow {
  /** The series this row reads, so a row keeps its node as the reading moves. */
  id: string;
  name: ReactNode;
  /** The value, already formatted: "1.2M", "38 turns". */
  value: ReactNode;
  /**
   * The series' colour, drawn as a SWATCH beside the name and never as the
   * colour of any text: a data hue is a mark measured against the surface as
   * a mark, and read as text it holds none of the contrast a word needs.
   */
  color?: string | undefined;
}

export interface ChartTooltipProps {
  /** Whether a reading is showing. Closed, the live region stays and is empty. */
  open: boolean;
  /**
   * Where the mark being read stands, as fractions of the plot's width: its
   * `start` and `end` edges, or one `start` for a mark with no width (the
   * crosshair on a time series). The tooltip stands beside the mark, on the
   * side with more room, and never over it.
   */
  anchor?: { start: number; end?: number | undefined } | undefined;
  /** The line naming what is read: the bucket's time, the column's label. */
  title?: ReactNode;
  rows?: readonly ChartTooltipRow[];
  /** The sum, where the rows are parts of one whole. */
  total?: { label?: ReactNode; value: ReactNode } | undefined;
  className?: string;
}

/**
 * The reading of one mark, beside it.
 *
 * POSITIONED BY A STYLE PROPERTY, NEVER BY A STYLE ELEMENT. The one value that
 * varies (how far across the plot the mark stands) is set as `left` on the
 * element React draws, which a strict Content-Security-Policy allows because it
 * goes through the CSSOM rather than through markup the policy has to trust;
 * everything else is a rule in the stylesheet. It is ABSOLUTE in the nearest
 * positioned ancestor, which is the chart's plot frame, so a chart in a
 * scrolled panel, a dialog or a transformed canvas needs no measuring at all.
 *
 * THE SIDE IS THE ROOMIER ONE. A mark in the first half of the plot has its
 * tooltip after it and one in the second half before it, so the box never runs
 * off the end of a plot that ends at the edge of a card, and it never covers
 * the mark being read.
 *
 * TEXT TOKENS ONLY, ON GLASS. Every word is a text step: the title the
 * tertiary step, a series' name the secondary and every number the primary.
 * The box stands over the marks beside the one it reads, so its ground is the
 * frosted glass rather than the card, which is translucent in the marketing
 * palette and let a column's hue through the words; the palette suite holds
 * each step over 4.5:1 on the glass with every data hue behind it.
 * A series' hue is its swatch, which is a mark; painted into its name it would
 * be a word at whatever contrast a chart hue happens to have.
 *
 * IT IS THE LIVE REGION. The element that is always there is polite, and the
 * box is drawn inside it only while a reading shows, so a keyboard reader
 * walking the marks hears each one as they land on it: the tooltip is what
 * they would have read with their eyes, said once.
 */
export function ChartTooltip({ open, anchor, title, rows = [], total, className }: ChartTooltipProps) {
  const start = anchor?.start ?? 0;
  const end = anchor?.end ?? start;
  const after = (start + end) / 2 <= 0.5;
  const at = after ? end : start;
  return (
    <div className="crewlet-chart-tooltip-live" aria-live="polite" aria-atomic="true">
      {open ? (
        <div
          className={cx('crewlet-chart-tooltip', after ? 'crewlet-chart-tooltip--after' : 'crewlet-chart-tooltip--before', className)}
          style={{ left: `${(Math.min(Math.max(at, 0), 1) * 100).toFixed(3)}%` }}
        >
          {title != null && <p className="crewlet-chart-tooltip__title">{title}</p>}
          {rows.length > 0 && (
            // A list, said to be one: the markers are off, and WebKit drops the
            // role with them (see Legend).
            // eslint-disable-next-line jsx-a11y/no-redundant-roles
            <ul role="list" className="crewlet-chart-tooltip__rows">
              {rows.map((row) => (
                <li key={row.id} className="crewlet-chart-tooltip__row">
                  <span
                    className="crewlet-chart-tooltip__swatch"
                    aria-hidden
                    style={
                      row.color == null
                        ? undefined
                        : ({ '--crewlet-chart-tooltip-swatch-color': row.color } as CSSProperties)
                    }
                  />
                  <span className="crewlet-chart-tooltip__name">{row.name}</span>
                  <span className="crewlet-chart-tooltip__value">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
          {total != null && (
            <p className="crewlet-chart-tooltip__total">
              <span className="crewlet-chart-tooltip__name">{total.label ?? 'Total'}</span>
              <span className="crewlet-chart-tooltip__value">{total.value}</span>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
