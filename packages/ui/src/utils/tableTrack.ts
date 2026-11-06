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
 * A column's grid track, by the rules every table of columns in the kit sizes
 * by. `max-content` has no ceiling and a grid resolves it before any flexible
 * column, so one long value would starve the name: a content-sized column is
 * capped with `fit-content()`, and a flexible one takes the rest above its floor.
 */
export function tableTrack({ width, shrink, floor }: TableTrack): string {
  if (width) return width;
  return shrink ? `fit-content(${SHRINK_SHARE * 100}%)` : `minmax(${floor ?? 0}, 1fr)`;
}
