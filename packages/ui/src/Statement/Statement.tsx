import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';
import { EmptyState } from '../EmptyState/index.js';

/** What a statement says while nobody has written it, with the way to write it. */
export interface StatementEmpty {
  /** "No mission yet". */
  title: ReactNode;
  /** What the statement is for, so the reader knows why to write it. */
  description: ReactNode;
  /** The one control that writes it: "Add a mission". */
  action?: ReactNode;
}

export interface StatementProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** What the statement is: "Mission", "Vision". Its heading. */
  label: ReactNode;
  /**
   * The statement itself. TEXT is set as the statement, a step over the body
   * at the reading measure with its author's line breaks kept; a BLOCK (a
   * numbered list of policies, a card) is drawn as given under the same
   * label, so every statement on a page heads the same way. Absent, null or
   * an empty string is a statement nobody has written, and `empty` is said in
   * its place.
   */
  children?: ReactNode;
  /**
   * REQUIRED: an unwritten statement is said as one, never drawn as a grey
   * value standing where the statement would.
   */
  empty: StatementEmpty;
  /** The heading's level. Taken from where the statement sits by default. */
  headingLevel?: HeadingLevel | undefined;
}

/**
 * One statement a company or a team makes about itself: its mission, its
 * vision, a goal. A label over the words, set larger than the body at a
 * reading measure, because these are the sentences a page exists to say.
 *
 * NOT A KEY AND A VALUE. In a description list a mission weighs what a time
 * zone weighs; a statement is read, not looked up. And an unwritten one is an
 * inline empty state with its own way to write it, rather than placeholder
 * text in the value's place that reads as if somebody wrote it.
 *
 * A REGION NAMED BY ITS LABEL, so a reader moving by landmark or heading
 * hears "Mission" and then the mission.
 */
export function Statement({ label, children, empty, headingLevel, className, ...rest }: StatementProps) {
  const contextLevel = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? contextLevel);
  const id = useId();
  const written = !(children === undefined || children === null || children === '' || children === false);
  return (
    <section
      aria-labelledby={id}
      {...rest}
      className={cx('crewlet-statement', !written && 'crewlet-statement--empty', className)}
    >
      <Heading id={id} className="crewlet-statement__label">
        {label}
      </Heading>
      {written ? (
        typeof children === 'string' || typeof children === 'number' ? (
          <div className="crewlet-statement__text">{children}</div>
        ) : (
          <div className="crewlet-statement__body">{children}</div>
        )
      ) : (
        <EmptyState
          size="inline"
          headingLevel="none"
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      )}
    </section>
  );
}
