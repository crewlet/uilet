import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  CheckGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  KeyboardArrowDownGlyph,
  ScheduleGlyph,
} from '@crewlethq/icons/glyphs';
import { Button } from '../Button/index.js';
import {
  CalendarGrid,
  compareDays,
  shiftMonth,
  today,
  type CalendarDate,
} from '../CalendarGrid/index.js';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
import { isComposing } from '../Layer/index.js';
import { Popover } from '../Popover/index.js';
import { Select } from '../Select/index.js';
import { cx } from '../utils/cx.js';
import {
  DATE_MASK,
  DATE_SEGMENTS,
  TIME_MASK,
  TIME_SEGMENTS,
  isComplete,
  isRealDate,
  isRealTime,
  project,
  remainder,
  segmentAt,
  stepSegment,
  type MaskSegment,
} from './mask.js';

export type TimeWindowMode = 'relative' | 'absolute';

export type TimeWindowTimezone = 'local' | 'utc';

/**
 * A relative window whose start is a CALENDAR BOUNDARY rather than a duration
 * back from now.
 *
 * Two, and both are convention-free. "This week" and "this month" are the ones
 * that look like obvious neighbours and are not: a week begins on a different
 * day in different places, so the span alone would not say when it starts, and
 * the answer would have to be threaded through every pure function here from
 * the picker's own `firstDayOfWeek`. A caller that wants a month passes `30d`
 * or an absolute range.
 */
export type TimeWindowSpan = 'today' | 'yesterday';

export const TIME_WINDOW_SPANS: readonly TimeWindowSpan[] = ['today', 'yesterday'];

export interface TimeWindowValue {
  kind: TimeWindowMode;
  /**
   * A rolling duration for the relative mode: `15m`, `1h`, `24h`, `7d`. It
   * resolves against the moment it is read, so a window set yesterday still
   * means the last seven days today.
   */
  duration?: string | undefined;
  /**
   * A calendar-aligned span for the relative mode, INSTEAD of a duration:
   * "today" starts at midnight rather than 24 hours ago. A value carrying
   * both is one value holding two windows; the span is the more specific of
   * the two, so it is the one that is kept.
   */
  span?: TimeWindowSpan | undefined;
  /** A datetime-local string for the absolute mode (YYYY-MM-DDTHH:MM:SS). */
  from?: string | undefined;
  to?: string | undefined;
  /**
   * How the absolute strings and the calendar spans are read: `local` is the
   * reader's wall clock, `utc` treats midnight as UTC midnight. It travels
   * with the value, so a saved window round-trips.
   */
  timezone?: TimeWindowTimezone | undefined;
}

/**
 * One window on the panel's rail, named the way a reader would say it.
 *
 * A preset is IDENTIFIED BY WHAT IT MEANS rather than by an id of its own:
 * two presets for `7d` would be one window with two names, and the trigger
 * would have to pick one of them to draw.
 */
export interface TimeWindowPreset {
  /** What a reader calls it: "Last 7 days". */
  label: string;
  /** A rolling duration: `15m`, `1h`, `24h`, `7d`, `30d`. */
  duration?: string | undefined;
  /** A calendar-aligned span, instead of a duration. */
  span?: TimeWindowSpan | undefined;
}

export interface TimeWindowBounds {
  /** The earliest day a reader may choose, as a YYYY-MM-DD or datetime-local string. */
  min?: string | undefined;
  /**
   * The latest. It defaults to TODAY, because every window this drives reads
   * something that has already happened: a range ending next Tuesday returns
   * nothing and looks like a range that found nothing.
   */
  max?: string | undefined;
}

/** Every string the picker renders on its own, and every phrase it builds. */
export interface TimeWindowLabels {
  /** What the trigger shows before a window is set. */
  placeholder: string;
  /**
   * How the trigger is ANNOUNCED: its own name, and the window it holds. The
   * name has to carry the window, because a button whose `aria-label` is
   * "Time window" says nothing about the seven days it is currently showing.
   */
  triggerName: (name: string, window: string) => string;
  /** Names the rail of relative windows. */
  presetsLabel: string;
  /** Names the absolute side. */
  absoluteLabel: string;
  timezoneLabel: string;
  localLabel: string;
  utcLabel: string;
  startLabel: string;
  endLabel: string;
  startDateLabel: string;
  startTimeLabel: string;
  endDateLabel: string;
  endTimeLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  customLabel: string;
  customAmountLabel: string;
  customUnitLabel: string;
  /** What a unit is called in the custom row's chooser. */
  unitNames: Record<TimeWindowUnit, string>;
  /** What a calendar span is called where no preset names it. */
  spanNames: Record<TimeWindowSpan, string>;
  /** What a duration no preset names is called: "Last 3 days". */
  durationWindow: (amount: number, unit: TimeWindowUnit) => string;
  /** Two moments, as one phrase. */
  range: (from: string, to: string) => string;
  /** The open end of a relative window. */
  nowLabel: string;
  /** The open start of a window with only an end. */
  earliestLabel: string;
  /** A window that narrows nothing. */
  unsetLabel: string;
  /** The window and what it resolves to, as one sentence. */
  summary: (window: string, range: string) => string;
  resetLabel: string;
  cancelLabel: string;
  applyLabel: string;
}

export type TimeWindowUnit = 'm' | 'h' | 'd' | 'w';

