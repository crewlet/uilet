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

/**
 * Whether a change is the one the reader wanted.
 *
 * NOT the direction. The sign in the value already says which way the number
 * moved, and whether up is good is a property of what is counted rather than
 * of the arithmetic: twelve percent more work completed is good news and
 * twelve percent more tokens spent may not be. So the caller, who knows what
 * the tile counts, says which it is, and `neutral` is a change that is neither
 * (four more tasks in progress is not a verdict, it is a fact).
 */
export type StatCardDeltaPolarity = 'good' | 'bad' | 'neutral';

/** A change against an earlier reading, drawn at the head of the second line. */
export interface StatCardDelta {
  /** The change, already formatted by the caller and carrying its own sign: "+12%", "−3", "+4". */
  value: ReactNode;
  /** Whether it is the change the reader wanted. See the type. */
  polarity: StatCardDeltaPolarity;
}

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  /** What is being counted, in sentence case: "Tasks in progress". */
  label: ReactNode;
  /** The headline value, already formatted by the caller. */
  value: ReactNode;
  /** A unit after the value, at a quieter weight: "ms", "/ 7", "per turn". */
  unit?: ReactNode;
  /** The second line: "vs last week · 2 blocked". Its line is reserved either way. */
  sub?: ReactNode;
  /**
   * A change against an earlier reading, drawn first on the second line in
   * the ink of its polarity, with `sub` after it: "+12% vs previous 7 days".
   */
  delta?: StatCardDelta | undefined;
  /**
   * A small figure at the end of the value's line, such as a `Sparkline` or a
   * `Meter`, or a small control that acts on the number. A figure fills the
   * slot's width and a control keeps its own. The slot is
   * `--crewlet-statcard-trend-width` wide, 96px unless a stylesheet says
   * otherwise.
   */
  trend?: ReactNode;
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
 * THE LABEL SITS ABOVE THE VALUE, in sentence case at the caption step, which
 * is the approved design's tile and the order a board is actually read in:
 * the labels are what a reader scans to find the tile they want, and the
 * number is the answer underneath it. It is also the order a screen reader
 * reads correctly, "tasks in progress, 18, +4 vs last week" rather than "18,
 * tasks in progress". The label is set as it is written: the uppercased,
 * tracked-open register is a table's column head, and five of them over five
 * numbers shouted a heading at every tile.
 *
 * THE VALUE IS THE SCREEN'S ONE DISPLAY NUMBER, at `--font-size-display` with
 * tabular figures, so a number that ticks up moves nothing beside it. A
 * figure showing where it has been going sits at the END of the same line
 * (`trend`), and a change against an earlier reading heads the line under it
 * (`delta`), in the ink of whether it was the change the reader wanted.
 *
 * WHILE IT IS LOADING IT SAYS SO. It used to draw a literal `--`, which a
 * screen reader reads aloud as "dash dash" and which looks exactly like a
 * measured value of nothing. A placeholder line plus `aria-busy` on the tile
 * says the number has not arrived, which is a different fact from the number
 * being zero. The trend and the delta wait with it: both are readings of the
 * number that has not arrived.
 */
export const StatCard = ({
  label,
  value,
  unit,
  sub,
  delta,
  trend,
  icon,
  tone = 'neutral',
  loading = false,
  loadingLabel = 'Loading',
  flush = false,
  className,
  ...rest
}: StatCardProps) => {
  const change = loading ? undefined : delta;
  const said = sub !== undefined && sub !== null && sub !== false && sub !== '';
  return (
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
      <div className="crewlet-statcard__reading">
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
        {trend && !loading ? <div className="crewlet-statcard__trend">{trend}</div> : null}
      </div>
      {/* Rendered whether or not there is one: a row where one tile has a second
          line and the rest do not would otherwise sit at two different heights. */}
      <div className="crewlet-statcard__sub">
        {change ? (
          <span className={cx('crewlet-statcard__delta', `crewlet-statcard__delta--${change.polarity}`)}>
            {change.value}
          </span>
        ) : null}
        {/* A real space rather than a margin, so the line reads as the one
            sentence it is: "+12% vs previous 7 days". */}
        {change && said ? ' ' : null}
        {sub}
      </div>
    </div>
  );
};
