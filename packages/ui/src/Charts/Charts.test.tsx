/**
 * What a chart owes a reader who cannot see it, and what it owes one who can:
 * that a quantity of nothing is drawn as nothing, that the values are in the
 * markup rather than in a tooltip a mouse alone can reach, that a reading a
 * pointer can open a keyboard can open too, and that a row keeps its identity
 * when the ranking changes underneath it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import {
  ActivityStrip,
  BarList,
  ChartTooltip,
  DATA_COLOR_OTHER,
  DATA_COLORS,
  dataColor,
  Legend,
  niceScale,
  Sparkline,
  StackedBar,
  StackedColumns,
  TimeSeries,
} from './index.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes } from '@crewlethq/tokens';
import { contrast, DATA, flatten, OPAQUE_SURFACES, paletteStates, parseHex } from '@crewlethq/tokens/test/palette';
import { Card } from '../Card/index.js';
import { channels, inset, installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';

let uninstall: (() => void) | null = null;

afterEach(() => {
  cleanup();
  uninstall?.();
  uninstall = null;
});

test('the data ramp is four series, then runs out into the residual rather than round the houses', () => {
  // Four hues, because four is what the palette suite holds apart under every
  // vision; a fifth series is the residual, never a fifth colour.
  expect(DATA_COLORS).toEqual([
    'var(--color-data-1)',
    'var(--color-data-2)',
    'var(--color-data-3)',
    'var(--color-data-4)',
  ]);
  expect(DATA_COLORS.length).toBe(4);
  expect(dataColor(0)).toBe('var(--color-data-1)');
  expect(dataColor(3)).toBe('var(--color-data-4)');
  expect(dataColor(4)).toBe(DATA_COLOR_OTHER);
  expect(DATA_COLOR_OTHER).toBe('var(--color-data-other)');
  expect(dataColor(97)).toBe(DATA_COLOR_OTHER);
});

test('a legend is a list of series, keyed by id', () => {
  const { rerender } = render(
    <Legend
      items={[
        { id: 'sonnet', label: 'sonnet', value: '412k' },
        { id: 'opus', label: 'opus', value: '96k' },
      ]}
    />,
  );
  const list = screen.getByRole('list');
  expect(within(list).getAllByRole('listitem')).toHaveLength(2);

  // The node a reader was looking at belongs to its series, not to its place.
  const first = within(list).getAllByRole('listitem')[0]!;
  rerender(
    <Legend
      items={[
        { id: 'opus', label: 'opus', value: '96k' },
        { id: 'sonnet', label: 'sonnet', value: '412k' },
      ]}
    />,
  );
  expect(within(screen.getByRole('list')).getAllByRole('listitem')[1]).toBe(first);
});

test('a zero draws no bar, and a value does', () => {
  const { container } = render(
    <BarList
      data={[
        { id: 'a', label: 'planner', value: 120 },
        { id: 'b', label: 'greeter', value: 0 },
      ]}
    />,
  );
  const bars = container.querySelectorAll('.crewlet-bar-list__bar');
  expect(bars).toHaveLength(1);
  // And the bar is a fraction of the largest value, not of the total.
  expect((bars[0] as HTMLElement).style.width).toBe('100%');
  // The zero is still a row, and still says zero.
  expect(screen.getByText('0')).toBeTruthy();
});

test('a row keeps its focus when the ranking changes underneath it', () => {
  const rows = [
    { id: 'planner', label: 'planner', value: 10, onSelect: vi.fn() },
    { id: 'reviewer', label: 'reviewer', value: 90, onSelect: vi.fn() },
  ];
  const { rerender } = render(<BarList data={rows} />);
  const planner = screen.getByRole('button', { name: /planner/ });
  planner.focus();
  expect(document.activeElement).toBe(planner);

  // A push re-ranks the list. The row under the reader's finger is the same
  // row, so the focus goes with it.
  rerender(<BarList data={[rows[1]!, rows[0]!]} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: /planner/ }));
});

test('a bar row is a link when it has a destination, and a button when it has an action', () => {
  const onSelect = vi.fn();
  render(
    <BarList
      data={[
        { id: 'a', label: 'planner', value: 10, href: '#/seats/planner' },
        { id: 'b', label: 'reviewer', value: 4, onSelect },
      ]}
    />,
  );
  expect(screen.getByRole('link', { name: /planner/ }).getAttribute('href')).toBe('#/seats/planner');
  fireEvent.click(screen.getByRole('button', { name: /reviewer/ }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test('the tail is a count the caller phrases, and an empty list says why', () => {
  const { rerender } = render(
    <BarList
      limit={1}
      data={[
        { id: 'a', label: 'planner', value: 10 },
        { id: 'b', label: 'reviewer', value: 4 },
        { id: 'c', label: 'greeter', value: 1 },
      ]}
    />,
  );
  expect(screen.getByText('and 2 more')).toBeTruthy();
  expect(screen.queryByText('reviewer')).toBeNull();

  rerender(<BarList data={[]} emptyLabel="No spend in this window" />);
  expect(screen.getByText('No spend in this window')).toBeTruthy();
});

test('a stacked bar omits its zero parts and says every value out loud', () => {
  const { container } = render(
    <StackedBar
      segments={[
        { id: 'execute', label: 'Execute', value: 75 },
        { id: 'review', label: 'Review', value: 25 },
        { id: 'onboarding', label: 'Onboarding', value: 0 },
      ]}
    />,
  );
  expect(container.querySelectorAll('.crewlet-stacked-bar__segment')).toHaveLength(2);
  expect(screen.getByText('Execute: 75 (75%), Review: 25 (25%)')).toBeTruthy();
});

test('an activity strip is one picture with a name, and a cell per bucket', () => {
  const { container, rerender } = render(
    <ActivityStrip
      label="Events in the last hour"
      buckets={[
        { t: 1, v: 0 },
        { t: 2, v: 4 },
        { t: 3, v: 8 },
      ]}
    />,
  );
  const strip = screen.getByRole('img', { name: /Events in the last hour/ });
  expect(strip.getAttribute('aria-label')).toContain('peak 8');
  const cells = container.querySelectorAll('.crewlet-activity-strip__cell');
  expect(cells).toHaveLength(3);
  // The empty bucket is a different mark, not a fainter one.
  expect(cells[0]!.className).not.toContain('is-active');
  expect(cells[2]!.className).toContain('is-active');
  expect((cells[1] as HTMLElement).style.getPropertyValue('--crewlet-activity-strip-fill')).toBe('50%');

  /*
   * The window rolls. A cell belongs to its bucket in TIME, so the bucket
   * that was third and is now second keeps its own node: exactly one node
   * enters and one leaves. Keyed by position, every cell in the strip would
   * be rewritten on every roll.
   */
  const kept = cells[2]!;
  rerender(
    <ActivityStrip
      label="Events in the last hour"
      buckets={[
        { t: 2, v: 4 },
        { t: 3, v: 8 },
        { t: 4, v: 1 },
      ]}
    />,
  );
  expect(container.querySelectorAll('.crewlet-activity-strip__cell')[1]).toBe(kept);
});

