import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** One pair, as a tuple: the term and what it is. */
export type DescriptionListEntry = readonly [term: ReactNode, detail: ReactNode];

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  /** Tightens the rhythm for a panel that carries a dozen pairs. */
  dense?: boolean | undefined;
  /**
   * Sizes the term column to its longest term, and keeps each term beside its
   * detail at every width: for a small panel whose terms are a word each
   * ("Nodes", "Up"). The default column is 120px at the least and stacks on a
   * narrow screen, which in a panel of a fixed width spends that width on the
   * space after "Up" and stacks a list the panel had room to lay side by side.
   */
  fit?: boolean | undefined;
  /**
   * The term column's width, as a CSS track: `12rem`, or
   * `minmax(120px, 14rem)`. For lists that have to line up with each other,
   * stacked cards of settings on one page, where each list sizing the column
   * to its own longest term starts its values somewhere else. The same track
   * can be set once for a whole page as `--crewlet-description-list-term`,
   * which every list under it inherits. Ignored with `fit`, whose column is
   * its own longest term by definition, and under the narrow step, where a
   * term stands over its detail.
   */
  termWidth?: string | undefined;
  /**
   * ONE TYPE SIZE: the terms at the details' own size, told apart by the
   * secondary ink alone. For a list that sits inside a row of a table, where
   * a second, smaller size reads as a caption under the row rather than as
   * part of it.
   */
  uniform?: boolean | undefined;
  /**
   * The pairs. Given as tuples so a caller can build them from a record
   * without inventing a key for each one; `DescriptionList.Item` children are
   * the other form, for a pair whose detail is a component.
   */
  items?: readonly DescriptionListEntry[] | undefined;
}

/**
 * Metadata: a term and what it is, several times over.
 *
 * NOT A LAYOUT. It is a `dl`, so a screen reader announces "3 items" and pairs
 * each term with its own detail, and a reader can move between them as a list.
 * That promise is the reason to reach for it, and the reason not to: a panel
 * with two columns of unrelated content is a grid, not a description list, and
 * spelling it as one tells a reader something untrue about what they are
 * looking at.
 *
 * Each pair is wrapped in a `div`, which HTML allows inside a `dl` and which
 * is what lets one pair be one grid row.
 */
export function DescriptionList({
  dense = false,
  fit = false,
  termWidth,
  uniform = false,
  items,
  className,
  style,
  children,
  ...rest
}: DescriptionListProps) {
  return (
    <dl
      {...rest}
      style={
        termWidth === undefined
          ? style
          : ({ ...style, '--crewlet-description-list-term': termWidth } as CSSProperties)
      }
      className={cx(
        'crewlet-description-list',
        dense && 'crewlet-description-list--dense',
        fit && 'crewlet-description-list--fit',
        uniform && 'crewlet-description-list--uniform',
        className,
      )}
    >
      {items?.map(([term, detail], index) => (
        <DescriptionListItem key={index} term={term}>
          {detail}
        </DescriptionListItem>
      ))}
      {children}
    </dl>
  );
}

export interface DescriptionListItemProps extends HTMLAttributes<HTMLDivElement> {
  /** What the value is called. */
  term: ReactNode;
}

/** One term and its detail. */
export function DescriptionListItem({ term, className, children, ...rest }: DescriptionListItemProps) {
  return (
    <div {...rest} className={cx('crewlet-description-list__pair', className)}>
      <dt className="crewlet-description-list__term">{term}</dt>
      <dd className="crewlet-description-list__detail">{children}</dd>
    </div>
  );
}

DescriptionList.Item = DescriptionListItem;
