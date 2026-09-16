import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface CountProps {
  /** How many. Rendered as it is given, so a caller decides its own formatting. */
  value: number | string;
  /**
   * What is being counted, read after the number: "3 open incidents". Without
   * one the number is read on its own, which is right beside a heading that
   * already says what it counts.
   */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * How many of something a panel, a tab or a heading is about.
 *
 * IT IS NEVER TINTED, and that is the whole rule. A count coloured by severity
 * is a claim the number cannot support: three of something is not a warning,
 * and a red 3 beside "Failures" says the same thing twice while a red 3 beside
 * "Retries" says something nobody meant. It sits on the inset surface in the
 * tertiary ink, in every context.
 *
 * Tabular figures, so a count that ticks up does not shift the heading beside
 * it, and a minimum width so 1 and 10 draw the same pill.
 */
export function Count({ value, label, className }: CountProps) {
  return (
    <span className={cx('crewlet-count', className)}>
      <span aria-hidden={label ? true : undefined}>{value}</span>
      {label ? (
        <VisuallyHidden>
          {value} {label}
        </VisuallyHidden>
      ) : null}
    </span>
  );
}
