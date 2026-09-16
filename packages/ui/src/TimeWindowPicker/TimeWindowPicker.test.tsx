/**
 * A window of time: the windows it offers by name, what it says is selected,
 * the year it accepts, the dates it refuses, and what its masked boxes say out
 * loud.
 *
 * Four of these are the probe cases inverted. The year was capped at 2030, so
 * this field would have stopped accepting the current year on the first of
 * January 2031, by refusing the keystroke, with nothing on screen to say why.
 * 31 February and 24:60:60 both passed their range checks and were handed to
 * `Date`, which rolled them into the next month and the next morning. And the
 * mask letters were the input's own value, so a screen reader read the
 * template out as the content.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import {
  TimeWindowPicker,
  describeTimeWindow,
  isTimeWindowSet,
  resolveTimeWindow,
  type TimeWindowValue,
} from './TimeWindowPicker.js';
import { isRealDate, isRealTime, project, stepSegment, DATE_MASK, DATE_SEGMENTS } from './mask.js';

afterEach(cleanup);

function Window({
  initial = { kind: 'relative', duration: '1h' } as TimeWindowValue,
  onApply = () => {},
  ...rest
}: { initial?: TimeWindowValue; onApply?: (value: TimeWindowValue) => void } & Partial<
  React.ComponentProps<typeof TimeWindowPicker>
>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TimeWindowPicker
        value={value}
        onChange={(next) => {
          setValue(next);
          onApply(next);
        }}
        {...rest}
      />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

/** The trigger, found by the half of its name that never changes. */
const trigger = () => screen.getByRole('button', { name: /^Time window:/ });
const open = () => fireEvent.click(trigger());
const held = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as TimeWindowValue;
const rail = () => screen.getByRole('radiogroup', { name: 'Relative windows' });

test('the year has no ceiling: 2031 and beyond are accepted', () => {
  // The case that dated the old field. It refused the keystroke, so there was
  // nothing on screen to say the year could not be typed.
  expect(project(DATE_MASK, '20310415')).toBe('2031/04/15');
  expect(isRealDate('2031/04/15')).toBe(true);
  expect(isRealDate('2087/12/31')).toBe(true);
});

test('a date that does not exist is refused, whatever its ranges say', () => {
  expect(isRealDate('2026/02/31')).toBe(false);
  expect(isRealDate('2026/04/31')).toBe(false);
  expect(isRealDate('2027/02/29')).toBe(false);
  // And a leap day that does exist is not.
  expect(isRealDate('2028/02/29')).toBe(true);
});

test('an hour is 0 to 23 and a minute is 0 to 59, so 24:60:60 is not a time', () => {
  expect(isRealTime('24:60:60')).toBe(false);
  expect(isRealTime('23:59:59')).toBe(true);
  expect(isRealTime('24:00:00')).toBe(false);
});

test('a segment steps within its own range and seeds an empty one', () => {
  expect(stepSegment(DATE_MASK, '2026/03/10', DATE_SEGMENTS[1]!, 1)).toBe('2026/04/10');
  // Clamped at the top of the month rather than rolling into the next year.
  expect(stepSegment(DATE_MASK, '2026/12/10', DATE_SEGMENTS[1]!, 1)).toBe('2026/12/10');
  // An empty field seeds the first segment with its minimum.
  expect(stepSegment(DATE_MASK, '', DATE_SEGMENTS[0]!, 1)).toBe('0001');
});

test('the masked box holds what was typed, and never reads the template out', () => {
  render(<Window initial={{ kind: 'absolute', from: '2026-03-10T00:00:00' }} />);
  open();
  const start = screen.getByRole('textbox', { name: 'Start date' }) as HTMLInputElement;
  expect(start.value).toBe('2026/03/10');

  const end = screen.getByRole('textbox', { name: 'End date' }) as HTMLInputElement;
  // Empty, rather than holding "YYYY/MM/DD" as its value: the shape a reader
  // can see is an overlay, and nothing hears it.
  expect(end.value).toBe('');
  expect(screen.getAllByText('YYYY/MM/DD')[0]!.getAttribute('aria-hidden')).toBe('true');
});

