import type { HTMLAttributes, ReactNode } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/**
 * The STATE this number is in, when it has one.
 *
 * DELIBERATELY ABSENT FROM MOST STATS. Colour carries state and never
 * identity, and a token count or an elapsed time is not in a state: tinting
 * every tile would spend the four status hues on decoration and leave the one
 * tile that means something indistinguishable from its neighbours. Use it
 * where the value IS an outcome, such as a turn's decision or a probe's
 * verdict, and nowhere else.
 *
 * There is no `brand` here. The accent means "where the reader is", and a
 * number is never that.
 */
export type StatCardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  /** What is being counted, for example "Total tokens". */
  label: ReactNode;
  /** The headline value, already formatted by the caller. */
  value: ReactNode;
  /** A unit after the value, at a quieter weight: "ms", "/ 20K", "per turn". */
  unit?: ReactNode;
  /** A second line under the label: "3 working, 4 idle". Its line is reserved either way. */
  sub?: ReactNode;
  /** A glyph before the label. A component, not a name. */
  icon?: ReactNode;
  /** Colours the VALUE's ink. See the type for when that is right. */
  tone?: StatCardTone;
  /** The value has not arrived. Draws a placeholder and marks the tile busy. */
  loading?: boolean;
  /** What a reader is told while it is loading. */
  loadingLabel?: string;
  /**
   * Drop the tile's own surface, border and radius, so a StatGroup can draw
   * one card around the row and hairlines between the tiles inside it.
   */
  flush?: boolean;
}

/**
 * One number, with what it counts.
 *
 * THE LABEL SITS ABOVE THE VALUE, in the micro-caps register, which is the
 * engine's order and the one a board is actually read in: the labels are what
 * a reader scans to find the tile they want, and the number is the answer
 * underneath it. It is also the order a screen reader reads correctly, "live
 * nodes, four, holding an unexpired lease" rather than "four, live nodes".
 * The numbers still sit on one line across the row, because the label register
 * is one line at every tile and the value box is a fixed step.
 *
 * WHILE IT IS LOADING IT SAYS SO. It used to draw a literal `--`, which a
 * screen reader reads aloud as "dash dash" and which looks exactly like a
 * measured value of nothing. A placeholder line plus `aria-busy` on the tile
 * says the number has not arrived, which is a different fact from the number
 * being zero.
 */
export const StatCard = ({
  label,
  value,
  unit,
  sub,
  icon,
  tone = 'neutral',
  loading = false,
  loadingLabel = 'Loading',
  flush = false,
  className,
  ...rest
}: StatCardProps) => (
  <div
    {...rest}
    className={cx('crewlet-statcard', `crewlet-statcard--${tone}`, flush && 'crewlet-statcard--flush', className)}
    aria-busy={loading || undefined}
  >
    <div className="crewlet-statcard__label">
      {icon ? (
        <span className="crewlet-statcard__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {label}
    </div>
    <div className="crewlet-statcard__value">
      {loading ? (
        <>
          <span className="crewlet-statcard__placeholder" aria-hidden />
          <VisuallyHidden>{loadingLabel}</VisuallyHidden>
        </>
      ) : (
        <>
          {value}
          {unit ? <span className="crewlet-statcard__unit">{unit}</span> : null}
        </>
      )}
    </div>
    {/* Rendered whether or not there is one: a row where one tile has a second
        line and the rest do not would otherwise sit at two different heights. */}
    <div className="crewlet-statcard__sub">{sub}</div>
  </div>
);
