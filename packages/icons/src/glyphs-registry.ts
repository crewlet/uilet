/**
 * `@crewlethq/icons/glyphs/registry`: a glyph chosen from a value.
 *
 * IMPORTING THIS PULLS IN EVERY GLYPH, because a lookup by name is a lookup
 * over all of them. That is the right trade where the name really is data (a
 * navigation table, a server-sent event category, a configured integration
 * kind) and the wrong one everywhere else, which is why it is a separate entry
 * from `@crewlethq/icons/glyphs`: a consumer that imports one glyph never
 * reaches this module and never pays for it.
 *
 * `GlyphName` is the union of every vendored name, so a name that does not
 * exist is a type error rather than a blank square nobody notices.
 */

import type { ComponentType } from 'react';

import type { GlyphProps } from './Glyph.js';
import type { GlyphName } from './generated/glyphs/index.js';
import { GLYPHS } from './generated/glyphs/registry.js';

export { GLYPHS };

export function glyphByName(name: GlyphName): ComponentType<GlyphProps> {
  return GLYPHS[name];
}
