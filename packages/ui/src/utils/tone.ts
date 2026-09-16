/**
 * The two colour vocabularies a component is allowed to take as a prop.
 *
 * ONE SPELLING. The package shipped `warn` in Tag and Toaster and `warning` in
 * StatCard and Callout, and `danger` beside `error`, so the same state had two
 * names depending on which component drew it. A union declared once is what
 * stops the next component inventing a third.
 *
 * A tone says what a thing IS, never who it is: success, warning, danger and
 * info are states, `brand` is where the reader is, and everything else is
 * neutral. Identity (a seat, a node, a vendor, a tool) takes neutral colour and
 * is carried by its name, its glyph and its position.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/**
 * The phase vocabulary, and nothing else.
 *
 * Three phases, because that is the whole of the engine's phase model. A
 * per-model or per-worker breakdown is a CHART SERIES SET and takes the data
 * ramp (`--color-data-1` and the rest) inside a legend, not this family: a
 * reader compares phase marks against each other, so the three are separated
 * from one another and from every status hue, which a growing set of series
 * could not be.
 */
export type PhaseTone = 'phase-onboarding' | 'phase-execute' | 'phase-review';
