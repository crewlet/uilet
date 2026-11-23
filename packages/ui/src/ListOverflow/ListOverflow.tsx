import type { MouseEvent, ReactNode } from 'react';
import { Popover } from '../Popover/index.js';
import { cx } from '../utils/cx.js';

/** What one item of a list is called, in both numbers: a plural is a word, not a suffix ("person", "people"). */
export interface ListNoun {
  one: string;
  other: string;
}

/**
 * What a list's overflow says it holds: "+1 more problem", or "+3 more" with no noun.
 * A bare "+1" reads as a sum or a delta, and says neither what it hides nor that it opens.
 */
export function overflowWords(count: number, noun?: ListNoun | undefined): string {
  const n = count.toLocaleString();
  if (noun === undefined) return `+${n} more`;
  return `+${n} more ${count === 1 ? noun.one : noun.other}`;
}

/**
 * How many of `total` items a list capped at `max` shows. Never folds ONE item:
 * a chip saying "+1 more tag" takes the room of the tag it hides, so the tag is drawn.
 */
export function shownBeforeOverflow(total: number, max: number): number {
  return total <= max + 1 ? total : max;
}

export interface ListOverflowProps {
  /** The items the list left out, one per line in the panel the chip opens. */
  items: readonly ReactNode[];
  /** What the items are called. Left out, the chip says "+3 more". */
  noun?: ListNoun | undefined;
  /** The chip's words, where `overflowWords` is not what this list calls them. */
  children?: ReactNode;
  /** The panel's name, announced as it opens: the chip's words without the "+" by default. */
  label?: string | undefined;
  /** `sm` ends a row of 22px tags, `xs` a packed row of 18px ones; the target is 24px either way. */
  size?: 'xs' | 'sm' | undefined;
  /** Which edge of the chip the panel lines up with. */
  align?: 'start' | 'end' | undefined;
  className?: string | undefined;
}

/**
 * The chip for the items a list left out: it says how many and what they are
 * ("+2 more problems") and is a button that opens a named panel listing them,
 * so a keyboard, touch or screen reader user reaches them, not only a hover title.
 */
export function ListOverflow({ items, noun, children, label, size = 'sm', align = 'start', className }: ListOverflowProps) {
  const words = overflowWords(items.length, noun);
  return (
    <Popover
      label={label ?? words.slice(1)}
      align={align}
      className="crewlet-list-overflow__panel"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={cx('crewlet-list-overflow', `crewlet-list-overflow--${size}`, className)}
          data-open={open || undefined}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            // A list inside a row that opens something is not opened by its chip.
            event.stopPropagation();
            toggle();
          }}
        >
          {children ?? words}
        </button>
      )}
    >
      <ul className="crewlet-list-overflow__list">
        {items.map((item, index) => (
          <li key={index} className="crewlet-list-overflow__item">
            {item}
          </li>
        ))}
      </ul>
    </Popover>
  );
}