test('a key with no character of its own is left alone, and a letter is refused', () => {
  render(<Window initial={{ kind: 'absolute', from: '2026-03-10T00:00:00' }} />);
  open();
  const start = screen.getByRole('textbox', { name: 'Start date' });
  // Every one of these was swallowed, which took Enter, Tab, an input method's
  // own keys and every application shortcut with them.
  expect(fireEvent.keyDown(start, { key: 'Enter' })).toBe(true);
  expect(fireEvent.keyDown(start, { key: 'Tab' })).toBe(true);
  expect(fireEvent.keyDown(start, { key: 'a', ctrlKey: true })).toBe(true);
  expect(fireEvent.keyDown(start, { key: 'Process', keyCode: 229 })).toBe(true);
  // A letter is not a date.
  expect(fireEvent.keyDown(start, { key: 'q' })).toBe(false);
});

test('a partial or impossible entry rolls back rather than travelling', () => {
  render(<Window initial={{ kind: 'absolute', from: '2026-03-10T00:00:00' }} />);
  open();
  const start = screen.getByRole('textbox', { name: 'Start date' }) as HTMLInputElement;
  fireEvent.change(start, { target: { value: '20260231' } });
  expect(start.value).toBe('2026/02/31');
  fireEvent.blur(start);
  expect(start.value).toBe('2026/03/10');

  fireEvent.change(start, { target: { value: '2026' } });
  fireEvent.blur(start);
  expect(start.value).toBe('2026/03/10');
});

/*
 * The design the owner asked for: the windows a reader picks by name, on the
 * panel, beside the calendar rather than behind a tab. The pane this replaces
 * offered "Last 7 days" as a 7 in a row headed Days, one tab switch away.
 */
test('the panel offers the windows a reader picks, by name and all at once', () => {
  render(<Window />);
  open();
  expect(
    within(rail())
      .getAllByRole('radio')
      .map((row) => row.textContent),
  ).toEqual([
    'Last 15 minutes',
    'Last hour',
    'Last 4 hours',
    'Today',
    'Yesterday',
    'Last 24 hours',
    'Last 7 days',
    'Last 30 days',
  ]);
  // Beside, not behind: the calendars are on screen with the rail, and there
  // is no row of tabs to switch between the two.
  expect(screen.getAllByRole('grid')).toHaveLength(2);
  expect(screen.queryByRole('tab')).toBeNull();
});

test('the rail is one tab stop the arrows move along, and the window follows', () => {
  render(<Window />);
  open();
  const rows = within(rail()).getAllByRole('radio');
  // One stop for the whole group, on the window that is on.
  expect(rows.filter((row) => row.tabIndex === 0).map((row) => row.textContent)).toEqual(['Last hour']);
  expect(screen.getByRole('radio', { name: 'Last hour' }).getAttribute('aria-checked')).toBe('true');

  const from = screen.getByRole('radio', { name: 'Last hour' });
  from.focus();
  fireEvent.keyDown(from, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Last 4 hours' }));
  expect(screen.getByRole('radio', { name: 'Last 4 hours' }).getAttribute('aria-checked')).toBe('true');

  fireEvent.keyDown(document.activeElement!, { key: 'End' });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Last 30 days' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Home' });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Last 15 minutes' }));
  expect(screen.getByRole('radio', { name: 'Last 15 minutes' }).getAttribute('aria-checked')).toBe('true');
});

