import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

export interface StatusDotProps {
  /**
   * Which state. Neutral says "nothing in particular", and it is also the dot
   * beside a category's word, such as a phase's: a category has no hue.
   */
  tone?: Tone | undefined;
  /**
   * A halo that breathes out round the dot and back, in the tone's soft step,
   * for a state that is still happening: the approved design pulses the
   * `info` dot, which is working. One round is `--motion-duration-breath`. The
   * dot itself never fades, and the halo never touches it: it is cast from a
   * ring 2px out, so the dot always stands on the surface its fill clears 3:1
   * against. Held still under a reduced-motion preference, where the dot rests
   * at its fill with no halo and the word beside it still says the work is
   * under way. The ring is drawn on the dot's `::after`, and a `position` of
   * your own on the dot still wins over the one the ring needs.
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
