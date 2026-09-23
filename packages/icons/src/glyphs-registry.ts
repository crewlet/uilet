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
 * exist is a type error rather than a blank square nobody notices. The answer
 * is the component registered under that name with its own type, so a
 * FILLABLE name answers with a component that takes `filled` and every other
 * name with one that does not.
 */

import type { GlyphName } from './generated/glyphs/index.js';
import { GLYPHS } from './generated/glyphs/registry.js';

export { GLYPHS };

export function glyphByName<Name extends GlyphName>(name: Name): (typeof GLYPHS)[Name] {
  return GLYPHS[name];
}
