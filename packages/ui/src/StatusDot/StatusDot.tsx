import type { ReactNode } from 'react';
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
  /**
   * The word the dot belongs to: "Reviewing !231". Given one, the dot and the
   * word are drawn as one line, `.crewlet-status`, with the room between them
   * the kit decides rather than the caller (see the stylesheet), and
   * `className` goes on that line. The word is read; the dot still is not.
   */
  children?: ReactNode;
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
export function StatusDot({ tone = 'neutral', pulse = false, children, className }: StatusDotProps) {
  const worded = children !== undefined && children !== null && children !== false && children !== '';
  const dot = (
    <span
      aria-hidden
      className={cx('crewlet-status-dot', `crewlet-status-dot--${tone}`, pulse && 'is-pulsing', !worded && className)}
    />
  );
  if (!worded) return dot;
  /*
   * THE GAP IS THE KIT'S, because the halo is. A pulsing dot breathes out 5px
   * past its own edge without moving anything, so a caller who set the dot
   * beside its word at the 4px an ordinary mark takes had the halo breathe
   * over the first letter at every peak. The space is REAL for the reason a
   * rail row's is: the line is a flex row, which draws no text node of
   * whitespace alone, and a reader that joins inline text is not handed the
   * dot's neighbour run into nothing.
   */
  return (
    <span className={cx('crewlet-status', className)}>
      {dot}{' '}
      <span className="crewlet-status__label">{children}</span>
    </span>
  );
}
