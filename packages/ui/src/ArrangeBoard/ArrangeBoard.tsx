import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface ArrangeBoardProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the page is being arranged. */
  editing: boolean;
  /**
   * Columns of the page grid the blocks snap to, shown as lanes while a block
   * is carried or resized. The grid's gap is read from
   * `--crewlet-arrange-board-gap` (one `--spacing-4` unless set).
   */
  columns?: number | undefined;
  children: ReactNode;
}

/**
 * The ground a page's blocks stand on while it is arranged.
 *
 * A FINE HATCH SAYS "ARRANGING" AT REST. While editing, the blocks keep their
 * own look and light up only when hovered, so something has to say the page
 * is in a different mode before anything is touched. The ground under them
 * does it: diagonal hairlines, the drafting mark for a surface under
 * construction, with no frame of its own, so it adds no border to the borders
 * already on the page. Most of it sits under the blocks, and in the gaps
 * between them it reads as a cutting mat.
 *
 * THE COLUMNS SHOW WHILE A BLOCK MOVES. Carried or resized, the page's columns
 * appear as lanes on the ground, as wide as the grid exactly, so a lane is
 * the column a block will snap to; at rest they are gone.
 *
 * IT TAKES NO WIDTH FROM THE BLOCKS. The ground reaches a step past the blocks
 * on each side rather than padding them inward, so entering editing never
 * reflows a card to a narrower width.
 */
export function ArrangeBoard({
  editing,
  columns = 12,
  className,
  style,
  children,
  ...rest
}: ArrangeBoardProps) {
  return (
    <div
      className={cx('crewlet-arrange-board', editing && 'is-editing', className)}
      style={{ ...style, '--crewlet-arrange-board-columns': columns } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
}
