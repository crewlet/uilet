/**
 * A control's tooltip that names its keyboard shortcut: "Zoom in" and the key
 * that does it, drawn as keycaps.
 *
 * Every control on a canvas has a key, and a reader who has to hover each one
 * to learn its key is a reader who is told it the moment it is useful. The tip
 * describes the control rather than naming it (see Tooltip), so a screen reader
 * hears the control's own name and then its shortcut, which the keycaps read
 * aloud through Kbd's spoken form.
 */

import type { ReactElement } from 'react';
import { Kbd } from '../Kbd/index.js';
import { Tooltip, type TooltipPlacement } from '../Tooltip/index.js';

export interface ShortcutTipProps {
  /** What the control does: the words the tooltip opens with. */
  label: string;
  /** The keys of the shortcut, in Kbd's names: `['Shift', '1']`, `['V']`. */
  keys: readonly string[];
  placement?: TooltipPlacement | undefined;
  /** Exactly one element: the control. */
  children: ReactElement;
}

export function ShortcutTip({ label, keys, placement = 'top', children }: ShortcutTipProps) {
  return (
    <Tooltip
      placement={placement}
      content={
        <span className="crewlet-shortcut-tip">
          {label}
          <Kbd keys={keys} subtle />
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}
