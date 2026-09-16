import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export type EyebrowVariant = 'muted' | 'accent' | 'gradient';
export type EyebrowElement = 'span' | 'div' | 'p';

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to an inline span. */
  as?: EyebrowElement | undefined;
  variant?: EyebrowVariant | undefined;
}

/**
 * Eyebrow (kicker), the small uppercase label that sits above a section title
 * to name the section.
 *
 * It is set in THE micro-label register, the same one `Text variant="label"`
 * and a table's column head take, so a kicker over a marketing band and a
 * column head in a console read as one system rather than as two ideas of
 * what a small uppercase label is.
 */
export const Eyebrow = ({
  as: As = 'span',
  variant = 'muted',
  className,
  children,
  ...rest
}: EyebrowProps) => {
  const classes = cx('crewlet-eyebrow', `crewlet-eyebrow--${variant}`, className);

  return (
    <As {...rest} className={classes}>
      {children}
    </As>
  );
};
