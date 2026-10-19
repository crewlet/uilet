import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ArrangeGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Columns of the grid, which each block spans a number of. Twelve by default. */
  columns?: number | undefined;
  children?: ReactNode;
}

/**
 * The page grid a board's blocks stand on: equal columns, each block
 * (an `ArrangeFrame`) spanning the number of them it says.
 *
 * A FRAME'S WIDTH IS READ ONLY BY A GRID. `ArrangeFrame` writes
 * `grid-column: span N`, which means nothing to a block parent, so frames
 * placed straight in an `ArrangeBoard` stack at the page's full width. This is
 * that grid, once, for every board: the page's blocks stand on it, and an
 * `ArrangeGroup`'s body is the same grid inside the group, so a block is the
 * same width on the page and in a group.
 *
 * ITS GAP IS THE BOARD'S. The board's column lanes are drawn from
 * `--crewlet-arrange-board-gap`, and so is this, so a lane is exactly the
 * column a block snaps to.
 */
export function ArrangeGrid({ columns = 12, className, style, children, ...rest }: ArrangeGridProps) {
  return (
    <div
      className={cx('crewlet-arrange-grid', className)}
      style={{ ...style, '--crewlet-arrange-columns': columns } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
}
