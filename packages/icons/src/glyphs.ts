/**
 * `@crewlethq/icons/glyphs`: one component per Material Symbols drawing.
 *
 * Each export is named in PascalCase with a `Glyph` suffix, because the bare
 * words collide: Timeline, List, Menu, Tag, Link and Code are all uilet
 * components, and a glyph taking one of those names would shadow the component
 * at every import site that wanted both.
 *
 * Tree-shakable: a build that imports `CloseGlyph` carries close and nothing
 * else. Choosing a glyph from a value instead needs the registry, which is a
 * separate entry (`@crewlethq/icons/glyphs/registry`) for exactly that reason.
 */

export * from './generated/glyphs/index.js';
export { GLYPH_SIZES, cssLength, glyphOpticalSize, glyphPixels } from './Glyph.js';
export type { GlyphOpticalSize, GlyphProps, GlyphSize, GlyphSizeStep } from './Glyph.js';
