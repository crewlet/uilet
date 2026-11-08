import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { isApplePlatform } from '../Kbd/index.js';
import { isSendPress, sendKeysWords, useTouchKeyboard, type SendKeysLabels } from './sendKeys.js';

export interface SendOnEnterOptions {
  /** Sends what is in the box. Absent, the box sends nothing and says no keys. */
  onSend?: (() => void) | undefined;
  /**
   * Whether a send would be taken now: there is something to send and sending
   * is allowed. When it is not, the send key does nothing at all: it neither
   * sends nor writes a line.
   */
  canSend?: boolean | undefined;
  /** The description's words; "to send" and "for a new line" by default. */
  labels?: SendKeysLabels | undefined;
}

export interface SendOnEnter {
  /** The field's keydown, after the caller's own (an open list claims its Enter first). */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Whether the only keyboard is on the screen, where Enter is a new line. */
  touch: boolean;
  /** The id naming the keys, for the field's `aria-describedby`; absent when there are none to name. */
  describedBy: string | undefined;
  /** The element that id names, to render anywhere beside the field. */
  description: ReactNode;
}

/**
 * Enter sends and Shift+Enter writes a line, in any message or reply box
 * (`isSendPress` is the rule). The kit's `Composer` is built on it; a box that
 * is not a `Composer` uses it directly, so every box sends the same way.
 *
 * THE FIELD'S DESCRIPTION NAMES THE KEYS, in words rather than glyphs, so a
 * screen reader learns them on reaching the field whether or not a hint is
 * drawn. It is a hidden element, which a description may still name. On a
 * touch keyboard there are no keys to name, and none is given.
 */
export function useSendOnEnter({ onSend, canSend = true, labels }: SendOnEnterOptions): SendOnEnter {
  const touch = useTouchKeyboard();
  const id = useId();
  const named = onSend !== undefined && !touch;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSend || !isSendPress(event, touch)) return;
    // The press is the box's either way: an empty box writes no stray line.
    event.preventDefault();
    if (canSend) onSend();
  };

  return {
    onKeyDown,
    touch,
    describedBy: named ? id : undefined,
    description: named ? (
      <span id={id} hidden>
        {sendKeysWords(labels, isApplePlatform())}
      </span>
    ) : null,
  };
}
