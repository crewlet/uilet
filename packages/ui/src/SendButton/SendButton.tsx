import { forwardRef } from 'react';
import { ArrowUpGlyph, SquareGlyph } from '@crewlethq/icons/glyphs';
import { IconButton, type IconButtonProps } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

/** Whether the button sends the message or stops the request already running. */
export type SendButtonMode = 'send' | 'stop';

export interface SendButtonLabels {
  /** The send button's name. */
  send: string;
  /** The stop button's name. */
  stop: string;
}

export const SEND_BUTTON_LABELS: SendButtonLabels = { send: 'Send', stop: 'Stop' };

export interface SendButtonProps
  extends Omit<IconButtonProps, 'label' | 'icon' | 'variant' | 'size' | 'onClick' | 'children' | 'asChild'> {
  /** `send` while nothing is running; `stop` while a request runs. */
  mode: SendButtonMode;
  /** Called on a press in either mode: the caller sends, or stops what is running. */
  onPress: () => void;
  /**
   * Why it cannot be pressed right now, in a few words. Soft disabled, as
   * every disabled control here is: it keeps its place in the tab order, a
   * screen reader is told the reason, and the pointer's tooltip says it.
   *
   * In `send` mode it is why there is nothing to send ("Type a question
   * first", "Offline"). In `stop` mode it is a stop already under way
   * ("Stopping"), which a second press could not hurry; leave it out while
   * the request runs and Stop is always available.
   */
  disabledReason?: string | undefined;
  labels?: Partial<SendButtonLabels> | undefined;
}

/**
 * A chat composer's send button, which becomes Stop while a request runs.
 *
 * ONE ELEMENT IN BOTH MODES, so the button a keyboard reader is on stays
 * focused when the request starts or ends: it changes what it says ("Send",
 * "Stop") and how it looks, never which element it is. Both glyphs are drawn
 * in one cell and the one not in use is faded and scaled away, so the change
 * is a short cross fade in place rather than a swap.
 *
 * SEND is the accent square with the arrow, the one decision in the composer.
 * With nothing to send it is not a faded accent, which read as a muddy block
 * on the dark ground: it is the accent's soft tint with the arrow in the
 * tertiary ink, and it lights up in the accent the moment there is something
 * to send.
 *
 * STOP is the bordered square with a small filled square in the primary ink,
 * the mark every media control uses for "stop", and an accent arc travelling
 * round its edge while the request runs: the button says both that something
 * is under way and how to end it. Stop is quieter than Send on purpose, a way
 * out rather than the decision.
 *
 * Inside a `Composer`'s `trailing` slot its corner nests in the composer's.
 */
export const SendButton = forwardRef<HTMLButtonElement, SendButtonProps>(function SendButton(
  { mode, onPress, disabledReason, labels: overrides, className, title, ...rest },
  ref,
) {
  const labels = overrides ? { ...SEND_BUTTON_LABELS, ...overrides } : SEND_BUTTON_LABELS;
  const stopping = mode === 'stop';
  const name = stopping ? labels.stop : labels.send;
  return (
    <IconButton
      {...rest}
      ref={ref}
      size="md"
      variant={stopping ? 'secondary' : 'primary'}
      label={name}
      // A pointer reader is told the reason where a screen reader is: the
      // tooltip on a held button says why, not only what it would have done.
      title={disabledReason ?? title ?? name}
      icon={
        <span className="crewlet-send-button__glyphs" aria-hidden="true">
          <ArrowUpGlyph className="crewlet-send-button__glyph crewlet-send-button__glyph--send" />
          <SquareGlyph filled className="crewlet-send-button__glyph crewlet-send-button__glyph--stop" />
        </span>
      }
      disabledReason={disabledReason}
      className={cx('crewlet-send-button', `crewlet-send-button--${mode}`, className)}
      onClick={onPress}
    />
  );
});
