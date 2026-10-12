import type { HTMLAttributes, ReactNode } from 'react';
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
  items,
  className,
  children,
  ...rest
}: DescriptionListProps) {
  return (
    <dl
      {...rest}
      className={cx(
        'crewlet-description-list',
        dense && 'crewlet-description-list--dense',
        fit && 'crewlet-description-list--fit',
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
