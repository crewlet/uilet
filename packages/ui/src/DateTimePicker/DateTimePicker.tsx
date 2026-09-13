import { useEffect, useMemo, useState } from 'react';
import { Popover } from '../Popover/Popover.js';

/*
 * DateTimePicker, a themed replacement for <input type="datetime-local">.
 *
 * The native control's styling is locked to the operating system, so a
 * Chrome on macOS picker looks nothing like a Firefox on Windows one.
 * This component renders a Popover anchored to a Select-styled trigger,
 * holding a month calendar + (optional) hour / minute inputs. The
 * value is exchanged as the same 'YYYY-MM-DDTHH:MM' string the native
 * control emits, so callers can swap from native to themed without
 * touching their state shape.
 */

export interface DateTimePickerProps {
  /** YYYY-MM-DDTHH:MM (matches <input type="datetime-local">). Empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show the hour / minute inputs below the calendar. Defaults to true. */
  showTime?: boolean;
  /** Inclusive lower bound for selectable days, as a YYYY-MM-DD or full datetime-local string. */
  minDate?: string;
  /** Inclusive upper bound for selectable days. */
  maxDate?: string;
  /**
   * First day of the week in the calendar grid. 0 = Sunday (US default),
   * 1 = Monday (ISO 8601). Defaults to 0.
   */
  firstDayOfWeek?: 0 | 1;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

interface ParsedValue {
  year: number;
  month: number; // 0-11
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}

const pad = (n: number): string => String(n).padStart(2, '0');

/*
 * Value format mirrors `<input type="datetime-local" step="1">` so
 * the emitted string is parseable by Date() and round-trips through
 * a backend that stores ISO 8601 timestamps. Seconds are always
 * present even when zero so the value width is stable.
 */
const formatValue = (p: ParsedValue): string => {
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
};

const parseValue = (s: string | undefined): ParsedValue | null => {
  if (!s) return null;
  const tIndex = s.indexOf('T');
  const datePart = tIndex >= 0 ? s.slice(0, tIndex) : s;
  const timePart = tIndex >= 0 ? s.slice(tIndex + 1) : '00:00:00';
  const dateBits = datePart.split('-');
  if (dateBits.length < 3) return null;
  const y = parseInt(dateBits[0]!, 10);
  const m = parseInt(dateBits[1]!, 10);
  const d = parseInt(dateBits[2]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const timeBits = timePart.split(':');
  const h = parseInt(timeBits[0] || '0', 10);
  const mn = parseInt(timeBits[1] || '0', 10);
  const sec = parseInt(timeBits[2] || '0', 10);
  return {
    year: y,
    month: m - 1,
    day: d,
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(mn) ? mn : 0,
    second: Number.isFinite(sec) ? sec : 0,
  };
};

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const startWeekday = (year: number, month: number, firstDay: 0 | 1): number => {
  const d = new Date(year, month, 1).getDay(); // Sun=0..Sat=6
  return (d - firstDay + 7) % 7;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_LABELS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const formatLabel = (s: string, showTime: boolean): string => {
  const parsed = parseValue(s);
  if (!parsed) return '';
  const date = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second);
  if (showTime) {
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

/** Compare two YYYY-MM-DD bound strings; returns negative if a < b, etc. */
const compareDates = (a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
};

const parseBoundDate = (s: string | undefined): { year: number; month: number; day: number } | null => {
  const p = parseValue(s);
  if (!p) return null;
  return { year: p.year, month: p.month, day: p.day };
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  showTime = true,
  minDate,
  maxDate,
  firstDayOfWeek = 0,
  ariaLabel,
  className = '',
  disabled = false,
  size = 'md',
}: DateTimePickerProps) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const minBound = useMemo(() => parseBoundDate(minDate), [minDate]);
  const maxBound = useMemo(() => parseBoundDate(maxDate), [maxDate]);

  // Viewed month tracks which calendar grid is on screen. Seeded
  // from the current value when available, else from today, so
  // opening the popover after a fresh mount lands on the operator's
  // existing selection (or the present) instead of January 1970.
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, []);
  const [viewMonth, setViewMonth] = useState(() => {
    if (parsed) return { year: parsed.year, month: parsed.month };
    return { year: today.year, month: today.month };
  });

  // Re-sync the viewed month when the controlled value flips to a
  // different month externally (e.g. clearing or programmatically
  // setting a date).
  useEffect(() => {
    if (parsed) setViewMonth({ year: parsed.year, month: parsed.month });
  }, [parsed?.year, parsed?.month]);

  const weekdayLabels = firstDayOfWeek === 1 ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS_SUN;
  const totalDays = daysInMonth(viewMonth.year, viewMonth.month);
  const leading = startWeekday(viewMonth.year, viewMonth.month, firstDayOfWeek);

  // Calendar cells, 42 of them so the grid always has 6 rows and the
  // popover height stays steady across months with different lengths.
  const cells = useMemo<Array<{ day: number; inMonth: boolean }>>(() => {
    const out: Array<{ day: number; inMonth: boolean }> = [];
    const prevTotal = daysInMonth(
      viewMonth.month === 0 ? viewMonth.year - 1 : viewMonth.year,
      viewMonth.month === 0 ? 11 : viewMonth.month - 1,
    );
    for (let i = 0; i < leading; i += 1) {
      out.push({ day: prevTotal - leading + 1 + i, inMonth: false });
    }
    for (let d = 1; d <= totalDays; d += 1) {
      out.push({ day: d, inMonth: true });
    }
    while (out.length < 42) {
      out.push({ day: out.length - leading - totalDays + 1, inMonth: false });
    }
    return out;
  }, [viewMonth.year, viewMonth.month, leading, totalDays]);

  const stepMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = prev.month + delta;
      const carry = Math.floor(next / 12);
      const normalised = ((next % 12) + 12) % 12;
      return { year: prev.year + carry, month: normalised };
    });
  };

  const stepYear = (delta: number) => {
    setViewMonth((prev) => ({ year: prev.year + delta, month: prev.month }));
  };

  const pickDay = (day: number, inMonth: boolean) => {
    let targetYear = viewMonth.year;
    let targetMonth = viewMonth.month;
    if (!inMonth) {
      // Cells before / after the visible month: identify which
      // neighbouring month they belong to and roll the viewed
      // month so the freshly-picked day lands in view.
      if (day > 20) {
        targetMonth -= 1;
        if (targetMonth < 0) { targetMonth = 11; targetYear -= 1; }
      } else {
        targetMonth += 1;
        if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
      }
      setViewMonth({ year: targetYear, month: targetMonth });
    }
    onChange(formatValue({
      year: targetYear,
      month: targetMonth,
      day,
      hour: parsed?.hour ?? 0,
      minute: parsed?.minute ?? 0,
      second: parsed?.second ?? 0,
    }));
  };

  const setTime = (hour: number, minute: number, second: number) => {
    const base = parsed ?? {
      year: today.year, month: today.month, day: today.day,
      hour: 0, minute: 0, second: 0,
    };
    onChange(formatValue({ ...base, hour, minute, second }));
  };


  const isOutOfBounds = (cellDate: { year: number; month: number; day: number }): boolean => {
    if (minBound && compareDates(cellDate, minBound) < 0) return true;
    if (maxBound && compareDates(cellDate, maxBound) > 0) return true;
    return false;
  };

  const isToday = (cellYear: number, cellMonth: number, cellDay: number): boolean =>
    cellYear === today.year && cellMonth === today.month && cellDay === today.day;

  const isSelected = (cellYear: number, cellMonth: number, cellDay: number): boolean => {
    if (!parsed) return false;
    return cellYear === parsed.year && cellMonth === parsed.month && cellDay === parsed.day;
  };

  const triggerLabel = formatLabel(value, showTime);
  const wrapClass = [
    'crewlet-datetime',
    `crewlet-datetime--${size}`,
    value ? 'is-set' : '',
    disabled ? 'is-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Popover
      align="start"
      side="bottom"
      width="match"
      className="crewlet-datetime__popover"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={`${wrapClass}${open ? ' is-open' : ''}`}
          onClick={() => { if (!disabled) toggle(); }}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel || 'Date'}
        >
          <span className="material-symbols-outlined crewlet-datetime__icon" aria-hidden>calendar_today</span>
          <span className={`crewlet-datetime__label${value ? '' : ' is-placeholder'}`}>
            {value ? triggerLabel : placeholder}
          </span>
          <span className="material-symbols-outlined crewlet-datetime__chevron" aria-hidden>
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="crewlet-datetime__panel" role="dialog" aria-label="Date picker">
          <div className="crewlet-datetime__nav">
            <button
              type="button"
              className="crewlet-datetime__nav-btn"
              onClick={() => stepYear(-1)}
              aria-label="Previous year"
            >
              <span className="material-symbols-outlined" aria-hidden>keyboard_double_arrow_left</span>
            </button>
            <button
              type="button"
              className="crewlet-datetime__nav-btn"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
            </button>
            <div className="crewlet-datetime__title" aria-live="polite">
              {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
            </div>
            <button
              type="button"
              className="crewlet-datetime__nav-btn"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
            >
              <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
            </button>
            <button
              type="button"
              className="crewlet-datetime__nav-btn"
              onClick={() => stepYear(1)}
              aria-label="Next year"
            >
              <span className="material-symbols-outlined" aria-hidden>keyboard_double_arrow_right</span>
            </button>
          </div>

          <div className="crewlet-datetime__weekdays" aria-hidden>
            {weekdayLabels.map((label, i) => (
              <span key={i} className="crewlet-datetime__weekday">{label}</span>
            ))}
          </div>

          <div className="crewlet-datetime__grid" role="grid">
            {cells.map((cell, i) => {
              // Resolve which month this cell belongs to so the bounds check
              // and the click handler agree.
              let cellYear = viewMonth.year;
              let cellMonth = viewMonth.month;
              if (!cell.inMonth) {
                if (cell.day > 20) {
                  cellMonth -= 1;
                  if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
                } else {
                  cellMonth += 1;
                  if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
                }
              }
              const outOfBounds = isOutOfBounds({ year: cellYear, month: cellMonth, day: cell.day });
              const todayCell = isToday(cellYear, cellMonth, cell.day);
              const selected = isSelected(cellYear, cellMonth, cell.day);
              const cls = [
                'crewlet-datetime__cell',
                cell.inMonth ? '' : 'is-outside',
                outOfBounds ? 'is-disabled' : '',
                todayCell ? 'is-today' : '',
                selected ? 'is-selected' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  className={cls}
                  disabled={outOfBounds}
                  onClick={() => {
                    if (outOfBounds) return;
                    pickDay(cell.day, cell.inMonth);
                    if (!showTime) close();
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {showTime && (
            <div className="crewlet-datetime__time">
              <span className="crewlet-datetime__time-label">Time</span>
              <TimeUnitInput
                value={parsed?.hour ?? 0}
                max={23}
                ariaLabel="Hour"
                onCommit={(n) => setTime(n, parsed?.minute ?? 0, parsed?.second ?? 0)}
              />
              <span className="crewlet-datetime__time-sep">:</span>
              <TimeUnitInput
                value={parsed?.minute ?? 0}
                max={59}
                ariaLabel="Minute"
                onCommit={(n) => setTime(parsed?.hour ?? 0, n, parsed?.second ?? 0)}
              />
              <span className="crewlet-datetime__time-sep">:</span>
              <TimeUnitInput
                value={parsed?.second ?? 0}
                max={59}
                ariaLabel="Second"
                onCommit={(n) => setTime(parsed?.hour ?? 0, parsed?.minute ?? 0, n)}
              />
            </div>
          )}

          {/*
            Today and Now live in the quick-pick row above the
            calendar, so the footer keeps just Clear (reset to empty)
            and Done (close the popover). Clear sits at the left,
            Done at the right.
          */}
          <div className="crewlet-datetime__footer">
            <button
              type="button"
              className="crewlet-datetime__footer-btn"
              onClick={() => { onChange(''); }}
            >
              Clear
            </button>
            <span className="crewlet-datetime__footer-spacer" />
            <button
              type="button"
              className="crewlet-datetime__footer-btn is-primary"
              onClick={() => close()}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

/*
 * Helper for a single hour / minute / second input. Owns the display
 * string locally so the user can type "5" without React immediately
 * snapping it to "05" mid-keystroke. Commits on blur or Enter with
 * the value clamped to [0, max] and zero-padded. Re-syncs the
 * displayed string when the controlled value flips externally (e.g.
 * Today / Now buttons).
 */
interface TimeUnitInputProps {
  value: number;
  max: number;
  ariaLabel: string;
  onCommit: (n: number) => void;
}

function TimeUnitInput({ value, max, ariaLabel, onCommit }: TimeUnitInputProps) {
  const [display, setDisplay] = useState<string>(() => pad(value));
  useEffect(() => {
    setDisplay(pad(value));
  }, [value]);

  const commit = () => {
    const n = Math.max(0, Math.min(max, parseInt(display, 10) || 0));
    setDisplay(pad(n));
    if (n !== value) onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      className="crewlet-datetime__time-input"
      value={display}
      onChange={(e) => setDisplay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
      aria-label={ariaLabel}
    />
  );
}
