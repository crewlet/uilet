/** How a table's column asks for its track. */
export interface TableTrack {
  /** An exact track, in place of the computed one. */
  width?: string | undefined;
  /** Shrink to content, up to a fifth of the table. */
  shrink?: boolean | undefined;
  /** The narrowest a flexible column may be drawn. */
  floor?: string | undefined;
}

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
 *
 * A FLEXIBLE COLUMN IS SIZED BY WHAT IT HOLDS (`minmax(floor, auto)`), not by an
 * equal share. Grid hands the room out evenly and stops each column at its
 * widest value, so a short column (a seat's handle, a kind) takes what it holds
 * and the long ones (a name, a login, an access list) share everything left;
 * once every value fits, the room still left stretches every flexible column
 * alike, and the grid still fills its box. At `1fr` each flexible column took
 * an equal share whatever it held: a name was cut to "Maximiliana Konstanti..."
 * beside a seat column with a third of its share empty.
 */
export function tableTrack({ width, shrink, floor }: TableTrack): string {
  if (width) return width;
  return shrink ? `fit-content(${SHRINK_SHARE * 100}%)` : `minmax(${floor ?? 0}, auto)`;
}
