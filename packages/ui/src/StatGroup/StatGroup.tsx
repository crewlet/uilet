import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface StatGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * How many tiles a row holds. FIXED, and that is the whole point: the board
   * this replaces reflowed from one column to three as tiles appeared and
   * vanished, which moved every number on the page for a reason that had
   * nothing to do with the numbers. What changes it is the row's own width:
   * four fold to two under 640px of row, and three stack one a row under
   * 480px, so no row is left with a lone tile.
   */
  columns?: 2 | 3 | 4;
  /**
   * The row gives up its own surface, hairline and corner and keeps only the
   * hairlines between its tiles, so the host holding it does not draw a box
   * inside a box. A row that is a `Card`'s content, or its body's, is flush
   * without being told; this is for any other host (a widget's frame, a panel
   * of an application's own).
   */
  flush?: boolean | undefined;
  children?: ReactNode;
}

/**
 * A row of stat tiles, as one card.
 *
 * The tiles inside it are `flush`, so the group draws the surface and the
 * hairlines between them rather than four separate cards with gaps. It folds
 * by its OWN width rather than the window's (see StatGroup.css), so a row in
 * a narrow column beside a rail folds where a row across a page does not.
 */
export function StatGroup({ columns = 4, flush = false, className, children, ...rest }: StatGroupProps) {
  return (
    <div
      {...rest}
      className={cx('crewlet-stat-group', flush && 'crewlet-stat-group--flush', className)}
      // The count twice: as the custom property each tile spans its share of
      // the twelve tracks by, and as an attribute, because the hairlines and
      // the folds are chosen by selector and a selector cannot read a
      // property's value.
      data-columns={columns}
      style={{ '--crewlet-stat-group-cols': columns, ...rest.style } as CSSProperties}
    >
      {children}
    </div>
  );
}
