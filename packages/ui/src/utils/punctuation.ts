/*
 * A line may break on either side of an atomic token even beside punctuation,
 * so a caller peels what opens and closes around a token off the words and
 * hands it to the token (`open` and `close` on InlineRef and InlineCode).
 */

/** Marks that open around what follows them. */
const OPENING = '([{"\'“‘«‹¿¡';
/** Marks that close around, or end the clause after, what precedes them. */
const CLOSING = ')]}"\'”’»›,.:;?!…%';

const opening = new RegExp(`(^|\\s)([${escape(OPENING)}]+)$`, 'u');
const closing = new RegExp(`^([${escape(CLOSING)}]+)(?=\\s|$)`, 'u');

function escape(chars: string): string {
  return chars.replace(/[\]\\^-]/g, '\\$&');
}

export interface PeeledPunctuation {
  /** The words before the token, less what opens around it. */
  before: string;
  /** What opens around the token: the end of `before` it was peeled from. */
  open: string;
  /** What closes around the token: the start of `after` it was peeled from. */
  close: string;
  /** The words after the token, less what closes around it. */
  after: string;
}

/**
 * Splits the punctuation that opens and closes around a token off the words
 * on either side of it. An opening run is peeled only where it starts a word
 * (after a space, or at the start), and a closing run only where it ends one
 * (before a space, or at the end): the apostrophe in "ENG-42's" stays a word's.
 */
export function peelPunctuation(before: string, after: string): PeeledPunctuation {
  const open = opening.exec(before);
  const close = closing.exec(after);
  const opened = open?.[2] ?? '';
  const closed = close?.[1] ?? '';
  return {
    before: opened ? before.slice(0, before.length - opened.length) : before,
    open: opened,
    close: closed,
    after: closed ? after.slice(closed.length) : after,
  };
}