export interface TimeWindowPickerProps {
  value: TimeWindowValue;
  onChange: (value: TimeWindowValue) => void;
  /**
   * The window Reset goes back to. Without one there is nothing to go back
   * TO, so the control is not drawn: a Reset that clears the window to
   * nothing is a different button wearing the same word.
   */
  defaultValue?: TimeWindowValue | undefined;
  /**
   * The windows this caller can actually answer, in the order a reader reads
   * them. A screen whose store keeps thirty days offers thirty days, and
   * nothing offers a year that comes back empty with no explanation.
   */
  presets?: readonly TimeWindowPreset[] | undefined;
  /** Suppress the rail of relative windows. */
  allowRelative?: boolean | undefined;
  /** Suppress the absolute side. */
  allowAbsolute?: boolean | undefined;
  /** Suppress the row that takes a relative window the rail does not offer. */
  allowCustom?: boolean | undefined;
  /** The days a reader may choose between. */
  bounds?: TimeWindowBounds | undefined;
  /** 0 is Sunday (the United States), 1 is Monday (ISO 8601). */
  firstDayOfWeek?: 0 | 1 | undefined;
  /** Names the trigger and the dialog it opens. */
  ariaLabel?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  size?: 'sm' | 'md' | undefined;
  /** Every string the picker renders on its own. */
  labels?: Partial<TimeWindowLabels> | undefined;
}

const DURATION = /^\s*(\d+)\s*(m|h|d|w)\s*$/i;

const MILLISECONDS: Record<TimeWindowUnit, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

const DAY = MILLISECONDS.d;

/** The length of a `15m`, `1h`, `7d` duration in milliseconds, or 0 for anything else. */
export function parseTimeWindowDuration(text: string): number {
  const match = DURATION.exec(text);
  if (!match) return 0;
  const amount = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(amount)) return 0;
  return amount * MILLISECONDS[match[2]!.toLowerCase() as TimeWindowUnit];
}

/** The two halves of a duration, or null when the text is not one. */
function splitDuration(text: string | undefined): { amount: number; unit: TimeWindowUnit } | null {
  if (!text) return null;
  const match = DURATION.exec(text);
  if (!match) return null;
  const amount = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: match[2]!.toLowerCase() as TimeWindowUnit };
}

/**
 * Where a calendar span starts and ends.
 *
 * The local arm walks the CALENDAR rather than subtracting a day's worth of
 * milliseconds: the day a clock change falls on is 23 or 25 hours long, so the
 * subtraction lands an hour inside the wrong day twice a year. UTC has no such
 * day, which is why its arm may subtract.
 */
function spanBounds(span: TimeWindowSpan, zone: TimeWindowTimezone, now: Date): { from: Date; to?: Date } {
  if (zone === 'utc') {
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (span === 'today') return { from: new Date(midnight) };
    return { from: new Date(midnight - DAY), to: new Date(midnight) };
  }
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (span === 'today') return { from: midnight };
  return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), to: midnight };
}

/**
 * What a window means right now, as two ISO instants.
 *
 * `now` is a parameter rather than a read of the clock so that a caller can
 * resolve a window against the same moment it resolved another one against,
 * and so that the panel's own arithmetic does not move underneath a reader
 * while they are using it.
 */
export function resolveTimeWindow(
  value: TimeWindowValue,
  now: Date = new Date(),
): { from: string | undefined; to: string | undefined } {
  const nothing = { from: undefined, to: undefined };
  if (!value) return nothing;
  if (value.kind === 'relative') {
    if (value.span) {
      const bounds = spanBounds(value.span, value.timezone ?? 'local', now);
      return { from: bounds.from.toISOString(), to: bounds.to?.toISOString() };
    }
    const span = parseTimeWindowDuration(value.duration ?? '');
    if (span <= 0) return nothing;
    return { from: new Date(now.getTime() - span).toISOString(), to: undefined };
  }
  if (value.kind === 'absolute') {
    // For UTC the Z marker is appended, so `Date` reads the string as already
    // UTC rather than applying the reader's own offset to it.
    const suffix = value.timezone === 'utc' ? 'Z' : '';
    return {
      from: value.from ? new Date(value.from + suffix).toISOString() : undefined,
      to: value.to ? new Date(value.to + suffix).toISOString() : undefined,
    };
  }
  return nothing;
}

/**
 * The windows a reader actually picks.
 *
 * Each one is here because somebody reaches for it by name, and the list is
 * short on purpose: a rail a reader has to read twice is a rail that has
 * stopped being faster than typing two dates. The minutes are for a log
 * somebody is watching, the four hours are a shift, Today and Yesterday are
 * the calendar days an operator reasons in and reports against, and the last
 * three are the rolling day, week and month every dashboard is asked for.
 * A caller whose data does not reach thirty days back passes its own list.
 */
const DEFAULT_PRESETS: readonly TimeWindowPreset[] = [
  { label: 'Last 15 minutes', duration: '15m' },
  { label: 'Last hour', duration: '1h' },
  { label: 'Last 4 hours', duration: '4h' },
  { label: 'Today', span: 'today' },
  { label: 'Yesterday', span: 'yesterday' },
  { label: 'Last 24 hours', duration: '24h' },
  { label: 'Last 7 days', duration: '7d' },
  { label: 'Last 30 days', duration: '30d' },
];

const SINGULAR: Record<TimeWindowUnit, string> = {
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
};

const PLURAL: Record<TimeWindowUnit, string> = {
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
};

