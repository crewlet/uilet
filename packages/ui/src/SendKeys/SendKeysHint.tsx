import type { HTMLAttributes } from 'react';
import { Kbd } from '../Kbd/index.js';
import { cx } from '../utils/cx.js';
import { sendKeysLabels, useTouchKeyboard, type SendKeysLabels } from './sendKeys.js';

export interface SendKeysHintProps extends HTMLAttributes<HTMLSpanElement> {
  /** The words around the keys; "to send" and "for a new line" by default. */
  labels?: SendKeysLabels | undefined;
  /** Overrides platform detection, for a suite or a screenshot. */
  apple?: boolean | undefined;
}

/**
 * The send keys, drawn: "Enter to send, Shift+Enter for a new line", each
 * chord a keycap in the platform's own notation. ONE HINT FOR EVERY MESSAGE
 * BOX, so no box teaches a key another box does not answer.
 *
 * Drawn only where there is a keyboard to press them: on a touch keyboard
 * Enter writes a line and the Send button sends, so there is nothing to say.
 */
export function SendKeysHint({ labels, apple, className, ...rest }: SendKeysHintProps) {
  const touch = useTouchKeyboard();
  if (touch) return null;
  const words = sendKeysLabels(labels);
  return (
    <span {...rest} className={cx('crewlet-send-keys', className)}>
      <Kbd keys={['Enter']} apple={apple} subtle /> {words.send},{' '}
      <Kbd keys={['Shift', 'Enter']} apple={apple} subtle /> {words.line}
    </span>
  );
}
