import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface StatGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * How many tiles a row holds. FIXED, and that is the whole point: the board
   * this replaces reflowed from one column to three as tiles appeared and
   * vanished, which moved every number on the page for a reason that had
   * nothing to do with the numbers.
   */
  columns?: 2 | 3 | 4;
  children?: ReactNode;
}

/**
 * A row of stat tiles, as one card.
 *
 * The tiles inside it are `flush`, so the group draws the surface and the
 * hairlines between them rather than four separate cards with gaps. Under the
 * md breakpoint it drops to two columns, which is the last count at which a
 * six-character number still fits on one line of a phone.
 */
export function StatGroup({ columns = 4, className, children, ...rest }: StatGroupProps) {
  return (
    <div
      {...rest}
      className={cx('crewlet-stat-group', className)}
      style={{ '--crewlet-stat-group-cols': columns, ...rest.style } as CSSProperties}
    >
      {children}
    </div>
  );
}
