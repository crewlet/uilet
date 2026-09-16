/**
 * What a chart owes a reader who cannot see it, and what it owes one who can:
 * that a quantity of nothing is drawn as nothing, that the values are in the
 * markup rather than in a tooltip a mouse alone can reach, and that a row
 * keeps its identity when the ranking changes underneath it.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ActivityStrip, BarList, dataColor, Legend, Sparkline, StackedBar, TimeSeries } from './index.js';
import { Card } from '../Card/index.js';
import { inset, installSheets } from '../../../../apps/ui-tests/src/cascade.js';

let uninstall: (() => void) | null = null;

afterEach(() => {
  cleanup();
  uninstall?.();
  uninstall = null;
});

test('the data ramp runs out into the residual rather than round the houses', () => {
  expect(dataColor(0)).toBe('var(--color-data-1)');
  expect(dataColor(4)).toBe('var(--color-data-5)');
  expect(dataColor(5)).toBe('var(--color-data-other)');
  expect(dataColor(97)).toBe('var(--color-data-other)');
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

  rerender(<Sparkline values={[4, 9]} height="2rem" />);
  expect(container.querySelector('polyline')).toBeTruthy();
  expect(container.querySelector('[role="img"]')).toBeNull();
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
