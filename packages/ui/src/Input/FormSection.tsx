import { useId, type HTMLAttributes, type ReactNode } from 'react';
import {
  HeadingLevelProvider,
  headingTag,
  nextHeadingLevel,
  useHeadingLevel,
} from '../utils/headingLevel.js';
import { cx } from '../utils/cx.js';

export interface FormSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The section's heading. It names the section, so it is never left out. */
  title: ReactNode;
  /** One line under the heading saying what the fields below are for. */
  hint?: ReactNode;
  /** Controls rendered on the heading row, such as an Add button. */
  actions?: ReactNode;
  /** Draws the rule above the heading, which is the rhythm a long form keeps. */
  divided?: boolean;
  children?: ReactNode;
}

/**
 * A titled group of fields, named by its own heading.
 *
 * THE HEADING LEVEL IS NOT A PROP, and that is the whole of it. The same
 * section is an `h3` on a page under a screen title and an `h2` inside a
 * dialog, whose title is the top of everything beneath it. Hard-coded, it is
 * right in one of those places and wrong in the other, and a reader
 * navigating by heading meets an outline with a level missing. The level
 * comes from the surface around it (a Modal or a sheet provides one) and
 * steps down for anything nested inside, clamped at `h6`.
 *
 * It is a `section` rather than a `div` because it is named: a named region
 * is one a screen reader can jump to and announce, which is the difference
 * between "Schedule" as a picture and "Schedule" as a place.
 */
export function FormSection({
  title,
  hint,
  actions,
  divided = false,
  className = '',
  children,
  ...rest
}: FormSectionProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const level = useHeadingLevel();
  const Heading = headingTag(level);

  return (
    <section
      {...rest}
      aria-labelledby={headingId}
      className={cx('crewlet-form-section', divided && 'crewlet-form-section--divided', className)}
    >
      <div className="crewlet-form-section__header">
        <div className="crewlet-form-section__titles">
          <Heading id={headingId} className="crewlet-form-section__title">
            {title}
          </Heading>
          {hint ? <p className="crewlet-form-section__hint">{hint}</p> : null}
        </div>
        {actions ? <div className="crewlet-form-section__actions">{actions}</div> : null}
      </div>
      <div className="crewlet-form-section__body">
        <HeadingLevelProvider level={nextHeadingLevel(level)}>{children}</HeadingLevelProvider>
      </div>
    </section>
  );
}
