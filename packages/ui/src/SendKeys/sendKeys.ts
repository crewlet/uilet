import { useMediaMatch } from '../MediaMatch/index.js';
import { isComposing } from '../Layer/index.js';
import { keyGlyph } from '../Kbd/index.js';

/**
 * THE TWO QUERIES A TOUCH KEYBOARD IS TOLD BY, written once. The primary
 * pointer is a finger and no pointer anywhere is fine: a phone or a tablet on
 * its own. A laptop with a touch screen, or a tablet with a trackpad, still
 * has a fine pointer, and so a keyboard of its own.
 */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';
export const FINE_POINTER_QUERY = '(any-pointer: fine)';

/**
 * Whether the only keyboard is on the screen, read during render and again
 * when it changes. There the Return key writes a new line and the Send button
 * sends, because a keyboard that covers half the screen is no place to guess
 * whether a press meant "send" or "next line".
 */
export function useTouchKeyboard(): boolean {
  const coarse = useMediaMatch(COARSE_POINTER_QUERY);
  const fine = useMediaMatch(FINE_POINTER_QUERY);
  return coarse && !fine;
}

/** The keydown fields the send rule reads; a React or a DOM event both have them. */
export interface SendKeyEvent {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: unknown;
}

/**
 * Whether a press in a message box sends it: THE ONE RULE every message and
 * reply box follows.
 *
 * - Enter sends; Shift+Enter is the field's own new line.
 * - Command+Enter (Control+Enter elsewhere) sends too, for the habit.
 * - Never while an input method is composing: that Enter picks a word.
 * - Never a press something else has claimed (`defaultPrevented`): an open
 *   mention, emoji or command list takes its Enter first.
 * - On a touch keyboard Enter is a new line; Command+Enter still sends,
 *   since only a keyboard of its own can press it.
 * - Alt+Enter is left to the field.
 */
export function isSendPress(event: SendKeyEvent, touch: boolean): boolean {
  if (event.key !== 'Enter' || event.defaultPrevented || event.altKey) return false;
  if (isComposing(event)) return false;
  if (event.metaKey || event.ctrlKey) return true;
  return !event.shiftKey && !touch;
}

/** The words of the send hint, around its keys. */
export interface SendKeysLabels {
  /** After Enter: "to send", or "to save" for a rewrite. */
  send?: string | undefined;
  /** After Shift+Enter. */
  line?: string | undefined;
}

export const SEND_KEYS_LABELS: Required<SendKeysLabels> = {
  send: 'to send',
  line: 'for a new line',
};

/**
 * The hint as one sentence a screen reader is told: "Return to send, Shift
 * plus Return for a new line" on an Apple platform. Spoken from the keycap's
 * own names, so the description and the drawn hint cannot disagree.
 */
export function sendKeysWords(labels: SendKeysLabels | undefined, apple: boolean): string {
  const words = sendKeysLabels(labels);
  const enter = keyGlyph('Enter', apple).spoken;
  const shift = keyGlyph('Shift', apple).spoken;
  return `${enter} ${words.send}, ${shift} plus ${enter} ${words.line}`;
}

/** The hint's words, each one given or the default. */
export function sendKeysLabels(labels: SendKeysLabels | undefined): Required<SendKeysLabels> {
  return { send: labels?.send ?? SEND_KEYS_LABELS.send, line: labels?.line ?? SEND_KEYS_LABELS.line };
}
