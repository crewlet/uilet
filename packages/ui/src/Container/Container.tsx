import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Max content width. sm 720, md 960, lg 1200, xl 1440, and `2xl` the
   * content-max token (1600), which is the widest a console pane goes before
   * a table's rows stop being scannable across. `full` keeps the gutter and
   * drops the measure, for a canvas or a wide grid.
   */
  size?: ContainerSize | undefined;
}

/**
 * Container, the centered max-width wrapper that gives every page a
 * consistent measure and horizontal gutter. Pair with Section for the
 * vertical rhythm.
 */
export const Container = ({
  size = 'lg',
  className,
  children,
  ...rest
}: ContainerProps) => {
  const classes = cx('crewlet-container', `crewlet-container--${size}`, className);

  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
};
