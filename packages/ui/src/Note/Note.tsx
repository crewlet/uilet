import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import type { SurfaceTone } from '../ArrangeGroup/index.js';

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  /** The paper it is written on: one of the six hues, or the page's own. */
  tone?: SurfaceTone | undefined;
  align?: 'start' | 'center' | undefined;
  /** `lg` for a line meant to be read across the room: a goal, a rule. */
  size?: 'md' | 'lg' | undefined;
  children: ReactNode;
}

/**
 * Words a reader leaves on their own page: a team's goal this week, how to
 * read the cards below it, a link to the runbook. A dashboard's note.
 *
 * THE TONE IS THE PAPER, and the ink keeps its contrast on every one: each
 * hue's fill with that hue's ink, which the palette gate measures as a pair.
 * A note is never coloured to mean a state; the hues here are the reader's
 * labels, the same six a group's band takes.
 *
 * IT SCROLLS rather than clipping when the reader makes it shorter than its
 * words.
 */
export const Note = forwardRef<HTMLDivElement, NoteProps>(function Note(
  { tone = 'amber', align = 'start', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'crewlet-note',
        `crewlet-note--${tone}`,
        align === 'center' && 'crewlet-note--center',
        size === 'lg' && 'crewlet-note--lg',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
