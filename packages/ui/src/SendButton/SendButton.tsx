import { forwardRef } from 'react';
import { ArrowUpGlyph, SquareGlyph } from '@crewlethq/icons/glyphs';
import { IconButton, type IconButtonProps } from '../IconButton/index.js';
import { cx } from '../utils/cx.js';

/** Whether the button sends the message or stops the request already running. */
export type SendButtonMode = 'send' | 'stop';

export interface SendButtonLabels {
  /** The send button's name and tooltip. */
  send: string;
  /** The stop button's name and tooltip. */
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
   * Why it cannot send right now ("Write a question first", "Offline"). Soft
   * disabled, as every disabled control here is: it keeps its place in the
   * tab order and says why. Ignored while stopping, because Stop is always
   * available while something runs.
   */
  disabledReason?: string | undefined;
  labels?: Partial<SendButtonLabels> | undefined;
}

/**
 * A chat composer's send button, which becomes Stop while a request runs.
 *
 * ONE ELEMENT IN BOTH MODES, so the button a keyboard reader is on stays
 * focused when the request starts or ends: it changes what it says ("Send",
 * "Stop") and how it looks, never which element it is.
 *
 * SEND is the accent square (IconButton `primary`) with the arrow; STOP is the
 * bordered square (IconButton `secondary`) with a filled square in the primary
 * ink. Stop is quieter than Send on purpose: an inverse block was the loudest
 * thing on the panel in dark mode, and Stop is a way out, not the decision.
 * Inside a `Composer`'s `trailing` slot its corner nests in the composer's.
 */
export const SendButton = forwardRef<HTMLButtonElement, SendButtonProps>(function SendButton(
  { mode, onPress, disabledReason, labels: overrides, className, ...rest },
  ref,
) {
  const labels = overrides ? { ...SEND_BUTTON_LABELS, ...overrides } : SEND_BUTTON_LABELS;
  const stopping = mode === 'stop';
  return (
    <IconButton
      {...rest}
      ref={ref}
      size="md"
      variant={stopping ? 'secondary' : 'primary'}
      label={stopping ? labels.stop : labels.send}
      icon={stopping ? <SquareGlyph filled /> : <ArrowUpGlyph />}
      disabledReason={stopping ? undefined : disabledReason}
      className={cx('crewlet-send-button', `crewlet-send-button--${mode}`, className)}
      onClick={onPress}
    />
  );
});
