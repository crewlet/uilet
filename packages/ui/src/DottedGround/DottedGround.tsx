import type { HTMLAttributes, ReactNode } from 'react';
import type { ArtifactKind } from '../ArtifactKindGlyph/index.js';
import { cx } from '../utils/cx.js';
import '../ArtifactKindMark/index.js';

export interface DottedGroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /**
   * Tints the ground in a kind's colour, its dots in the kind's line over the
   * kind's fill falling into the page, for a surface that is about making one
   * of that kind. Without it the ground is the canvas's own.
   */
  kind?: ArtifactKind | undefined;
  /** `inset` rounds it and rings it as a panel on a page; `bleed` (default) fills its box. */
  shape?: 'bleed' | 'inset' | undefined;
}

/**
 * The dotted field the org chart and every canvas are drawn on, as a still
 * surface: a place where something is being made, rather than a form. The
 * dots are the canvas's own (`Canvas`'s `dotted` ground: the strong
 * hairline's ink, one spacing step apart), so a page set on this ground reads
 * as the same workshop the crew is drawn in.
 *
 * NOTHING PANS. A ground that looked draggable and did not move would be a
 * lie, so this is for a surface that holds something still (a page being
 * written, a brief being typed), never for content a person moves around.
 */
export function DottedGround({ children, kind, shape = 'bleed', className, ...rest }: DottedGroundProps) {
  return (
    <div
      {...rest}
      className={cx(
        'crewlet-dotted-ground',
        `crewlet-dotted-ground--${shape}`,
        kind && `crewlet-kind--${kind}`,
        kind && 'crewlet-dotted-ground--kind',
        className,
      )}
    >
      {children}
    </div>
  );
}
