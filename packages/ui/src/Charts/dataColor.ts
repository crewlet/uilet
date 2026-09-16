/**
 * The data ramp: five series and a residual, in a fixed order.
 *
 * FIVE, AND THEN EVERYTHING ELSE. The ramp is measured for five hues that a
 * reader can tell apart from each other and from the accent under normal,
 * protan and deutan vision; a sixth would have to sit between two of them,
 * and the honest answer to "what colour is the eleventh series" is that
 * eleven series are not a comparison anybody can read. Past the fifth, a
 * series takes the residual, which is the neutral that means "the rest".
 *
 * A DATA HUE IS ONLY EVER USED INSIDE A CHART THAT CARRIES A LEGEND. It says
 * "this series", and a mark with no legend says nothing at all. Status,
 * phase and the accent have their own families for exactly that reason: a
 * chart colour never means success, and never means "you are here".
 */
export const DATA_COLORS = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
  'var(--color-data-5)',
] as const;

/** The neutral for everything past the fifth series. */
export const DATA_COLOR_OTHER = 'var(--color-data-other)';

/** The colour of series `index`, with everything past the fifth as the residual. */
export function dataColor(index: number): string {
  return DATA_COLORS[index] ?? DATA_COLOR_OTHER;
}
