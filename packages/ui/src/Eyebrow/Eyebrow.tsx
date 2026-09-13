import type { HTMLAttributes } from 'react';

export type EyebrowVariant = 'muted' | 'accent' | 'gradient';
export type EyebrowElement = 'span' | 'div' | 'p';

export interface EyebrowProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to an inline span. */
  as?: EyebrowElement;
  variant?: EyebrowVariant;
}

/**
 * Eyebrow (kicker), the small uppercase label that sits above a section
 * title to name the section. Monospace and tracked-out by default so it
 * reads as metadata rather than a heading.
 */
export const Eyebrow = ({
  as: As = 'span',
  variant = 'muted',
  className = '',
  children,
  ...rest
}: EyebrowProps) => {
  const classes = ['crewlet-eyebrow', `crewlet-eyebrow--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <As {...rest} className={classes}>
      {children}
    </As>
  );
};
