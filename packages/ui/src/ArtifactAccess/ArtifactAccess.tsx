import { BuildingComplexGlyph, LockGlyph, UsersGlyph, type GlyphSize } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/**
 * Who can open an artifact: only its owner (and those they shared it with by
 * name, which the owner alone sees), people it is shared with, or the whole
 * company.
 */
export type ArtifactAccess = 'private' | 'shared' | 'company';

/** Every access, from the narrowest to the widest. */
export const ARTIFACT_ACCESSES = ['private', 'shared', 'company'] as const satisfies readonly ArtifactAccess[];

const ACCESS_GLYPHS: Readonly<Record<ArtifactAccess, typeof LockGlyph>> = {
  private: LockGlyph,
  shared: UsersGlyph,
  company: BuildingComplexGlyph,
};

/**
 * What each access is called where there is room for a word: a list's column,
 * a card's hover text. Short, because a column of them is read down.
 */
export const ARTIFACT_ACCESS_LABELS: Readonly<Record<ArtifactAccess, string>> = {
  private: 'Private',
  shared: 'Shared',
  company: 'Company',
};

/**
 * The glyph an access is drawn with, wherever it is drawn: a lock, people or
 * the company's building. Decorative: whatever draws it says the word too,
 * printed or for assistive technology.
 */
export function ArtifactAccessGlyph({ access, size = 'sm' }: { access: ArtifactAccess; size?: GlyphSize | undefined }) {
  const Drawn = ACCESS_GLYPHS[access];
  return <Drawn size={size} />;
}

export interface ArtifactAccessLabelProps {
  access: ArtifactAccess;
  /** The word printed beside the glyph. The design system's short word by default. */
  label?: string | undefined;
  /** The hover text, where the word is not the whole story: "Shared with 3 people". */
  title?: string | undefined;
  className?: string | undefined;
}

/**
 * Who can open an artifact, as a glyph and its word: a list's Access column.
 *
 * QUIET FOR PRIVATE, A STEP UP FOR SHARED. The glyph is the tertiary step,
 * and an artifact others can open prints its word a step stronger than one
 * nobody else sees, so a column read down picks out what is shared without
 * a hue: access is a fact about reach, never a status, and takes no colour.
 */
export function ArtifactAccessLabel({ access, label, title, className }: ArtifactAccessLabelProps) {
  const word = label ?? ARTIFACT_ACCESS_LABELS[access];
  return (
    <span className={cx('crewlet-artifact-access', `crewlet-artifact-access--${access}`, className)} title={title ?? word}>
      <span className="crewlet-artifact-access__glyph" aria-hidden="true">
        <ArtifactAccessGlyph access={access} />
      </span>
      <span className="crewlet-artifact-access__word">{word}</span>
    </span>
  );
}
