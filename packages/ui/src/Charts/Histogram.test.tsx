/**
 * What a histogram owes its reader: a height that is the true ratio, carried
 * by a fill inside the slot that is the control; a failed share at the foot of
 * its own bar; ticks that name the buckets they sit over; a button only where
 * a bar does something; and a total stated by the caller, never summed here.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Histogram, histogramTicks, type HistogramBar } from './index.js';

afterEach(cleanup);

const DAY = 24 * 60 * 60_000;
const START = Date.UTC(2026, 8, 16);

function days(counts: number[]): HistogramBar[] {
  return counts.map((v, i) => ({ t: START + i * DAY, v }));
}

const title = (bar: HistogramBar) => `${new Date(bar.t).toISOString().slice(0, 10)}, ${bar.v}`;
const tick = (bar: HistogramBar) => new Date(bar.t).toISOString().slice(5, 10);

function chart(bars: HistogramBar[], extra: Partial<Parameters<typeof Histogram>[0]> = {}) {
  return render(
    <Histogram bars={bars} label="Turns over the window" summary="12 turns in this window" formatTitle={title} {...extra} />,
  );
}

const slots = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.crewlet-histogram__bar')];
const fillOf = (slot: HTMLElement) =>
  slot.querySelector<HTMLElement>(':scope > .crewlet-histogram__fill')!.style.getPropertyValue('--crewlet-histogram-fill');

describe('the bars', () => {
  test('carry their height on a fill inside the slot, as the true ratio', () => {
    const { container } = chart(days([0, 2, 4]));
    const drawn = slots(container);
    expect(drawn).toHaveLength(3);
    // The slot is the control and spans its column; the height is the fill's.
    for (const slot of drawn) expect(slot.style.height).toBe('');
    expect(drawn.map(fillOf)).toEqual(['0%', '50%', '100%']);
    expect(drawn[0]!.hasAttribute('data-empty')).toBe(true);
    expect(drawn[1]!.hasAttribute('data-empty')).toBe(false);
  });

  test('draw the failed share at the foot of the same fill, and no foot where there is no split', () => {
    const { container } = chart([
      { t: START, v: 8, part: 2 },
      { t: START + DAY, v: 5 },
      // A part larger than the whole is the whole.
      { t: START + 2 * DAY, v: 3, part: 9 },
    ]);
    const [split, plain, over] = slots(container);
    const foot = (slot: HTMLElement) =>
      slot.querySelector<HTMLElement>('.crewlet-histogram__part')?.style.getPropertyValue('--crewlet-histogram-part');
    expect(foot(split!)).toBe('25%');
    expect(plain!.querySelector('.crewlet-histogram__part')).toBeNull();
    expect(foot(over!)).toBe('100%');
  });

  test('are a picture with no tab stop until the caller gives them something to do', () => {
    const { container } = chart(days([1, 2]));
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(slots(container)[0]!.getAttribute('title')).toBe(title(days([1])[0]!));
  });

  test('are buttons named by their bucket when they narrow the window', () => {
    const onSelect = vi.fn();
    const bars = days([1, 6]);
    chart(bars, { onSelect });
    fireEvent.click(screen.getByRole('button', { name: title(bars[1]!) }));
    expect(onSelect).toHaveBeenCalledWith(bars[1], 1);
  });
});

describe('the axis', () => {
  test('is drawn only when the caller formats a tick, and is hidden from assistive technology', () => {
    const bare = chart(days([1, 2, 3]));
    expect(bare.container.querySelector('.crewlet-histogram__axis')).toBeNull();
    cleanup();
    const { container } = chart(days([1, 2, 3]), { formatTick: tick });
    const axis = container.querySelector('.crewlet-histogram__axis')!;
    expect(axis.getAttribute('aria-hidden')).toBe('true');
    expect([...axis.children].map((el) => el.textContent)).toEqual(['09-16', '09-17', '09-18']);
  });

  test('centres an interior tick on its own bucket and pins the two ends', () => {
    const { container } = chart(days([0, 0, 0, 0]), { formatTick: tick });
    const drawn = [...container.querySelectorAll<HTMLElement>('.crewlet-histogram__tick')];
    expect(drawn).toHaveLength(4);
    expect(drawn[0]!.style.left).toBe('0px');
    expect(drawn[3]!.style.right).toBe('0px');
    expect(drawn[1]!.style.left).toBe('37.5%');
    expect(drawn[1]!.style.transform).toBe('translateX(-50%)');
  });

  test('labels the ends and an even whole stride between, five labels at most', () => {
    expect(histogramTicks(7)).toEqual([0, 2, 4, 6]);
    expect(histogramTicks(14)).toEqual([0, 4, 8, 13]);
    expect(histogramTicks(31)).toEqual([0, 10, 20, 30]);
    expect(histogramTicks(90)).toEqual([0, 23, 46, 69, 89]);
    for (let n = 1; n <= 90; n++) {
      const at = histogramTicks(n);
      expect(at.length, `${n} bars`).toBeLessThanOrEqual(5);
      expect(at[0]).toBe(0);
      expect(at[at.length - 1]).toBe(n - 1);
      const gaps = at.slice(1, -1).map((v, i) => v - at[i]!);
      expect(new Set(gaps).size, `${n} bars: ${at}`).toBeLessThanOrEqual(1);
    }
    expect(histogramTicks(3)).toEqual([0, 1, 2]);
    expect(histogramTicks(1)).toEqual([0]);
    expect(histogramTicks(0)).toEqual([]);
  });
});

describe('what it says without the picture', () => {
  test("states the caller's total inside the named group", () => {
    chart(days([1, 2]));
    const group = screen.getByRole('group', { name: 'Turns over the window' });
    expect(group.textContent).toContain('12 turns in this window');
  });

  test('is one sentence in place of the chart when there are no bars', () => {
    const { container } = chart([], { emptyLabel: 'No turns in this window' });
    expect(screen.getByText('No turns in this window')).toBeTruthy();
    expect(container.querySelector('.crewlet-histogram')).toBeNull();
  });
});
