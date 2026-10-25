import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { CircleAlertGlyph } from '@crewlethq/icons/glyphs';
import { IconTile } from '../IconTile/index.js';
import { Tag } from '../Tag/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel } from '../utils/headingLevel.js';

/** The tones a part's state is said in: done, leaning on defaults, needing a look, or holding the finish. */
export type ReviewListTone = 'success' | 'neutral' | 'warning' | 'danger';

/** A part's state, as its pill says it: "Complete", "Uses defaults", "Missing required". */
export interface ReviewListStatus {
  label: string;
  tone: ReviewListTone;
}

export interface ReviewListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  /** What the list reviews, for assistive technology: "Brand summary". */
  label: string;
  /** The parts: `ReviewList.Item` elements, in the order the setup walks them. */
  children?: ReactNode;
}

export interface ReviewListItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title' | 'children'> {
  /** The part's glyph, drawn on a tile at the start of its row. Decorative: the title names the part. */
  icon?: ReactNode;
  /** The part's name, as a heading one level under where the list sits: "Logos". */
  title: ReactNode;
  /** The part's state, as a pill beside its title. */
  status?: ReviewListStatus | undefined;
  /** What changes the part, at the end of its row: an Edit button that names the part. */
  action?: ReactNode;
  /**
   * What keeps the part from being finished, in one sentence, said under its
   * values in the danger ink: "Add the primary logo to adopt." It is an alert,
   * so it is read as it appears; show it once a finish was tried, not before.
   */
  error?: ReactNode;
  /** The part's values, SHOWN rather than described: the logos, the swatches, the faces. */
  children?: ReactNode;
}

/**
 * A review of a setup's parts before it is finished: one row a part, each with
 * its glyph, its name, its state and the way back to it, over the values it
 * holds.
 *
 * ONE BOX, ONE ROW A PART. The parts share one bordered box with a hairline
 * between them, so five parts read as one summary and every row starts its
 * title, its state and its values on the same lines, whatever each holds. A
 * card a part, laid out in a grid, gave every card the height of its own
 * values: a tall row of logos beside a one-line name left holes in the grid
 * and a summary that read as five scattered objects.
 *
 * THE VALUES UNDER THE TITLE, at the title's start, so the row's glyph stands
 * alone in its column and the eye runs down the titles. Under 28rem of the
 * list's own width the values take the whole row, as a phone needs.
 *
 * A HEADING A PART, one level under where the list sits, so a screen reader
 * moves part to part by heading; the state and the action follow the heading
 * in reading order, and the error closes the row it is about.
 */
export function ReviewList({ label, className, children, ...rest }: ReviewListProps) {
  return (
    <ul {...rest} aria-label={label} className={cx('crewlet-review-list', className)}>
      {children}
    </ul>
  );
}

function ReviewListItem({ icon, title, status, action, error, className, children, ...rest }: ReviewListItemProps) {
  const level = useHeadingLevel();
  return (
    <li
      {...rest}
      className={cx('crewlet-review-list__item', !icon && 'crewlet-review-list__item--plain', Boolean(error) && 'is-error', className)}
    >
      {icon ? (
        <IconTile size="sm" className="crewlet-review-list__icon">
          {icon}
        </IconTile>
      ) : null}
      <div className="crewlet-review-list__head">
        {createElement(headingTag(level), { className: 'crewlet-review-list__title' }, title)}
        {status ? (
          <Tag size="sm" variant={status.tone}>
            {status.label}
          </Tag>
        ) : null}
      </div>
      {action ? <div className="crewlet-review-list__action">{action}</div> : null}
      {children !== undefined && children !== null && children !== false ? (
        <div className="crewlet-review-list__body">{children}</div>
      ) : null}
      {error ? (
        <p className="crewlet-review-list__error" role="alert">
          <CircleAlertGlyph size="sm" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </li>
  );
}

ReviewList.Item = ReviewListItem;
