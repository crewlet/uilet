import { createContext, useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import {
  HeadingLevelProvider,
  headingTag,
  nextHeadingLevel,
  useHeadingLevel,
  type HeadingLevel,
} from '../utils/headingLevel.js';
import { Eyebrow } from '../Eyebrow/index.js';

interface ReadingPaneContextValue {
  /** The id the title takes, so the article is named by it. */
  titleId: string;
  /** The level the title is drawn at; a section inside is a level deeper. */
  level: HeadingLevel;
}

const ReadingPaneContext = createContext<ReadingPaneContextValue | null>(null);

function usePane(part: string): ReadingPaneContextValue {
  const pane = useContext(ReadingPaneContext);
  if (pane === null) throw new Error(`${part} must be drawn inside a ReadingPane.`);
  return pane;
}

export interface ReadingPaneProps extends HTMLAttributes<HTMLElement> {
  /** Overrides the level the title is rendered at. */
  headingLevel?: HeadingLevel | undefined;
}

/**
 * One item read in full, top to bottom, in one column: the line saying who is
 * asking and about what, the question in large type, its context, the
 * reasoning behind a recommendation, the answer, and the conversation.
 *
 * ONE COLUMN AND NOTHING TO OPEN. Every detail an item has is part of its
 * reading, in the order a reader needs it, so nothing hides behind a toggle
 * and nothing is said twice. The column is bounded to a reading measure and
 * centred in whatever pane holds it, and it narrows its margins when the pane
 * itself is narrow, measured on the pane rather than the window, because a
 * pane beside a list is narrow on a wide screen too.
 *
 * The article is named by its title, so a reader moving by landmark hears the
 * question rather than "article".
 */
export function ReadingPane({ headingLevel, className, children, ...rest }: ReadingPaneProps) {
  const titleId = useId();
  const outer = useHeadingLevel();
  const level = headingLevel ?? outer;
  const named = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
  return (
    <div className="crewlet-reading-pane">
      <article
        {...rest}
        aria-labelledby={named ? rest['aria-labelledby'] : titleId}
        className={cx('crewlet-reading-pane__column', className)}
      >
        <ReadingPaneContext.Provider value={{ titleId, level }}>
          <HeadingLevelProvider level={nextHeadingLevel(level)}>{children}</HeadingLevelProvider>
        </ReadingPaneContext.Provider>
      </article>
    </div>
  );
}

export interface ReadingPaneBylineProps extends HTMLAttributes<HTMLParagraphElement> {
  /** A control at the start of the line: Back to the list, on a phone. */
  start?: ReactNode;
  /** Before the sentence: an avatar. */
  leading?: ReactNode;
  /**
   * After the sentence, in the quiet ink: why it reached the reader, where the
   * sentence does not already say so ("you follow this task").
   */
  note?: ReactNode;
}

/**
 * The one sentence over the item: who, what is asked of the reader, and the
 * task. Set the name in `strong` and the task as a quiet link. The time is
 * not repeated here, because the row in the list already carries it.
 */
export function ReadingPaneByline({ start, leading, note, className, children, ...rest }: ReadingPaneBylineProps) {
  return (
    <p {...rest} className={cx('crewlet-reading-pane__byline', className)}>
      {start === undefined ? null : <span className="crewlet-reading-pane__start">{start}</span>}
      {leading === undefined ? null : <span className="crewlet-reading-pane__leading">{leading}</span>}
      <span className="crewlet-reading-pane__by">
        {children}
        {note === undefined || note === null || note === false ? null : (
          <>
            {' '}
            <span className="crewlet-reading-pane__note">
              <span aria-hidden="true">· </span>
              {note}
            </span>
          </>
        )}
      </span>
    </p>
  );
}

export type ReadingPaneTitleProps = HTMLAttributes<HTMLHeadingElement>;

/** The question, the stop or what changed, in large type. It names the pane. */
export function ReadingPaneTitle({ className, children, ...rest }: ReadingPaneTitleProps) {
  const { titleId, level } = usePane('ReadingPane.Title');
  const Heading = headingTag(level);
  return (
    <Heading id={titleId} {...rest} className={cx('crewlet-reading-pane__title', className)}>
      {children}
    </Heading>
  );
}

export type ReadingPaneLeadProps = HTMLAttributes<HTMLDivElement>;

/**
 * What the title needs to be understood: the context of a question, what a
 * change adds to its own sentence. A block rather than a paragraph, so it can
 * hold rendered markdown of more than one paragraph.
 */
export function ReadingPaneLead({ className, children, ...rest }: ReadingPaneLeadProps) {
  return (
    <div {...rest} className={cx('crewlet-reading-pane__lead', className)}>
      {children}
    </div>
  );
}

export interface ReadingPaneQuoteProps extends HTMLAttributes<HTMLQuoteElement> {
  /**
   * Words a machine wrote, verbatim: a coding run's question. Set in the mono
   * face behind a rule, small, rather than as prose a person wrote.
   */
  verbatim?: boolean | undefined;
}

/** Somebody's own words, quoted whole: the comment a notice is about. */
export function ReadingPaneQuote({ verbatim = false, className, children, ...rest }: ReadingPaneQuoteProps) {
  return (
    <blockquote
      {...rest}
      className={cx('crewlet-reading-pane__quote', verbatim && 'crewlet-reading-pane__quote--verbatim', className)}
    >
      {children}
    </blockquote>
  );
}

export interface ReadingPaneReasoningProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Whose reasoning, and what it recommends: "Crewlet-PM recommends **Accept**". */
  title: ReactNode;
  /** Under the reasoning: the evidence it rests on. */
  footer?: ReactNode;
}

