import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * The mark an absent value is drawn as: an EN dash, U+2013.
 *
 * An en dash rather than an em dash, which this design system does not use
 * anywhere; rather than a hyphen, which is a minus sign in a column of
 * numbers; and rather than an empty cell, which reads as a value nobody has
 * looked at yet.
 */
export const EMPTY_VALUE = '–';

export interface EmptyValueProps {
  /**
   * What the absence means, read in place of the dash. "Not reported" is the
   * honest default: the value was asked for and nothing came back. A caller
   * that knows better should say so, because the distinctions matter: "Not
   * configured" is a thing somebody can fix, "Not applicable" is not a gap at
   * all, and "Not reported yet" is a thing that may still arrive.
   */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * A value that is not there, said once rather than drawn as a punctuation mark
 * a screen reader reads as "dash" or skips entirely.
 *
 * AN ABSENT NUMBER IS A MARKED ABSENCE, NEVER A ZERO. A cost nobody measured
 * and a cost of nothing are different facts, and a table that draws both as
 * `0` has thrown the difference away where it can never be recovered. Every
 * place that would have written a bare dash uses this instead, so the absence
 * carries its own meaning and its own reading.
 */
export function EmptyValue({ label = 'Not reported', className }: EmptyValueProps) {
  return (
    <span className={cx('crewlet-empty-value', className)}>
      <span aria-hidden>{EMPTY_VALUE}</span>
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  );
}