export const DEFAULT_TIME_WINDOW_LABELS: TimeWindowLabels = {
  placeholder: 'Pick a time window',
  triggerName: (name, window) => `${name}: ${window}`,
  presetsLabel: 'Relative windows',
  absoluteLabel: 'Absolute range',
  timezoneLabel: 'Time zone',
  localLabel: 'Local time zone',
  utcLabel: 'UTC',
  startLabel: 'Start',
  endLabel: 'End',
  startDateLabel: 'Start date',
  startTimeLabel: 'Start time',
  endDateLabel: 'End date',
  endTimeLabel: 'End time',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
  customLabel: 'Or the last',
  customAmountLabel: 'Custom amount',
  customUnitLabel: 'Custom unit',
  unitNames: { m: 'Minutes', h: 'Hours', d: 'Days', w: 'Weeks' },
  spanNames: { today: 'Today', yesterday: 'Yesterday' },
  durationWindow: (amount, unit) => `Last ${amount} ${amount === 1 ? SINGULAR[unit] : PLURAL[unit]}`,
  range: (from, to) => `${from} to ${to}`,
  nowLabel: 'now',
  earliestLabel: 'the earliest record',
  unsetLabel: 'Any time',
  summary: (window, range) => `${window}: ${range}`,
  resetLabel: 'Reset to default',
  cancelLabel: 'Cancel',
  applyLabel: 'Apply',
};

const withLabels = (labels: Partial<TimeWindowLabels> | undefined): TimeWindowLabels =>
  labels ? { ...DEFAULT_TIME_WINDOW_LABELS, ...labels } : DEFAULT_TIME_WINDOW_LABELS;

/** What a window IS, said three ways, for the three places that have to say it. */
export interface TimeWindowDescription {
  /** What the window is CALLED: "Last 7 days", "Today", or two moments. */
  window: string;
  /** What it resolves to right now: "Sep 8, 2026, 09:41 to now". */
  range: string;
  /** Both, as one sentence. This is what a screen reader is given. */
  spoken: string;
}

export interface TimeWindowDescribeOptions {
  /** The names this caller offers, so a window is called what its own rail calls it. */
  presets?: readonly TimeWindowPreset[] | undefined;
  labels?: Partial<TimeWindowLabels> | undefined;
  /** The moment the window resolves against. */
  now?: Date | undefined;
}

const MOMENT_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  // h23 rather than `hour12: false`, which renders midnight as 24 in several
  // locales: a window said to start at 24:00 on the 8th starts on the 9th.
  hourCycle: 'h23',
};

const momentText = (at: Date, zone: TimeWindowTimezone): string =>
  new Intl.DateTimeFormat(undefined, zone === 'utc' ? { ...MOMENT_FORMAT, timeZone: 'UTC' } : MOMENT_FORMAT).format(at);

/**
 * Whether a value and a preset mean the same window.
 *
 * A duration is compared by its LENGTH rather than by its spelling, so a
 * window somebody stored as `1d` is named by the rail's own `24h` row instead
 * of falling through to a second phrase for exactly the same window.
 */
export function timeWindowMatchesPreset(value: TimeWindowValue, preset: TimeWindowPreset): boolean {
  if (!value || value.kind !== 'relative') return false;
  if (preset.span) return value.span === preset.span;
  if (!preset.duration || value.span) return false;
  return parseTimeWindowDuration(value.duration ?? '') === parseTimeWindowDuration(preset.duration);
}

/** Whether a window narrows anything at all. */
export function isTimeWindowSet(value: TimeWindowValue): boolean {
  if (!value) return false;
  if (value.kind === 'relative') return Boolean(value.span) || parseTimeWindowDuration(value.duration ?? '') > 0;
  return Boolean(value.from || value.to);
}

/**
 * What is selected, in words.
 *
 * ONE IMPLEMENTATION, because three surfaces have to agree about it: the
 * trigger draws it, the trigger's accessible NAME carries it (a button named
 * only "Time window" tells a screen reader nothing about the seven days it is
 * showing), and the panel states it as the draft moves. Written per surface,
 * the three drifted the moment a preset was renamed.
 */
export function describeTimeWindow(
  value: TimeWindowValue,
  options: TimeWindowDescribeOptions = {},
): TimeWindowDescription {
  const labels = withLabels(options.labels);
  const presets = options.presets ?? DEFAULT_PRESETS;
  const now = options.now ?? new Date();
  const zone = value?.timezone ?? 'local';
  const resolved = resolveTimeWindow(value, now);

  const range = ((): string => {
    if (!resolved.from && !resolved.to) return labels.unsetLabel;
    const from = resolved.from ? momentText(new Date(resolved.from), zone) : labels.earliestLabel;
    const to = resolved.to ? momentText(new Date(resolved.to), zone) : labels.nowLabel;
    return labels.range(from, to);
  })();

  const window = ((): string => {
    if (!isTimeWindowSet(value)) return labels.unsetLabel;
    if (value.kind === 'absolute') return range;
    const named = presets.find((preset) => timeWindowMatchesPreset(value, preset));
    if (named) return named.label;
    if (value.span) return labels.spanNames[value.span];
    const parts = splitDuration(value.duration);
    return parts ? labels.durationWindow(parts.amount, parts.unit) : labels.unsetLabel;
  })();

  return { window, range, spoken: window === range ? window : labels.summary(window, range) };
}

