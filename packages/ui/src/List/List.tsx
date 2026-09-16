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
import { ErrorGlyph } from '@crewlethq/icons/glyphs';
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
export function List({ variant = 'divided', template, className, style, children, ...rest }: ListProps) {
  const Tag = variant === 'numbered' ? 'ol' : 'ul';
  const templated = template !== undefined;
  return (
    <ListContext.Provider value={{ variant, templated }}>
      <Tag
        {...rest}
        className={cx('crewlet-list', `crewlet-list--${variant}`, templated && 'crewlet-list--templated', className)}
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

  // Spelled once and given whatever the row's own words turn out to be: with
  // asChild they come from the cloned element rather than from `children`.
  const contents = (words: ReactNode) => (
    <>
      {tone === 'danger' ? (
        <>
          <ErrorGlyph className="crewlet-list__danger-mark" size="sm" />
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
      ) : null}
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
      <span className="crewlet-list__content">{words}</span>
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

  return (
    <li
      {...rest}
      className={cx(
        'crewlet-list__item',
        tone === 'danger' && 'crewlet-list__item--danger',
        selected && 'crewlet-list__item--selected',
        className,
      )}
      aria-current={interactive ? undefined : current}
    >
      {row}
    </li>
  );
}

List.Item = ListItem;
