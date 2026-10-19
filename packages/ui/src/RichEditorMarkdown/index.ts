/*
 * The editor's Markdown round trip, as an entry of its own: it brings the
 * document model with it, and `RichEditor`'s shell must not, so a screen that
 * only draws the editor loads none of it until somebody edits.
 */
export { canonicalMarkdown, roundTripMarkdown } from '../RichEditor/roundtrip.js';
