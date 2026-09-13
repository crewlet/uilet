import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popover } from '../Popover/Popover.js';
import { Select } from '../Select/Select.js';

/*
 * TimeWindowPicker, an AWS-style time range control. One trigger
 * collapses into a popover with two modes: Absolute (two side-by-
 * side calendars + date / time text inputs) and Relative (grouped
 * chip rows + a custom number / unit pair).
 *
 * The component is fully controlled: the caller owns the value and
 * the onChange callback fires when the operator clicks Apply.
 * Cancel discards the in-popover draft, mirroring AWS's commit-on-
 * apply UX. The draft state lives in a child component that mounts
 * fresh each time the popover opens, so closing without Apply
 * leaves the parent's value untouched.
 *
 * Callers consume the value via the exported `resolveTimeWindow`
 * helper, which returns { from, to } ISO strings ready to hand to
 * a backend filter.
 */

export type TimeWindowMode = 'relative' | 'absolute';

export type TimeWindowTimezone = 'local' | 'utc';

export interface TimeWindowValue {
  kind: TimeWindowMode;
  /** Duration string for relative mode, e.g. '7d', '24h', '15m'. */
  duration?: string;
  /** Datetime-local string for absolute mode (YYYY-MM-DDTHH:MM:SS). */
  from?: string;
  to?: string;
  /**
   * How to interpret the absolute from/to strings when resolving
   * to ISO 8601: 'local' (default) treats them as the operator's
   * wall clock; 'utc' treats them as already-UTC. The selection
   * persists with the value so a saved window round-trips cleanly.
   */
  timezone?: TimeWindowTimezone;
}

export interface TimeWindowPickerProps {
  value: TimeWindowValue;
  onChange: (value: TimeWindowValue) => void;
  /** Suppress the Relative tab. Defaults to true (shown). */
  allowRelative?: boolean;
  /** Suppress the Absolute tab. Defaults to true (shown). */
  allowAbsolute?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/* ─── Duration helpers ─────────────────────────────────────── */

const DURATION_RX = /^\s*(\d+)\s*(m|h|d|w)\s*$/i;

export function parseTimeWindowDuration(s: string): number {
  const m = DURATION_RX.exec(s);
  if (!m) return 0;
  const n = parseInt(m[1]!, 10);
  if (!Number.isFinite(n)) return 0;
  const unit = m[2]!.toLowerCase();
  const factor =
    unit === 'm' ? 60_000
    : unit === 'h' ? 3_600_000
    : unit === 'd' ? 86_400_000
    : 604_800_000;
  return n * factor;
}

export function resolveTimeWindow(value: TimeWindowValue): {
  from: string | undefined;
  to: string | undefined;
} {
  if (!value) return { from: undefined, to: undefined };
  if (value.kind === 'relative' && value.duration) {
    const ms = parseTimeWindowDuration(value.duration);
    if (ms <= 0) return { from: undefined, to: undefined };
    return {
      from: new Date(Date.now() - ms).toISOString(),
      to: undefined,
    };
  }
  if (value.kind === 'absolute') {
    // For UTC, append the Z marker so Date() treats the string as
    // already-UTC instead of local-wall-clock. For local (default),
    // the bare datetime-local string is fed to Date() which applies
    // the operator's timezone offset before serialising to ISO.
    const suffix = value.timezone === 'utc' ? 'Z' : '';
    return {
      from: value.from ? new Date(value.from + suffix).toISOString() : undefined,
      to: value.to ? new Date(value.to + suffix).toISOString() : undefined,
    };
  }
  return { from: undefined, to: undefined };
}

/* ─── Chip groups for the Relative pane ────────────────────── */

interface ChipGroup {
  label: string;
  unit: 'm' | 'h' | 'd' | 'w';
  values: number[];
}

const CHIP_GROUPS: ChipGroup[] = [
  { label: 'Minutes', unit: 'm', values: [5, 10, 15, 30, 45] },
  { label: 'Hours',   unit: 'h', values: [1, 2, 3, 6, 8, 12] },
  { label: 'Days',    unit: 'd', values: [1, 2, 3, 4, 5, 6] },
  { label: 'Weeks',   unit: 'w', values: [1, 2, 3, 4] },
];

const UNIT_LABELS: Record<string, string> = {
  m: 'Minutes', h: 'Hours', d: 'Days', w: 'Weeks',
};

/* ─── Datetime parsing ─────────────────────────────────────── */

interface ParsedDateTime {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const parseDateTime = (s: string | undefined): ParsedDateTime | null => {
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
    year: y, month: m - 1, day: d,
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(mn) ? mn : 0,
    second: Number.isFinite(sec) ? sec : 0,
  };
};

const formatDateTime = (p: ParsedDateTime): string =>
  `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;

const formatDateOnly = (p: ParsedDateTime): string =>
  `${p.year}/${pad(p.month + 1)}/${pad(p.day)}`;

const formatTimeOnly = (p: ParsedDateTime): string =>
  `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;

const parseDateOnly = (s: string): { year: number; month: number; day: number } | null => {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return {
    year: parseInt(m[1]!, 10),
    month: parseInt(m[2]!, 10) - 1,
    day: parseInt(m[3]!, 10),
  };
};

const parseTimeOnly = (s: string): { hour: number; minute: number; second: number } | null => {
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s.trim());
  if (!m) return null;
  return {
    hour: parseInt(m[1]!, 10),
    minute: parseInt(m[2]!, 10),
    second: m[3] ? parseInt(m[3], 10) : 0,
  };
};