test('taking a named window fills the calendar and the boxes with what it means', () => {
  render(<Window />);
  open();
  fireEvent.click(screen.getByRole('radio', { name: 'Yesterday' }));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, '0');

  // THE TWO SIDES SAY THE SAME THING. A relative window is not "the other
  // tab's business": the absolute side shows the moments it resolves to.
  const start = screen.getByRole('textbox', { name: 'Start date' }) as HTMLInputElement;
  expect(start.value).toBe(`${yesterday.getFullYear()}/${pad(yesterday.getMonth() + 1)}/${pad(yesterday.getDate())}`);
  expect((screen.getByRole('textbox', { name: 'Start time' }) as HTMLInputElement).value).toBe('00:00:00');
  expect(
    screen.getAllByRole('gridcell', { selected: true }).length,
  ).toBeGreaterThan(0);

  // A ROLLING WINDOW REACHES NOW, and the end box says so. It used to be
  // empty, which is a panel claiming the window has a start and no extent;
  // the footer is where "to now" belongs, because what is pinned and what it
  // currently reaches are two different facts.
  fireEvent.click(screen.getByRole('radio', { name: 'Last 7 days' }));
  const now = new Date();
  expect((screen.getByRole('textbox', { name: 'End date' }) as HTMLInputElement).value).toBe(
    `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`,
  );
  expect(document.querySelector('.crewlet-time-window__summary')!.textContent).toMatch(/ to now$/);
});

test('editing the absolute side lets the rail go, and the window becomes the range', () => {
  render(<Window initial={{ kind: 'relative', duration: '7d' }} />);
  open();
  expect(screen.getByRole('radio', { name: 'Last 7 days' }).getAttribute('aria-checked')).toBe('true');

  const start = screen.getByRole('textbox', { name: 'Start date' });
  fireEvent.change(start, { target: { value: '20260310' } });
  fireEvent.blur(start);

  // No named window is on any more, because none of them is what this is.
  expect(within(rail()).queryAllByRole('radio', { checked: true })).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(held().kind).toBe('absolute');
  expect(held().from).toMatch(/^2026-03-10T/);
});

