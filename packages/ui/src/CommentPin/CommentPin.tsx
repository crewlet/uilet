import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';

/** A thread still to be answered, one that was resolved, or one being written. */
export type CommentPinState = 'open' | 'resolved' | 'draft';

export interface CommentPinProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** The mark on the pin: the thread's number, or its author's initial. A resolved pin shows a check. */
  mark: string;
  /** The pin's accessible name: who said what, and where. */
  label: string;
  state?: CommentPinState | undefined;
  /** The thread is the one open beside the content. */
  selected?: boolean | undefined;
}

/**
 * A comment thread's marker over the content it is about.
 *
 * Its tip, the bottom-start corner, is the anchored point: place the pin with
 * `left`/`top` at the point and it stands up and to the end of it.
 */
export const CommentPin = forwardRef<HTMLButtonElement, CommentPinProps>(function CommentPin(
  { mark, label, state = 'open', selected = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={selected}
      className={cx('crewlet-comment-pin', `crewlet-comment-pin--${state}`, selected && 'crewlet-comment-pin--selected', className)}
    >
      <span className="crewlet-comment-pin__mark" aria-hidden="true">
        {state === 'resolved' ? <CheckGlyph size="xs" /> : mark}
      </span>
    </button>
  );
});
