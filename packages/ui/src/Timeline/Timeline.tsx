import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export type TimelineItemState =
  /** Done, or simply past. */
  | 'default'
  /** This step failed. */
  | 'danger'
  /** This step is where the work is now. */
  | 'active';

/** The word before an item's number, read but not drawn: "Round 3". */
const TimelineContext = createContext<string>('Item');

/**
 * An item's own position, handed down rather than counted by the item.
 *
 * WHY A CONTEXT AND NOT A CSS COUNTER. The number is read aloud as well as
 * drawn ("Round 3"), and a counter lives only in the stylesheet, where no
 * assistive technology can reach it.
 */
const TimelinePositionContext = createContext<number | null>(null);

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  /**
   * The word read before an item's number. "Round" makes the hidden label
   * "Round 3", which is what a reader listening to a long ledger needs.
   */
  itemLabel?: string | undefined;
  /**
   * Tints every other item on the inset surface. Two steps, alternating: it
   * separates adjacent blocks without claiming a meaning.
   */
  alternating?: boolean | undefined;
}

/**
 * A numbered sequence of steps, each bracketed by its own rail.
 *
 * THE RAIL BRACKETS AN ITEM, it does not connect siblings. Drawn between items
 * instead, a sequence of one gets no rail at all, which is the common case and
 * the one a reader complained about: a bare numeral in the gutter beside a
 * flat stack of look-alike rows. Bounded to its own item, every step is
 * delimited and the ledger still ends where its last step's content ends.
 */
export function Timeline({
  itemLabel = 'Item',
  alternating = false,
  className,
  children,
  ...rest
}: TimelineProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <TimelineContext.Provider value={itemLabel}>
      <ol
        {...rest}
        className={cx('crewlet-timeline', alternating && 'crewlet-timeline--alternating', className)}
      >
        {items.map((child, index) => (
          <TimelinePositionContext.Provider key={child.key ?? index} value={index + 1}>
            {child}
          </TimelinePositionContext.Provider>
        ))}
      </ol>
    </TimelineContext.Provider>
  );
}

export interface TimelineItemProps extends LiHTMLAttributes<HTMLLIElement> {
  state?: TimelineItemState | undefined;
  /**
   * What the node draws. The item's own number by default, which is what a
   * numbered ledger wants; a glyph where the step has an identity of its own.
   */
  marker?: ReactNode;
  /** Overrides the hidden label, for a step whose name is not its number. */
  label?: string | undefined;
}

/**
 * One step.
 *
 * Its rail runs from under the node to the bottom of THIS item's content, on
 * every item including the last, so appending one changes nothing about the
 * items already drawn.
 */
export function TimelineItem({
  state = 'default',
  marker,
  label,
  className,
  children,
  ...rest
}: TimelineItemProps) {
  const itemLabel = useContext(TimelineContext);
  const position = useContext(TimelinePositionContext);
  if (position === null) {
    throw new Error('Timeline.Item must be rendered inside a Timeline.');
  }
  /*
   * The number alone, never "3 of 9". A running ledger appends, and a total
   * inside every item's label would rewrite the label of every item already
   * drawn on each append, which is exactly the thing a reader is told not to
   * expect from a list that only grows at the end.
   */
  const spoken = label ?? `${itemLabel} ${position}`;

  return (
    <li
      {...rest}
      className={cx('crewlet-timeline__item', `crewlet-timeline__item--${state}`, className)}
      data-state={state}
    >
      <span className="crewlet-timeline__rail">
        <span className="crewlet-timeline__node" aria-hidden>
          {marker ?? position}
        </span>
      </span>
      <div className="crewlet-timeline__body">
        <VisuallyHidden>{spoken}</VisuallyHidden>
        {children}
      </div>
    </li>
  );
}

Timeline.Item = TimelineItem;