test('a preset is applied only when Apply is pressed, and Cancel keeps the old window', () => {
  const onApply = vi.fn();
  render(<Window onApply={onApply} />);
  open();
  fireEvent.click(screen.getByRole('radio', { name: 'Last 7 days' }));
  expect(onApply).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(held()).toEqual({ kind: 'relative', duration: '1h' });

  open();
  fireEvent.click(screen.getByRole('radio', { name: 'Last 7 days' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(held()).toEqual({ kind: 'relative', duration: '7d', timezone: 'local' });
});

test('Reset goes back to the window the screen opens on, and needs one to exist', () => {
  render(
    <Window
      initial={{ kind: 'absolute', from: '2026-03-10T00:00:00', to: '2026-03-12T00:00:00' }}
      defaultValue={{ kind: 'relative', duration: '24h' }}
    />,
  );
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  expect(screen.getByRole('radio', { name: 'Last 24 hours' }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(held()).toEqual({ kind: 'relative', duration: '24h' });

  cleanup();
  // Without a default there is nothing to go back TO, so the control is not
  // drawn: a Reset that cleared the window would be a Clear wearing the wrong
  // word.
  render(<Window />);
  open();
  expect(screen.queryByRole('button', { name: 'Reset to default' })).toBeNull();
});

test('a caller offers only the windows it can answer', () => {
  render(
    <Window
      presets={[
        { label: 'Last day', duration: '1d' },
        { label: 'Last week', duration: '7d' },
      ]}
      allowAbsolute={false}
    />,
  );
  open();
  expect(
    within(rail())
      .getAllByRole('radio')
      .map((row) => row.textContent),
  ).toEqual(['Last day', 'Last week']);
  // With the absolute side suppressed there is no calendar in the panel.
  expect(screen.queryByRole('grid')).toBeNull();
});

/*
 * The name is the whole point of the trigger, and it was the one thing the
 * trigger could not say: `aria-label="Time window"` REPLACES the element's own
 * content, so a screen reader was given the question and never the answer.
 */
test('the trigger is named by the window it holds, not just by what it is', () => {
  render(<Window initial={{ kind: 'relative', duration: '7d' }} />);
  expect(trigger().getAttribute('aria-label')).toBe('Time window: Last 7 days');
  // Label in name: the words a reader can see are inside the name they speak.
  expect(trigger().textContent).toContain('Last 7 days');

  cleanup();
  render(<Window initial={{ kind: 'relative' }} />);
  expect(trigger().getAttribute('aria-label')).toBe('Time window: Pick a time window');
});

test('the panel says what is selected, and says it again when it changes', () => {
  render(<Window initial={{ kind: 'relative', duration: '7d' }} />);
  open();
  const summary = document.querySelector('.crewlet-time-window__summary')!;
  // Politely, because it reports what a press just did and must never cut
  // across the control the reader is still using.
  expect(summary.getAttribute('aria-live')).toBe('polite');
  expect(summary.textContent).toMatch(/^Last 7 days: .+ to now$/);

  fireEvent.click(screen.getByRole('radio', { name: 'Today' }));
  expect(summary.textContent).toMatch(/^Today: .+ to now$/);
});

test('what is selected is described once, for the three places that say it', () => {
  const now = new Date('2026-03-10T09:41:00Z');
  const seven = describeTimeWindow({ kind: 'relative', duration: '7d', timezone: 'utc' }, { now });
  expect(seven.window).toBe('Last 7 days');
  expect(seven.range).toBe('Mar 3, 2026, 09:41 to now');
  expect(seven.spoken).toBe('Last 7 days: Mar 3, 2026, 09:41 to now');

  // A duration no preset names still gets a phrase, and it agrees about number.
  expect(describeTimeWindow({ kind: 'relative', duration: '3d' }, { now }).window).toBe('Last 3 days');
  expect(describeTimeWindow({ kind: 'relative', duration: '1m' }, { now }).window).toBe('Last 1 minute');
  // A preset is matched by LENGTH rather than by spelling, so a window stored
  // as `1d` is called what the rail calls the same window rather than falling
  // through to a second phrase for it.
  expect(describeTimeWindow({ kind: 'relative', duration: '1d' }, { now }).window).toBe('Last 24 hours');

  // An absolute window IS its range, so it is not said twice.
  const between = describeTimeWindow(
    { kind: 'absolute', from: '2026-03-01T00:00:00', to: '2026-03-02T12:00:00', timezone: 'utc' },
    { now },
  );
  expect(between.window).toBe(between.range);
  expect(between.spoken).toBe(between.range);

  // And a window that narrows nothing says so rather than saying nothing.
  expect(describeTimeWindow({ kind: 'relative' }, { now }).window).toBe('Any time');
  expect(isTimeWindowSet({ kind: 'relative' })).toBe(false);
});

test('every string the panel renders can be replaced', () => {
  render(
    <Window
      labels={{
        presetsLabel: 'Fenêtres',
        applyLabel: 'Appliquer',
        cancelLabel: 'Annuler',
        absoluteLabel: 'Plage',
        triggerName: (name, window) => `${name} / ${window}`,
      }}
    />,
  );
  expect(screen.getByRole('button', { name: 'Time window / Last hour' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Time window / Last hour' }));
  expect(screen.getByRole('radiogroup', { name: 'Fenêtres' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Appliquer' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Annuler' })).toBeTruthy();
});

test('a relative window resolves to a start and an open end', () => {
  const resolved = resolveTimeWindow({ kind: 'relative', duration: '2h' });
  expect(resolved.to).toBeUndefined();
  expect(Date.now() - new Date(resolved.from!).getTime()).toBeGreaterThanOrEqual(7_200_000 - 5_000);
});

/*
 * A calendar span is not a duration, which is the whole reason it is its own
 * field: "today" is midnight to now, and midnight is nine hours ago at nine in
 * the morning rather than twenty-four.
 */
test('today starts at midnight and yesterday is the day before it, in its own zone', () => {
  const now = new Date('2026-03-10T09:41:00Z');
  const today = resolveTimeWindow({ kind: 'relative', span: 'today', timezone: 'utc' }, now);
  expect(today.from).toBe('2026-03-10T00:00:00.000Z');
  expect(today.to).toBeUndefined();

  const yesterday = resolveTimeWindow({ kind: 'relative', span: 'yesterday', timezone: 'utc' }, now);
  expect(yesterday.from).toBe('2026-03-09T00:00:00.000Z');
  expect(yesterday.to).toBe('2026-03-10T00:00:00.000Z');

  // A value carrying both is one value holding two windows: the span wins,
  // rather than the answer depending on which branch was asked first.
  expect(
    resolveTimeWindow({ kind: 'relative', span: 'today', duration: '30d', timezone: 'utc' }, now).from,
  ).toBe('2026-03-10T00:00:00.000Z');
});

test('the panel draws no control the operating system paints', () => {
  render(<Window />);
  open();
  /*
   * The timezone chooser and the custom-unit chooser were real `<select>`
   * elements, so two dropdowns in a themed panel opened in the platform's own
   * palette and at the platform's own size. Every dropdown in this package is
   * the design system's own; `mode="native"` exists for a call site with a
   * reason, and neither of these had one.
   */
  expect(document.querySelector('select')).toBe(null);
  expect(screen.getByRole('combobox', { name: 'Time zone' })).toBeTruthy();
});

test('an absolute window in UTC is read as UTC', () => {
  const resolved = resolveTimeWindow({
    kind: 'absolute',
    from: '2026-03-10T00:00:00',
    to: '2026-03-11T00:00:00',
    timezone: 'utc',
  });
  expect(resolved.from).toBe('2026-03-10T00:00:00.000Z');
  expect(resolved.to).toBe('2026-03-11T00:00:00.000Z');
});

/*
 * The absolute side is the one surface in this package axe had never seen: the
 * suite in apps/ui-tests opens both pickers, and this one used to open on its
 * RELATIVE pane, so the two calendars were never on screen for it. They draw
 * with `showOutsideDays: false`, and the padding cells were `aria-hidden`, so
 * a whole week row owned no cell at all.
 */
test('the panel, rail and calendars together, carries no violation', async () => {
  render(
    <main>
      <h1>Window</h1>
      <Window initial={{ kind: 'absolute', from: '2026-03-31T00:00:00' }} defaultValue={{ kind: 'relative', duration: '7d' }} />
    </main>,
  );
  open();
  // Asserted rather than assumed: a pane that never opened is a pane axe has
  // nothing to say about, and the case would pass for the wrong reason.
  expect(screen.getAllByRole('grid')).toHaveLength(2);
  expect(within(rail()).getAllByRole('radio').length).toBeGreaterThan(0);
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(
    result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`),
  ).toEqual([]);
});

test('two pickers on one page do not share the ids their labels point at', () => {
  render(
    <>
      <Window initial={{ kind: 'relative', duration: '1h' }} />
      <TimeWindowPicker
        value={{ kind: 'relative', duration: '2h' }}
        onChange={() => {}}
        ariaLabel="Second window"
      />
    </>,
  );
  open();
  fireEvent.click(screen.getByRole('button', { name: /^Second window:/ }));
  // An id spelled out as a constant made every picker on a page claim the
  // same one, so `aria-labelledby` pointed at whichever had rendered last.
  const groups = [...document.querySelectorAll('.crewlet-time-window__absolute')].map((group) =>
    group.getAttribute('aria-labelledby'),
  );
  expect(groups).toHaveLength(2);
  expect(new Set(groups).size).toBe(2);
  const headings = [...document.querySelectorAll('.crewlet-time-window__custom-label')].map((el) => el.id);
  expect(new Set(headings).size).toBe(headings.length);
});
