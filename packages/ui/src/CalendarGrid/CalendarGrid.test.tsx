/**
 * A month as a real grid: what a day is called, what it says about itself,
 * and what the keyboard can do with it.
 *
 * Both pickers used to draw 42 buttons in a row under a `grid` role with no
 * rows in it, each one its own tab stop, none of them answering an arrow key,
 * and every one of them named by the number on it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { CalendarGrid, compareDays, shiftDay, type CalendarDate } from './CalendarGrid.js';

afterEach(cleanup);

/** March 2026 begins on a Sunday, so the grid starts with no leading days. */
const MARCH = { year: 2026, month: 2 };

function Month({
  onSelect = () => {},
  isDisabled,
  selected = [],
}: {
  onSelect?: (date: CalendarDate) => void;
  isDisabled?: (date: CalendarDate) => boolean;
  selected?: CalendarDate[];
}) {
  const [view, setView] = useState(MARCH);
  const [focused, setFocused] = useState<CalendarDate>({ ...MARCH, day: 10 });
  return (
    <>
      <CalendarGrid
        label="March 2026"
        year={view.year}
        month={view.month}
        focused={focused}
        onFocusedChange={setFocused}
        onMonthChange={(year, month) => setView({ year, month })}
        onSelect={onSelect}
        selected={selected}
        isDisabled={isDisabled}
      />
      <pre data-testid="view">{`${view.year}-${view.month}`}</pre>
    </>
  );
}

const grid = () => screen.getByRole('grid', { name: 'March 2026' });
const day = (name: string) => screen.getByRole('gridcell', { name });
const view = () => screen.getByTestId('view').textContent;

test('the grid holds rows, and a day is called by its full date', () => {
  render(<Month />);
  const rows = within(grid()).getAllByRole('row');
  // Six weeks plus the weekday header, seven cells across.
  expect(rows).toHaveLength(7);
  expect(within(rows[1]!).getAllByRole('gridcell')).toHaveLength(7);
  expect(day('Tuesday 10 March 2026')).toBeTruthy();
  // The weekday columns are named by the word, not by the two letters drawn.
  expect(within(grid()).getByRole('columnheader', { name: 'Tuesday' }).textContent).toBe('Tu');
});

test('one tab stop, and the arrows move a day and a week inside it', () => {
  render(<Month />);
  const cells = within(grid()).getAllByRole('gridcell');
  expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);

  const start = day('Tuesday 10 March 2026');
  start.focus();
  fireEvent.keyDown(start, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(day('Wednesday 11 March 2026'));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(day('Wednesday 18 March 2026'));
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(document.activeElement).toBe(day('Sunday 15 March 2026'));
  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(document.activeElement).toBe(day('Saturday 21 March 2026'));
});

test('Page turns the month, and Shift+Page the year', () => {
  render(<Month />);
  const start = day('Tuesday 10 March 2026');
  start.focus();
  fireEvent.keyDown(start, { key: 'PageDown' });
  expect(view()).toBe('2026-3');
  fireEvent.keyDown(document.activeElement!, { key: 'PageUp', shiftKey: true });
  expect(view()).toBe('2025-3');
});

test('walking off the end of the month turns the page rather than stopping', () => {
  render(<Month />);
  const last = day('Tuesday 31 March 2026');
  last.focus();
  fireEvent.keyDown(last, { key: 'ArrowRight' });
  expect(view()).toBe('2026-3');
  expect(document.activeElement).toBe(day('Wednesday 1 April 2026'));
});

test('Enter and Space take the focused day, and a press takes the pressed one', () => {
  const onSelect = vi.fn();
  render(<Month onSelect={onSelect} />);
  const start = day('Tuesday 10 March 2026');
  start.focus();
  fireEvent.keyDown(start, { key: 'Enter' });
  expect(onSelect).toHaveBeenLastCalledWith({ year: 2026, month: 2, day: 10 });
  fireEvent.keyDown(start, { key: ' ' });
  expect(onSelect).toHaveBeenCalledTimes(2);
  fireEvent.click(day('Friday 20 March 2026'));
  expect(onSelect).toHaveBeenLastCalledWith({ year: 2026, month: 2, day: 20 });
});

test('the chosen day says it is chosen, and today says it is today', () => {
  const now = new Date();
  render(
    <CalendarGrid
      label="This month"
      year={now.getFullYear()}
      month={now.getMonth()}
      focused={{ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }}
      onFocusedChange={() => {}}
      onSelect={() => {}}
      selected={[{ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }]}
    />,
  );
  const cells = screen.getAllByRole('gridcell');
  const chosen = cells.filter((cell) => cell.getAttribute('aria-selected') === 'true');
  expect(chosen).toHaveLength(1);
  expect(chosen[0]!.getAttribute('aria-current')).toBe('date');
});

