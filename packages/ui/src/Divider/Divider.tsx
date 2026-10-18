import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Words on the rule, for a divider that names what follows: "History". */
  label?: string | undefined;
  /** Where the words sit: at the start, as a section's name, or centred. */
  align?: 'start' | 'center' | undefined;
}

/**
 * A rule between parts of a page, with or without a name.
 *
 * A SEPARATOR TO A SCREEN READER, and a named one says its name, so a reader
 * moving through the page hears where one part ends and "History" begins
 * rather than nothing at all.
 */
export function Divider({ label, align = 'start', className, ...rest }: DividerProps) {
  return (
    <div
      role="separator"
      aria-label={label || undefined}
      className={cx('crewlet-divider', label && 'crewlet-divider--labelled', label && align === 'center' && 'crewlet-divider--center', className)}
      {...rest}
    >
      {label ? <span className="crewlet-divider__label">{label}</span> : null}
    </div>
  );
}
