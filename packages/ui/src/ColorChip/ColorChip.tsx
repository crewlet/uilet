import type { CSSProperties } from 'react';
import { cx } from '../utils/cx.js';
import { normalizeHex } from '../utils/hexColour.js';

/** `xs` is 12px, a mark inside a small button; `sm` is 16px, beside a word in a row. */
export type ColorChipSize = 'xs' | 'sm';

export type ColorChipShape = 'round' | 'square';

export interface ColorChipProps {
  /**
   * The colour, as `#rrggbb`. Anything else draws the hatch of no colour and
   * is never put into a style.
   */
  value: string | null | undefined;
  size?: ColorChipSize | undefined;
  shape?: ColorChipShape | undefined;
  className?: string | undefined;
}

/**
 * A colour as a small chip and nothing else: the mark on a button that
 * applies it ("Use #007f7f"), or beside a value in a row.
 *
 * DECORATION, hidden from a screen reader: the words beside it say what the
 * colour is. Where a colour has to be named, read and copied, that is
 * `ColorSwatch`.
 *
 * THE VALUE PASSES THE SAME GATE AS EVERY BRAND PART (`#rrggbb`, lowercased)
 * before it reaches a style, and the chip draws an edge of its own, so a
 * colour that matches the ground it sits on is still a chip.
 */
export function ColorChip({ value, size = 'xs', shape = 'round', className }: ColorChipProps) {
  const hex = normalizeHex(value);
  return (
    <span
      className={cx(
        'crewlet-color-chip',
        `crewlet-color-chip--${size}`,
        `crewlet-color-chip--${shape}`,
        !hex && 'is-empty',
        className,
      )}
      style={hex ? ({ '--crewlet-color-chip-value': hex } as CSSProperties) : undefined}
      aria-hidden="true"
    />
  );
}
