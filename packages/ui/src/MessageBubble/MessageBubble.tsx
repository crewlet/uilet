import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/** Who wrote it, from the reader's side: the reader (`self`) or anybody else (`other`). */
export type MessageBubbleFrom = 'self' | 'other';

export interface MessageBubbleProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  from: MessageBubbleFrom;
  /** The message. Long unbroken text wraps anywhere rather than widening the thread. */
  children: ReactNode;
  /** Names the message for a screen reader. "You said" for `self`; give one for `other` ("Sam Rivera said"). */
  label?: string | undefined;
  /**
   * What the message carried, under the bubble on its side: the page a
   * question was sent with, as a read-only `Tag` (`xs`, outline), with "Sent
   * with" said to assistive technology only.
   */
  attachment?: ReactNode;
  /** A quiet line under it: the time it was sent, a copy control. */
  footer?: ReactNode;
  /** Rises in when it arrives (a 4px rise and a fade). Off for history, which is already there. */
  animateIn?: boolean | undefined;
}

/**
 * One message in a conversation, as a bubble on its writer's side.
 *
 * THE READER'S OWN MESSAGES STAND AT THE END on the raised ground, with no
 * edge and a small tail corner; anybody else's at the start on the card
 * ground inside a hairline. A bubble is at most 85% of the thread, so the
 * side it stands on is always visible.
 *
 * AN ARTICLE NAMED FOR WHO SAID IT, so a reader moving through a thread by
 * element hears "You said" before the words. An answer from the assistant is
 * not a bubble: it is prose with no container, because it is not signed by a
 * persona.
 */
export function MessageBubble({
  from,
  children,
  label,
  attachment,
  footer,
  animateIn = false,
  className,
  ...rest
}: MessageBubbleProps) {
  return (
    <article
      {...rest}
      aria-label={label ?? (from === 'self' ? 'You said' : undefined)}
      className={cx('crewlet-message', `crewlet-message--${from}`, animateIn && 'crewlet-message--enter', className)}
    >
      <div className="crewlet-message__bubble">{children}</div>
      {attachment === undefined || attachment === null ? null : (
        <div className="crewlet-message__attachment">{attachment}</div>
      )}
      {footer === undefined || footer === null ? null : <div className="crewlet-message__footer">{footer}</div>}
    </article>
  );
}