test('a legend and a bar list say they are lists, for the engine that forgets', () => {
  /*
   * `list-style: none` is enough for WebKit to stop answering a `ul` as a
   * list, and a list that is not one is a list whose length is never read:
   * "5 series" is the first thing a reader needs from a legend. Both
   * stylesheets take the markers off, so both elements declare the role.
   *
   * THE ATTRIBUTE IS WHAT IS ASSERTED, not the role. jsdom applies no
   * stylesheet and maps a bare `ul` to a list whatever WebKit would do, so a
   * role query here passes with or without the fix and proves nothing.
   */
  const { container } = render(
    <>
      <Legend items={[{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }]} />
      <BarList data={[{ id: 'a', label: 'a', value: 1 }]} />
    </>,
  );
  const lists = [...container.querySelectorAll('ul')];
  expect(lists).toHaveLength(2);
  expect(lists.map((list) => list.getAttribute('role'))).toEqual(['list', 'list']);
});

test('a limit of none is a limit of none', () => {
  // Zero is a count, and read as truthy it meant "no limit at all": a caller
  // computing its limit from a viewport drew every row at the one width that
  // had room for none.
  render(
    <BarList
      data={[{ id: 'a', label: 'a', value: 1 }, { id: 'b', label: 'b', value: 2 }]}
      limit={0}
      moreLabel={(remaining) => `${remaining} not shown`}
    />,
  );
  expect(screen.queryByText('a')).toBeNull();
  expect(screen.getByText('Nothing recorded in this window')).toBeTruthy();
});


/* ─── A quantity over time ─────────────────────────────────────────── */

const HOUR = 3_600_000;

test('the x domain is the window, not the data', () => {
  /*
   * A series covering only the last tenth of the window belongs in the last
   * tenth of the plot. Stretched to fill it, a company that woke up for six
   * minutes is drawn as a company that was busy all day, which is how a quiet
   * fleet came to look loaded.
   */
  const to = 24 * HOUR;
  const { container } = render(
    <TimeSeries
      label="Turns per hour"
      from={0}
      to={to}
      series={[{ id: 'turns', name: 'turns', points: [{ t: to - HOUR, v: 4 }, { t: to, v: 8 }] }]}
      formatTime={(at) => String(at)}
    />,
  );
  const line = container.querySelector('polyline.crewlet-chart__series')!;
  const xs = line
    .getAttribute('points')!
    .split(' ')
    .map((pair) => Number(pair.split(',')[0]));
  // The viewBox is 1000 wide, so an hour before the end is at 1000 - 1000/24.
  expect(Math.round(xs[0]!)).toBe(958);
  expect(Math.round(xs[1]!)).toBe(1000);
});

