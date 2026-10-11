import {
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';
import { headingTag, useHeadingLevel, type HeadingLevel } from '../utils/headingLevel.js';
import { Eyebrow } from '../Eyebrow/index.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface InboxListProps extends HTMLAttributes<HTMLElement> {
  /** Names the list as a landmark: "Inbox". */
  label: string;
}

/**
 * The column of an inbox: what reached a person, grouped, one row each, read
 * in full in a pane beside it.
 *
 * A NAVIGATION, NOT A TABLE. Every row opens something, and a reader moves
 * between them to read one at a time. It promises no columns, so it draws
 * none, and its rows are as tall as their words rather than one fixed height.
 */
export function InboxList({ label, className, children, ...rest }: InboxListProps) {
  return (
    <nav {...rest} aria-label={label} className={cx('crewlet-inbox-list', className)}>
      {children}
    </nav>
  );
}

export interface InboxGroupProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The group's name: "Needs you", "Updates". */
  label: ReactNode;
  /**
   * Names the group for a screen reader only. For rows a control above them
   * already introduces, such as the snoozed ones under their own toggle.
   */
  hideLabel?: boolean | undefined;
  /** Overrides the level the label is rendered at. */
  headingLevel?: HeadingLevel | undefined;
}

/**
 * A labelled run of rows. The label is a heading set in the micro-label
 * register, so a reader navigating by heading lands on each group and a
 * reader scanning sees where one ends.
 */
export function InboxGroup({ label, hideLabel = false, headingLevel, className, children, ...rest }: InboxGroupProps) {
  const level = useHeadingLevel();
  const Heading = headingTag(headingLevel ?? level);
  const labelId = useId();
  return (
    <section {...rest} aria-labelledby={labelId} className={cx('crewlet-inbox-list__group', className)}>
      {hideLabel ? (
        <VisuallyHidden as={Heading} id={labelId}>
          {label}
        </VisuallyHidden>
      ) : (
        <Heading id={labelId} className="crewlet-inbox-list__label">
          <Eyebrow>{label}</Eyebrow>
        </Heading>
      )}
      <ul className="crewlet-inbox-list__rows">{children}</ul>
    </section>
  );
}

export type InboxRowTone = 'default' | 'danger';

export interface InboxRowProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick' | 'title'> {
  /** Who the row is from: a seat's or a person's name. */
  title: ReactNode;
  /** A word after the name where the row is not a plain question or update: "coding run", "stopped". */
  qualifier?: ReactNode;
  /** `danger` sets the qualifier in the danger ink, for a seat that has stopped. */
  qualifierTone?: InboxRowTone | undefined;
  /** At the end of the first line: when it arrived. */
  meta?: ReactNode;
  /** Before the words: an avatar, drawn at the target size. */
  leading?: ReactNode;
  /** What the row says, in up to three lines. */
  children?: ReactNode;
  /** Drawn after the words in the quiet ink, inside the same three lines: a comment's own text. */
  excerpt?: ReactNode;
  /**
   * Under the row and OUTSIDE its control, so it can be a control of its own:
   * the task the row is about, as a link.
   */
  aside?: ReactNode;
  /** This row is the one open beside the list. */
  selected?: boolean | undefined;
  /** Not read yet: the name is heavier, the words take the primary ink, and the state is read out. */
  unread?: boolean | undefined;
  /** Read after the row's words when `unread`. */
  unreadLabel?: string | undefined;
  /** It waits on the reader: the words take the primary ink. */
  actionable?: boolean | undefined;
  /** Settled: the words are struck through in the quiet ink, and the state is read out. */
  done?: boolean | undefined;
  /** Read after the row's words when `done`: "Answered", "Resolved". */
  doneLabel?: string | undefined;
  /** Opens the row as a link. */
  href?: string | undefined;
  /**
   * Opens the row as a button, or, beside `href`, takes the press first: a
   * router calls `preventDefault` on a plain click and lets a modified one
   * open the link in a tab.
   */
  onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
}

/**
 * One row: WHO, then WHAT in up to three lines, then the task it is about.
 *
 * THE ROW IS ONE CONTROL and the task is another. A link nested inside a
 * button is invalid and unreachable by keyboard, so the task sits under the
 * control, in the same item, and lines up with the words above it. The item
 * takes the hover and the selected fill as a whole, so the two read as one row.
 *
 * THE SELECTED FILL IS NEUTRAL. An inbox is read one row after another, and an
 * accent tint on the open row made the column read as a column of alerts; the
 * pressed fill says "here" without saying "look". The control carries
 * `aria-current`, so the row is announced as the open one where focus is.
 *
 * NOTHING IS CUT AT THE EDGE. The name ellipsizes, the time never wraps, and
 * the words take up to three lines before they stop, so a row says what it is
 * rather than its first few words.
 */