interface Moment extends CalendarDate {
  hour: number;
  minute: number;
  second: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function parseMoment(text: string | undefined): Moment | null {
  if (!text) return null;
  const at = text.indexOf('T');
  const date = at >= 0 ? text.slice(0, at) : text;
  const time = at >= 0 ? text.slice(at + 1) : '00:00:00';
  const parts = date.split('-');
  if (parts.length < 3) return null;
  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (![year, month, day].every((n) => Number.isFinite(n))) return null;
  const clock = time.split(':');
  const hour = Number.parseInt(clock[0] || '0', 10);
  const minute = Number.parseInt(clock[1] || '0', 10);
  const second = Number.parseInt(clock[2] || '0', 10);
  return {
    year: year!,
    month: month! - 1,
    day: day!,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
  };
}

/** An instant read as a wall clock in the window's own zone. */
const momentIn = (at: Date, zone: TimeWindowTimezone): Moment =>
  zone === 'utc'
    ? {
        year: at.getUTCFullYear(),
        month: at.getUTCMonth(),
        day: at.getUTCDate(),
        hour: at.getUTCHours(),
        minute: at.getUTCMinutes(),
        second: at.getUTCSeconds(),
      }
    : {
        year: at.getFullYear(),
        month: at.getMonth(),
        day: at.getDate(),
        hour: at.getHours(),
        minute: at.getMinutes(),
        second: at.getSeconds(),
      };

const formatMoment = (moment: Moment): string =>
  `${moment.year}-${pad(moment.month + 1)}-${pad(moment.day)}T${pad(moment.hour)}:${pad(moment.minute)}:${pad(moment.second)}`;

const dateText = (moment: Moment): string =>
  `${moment.year}/${pad(moment.month + 1)}/${pad(moment.day)}`;

const timeText = (moment: Moment): string =>
  `${pad(moment.hour)}:${pad(moment.minute)}:${pad(moment.second)}`;

const readDate = (text: string): CalendarDate | null => {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(text);
  if (!match || !isRealDate(text)) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
};

const readTime = (text: string): { hour: number; minute: number; second: number } | null => {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!match || !isRealTime(text)) return null;
  return { hour: Number(match[1]), minute: Number(match[2]), second: Number(match[3]) };
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_START = { hour: 0, minute: 0, second: 0 };
const DAY_END = { hour: 23, minute: 59, second: 59 };

/**
 * A value carrying exactly one window.
 *
 * A relative value with a span AND a duration is two windows in one object,
 * and which of them a reader got would depend on which branch happened to be
 * asked first. Nothing this component emits carries both.
 */
function normalise(value: TimeWindowValue | undefined): TimeWindowValue {
  if (!value) return { kind: 'relative' };
  if (value.kind !== 'relative') return value;
  const zone = value.timezone ? { timezone: value.timezone } : {};
  if (value.span) return { kind: 'relative', span: value.span, ...zone };
  return { kind: 'relative', duration: value.duration ?? '', ...zone };
}

/** The value a preset stands for, keeping the zone the reader is working in. */
const fromPreset = (preset: TimeWindowPreset, zone: TimeWindowTimezone): TimeWindowValue =>
  preset.span
    ? { kind: 'relative', span: preset.span, timezone: zone }
    : { kind: 'relative', duration: preset.duration ?? '', timezone: zone };

/**
 * A window of time: one of the windows a reader asks for by name, or two
 * moments.
 *
 * THE PANEL IS ONE SURFACE, not two tabs. It used to be an Absolute tab and a
 * Relative tab, with the relative one a grid of BARE NUMBERS under unit
 * headings: "Last 7 days" was a 7 in a row called Days, and reaching it meant
 * switching tab first. What a reader wants is almost always one of six or
 * eight named windows, so those are a rail down the side of the panel, always
 * on screen, with the calendar beside them rather than behind them.
 *
 * THE TWO SIDES SAY THE SAME THING. Take "Last 7 days" and the calendar shades
 * those seven days and the boxes fill with the moments they resolve to; edit a
 * box or take a day and the window becomes that absolute range and the rail
 * lets go. There is one window, drawn twice, rather than two windows the panel
 * has to choose between when Apply is pressed.
 *
 * WHAT IS SELECTED IS SAID OUT LOUD, in one place ([describeTimeWindow]) that
 * the trigger's text, the trigger's accessible NAME and the panel's own live
 * line all read from. The trigger used to carry `aria-label="Time window"`
 * over its own text, so the one thing it was drawn to say -- which window is
 * on -- was the one thing a screen reader could not hear from it.
 *
 * AND THERE IS A WAY BACK. `defaultValue` is the window the screen opens on,
 * and Reset returns the draft to it; without one the control is not drawn,
 * because a Reset with nothing to reset to is a Clear wearing the wrong word.
 *
 * The draft, the masked boxes and the two-month grid are unchanged: a partial
 * date still rolls back rather than travelling, the mask letters are still a
 * picture nobody hears, and the calendar is still the shared [CalendarGrid],
 * so the same keyboard works here as in every other picker.
 */
export function TimeWindowPicker({
  value,
  onChange,
  defaultValue,
  presets = DEFAULT_PRESETS,
  allowRelative = true,
  allowAbsolute = true,
  allowCustom = true,
  bounds,
  firstDayOfWeek = 0,
  ariaLabel = 'Time window',
  className = '',
  disabled = false,
  size = 'md',
  labels: labelOverrides,
}: TimeWindowPickerProps) {
  const labels = useMemo(() => withLabels(labelOverrides), [labelOverrides]);
  const isSet = isTimeWindowSet(value);
  /*
   * Re-described on every render rather than memoised: a relative window's
   * words depend on the clock, and a memo keyed on the value alone would hold
   * yesterday's phrasing for as long as the page stayed open.
   */
  const described = describeTimeWindow(value, { presets, labels });
  const shown = isSet ? described.window : labels.placeholder;

  return (
    <Popover
      align="start"
      side="bottom"
      width="auto"
      /* The panel is a dialog, and a dialog is announced by its name. The same
         name the trigger carries, so the reader hears what they opened. */
      label={ariaLabel}
      className="crewlet-time-window__popover"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={cx(
            'crewlet-time-window',
            `crewlet-time-window--${size}`,
            isSet && 'is-set',
            open && 'is-open',
            disabled && 'is-disabled',
            className,
          )}
          onClick={() => {
            if (!disabled) toggle();
          }}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          /*
           * THE NAME CARRIES THE WINDOW. An `aria-label` replaces the content
           * of the element it is on, so "Time window" over the words "Last 7
           * days" left a screen reader with the question and never the answer.
           * The visible text is inside the name, which is what a reader
           * speaking the label they can see needs it to be.
           */
          aria-label={labels.triggerName(ariaLabel, shown)}
        >
          <ScheduleGlyph className="crewlet-time-window__icon" size="sm" />
          <span className={cx('crewlet-time-window__label', !isSet && 'is-placeholder')}>{shown}</span>
          <KeyboardArrowDownGlyph className="crewlet-time-window__chevron" size="sm" />
        </button>
      )}
    >
      {(close) => (
        <Panel
          value={value}
          onChange={onChange}
          close={close}
          defaultValue={defaultValue}
          presets={presets}
          allowRelative={allowRelative}
          allowAbsolute={allowAbsolute}
          allowCustom={allowCustom}
          bounds={bounds}
          firstDayOfWeek={firstDayOfWeek}
          labels={labels}
        />
      )}
    </Popover>
  );
}

