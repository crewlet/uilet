/**
 * The six hues an entity is told apart by, where an operator has chosen one.
 *
 * DECORATIVE AND PER ENTITY, never a series and never a state: two things
 * sharing a hue say nothing, so the palette is not measured for separability
 * and nothing owes a legend (`--color-node-*` in the tokens package says the
 * same). It is what an operator picks for one agent so they can find it
 * again: on its avatar, on its card in a chart and on its row in a table.
 *
 * CHOSEN, NEVER DERIVED. A hue hashed from a name carries no information:
 * rename the seat and its colour changes, which is the proof it never meant
 * anything. A hue a person picked survives a rename because it was never
 * made from one.
 *
 * A NAMED SET RATHER THAN A COLOUR. A caller that could hand in any colour
 * would hand in a literal, and the fill, the border and the ink of a tinted
 * surface are measured steps of one hue rather than one value with alphas
 * applied by whoever drew it last.
 */
export const NODE_HUES = ['purple', 'cyan', 'green', 'amber', 'rose', 'blue'] as const;

export type NodeHue = (typeof NODE_HUES)[number];

/** Each hue's name, for a label: `Cyan`. */
export const NODE_HUE_NAMES: Readonly<Record<NodeHue, string>> = {
  purple: 'Purple',
  cyan: 'Cyan',
  green: 'Green',
  amber: 'Amber',
  rose: 'Rose',
  blue: 'Blue',
};

/** Whether a value read off the wire names one of the six hues. */
export const isNodeHue = (value: unknown): value is NodeHue =>
  typeof value === 'string' && (NODE_HUES as readonly string[]).includes(value);
