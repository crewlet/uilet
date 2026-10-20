import {
  FileCodeGlyph,
  FileTextGlyph,
  LayoutDashboardGlyph,
  PaletteGlyph,
  PresentationGlyph,
  TableGlyph,
  type GlyphSize,
} from '@crewlethq/icons/glyphs';

/*
 * A MODULE OF ITS OWN, not a part of ArtifactCard. A kind's glyph is drawn
 * wherever a kind is named (a sidebar's pins, a palette's hits, an icon, a
 * cover), most of them nowhere near a card. A bundler places a module whole,
 * so while the glyph shared ArtifactCard's module, every page that drew one
 * glyph took the whole card with it, and the kind drawings the card imports:
 * about 11 KB a host's first screen downloaded for a gallery it had not
 * opened.
 */

/** What an artifact is, as the engine names it (`artifacts.Kind`), which decides how it is drawn. */
export type ArtifactKind = 'html' | 'doc' | 'slides' | 'design' | 'dashboard' | 'sheet';

/** Every kind, in the engine's order (`artifacts.Kinds`). */
export const ARTIFACT_KINDS = ['html', 'doc', 'slides', 'design', 'dashboard', 'sheet'] as const satisfies readonly ArtifactKind[];

const KIND_GLYPHS: Readonly<Record<ArtifactKind, typeof FileCodeGlyph>> = {
  html: FileCodeGlyph,
  doc: FileTextGlyph,
  slides: PresentationGlyph,
  design: PaletteGlyph,
  dashboard: LayoutDashboardGlyph,
  sheet: TableGlyph,
};

/** The glyph a kind is drawn with, wherever a kind is drawn, at a glyph size step or in px. */
export function ArtifactKindGlyph({ kind, size = 'md' }: { kind: ArtifactKind; size?: GlyphSize | undefined }) {
  const Drawn = KIND_GLYPHS[kind];
  return <Drawn size={size} />;
}
