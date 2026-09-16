import { cx } from '../utils/cx.js';
import type { PhaseTone, Tone } from '../utils/tone.js';

export interface StatusDotProps {
  /** Which state, or which phase. Neutral says "nothing in particular". */
  tone?: Tone | PhaseTone | undefined;
  /**
   * A slow pulse, for a state that is still happening. Held still under a
   * reduced-motion preference, where the mark still reads as its tone.
   */
  pulse?: boolean | undefined;
  className?: string | undefined;
}

/**
 * The shape half of a status.
 *
 * COLOUR IS NEVER THE ONLY CARRIER. Every dot sits beside its own word, and
 * the dot is `aria-hidden` for exactly that reason: a screen reader that read
 * both would say the state twice, and one that read only the dot would say
 * nothing at all. If a dot has no word beside it, the dot is the wrong
 * component and a Tag is the right one.
 *
 * Its fill is the tone's own fill step, which clears 3:1 against every surface
 * it can sit on, because a mark is read the way a glyph is rather than the way
 * text is.
 */
export function StatusDot({ tone = 'neutral', pulse = false, className }: StatusDotProps) {
  return (
    <span
      aria-hidden
      className={cx('crewlet-status-dot', `crewlet-status-dot--${tone}`, pulse && 'is-pulsing', className)}
    />
  );
}
