import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { cx } from '../utils/cx.js';

/** A day, with the month 0-based as `Date` has it. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export const sameDay = (a: CalendarDate, b: CalendarDate): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day;

/** Negative when `a` is earlier, positive when later, zero on the same day. */
export function compareDays(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/** The same day shifted by `days`, rolling over months and years. */
export function shiftDay(date: CalendarDate, days: number): CalendarDate {
  const moved = new Date(date.year, date.month, date.day + days);
  return { year: moved.getFullYear(), month: moved.getMonth(), day: moved.getDate() };
}

/** The same day in another month, clamped to that month's length. */
export function shiftMonth(date: CalendarDate, months: number): CalendarDate {
  const target = new Date(date.year, date.month + months, 1);
  const year = target.getFullYear();
  const month = target.getMonth();
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export const today = (): CalendarDate => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const WEEKDAY_MARKS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarGridProps {
  /** Names the grid. A month grid with no name is announced as "grid". */
  label: string;
  /** The month on screen. */
  year: number;
  month: number;
  /** Where the roving focus is. It is a DAY, and it may be outside the month on screen. */
  focused: CalendarDate;
  onFocusedChange: (next: CalendarDate) => void;
  /** Asked for when the focus walks out of the month on screen. */
  onMonthChange?: ((year: number, month: number) => void) | undefined;
  /** Taking a day. A disabled day never reaches this. */
  onSelect: (date: CalendarDate) => void;
  /** The chosen days: one, or the two ends of a range. */
  selected?: readonly CalendarDate[] | undefined;
  /** Whether a day lies strictly inside the chosen range. */
  inRange?: ((date: CalendarDate) => boolean) | undefined;
  /** Whether a day may be taken. A disabled day stays focusable, and says so. */
  isDisabled?: ((date: CalendarDate) => boolean) | undefined;
  onHover?: ((date: CalendarDate | null) => void) | undefined;
  /** 0 is Sunday (the United States), 1 is Monday (ISO 8601). */
  firstDayOfWeek?: 0 | 1;
  /** Whether the days either side of the month are drawn. */
  showOutsideDays?: boolean;
  /** What a day is CALLED. The full date, because "3" names nothing on its own. */
  dayLabel?: ((date: CalendarDate) => string) | undefined;
  monthNames?: readonly string[];
  weekdayNames?: readonly string[];
  weekdayMarks?: readonly string[];
  className?: string;
}

const cellId = (date: CalendarDate) => `${date.year}-${date.month}-${date.day}`;

/**
 * A month of days, as a real grid.
 *
 * WHAT IT REPLACES. Two pickers drew 42 buttons in a row and called the
 * container a grid. The role was a claim the markup did not keep: a grid
 * holds rows and a gridcell sits in one, so a screen reader told it was
 * reading a grid found no rows to move between, and axe refused the role
 * outright. Every one of those buttons was also its own tab stop, so a
 * keyboard user reached the day after next by pressing Tab forty times, and
 * no arrow key did anything at all.
 *
 * THE RULES IT KEEPS.
 *
 * - ONE TAB STOP for the whole month, with the arrows moving inside it: Left
 *   and Right a day, Up and Down a week, Home and End the ends of the week,
 *   Page a month and Shift+Page a year. Walking out of the month on screen
 *   turns the page rather than stopping at the edge.
 * - A DAY IS CALLED BY ITS DATE. "3" names nothing: a reader arrowing across
 *   a month heard a run of numbers with no month, no weekday and no year in
 *   any of them.
 * - THE STATE IS EXPOSED, not just drawn: `aria-selected` on the chosen days
 *   and `aria-current="date"` on today, which is the difference between a
 *   ring somebody can see and a fact somebody can hear.
 * - A DISABLED DAY STAYS FOCUSABLE and says it is disabled. Skipped instead,
 *   a month whose first half is out of bounds swallows every arrow press
 *   until the keyboard happens to land somewhere allowed.
 * - A RANGE IS ONE BAND, not two chips and some tinted squares. The grid asks
 *   `inRange` about each chosen day's NEIGHBOURS to learn which end it is, so
 *   the band's ends are drawn closed and its middle is drawn open. Nothing new
 *   is passed in for it: two more props naming the ends would be a second
 *   statement of the range that could disagree with `inRange` about where it
 *   stops.
 * - A PADDING CELL IS AN EMPTY CELL, not a hidden one. Where the days either
 *   side of the month are not drawn (`showOutsideDays: false`, which is what
 *   a two-month range view uses), the cell still has to be a `gridcell`: a
 *   `row` whose cells are all `aria-hidden` owns nothing, which is a grid
 *   with rows a screen reader cannot read and an axe violation
 *   (`aria-required-children`) with it. It carries no name, no state and no
 *   tab stop, because there is no day there to name, tint or move to.
 */
export function CalendarGrid({
  label,
  year,
  month,
  focused,
  onFocusedChange,
  onMonthChange,
  onSelect,
  selected,
  inRange,
  isDisabled,
  onHover,
  firstDayOfWeek = 0,
  showOutsideDays = true,
  dayLabel,
  monthNames = MONTH_NAMES,
  weekdayNames = WEEKDAY_NAMES,
  weekdayMarks = WEEKDAY_MARKS,
  className,
}: CalendarGridProps) {
  const grid = useRef<HTMLDivElement | null>(null);

  const weeks = useMemo(() => {
    const total = daysInMonth(year, month);
    const lead = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
    const cells: { date: CalendarDate; inMonth: boolean }[] = [];
    for (let i = 0; i < lead; i += 1) {
      cells.push({ date: shiftDay({ year, month, day: 1 }, i - lead), inMonth: false });
    }
    for (let day = 1; day <= total; day += 1) cells.push({ date: { year, month, day }, inMonth: true });
    while (cells.length % 7 !== 0 || cells.length < 42) {
      cells.push({ date: shiftDay({ year, month, day: total }, cells.length - lead - total + 1), inMonth: false });
    }
    const rows: (typeof cells)[] = [];
    for (let at = 0; at < cells.length; at += 7) rows.push(cells.slice(at, at + 7));
    return rows;
  }, [year, month, firstDayOfWeek]);

  const now = useMemo(today, []);

  /*
   * WHERE THIS GRID'S ONE TAB STOP GOES.
   *
   * Normally the focused day, which is the whole point of a roving tabindex.
   * But `focused` is shared by every grid a caller draws (a range view draws
   * two months against one focus), and a day that is padding HERE is not a
   * day this grid can hand focus to. Without the fallback the second month of
   * a range view is unreachable by Tab, and the day the first month is focused
   * on reappears there as an empty padding cell holding a second tab stop that
   * a reader lands on and hears nothing from.
   */
  const stop = useMemo(() => {
    const cells = weeks.flat().filter((cell) => cell.inMonth || showOutsideDays);
    return cells.find((cell) => sameDay(cell.date, focused))?.date ?? cells[0]?.date;
  }, [weeks, showOutsideDays, focused]);

  /*
   * FOCUS FOLLOWS THE DAY THE KEYBOARD MOVED TO, and only then: moving it from
   * any render would steal focus from whatever a reader was using each time
   * the month changed underneath them.
   *
   * The flag is what makes a page turn work. Walking off the end of a month
   * replaces every cell in the grid, so the element focus was on is removed
   * and the browser drops focus on the page body: an effect that only restored
   * focus when it was ALREADY inside the grid would find it gone and leave it
   * there, one arrow press from the end of the month.
   */
  const moving = useRef(false);

  useEffect(() => {
    const box = grid.current;
    if (!box) return;
    const inside = moving.current || box.contains(document.activeElement);
    moving.current = false;
    if (!inside) return;
    box.querySelector<HTMLElement>(`[data-day="${cellId(focused)}"]`)?.focus();
  }, [focused]);

  function goTo(next: CalendarDate, byKey = false) {
    moving.current = moving.current || byKey;
    onFocusedChange(next);
    if (next.year !== year || next.month !== month) onMonthChange?.(next.year, next.month);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, date: CalendarDate) {
    const step = (days: number) => {
      event.preventDefault();
      goTo(shiftDay(date, days), true);
    };
    switch (event.key) {
      case 'ArrowLeft':
        return step(-1);
      case 'ArrowRight':
        return step(1);
      case 'ArrowUp':
        return step(-7);
      case 'ArrowDown':
        return step(7);
      case 'Home': {
        event.preventDefault();
        const from = (new Date(date.year, date.month, date.day).getDay() - firstDayOfWeek + 7) % 7;
        return goTo(shiftDay(date, -from), true);
      }
      case 'End': {
        event.preventDefault();
        const from = (new Date(date.year, date.month, date.day).getDay() - firstDayOfWeek + 7) % 7;
        return goTo(shiftDay(date, 6 - from), true);
      }
      case 'PageUp':
        event.preventDefault();
        return goTo(shiftMonth(date, event.shiftKey ? -12 : -1), true);
      case 'PageDown':
        event.preventDefault();
        return goTo(shiftMonth(date, event.shiftKey ? 12 : 1), true);
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isDisabled?.(date)) onSelect(date);
        return;
      default:
        return;
    }
  }

  const nameOf = (date: CalendarDate) =>
    dayLabel
      ? dayLabel(date)
      : `${weekdayNames[new Date(date.year, date.month, date.day).getDay()]} ${date.day} ${monthNames[date.month]} ${date.year}`;

  return (
    <div
      ref={grid}
      role="grid"
      aria-label={label}
      /* A programmatic target, so focus has somewhere to land on a month
         whose every day is out of bounds. Never a tab stop: the days are. */
      tabIndex={-1}
      className={cx('crewlet-calendar', className)}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <div role="row" className="crewlet-calendar__weekdays">
        {weekdayMarks.map((_mark, at) => {
          const weekday = (at + firstDayOfWeek) % 7;
          return (
            <span
              key={weekday}
              role="columnheader"
              // The mark is two letters and the column is a weekday: the name
              // is the word, so a reader is never told a column is called "Tu".
              aria-label={weekdayNames[weekday]}
              className="crewlet-calendar__weekday"
            >
              {weekdayMarks[weekday]}
            </span>
          );
        })}
      </div>
      {weeks.map((week) => (
        <div role="row" key={cellId(week[0]!.date)} className="crewlet-calendar__week">
          {week.map(({ date, inMonth }) => {
            /*
             * An empty cell, so the row still owns seven gridcells. It draws
             * no day, so it takes no name, no selected or in-range tint and
             * no tab stop: the same date IS a day in the month beside this
             * one, and tinting it here would paint a coloured blank square at
             * a month boundary.
             */
            if (!inMonth && !showOutsideDays) {
              return (
                <span
                  key={cellId(date)}
                  role="gridcell"
                  className="crewlet-calendar__day is-blank"
                />
              );
            }
            const disabled = isDisabled?.(date) ?? false;
            const chosen = selected?.some((day) => sameDay(day, date)) ?? false;
            const between = !chosen && (inRange?.(date) ?? false);
            const isToday = sameDay(date, now);
            /*
             * WHICH END OF THE RANGE THIS IS, asked of the range itself rather
             * than taken as two more props. A chosen day whose NEXT day lies
             * inside the range opens it; one whose PREVIOUS day does closes it.
             * A single chosen day answers neither, which is right: there is no
             * band to join, so it stays a chip.
             */
            const opensRange = chosen && (inRange?.(shiftDay(date, 1)) ?? false);
            const closesRange = chosen && (inRange?.(shiftDay(date, -1)) ?? false);
            return (
              <span
                key={cellId(date)}
                role="gridcell"
                data-day={cellId(date)}
                aria-label={nameOf(date)}
                aria-selected={chosen}
                aria-disabled={disabled || undefined}
                aria-current={isToday ? 'date' : undefined}
                tabIndex={stop && sameDay(date, stop) ? 0 : -1}
                className={cx(
                  'crewlet-calendar__day',
                  !inMonth && 'is-outside',
                  disabled && 'is-disabled',
                  chosen && 'is-selected',
                  between && 'is-in-range',
                  opensRange && 'is-range-start',
                  closesRange && 'is-range-end',
                  isToday && 'is-today',
                )}
                onClick={() => {
                  if (disabled) return;
                  goTo(date);
                  onSelect(date);
                }}
                onKeyDown={(event) => onKeyDown(event, date)}
                onMouseEnter={onHover && !disabled ? () => onHover(date) : undefined}
              >
                {date.day}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