/**
 * Why the asker recommends what it does, on an inset ground so it reads as an
 * aside to the question rather than part of it, with the evidence it cites
 * underneath.
 */
export function ReadingPaneReasoning({ title, footer, className, children, ...rest }: ReadingPaneReasoningProps) {
  return (
    <div {...rest} className={cx('crewlet-reading-pane__reasoning', className)}>
      <p className="crewlet-reading-pane__reasoning-title">{title}</p>
      <div className="crewlet-reading-pane__reasoning-body">{children}</div>
      {footer === undefined || footer === null || footer === false ? null : (
        <div className="crewlet-reading-pane__reasoning-footer">{footer}</div>
      )}
    </div>
  );
}

export type ReadingPaneOutcomeProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * What the reader's action did, in place of the controls that did it:
 * "Answered **Accept**". A live region, so the line is announced when it
 * replaces the button that was just pressed.
 */
export function ReadingPaneOutcome({ className, children, ...rest }: ReadingPaneOutcomeProps) {
  return (
    <p role="status" {...rest} className={cx('crewlet-reading-pane__outcome', className)}>
      <CheckGlyph size="sm" className="crewlet-reading-pane__outcome-mark" />
      <span>{children}</span>
    </p>
  );
}

export interface ReadingPaneSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What is below it, said exactly: "Replies to this question". */
  label: ReactNode;
}

/**
 * A part of the reading after the answer, the conversation most of all, set
 * off by a hairline and named by a heading in the micro-label register.
 */
export function ReadingPaneSection({ label, className, children, ...rest }: ReadingPaneSectionProps) {
  const labelId = useId();
  const Heading = headingTag(useHeadingLevel());
  return (
    <section {...rest} aria-labelledby={labelId} className={cx('crewlet-reading-pane__section', className)}>
      <Heading id={labelId} className="crewlet-reading-pane__section-label">
        <Eyebrow>{label}</Eyebrow>
      </Heading>
      {children}
    </section>
  );
}

ReadingPane.Byline = ReadingPaneByline;
ReadingPane.Title = ReadingPaneTitle;
ReadingPane.Lead = ReadingPaneLead;
ReadingPane.Quote = ReadingPaneQuote;
ReadingPane.Reasoning = ReadingPaneReasoning;
ReadingPane.Outcome = ReadingPaneOutcome;
ReadingPane.Section = ReadingPaneSection;
