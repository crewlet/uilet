import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ReadOnlyFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** What the value is, in the same register as a field's label. */
  label: ReactNode;
  /** The value itself. */
  value: ReactNode;
  /**
   * Why it cannot be edited here, and where it is edited instead.
   *
   * ON THE SECONDARY INK, never the decoration step: this is the sentence
   * that stops a reader hunting for a control that is not on this screen, so
   * it is a fact rather than a flourish.
   */
  reason?: ReactNode;
  /** A link to where the value IS edited. */
  action?: ReactNode;
  /** Draws the value in the mono face, for an id, a handle or a path. */
  mono?: boolean;
}

/**
 * A fact a form shows and does not collect.
 *
 * WHY IT IS NOT A DISABLED FIELD. A disabled input says "not now" and invites
 * a reader to look for what would turn it on; half of these values are not
 * editable anywhere, and the other half are edited on another screen. A
 * disabled box also drops out of the tab order, so the sentence explaining
 * where to go is unreachable by exactly the reader who cannot see it beside
 * the box. This is text, in the same grid as the fields around it.
 */
export function ReadOnlyField({
  label,
  value,
  reason,
  action,
  mono = false,
  className = '',
  ...rest
}: ReadOnlyFieldProps) {
  return (
    <div {...rest} className={cx('crewlet-readonly-field', className)}>
      <span className="crewlet-readonly-field__label">{label}</span>
      <span className={cx('crewlet-readonly-field__value', mono && 'is-mono')}>{value}</span>
      {reason || action ? (
        <span className="crewlet-readonly-field__reason">
          {reason}
          {action ? <span className="crewlet-readonly-field__action">{action}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
