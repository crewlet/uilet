import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** The most tracks a grid draws; it folds to fewer by its own width. */
export type TileGridColumns = 2 | 3 | 4;

export interface TileGridProps extends HTMLAttributes<HTMLElement> {
  /**
   * The tracks at full width. `3` (the default) folds straight to one, never
   * to two, so a set of three or six tiles never leaves a lone tile on a row
   * of its own; `4` folds to two and then one; `2` folds to one.
   */
  columns?: TileGridColumns | undefined;
  /** The element the tiles stand in: a `ul` for tiles that are `li`s. */
  as?: 'div' | 'ul' | 'ol' | undefined;
  children?: ReactNode;
}

/**
 * Tiles on a fixed number of tracks that folds by the grid's own width.
 *
 * GRIDS ON ONE PAGE LINE UP. Two sections of tiles (a catalogue's built-in
 * services over its third-party apps) each laid out on a track count of its
 * own put their tile edges in different places, and an `auto-fill` grid left
 * a hole at the end of a short section. A tile grid's tracks are a count, the
 * same in every grid given the same count and the same width, so every tile
 * edge on the page lines up.
 *
 * IT FOLDS BY ITS OWN WIDTH, never the window's: a grid beside a rail and a
 * settings column is as narrow as a phone's at a wide window. The outer
 * element is the size container, and the track list inside it is the grid,
 * because a container query styles what is inside the container and never
 * the container itself. `className` goes on that outer box, where a page
 * places the grid; every other attribute (an `id`, an `aria-label`) goes on
 * the track, which is the list a `ul` grid is.
 */
export function TileGrid({ columns = 3, as: Track = 'div', className, children, ...rest }: TileGridProps) {
  return (
    <div className={cx('crewlet-tile-grid', className)} data-columns={columns}>
      <Track {...rest} className="crewlet-tile-grid__track">
        {children}
      </Track>
    </div>
  );
}
