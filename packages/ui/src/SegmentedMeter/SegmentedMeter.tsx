import type { CSSProperties, HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';

/**
 * The states a part may be in: the four the approved design divides a crew or
 * a project into. Info is working (or active), warning is waiting on a person,
 * danger is stopped, success is done.
 *
 * NOT `neutral` and NOT `brand`. The quiet part of a whole, the idle seats or
 * the work nobody has started, is the REMAINDER, which the meter draws itself
 * from `total`; a neutral segment would be a second way to draw the same
 * thing, and the two would sit side by side looking like one. The accent means
 * "act here", and a share of a bar is not an action.
 */
export type SegmentedMeterTone = Extract<Tone, 'info' | 'success' | 'warning' | 'danger'>;

/** One part of the whole. */
export interface SegmentedMeterSegment {
  /** What tells two parts apart, unique within the meter: `working`, `done`. */
  id: string;
  /**
   * How many. A finite number of at least 0, read as given ("4 working"), so a
   * caller who needs a unit or a format names the whole meter with `label`. A
   * part of 0 is neither drawn nor spoken.
   */
  value: number;
  /** The state the part is in. */
  tone: SegmentedMeterTone;
  /** The word the count is read with: "working" in "4 working". */
  label: string;
}

/**
 * How the bar stands. `default` is the design's 8px state bar, the figure at
 * the end of a stat tile's value line; `compact` is its 6px progress bar, the
 * one a project row carries under its name, at the height of a `Meter`'s track.
 */
export type SegmentedMeterSize = 'default' | 'compact';

export interface SegmentedMeterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The parts, in the order they are drawn from the leading end. */
  segments: readonly SegmentedMeterSegment[];
  /**
   * The whole the parts belong to: seven seats, sixty-one tasks. What the
   * parts leave of it is the REMAINDER, drawn after them in the quiet
   * `--color-border-strong`. Without one the whole is the parts' own sum and
   * there is no remainder.
   *
   * A total UNDER the parts' sum is not the whole of them. The bar cannot draw
   * more than its length, so it draws the parts against their own sum, and the
   * name keeps the figures it was given ("4 working, 3 waiting of 6"), as a
   * `Meter` past its maximum keeps "140 of 100" rather than a bar that quietly
   * rounds itself down to the limit it overran.
   */
  total?: number | undefined;
  /**
   * The word the remainder is read with: "idle" in "1 idle of 7". Without one
   * the remainder is drawn and not named, and "of 7" still says there is more
   * than the parts.
   */
  remainderLabel?: string | undefined;
  size?: SegmentedMeterSize | undefined;
  /**
   * The accessible name, where the derived one ("4 working, 1 waiting, 1
   * stopped, 1 idle of 7") is not what the bar means where it stands: a
   * figure with a unit, or a count the caller formats.
   */
  label?: string | undefined;
  /**
   * The same figures are already written beside the bar, so it says nothing
   * itself: a tile whose second line reads "1 waiting · 1 stopped · 1 idle"
   * beside a bar that read out the same parts would say them twice.
   */
  decorative?: boolean | undefined;
}

/**
 * A difference of two sums, settled to the precision a double carries through
 * one: 0.1 + 0.2 against a whole of 0.3 leaves 5.6e-17, which is not a part
 * of anything, and 1 - (0.1 + 0.2) is 0.7, not 0.7000000000000001. Without it
 * the first draws a remainder nobody has, at the floor's full width, and the
 * second reads out seventeen digits.
 */
function settle(difference: number, scale: number): number {
  if (Math.abs(difference) <= scale * 1e-12) return 0;
  return Number(difference.toPrecision(12));
}

/** Refuses a count that is not one, by name, as `AvatarStack` refuses its `max`. */
function checked(segments: readonly SegmentedMeterSegment[], total: number | undefined): void {
  const seen = new Set<string>();
  for (const segment of segments) {
    if (seen.has(segment.id)) {
      throw new RangeError(`SegmentedMeter segment ids must be unique; "${segment.id}" is used twice`);
    }
    seen.add(segment.id);
    if (!Number.isFinite(segment.value) || segment.value < 0) {
      throw new RangeError(
        `SegmentedMeter segment "${segment.id}" must be a finite count of at least 0; it was ${segment.value}`,
      );
    }
  }
  if (total !== undefined && (!Number.isFinite(total) || total < 0)) {
    throw new RangeError(`SegmentedMeter total must be a finite count of at least 0; it was ${total}`);
  }
}

