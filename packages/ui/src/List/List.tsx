import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  type CSSProperties,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { CircleAlertGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type ListVariant =
  /**
   * Rows with nothing between them. A set of chips, a stack of links in a
   * footer: a group where a hairline would draw a table nobody asked for.
   */
  | 'plain'
  /** A bullet per row: prose, not data. */
  | 'bulleted'
  /** A number per row: an order somebody follows. */
  | 'numbered'
  /**
   * A number per row in a column of its own, with a hairline between rows:
   * statements a reader counts and cites by number (a company's standing
   * policies), each of which may run to several lines. The numbers are the
   * list's own (an `ol`), drawn in tabular figures so a tenth row's number
   * stands where the first one's does.
   */
  | 'numbered-divided'
  /**
   * A hairline between rows: a feed, a set of results, a conversation. THE
   * DEFAULT, because it is the list every screen in the product draws: rows a
   * reader scans down want a boundary they can count.
   */
  | 'divided';

interface ListContextValue {
  variant: ListVariant;
  /** Whether the rows are laid out as columns, so an item knows to align. */
  templated: boolean;
}

const ListContext = createContext<ListContextValue>({ variant: 'divided', templated: false });

export interface ListProps extends HTMLAttributes<HTMLElement> {
  variant?: ListVariant | undefined;
  /**
   * A grid template for every row, so a feed's rows scan as COLUMNS rather
   * than as a ragged stack: `'auto 1fr auto'`. It is set on the list rather
   * than on each row for exactly that reason, a column only lines up if every
   * row measures itself against the same track list.
   */
  template?: string | undefined;
  /**
   * How much room a row takes. `comfortable` (the default) is the list as it
   * always was. `compact` sets the rows a small step apart in the body's size
   * at its normal leading, for a card that has to hold a long list on one
   * screen: eight standing policies of two lines each, on a page that also
   * shows the mission and the vision above them.
   */
  density?: 'comfortable' | 'compact' | undefined;
  /**
   * Holds each row's words to a reading measure while the row itself, and the
   * rule under it, still spans the list: `normal` is prose's (68ch), `wide`
   * is a list of statements read one at a time (80ch), a company's policies.
   * Unset, the words take the row's width, as a feed's do.
   */
  measure?: 'normal' | 'wide' | undefined;
}

/**
 * The non-tabular list: an activity feed, a set of search results, a
 * conversation, the goals on a seat.
 *
 * A LIST, NOT A TABLE. A table promises that every row carries the same fields
 * and that a reader may sort and compare them. A feed promises neither, and
 * rendering one as a table makes a screen reader announce a column count that
 * means nothing. What a feed does want is alignment, which `template` gives it
 * without the promise.
 */
export function List({
  variant = 'divided',
  template,
  density = 'comfortable',
  measure,
  className,
  style,
  children,
  ...rest
}: ListProps) {
  const Tag = variant === 'numbered' || variant === 'numbered-divided' ? 'ol' : 'ul';
  const templated = template !== undefined;
  return (
    <ListContext.Provider value={{ variant, templated }}>
      <Tag
        {...rest}
        className={cx(
          'crewlet-list',
          `crewlet-list--${variant}`,
          templated && 'crewlet-list--templated',
          density === 'compact' && 'crewlet-list--compact',
          measure && `crewlet-list--measure-${measure}`,
          className,
        )}
        style={templated ? ({ ...style, '--crewlet-list-template': template } as CSSProperties) : style}
      >
        {children}
      </Tag>
    </ListContext.Provider>
  );
}

export type ListItemTone = 'default' | 'danger';

export interface ListItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'onClick'> {
  /** Makes the whole row a link. */
  href?: string | undefined;
  /** Makes the whole row a button. Ignored when `href` is given. */
  onClick?: (() => void) | undefined;
  /** Drawn before the row's content: a glyph, an avatar, a status mark. */
  leading?: ReactNode;
  /** Drawn after it: a time, a count, a chevron. */
  trailing?: ReactNode;
  /**
   * A control of its own at the row's end (Join, a switch), drawn BESIDE the
   * row's link or button rather than inside it: a control inside another is
   * one a keyboard cannot reach and a screen reader announces as part of the
   * row's name. Not part of the row's hover or its name.
   */
  action?: ReactNode;
  /**
   * A line under the row, across its whole width: what pressing `action` came
   * to when that needs saying (a refusal, a next step). Not part of the row's
   * name either.
   */
  note?: ReactNode;
  tone?: ListItemTone | undefined;
  /** Read in place of the danger rail, so colour is never the only signal. */
  dangerLabel?: string | undefined;
  /** This row is the one the reader is on. */
  selected?: boolean | undefined;
  /**
   * Render the single child element as the row's control, for a router's own
   * Link. The row's content then comes from that element's children.
   */
  asChild?: boolean | undefined;
}

/**
 * One row.
 *
 * A ROW THAT DOES SOMETHING IS A CONTROL, never a `div` with a click handler:
 * `href` draws a real anchor and `onClick` a real button, so both are reached
 * by Tab, activated by Enter, and announced as what they are. The row's own
 * hover and focus ring belong to that control rather than to the `li` around
 * it, which is what stops a keyboard reader seeing a ring around a row they
 * cannot activate.
 */
export function ListItem({
  href,
  onClick,
  leading,
  trailing,
  action,
  note,
  tone = 'default',
  dangerLabel = 'Failed',
  selected = false,
  asChild = false,
  className,
  children,
  ...rest
}: ListItemProps) {
  const { templated } = useContext(ListContext);
  const interactive = href !== undefined || onClick !== undefined || asChild;

  const mark =
    tone === 'danger' ? (
      <>
        <CircleAlertGlyph className="crewlet-list__danger-mark" size="sm" />
        <VisuallyHidden>{dangerLabel}</VisuallyHidden>
        {/*
          A TEXT NODE BESIDE the sentence, as `Link` draws one. An accessible
          name is the concatenation of an element's parts with nothing put
          between them, so an interactive row was announced as
          "Failedpublish_event"; whitespace inside the span is trimmed off
          it, and whether a browser inserts a space of its own depends on how
          the row happens to be laid out.
        */}
        {' '}
      </>
    ) : null;

  // Spelled once and given whatever the row's own words turn out to be: with
  // asChild they come from the cloned element rather than from `children`.
  const contents = (words: ReactNode) => (
    <>
      {/*
        IN A TEMPLATED ROW THE MARK LEADS THE WORDS, inside their own cell.
        As a child of the row it took a track of the list's template, which
        pushed every slot after it one column on: the leading into the words'
        track, the words into the time's, and the time onto a line of its own.
      */}
      {templated ? null : mark}
      {/*
        The same separator around the slots. Both sit INSIDE the row's control,
        so both are part of its name, and a row showing a time beside an id was
        announced as "Turn t-14m ago".
      */}
      {leading === undefined ? null : (
        <>
          <span className="crewlet-list__leading">{leading}</span>{' '}
        </>
      )}
      <span className="crewlet-list__content">
        {templated ? mark : null}
        {words}
      </span>
      {trailing === undefined ? null : (
        <>
          {' '}
          <span className="crewlet-list__trailing">{trailing}</span>
        </>
      )}
    </>
  );

  const rowClass = cx(
    'crewlet-list__row',
    templated && 'crewlet-list__row--templated',
    interactive && 'crewlet-list__row--interactive',
  );

  /*
   * ON THE CONTROL where there is one, and on the `li` otherwise. It is a
   * global attribute, so both are valid, but a reader moving through a list of
   * links hears only what each link carries: put on the row around it, "the
   * one you are on" is announced to nobody using the navigation the row was
   * made a link for.
   */
  const current = selected ? 'true' : undefined;

  let row: ReactNode;
  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error('ListItem with asChild expects exactly one valid React element child.');
    }
    const childEl = child as ReactElement<Record<string, unknown>>;
    row = cloneElement(
      childEl,
      {
        className: cx(childEl.props['className'] as string | undefined, rowClass),
        'aria-current': current,
      },
      contents(childEl.props['children'] as ReactNode),
    );
  } else if (href !== undefined) {
    row = (
      <a className={rowClass} href={href} aria-current={current}>
        {contents(children)}
      </a>
    );
  } else if (onClick !== undefined) {
    row = (
      <button type="button" className={rowClass} onClick={onClick} aria-current={current}>
        {contents(children)}
      </button>
    );
  } else {
    row = <span className={rowClass}>{contents(children)}</span>;
  }

  const hasAction = action !== undefined && action !== null;
  const hasNote = note !== undefined && note !== null;
  return (
    <li
      {...rest}
      className={cx(
        'crewlet-list__item',
        tone === 'danger' && 'crewlet-list__item--danger',
        selected && 'crewlet-list__item--selected',
        (hasAction || hasNote) && 'crewlet-list__item--split',
        className,
      )}
      aria-current={interactive ? undefined : current}
    >
      {row}
      {hasAction ? <span className="crewlet-list__action">{action}</span> : null}
      {hasNote ? <div className="crewlet-list__note">{note}</div> : null}
    </li>
  );
}

List.Item = ListItem;
