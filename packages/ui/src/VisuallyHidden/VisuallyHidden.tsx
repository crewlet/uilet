import type { ElementType, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface VisuallyHiddenProps {
  /** The element to draw. A span by default; a `li` inside a list, and so on. */
  as?: ElementType | undefined;
  /** For a sentence something else points at with aria-describedby. */
  id?: string | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * Words a screen reader reads and nobody sees.
 *
 * NOT `display: none`, and not `hidden`: both take the text out of the
 * accessibility tree along with the picture, which is the opposite of the
 * point. The clip rectangle is the one technique every assistive technology
 * still reads, and it leaves the element in the layout at a size of one pixel
 * rather than zero, because a zero-sized element is skipped by some of them.
 *
 * What it is for: the sentence beside a glyph that carries the meaning, the
 * spoken form of a shortcut whose keycaps are drawn as symbols, the name of a
 * column whose header is an icon, and the reason a disabled control gives.
 */
export function VisuallyHidden({ as: Tag = 'span', id, className, children }: VisuallyHiddenProps) {
  return (
    <Tag id={id} className={cx('crewlet-visually-hidden', className)}>
      {children}
    </Tag>
  );
}
