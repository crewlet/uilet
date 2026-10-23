import type { ComponentType } from 'react';
import type { GlyphProps } from './Glyph.js';
import type { GlyphName } from './generated/glyphs/index.js';
import { GLYPHS } from './generated/glyphs/registry.js';

/**
 * The component that draws a name, typed to the props every glyph takes.
 *
 * `glyphByName` answers with the glyph's own type, so a caller holding a
 * `GlyphName` union gets a union of components it cannot render without
 * narrowing. This is that narrowing, once: a name, the props every glyph
 * takes, and nothing a single glyph adds. A caller that wants `filled` knows
 * which glyph it is drawing and imports it by name.
 */
export function glyphFor(name: GlyphName): ComponentType<GlyphProps> {
  return GLYPHS[name] as ComponentType<GlyphProps>;
}

export interface NamedGlyphProps extends GlyphProps {
  /** The vendored name of the drawing, as `GlyphName` spells it. */
  name: GlyphName;
}

/**
 * A glyph drawn from a name, for a caller that holds a value rather than a
 * glyph: a navigation table, a work type, an attention reason. It is
 * decoration unless `title` names it, as every glyph is.
 */
export function NamedGlyph({ name, ...rest }: NamedGlyphProps) {
  const Drawing = glyphFor(name);
  return <Drawing {...rest} />;
}
