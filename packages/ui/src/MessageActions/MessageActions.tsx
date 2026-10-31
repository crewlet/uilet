import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { emojiName } from '../EmojiPicker/index.js';
import { IconButton } from '../IconButton/index.js';
import { Toolbar } from '../Toolbar/index.js';
import { Tooltip } from '../Tooltip/index.js';
import { cx } from '../utils/cx.js';

export interface MessageActionsProps {
  /** Names the toolbar: "Message actions" by default. */
  label?: string | undefined;
  className?: string | undefined;
  /** Quick reactions, `MessageAction`s, a `Menu` and `ActionDivider`s. */
  children: ReactNode;
}

/**
 * The toolbar a message shows on hover, keyboard focus or a tap: a few quick
 * reactions, add reaction, reply in a thread, save, and More. Pass it to
 * `ChatMessage`'s `actions`, which places it on the row's first line.
 *
 * A SOFT TRAY OF TOOLS, NOT A FRAMED BAR: the transcript's own ground ringed
 * with the hairline and a small shadow, with the large corner, and 30px tools
 * inside a 4px inset. It is a `Toolbar`, so it is one tab stop that the
 * arrow keys walk.
 */
export function MessageActions({ label = 'Message actions', className, children }: MessageActionsProps) {
  return (
    <Toolbar label={label} className={cx('crewlet-message-actions', className)}>
      {children}
    </Toolbar>
  );
}

export interface MessageActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** What it does, in words: the button's name and its hint. */
  label: string;
  /** The glyph, at the medium step. */
  icon: ReactNode;
  /** A toggle that is on (Saved): `aria-pressed`. */
  pressed?: boolean | undefined;
}

/**
 * One tool in the tray: a 30px ghost icon button named by `label`, with the
 * same words as its hint. It spreads what it is given on the button, so it
 * can be a `Menu`'s own trigger (`renderTrigger`), and its hint steps aside
 * while the menu it opens is open.
 */
export const MessageAction = forwardRef<HTMLButtonElement, MessageActionProps>(function MessageAction(
  { label, icon, pressed, ...rest },
  ref,
) {
  return (
    <Tooltip content={label} disabled={rest['aria-expanded'] === true || rest['aria-expanded'] === 'true'}>
      <IconButton {...rest} ref={ref} label={label} icon={icon} size="md" variant="ghost" pressed={pressed} />
    </Tooltip>
  );
});

export interface QuickReactionProps {
  emoji: string;
  /** The emoji's name, for its button and its hint: "eyes". Read from the picker's names by default. */
  name?: string | undefined;
  onPick: () => void;
  /** The words, given the name: "React with eyes" by default. */
  label?: ((name: string) => string) | undefined;
}

/** A quick reaction in the tray: the emoji itself is the button. */
export function QuickReaction({ emoji, name, onPick, label = (said) => `React with ${said}` }: QuickReactionProps) {
  const words = label(name ?? emojiName(emoji));
  return (
    <Tooltip content={words}>
      <button type="button" className="crewlet-message-actions__emoji" aria-label={words} onClick={onPick}>
        <span aria-hidden="true">{emoji}</span>
      </button>
    </Tooltip>
  );
}

/** A hairline between groups of tools, said by nothing. */
export function ActionDivider() {
  return <span className="crewlet-message-actions__divider" aria-hidden="true" />;
}
