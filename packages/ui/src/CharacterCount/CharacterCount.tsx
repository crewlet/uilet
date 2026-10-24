import { useEffect, useRef, type HTMLAttributes } from 'react';
import { announce } from '../Announcer/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * How many characters a text holds, counted the way a reader counts them.
 *
 * CODE POINTS, NOT UTF-16 UNITS. `'🙂'.length` is 2, so a limit counted on
 * `.length` refuses an emoji-heavy sentence a character early and tells the
 * writer they typed something they did not. A Go server counting with
 * `utf8.RuneCountInString` counts code points too, so the number on the
 * screen and the number in the refusal are the same number.
 */
export function countCharacters(text: string): number {
  // A string's iterator walks it by code point.
  return Array.from(text).length;
}

/** Where a count stands against its limit. */
export type CharacterCountState = 'within' | 'near' | 'over';

/** The share of the limit past which the count is drawn as a warning. */
export const CHARACTER_COUNT_NEAR = 0.9;

/** Where `length` stands against `max`. */
export function characterCountState(length: number, max: number): CharacterCountState {
  if (length > max) return 'over';
  return length >= Math.ceil(max * CHARACTER_COUNT_NEAR) ? 'near' : 'within';
}

const characters = (n: number) => `${n} ${n === 1 ? 'character' : 'characters'}`;

/** Every sentence the count says. */
export interface CharacterCountLabels {
  /** What a screen reader hears for the count itself: "120 of 500 characters". */
  count: (length: number, max: number) => string;
  /** Said once as the count crosses into the warning step: "50 characters left". */
  left: (left: number) => string;
  /** Said, and read for the count, once it is past the limit: "12 characters over the limit of 500". */
  over: (over: number, max: number) => string;
  /** Said once as an over-long text comes back within the limit. */
  within: string;
}

export const CHARACTER_COUNT_LABELS: CharacterCountLabels = {
  count: (length, max) => `${length} of ${characters(max)}`,
  left: (left) => `${characters(left)} left`,
  over: (over, max) => `${characters(over)} over the limit of ${max}`,
  within: 'Within the limit again',
};

export interface CharacterCountProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** How many characters the text holds. `countCharacters` counts them. */
  length: number;
  /** The most it may hold. */
  max: number;
  /**
   * Says the crossings through the page's `Announcer`: into the warning step,
   * past the limit, and back within it. ON by default; turn it off for a count
   * that is not beside the field being typed in.
   */
  announce?: boolean | undefined;
  labels?: Partial<CharacterCountLabels> | undefined;
}

/**
 * How much of a limit a text has used, beside the field it is typed in:
 * "120 / 500", in the warning ink from nine tenths of the way, and in the
 * danger ink past it.
 *
 * A SOFT LIMIT. The field keeps whatever was typed or pasted, and the count
 * says by how much it is over, because a native `maxLength` cuts a pasted
 * paragraph at the limit without a word, and the writer finds out which half
 * was kept only after it was saved. The form refusing to save is the caller's,
 * through the field's own error.
 *
 * READ IN ONE SENTENCE. The digits are drawn hidden and a sentence is read
 * instead ("120 of 500 characters"), so a field that lists the count in its
 * `aria-describedby` is described in words rather than as "120 slash 500".
 *
 * THE CROSSINGS ARE SAID, ONCE EACH, and nothing in between. A count read on
 * every keystroke is a screen reader that cannot be heard over; one that
 * says nothing is a limit a reader who cannot see the ink meets only as a
 * refusal.
 */
export function CharacterCount({
  length,
  max,
  announce: says = true,
  labels: overrides,
  className,
  ...rest
}: CharacterCountProps) {
  const labels = { ...CHARACTER_COUNT_LABELS, ...overrides };
  const state = characterCountState(length, max);

  /*
   * A CROSSING, NEVER THE MOUNT. A field opened on a text already past the
   * limit is described as over by its own count; announcing it as well would
   * interrupt whatever the reader was hearing when the form opened.
   */
  const was = useRef(state);
  const sentence = useRef(labels);
  sentence.current = labels;
  useEffect(() => {
    const before = was.current;
    was.current = state;
    if (!says || before === state) return;
    const text = sentence.current;
    if (state === 'over') announce(text.over(length - max, max));
    else if (state === 'near' && before === 'within') announce(text.left(max - length));
    else if (before === 'over') announce(text.within);
  }, [state, says, length, max]);

  return (
    <span
      {...rest}
      className={cx('crewlet-character-count', `crewlet-character-count--${state}`, className)}
    >
      <span aria-hidden="true">
        {length}
        <span className="crewlet-character-count__of">/</span>
        {max}
      </span>
      <VisuallyHidden>{state === 'over' ? labels.over(length - max, max) : labels.count(length, max)}</VisuallyHidden>
    </span>
  );
}
