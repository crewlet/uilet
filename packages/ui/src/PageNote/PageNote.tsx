import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

export interface PageNoteProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

/**
 * One sentence saying what a screen answers, under the page's own title.
 *
 * NOT A HEADER. A page bar's breadcrumb is the title; what is left is the
 * sentence that explains the screen, worth keeping where the screen answers a
 * question whose shape is not obvious from its name. A quiet line rather than
 * a panel, at the reading measure: a reader who has read it once scans past it
 * for ever after. It keeps no margin: the page's column sets the rhythm.
 */
export function PageNote({ className, children, ...rest }: PageNoteProps) {
  return (
    <p {...rest} className={cx('crewlet-page-note', className)}>
      {children}
    </p>
  );
}
