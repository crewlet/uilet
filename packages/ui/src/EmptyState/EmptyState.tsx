import type { HTMLAttributes, ReactNode } from 'react';
import { InboxGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';

export type EmptyStateSize = 'default' | 'compact';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** A glyph, drawn large and quiet. Replaced by `illustration` when both are given. */
  icon?: ReactNode;
  /** A full drawing, where a glyph is too small to carry the moment: a first run. */
  illustration?: ReactNode;
  title: ReactNode;
  /**
   * WHY it is empty and what would fill it. REQUIRED, and not optional
   * politeness: "No events" on a company that has never run and "no events"
   * on a node whose event store could not be read are the same sentence and
   * completely different problems, and a reader cannot tell them apart from
   * the list. The story shows the three cases this distinguishes.
   */
  description: ReactNode;
  /** What would fill it, as a control: "Create the first seat", "Connect Slack". */
  action?: ReactNode;
  /** `compact` is for an empty state inside a panel rather than a screen. */
  size?: EmptyStateSize | undefined;
  /**
   * The heading level of the title. Taken from where the component finds
   * itself by default; `none` renders no heading at all, for an empty state
   * inside a section whose own heading already names it.
   */
  headingLevel?: HeadingLevel | 'none' | undefined;
}

/**
 * Nothing here, said honestly.
 *
 * AN EMPTY STATE IS A SENTENCE, NOT A SHRUG. The three states it has to keep
 * apart are "nothing has happened yet", "nothing could be read" and "this is
 * not configured": the first is fine, the second is a fault somebody has to
 * look at, and the third is a thing they can go and do. Rendered as the same
 * grey "No data", they are indistinguishable, and the fault is the one that
 * gets missed.
 */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  size = 'default',
  headingLevel,
  className,
  ...rest
}: EmptyStateProps) {
  const contextLevel = useHeadingLevel();
  const level = headingLevel ?? contextLevel;
  const Heading = level === 'none' ? 'div' : headingTag(level);

  return (
    <div {...rest} className={cx('crewlet-empty-state', `crewlet-empty-state--${size}`, className)}>
      <span className="crewlet-empty-state__mark" aria-hidden>
        {illustration ?? icon ?? <InboxGlyph size={size === 'compact' ? 'xl' : 32} />}
      </span>
      <Heading className="crewlet-empty-state__title">{title}</Heading>
      <p className="crewlet-empty-state__description">{description}</p>
      {action ? <div className="crewlet-empty-state__action">{action}</div> : null}
    </div>
  );
}
