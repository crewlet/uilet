import { useEffect, useMemo, useState } from 'react';
import {
  CalendarTodayGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  KeyboardArrowDownGlyph,
  KeyboardDoubleArrowLeftGlyph,
  KeyboardDoubleArrowRightGlyph,
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
import { Popover } from '../Popover/index.js';
import { cx } from '../utils/cx.js';

export interface DateTimePickerProps {
  /** YYYY-MM-DDTHH:MM:SS, as `<input type="datetime-local" step="1">` emits. Empty when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show the hour, minute and second boxes under the calendar. */
  showTime?: boolean;
  /** Inclusive lower bound, as a YYYY-MM-DD or a full datetime-local string. */
  minDate?: string;
  /** Inclusive upper bound. */
  maxDate?: string;
  /** 0 is Sunday (the United States), 1 is Monday (ISO 8601). */
  firstDayOfWeek?: 0 | 1;
  /** Names the trigger and the dialog it opens. */
  ariaLabel?: string;
  /**
   * Draws the panel itself, with no trigger and no overlay of its own.
   *
   * FOR A SURFACE THAT IS ALREADY AN OVERLAY. A filter chip's editor is a
   * popover, and a picker inside one is a control that opens a control: a date
   * took two presses and stacked two panels for one answer, which is the thing
   * the chip editor refuses to do for a list of options. It is the same
   * calendar, the same time boxes and the same bounds, because there is one
   * picker rather than two.
   */
  inline?: boolean;
  /**
   * The reader is finished: Done pressed, or a day taken where there is no
   * time to set. Inline only, where this has no panel of its own to close, so
   * it is what the surface holding it closes on.
   */
  onDone?: (() => void) | undefined;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Every string the picker renders on its own, and the name it builds. */
  labels?: Partial<DateTimePickerLabels> | undefined;
}

/** Every string the picker renders on its own, and the name it builds. */
export interface DateTimePickerLabels {
  /**
   * How the trigger is ANNOUNCED: its own name, and the moment it holds. The
   * name has to carry the value, because an `aria-label` REPLACES the content
   * of the element it is on, and a button drawn as a date that announces
   * itself as "Starts at" is a control a reader cannot read the answer from.
   */
  triggerName: (name: string, value: string) => string;
  /** What an unset value is called inside that name. */
  unsetLabel: string;
  previousYearLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  nextYearLabel: string;
  timeLabel: string;
  hourLabel: string;
  minuteLabel: string;
  secondLabel: string;
  /** The shortcut, when there is a time to set. */
  nowLabel: string;
  /** The same shortcut where there is not. */
  todayLabel: string;
  clearLabel: string;
  doneLabel: string;
}

export const DEFAULT_DATE_TIME_PICKER_LABELS: DateTimePickerLabels = {
  triggerName: (name, value) => `${name}: ${value}`,
  unsetLabel: 'nothing chosen',
  previousYearLabel: 'Previous year',
  previousMonthLabel: 'Previous month',
  nextMonthLabel: 'Next month',
  nextYearLabel: 'Next year',
  timeLabel: 'Time',
  hourLabel: 'Hour',
  minuteLabel: 'Minute',
  secondLabel: 'Second',
  nowLabel: 'Now',
  todayLabel: 'Today',
  clearLabel: 'Clear',
  doneLabel: 'Done',
};

interface Parsed extends CalendarDate {
  hour: number;
  minute: number;
  second: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

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

const formatValue = (parsed: Parsed): string =>
  `${parsed.year}-${pad(parsed.month + 1)}-${pad(parsed.day)}T${pad(parsed.hour)}:${pad(parsed.minute)}:${pad(parsed.second)}`;

function parseValue(text: string | undefined): Parsed | null {
  if (!text) return null;
  const at = text.indexOf('T');
  const date = at >= 0 ? text.slice(0, at) : text;
  const time = at >= 0 ? text.slice(at + 1) : '00:00:00';
  const parts = date.split('-');
  if (parts.length < 3) return null;
  const year = Number.parseInt(parts[0]!, 10);
  const month = Number.parseInt(parts[1]!, 10);
  const day = Number.parseInt(parts[2]!, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const clock = time.split(':');
  const hour = Number.parseInt(clock[0] || '0', 10);
  const minute = Number.parseInt(clock[1] || '0', 10);
  const second = Number.parseInt(clock[2] || '0', 10);
  return {
    year,
    month: month - 1,
    day,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
  };
}

function formatLabel(text: string, showTime: boolean): string {
  const parsed = parseValue(text);
  if (!parsed) return '';
  const when = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second);
  return showTime
    ? when.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : when.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * A day, and the time of day, in the product's own chrome.
 *
 * The native control's picker is the operating system's, so a Chrome on macOS
 * one looks nothing like a Firefox on Windows one, and neither looks like
 * anything else on the page. The value is the same string the native control
 * emits, so a caller swaps one for the other without touching its state.
 *
 * THE MONTH IS A REAL GRID now, shared with every other picker
 * ([CalendarGrid]): one tab stop, the arrows moving a day and a week, Page
 * moving a month, and each day named by its full date rather than by the
 * number drawn on it. It used to be 42 buttons in a row under a `grid` role
 * with no rows in it.
 *
 * THE TRIGGER IS NAMED BY THE MOMENT IT HOLDS. It carried
 * `aria-label={ariaLabel}` over its own text, and an `aria-label` REPLACES the
 * content of the element it is on: a button drawn as "Mar 10, 2026, 09:30"
 * announced itself as "Starts at" and nothing else, so the value it exists to
 * show was the one thing a screen reader could not hear from it.
 *
 * AND THIS MOMENT IS ONE PRESS. Now (or Today, where there is no time to set)
 * is the answer a filter is given more often than any other, and without it
 * every screen that wanted the shortcut drew a button of its own beside the
 * picker.
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  showTime = true,
  minDate,
  maxDate,
  firstDayOfWeek = 0,
  ariaLabel = 'Date',
  inline = false,
  onDone,
  className = '',
  disabled = false,
  size = 'md',
  labels: labelOverrides,
}: DateTimePickerProps) {
  const labels = useMemo(
    () => (labelOverrides ? { ...DEFAULT_DATE_TIME_PICKER_LABELS, ...labelOverrides } : DEFAULT_DATE_TIME_PICKER_LABELS),
    [labelOverrides],
  );
  const parsed = useMemo(() => parseValue(value), [value]);
  const min = useMemo(() => parseValue(minDate), [minDate]);
  const max = useMemo(() => parseValue(maxDate), [maxDate]);
  const now = useMemo(today, []);

  const [view, setView] = useState<{ year: number; month: number }>(() =>
    parsed ? { year: parsed.year, month: parsed.month } : { year: now.year, month: now.month },
  );
  const [focused, setFocused] = useState<CalendarDate>(() => parsed ?? now);

  /*
   * Follow the value when it changes from OUTSIDE: cleared from code, or set
   * by whatever opened the form. The two numbers are pulled out first because
   * `parsed` is a fresh object every render, so naming it would re-run this on
   * every keystroke.
   */
  const year = parsed?.year;
  const month = parsed?.month;
  const day = parsed?.day;
  useEffect(() => {
    if (year === undefined || month === undefined || day === undefined) return;
    setView({ year, month });
    setFocused({ year, month, day });
  }, [year, month, day]);

  const outOfBounds = (date: CalendarDate) =>
    (min !== null && compareDays(date, min) < 0) || (max !== null && compareDays(date, max) > 0);

  const step = (months: number) => {
    const next = shiftMonth({ ...view, day: 1 }, months);
    setView({ year: next.year, month: next.month });
  };

  const choose = (date: CalendarDate, close: () => void) => {
    onChange(
      formatValue({
        ...date,
        hour: parsed?.hour ?? 0,
        minute: parsed?.minute ?? 0,
        second: parsed?.second ?? 0,
      }),
    );
    if (!showTime) close();
  };

  const setTime = (hour: number, minute: number, second: number) => {
    const base = parsed ?? { ...now, hour: 0, minute: 0, second: 0 };
    onChange(formatValue({ ...base, hour, minute, second }));
  };

  /*
   * THIS MOMENT, in one press, which is the answer a filter is set to more
   * often than any other. Without it "since an hour ago" was a month to page
   * to, a day to find and three boxes to type, and every screen that wanted
   * the shortcut drew its own button beside the picker.
   *
   * It is clamped to the bounds rather than refused: a picker whose maximum is
   * yesterday should land on yesterday rather than do nothing and say nothing.
   */
  const takeNow = () => {
    const at = new Date();
    const wanted: Parsed = {
      year: at.getFullYear(),
      month: at.getMonth(),
      day: at.getDate(),
      hour: showTime ? at.getHours() : 0,
      minute: showTime ? at.getMinutes() : 0,
      second: showTime ? at.getSeconds() : 0,
    };
    const held =
      min !== null && compareDays(wanted, min) < 0
        ? { ...min }
        : max !== null && compareDays(wanted, max) > 0
          ? { ...max }
          : wanted;
    setView({ year: held.year, month: held.month });
    setFocused({ year: held.year, month: held.month, day: held.day });
    onChange(formatValue(held));
  };

  /*
   * THE PANEL, DRAWN THE SAME WAY WHEREVER IT IS. A trigger opens it on an
   * overlay of its own; `inline` hands it straight to a surface that is
   * already one. There is one calendar, one set of time boxes and one pair of
   * bounds either way.
   */
  const panel = (close: () => void) => (
    <div className="crewlet-datetime__panel">
      <div className="crewlet-datetime__nav">
        <IconButton
          size="sm"
          label={labels.previousYearLabel}
          icon={<KeyboardDoubleArrowLeftGlyph />}
          onClick={() => step(-12)}
        />
        <IconButton
          size="sm"
          label={labels.previousMonthLabel}
          icon={<ChevronLeftGlyph />}
          onClick={() => step(-1)}
        />
        {/*
          The month on screen, said out loud when it changes. Politely: it
          reports what a press just did, so it never interrupts.
        */}
        <div className="crewlet-datetime__title" aria-live="polite">
          {MONTH_NAMES[view.month]} {view.year}
        </div>
        <IconButton
          size="sm"
          label={labels.nextMonthLabel}
          icon={<ChevronRightGlyph />}
          onClick={() => step(1)}
        />
        <IconButton
          size="sm"
          label={labels.nextYearLabel}
          icon={<KeyboardDoubleArrowRightGlyph />}
          onClick={() => step(12)}
        />
      </div>

      <CalendarGrid
        label={`${MONTH_NAMES[view.month]} ${view.year}`}
        year={view.year}
        month={view.month}
        focused={focused}
        onFocusedChange={setFocused}
        onMonthChange={(nextYear, nextMonth) => setView({ year: nextYear, month: nextMonth })}
        onSelect={(date) => choose(date, close)}
        selected={parsed ? [{ year: parsed.year, month: parsed.month, day: parsed.day }] : []}
        isDisabled={outOfBounds}
        firstDayOfWeek={firstDayOfWeek}
      />

      {showTime ? (
        <div className="crewlet-datetime__time">
          <span className="crewlet-datetime__time-label">{labels.timeLabel}</span>
          <TimeUnit
            value={parsed?.hour ?? 0}
            max={23}
            label={labels.hourLabel}
            onCommit={(next) => setTime(next, parsed?.minute ?? 0, parsed?.second ?? 0)}
          />
          <span className="crewlet-datetime__time-sep" aria-hidden="true">
            :
          </span>
          <TimeUnit
            value={parsed?.minute ?? 0}
            max={59}
            label={labels.minuteLabel}
            onCommit={(next) => setTime(parsed?.hour ?? 0, next, parsed?.second ?? 0)}
          />
          <span className="crewlet-datetime__time-sep" aria-hidden="true">
            :
          </span>
          <TimeUnit
            value={parsed?.second ?? 0}
            max={59}
            label={labels.secondLabel}
            onCommit={(next) => setTime(parsed?.hour ?? 0, parsed?.minute ?? 0, next)}
          />
        </div>
      ) : null}

      <div className="crewlet-datetime__footer">
        <div className="crewlet-datetime__shortcuts">
          <Button size="small" variant="tertiary" onClick={takeNow}>
            {showTime ? labels.nowLabel : labels.todayLabel}
          </Button>
          <Button size="small" variant="tertiary" onClick={() => onChange('')}>
            {labels.clearLabel}
          </Button>
        </div>
        <Button size="small" variant="secondary" onClick={() => close()}>
          {labels.doneLabel}
        </Button>
      </div>
    </div>
  );

  /*
   * INLINE: no trigger, no overlay. `close` is whatever the surface holding
   * this does when the reader is finished, so Done and a day taken with no
   * time to set both reach it.
   */
  if (inline) return panel(onDone ?? (() => undefined));

  return (
    <Popover
      align="start"
      side="bottom"
      width="auto"
      /* The panel is a dialog, and a dialog is announced by its name. The same
         name the trigger carries, so the reader hears what they opened. */
      label={ariaLabel}
      className="crewlet-datetime__popover"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={cx(
            'crewlet-datetime',
            `crewlet-datetime--${size}`,
            value && 'is-set',
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
           * THE NAME CARRIES THE MOMENT. An `aria-label` replaces the content
           * of the element it is on, so the date this button is drawn to show
           * was the one thing a screen reader could not hear from it. The
           * visible text is inside the name, which is what a reader speaking
           * the label they can see needs it to be.
           */
          aria-label={labels.triggerName(
            ariaLabel,
            value ? formatLabel(value, showTime) : labels.unsetLabel,
          )}
        >
          <CalendarTodayGlyph className="crewlet-datetime__icon" size="sm" />
          <span className={cx('crewlet-datetime__label', !value && 'is-placeholder')}>
            {value ? formatLabel(value, showTime) : placeholder}
          </span>
          <KeyboardArrowDownGlyph className="crewlet-datetime__chevron" size="sm" />
        </button>
      )}
    >
      {(close) => panel(close)}
    </Popover>
  );
}

interface TimeUnitProps {
  value: number;
  max: number;
  label: string;
  onCommit: (value: number) => void;
}

/**
 * One hour, minute or second box.
 *
 * It holds its own display string while somebody types, so a "5" is not
 * snapped to "05" mid-keystroke, and commits on blur or Enter with the value
 * clamped. A `number` input rather than text: the arrows step it, the phone
 * keyboard is the right one, and the browser says what the range is.
 */
function TimeUnit({ value, max, label, onCommit }: TimeUnitProps) {
  const [shown, setShown] = useState(() => pad(value));
  useEffect(() => {
    setShown(pad(value));
  }, [value]);

  const commit = () => {
    const next = Math.max(0, Math.min(max, Number.parseInt(shown, 10) || 0));
    setShown(pad(next));
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      className="crewlet-datetime__time-input"
      value={shown}
      aria-label={label}
      onChange={(event) => setShown(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        commit();
      }}
      onFocus={(event) => event.currentTarget.select()}
    />
  );
}
