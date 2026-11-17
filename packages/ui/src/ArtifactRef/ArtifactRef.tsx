import type { ReactNode } from 'react';
import { LayersGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactKindGlyph, type ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { InlineRef, type InlineRefProps } from '../InlineRef/index.js';

/** What each kind is called, read before an artifact reference's title. */
export const ARTIFACT_REF_KIND_LABELS: Readonly<Record<ArtifactKind, string>> = {
  html: 'HTML',
  doc: 'Doc',
  slides: 'Slides',
  design: 'Design',
  dashboard: 'Dashboard',
  sheet: 'Sheet',
  brand: 'Brand',
};

export interface ArtifactRefProps extends Omit<InlineRefProps, 'mark' | 'markShape' | 'kind' | 'code' | 'children'> {
  /** Its kind, drawn as the kind's glyph; unknown while it is still being read, drawn as any artifact. */
  kind?: ArtifactKind | undefined;
  /** Its title. */
  title: string;
  /** The kind in words, read before the title: "Slides". */
  kindLabel?: string | undefined;
  /** The whole title for a pointer reader, where the words shown are cut. */
  hint?: string | undefined;
  /** Words after the title inside the reference: ", version 3". */
  after?: ReactNode;
}

/**
 * An artifact named inside a sentence or a row, drawn as a work item's key
 * is (`InlineRef`): its kind's glyph, then its title, in the sentence's ink or
 * a link's. The title is a phrase, so it wraps with the line.
 */
export function ArtifactRef({ kind, title, kindLabel, hint, after, wrap = true, ...rest }: ArtifactRefProps) {
  return (
    <InlineRef
      mark={kind ? <ArtifactKindGlyph kind={kind} /> : <LayersGlyph />}
      kind={kindLabel ?? (kind ? ARTIFACT_REF_KIND_LABELS[kind] : 'Artifact')}
      wrap={wrap}
      title={hint}
      {...rest}
    >
      {title}
      {after}
    </InlineRef>
  );
}
