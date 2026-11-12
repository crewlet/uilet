import type { HTMLAttributes, ReactNode } from 'react';
import { CircleAlertGlyph, InfoGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/** What needs a person on the thing a tile pictures: a ring in the tone and a badge with a glyph. */
export interface IconTileStatus {
  tone: 'danger' | 'warning' | 'info';
  /** Drawn in the badge in place of the tone's own glyph. */
  glyph?: ReactNode;
}

export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The glyph. */
  children: ReactNode;
  /** One of the six node hues, each with its measured fill and ink. Left out, the tone decides. */
  hue?: NodeHue | undefined;
  /** With no hue: the brand accent's soft fill, or the neutral raised ground for a place or a record. */
  tone?: 'accent' | 'neutral' | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  /**
   * `disc` is a round tile inside a hairline: one entry of a catalogue (a
   * service, a database, a domain), where the square is a kind of thing.
   */
  shape?: 'square' | 'disc' | undefined;
  /** A small mark on the lower corner, such as the vendor the entry lives at. Decorative. */
  mark?: ReactNode;
  /** A ring and a badge when the entry needs a person. The word is said beside the tile, never here. */
  status?: IconTileStatus | undefined;
  /** Not confirmed yet: a dashed edge. */
  dashed?: boolean | undefined;
}

function statusGlyph(tone: IconTileStatus['tone']): ReactNode {
  if (tone === 'danger') return <TriangleAlertGlyph />;
  if (tone === 'warning') return <CircleAlertGlyph />;
  return <InfoGlyph />;
}

/**
 * A glyph on a tinted tile, for catalogue items and the entries of one.
 *
 * DECORATIVE. The tile is hidden from assistive technology whatever it
 * carries: the name, the vendor and the state it pictures are said in words
 * beside it, so a status here is always a second signal and never the only
 * one.
 */
export function IconTile({
  children,
  hue,
  tone = 'accent',
  size = 'md',
  shape = 'square',
  mark,
  status,
  dashed = false,
  className,
  ...rest
}: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      data-status={status?.tone}
      data-dashed={dashed ? '' : undefined}
      className={cx(
        'crewlet-icon-tile',
        `crewlet-icon-tile--${size}`,
        shape === 'disc' && 'crewlet-icon-tile--disc',
        hue ? `crewlet-icon-tile--${hue}` : tone === 'neutral' && 'crewlet-icon-tile--neutral',
        className,
      )}
    >
      {children}
      {mark ? <span className="crewlet-icon-tile__mark">{mark}</span> : null}
      {status ? <span className="crewlet-icon-tile__badge">{status.glyph ?? statusGlyph(status.tone)}</span> : null}
    </span>
  );
}
