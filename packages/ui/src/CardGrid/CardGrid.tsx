import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** The most cards one row holds at full width. */
export type CardGridColumns = 2 | 3 | 4;

/** The narrowest a card is drawn before its row drops one: `AutoGrid`'s three steps. */
export type CardGridMin = 'sm' | 'md' | 'lg';

/** The space between cards, as a step on the spacing scale. */
export type CardGridGap = 3 | 4 | 5;

export interface CardGridProps extends HTMLAttributes<HTMLElement> {
  /** The most cards a row holds; unset, as many as fit at `min`. */
  columns?: CardGridColumns | undefined;
  /** The narrowest card before the row drops one. `md` (260px) by default. */
  min?: CardGridMin | undefined;
  gap?: CardGridGap | undefined;
  /** The element the cards stand in: a `ul` for cards that are `li`s. */
  as?: 'div' | 'section' | 'ul' | 'ol' | undefined;
  children?: ReactNode;
}

/**
 * Cards side by side, every card in a row as tall as the row.
 *
 * Each cell stretches to its row whatever alignment a page gives the grid, a
 * cell that wraps its card hands the height down to it, and a card's last body
 * grows so its footer stays at the foot. A narrow grid is one card per row.
 */
export function CardGrid({ columns, min = 'md', gap = 4, as: Tag = 'div', className, children, ...rest }: CardGridProps) {
  return (
    <Tag
      {...rest}
      className={cx('crewlet-card-grid', className)}
      data-columns={columns}
      data-min={min}
      data-gap={gap}
    >
      {children}
    </Tag>
  );
}