test('a day out of bounds says so, stays focusable, and refuses to be taken', () => {
  const onSelect = vi.fn();
  const floor: CalendarDate = { ...MARCH, day: 10 };
  render(<Month onSelect={onSelect} isDisabled={(date) => compareDays(date, floor) < 0} />);
  const refused = day('Monday 9 March 2026');
  expect(refused.getAttribute('aria-disabled')).toBe('true');

  fireEvent.click(refused);
  expect(onSelect).not.toHaveBeenCalled();

  // Focusable, because a month whose first half is out of bounds would
  // otherwise swallow every arrow press until the keyboard found a way in.
  const start = day('Tuesday 10 March 2026');
  start.focus();
  fireEvent.keyDown(start, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(refused);
  fireEvent.keyDown(refused, { key: 'Enter' });
  expect(onSelect).not.toHaveBeenCalled();
});

test('the ends of a range are drawn as ends, and one chosen day is not', () => {
  const inRange = (date: CalendarDate) =>
    compareDays(date, { ...MARCH, day: 10 }) > 0 && compareDays(date, { ...MARCH, day: 14 }) < 0;
  const { rerender } = render(
    <CalendarGrid
      label="March 2026"
      year={MARCH.year}
      month={MARCH.month}
      focused={{ ...MARCH, day: 10 }}
      onFocusedChange={() => {}}
      onSelect={() => {}}
      selected={[
        { ...MARCH, day: 10 },
        { ...MARCH, day: 14 },
      ]}
      inRange={inRange}
    />,
  );
  // The band opens on the 10th and closes on the 14th, and neither end is the
  // other: a run tinted at both ends alike reads as two separate chips.
  expect(day('Tuesday 10 March 2026').className).toContain('is-range-start');
  expect(day('Tuesday 10 March 2026').className).not.toContain('is-range-end');
  expect(day('Saturday 14 March 2026').className).toContain('is-range-end');
  expect(day('Saturday 14 March 2026').className).not.toContain('is-range-start');
  expect(day('Thursday 12 March 2026').className).toContain('is-in-range');

  // One day, no band. Nothing to join, so it stays a chip with its own corner.
  rerender(
    <CalendarGrid
      label="March 2026"
      year={MARCH.year}
      month={MARCH.month}
      focused={{ ...MARCH, day: 10 }}
      onFocusedChange={() => {}}
      onSelect={() => {}}
      selected={[{ ...MARCH, day: 10 }]}
    />,
  );
  expect(day('Tuesday 10 March 2026').className).not.toContain('is-range-start');
  expect(day('Tuesday 10 March 2026').className).not.toContain('is-range-end');
});

test('a day shifted across a month boundary lands on the right day', () => {
  expect(shiftDay({ year: 2026, month: 1, day: 28 }, 1)).toEqual({ year: 2026, month: 2, day: 1 });
  expect(shiftDay({ year: 2026, month: 0, day: 1 }, -1)).toEqual({ year: 2025, month: 11, day: 31 });
});

/*
 * The two-month case: one focus shared by two grids, with the days either
 * side of each month left undrawn. It is what a range view draws, and it is
 * where the padding cells stopped being cells at all.
 */
function TwoMonths() {
  const [focused, setFocused] = useState<CalendarDate>({ ...MARCH, day: 31 });
  return (
    <>
      {[MARCH, { year: 2026, month: 3 }].map((month) => (
        <CalendarGrid
          key={month.month}
          label={month.month === 2 ? 'March 2026' : 'April 2026'}
          year={month.year}
          month={month.month}
          focused={focused}
          onFocusedChange={setFocused}
          onSelect={() => {}}
          selected={[{ ...MARCH, day: 31 }]}
          showOutsideDays={false}
        />
      ))}
    </>
  );
}

test('a padding cell is an empty gridcell, so every row still owns seven', () => {
  render(<TwoMonths />);
  for (const box of screen.getAllByRole('grid')) {
    for (const row of within(box).getAllByRole('row')) {
      // Header rows hold columnheaders; every week row holds seven cells,
      // padding included. A row that owned none is a grid with rows nothing
      // can read, which is what `aria-required-children` refuses.
      const cells = within(row).queryAllByRole('gridcell');
      if (cells.length > 0) expect(cells).toHaveLength(7);
    }
  }
  expect(document.querySelectorAll('[aria-hidden="true"].crewlet-calendar__day')).toHaveLength(0);
});

test('a padding cell is never a tab stop, and each grid keeps one of its own', () => {
  render(<TwoMonths />);
  const grids = screen.getAllByRole('grid');
  for (const box of grids) {
    const stops = box.querySelectorAll('.crewlet-calendar__day[tabindex="0"]');
    expect(stops).toHaveLength(1);
    // Never the blank one: 31 March is padding in April's grid, and a reader
    // tabbing into that month landed on an empty cell with no name.
    expect(stops[0]!.classList.contains('is-blank')).toBe(false);
    expect(stops[0]!.getAttribute('aria-label')).toBeTruthy();
  }
  // March keeps the focused day; April falls back to its own first drawn day.
  expect(grids[1]!.querySelector('.crewlet-calendar__day[tabindex="0"]')!.getAttribute('aria-label')).toBe(
    'Wednesday 1 April 2026',
  );
});

test('a padding cell takes no tint from the day it stands in for', () => {
  render(<TwoMonths />);
  const tinted = [...document.querySelectorAll('.crewlet-calendar__day.is-blank')].filter((cell) =>
    ['is-selected', 'is-in-range', 'is-today'].some((state) => cell.classList.contains(state)),
  );
  expect(tinted).toHaveLength(0);
});
