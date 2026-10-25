import { Children, isValidElement, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface SuggestionRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect' | 'children'> {
  /** The intent's glyph, at 14px in the tertiary ink: `coins` for spend, `pause` for pausing an agent. */
  icon: ReactNode;
  /** The question or the start of a request: "What are my agents doing now?", "Pause an agent…". */
  children: ReactNode;
  /** One fact under the words: "Agent CTO on ENG-133, Agent PM on PM-37". */
  detail?: ReactNode;
  /** A count at the row's end, as a `Tag`: how many are waiting. */
  count?: ReactNode;
  /** Draws a chevron at the row's end, for a row that opens something (a list of what is waiting). */
  chevron?: boolean | undefined;
  /**
   * The row starts a request rather than asking a question: it fills the
   * message box with its words for the person to finish, and sends nothing.
   * Said to assistive technology after its words (`fillsLabel`), since the
   * ellipsis that shows it is easy to miss.
   */
  fills?: boolean | undefined;
  /** Said after a filling row's words. ", fills the message box" by default. */
  fillsLabel?: string | undefined;
  onSelect: () => void;
}

/**
 * A suggested question or request, as a row: the intent's glyph, the words,
 * an optional fact under them, and an optional count and chevron at the end.
 *
 * A ROW, NOT A CHIP. It is the list row's grammar (the medium row height, a
 * spacing step by a step and a half, the inset focus ring), so a column of
 * suggestions reads as a list a person scans, and the same row stands plain
 * on a page or divided inside a card (`SuggestionList divided`).
 */
export function SuggestionRow({
  icon,
  children,
  detail,
  count,
  chevron = false,
  fills = false,
  fillsLabel = ', fills the message box',
  onSelect,
  className,
  type = 'button',
  ...rest
}: SuggestionRowProps) {
  const trailing = (count !== undefined && count !== null) || chevron;
  return (
    <button {...rest} type={type} className={cx('crewlet-suggestion-row', className)} onClick={onSelect}>
      <span className="crewlet-suggestion-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="crewlet-suggestion-row__words">
        <span className="crewlet-suggestion-row__text">
          {children}
          {fills ? <VisuallyHidden>{fillsLabel}</VisuallyHidden> : null}
        </span>
        {detail === undefined || detail === null ? null : <span className="crewlet-suggestion-row__detail">{detail}</span>}
      </span>
      {trailing ? (
        <span className="crewlet-suggestion-row__trail">
          {count}
          {chevron ? <ChevronRightGlyph size="sm" aria-hidden="true" /> : null}
        </span>
      ) : null}
    </button>
  );
}

export interface SuggestionListProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * Draws the rows inside a card, divided by hairlines, for the block that
   * leads (what needs the person); plain rows have no box, for the block that
   * is optional. One hairline for the urgent block, none for the rest.
   */
  divided?: boolean | undefined;
  /** The `SuggestionRow`s. Each is put in its own list item. */
  children: ReactNode;
}

/** A column of suggestions: a list, each row in its own item, plain or divided in a card. */
export function SuggestionList({ divided = false, className, children, ...rest }: SuggestionListProps) {
  return (
    // The role is restated for WebKit, which drops it from a list with no markers.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul {...rest} role="list" className={cx('crewlet-suggestion-list', divided && 'crewlet-suggestion-list--divided', className)}>
      {Children.toArray(children)
        .filter(isValidElement)
        .map((child) => (
          <li key={child.key ?? undefined} className="crewlet-suggestion-list__item">
            {child}
          </li>
        ))}
    </ul>
  );
}
