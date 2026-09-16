import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What this screen is. */
  title: ReactNode;
  /**
   * The heading element to draw. It follows the surrounding heading level by
   * default, which is 2 on a page whose shell already spends the `h1` on the
   * screen's name, and 3 inside a dialog that has taken 2 for its own title.
   */
  headingLevel?: HeadingLevel | undefined;
  /** One sentence saying what the screen answers. It sits on the measure. */
  description?: ReactNode;
  /** Status beside the title: a tag, a count, a live dot. */
  badges?: ReactNode;
  /** What a reader can do here. They wrap under the title when there is no room. */
  actions?: ReactNode;
  /** Names the heading, for a region that points at it with aria-labelledby. */
  titleId?: string | undefined;
}

/**
 * The standard head of a screen: what it is, what it answers, and what can be
 * done here.
 *
 * WHY IT IS A COMPONENT. Twenty screens spelled this out of a div, a flex row
 * and two inline styles each, and they had drifted: three gaps, two title
 * sizes, and a badge row that wrapped on some screens and pushed the actions
 * off the side on others. One header is also the only way the heading LEVEL
 * can be right, which is what a reader navigating by heading uses to move
 * around a page at all.
 *
 * The actions are a sibling of the title rather than part of it, so a heading
 * a screen reader reads is the screen's name and not the name plus three verbs.
 */
export function PageHeader({
  title,
  headingLevel,
  description,
  badges,
  actions,
  titleId,
  className,
  children,
  ...rest
}: PageHeaderProps) {
  const level = useHeadingLevel();
  const heading = createElement(
    headingTag(headingLevel ?? level),
    { className: 'crewlet-page-header__title', id: titleId },
    title,
  );
  return (
    <header {...rest} className={cx('crewlet-page-header', className)}>
      <div className="crewlet-page-header__lead">
        <div className="crewlet-page-header__titles">
          {heading}
          {badges ? <div className="crewlet-page-header__badges">{badges}</div> : null}
        </div>
        {description ? <p className="crewlet-page-header__description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="crewlet-page-header__actions">{actions}</div> : null}
    </header>
  );
}
