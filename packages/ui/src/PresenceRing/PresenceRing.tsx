import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/** A collaborator's hue, or `neutral` for a host that draws every collaborator alike. */
export type PresenceHue = NodeHue | 'neutral';

/** Active is a solid ring; idle is dashed, for a collaborator who has stepped away. */
export type PresenceRingState = 'active' | 'idle';

/**
 * The class that sets `--crewlet-presence-hue` on an element, for a component
 * that draws a presence mark of its own (a flag, a cursor, a badge's ring).
 * One table of hues for every presence mark, so a hue cannot be spelt two ways.
 */
export function presenceHueClass(hue: PresenceHue): string {
  return `crewlet-presence-hue--${hue}`;
}

export interface PresenceRingProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  hue: PresenceHue;
  state?: PresenceRingState | undefined;
  /** How far inside the element's edge the ring is drawn, in px. 1 by default, inside a hairline. */
  inset?: number | undefined;
  children?: ReactNode;
}

/**
 * A collaborator's outline round whatever they are on: a cell, a card, an
 * element of a page.
 *
 * INSET, so it never doubles the element's own border: the element keeps its
 * one edge and the ring is drawn inside it. DECORATIVE: it is a pseudo element
 * nothing reads, because the same fact is said in words where presence is
 * listed and in the focused element's description ("Jane Founder is also
 * here"). The hue is the presence colour exception (D22), so it is only ever
 * drawn beside the collaborator's name.
 */
export function PresenceRing({ hue, state = 'active', inset = 1, className, style, children, ...rest }: PresenceRingProps) {
  return (
    <span
      {...rest}
      className={cx('crewlet-presence-ring', presenceHueClass(hue), state === 'idle' && 'crewlet-presence-ring--idle', className)}
      style={{ '--crewlet-presence-ring-inset': `${inset}px`, ...style } as CSSProperties}
    >
      {children}
    </span>
  );
}