/*
 * Per-segment validation ranges:
 *   YYYY: 2000-2030      MM (month):  01-12      DD: 01-31
 *   HH:   00-24          MM (minute): 00-60      SS: 00-60
 *
 * Date and time mask positions:
 *   YYYY/MM/DD  →  0123 4 56 7 89
 *   HH:MM:SS    →  01 2 34 5 67
 */

/* Per-keystroke digit filter for a YYYY/MM/DD field. Blocks digits
   that can't fit the 2000-2030 / 01-12 / 01-31 ranges. */
const dateDigitFilter = (digit: string, pos: number, display: string): boolean => {
  switch (pos) {
    // YYYY: 2000-2030
    case 0: return digit === '2';                     // must start with 2
    case 1: return digit === '0';                     // 20xx
    case 2: return /[0-3]/.test(digit);               // 2000/2010/2020/2030
    case 3:                                           // last digit of year
      return display[2] === '3' ? digit === '0' : /[0-9]/.test(digit);
    // MM (month): 01-12
    case 5: return /[01]/.test(digit);                // 0x or 1x
    case 6:                                           // last digit of month
      if (display[5] === '0') return /[1-9]/.test(digit);
      if (display[5] === '1') return /[0-2]/.test(digit);
      return true;
    // DD: 01-31
    case 8: return /[0-3]/.test(digit);
    case 9:                                           // last digit of day
      if (display[8] === '0') return /[1-9]/.test(digit);
      if (display[8] === '3') return /[01]/.test(digit);
      return /[0-9]/.test(digit);
    default: return true;
  }
};

/* Per-keystroke digit filter for an HH:MM:SS field. Blocks digits
   that can't fit the 00-24 / 00-60 / 00-60 ranges. */
const timeDigitFilter = (digit: string, pos: number, display: string): boolean => {
  switch (pos) {
    // HH: 00-24
    case 0: return /[0-2]/.test(digit);
    case 1:
      return display[0] === '2' ? /[0-4]/.test(digit) : /[0-9]/.test(digit);
    // MM (minute): 00-60
    case 3: return /[0-6]/.test(digit);
    case 4:
      return display[3] === '6' ? digit === '0' : /[0-9]/.test(digit);
    // SS: 00-60
    case 6: return /[0-6]/.test(digit);
    case 7:
      return display[6] === '6' ? digit === '0' : /[0-9]/.test(digit);
    default: return true;
  }
};

/* On-blur full-range validator. Returns true only if every segment
   is filled (no mask letters left) AND inside its declared range. */
const isValidDateInput = (s: string): boolean => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s);
  if (!m) return false;
  const y = parseInt(m[1]!, 10);
  const mo = parseInt(m[2]!, 10);
  const d = parseInt(m[3]!, 10);
  return y >= 2000 && y <= 2030 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
};

const isValidTimeInput = (s: string): boolean => {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const h = parseInt(m[1]!, 10);
  const mi = parseInt(m[2]!, 10);
  const se = parseInt(m[3]!, 10);
  return h >= 0 && h <= 24 && mi >= 0 && mi <= 60 && se >= 0 && se <= 60;
};

/* Segment ranges driving the MaskedInput's ArrowUp/Down stepper. */
const DATE_SEGMENTS = [
  { start: 0, end: 3, min: 2000, max: 2030 },  // YYYY
  { start: 5, end: 6, min: 1, max: 12 },       // MM
  { start: 8, end: 9, min: 1, max: 31 },       // DD
];

const TIME_SEGMENTS = [
  { start: 0, end: 1, min: 0, max: 24 },       // HH
  { start: 3, end: 4, min: 0, max: 60 },       // MM
  { start: 6, end: 7, min: 0, max: 60 },       // SS
];

/* ─── Calendar primitives ──────────────────────────────────── */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS_SUN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_LABELS_MON = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const startWeekday = (year: number, month: number, firstDay: 0 | 1): number => {
  const d = new Date(year, month, 1).getDay();
  return (d - firstDay + 7) % 7;
};

interface DateCoord { year: number; month: number; day: number }

const compareDates = (a: DateCoord, b: DateCoord): number => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
};

const isBetween = (cell: DateCoord, lo: DateCoord, hi: DateCoord): boolean =>
  compareDates(cell, lo) >= 0 && compareDates(cell, hi) <= 0;

interface CalendarProps {
  year: number;
  month: number;
  /*
   * Range state. rangeStart and rangeEnd together describe the
   * currently-painted range; cells matching either endpoint get
   * is-selected, cells strictly between get is-in-range. When the
   * operator is hovering a candidate end date during a two-click
   * pick, the parent passes rangeEnd = hover coord so the preview
   * fills live without committing draft state.
   */
  rangeStart: DateCoord | null;
  rangeEnd: DateCoord | null;
  onSelectDate: (date: DateCoord) => void;
  onHoverDate?: (date: DateCoord | null) => void;
  firstDayOfWeek?: 0 | 1;
  /*
   * Optional nav button rendered INSIDE the calendar's title row,
   * pinned to the outer column of the 7-day grid so it sits
   * directly above the leftmost (or rightmost) weekday header. The
   * left calendar gets prev; the right calendar gets next.
   */
  onPrev?: () => void;
  onNext?: () => void;
}

