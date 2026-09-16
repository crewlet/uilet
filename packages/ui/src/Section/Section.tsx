import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import {
  HeadingLevelProvider,
  headingTag,
  nextHeadingLevel,
  useHeadingLevel,
  type HeadingLevel,
} from '../utils/headingLevel.js';

export type SectionSpacing =
  /** No band padding at all, and no gap under the header either. */
  | 'none'
  /**
   * THE DEFAULT: a console band, no vertical padding and one gap between the
   * header and what it introduces. A screen is a stack of these, and a
   * marketing band between each pair of panels puts one panel per viewport.
   */
  | 'compact'
  /** A marketing band. State one: a page of them is a deliberate page. */
  | 'sm'
  | 'md'
  | 'lg';

export type SectionElement = 'section' | 'div' | 'header' | 'footer' | 'article';

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: SectionElement | undefined;
  /** Vertical rhythm. Defaults to `compact`, the console band. */
  spacing?: SectionSpacing | undefined;
  /**
   * The section's heading. With one, the element is named by it and everything
   * inside is a heading level deeper.
   */
  title?: ReactNode;
  /** Overrides the level the heading is rendered at. */
  headingLevel?: HeadingLevel | undefined;
  /** A sentence beside the title saying what the section is for. */
  description?: ReactNode;
  /** The section's own controls, at the end of the heading row. */
  actions?: ReactNode;
}

/**
 * A band with its own rhythm, and optionally its own heading.
 *
 * WHY THE HEADER BELONGS HERE. A screen is a stack of named sections, and each
 * one used to be hand-built out of a row, a type utility and a spacer. Built
 * by hand, the heading level was whatever the author typed, so a document
 * outline had levels missing; here the level comes from where the section
 * actually sits, and its contents are one level deeper without anybody
 * counting.
 */
export const Section = ({
  as: As = 'section',
  /*
   * THE CONSOLE BAND IS THE DEFAULT, because a band is a marketing decision
   * and a screen of panels is the common one. At the md band every section on
   * the engine dashboard spent 80px above and 80px below itself, so a screen
   * of three named sections carried 480px of nothing and put roughly one panel
   * in a viewport. A page that wants the band states it.
   */
  spacing = 'compact',
  title,
  headingLevel,
  description,
  actions,
  className,
  children,
  ...rest
}: SectionProps) => {
  const level = useHeadingLevel();
  const resolved = headingLevel ?? level;
  const Heading = headingTag(resolved);
  const titleId = useId();
  const titled = title !== undefined;

  return (
    <As
      {...rest}
      className={cx('crewlet-section', `crewlet-section--${spacing}`, titled && 'crewlet-section--titled', className)}
      aria-labelledby={titled ? (rest['aria-labelledby'] ?? titleId) : rest['aria-labelledby']}
    >
      {titled ? (
        <div className="crewlet-section__header">
          <Heading id={titleId} className="crewlet-section__title">
            {title}
          </Heading>
          {description === undefined ? null : (
            <p className="crewlet-section__description">{description}</p>
          )}
          {actions === undefined ? null : <div className="crewlet-section__actions">{actions}</div>}
        </div>
      ) : null}
      {titled ? (
        <HeadingLevelProvider level={nextHeadingLevel(resolved)}>{children}</HeadingLevelProvider>
      ) : (
        children
      )}
    </As>
  );
};
