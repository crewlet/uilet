import { CrewletCharacter, type CrewletCharacterId } from '@crewlethq/icons/characters';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { cx } from '../utils/cx.js';

/**
 * THE CHARACTER EACH KIND IS MADE BY, for the one place a kind is pictured
 * large enough to carry a figure: a Make tile's art. Agents are what this
 * product is, so a large picture of a kind is one of the Crewlet characters:
 * a page for a doc, a wide screen for slides, a prism for a design, a gauge
 * for a dashboard, a chip for a page of code and a stack of rows for a sheet.
 * The choice is the design system's, once, so every tile draws the same
 * character for a kind. Anywhere a kind is marked small, its glyph is.
 */
export const ARTIFACT_KIND_CHARACTERS: Readonly<Record<ArtifactKind, CrewletCharacterId>> = {
  doc: 'pagelet',
  slides: 'bricklet',
  design: 'prismlet',
  dashboard: 'dashlet',
  html: 'chiplet',
  sheet: 'stacklet',
};

/** The mark's steps, in px: a chip's, a list row's, a tile's and a stage's. */
export const ARTIFACT_KIND_MARK_SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
} as const;

export type ArtifactKindMarkSize = keyof typeof ARTIFACT_KIND_MARK_SIZES;

/** The glyph's size on each step's plate: a little over half the plate, as a card's badge draws it. */
const GLYPH_PX: Readonly<Record<ArtifactKindMarkSize, number>> = { sm: 14, md: 18, lg: 26, xl: 38 };

export interface ArtifactKindMarkProps {
  kind: ArtifactKind;
  /** Defaults to `md`. */
  size?: ArtifactKindMarkSize | undefined;
  /**
   * What the plate holds: the kind's `glyph` (the default), the same glyph a
   * card's badge, a list row and the sidebar draw, in the kind's ink; or its
   * maker `character`, for a tile's art large enough to carry a figure.
   */
  art?: 'glyph' | 'character' | undefined;
  /**
   * `plate` sets the art on a squircle of the kind's fill, as an agent's
   * avatar sits on its hue; `bare` draws the art alone, for a ground that is
   * already the kind's.
   */
  surface?: 'plate' | 'bare' | undefined;
  className?: string | undefined;
}

/**
 * A kind's mark: the kind's glyph in its ink, or its maker character
 * ([ARTIFACT_KIND_CHARACTERS]) in its hue, on a plate of the kind's fill cut
 * to an agent's squircle. THE GLYPH IS THE KIND'S IDENTITY: it is the mark a
 * card's badge, a list row, the sidebar and the palette draw, so a kind marked
 * anywhere else is marked with the same drawing in the same colour. Every
 * colour is the kind's token, so a theme repaints it with nothing held here.
 *
 * DECORATION. The kind's name is always printed beside the mark, and that is
 * what is read: the mark is hidden from assistive technology.
 */
export function ArtifactKindMark({ kind, size = 'md', art = 'glyph', surface = 'plate', className }: ArtifactKindMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'crewlet-kind-mark',
        `crewlet-kind--${kind}`,
        `crewlet-kind-mark--${size}`,
        `crewlet-kind-mark--${art}`,
        surface === 'bare' && 'crewlet-kind-mark--bare',
        className,
      )}
    >
      {art === 'glyph' ? (
        <ArtifactKindGlyph kind={kind} size={GLYPH_PX[size]} />
      ) : (
        // THE FULL DRAWING ONLY WHERE ITS HAIRLINES READ, as an avatar draws
        // one: under 56px the keyline turns into a blur round the body.
        <CrewletCharacter character={ARTIFACT_KIND_CHARACTERS[kind]} detail={size === 'xl' ? 'full' : 'compact'} />
      )}
    </span>
  );
}