test('a chart says in words what its shape says', () => {
  render(
    <TimeSeries
      label="Turns per hour"
      from={0}
      to={HOUR}
      series={[{ id: 'turns', name: 'turns', points: [{ t: 0, v: 1 }, { t: HOUR, v: 40 }] }]}
      format={(value) => `${value} turns`}
      formatTime={(at) => (at === 0 ? 'the start' : 'the end')}
    />,
  );
  const sentence = 'Turns per hour. the start to the end, peak 40 turns.';
  const plot = screen.getByRole('img', { name: sentence });
  // And the scale is drawn, so a reader who can see the plot has it too.
  expect(screen.getByText('peak 40 turns')).toBeTruthy();
  /*
   * ONCE. The sentence was the plot's name AND a visually hidden line beside
   * it, so a screen reader read the whole of it, then the scale, then the
   * whole of it again. The name is how a graphic carries its meaning; a
   * second copy in the text is a repeat, not a fallback.
   */
  expect(plot.closest('figure')!.textContent).not.toContain('to the end, peak');
});

test('a sparkline is never announced, and keeps its box before it has a shape', () => {
  /*
   * It has no scale and no labels, so it cannot be read without the figure
   * beside it: told "412k, image", a reader has learnt nothing the figure did
   * not already say. And a row of figures must not jump as one of them gains
   * its second point, so the box is there before the line is.
   */
  const { container, rerender } = render(<Sparkline values={[4]} height="2rem" />);
  expect(container.querySelector('polyline')).toBeNull();
  expect((container.firstElementChild as HTMLElement).style.height).toBe('2rem');
  expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();

  rerender(<Sparkline values={[4, 9]} height="2rem" current />);
  expect(container.querySelector('polyline')).toBeTruthy();
  expect(container.querySelector('[role="img"]')).toBeNull();
  // The whole figure is hidden, the point included: the one element that
  // carries a height carries the silence too.
  expect((container.firstElementChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  expect((container.firstElementChild as HTMLElement).style.height).toBe('2rem');
});

test('a sparkline is the residual neutral at the design stroke, and its present is one accent point', () => {
  /*
   * THE LINE IS QUIET AND THE PRESENT IS THE ACCENT. A shape beside a number
   * is named by that number rather than by a legend, so it takes the residual
   * neutral rather than a series hue, at the approved 1.75 stroke; with
   * `current` the last value is marked by exactly one point in the accent,
   * which is the only colour the shape spends.
   */
  const { container, rerender } = render(<Sparkline values={[3, 8, 5, 10, 6]} />);
  const line = container.querySelector('polyline')!;
  expect(line.getAttribute('stroke')).toBe(DATA_COLOR_OTHER);
  expect(container.querySelectorAll('.crewlet-spark__current')).toHaveLength(0);

  rerender(<Sparkline values={[3, 8, 5, 10, 6]} current />);
  const points = container.querySelectorAll<HTMLElement>('.crewlet-spark__current');
  expect(points).toHaveLength(1);
  /*
   * ON THE LAST VALUE. The point is its own element over the stretched plot,
   * so it is placed by that value's height as a fraction of the box, and the
   * line's own last vertex is the height it has to match.
   */
  const coordinates = (line.getAttribute('points') ?? '').trim().split(' ');
  const [, lastY] = coordinates[coordinates.length - 1]!.split(',').map(Number);
  const box = Number(container.querySelector('svg')!.getAttribute('viewBox')!.split(' ')[3]);
  expect(Number.parseFloat(points[0]!.style.top)).toBeCloseTo((lastY! / box) * 100, 1);
  // Six is not the peak here, so the point stands below the top of the box.
  expect(Number.parseFloat(points[0]!.style.top)).toBeGreaterThan(10);

  for (const theme of ['dark', 'light'] as const) {
    uninstall = installThemed(theme, 'Charts/Charts.css');
    const palette = themes[theme].color;
    expect(channels(getComputedStyle(points[0]!).backgroundColor), theme).toEqual(parseHex(palette.brand.accent));
    // The quiet stroke is the sparkline's own: a line across a plot is 2.
    expect(getComputedStyle(line).getPropertyValue('stroke-width')).toBe('1.75');
    uninstall();
    uninstall = null;
  }
});

test('a bar list with nothing to draw starts where its bars would have', () => {
  /*
   * The sentence stands in for the bars, so it starts on the line the bars
   * would have started on: the inset belongs to the PANEL holding the chart,
   * and this sentence takes none of its own.
   *
   * It carried the panel's own step for a while. That was a repair at the
   * wrong end: the sentence was landing against a card's border because the
   * CARD was drawing its content with no inset at all, and a padding here
   * moved this one line while every sibling in the same card stayed against
   * the edge. Measured here as the two cases side by side, over the cascade,
   * because the previous guard read the rule's own text and so could not tell
   * a chart drawn at the panel's inset from one drawn at twice it.
   */
  uninstall = installSheets('Card/Card.css', 'Charts/Charts.css');
  const { container } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>By model</Card.Title>
      </Card.Header>
      <BarList data={[]} emptyLabel="No model calls in this window." />
    </Card>,
  );
  const card = container.querySelector('.crewlet-card')!;
  const empty = screen.getByText('No model calls in this window.');
  expect(inset(empty, card)).toBe(16);

  cleanup();
  const { container: full } = render(
    <Card as="section">
      <Card.Header>
        <Card.Title>By model</Card.Title>
      </Card.Header>
      <BarList data={[{ id: 'opus', label: 'opus', value: 3 }]} />
    </Card>,
  );
  const drawn = full.querySelector('.crewlet-card')!;
  expect(inset(screen.getByText('opus'), drawn)).toBe(inset(empty, card));
});


/* ─── The reading layer ────────────────────────────────────────────── */

const DAY = 86_400_000;

const phases = [
  { id: 'execute', name: 'Execute' },
  { id: 'review', name: 'Review' },
  { id: 'workers', name: 'Workers' },
  { id: 'auxiliary', name: 'Auxiliary' },
];

const days = [
  { t: 0, values: { execute: 600, review: 200, workers: 200, auxiliary: 100 } },
  { t: DAY, values: { execute: 700, review: 250, workers: 0, auxiliary: 50 } },
  { t: 2 * DAY, values: { execute: 300, review: 100, workers: 50, auxiliary: 50 } },
];

function columns(props: Partial<Parameters<typeof StackedColumns>[0]> = {}) {
  return (
    <StackedColumns
      label="Daily tokens by phase"
      series={phases}
      buckets={days}
      format={(value) => `${value}`}
      formatTime={(at) => `day ${at / DAY + 1}`}
      {...props}
    />
  );
}

/** The tooltip's words, row by row, as a reader would read them off it. */
function reading(container: HTMLElement): string[] | null {
  const box = container.querySelector('.crewlet-chart-tooltip');
  if (!box) return null;
  return [...box.querySelectorAll('.crewlet-chart-tooltip__title, .crewlet-chart-tooltip__row, .crewlet-chart-tooltip__total')].map(
    (line) => [...line.querySelectorAll('span, p')].map((part) => part.textContent).filter(Boolean).join(' ') || line.textContent!,
  );
}

test('pointing at a column reads every part of it and the total', () => {
  const { container } = render(columns());
  const slots = container.querySelectorAll('.crewlet-stacked-columns__slot');
  expect(slots).toHaveLength(3);
  expect(reading(container)).toBeNull();

  fireEvent.pointerEnter(slots[1]!);
  expect(reading(container)).toEqual(['day 2', 'Execute 700', 'Review 250', 'Workers 0', 'Auxiliary 50', 'Total 1000']);
  expect(slots[1]!.className).toContain('is-active');

  fireEvent.pointerEnter(slots[0]!);
  expect(reading(container)).toEqual(['day 1', 'Execute 600', 'Review 200', 'Workers 200', 'Auxiliary 100', 'Total 1100']);

  // The pointer leaving the plot ends a pointer's reading.
  fireEvent.pointerLeave(container.querySelector('.crewlet-chart-frame')!);
  expect(reading(container)).toBeNull();
});

test('a stacked bar reads each part on its own, by pointer and by keyboard, with the whole', () => {
  const { container } = render(
    <StackedBar
      segments={[
        { id: 'execute', label: 'Execute', value: 600 },
        { id: 'onboarding', label: 'Onboarding', value: 0 },
        { id: 'review', label: 'Review', value: 300 },
        { id: 'workers', label: 'Workers', value: 100 },
      ]}
      format={(value) => `${value} tok`}
    />,
  );
  // The plot is one tab stop, named by the sentence that says every value.
  const plot = screen.getByRole('group', {
    name: 'Execute: 600 tok (60%), Review: 300 tok (30%), Workers: 100 tok (10%)',
  });
  expect(plot.tabIndex).toBe(0);
  const parts = container.querySelectorAll('.crewlet-stacked-bar__segment');
  expect(reading(container)).toBeNull();

  fireEvent.pointerEnter(parts[1]!);
  expect(reading(container)).toEqual(['Review 300 tok (30%)', 'Total 1000 tok']);
  // The swatch is the part's own hue: its place in `segments`, the zero part
  // before it included, so it matches the Legend keyed from the same list.
  expect(
    container.querySelector<HTMLElement>('.crewlet-chart-tooltip__swatch')!.style.getPropertyValue(
      '--crewlet-chart-tooltip-swatch-color',
    ),
  ).toBe(dataColor(2));
  // It stands beside the part: Review runs from 60% to 90% of the track.
  const box = container.querySelector<HTMLElement>('.crewlet-chart-tooltip')!;
  expect(box.className).toContain('crewlet-chart-tooltip--before');
  expect(Number.parseFloat(box.style.left)).toBeCloseTo(60, 2);
  fireEvent.pointerLeave(plot);
  expect(reading(container)).toBeNull();

  plot.focus();
  fireEvent.keyDown(plot, { key: 'Home' });
  expect(reading(container)).toEqual(['Execute 600 tok (60%)', 'Total 1000 tok']);
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  expect(reading(container)![0]).toBe('Workers 100 tok (10%)');
  fireEvent.keyDown(plot, { key: 'Escape' });
  expect(reading(container)).toBeNull();
});

test('the tooltip stands beside its mark, by a style property, on the roomier side', () => {
  const { container } = render(columns());
  const slots = container.querySelectorAll('.crewlet-stacked-columns__slot');

  // The first of three columns ends a third of the way across: the box stands
  // after that edge.
  fireEvent.pointerEnter(slots[0]!);
  let box = container.querySelector<HTMLElement>('.crewlet-chart-tooltip')!;
  expect(box.className).toContain('crewlet-chart-tooltip--after');
  expect(Number.parseFloat(box.style.left)).toBeCloseTo(100 / 3, 2);

  // The last starts two thirds across: the box stands before that edge.
  fireEvent.pointerEnter(slots[2]!);
  box = container.querySelector<HTMLElement>('.crewlet-chart-tooltip')!;
  expect(box.className).toContain('crewlet-chart-tooltip--before');
  expect(Number.parseFloat(box.style.left)).toBeCloseTo(200 / 3, 2);

  // And it is the live region's child, so what it says is heard.
  expect(box.parentElement!.getAttribute('aria-live')).toBe('polite');
  expect(document.querySelector('style')).toBeNull();
});

test('the keyboard walks the columns the pointer can reach', () => {
  const { container } = render(columns());
  const plot = screen.getByRole('group', { name: 'Daily tokens by phase' });
  expect(plot.tabIndex).toBe(0);
  plot.focus();
  // Focus alone opens nothing: the reader has not asked for a reading yet.
  expect(reading(container)).toBeNull();

  // ← opens on the newest column, which is "now", and walks back from it.
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  expect(reading(container)![0]).toBe('day 3');
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  expect(reading(container)![0]).toBe('day 2');
  fireEvent.keyDown(plot, { key: 'Home' });
  expect(reading(container)![0]).toBe('day 1');
  // An end is an end: a time axis does not come round again.
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  expect(reading(container)![0]).toBe('day 1');
  fireEvent.keyDown(plot, { key: 'End' });
  expect(reading(container)![0]).toBe('day 3');
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  expect(reading(container)![0]).toBe('day 3');

  // Focus leaving the plot ends the reading.
  fireEvent.blur(plot);
  expect(reading(container)).toBeNull();
});

test('a keyboard reading outlives the pointer drifting off the plot', () => {
  const { container } = render(columns());
  const plot = screen.getByRole('group', { name: 'Daily tokens by phase' });
  plot.focus();
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  fireEvent.pointerLeave(plot);
  expect(reading(container)![0]).toBe('day 1');
});

test('Escape closes the reading, stops there, and the next key resumes it', () => {
  const outside = vi.fn();
  const { container } = render(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onKeyDown={(event) => outside(event.key)}>{columns()}</div>,
  );
  const plot = screen.getByRole('group', { name: 'Daily tokens by phase' });
  plot.focus();
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  expect(reading(container)![0]).toBe('day 2');
  outside.mockClear();

  // It closed something, so it stops at the plot: a chart in a dialog does
  // not take the dialog down with its tooltip.
  fireEvent.keyDown(plot, { key: 'Escape' });
  expect(reading(container)).toBeNull();
  expect(outside).not.toHaveBeenCalled();

  // With nothing open it is not the plot's, and it passes through.
  fireEvent.keyDown(plot, { key: 'Escape' });
  expect(outside).toHaveBeenCalledWith('Escape');

  // The place was kept: the next arrow reopens it rather than moving.
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  expect(reading(container)![0]).toBe('day 2');
  fireEvent.keyDown(plot, { key: 'Escape' });
  fireEvent.keyDown(plot, { key: 'ArrowLeft' });
  expect(reading(container)![0]).toBe('day 2');
});

test('the tooltip spends no data hue on a word, in either palette', () => {
  /*
   * TEXT TOKENS ONLY. A series' hue is measured as a MARK on the surface, and
   * as the colour of a word it holds none of the contrast a word needs, so
   * the one place a hue appears in the tooltip is the swatch. Measured over
   * the cascade, element by element, for every element that carries words.
   */
  const { container } = render(columns());
  fireEvent.pointerEnter(container.querySelectorAll('.crewlet-stacked-columns__slot')[0]!);
  const box = container.querySelector('.crewlet-chart-tooltip')!;
  const worded = [box, ...box.querySelectorAll('*')].filter((element) =>
    [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()),
  );
  expect(worded.length).toBeGreaterThanOrEqual(11);
  for (const theme of ['dark', 'light'] as const) {
    uninstall = installThemed(theme, 'Charts/Charts.css');
    const palette = themes[theme].color;
    const text = Object.values(palette.text).map((value) => JSON.stringify(parseHex(value)));
    const data = Object.values(palette.data).map((value) => JSON.stringify(parseHex(value)));
    for (const element of worded) {
      const color = JSON.stringify(channels(getComputedStyle(element).color));
      expect(text, `${theme}: ${element.className}`).toContain(color);
      expect(data, `${theme}: ${element.className}`).not.toContain(color);
    }
    // And the swatch is the series' hue, which is where it belongs.
    const swatch = box.querySelector<HTMLElement>('.crewlet-chart-tooltip__swatch')!;
    expect(swatch.style.getPropertyValue('--crewlet-chart-tooltip-swatch-color')).toBe(dataColor(0));
    uninstall();
    uninstall = null;
  }
});

test('every word in the tooltip clears 4.5:1 over the marks it stands on, in every palette', () => {
  /*
   * THE TOOLTIP STANDS OVER THE DATA. It is drawn beside the mark it reads,
   * so it covers that mark's neighbours: the next columns, and the lines and
   * areas of a time series. What a word is read against is therefore the
   * tooltip's ground COMPOSITED OVER A DATA HUE, and a translucent ground lets
   * the hue through: on the card, which is a 5% white wash in the marketing
   * palette, the title measured 1.12:1 over a column.
   *
   * So the ground and every word's step are READ FROM THE STYLESHEET, and each
   * word is measured over the ground flattened onto each data hue, the
   * residual and every opaque rung, in all four states of the cascade the
   * tokens ship, the bare marketing root included.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'Charts.css'), 'utf8');
  const tokensCss = resolve(here, '../../../tokens/dist/css');
  const states = paletteStates({
    tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
    themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
  });
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = new RegExp(`(?:^|\\n|,)\\s*${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css)?.[1];
    if (body === undefined) throw new Error(`Charts.css has no rule for ${selector}`);
    return body;
  };
  const token = (selector: string, property: string) => {
    const name = new RegExp(`(?:^|[;\\s])${property}:\\s*var\\((--[\\w-]+)\\)`).exec(rule(selector))?.[1];
    if (name === undefined) throw new Error(`${selector} sets no ${property} from a token`);
    return name;
  };
  const ground = token('.crewlet-chart-tooltip', 'background');
  const words = [
    ['the title', token('.crewlet-chart-tooltip__title', 'color')],
    ["a series' name", token('.crewlet-chart-tooltip__name', 'color')],
    ['a value', token('.crewlet-chart-tooltip__value', 'color')],
  ] as const;

  let measured = 0;
  const failures: string[] = [];
  for (const [state, values] of Object.entries(states)) {
    const read = (name: string, under: { r: number; g: number; b: number }) => {
      const raw = values.get(name);
      if (raw === undefined) throw new Error(`${state} does not emit ${name}`);
      return parseHex(raw) ?? flatten(raw, under);
    };
    // Spelled without the leading dashes and prefixed at use: the package's
    // variable check reads a quoted `--name` in a .tsx file as a declaration.
    const token = (name: string) => `--${name}`;
    const page = parseHex(values.get(token('color-surface-background')) ?? '');
    if (page === null) throw new Error(`${state} has no opaque page colour`);
    const backdrops = [...DATA, token('color-data-other'), ...OPAQUE_SURFACES];
    for (const backdrop of backdrops) {
      const under = read(backdrop, page);
      const box = read(ground, under);
      for (const [word, step] of words) {
        const ratio = contrast(read(step, box), box);
        measured += 1;
        if (ratio < 4.5) failures.push(`${state}: ${word} (${step}) over ${backdrop}: ${ratio.toFixed(2)}:1`);
      }
    }
  }
  // Four states, five mark hues and the opaque rungs, three words: a reading
  // that found no state, no hue or no word would pass for any ground at all.
  expect(measured).toBe(4 * (DATA.length + 1 + OPAQUE_SURFACES.length) * 3);
  expect(DATA.length).toBe(4);
  expect(failures).toEqual([]);
});

test('a bar is rounded at its value end and square on its baseline', () => {
  uninstall = installSheets('Charts/Charts.css');
  const { container } = render(
    <>
      <BarList data={[{ id: 'a', label: 'a', value: 3 }]} />
      {columns()}
    </>,
  );
  const bar = container.querySelector('.crewlet-bar-list__bar')!;
  const corners = (element: Element, names: string[]) => names.map((name) => px(element, name));
  // The inline end is the value end, so a right-to-left bar rounds its left.
  expect(corners(bar, ['border-start-end-radius', 'border-end-end-radius'])).toEqual([4, 4]);
  expect(corners(bar, ['border-start-start-radius', 'border-end-start-radius'])).toEqual([0, 0]);
  // The track is the scale at full length, and takes the bar's shape.
  const track = container.querySelector('.crewlet-bar-list__track')!;
  expect(corners(track, ['border-start-start-radius', 'border-start-end-radius'])).toEqual([0, 4]);

  // A column's value end is the top of its topmost part, and only that.
  const parts = container.querySelectorAll('.crewlet-stacked-columns__slot')[0]!.querySelectorAll(
    '.crewlet-stacked-columns__segment',
  );
  expect(parts).toHaveLength(4);
  const top = parts[parts.length - 1]!;
  expect(top.getAttribute('data-series')).toBe('auxiliary');
  expect(corners(top, ['border-top-left-radius', 'border-top-right-radius'])).toEqual([4, 4]);
  expect(corners(top, ['border-bottom-left-radius', 'border-bottom-right-radius'])).toEqual([0, 0]);
  for (const below of [...parts].slice(0, -1)) {
    expect(corners(below, ['border-top-left-radius', 'border-top-right-radius'])).toEqual([0, 0]);
  }
});

test('stacked parts stand 2px apart, and the gap comes out of the parts', () => {
  uninstall = installSheets('Charts/Charts.css');
  const { container } = render(
    <>
      <StackedBar
        segments={[
          { id: 'execute', label: 'Execute', value: 75 },
          { id: 'review', label: 'Review', value: 25 },
        ]}
      />
      {columns()}
    </>,
  );
  const track = container.querySelector('.crewlet-stacked-bar__track')!;
  expect(getComputedStyle(track).getPropertyValue('gap')).toBe('2px');
  const column = container.querySelector('.crewlet-stacked-columns__column')!;
  expect(getComputedStyle(column).getPropertyValue('gap')).toBe('2px');

  /*
   * A part GROWS by its value from nothing, rather than taking a percentage
   * of the whole: with a gap between them, percentages add up to more than
   * the track, and the last part is pushed out of it.
   */
  const parts = [...track.querySelectorAll<HTMLElement>('.crewlet-stacked-bar__segment')];
  expect(parts.map((part) => part.style.flexGrow)).toEqual(['75', '25']);
  expect(parts.map((part) => part.style.width)).toEqual(['', '']);
  expect(getComputedStyle(parts[0]!).getPropertyValue('flex-basis')).toBe('0px');
  const segments = [...column.querySelectorAll<HTMLElement>('.crewlet-stacked-columns__segment')];
  expect(segments.map((part) => part.style.flexGrow)).toEqual(['600', '200', '200', '100']);
  expect(getComputedStyle(segments[0]!).getPropertyValue('flex-basis')).toBe('0px');
});

test('a column is its total on a round scale, and a zero part is not drawn', () => {
  const { container } = render(columns());
  // The tallest column is 1100, so the scale runs to 1500 in steps of 500.
  expect(niceScale(1100)).toEqual({ top: 1500, step: 500 });
  const ticks = [...container.querySelectorAll('.crewlet-stacked-columns__tick')].map((tick) => tick.textContent);
  expect(ticks).toEqual(['1500', '1000', '500', '0']);
  const heights = [...container.querySelectorAll<HTMLElement>('.crewlet-stacked-columns__column')].map((column) =>
    Number.parseFloat(column.style.height),
  );
  expect(heights.map((height) => height.toFixed(2))).toEqual(['73.33', '66.67', '33.33']);
  // Day two ran no workers: three parts, not four with one of no height.
  expect(container.querySelectorAll('.crewlet-stacked-columns__slot')[1]!.querySelectorAll('.crewlet-stacked-columns__segment')).toHaveLength(3);
});

test('a round scale is round, and a figure of nothing still has one', () => {
  expect(niceScale(1_350_000)).toEqual({ top: 1_500_000, step: 500_000 });
  expect(niceScale(8)).toEqual({ top: 8, step: 2 });
  expect(niceScale(9)).toEqual({ top: 10, step: 2.5 });
  expect(niceScale(0.3)).toEqual({ top: 0.3, step: 0.1 });
  expect(niceScale(0)).toEqual({ top: 4, step: 1 });
});

test('hiding a series never repaints the ones that are left', () => {
  /*
   * COLOUR FOLLOWS THE SERIES ID. The hue a reader learnt for "workers" is
   * its place in the full list, so switching "review" off leaves it where it
   * was; a filter that shortened the list would hand review's hue to it.
   */
  const colours = (container: HTMLElement) =>
    Object.fromEntries(
      [...container.querySelectorAll<HTMLElement>('.crewlet-stacked-columns__slot')[0]!.querySelectorAll<HTMLElement>(
        '.crewlet-stacked-columns__segment',
      )].map((part) => [part.dataset['series'], part.style.getPropertyValue('--crewlet-stacked-columns-segment-color')]),
    );
  const { container, rerender } = render(columns());
  const before = colours(container);
  expect(before).toEqual({
    execute: dataColor(0),
    review: dataColor(1),
    workers: dataColor(2),
    auxiliary: dataColor(3),
  });

  rerender(columns({ hidden: ['review'] }));
  const after = colours(container);
  expect(after).toEqual({ execute: before['execute'], workers: before['workers'], auxiliary: before['auxiliary'] });

  // A hidden series leaves the reading and its total too.
  fireEvent.pointerEnter(container.querySelectorAll('.crewlet-stacked-columns__slot')[0]!);
  expect(reading(container)).toEqual(['day 1', 'Execute 600', 'Workers 200', 'Auxiliary 100', 'Total 900']);
});

test('a time series reads every series at the instant under the pointer, on a crosshair', () => {
  const { container } = render(
    <TimeSeries
      label="Turns per hour"
      from={0}
      to={4 * HOUR}
      series={[
        { id: 'turns', name: 'turns', points: [{ t: 0, v: 3 }, { t: HOUR, v: 9 }, { t: 2 * HOUR, v: 4 }] },
        { id: 'reviews', name: 'reviews', points: [{ t: HOUR, v: 2 }, { t: 3 * HOUR, v: 1 }] },
      ]}
      format={(value) => `${value}`}
      formatTime={(at) => `${at / HOUR}h`}
    />,
  );
  const svg = container.querySelector('svg')!;
  svg.getBoundingClientRect = () => ({ left: 100, top: 0, width: 400, height: 120, right: 500, bottom: 120, x: 100, y: 0, toJSON: () => ({}) });
  expect(container.querySelector('.crewlet-chart__crosshair')).toBeNull();

  // 130px into a 400px plot is 1.3 hours into four: the nearest instant is 1h.
  fireEvent.pointerMove(svg, { clientX: 230 });
  expect(reading(container)).toEqual(['1h', 'turns 9', 'reviews 2']);
  const crosshair = container.querySelector('.crewlet-chart__crosshair')!;
  expect(Number(crosshair.getAttribute('x1'))).toBe(250);
  expect(Number(crosshair.getAttribute('x2'))).toBe(250);

  // A series with no point at the instant is left out rather than read as 0.
  fireEvent.pointerMove(svg, { clientX: 390 });
  expect(reading(container)).toEqual(['3h', 'reviews 1']);

  // And the keyboard walks the same instants: 0h, 1h, 2h, 3h.
  const plot = screen.getByRole('group', { name: 'Turns per hour' });
  plot.focus();
  fireEvent.keyDown(plot, { key: 'Home' });
  expect(reading(container)).toEqual(['0h', 'turns 3']);
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  fireEvent.keyDown(plot, { key: 'ArrowRight' });
  expect(reading(container)).toEqual(['2h', 'turns 4']);
  fireEvent.keyDown(plot, { key: 'Escape' });
  expect(container.querySelector('.crewlet-chart__crosshair')).toBeNull();
});

test('a line across a plot is 2px', () => {
  uninstall = installSheets('Charts/Charts.css');
  const { container } = render(
    <TimeSeries label="Turns" from={0} to={HOUR} series={[{ id: 'a', name: 'a', points: [{ t: 0, v: 1 }, { t: HOUR, v: 2 }] }]} />,
  );
  expect(getComputedStyle(container.querySelector('polyline')!).getPropertyValue('stroke-width')).toBe('2');
});

test('a closed tooltip keeps its live region and says nothing', () => {
  const { container, rerender } = render(<ChartTooltip open={false} title="day 1" rows={[{ id: 'a', name: 'a', value: '1' }]} />);
  const region = container.firstElementChild!;
  expect(region.getAttribute('aria-live')).toBe('polite');
  expect(region.textContent).toBe('');
  rerender(<ChartTooltip open title="day 1" rows={[{ id: 'a', name: 'a', value: '1' }]} />);
  // The same region, so an assistive technology already watching it hears it.
  expect(container.firstElementChild).toBe(region);
  expect(region.textContent).toBe('day 1a1');
});

test('the charts carry no violation with the plot focused and a reading open', async () => {
  const { container } = render(
    <main>
      <h1>Spend</h1>
      {columns()}
      <TimeSeries
        label="Turns per hour"
        from={0}
        to={HOUR}
        series={[{ id: 'turns', name: 'turns', points: [{ t: 0, v: 1 }, { t: HOUR, v: 2 }] }]}
      />
      <StackedBar
        segments={[
          { id: 'execute', label: 'Execute', value: 3 },
          { id: 'review', label: 'Review', value: 1 },
        ]}
      />
    </main>,
  );
  expect(screen.getAllByRole('group')).toHaveLength(3);
  for (const plot of screen.getAllByRole('group')) {
    plot.focus();
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(plot);
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(container.querySelector('.crewlet-chart-tooltip')).not.toBeNull();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`)).toEqual([]);
  }
});
