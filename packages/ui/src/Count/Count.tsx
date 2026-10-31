import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * What a count says by its colour: nothing, or that it waits on the reader.
 *
 * `quiet` is the default and every count of how many things a panel, a tab or
 * a heading is about. `attention` is a count of what WAITS ON THE READER (a
 * mention, a direct message, a new reply to them): the accent's own meaning,
 * the same 16px pill a navigation row's badge draws, so a menu button, a
 * switcher and a row in a list agree on what the reader has not seen.
 */
export type CountTone = 'quiet' | 'attention';

export interface CountProps {
  /** How many. Rendered as it is given, so a caller decides its own formatting. */
  value: number | string;
  /**
   * What is being counted, read after the number: "3 open incidents". Without
   * one the number is read on its own, which is right beside a heading that
   * already says what it counts.
   */
  label?: string | undefined;
  /** `quiet` (the default) or `attention`, for a count that waits on the reader. */
  tone?: CountTone | undefined;
  className?: string | undefined;
}

/**
 * How many of something a panel, a tab or a heading is about.
 *
 * IT IS NEVER TINTED BY SEVERITY, and that is the whole rule. A count coloured
 * by severity is a claim the number cannot support: three of something is not
 * a warning, and a red 3 beside "Failures" says the same thing twice while a
 * red 3 beside "Retries" says something nobody meant. A quiet count sits on
 * the inset surface in the tertiary ink, in every context.
 *
 * THE ONE COLOUR IT TAKES IS THE ACCENT, and only for `tone="attention"`: a
 * count of what waits on the reader, which is what the accent means. It is the
 * badge pill (`--size-badge`, its figure at `--font-size-badge`), so it never
 * reads louder than the name beside it. It is never the only carrier: its
 * label, or the row it sits in, says what is waiting.
 *
 * Tabular figures, so a count that ticks up does not shift the heading beside
 * it, and a minimum width so 1 and 10 draw the same pill.
 */
export function Count({ value, label, tone = 'quiet', className }: CountProps) {
  return (
    <span className={cx('crewlet-count', tone === 'attention' ? 'crewlet-count--attention' : undefined, className)}>
      <span aria-hidden={label ? true : undefined}>{value}</span>
      {label ? (
        <VisuallyHidden>
          {value} {label}
        </VisuallyHidden>
      ) : null}
    </span>
  );
}
