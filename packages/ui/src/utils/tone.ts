/**
 * The one colour vocabulary a component is allowed to take as a prop.
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
 *
 * So does a CATEGORY. A phase, a unit or a model is neutral with its word, and
 * inside a figure it is a series its legend names, from the data ramp the
 * application maps it onto. There used to be a second vocabulary here, three
 * phase hues, and it spent three of the hues the states and the series are held
 * apart in on a word the label already said.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';
