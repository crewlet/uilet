import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

export type ChatDividerVariant =
  /**
   * The New line: a hairline in the danger hue across the whole list, laid
   * on the boundary between the last message the reader has read and the
   * first one they have not, with its word at the line's end.
   */
  | 'unread'
  /** A quiet labelled rule: the words in the middle, a hairline either side. */
  | 'date'
  /**
   * A count at the start of the line on the faces' edge, a hairline running
   * on from it: a thread's reply count between its root and its replies. Its
   * rule is the hairline a thread's summary line draws under the pointer.
   */
  | 'count';

export interface ChatDividerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  variant: ChatDividerVariant;
  /** The words on the line, and its name for a screen reader: "New", "3 replies". */
  label: string;
  /**
   * The `unread` line glows once as it appears, drawing the eye to where the
   * reader left off; still under reduced motion. Pass it for the render that
   * opens a room at the reader's place, not for a line a windowed list draws
   * again as it scrolls back into view. Off by default.
   */
  pulse?: boolean | undefined;
}

/**
 * A line between the rows of a conversation.
 *
 * THE NEW LINE TAKES NO HEIGHT. Marking where the reader left off moves no
 * message: the line is drawn on the boundary between two rows, over the gap
 * they already keep, so a list that gains or loses it never shifts under the
 * reader's eye. Inside a `ChatDay` whose first message is the first unread
 * one, the day draws it on its own rule (`unread`), as one line rather than
 * a second line under the first.
 *
 * A SEPARATOR TO A SCREEN READER, named by its words, so a reader moving
 * through the log hears "New" where the unread messages start. The host can
 * find it again by `data-divider` (to bring it into view, or to tell whether
 * it is on screen for an unread banner).
 */
export function ChatDivider({ variant, label, pulse = false, className, ...rest }: ChatDividerProps) {
  return (
    <div
      {...rest}
      role="separator"
      aria-label={label}
      data-divider={variant}
      className={cx(
        'crewlet-chat-divider',
        `crewlet-chat-divider--${variant}`,
        pulse && variant === 'unread' && 'is-pulsing',
        className,
      )}
    >
      <span className="crewlet-chat-divider__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
