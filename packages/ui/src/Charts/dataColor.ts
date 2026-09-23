/**
 * The data ramp: four series and a residual, in a fixed order.
 *
 * FOUR, AND THEN EVERYTHING ELSE. The ramp is measured for four hues that a
 * reader can tell apart from their neighbours, from the reserved danger red and
 * from the accent, under normal, protan and deutan vision; a fifth would have
 * to sit between two of them, and the honest answer to "what colour is the
 * eleventh series" is that eleven series are not a comparison anybody can
 * read. Past the fourth, a series takes the residual, which is the neutral
 * that means "the rest".
 *
 * A DATA HUE IS ONLY EVER USED INSIDE A FIGURE THAT NAMES IT: a legend for two
 * series or more, the label for one. It says "this series", and a mark nothing
 * names says nothing at all. State, phase and the accent have their own
 * families for exactly that reason: a chart colour never means done or
 * stopped, and never means "you are here".
 */
export const DATA_COLORS = [
  'var(--color-data-1)',
  'var(--color-data-2)',
  'var(--color-data-3)',
  'var(--color-data-4)',
] as const;

/** The neutral for everything past the fourth series. */
export const DATA_COLOR_OTHER = 'var(--color-data-other)';

/** The colour of series `index`, with everything past the fourth as the residual. */
export function dataColor(index: number): string {
  return DATA_COLORS[index] ?? DATA_COLOR_OTHER;
}
