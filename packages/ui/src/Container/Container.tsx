import type { HTMLAttributes } from 'react';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Max content width. sm 720, md 960, lg 1200, xl 1440 (px). */
  size?: ContainerSize;
}

/**
 * Container, the centered max-width wrapper that gives every page a
 * consistent measure and horizontal gutter. Pair with Section for the
 * vertical rhythm.
 */
export const Container = ({
  size = 'lg',
  className = '',
  children,
  ...rest
}: ContainerProps) => {
  const classes = ['crewlet-container', `crewlet-container--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
};
