import type { HTMLAttributes } from 'react';

export type SectionSpacing = 'none' | 'sm' | 'md' | 'lg';
export type SectionElement = 'section' | 'div' | 'header' | 'footer' | 'article';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: SectionElement;
  /** Vertical padding preset. Defaults to md. */
  spacing?: SectionSpacing;
}

/**
 * Section, a semantic band with token-driven vertical rhythm. It owns the
 * spacing between page sections; pair with Container for the horizontal
 * measure. It deliberately ships no scroll-reveal, so consumers keep that
 * behavior local.
 */
export const Section = ({
  as: As = 'section',
  spacing = 'md',
  className = '',
  children,
  ...rest
}: SectionProps) => {
  const classes = ['crewlet-section', `crewlet-section--${spacing}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <As {...rest} className={classes}>
      {children}
    </As>
  );
};
