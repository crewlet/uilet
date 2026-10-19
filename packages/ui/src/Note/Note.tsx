import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import type { SurfaceTone } from '../ArrangeGroup/index.js';

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  /** The paper it is written on: one of the six hues, or the page's own. */
  tone?: SurfaceTone | undefined;
  align?: 'start' | 'center' | undefined;
  /** `lg` for a line meant to be read across the room: a goal, a rule. */
  size?: 'md' | 'lg' | undefined;
  /**
   * The note's name, set over its words at a card title's step: "How to read
   * this board". The note is then a region named by it.
   */
  heading?: ReactNode;
  /** The heading's level. Default 3, under a board's own heading. */
  headingLevel?: 2 | 3 | 4 | undefined;
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
 * A HEADING NAMES IT, at the step a card's title is set on, so a note on a
 * board reads as one of its cards rather than as a label over loose prose.
 *
 * IT SCROLLS rather than clipping when the reader makes it shorter than its
 * words.
 */
export const Note = forwardRef<HTMLDivElement, NoteProps>(function Note(
  { tone = 'amber', align = 'start', size = 'md', heading, headingLevel = 3, className, children, ...rest },
  ref,
) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const named = heading !== undefined && heading !== null && heading !== false;
  return (
    <div
      ref={ref}
      {...(named ? { role: 'region', 'aria-labelledby': headingId } : {})}
      className={cx(
        'crewlet-note',
        `crewlet-note--${tone}`,
        align === 'center' && 'crewlet-note--center',
        size === 'lg' && 'crewlet-note--lg',
        className,
      )}
      {...rest}
    >
      {named ? (
        <Heading id={headingId} className="crewlet-note__heading">
          {heading}
        </Heading>
      ) : null}
      {children}
    </div>
  );
});