interface PanelProps {
  value: TimeWindowValue;
  onChange: (value: TimeWindowValue) => void;
  close: () => void;
  defaultValue: TimeWindowValue | undefined;
  presets: readonly TimeWindowPreset[];
  allowRelative: boolean;
  allowAbsolute: boolean;
  allowCustom: boolean;
  bounds: TimeWindowBounds | undefined;
  firstDayOfWeek: 0 | 1;
  labels: TimeWindowLabels;
}

/**
 * The draft lives here, in a component that mounts fresh each time the panel
 * opens, so closing without applying leaves the caller's value untouched.
 *
 * `now` is frozen for the life of the panel. Read from the clock each render
 * instead, "Last 15 minutes" would shade a slightly different quarter hour
 * every time anything moved, and the calendar under the reader's pointer would
 * shift while they were aiming at it.
 */
function Panel({
  value,
  onChange,
  close,
  defaultValue,
  presets,
  allowRelative,
  allowAbsolute,
  allowCustom,
  bounds,
  firstDayOfWeek,
  labels,
}: PanelProps) {
  const now = useMemo(() => new Date(), []);
  const [draft, setDraft] = useState<TimeWindowValue>(() => normalise(value));
  const zone: TimeWindowTimezone = draft.timezone ?? 'local';

  const described = describeTimeWindow(draft, { presets, labels, now });
  const resolved = useMemo(() => resolveTimeWindow(draft, now), [draft, now]);
  /*
   * WHAT THE ABSOLUTE SIDE SHOWS, whichever side set it. A relative window is
   * resolved into the same two moments the boxes and the calendar would hold
   * had a reader typed them, so the panel never has two answers on screen at
   * once.
   *
   * A RELATIVE WINDOW ENDS AT NOW, and now is shown as the end it is: without
   * it "Last 7 days" drew one shaded day and an empty End box, which is a
   * panel saying the window has a start and no extent. The footer still says
   * "to now", because what is PINNED and what it currently reaches are two
   * different facts and only the second one fits in a date box.
   */
  const from = resolved.from ? momentIn(new Date(resolved.from), zone) : null;
  const to = resolved.to
    ? momentIn(new Date(resolved.to), zone)
    : draft.kind === 'relative' && isTimeWindowSet(draft)
      ? momentIn(now, zone)
      : null;

  return (
    <div
      className={cx(
        'crewlet-time-window__panel',
        allowRelative && allowAbsolute && 'crewlet-time-window__panel--both',
      )}
    >
      {allowRelative ? (
        <RelativeRail
          draft={draft}
          setDraft={setDraft}
          presets={presets}
          allowCustom={allowCustom}
          zone={zone}
          labels={labels}
        />
      ) : null}

      {allowAbsolute ? (
        <AbsolutePane
          draft={draft}
          setDraft={setDraft}
          from={from}
          to={to}
          zone={zone}
          bounds={bounds}
          firstDayOfWeek={firstDayOfWeek}
          labels={labels}
        />
      ) : null}

      <div className="crewlet-time-window__footer">
        {/*
          WHAT IS SELECTED, said as the draft moves. Politely, because it
          reports what a press just did and must never cut across the control
          the reader is still using.
        */}
        <p className="crewlet-time-window__summary" aria-live="polite">
          {described.spoken}
        </p>
        <div className="crewlet-time-window__actions">
          {defaultValue ? (
            <Button
              size="small"
              variant="tertiary"
              /*
               * Never disabled, even sitting on the default. A control that
               * disables itself the moment it has nothing to do takes focus
               * off the button a reader just pressed and drops it on the page
               * body; pressing Reset twice costs nothing.
               */
              onClick={() => setDraft(normalise(defaultValue))}
            >
              {labels.resetLabel}
            </Button>
          ) : null}
          <Button size="small" variant="tertiary" onClick={close}>
            {labels.cancelLabel}
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              onChange(draft);
              close();
            }}
          >
            {labels.applyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RailProps {
  draft: TimeWindowValue;
  setDraft: (next: TimeWindowValue) => void;
  presets: readonly TimeWindowPreset[];
  allowCustom: boolean;
  zone: TimeWindowTimezone;
  labels: TimeWindowLabels;
}

/**
 * The windows a reader picks by name.
 *
 * A RADIO GROUP, because that is exactly what it is: several windows, one of
 * them on. The pattern brings the keyboard with it -- one tab stop for the
 * whole rail, the arrows moving and taking, Home and End at the ends -- and it
 * brings the announcement too: a row says it is a radio, which of how many,
 * and whether it is the one that is on. The row of `aria-pressed` buttons this
 * replaces was eight separate tab stops that each claimed to be a toggle a
 * reader could turn off.
 */
function RelativeRail({ draft, setDraft, presets, allowCustom, zone, labels }: RailProps) {
  const rail = useRef<HTMLDivElement | null>(null);
  const custom = useId();
  const chosen = presets.findIndex((preset) => timeWindowMatchesPreset(draft, preset));
  /* The rail always holds a tab stop, even with nothing on it: an absolute
     window checks no row, and a group nobody can tab into is unreachable. */
  const stop = chosen >= 0 ? chosen : 0;

  const held = splitDuration(draft.kind === 'relative' && !draft.span ? draft.duration : undefined);
  const [amount, setAmount] = useState(() => String(held?.amount ?? 1));
  const [unit, setUnit] = useState<TimeWindowUnit>(() => held?.unit ?? 'h');

  /*
   * The custom row follows the draft when the draft moves under it, and the
   * two halves are pulled out as PRIMITIVES first: `held` is a fresh object
   * every render, so naming it would re-seed the row on every keystroke.
   */
  const heldAmount = held?.amount;
  const heldUnit = held?.unit;
  useEffect(() => {
    if (heldAmount === undefined || heldUnit === undefined) return;
    setAmount(String(heldAmount));
    setUnit(heldUnit);
  }, [heldAmount, heldUnit]);

  const take = (at: number) => {
    const preset = presets[at];
    if (preset) setDraft(fromPreset(preset, zone));
  };

  function onKeyDown(event: KeyboardEvent<HTMLElement>, at: number) {
    const last = presets.length - 1;
    let to: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        to = at === last ? 0 : at + 1;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        to = at === 0 ? last : at - 1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    take(to);
    // Selection follows focus, which is what a radio group does, so the
    // reader hears the window they have landed on as they arrive on it.
    rail.current?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus();
  }

  const commit = (nextAmount: string, nextUnit: TimeWindowUnit) => {
    const parsed = Number.parseInt(nextAmount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setDraft({ kind: 'relative', duration: `${parsed}${nextUnit}`, timezone: zone });
  };

  return (
    <div className="crewlet-time-window__relative">
      <div className="crewlet-time-window__rail" role="radiogroup" aria-label={labels.presetsLabel} ref={rail}>
        {presets.map((preset, at) => {
          const on = at === chosen;
          return (
            <button
              key={preset.span ?? preset.duration ?? preset.label}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={at === stop ? 0 : -1}
              className={cx('crewlet-time-window__preset', on && 'is-active')}
              onClick={() => take(at)}
              onKeyDown={(event) => onKeyDown(event, at)}
            >
              {/* The tick is what is CHOSEN; the tint under the pointer is
                  where the reader is. Drawn always and hidden when off, so the
                  labels do not step sideways as the choice moves. */}
              <CheckGlyph className="crewlet-time-window__tick" size="xs" aria-hidden="true" />
              <span className="crewlet-time-window__preset-label">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {allowCustom ? (
        <div className="crewlet-time-window__custom">
          <span className="crewlet-time-window__custom-label" id={custom}>
            {labels.customLabel}
          </span>
          <div className="crewlet-time-window__custom-row" role="group" aria-labelledby={custom}>
            <Input
              inputSize="sm"
              width="xs"
              inputMode="numeric"
              aria-label={labels.customAmountLabel}
              value={amount}
              onChange={(event) => {
                const next = event.target.value.replace(/[^0-9]/g, '');
                setAmount(next);
                commit(next, unit);
              }}
            />
            <Select
              size="sm"
              width="auto"
              ariaLabel={labels.customUnitLabel}
              value={unit}
              onChange={(next) => {
                setUnit(String(next) as TimeWindowUnit);
                commit(amount, String(next) as TimeWindowUnit);
              }}
              options={(['m', 'h', 'd', 'w'] as const).map((key) => ({
                value: key,
                label: labels.unitNames[key],
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface AbsoluteProps {
  draft: TimeWindowValue;
  setDraft: (next: TimeWindowValue) => void;
  from: Moment | null;
  to: Moment | null;
  zone: TimeWindowTimezone;
  bounds: TimeWindowBounds | undefined;
  firstDayOfWeek: 0 | 1;
  labels: TimeWindowLabels;
}

function AbsolutePane({ draft, setDraft, from, to, zone, bounds, firstDayOfWeek, labels }: AbsoluteProps) {
  const heading = useId();
  const nowDay = useMemo(today, []);
  const min = useMemo(() => (bounds?.min ? parseMoment(bounds.min) : null), [bounds?.min]);
  /*
   * NOTHING IN THE FUTURE BY DEFAULT. Every window this drives reads
   * something that has already happened, and a range ending next Tuesday
   * returns an empty list that looks exactly like a range that found nothing.
   */
  const max = useMemo(() => (bounds?.max ? parseMoment(bounds.max) : nowDay), [bounds?.max, nowDay]);

  const [view, setView] = useState<CalendarDate>(() => from ?? nowDay);
  const [focused, setFocused] = useState<CalendarDate>(() => from ?? nowDay);
  const [hover, setHover] = useState<CalendarDate | null>(null);
  const [phase, setPhase] = useState<'start' | 'end'>('start');

  /*
   * The months on screen follow the window's start, but ONLY when the start
   * is not already on screen: taking "Last 30 days" should carry the calendar
   * back to where the range begins, while taking a day in the right-hand
   * month should not slide that month into the left-hand slot under the
   * pointer that is still aiming at it.
   */
  const startYear = from?.year;
  const startMonth = from?.month;
  useEffect(() => {
    if (startYear === undefined || startMonth === undefined) return;
    setView((held) => {
      const right = shiftMonth(held, 1);
      const seen =
        (held.year === startYear && held.month === startMonth) ||
        (right.year === startYear && right.month === startMonth);
      return seen ? held : { year: startYear, month: startMonth, day: 1 };
    });
  }, [startYear, startMonth]);

  const right = shiftMonth(view, 1);
  const refused = (date: CalendarDate) =>
    (min !== null && compareDays(date, min) < 0) || (max !== null && compareDays(date, max) > 0);

  const step = (months: number) => setView(shiftMonth(view, months));

  /** The window this pane is editing, as an absolute one, whatever set it. */
  const absolute = (next: { from?: string; to?: string }): TimeWindowValue => ({
    kind: 'absolute',
    from: next.from ?? (from ? formatMoment(from) : ''),
    to: next.to ?? (to ? formatMoment(to) : ''),
    timezone: zone,
  });

  function pick(date: CalendarDate) {
    if (phase === 'start') {
      // A NEW range. The end is dropped rather than kept, because a start
      // after the old end is a range that reads backwards, and a reader who
      // has just pressed the first day has not said where it ends yet.
      setDraft({ kind: 'absolute', from: formatMoment({ ...date, ...DAY_START }), to: '', timezone: zone });
      setPhase('end');
      return;
    }
    const start = parseMoment(draft.from);
    // The second press. A day BEFORE the one already chosen swaps the two
    // rather than refusing, so a reader who went backwards gets the range
    // they clearly meant instead of having to start again.
    if (start && compareDays(date, start) < 0) {
      setDraft({
        kind: 'absolute',
        from: formatMoment({ ...date, ...DAY_START }),
        to: formatMoment({ year: start.year, month: start.month, day: start.day, ...DAY_END }),
        timezone: zone,
      });
    } else {
      setDraft(
        absolute({ to: formatMoment({ ...date, hour: to?.hour ?? 23, minute: to?.minute ?? 59, second: to?.second ?? 59 }) }),
      );
    }
    setPhase('start');
    setHover(null);
  }

  const start: CalendarDate | null = from ? { year: from.year, month: from.month, day: from.day } : null;
  const end: CalendarDate | null = to
    ? { year: to.year, month: to.month, day: to.day }
    : phase === 'end'
      ? hover
      : null;
  const selected = [start, end].filter((day): day is CalendarDate => day !== null);
  const inRange = (date: CalendarDate) => {
    if (!start || !end) return false;
    const low = compareDays(start, end) <= 0 ? start : end;
    const high = compareDays(start, end) <= 0 ? end : start;
    return compareDays(date, low) > 0 && compareDays(date, high) < 0;
  };

  const commitDate = (which: 'from' | 'to', text: string) => {
    const date = readDate(text);
    if (!date) return;
    const held = which === 'from' ? from : to;
    const clock = held ?? (which === 'from' ? DAY_START : DAY_END);
    const moment = formatMoment({
      ...date,
      hour: clock.hour,
      minute: clock.minute,
      second: clock.second,
    });
    setDraft(absolute(which === 'from' ? { from: moment } : { to: moment }));
    setPhase('start');
  };

  const commitTime = (which: 'from' | 'to', text: string) => {
    const clock = readTime(text);
    const held = which === 'from' ? from : to;
    if (!clock || !held) return;
    const moment = formatMoment({ year: held.year, month: held.month, day: held.day, ...clock });
    setDraft(absolute(which === 'from' ? { from: moment } : { to: moment }));
    setPhase('start');
  };

  return (
    <div className="crewlet-time-window__absolute" role="group" aria-labelledby={heading}>
      <div className="crewlet-time-window__absolute-head">
        <span className="crewlet-time-window__absolute-title" id={heading}>
          {labels.absoluteLabel}
        </span>
        <Select
          size="sm"
          width="auto"
          ariaLabel={labels.timezoneLabel}
          className="crewlet-time-window__tz"
          value={zone}
          onChange={(next) => setDraft({ ...draft, timezone: next as TimeWindowTimezone })}
          options={[
            { value: 'local', label: labels.localLabel },
            { value: 'utc', label: labels.utcLabel },
          ]}
        />
      </div>

      <div className="crewlet-time-window__calendars">
        {[view, right].map((month, at) => (
          <div key={`${month.year}-${month.month}`} className="crewlet-time-window__calendar">
            <div className="crewlet-time-window__calendar-head">
              {at === 0 ? (
                <IconButton
                  size="sm"
                  variant="secondary"
                  label={labels.previousMonthLabel}
                  icon={<ChevronLeftGlyph />}
                  onClick={() => step(-1)}
                />
              ) : (
                <span />
              )}
              {/*
                The month on screen, said out loud when it changes. Politely:
                it reports what a press just did, so it never interrupts the
                day a reader is arrowing through.
              */}
              <span className="crewlet-time-window__calendar-title" aria-live="polite">
                {MONTH_NAMES[month.month]} {month.year}
              </span>
              {at === 1 ? (
                <IconButton
                  size="sm"
                  variant="secondary"
                  label={labels.nextMonthLabel}
                  icon={<ChevronRightGlyph />}
                  onClick={() => step(1)}
                />
              ) : (
                <span />
              )}
            </div>
            <CalendarGrid
              label={`${MONTH_NAMES[month.month]} ${month.year}`}
              year={month.year}
              month={month.month}
              focused={focused}
              onFocusedChange={setFocused}
              onMonthChange={(year, monthIndex) => setView({ year, month: monthIndex, day: 1 })}
              onSelect={pick}
              onHover={setHover}
              selected={selected}
              inRange={inRange}
              isDisabled={refused}
              firstDayOfWeek={firstDayOfWeek}
              showOutsideDays={false}
            />
          </div>
        ))}
      </div>

      <div className="crewlet-time-window__fields">
        <div className="crewlet-time-window__field">
          <span className="crewlet-time-window__field-label">{labels.startLabel}</span>
          <div className="crewlet-time-window__field-row">
            <MaskedInput
              mask={DATE_MASK}
              segments={DATE_SEGMENTS}
              value={from ? dateText(from) : ''}
              onCommit={(text) => commitDate('from', text)}
              isValid={isRealDate}
              label={labels.startDateLabel}
            />
            <MaskedInput
              mask={TIME_MASK}
              segments={TIME_SEGMENTS}
              value={from ? timeText(from) : ''}
              onCommit={(text) => commitTime('from', text)}
              isValid={isRealTime}
              label={labels.startTimeLabel}
            />
          </div>
        </div>
        <div className="crewlet-time-window__field">
          <span className="crewlet-time-window__field-label">{labels.endLabel}</span>
          <div className="crewlet-time-window__field-row">
            <MaskedInput
              mask={DATE_MASK}
              segments={DATE_SEGMENTS}
              value={to ? dateText(to) : ''}
              onCommit={(text) => commitDate('to', text)}
              isValid={isRealDate}
              label={labels.endDateLabel}
            />
            <MaskedInput
              mask={TIME_MASK}
              segments={TIME_SEGMENTS}
              value={to ? timeText(to) : ''}
              onCommit={(text) => commitTime('to', text)}
              isValid={isRealTime}
              label={labels.endTimeLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MaskedInputProps {
  mask: string;
  segments: readonly MaskSegment[];
  value: string;
  onCommit: (text: string) => void;
  isValid: (text: string) => boolean;
  label: string;
}

/**
 * A text box locked to a fixed shape: YYYY/MM/DD, HH:MM:SS.
 *
 * THE MASK LETTERS ARE NOT THE VALUE. They used to be, so the field's own
 * content was "YYYY/MM/DD" and a screen reader read out the letters as the
 * value somebody had entered. Here the input holds only what was typed, with
 * the separators laid in between, and the letters still to come are drawn
 * beside it in an aria-hidden overlay: a picture of the shape, for the reader
 * who can see one.
 *
 * AND ONLY A PRINTABLE NON-DIGIT IS REFUSED. Every other key was swallowed,
 * which took Enter, Tab, an input method's own keys and every application
 * shortcut with them: a reader could not copy the date they had just typed.
 */
function MaskedInput({ mask, segments, value, onCommit, isValid, label }: MaskedInputProps) {
  const [text, setText] = useState(() => project(mask, value));

  useEffect(() => {
    setText(project(mask, value));
  }, [mask, value]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposing(event)) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const caret = event.currentTarget.selectionStart ?? text.length;
      const segment = segmentAt(segments, caret);
      if (!segment) return;
      event.preventDefault();
      setText(stepSegment(mask, text, segment, event.key === 'ArrowUp' ? 1 : -1));
      return;
    }
    // A chord belongs to the application, and a key with no character of its
    // own (Tab, Enter, Escape, the arrows, Home, End) belongs to the browser.
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (!/\d/.test(event.key)) event.preventDefault();
  }

  return (
    <span className={cx('crewlet-time-window__masked', text === '' && 'is-empty')}>
      <input
        type="text"
        inputMode="numeric"
        className="crewlet-time-window__masked-input"
        /*
         * The box is as wide as what it holds, so the shape still to be
         * filled sits directly after the value rather than at the far edge.
         * `size` rather than `field-sizing: content` alone, which two engines
         * do not have yet: without it an `auto` width falls back to the
         * input's default of twenty characters and the overlay is stranded.
         */
        size={Math.max(text.length, 1)}
        value={text}
        aria-label={label}
        aria-invalid={text !== '' && isComplete(mask, text) && !isValid(text) ? true : undefined}
        // The whole edit goes through here, so a paste, an input method and a
        // phone keyboard all work: what comes back is stripped to its digits
        // and laid into the mask again.
        onChange={(event) => setText(project(mask, event.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // A partial or impossible entry rolls back to what the value
          // resolves to, so the refusal is visible and nothing bogus travels.
          if (!isComplete(mask, text) || !isValid(text)) {
            setText(project(mask, value));
            return;
          }
          onCommit(text);
        }}
      />
      {/* The shape still to be filled. A picture, so it is never read out. */}
      <span className="crewlet-time-window__masked-rest" aria-hidden="true">
        {remainder(mask, text)}
      </span>
    </span>
  );
}
