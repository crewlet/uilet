import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

/**
 * How big the ring draws. `em` (the default) follows the text around it, which
 * is what a button's leading slot wants; the steps are the glyph scale of
 * `@crewlethq/icons` (12, 14 and 16px), so a ring that stands in a glyph's
 * place in a status column is exactly the glyph's size and nothing moves when
 * the work finishes and the ring becomes a check.
 */
export type SpinnerSize = 'em' | 'xs' | 'sm' | 'md';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  size?: SpinnerSize | undefined;
}

/**
 * Work under way, drawn as the package's one ring: a 2px ring in the current
 * ink with its right quarter open, turning once per slow motion step.
 *
 * ONE RING FOR THE WHOLE PACKAGE. A button's pending state, a request's state
 * column and a status tag all draw this element, so a screen that shows three
 * of them at once shows one kind of mark at three places rather than three
 * kinds of mark. The ink is `currentColor`, so the ring takes whatever the
 * words beside it are drawn in.
 *
 * `display: inline-block`, stated, because a ring is a box with a border: as
 * an inline box inside a line of text its width and height are ignored and
 * only a sliver of its left border is drawn.
 *
 * UNDER REDUCED MOTION IT STOPS AND STAYS OPEN. A closed ring reads as an
 * empty status circle, which says "nothing here"; the open one still reads as
 * pending without moving.
 *
 * DECORATION. It is hidden from assistive technology, because a ring has no
 * words: whatever draws it says what is under way (a button sets `aria-busy`,
 * a status says "Working").
 */
export function Spinner({ size = 'em', className, ...rest }: SpinnerProps) {
  return <span {...rest} aria-hidden="true" className={cx('crewlet-spinner', `crewlet-spinner--${size}`, className)} />;
}
