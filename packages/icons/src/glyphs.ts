/**
 * `@crewlethq/icons/glyphs`: one component per vendored Lucide drawing.
 *
 * Each export is named in PascalCase with a `Glyph` suffix, because the bare
 * words collide: Timeline, List, Menu, Tag, Link and Code are all uilet
 * components, and a glyph taking one of those names would shadow the component
 * at every import site that wanted both. `x` is `XGlyph`, `chevron-down` is
 * `ChevronDownGlyph`, `columns-3` is `Columns3Glyph`.
 *
 * Tree-shakable: a build that imports `XGlyph` carries x and nothing else.
 * Choosing a glyph from a value instead needs the registry, which is a
 * separate entry (`@crewlethq/icons/glyphs/registry`) for exactly that reason.
 */

export * from './generated/glyphs/index.js';
export { GLYPH_SIZES, GLYPH_STROKE, cssLength } from './Glyph.js';
export type { FillableGlyphProps, GlyphProps, GlyphSize, GlyphSizeStep } from './Glyph.js';