export function InboxRow({
  title,
  qualifier,
  qualifierTone = 'default',
  meta,
  leading,
  excerpt,
  aside,
  selected = false,
  unread = false,
  unreadLabel = 'Unread',
  actionable = false,
  done = false,
  doneLabel = 'Done',
  href,
  onClick,
  className,
  children,
  ...rest
}: InboxRowProps) {
  // Every part is set apart by a space, so the control is announced as
  // "Crewlet-PM coding run 2h Which ledger" rather than as one run-on word: an
  // accessible name is the concatenation of an element's parts with nothing
  // inserted between them.
  const contents = (
    <>
      {leading === undefined ? null : (
        <>
          <span className="crewlet-inbox-row__leading">{leading}</span>{' '}
        </>
      )}
      <span className="crewlet-inbox-row__main">
        <span className="crewlet-inbox-row__head">
          <span className="crewlet-inbox-row__title">{title}</span>
          {qualifier === undefined ? null : (
            <>
              {' '}
              <span className={cx('crewlet-inbox-row__qualifier', qualifierTone === 'danger' && 'crewlet-inbox-row__qualifier--danger')}>
                {qualifier}
              </span>
            </>
          )}
          {meta === undefined ? null : (
            <>
              {' '}
              <span className="crewlet-inbox-row__meta">{meta}</span>
            </>
          )}
        </span>{' '}
        <span className="crewlet-inbox-row__text">
          {children}
          {excerpt === undefined ? null : (
            <>
              {' '}
              <span className="crewlet-inbox-row__excerpt">{excerpt}</span>
            </>
          )}
        </span>
        {unread ? (
          <>
            {' '}
            <VisuallyHidden>{unreadLabel}</VisuallyHidden>
          </>
        ) : null}
        {done ? (
          <>
            {' '}
            <VisuallyHidden>{doneLabel}</VisuallyHidden>
          </>
        ) : null}
      </span>
    </>
  );

  const controlClass = cx(
    'crewlet-inbox-row__control',
    unread && 'crewlet-inbox-row__control--unread',
    actionable && 'crewlet-inbox-row__control--actionable',
    done && 'crewlet-inbox-row__control--done',
  );
  const current = selected ? 'true' : undefined;

  const control =
    href !== undefined ? (
      <a className={controlClass} href={href} aria-current={current} onClick={onClick}>
        {contents}
      </a>
    ) : (
      <button type="button" className={controlClass} aria-current={current} onClick={onClick}>
        {contents}
      </button>
    );

  return (
    <li {...rest} className={cx('crewlet-inbox-row', selected && 'crewlet-inbox-row--selected', className)}>
      {control}
      {aside === undefined || aside === null || aside === false ? null : (
        <div className="crewlet-inbox-row__aside">{aside}</div>
      )}
    </li>
  );
}

export type InboxMoreProps = HTMLAttributes<HTMLDivElement>;

/**
 * The end of the list: the quiet toggles that open what is not in it by
 * default, the snoozed rows and the earlier ones. Two words at the bottom
 * rather than a filter bar at the top, because a reader opens them rarely
 * and a filter bar is read every time.
 */
export function InboxMore({ className, children, ...rest }: InboxMoreProps) {
  return (
    <div {...rest} className={cx('crewlet-inbox-list__more', className)}>
      {children}
    </div>
  );
}

export interface InboxToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Whether the rows it opens are shown. */
  expanded: boolean;
}

/**
 * One of those toggles: a word in the quiet ink that opens rows under it.
 * Its own `aria-expanded` says whether they are open, and the ink steps up to
 * the primary while they are.
 */
export function InboxToggle({ expanded, className, children, ...rest }: InboxToggleProps) {
  return (
    <button {...rest} type="button" aria-expanded={expanded} className={cx('crewlet-inbox-list__toggle', className)}>
      {children}
    </button>
  );
}

InboxList.Group = InboxGroup;
InboxList.Row = InboxRow;
InboxList.More = InboxMore;
InboxList.Toggle = InboxToggle;
