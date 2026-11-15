/** How a table's column asks for its track. */
export interface TableTrack {
  /** An exact track, in place of the computed one. */
  width?: string | undefined;
  /** Shrink to content, up to a fifth of the table. */
  shrink?: boolean | undefined;
  /** The narrowest a flexible column may be drawn. */
  floor?: string | undefined;
  /**
   * A flexible column measured to hold only SHORT values (`SHORT_COLUMN_PX`
   * at most): it is drawn at what it holds rather than taking a share.
   */
  short?: boolean | undefined;
}

/**
 * The widest a flexible column's values may be and still count as short: a
 * seat's handle, a kind, a date. Such a column takes what it holds; a longer
 * one (a name, a login, an access list) shares the room left.
 */
export const SHORT_COLUMN_PX = 192;

/**
 * The most of a table one `shrink` column may take: a fraction, so it is the
 * same promise on a phone and a wide screen, and two at the cap still leave
 * three fifths of the table to the flexible columns that are the point of it.
 */
export const SHRINK_SHARE = 0.2;

/**
 * A column's grid track, by the rules every table of columns in the kit sizes by: a
 * content-sized column is capped with `fit-content()`, since `max-content` would
 * starve the name, and a flexible one takes the rest above its floor.
 */
export function tableTrack({ width, shrink, floor, short }: TableTrack): string {
  if (width) return width;
  if (shrink) return `fit-content(${SHRINK_SHARE * 100}%)`;
  // A SHORT COLUMN TAKES WHAT IT HOLDS, never more than its widest value and
  // never under its floor: at an equal `1fr` share a seat's handle sat in a
  // third of a column of empty room beside a name cut to "Maximiliana
  // Konstanti...". Content-sized, it is resolved with the shrink columns,
  // before the long ones share what is left, so it gives way by `drop`, never
  // by a cut.
  if (short) return floor === 'max-content' || !floor ? 'max-content' : `minmax(${floor}, max-content)`;
  return `minmax(${floor ?? 0}, 1fr)`;
}
