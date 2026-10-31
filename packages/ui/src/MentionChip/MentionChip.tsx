import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';

/**
 * Who a mention names. `other`: a person, an agent or a room, in the light
 * blue of the info tone, apart from a link (the accent). `self`: the reader.
 * `everyone`: the whole room ("@channel"), which names the reader too. Both
 * of those take the warning tone the reader looks for.
 */
export type MentionChipTone = 'other' | 'self' | 'everyone';

export interface MentionChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'onClick'> {
  /** The words as written in the message: "@Product Manager", "#engineering", "@channel". */
  children: ReactNode;
  /** Who it names, `other` by default. */
  tone?: MentionChipTone | undefined;
  /** Opens what it names (a profile, a room). Without it the chip is text, as "@channel" is. */
  onPress?: (() => void) | undefined;
}

/**
 * A person, an agent or a room named in a message's words, drawn as a chip
 * in the line: a soft fill and the ink of its tone, at the words' own size
 * and the regular weight. With `onPress` it is a button that opens what it
 * names; without, it is text.
 *
 * A chip that wraps keeps its fill and its corners on every line it spans.
 */
export function MentionChip({ children, tone = 'other', onPress, className, ...rest }: MentionChipProps) {
  const classes = cx('crewlet-mention-chip', `crewlet-mention-chip--${tone}`, className);
  if (!onPress) {
    return (
      <span {...(rest as HTMLAttributes<HTMLSpanElement>)} className={classes}>
        {children}
      </span>
    );
  }
  return (
    <button {...rest} type="button" className={classes} onClick={onPress}>
      {children}
    </button>
  );
}
