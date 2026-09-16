import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  CalendarGrid,
  compareDays,
  shiftMonth,
  today,
  type CalendarDate,
} from '@crewlethq/ui';

const meta: Meta<typeof CalendarGrid> = {
  title: 'UI/CalendarGrid',
  component: CalendarGrid,
};

export default meta;
type Story = StoryObj<typeof CalendarGrid>;

const MONTHS = [
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

const name = (month: CalendarDate) => `${MONTHS[month.month]} ${month.year}`;

/**
 * One month, and the whole of a picker's keyboard.
 *
 * One tab stop for the grid: Left and Right move a day, Up and Down a week,
 * Home and End the ends of the week, Page a month and Shift+Page a year, and
 * walking off the end of the month turns the page. Every day is named by its
 * full date, because "3" names nothing on its own.
 */
export const OneMonth: Story = {
  render: () => {
    function Demo() {
      const now = today();
      const [view, setView] = useState<CalendarDate>(now);
      const [focused, setFocused] = useState<CalendarDate>(now);
      const [chosen, setChosen] = useState<CalendarDate | null>(null);
      return (
        <div style={{ width: 260 }}>
          <p style={{ fontSize: 13, marginBottom: 8 }}>{name(view)}</p>
          <CalendarGrid
            label={name(view)}
            year={view.year}
            month={view.month}
            focused={focused}
            onFocusedChange={setFocused}
            onMonthChange={(year, month) => setView({ year, month, day: 1 })}
            onSelect={setChosen}
            selected={chosen ? [chosen] : []}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * Two months against one focus, which is what a range view draws. The days
 * either side of each month are left undrawn: those cells still count as
 * cells, so every row is a row a screen reader can read, but they take no
 * name, no tint and no tab stop, because there is no day there.
 *
 * Take two days and the range is drawn as one band: its ends keep their own
 * corner and its middle runs flat between them, across the gap the cells sit
 * apart and across the weeks it spans.
 */
export const TwoMonths: Story = {
  render: () => {
    function Demo() {
      const now = today();
      const [view, setView] = useState<CalendarDate>(now);
      const [focused, setFocused] = useState<CalendarDate>(now);
      const [range, setRange] = useState<CalendarDate[]>([]);
      const take = (date: CalendarDate) =>
        setRange((held) => (held.length === 1 ? [held[0]!, date].sort(compareDays) : [date]));
      const between = (date: CalendarDate) =>
        range.length === 2 && compareDays(date, range[0]!) > 0 && compareDays(date, range[1]!) < 0;
      return (
        <div style={{ display: 'flex', gap: 24 }}>
          {[view, shiftMonth(view, 1)].map((month) => (
            <div key={`${month.year}-${month.month}`} style={{ width: 240 }}>
              <p style={{ fontSize: 13, marginBottom: 8 }}>{name(month)}</p>
              <CalendarGrid
                label={name(month)}
                year={month.year}
                month={month.month}
                focused={focused}
                onFocusedChange={setFocused}
                onMonthChange={(year, at) => setView({ year, month: at, day: 1 })}
                onSelect={take}
                selected={range}
                inRange={between}
                showOutsideDays={false}
              />
            </div>
          ))}
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * Bounded. A day out of range says it is disabled and refuses to be taken,
 * and it stays focusable: skipped instead, a month whose first half is out of
 * bounds swallows every arrow press.
 */
export const Bounded: Story = {
  render: () => {
    function Demo() {
      const now = today();
      const floor: CalendarDate = { ...now, day: Math.min(now.day, 10) };
      const [focused, setFocused] = useState<CalendarDate>(floor);
      const [chosen, setChosen] = useState<CalendarDate | null>(null);
      return (
        <div style={{ width: 260 }}>
          <CalendarGrid
            label={name(now)}
            year={now.year}
            month={now.month}
            focused={focused}
            onFocusedChange={setFocused}
            onSelect={setChosen}
            selected={chosen ? [chosen] : []}
            isDisabled={(date) => compareDays(date, floor) < 0}
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/** The ISO week, which starts on Monday. */
export const MondayFirst: Story = {
  render: () => {
    function Demo() {
      const now = today();
      const [focused, setFocused] = useState<CalendarDate>(now);
      return (
        <div style={{ width: 260 }}>
          <CalendarGrid
            label={name(now)}
            year={now.year}
            month={now.month}
            focused={focused}
            onFocusedChange={setFocused}
            onSelect={() => {}}
            firstDayOfWeek={1}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
