/**
 * The grammar behind the masked date and time boxes.
 *
 * Kept beside the component rather than inside it because every rule here is
 * a decision about what a date IS, and each one was wrong in a way no test
 * could see: a year capped at 2030, a February with 31 days in it, and an
 * hour of 24 followed by 60 minutes and 60 seconds.
 */

/** One numeric run inside a mask: where it sits, and what it may hold. */
export interface MaskSegment {
  /** First mask position in the run, inclusive. */
  start: number;
  /** Last mask position in the run, inclusive. */
  end: number;
  min: number;
  max: number;
}

export const DATE_MASK = 'YYYY/MM/DD';
export const TIME_MASK = 'HH:MM:SS';

/**
 * The date segments.
 *
 * THE YEAR HAS NO CEILING WORTH SPELLING. It was 2000 to 2030, which is a
 * ceiling that arrives: on the first of January 2031 the field stops
 * accepting the current year, and it does it by refusing the keystroke, so
 * there is nothing on screen to say why. Four digits is the only real
 * constraint a four-digit field has.
 */
export const DATE_SEGMENTS: readonly MaskSegment[] = [
  { start: 0, end: 3, min: 1, max: 9999 },
  { start: 5, end: 6, min: 1, max: 12 },
  { start: 8, end: 9, min: 1, max: 31 },
];

/**
 * The time segments.
 *
 * AN HOUR IS 0 TO 23 AND A MINUTE IS 0 TO 59. The ranges were 00 to 24 and 00
 * to 60, so "24:60:60" was accepted, handed to `Date`, and silently became
 * one o'clock the following morning: a window a reader set to the end of a
 * day quietly started the next one.
 */
export const TIME_SEGMENTS: readonly MaskSegment[] = [
  { start: 0, end: 1, min: 0, max: 23 },
  { start: 3, end: 4, min: 0, max: 59 },
  { start: 6, end: 7, min: 0, max: 59 },
];

/** Whether the character at `position` of a mask is a separator rather than a slot. */
export const isSeparator = (mask: string, position: number): boolean => {
  const char = mask[position];
  return char !== undefined && !/[A-Za-z]/.test(char);
};

/** How many digits a mask holds. */
export const slotCount = (mask: string): number =>
  [...mask].filter((_, at) => !isSeparator(mask, at)).length;

/**
 * The digits of `text`, laid into the mask with its separators between them.
 *
 * SEPARATORS GO BETWEEN DIGITS, never after the last one. Appended eagerly,
 * "2026" becomes "2026/" and Backspace can never get back past it: the key
 * removes the separator, the projection puts it straight back, and the year
 * cannot be corrected without clearing the whole field.
 */
export function project(mask: string, text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, slotCount(mask));
  let out = '';
  let at = 0;
  for (const digit of digits) {
    while (at < mask.length && isSeparator(mask, at)) {
      out += mask[at];
      at += 1;
    }
    out += digit;
    at += 1;
  }
  return out;
}

/** The mask letters still unfilled, which the overlay draws after the value. */
export function remainder(mask: string, text: string): string {
  return mask.slice(project(mask, text).length);
}

/** Whether `text` fills every slot in the mask. */
export const isComplete = (mask: string, text: string): boolean =>
  text.replace(/\D/g, '').length === slotCount(mask);

/**
 * Whether a filled date is a date that exists.
 *
 * BY ROUND TRIP, not by range. The ranges say 01 to 12 and 01 to 31, and
 * every one of 31 February, 31 April and 29 February 2027 passes all three:
 * `Date` takes them and rolls them forward into the next month, so a reader
 * who typed one got a window starting on a day they never chose. Building the
 * date and asking it what it became is the only check that catches that.
 */
export function isRealDate(text: string): boolean {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const when = new Date(year, month - 1, day);
  return (
    when.getFullYear() === year && when.getMonth() === month - 1 && when.getDate() === day
  );
}

/** Whether a filled time is a time that exists. 24:60:60 is not one. */
export function isRealTime(text: string): boolean {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!match) return false;
  const [hour, minute, second] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return hour <= 23 && minute <= 59 && second <= 59;
}

/**
 * The segment the caret at `position` sits in, or the last one it passed.
 *
 * The caret can rest just after a run's final digit, before the separator, so
 * a segment owns one position past its own end.
 */
export function segmentAt(
  segments: readonly MaskSegment[],
  position: number,
): MaskSegment | undefined {
  return (
    segments.find((segment) => position >= segment.start && position <= segment.end + 1) ??
    segments[segments.length - 1]
  );
}

/**
 * `text` with one segment stepped by `by`, clamped to its own range.
 *
 * A segment with no digits in it yet is SEEDED with its minimum rather than
 * stepped from nothing, so a reader can spin a date up from an empty field.
 * A segment after an empty one is left alone: there is nothing to step into.
 */
export function stepSegment(
  mask: string,
  text: string,
  segment: MaskSegment,
  by: 1 | -1,
): string {
  const filled = project(mask, text).padEnd(mask.length, ' ');
  const width = segment.end - segment.start + 1;
  const run = filled.slice(segment.start, segment.end + 1);
  const digits = run.replace(/[^0-9]/g, '');
  const next =
    digits.length === 0
      ? segment.min
      : Math.min(segment.max, Math.max(segment.min, Number(digits) + by));
  const before = filled.slice(0, segment.start).replace(/ /g, '');
  // Everything before the segment has to be filled for the segment to hold a
  // value at all: a month cannot be typed into a field with no year.
  if (before.replace(/\D/g, '').length < slotCount(mask.slice(0, segment.start))) return text;
  const after = filled.slice(segment.end + 1).replace(/ /g, '');
  return project(mask, before + String(next).padStart(width, '0') + after);
}