/** The whole, the parts' own sum, and what the parts leave of the whole. */
function measure(segments: readonly SegmentedMeterSegment[], total: number | undefined) {
  const sum = segments.reduce((running, segment) => running + segment.value, 0);
  const whole = total ?? sum;
  const scale = Math.max(whole, sum);
  const remainder = Math.max(0, settle(whole - sum, scale));
  return { whole, scale, remainder };
}

/**
 * What the bar says to somebody who cannot see it: every part it draws, in
 * the order drawn, with its word, then the remainder when it has a word, then
 * the whole. "4 working, 1 waiting, 1 stopped, 1 idle of 7".
 *
 * A PART OF 0 IS NOT SPOKEN, because it is not drawn: the name is the picture
 * in words, and "0 stopped" would describe a segment nobody can see. A bar
 * with nothing in it says "0 of 7".
 */
export function segmentedMeterLabel(
  segments: readonly SegmentedMeterSegment[],
  total?: number,
  remainderLabel?: string,
): string {
  checked(segments, total);
  const { whole, remainder } = measure(segments, total);
  const words = segments.filter((segment) => segment.value > 0).map((segment) => `${segment.value} ${segment.label}`);
  if (remainder > 0 && remainderLabel !== undefined) words.push(`${remainder} ${remainderLabel}`);
  return `${words.length === 0 ? '0' : words.join(', ')} of ${whole}`;
}

/**
 * A whole divided into the states its parts are in: how many seats are
 * working, waiting, stopped and idle; how much of a project is done, active
 * and still to do.
 *
 * EACH PART IS ITS SHARE OF THE BAR, and the shares add to the whole of it:
 * each one's flex basis is its percentage of the whole, the remainder
 * included, and the 2px gaps are taken out of them in proportion, so a part
 * of 4 in 7 is 4/7 of the bar that is not gap. A part of 0 is not drawn at
 * all, rather than drawn at no width: an empty box still takes a gap on each
 * side, and its neighbours would stand 4px apart where every other pair
 * stands 2px. No part is ever narrower than the kit's status dot, 7px, the
 * smallest mark this kit asks a reader to tell by its hue, or than an equal
 * share of the bar where so many parts would not fit at 7px: one stopped seat
 * in sixty would otherwise be a sliver nobody could name.
 *
 * THE GAP IS WHAT SEPARATES TWO STATES, not a contrast between their fills:
 * every fill is its tone's fill step, which the palette suite measures at 3:1
 * as a mark on every opaque rung, and the ground shows between each pair.
 *
 * ONE IMAGE TO A SCREEN READER, named by `segmentedMeterLabel`, so the bar is
 * read once as its figures rather than as five unlabelled shapes. It is not
 * a `meter` role: that role carries ONE value against a range, and this is
 * several.
 */
export function SegmentedMeter({
  segments,
  total,
  remainderLabel,
  size = 'default',
  label,
  decorative = false,
  className,
  style,
  ...rest
}: SegmentedMeterProps) {
  checked(segments, total);
  const { scale, remainder } = measure(segments, total);
  const parts = segments.filter((segment) => segment.value > 0);
  const share = (value: number) => `${(value / scale) * 100}%`;
  // An empty whole (nothing, of nothing) is drawn as the bar's full extent in
  // the remainder, as an empty `Meter` still draws its track: the length of
  // the bar is half the reading.
  const leftover = scale === 0 ? '100%' : remainder > 0 ? share(remainder) : null;
  const drawn = parts.length + (leftover === null ? 0 : 1);

  return (
    <div
      {...rest}
      className={cx('crewlet-segmented-meter', `crewlet-segmented-meter--${size}`, className)}
      // How many parts share the bar, for the width floor: no part is drawn
      // narrower than an equal share, so every one of them fits.
      style={{ '--crewlet-segmented-meter-count': drawn, ...style } as CSSProperties}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (label ?? segmentedMeterLabel(segments, total, remainderLabel))}
      aria-hidden={decorative ? true : undefined}
    >
      {parts.map((segment) => (
        <span
          key={segment.id}
          className="crewlet-segmented-meter__segment"
          data-tone={segment.tone}
          style={{ flexBasis: share(segment.value) }}
        />
      ))}
      {leftover === null ? null : (
        <span
          className="crewlet-segmented-meter__segment crewlet-segmented-meter__remainder"
          style={{ flexBasis: leftover }}
        />
      )}
    </div>
  );
}
