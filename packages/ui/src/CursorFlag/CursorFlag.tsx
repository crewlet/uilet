import type { HTMLAttributes } from 'react';
import { PencilGlyph } from '@crewlethq/icons/glyphs';
import { presenceHueClass } from '../PresenceRing/index.js';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/**
 * Where a flag stands against the element it labels: above its end edge, below
 * it, or in the flow for a component that places it itself (a live cursor).
 */
export type CursorFlagPlacement = 'top-end' | 'bottom-end' | 'inline';

export interface CursorFlagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The name, or several when more than one collaborator is on the same element ("Maya, @pm"). */
  name: string | readonly string[];
  hue: NodeHue;
  /** A person's flag is a pill, an agent's a squircle, as their badges are. */
  kind?: 'human' | 'agent' | undefined;
  /** The collaborator is editing rather than looking: a pencil leads the name. */
  editing?: boolean | undefined;
  placement?: CursorFlagPlacement | undefined;
}

/**
 * The name flag pinned to a collaborator's mark: a cell they are on, a cursor,
 * a selection.
 *
 * THE NAME IS ALWAYS ON IT. A flag is the half of the presence colour
 * exception (D22) that makes the hue mean somebody: a ring in a hue with no
 * name beside it would be colour carrying identity on its own. The name is
 * drawn in `--color-presence-flag-text`, which the palette suite holds at
 * 4.5:1 on each of the six hues in every theme, and a long name is truncated
 * rather than wrapped, so a flag never covers the row under it.
 *
 * DECORATIVE TO ASSISTIVE TECHNOLOGY. A flag moves with somebody else's
 * attention, and announcing it would read the room out loud. The same fact is
 * said in words wherever presence is listed, and in the focused element's
 * description.
 */
export function CursorFlag({ name, hue, kind = 'human', editing = false, placement = 'top-end', className, ...rest }: CursorFlagProps) {
  const text = typeof name === 'string' ? name : name.join(', ');
  return (
    <span
      {...rest}
      aria-hidden="true"
      className={cx(
        'crewlet-cursor-flag',
        presenceHueClass(hue),
        `crewlet-cursor-flag--${kind}`,
        `crewlet-cursor-flag--${placement}`,
        className,
      )}
    >
      {editing ? <PencilGlyph size="xs" className="crewlet-cursor-flag__glyph" /> : null}
      <span className="crewlet-cursor-flag__name">{text}</span>
    </span>
  );
}
