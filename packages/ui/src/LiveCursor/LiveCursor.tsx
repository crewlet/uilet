import { useEffect, useState, type CSSProperties } from 'react';
import { MousePointer2Glyph } from '@crewlethq/icons/glyphs';
import { CursorFlag } from '../CursorFlag/index.js';
import { presenceHueClass } from '../PresenceRing/index.js';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';

/** How long a cursor that stopped moving stays at full strength, and how long until it is hidden. */
export const LIVE_CURSOR_REST_MS = 5_000;
export const LIVE_CURSOR_HIDE_MS = 30_000;

export interface LiveCursorProps {
  /** Position in px from the leading top corner of the nearest positioned ancestor. */
  x: number;
  y: number;
  name: string;
  hue: NodeHue;
  kind?: 'human' | 'agent' | undefined;
  /** Fades to 40% after this long without a move. */
  idleAfterMs?: number | undefined;
  /** Hidden after this long without a move. */
  hideAfterMs?: number | undefined;
  /**
   * Glides between positions. A reduced-motion preference always jumps
   * instead, whatever this says; false jumps for everybody.
   */
  interpolate?: boolean | undefined;
  className?: string | undefined;
}

type Phase = 'live' | 'resting' | 'gone';

/**
 * A collaborator's pointer, with their name flag, at a point on a board or a
 * page that shares cursors.
 *
 * IT FADES AS IT RESTS: full strength while it moves, 40% after five seconds
 * still, hidden after thirty, so a pointer somebody left over a chart does not
 * stand there all afternoon. Under a reduced-motion preference it jumps from
 * point to point and never glides; the flag still appears. DECORATIVE to
 * assistive technology, like every presence mark: where people are is said in
 * words in the presence list.
 */
export function LiveCursor({
  x,
  y,
  name,
  hue,
  kind = 'human',
  idleAfterMs = LIVE_CURSOR_REST_MS,
  hideAfterMs = LIVE_CURSOR_HIDE_MS,
  interpolate = true,
  className,
}: LiveCursorProps) {
  const [phase, setPhase] = useState<Phase>('live');

  useEffect(() => {
    setPhase('live');
    const rest = setTimeout(() => setPhase('resting'), idleAfterMs);
    const hide = setTimeout(() => setPhase('gone'), hideAfterMs);
    return () => {
      clearTimeout(rest);
      clearTimeout(hide);
    };
  }, [x, y, idleAfterMs, hideAfterMs]);

  return (
    <span
      aria-hidden="true"
      data-phase={phase}
      className={cx(
        'crewlet-live-cursor',
        presenceHueClass(hue),
        interpolate && 'crewlet-live-cursor--glide',
        phase !== 'live' && `crewlet-live-cursor--${phase}`,
        className,
      )}
      style={{ transform: `translate(${x}px, ${y}px)` } as CSSProperties}
    >
      <MousePointer2Glyph size="lg" filled className="crewlet-live-cursor__pointer" />
      <CursorFlag name={name} hue={hue} kind={kind} placement="inline" className="crewlet-live-cursor__flag" />
    </span>
  );
}
