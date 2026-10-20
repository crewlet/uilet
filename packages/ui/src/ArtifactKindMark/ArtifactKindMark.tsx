import { CrewletCharacter, type CrewletCharacterId } from '@crewlethq/icons/characters';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { cx } from '../utils/cx.js';

/**
 * THE CHARACTER EACH KIND IS MADE BY. Agents are what this product is, so a
 * kind is introduced by one of the Crewlet characters rather than by a stock
 * picture of a page: a page for a doc, a wide screen for slides, a prism for a
 * design, a gauge for a dashboard, a chip for a page of code and a stack of
 * rows for a sheet. The choice is the design system's, once, so every surface
 * that pictures a kind (a Make tile, a card's badge, a composer's chips) draws
 * the same character for it.
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

export interface ArtifactKindMarkProps {
  kind: ArtifactKind;
  /** Defaults to `md`. */
  size?: ArtifactKindMarkSize | undefined;
  /**
   * `plate` sets the character on a squircle of the kind's fill, as an
   * agent's avatar sits on its hue; `bare` draws the character alone, for a
   * stage that is already the kind's ground.
   */
  surface?: 'plate' | 'bare' | undefined;
  className?: string | undefined;
}

/**
 * A kind's mark: its maker character ([ARTIFACT_KIND_CHARACTERS]) in the
 * kind's hue, on a plate of the same hue cut to an agent's squircle, so a kind
 * reads as one of the crew. Every colour is the kind's token, so a theme
 * repaints it with nothing held here.
 *
 * DECORATION. The kind's name is always printed beside the mark, and that is
 * what is read: the mark is hidden from assistive technology.
 */
export function ArtifactKindMark({ kind, size = 'md', surface = 'plate', className }: ArtifactKindMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'crewlet-kind-mark',
        `crewlet-kind--${kind}`,
        `crewlet-kind-mark--${size}`,
        surface === 'bare' && 'crewlet-kind-mark--bare',
        className,
      )}
    >
      {/* THE FULL DRAWING ONLY WHERE ITS HAIRLINES READ, as an avatar draws
          one: under 56px the keyline turns into a blur round the body. */}
      <CrewletCharacter character={ARTIFACT_KIND_CHARACTERS[kind]} detail={size === 'xl' ? 'full' : 'compact'} />
    </span>
  );
}