function Calendar({
  year,
  month,
  rangeStart,
  rangeEnd,
  onSelectDate,
  onHoverDate,
  firstDayOfWeek = 0,
  onPrev,
  onNext,
}: CalendarProps) {
  const totalDays = daysInMonth(year, month);
  const leading = startWeekday(year, month, firstDayOfWeek);
  const weekdayLabels = firstDayOfWeek === 1 ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS_SUN;

  const today = useMemo<DateCoord>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, []);

  const cells = useMemo<Array<{ day: number; inMonth: boolean }>>(() => {
    const out: Array<{ day: number; inMonth: boolean }> = [];
    const prevTotal = daysInMonth(
      month === 0 ? year - 1 : year,
      month === 0 ? 11 : month - 1,
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
  }, [year, month, leading, totalDays]);

  /*
   * Title row uses the same 7-column grid as the weekdays + day grid
   * so the chevron pins directly above the leftmost or rightmost
   * weekday header. The month label spans the remaining 6 columns.
   */
  const titleClass = [
    'crewlet-time-window__calendar-title',
    onPrev ? 'has-prev' : '',
    onNext ? 'has-next' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="crewlet-time-window__calendar">
      <div className={titleClass}>
        {onPrev && (
          <button
            type="button"
            className="crewlet-time-window__calendar-nav crewlet-time-window__calendar-nav--prev"
            onClick={onPrev}
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
          </button>
        )}
        <span className="crewlet-time-window__calendar-title-text">
          {MONTH_NAMES[month]} {year}
        </span>
        {onNext && (
          <button
            type="button"
            className="crewlet-time-window__calendar-nav crewlet-time-window__calendar-nav--next"
            onClick={onNext}
            aria-label="Next month"
          >
            <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
          </button>
        )}
      </div>
      <div className="crewlet-time-window__weekdays" aria-hidden>
        {weekdayLabels.map((label, i) => (
          <span key={i} className="crewlet-time-window__weekday">{label}</span>
        ))}
      </div>
      <div
        className="crewlet-time-window__grid"
        role="grid"
        onMouseLeave={onHoverDate ? () => onHoverDate(null) : undefined}
      >
        {cells.map((cell, i) => {
          let cellYear = year;
          let cellMonth = month;
          if (!cell.inMonth) {
            if (cell.day > 20) {
              cellMonth -= 1;
              if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
            } else {
              cellMonth += 1;
              if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
            }
          }
          const cellCoord: DateCoord = { year: cellYear, month: cellMonth, day: cell.day };

          // Future cells (strictly after today) are non-selectable. They
          // render with the same gray treatment as outside-month cells
          // so the calendar reads as "you can only pick up to today".
          const isFuture = compareDates(cellCoord, today) > 0;

          const isStart = !isFuture && !!rangeStart && compareDates(cellCoord, rangeStart) === 0;
          const isEnd = !isFuture && !!rangeEnd && compareDates(cellCoord, rangeEnd) === 0;
          const isSel = isStart || isEnd;

          // In-range = cells strictly between the lo and hi endpoints.
          // Endpoints themselves get is-selected (full accent fill) so the
          // range body is only the strictly-between cells. Future cells
          // never paint in-range either, even if a preview would walk
          // past today.
          let inRange = false;
          if (!isFuture && rangeStart && rangeEnd && !isSel) {
            const lo = compareDates(rangeStart, rangeEnd) <= 0 ? rangeStart : rangeEnd;
            const hi = compareDates(rangeStart, rangeEnd) <= 0 ? rangeEnd : rangeStart;
            inRange = isBetween(cellCoord, lo, hi);
          }

          const isToday = today.year === cellYear
            && today.month === cellMonth
            && today.day === cell.day;
          const cls = [
            'crewlet-time-window__cell',
            cell.inMonth ? '' : 'is-outside',
            isFuture ? 'is-future' : '',
            isToday ? 'is-today' : '',
            isSel ? 'is-selected' : '',
            inRange ? 'is-in-range' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={cls}
              disabled={isFuture}
              onClick={() => !isFuture && onSelectDate(cellCoord)}
              onMouseEnter={onHoverDate && !isFuture ? () => onHoverDate(cellCoord) : undefined}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Trigger label ────────────────────────────────────────── */

/*
 * Trigger label uses the same YYYY/MM/DD HH:MM:SS format as the
 * MaskedInputs inside the popover, so the operator sees one
 * consistent numeric date / time shape across the trigger and the
 * Absolute pane. Locale-aware month names are intentionally avoided
 * because they introduce ambiguity ("Oct 19" reads differently to
 * the audit feeds the picker drives).
 */
const formatLocalDateLabel = (s: string | undefined): string => {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
    + ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
};

const triggerLabelFor = (
  value: TimeWindowValue,
  placeholder: string,
): ReactNode => {
  if (value?.kind === 'relative' && value.duration) {
    const m = DURATION_RX.exec(value.duration);
    if (m) {
      const n = parseInt(m[1]!, 10);
      const unit = m[2]!.toLowerCase();
      return `Last ${n} ${UNIT_LABELS[unit]?.toLowerCase() || unit}`;
    }
    return `Last ${value.duration}`;
  }
  if (value?.kind === 'absolute') {
    if (!value.from && !value.to) return placeholder;
    const from = value.from ? formatLocalDateLabel(value.from) : 'earliest';
    const to = value.to ? formatLocalDateLabel(value.to) : 'now';
    return `${from} → ${to}`;
  }
  return placeholder;
};

/* ─── Public component ─────────────────────────────────────── */

export function TimeWindowPicker({
  value,
  onChange,
  allowRelative = true,
  allowAbsolute = true,
  placeholder = 'Pick a time window',
  ariaLabel,
  className = '',
  disabled = false,
  size = 'md',
}: TimeWindowPickerProps) {
  const triggerLabel = triggerLabelFor(value, placeholder);
  const isSet = !!(
    (value?.kind === 'relative' && value.duration) ||
    (value?.kind === 'absolute' && (value.from || value.to))
  );

  const wrapClass = [
    'crewlet-time-window',
    `crewlet-time-window--${size}`,
    isSet ? 'is-set' : '',
    disabled ? 'is-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Popover
      align="start"
      side="bottom"
      width="auto"
      className="crewlet-time-window__popover"
      trigger={(open, toggle) => (
        <button
          type="button"
          className={`${wrapClass}${open ? ' is-open' : ''}`}
          onClick={() => { if (!disabled) toggle(); }}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel || 'Time window'}
        >
          <span className="material-symbols-outlined crewlet-time-window__icon" aria-hidden>schedule</span>
          <span className={`crewlet-time-window__label${isSet ? '' : ' is-placeholder'}`}>
            {triggerLabel}
          </span>
          <span className="material-symbols-outlined crewlet-time-window__chevron" aria-hidden>
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      )}
    >
      {(close) => (
        <PanelContent
          value={value}
          onChange={onChange}
          close={close}
          allowRelative={allowRelative}
          allowAbsolute={allowAbsolute}
        />
      )}
    </Popover>
  );
}

/* ─── Popover content (draft state lives here) ─────────────── */

interface PanelContentProps {
  value: TimeWindowValue;
  onChange: (value: TimeWindowValue) => void;
  close: () => void;
  allowRelative: boolean;
  allowAbsolute: boolean;
}

function PanelContent({ value, onChange, close, allowRelative, allowAbsolute }: PanelContentProps) {
  const initialMode: TimeWindowMode = (() => {
    if (value?.kind === 'absolute' && allowAbsolute) return 'absolute';
    if (allowRelative) return 'relative';
    return 'absolute';
  })();
  const [mode, setMode] = useState<TimeWindowMode>(initialMode);
  const [draft, setDraft] = useState<TimeWindowValue>(value || { kind: initialMode });

  const handleApply = () => {
    onChange(draft);
    close();
  };

  return (
    <div className="crewlet-time-window__panel">
      <div className="crewlet-time-window__header">
        <div className="crewlet-time-window__tabs" role="tablist" aria-label="Time window mode">
          {allowAbsolute && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'absolute'}
              className={`crewlet-time-window__tab${mode === 'absolute' ? ' is-active' : ''}`}
              onClick={() => setMode('absolute')}
            >
              Absolute
            </button>
          )}
          {allowRelative && (
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'relative'}
              className={`crewlet-time-window__tab${mode === 'relative' ? ' is-active' : ''}`}
              onClick={() => setMode('relative')}
            >
              Relative
            </button>
          )}
        </div>
        {/*
          Time zone selector on the right side of the tab strip,
          matching the AWS layout. Changing the selection rewrites
          the draft's timezone field; on Apply the parent's
          resolveTimeWindow uses it to interpret the absolute
          strings as either local wall clock or UTC.
        */}
        <div className="crewlet-time-window__tz">
          <Select
            value={draft.timezone || 'local'}
            onChange={(v) => setDraft({ ...draft, timezone: v as TimeWindowTimezone })}
            options={[
              { value: 'local', label: 'Local time zone' },
              { value: 'utc',   label: 'UTC' },
            ]}
            size="sm"
            align="right"
            ariaLabel="Time zone"
          />
        </div>
      </div>

      {mode === 'absolute' && allowAbsolute && (
        <AbsolutePane draft={draft} setDraft={setDraft} />
      )}
      {mode === 'relative' && allowRelative && (
        <RelativePane draft={draft} setDraft={setDraft} />
      )}

      <div className="crewlet-time-window__footer">
        <button
          type="button"
          className="crewlet-time-window__footer-btn"
          onClick={close}
        >
          Cancel
        </button>
        <button
          type="button"
          className="crewlet-time-window__footer-btn is-primary"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/* ─── Absolute pane ────────────────────────────────────────── */

interface PaneProps {
  draft: TimeWindowValue;
  setDraft: (next: TimeWindowValue) => void;
}

function AbsolutePane({ draft, setDraft }: PaneProps) {
  const fromParsed = parseDateTime(draft.from);
  const toParsed = parseDateTime(draft.to);

  // The left calendar seeds from the From date (or today); the right
  // calendar always shows the next month so the user can see a
  // straddling range without scrolling.
  const [leftMonth, setLeftMonth] = useState(() => {
    if (fromParsed) return { year: fromParsed.year, month: fromParsed.month };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const rightMonth = useMemo(() => {
    let m = leftMonth.month + 1;
    let y = leftMonth.year;
    if (m > 11) { m = 0; y += 1; }
    return { year: y, month: m };
  }, [leftMonth]);

  const stepLeft = (delta: number) => {
    let m = leftMonth.month + delta;
    let y = leftMonth.year;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setLeftMonth({ year: y, month: m });
  };

  /*
   * Per-field commit handlers receive the masked-input's display
   * string (always mask-shaped, e.g. "2026/05/23" or "YYYY/05/2D"
   * if partially filled). parseDateOnly / parseTimeOnly accept only
   * fully-numeric inputs; a partial fill fails to parse and the
   * field rolls back to its prior value via the MaskedInput's own
   * value-sync effect.
   */
  const commitFromDate = (s: string) => {
    const date = parseDateOnly(s);
    if (!date) return;
    const time = fromParsed
      ? { hour: fromParsed.hour, minute: fromParsed.minute, second: fromParsed.second }
      : { hour: 0, minute: 0, second: 0 };
    setDraft({
      ...draft, kind: 'absolute',
      from: formatDateTime({ ...date, ...time }),
      to: draft.to || '',
    });
  };
  const commitFromTime = (s: string) => {
    const time = parseTimeOnly(s);
    if (!time) return;
    const date = fromParsed
      ? { year: fromParsed.year, month: fromParsed.month, day: fromParsed.day }
      : null;
    if (!date) return;
    setDraft({
      ...draft, kind: 'absolute',
      from: formatDateTime({ ...date, ...time }),
      to: draft.to || '',
    });
  };
  const commitToDate = (s: string) => {
    const date = parseDateOnly(s);
    if (!date) return;
    const time = toParsed
      ? { hour: toParsed.hour, minute: toParsed.minute, second: toParsed.second }
      : { hour: 23, minute: 59, second: 59 };
    setDraft({
      ...draft, kind: 'absolute',
      from: draft.from || '',
      to: formatDateTime({ ...date, ...time }),
    });
  };
  const commitToTime = (s: string) => {
    const time = parseTimeOnly(s);
    if (!time) return;
    const date = toParsed
      ? { year: toParsed.year, month: toParsed.month, day: toParsed.day }
      : null;
    if (!date) return;
    setDraft({
      ...draft, kind: 'absolute',
      from: draft.from || '',
      to: formatDateTime({ ...date, ...time }),
    });
  };

  const fromCoord: DateCoord | null = fromParsed ? { year: fromParsed.year, month: fromParsed.month, day: fromParsed.day } : null;
  const toCoord: DateCoord | null = toParsed ? { year: toParsed.year, month: toParsed.month, day: toParsed.day } : null;

  /*
   * Two-click range selection state machine. 'start' = the next
   * click sets the From endpoint and clears the To endpoint; 'end'
   * = the next click sets the To endpoint (or swaps with From if
   * the clicked day is earlier). After picking End the phase
   * resets to 'start' so the cycle is: click start → click end →
   * (next click resets and starts over).
   *
   * hoverCoord drives the in-range hover preview: when phase=end
   * and the operator is hovering before clicking, every cell
   * between From and hover paints with the faint accent fill.
   */
  const [phase, setPhase] = useState<'start' | 'end'>(
    fromCoord && !toCoord ? 'end' : 'start',
  );
  const [hoverCoord, setHoverCoord] = useState<DateCoord | null>(null);

  const pickDay = (date: DateCoord) => {
    if (phase === 'start') {
      const time = fromParsed ?? { hour: 0, minute: 0, second: 0 };
      setDraft({
        ...draft, kind: 'absolute',
        from: formatDateTime({ ...date, hour: time.hour, minute: time.minute, second: time.second }),
        to: '',
      });
      setPhase('end');
      return;
    }
    // phase === 'end'. If the clicked day is earlier than the
    // already-picked From, swap them so the operator gets a sane
    // range without having to redo the pick.
    const fromCmp = fromCoord ? compareDates(date, fromCoord) : 0;
    if (fromCoord && fromCmp < 0) {
      // The clicked day predates the already-picked From: swap so the
      // clicked day becomes the new start and the old start becomes the
      // end with an end-of-day time so the range covers the full span.
      const toTime = { hour: 23, minute: 59, second: 59 };
      setDraft({
        ...draft, kind: 'absolute',
        from: formatDateTime({ ...date, hour: 0, minute: 0, second: 0 }),
        to: formatDateTime({ ...fromCoord, hour: toTime.hour, minute: toTime.minute, second: toTime.second }),
      });
    } else {
      const time = toParsed ?? { hour: 23, minute: 59, second: 59 };
      setDraft({
        ...draft, kind: 'absolute',
        from: draft.from || '',
        to: formatDateTime({ ...date, hour: time.hour, minute: time.minute, second: time.second }),
      });
    }
    setPhase('start');
    setHoverCoord(null);
  };

  // The end of the range painted on the calendar: the committed To
  // endpoint when both are set; the hovered cell when the operator
  // is mid-pick (phase='end' and hovering).
  const previewEnd: DateCoord | null = toCoord ?? (phase === 'end' ? hoverCoord : null);

  return (
    <div className="crewlet-time-window__absolute">
      <div className="crewlet-time-window__cal-row">
        <Calendar
          year={leftMonth.year}
          month={leftMonth.month}
          rangeStart={fromCoord}
          rangeEnd={previewEnd}
          onSelectDate={pickDay}
          onHoverDate={setHoverCoord}
          onPrev={() => stepLeft(-1)}
        />
        <Calendar
          year={rightMonth.year}
          month={rightMonth.month}
          rangeStart={fromCoord}
          rangeEnd={previewEnd}
          onSelectDate={pickDay}
          onHoverDate={setHoverCoord}
          onNext={() => stepLeft(1)}
        />
      </div>

      <div className="crewlet-time-window__inputs">
        <div className="crewlet-time-window__field">
          <span className="crewlet-time-window__field-label">Start date and time</span>
          <div className="crewlet-time-window__field-row">
            <MaskedInput
              mask="YYYY/MM/DD"
              value={fromParsed ? formatDateOnly(fromParsed) : ''}
              onCommit={commitFromDate}
              digitFilter={dateDigitFilter}
              validate={isValidDateInput}
              segments={DATE_SEGMENTS}
              className="is-date"
              ariaLabel="Start date"
            />
            <MaskedInput
              mask="HH:MM:SS"
              value={fromParsed ? formatTimeOnly(fromParsed) : ''}
              onCommit={commitFromTime}
              digitFilter={timeDigitFilter}
              validate={isValidTimeInput}
              segments={TIME_SEGMENTS}
              className="is-time"
              ariaLabel="Start time"
            />
          </div>
        </div>
        <div className="crewlet-time-window__field">
          <span className="crewlet-time-window__field-label">End date and time</span>
          <div className="crewlet-time-window__field-row">
            <MaskedInput
              mask="YYYY/MM/DD"
              value={toParsed ? formatDateOnly(toParsed) : ''}
              onCommit={commitToDate}
              digitFilter={dateDigitFilter}
              validate={isValidDateInput}
              segments={DATE_SEGMENTS}
              className="is-date"
              ariaLabel="End date"
            />
            <MaskedInput
              mask="HH:MM:SS"
              value={toParsed ? formatTimeOnly(toParsed) : ''}
              onCommit={commitToTime}
              digitFilter={timeDigitFilter}
              validate={isValidTimeInput}
              segments={TIME_SEGMENTS}
              className="is-time"
              ariaLabel="End time"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Relative pane ────────────────────────────────────────── */

function RelativePane({ draft, setDraft }: PaneProps) {
  const m = draft.kind === 'relative' && draft.duration ? DURATION_RX.exec(draft.duration) : null;
  const draftN = m ? parseInt(m[1]!, 10) : 60;
  const draftUnit = m ? m[2]!.toLowerCase() : 'm';
  const draftDuration = draft.kind === 'relative' ? draft.duration : '';

  // Custom row inputs are local drafts; they push to the parent draft
  // on change so Apply commits whatever the operator last saw.
  const [customN, setCustomN] = useState<string>(String(draftN));
  const [customUnit, setCustomUnit] = useState<string>(draftUnit);

  useEffect(() => {
    if (m) {
      setCustomN(String(parseInt(m[1]!, 10)));
      setCustomUnit(m[2]!.toLowerCase());
    }
  }, [draftDuration]);

  const pickChip = (n: number, unit: string) => {
    setDraft({ kind: 'relative', duration: `${n}${unit}` });
  };

  const commitCustom = (n: string, unit: string) => {
    const parsedN = parseInt(n, 10);
    if (!Number.isFinite(parsedN) || parsedN <= 0) return;
    setDraft({ kind: 'relative', duration: `${parsedN}${unit}` });
  };

  return (
    <div className="crewlet-time-window__relative">
      {CHIP_GROUPS.map((group) => (
        <div key={group.unit} className="crewlet-time-window__chip-row">
          <span className="crewlet-time-window__chip-label">{group.label}</span>
          <div className="crewlet-time-window__chips">
            {group.values.map((n) => {
              const dur = `${n}${group.unit}`;
              const active = draftDuration === dur;
              return (
                <button
                  key={n}
                  type="button"
                  className={`crewlet-time-window__chip${active ? ' is-active' : ''}`}
                  onClick={() => pickChip(n, group.unit)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="crewlet-time-window__custom-row">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="crewlet-time-window__custom-input"
          value={customN}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, '');
            setCustomN(next);
            commitCustom(next, customUnit);
          }}
          aria-label="Custom amount"
        />
        <Select
          value={customUnit}
          onChange={(v) => {
            const unit = String(v);
            setCustomUnit(unit);
            commitCustom(customN, unit);
          }}
          options={[
            { value: 'm', label: 'Minutes' },
            { value: 'h', label: 'Hours' },
            { value: 'd', label: 'Days' },
            { value: 'w', label: 'Weeks' },
          ]}
          size="sm"
          ariaLabel="Custom unit"
        />
      </div>
    </div>
  );
}

/* ─── Masked YYYY/MM/DD and HH:MM:SS text input ────────────── */

/*
 * MaskedInput renders a single text input whose value is locked to a
 * fixed pattern (e.g. "YYYY/MM/DD" or "HH:MM:SS"). The separators (/
 * and :) are pinned in place: backspace deletes only the digit slot
 * before them, and the cursor steps over them when the operator
 * presses ArrowLeft / ArrowRight. Typing a digit at any cursor
 * position drops it into the next available digit slot and advances
 * the cursor past the trailing separator.
 *
 * The mask string defines the pattern: any A-Z character is a digit
 * slot (rendered as that letter when unfilled, e.g. "Y", "M", "D"),
 * any other character is a fixed separator. The display always
 * matches the mask in length, separator positions, and separator
 * characters.
 */
interface MaskedSegment {
  /** First mask position belonging to this segment (inclusive). */
  start: number;
  /** Last mask position belonging to this segment (inclusive). */
  end: number;
  /** Minimum integer value the segment can hold. */
  min: number;
  /** Maximum integer value the segment can hold. */
  max: number;
}

interface MaskedInputProps {
  mask: string;
  value: string;
  onCommit: (committed: string) => void;
  /**
   * Optional per-keystroke validator. Returns true if `digit` is
   * allowed at `position` given the in-progress `display` string.
   * Lets the caller reject obviously-invalid digits at type time
   * (e.g. a "9" at the first slot of YYYY, which can never produce
   * a 2000-2030 year).
   */
  digitFilter?: (digit: string, position: number, display: string) => boolean;
  /**
   * Optional on-blur validator. When supplied and returns false,
   * the input reverts to the projected value from `value` instead
   * of committing, so a partially-typed or out-of-range entry
   * doesn't propagate to the parent.
   */
  validate?: (committed: string) => boolean;
  /**
   * Optional segment list driving ArrowUp / ArrowDown behaviour.
   * When the caret sits inside one of these segments, Up / Down
   * increment / decrement the segment's numeric value clamped to
   * [min, max]. If the segment is empty (no digits typed yet),
   * either arrow seeds it with the minimum value.
   */
  segments?: MaskedSegment[];
  className?: string;
  ariaLabel?: string;
}

function MaskedInput({
  mask,
  value,
  onCommit,
  digitFilter,
  validate,
  segments,
  className,
  ariaLabel,
}: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isSepAt = (pos: number): boolean => {
    const c = mask[pos];
    return !!c && !/[A-Za-z]/.test(c);
  };

  // Project an incoming value (which may or may not have separators)
  // back into a mask-shaped display string. Digits land in digit slots;
  // separator chars in the value are skipped; unfilled slots show the
  // mask letter so the operator can still see "MM/DD" structure.
  const projectValueToDisplay = (v: string): string => {
    let out = '';
    let vi = 0;
    for (let i = 0; i < mask.length; i += 1) {
      if (isSepAt(i)) {
        out += mask[i];
        if (vi < v.length && v[vi] === mask[i]) vi += 1;
        continue;
      }
      // Digit slot. Skip non-digit chars in value.
      while (vi < v.length && !/\d/.test(v[vi]!)) vi += 1;
      if (vi < v.length) {
        out += v[vi];
        vi += 1;
      } else {
        out += mask[i];
      }
    }
    return out;
  };

  const [display, setDisplay] = useState<string>(() => projectValueToDisplay(value));

  // Re-sync the display whenever the external value flips (calendar
  // pick lands a new YYYY/MM/DD without the input being touched).
  useEffect(() => {
    setDisplay(projectValueToDisplay(value));
  }, [value]);

  // No typed digits = the mask letters are the only thing visible.
  // The is-empty class tints the whole text gray + opaque so the
  // operator reads it as ghost guidance, the way a placeholder
  // looks. Drops off the moment any digit lands.
  const hasAnyDigit = /\d/.test(display);

  // Find the next digit slot at or after `from`, returning -1 if none.
  const nextDigitSlot = (from: number): number => {
    let p = from;
    while (p < mask.length && isSepAt(p)) p += 1;
    return p < mask.length ? p : -1;
  };

  // Find the previous digit slot strictly before `from`, returning -1 if none.
  const prevDigitSlot = (from: number): number => {
    let p = from - 1;
    while (p >= 0 && isSepAt(p)) p -= 1;
    return p;
  };

  // Move the cursor after a state mutation; requestAnimationFrame lets
  // React commit the new value before we set selection.
  const setCursor = (pos: number) => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const pos = el.selectionStart ?? 0;

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const target = nextDigitSlot(pos);
      if (target < 0) return;
      // Per-position digit filter: a caller-supplied function vetoes
      // digits that would make the in-progress value definitively
      // invalid (e.g. "9" at YYYY position 0, since no 9xxx year
      // falls in the 2000-2030 range).
      if (digitFilter && !digitFilter(e.key, target, display)) {
        return;
      }
      const next = display.substring(0, target) + e.key + display.substring(target + 1);
      setDisplay(next);
      let cursor = target + 1;
      while (cursor < mask.length && isSepAt(cursor)) cursor += 1;
      setCursor(cursor);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const target = prevDigitSlot(pos);
      if (target < 0) return;
      // Unfill: replace the digit at target with its mask letter.
      const next = display.substring(0, target) + mask[target] + display.substring(target + 1);
      setDisplay(next);
      setCursor(target);
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      // Unfill the digit slot AT cursor (if any), don't move cursor.
      if (pos < mask.length && !isSepAt(pos)) {
        const next = display.substring(0, pos) + mask[pos] + display.substring(pos + 1);
        setDisplay(next);
      }
      return;
    }

    /*
     * ArrowUp / ArrowDown step the segment containing the caret.
     * If the segment already holds at least one digit, the value
     * increments / decrements by 1 (clamped to [min, max]). If the
     * segment is still showing mask letters, either arrow seeds it
     * with the minimum value, so the operator can spin a date or
     * time field up from its empty state without typing.
     */
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && segments && segments.length > 0) {
      // Find the segment that contains the caret. The caret can sit
      // anywhere from seg.start to seg.end + 1 (just past the last
      // digit, before the trailing separator).
      const seg = segments.find((s) => pos >= s.start && pos <= s.end + 1);
      if (!seg) return;
      e.preventDefault();
      const segText = display.substring(seg.start, seg.end + 1);
      const hasDigits = /\d/.test(segText);
      const width = seg.end - seg.start + 1;
      let nextVal: number;
      if (!hasDigits) {
        nextVal = seg.min;
      } else {
        // Treat any remaining mask letters as 0 so a partial fill
        // like "20YY" parses as 2000 before stepping.
        const numeric = segText.replace(/[^0-9]/g, '0');
        const current = parseInt(numeric, 10);
        nextVal = e.key === 'ArrowUp' ? current + 1 : current - 1;
        if (nextVal > seg.max) nextVal = seg.max;
        if (nextVal < seg.min) nextVal = seg.min;
      }
      const padded = String(nextVal).padStart(width, '0');
      const next =
        display.substring(0, seg.start) + padded + display.substring(seg.end + 1);
      setDisplay(next);
      // Park the caret at the end of the just-stepped segment so the
      // operator's next ArrowUp/Down keeps stepping the same field
      // without having to reach back into it.
      setCursor(seg.end + 1);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const target = prevDigitSlot(pos);
      setCursor(target < 0 ? 0 : target);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const target = nextDigitSlot(pos + 1);
      setCursor(target < 0 ? mask.length : target);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      const target = nextDigitSlot(0);
      setCursor(target < 0 ? 0 : target);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      // Land cursor after the last digit slot.
      let target = mask.length;
      while (target > 0 && isSepAt(target - 1)) target -= 1;
      setCursor(target);
      return;
    }

    // Let Tab and Enter / Escape flow naturally.
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') return;

    // Block all other characters (letters, symbols).
    e.preventDefault();
  };

  /*
   * Helper: park the caret at the leftmost digit slot. Called when
   * the field is still showing the bare mask (no digits typed), so
   * the operator's first keystroke always lands at the top-left
   * regardless of which character they clicked or where Tab
   * dropped them.
   */
  const snapToLeftmost = (el: HTMLInputElement) => {
    const target = nextDigitSlot(0);
    const pos = target < 0 ? 0 : target;
    el.setSelectionRange(pos, pos);
  };

  // On focus, if the field is empty/template, park the caret at the
  // leftmost digit slot so typing fills left-to-right.
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (!hasAnyDigit) {
      requestAnimationFrame(() => snapToLeftmost(el));
    }
  };

  // On click, if the field has no digits yet, force the caret to
  // the leftmost slot regardless of where the click landed. Once
  // the operator has started filling, fall back to the original
  // "snap to nearest digit slot if landed on a separator" behaviour.
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    requestAnimationFrame(() => {
      if (!hasAnyDigit) {
        snapToLeftmost(el);
        return;
      }
      const pos = el.selectionStart ?? 0;
      if (isSepAt(pos)) {
        const target = nextDigitSlot(pos);
        if (target >= 0) el.setSelectionRange(target, target);
      }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '');
    if (!digits) return;
    // Start at the current cursor's first digit slot and fill forward.
    const el = e.currentTarget;
    const startPos = nextDigitSlot(el.selectionStart ?? 0);
    if (startPos < 0) return;
    let out = display;
    let cursor = startPos;
    let di = 0;
    while (cursor < mask.length && di < digits.length) {
      if (!isSepAt(cursor)) {
        out = out.substring(0, cursor) + digits[di] + out.substring(cursor + 1);
        di += 1;
      }
      cursor += 1;
    }
    setDisplay(out);
    setCursor(cursor);
  };

  const handleBlur = () => {
    /*
     * Validate on blur. If the committed string is out of range
     * (or partial), revert the display to whatever the parent
     * value resolves to so the operator visibly sees the rejection
     * and the field doesn't propagate a bogus value upstream.
     */
    if (validate && !validate(display)) {
      setDisplay(projectValueToDisplay(value));
      return;
    }
    onCommit(display);
  };

  /*
   * Overlay characters. A single <input> can't paint different chars
   * in different colors, so we render a per-char overlay on top of
   * the input (which itself draws transparent text + a visible
   * caret). Identical font, padding, and tabular-nums on both
   * surfaces keep the overlay glyphs aligned with the input caret
   * pixel-for-pixel.
   *
   * Each character is either "bright" (primary text color) or
   * "muted" (tertiary gray, the same treatment as unfilled mask
   * letters). For digit slots, brightness follows whether a digit
   * was typed. For separators, brightness follows whether the
   * preceding segment is fully filled, so "/" in "2026/MM/DD"
   * brightens (YYYY is complete) but the next "/" stays gray
   * (MM is still placeholders).
   */
  const isPrecedingSegmentFilled = (sepPos: number): boolean => {
    for (let p = sepPos - 1; p >= 0; p -= 1) {
      if (isSepAt(p)) break;
      if (!/\d/.test(display[p] || '')) return false;
    }
    return true;
  };

  const overlay = display.split('').map((ch, i) => {
    const sep = isSepAt(i);
    const bright = sep ? isPrecedingSegmentFilled(i) : /\d/.test(ch);
    return (
      <span
        key={i}
        className={`crewlet-time-window__masked-char ${bright ? 'is-digit' : 'is-mask'}`}
      >
        {ch}
      </span>
    );
  });

  // is-empty stays on the wrapper too so consumers can target either
  // state if they need to; it no longer drives input text color
  // (the overlay handles that per-char), but it's a useful hook for
  // any caller wanting to dim the whole field.
  const wrapClass = [
    'crewlet-time-window__masked-wrap',
    className || '',
    hasAnyDigit ? '' : 'is-empty',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClass}>
      <input
        ref={inputRef}
        type="text"
        className="crewlet-time-window__text-input"
        value={display}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onClick={handleClick}
        onPaste={handlePaste}
        onChange={() => { /* controlled via keydown / paste */ }}
        onBlur={handleBlur}
        aria-label={ariaLabel}
      />
      <div className="crewlet-time-window__masked-overlay" aria-hidden>
        {overlay}
      </div>
    </div>
  );
}
