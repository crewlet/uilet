import type { ReactNode } from 'react';
import { KeyGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface LockedLabelProps {
  /** What the place is called: a nav row's words, a tab's. */
  children: ReactNode;
  /**
   * Why the reader cannot open it, as a sentence: "Needs Admin access". Left
   * out, nothing is locked and the label is drawn as it is, with no mark.
   */
  reason?: string | undefined;
  /**
   * Draws the key. Off where the place stands under a heading that already
   * carries it (a nav group whose every row is locked): the reason is still
   * the title and still read after the name, and the key is drawn once, on
   * the heading, rather than down every row.
   */
  mark?: boolean | undefined;
  className?: string | undefined;
}

/**
 * A place's name with the key after it, where the reader lacks the access it
 * takes: the sidebar's rows, a section column's, a section tab's.
 *
 * LOCKED, NEVER HIDDEN. A place that vanished for a reader without its access
 * is one they cannot know exists, and cannot ask an admin for; so the name
 * stays, the key says it is closed, the pointer's title says why, and a
 * screen reader hears the reason after the name (", Needs Admin access").
 *
 * ONE MARK WHEREVER A PLACE IS OFFERED, so a locked place reads the same in
 * the rail, in a column of sections and in a row of tabs: a tab that drew no
 * key looked open and then refused.
 *
 * Nothing but the label where nothing is missing.
 */
export function LockedLabel({ children, reason, mark = true, className }: LockedLabelProps) {
  if (reason === undefined || reason === '') return <>{children}</>;
  return (
    <span className={cx('crewlet-locked-label', className)} title={reason}>
      {children}
      {mark ? <KeyGlyph size="xs" aria-hidden="true" className="crewlet-locked-label__key" /> : null}
      <VisuallyHidden>, {reason}</VisuallyHidden>
    </span>
  );
}
