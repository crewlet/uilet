import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

export interface IconTileProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The glyph, at the size the tile is drawn at: `sm` in a `sm` or `md` tile, `md` in a `lg` one. */
  children: ReactNode;
  /** The hue it is tinted in. Left out, the brand accent's soft fill and ink. */
  hue?: NodeHue | undefined;
  /** One of the row heights: `sm` 28px, `md` 36px, `lg` 48px. */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * A glyph on a tinted square: what a choice in a library or a catalog is
 * told apart by before its name is read. The widget tray draws one per widget
 * it offers.
 *
 * A HUE PER KIND, NOT PER STATE. The tint is decorative and picked for the
 * thing it marks (`NodeHue`), so a tile in rose says nothing is wrong; a state
 * is a `StatusDot` or a `Tag`.
 *
 * DECORATION. The tile is hidden from assistive technology: the name beside it
 * is what is read.
 */
export function IconTile({ children, hue, size = 'md', className, ...rest }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      className={cx('crewlet-icon-tile', `crewlet-icon-tile--${size}`, hue && `crewlet-icon-tile--${hue}`, className)}
    >
      {children}
    </span>
  );
}
