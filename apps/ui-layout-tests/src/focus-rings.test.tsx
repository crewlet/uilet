/**
 * NO FOCUS RING IS CUT BY A CLIPPING BOX. A ring is two pixels round the
 * focused control, and every box between it and the page that clips (a
 * scrolling pill row, truncating text, a clipped cell) cuts whatever part of
 * it lies outside that box's padding edge: a segmented option's ring was two
 * side bars, and a link's in truncating text lost three of its sides. Each
 * control here is focused from the keyboard and its ring measured against
 * every clipping box round it.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { Link, SegmentedControl, Tabs, Text } from '@crewlethq/ui';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  flushSync(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

async function mount(node: ReactNode, width: number): Promise<HTMLElement> {
  await page.viewport(1024, 768);
  host = document.createElement('div');
  host.style.cssText = `width: ${width}px; padding: 24px;`;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root!.render(node));
  return host;
}

interface Cut {
  by: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  px: number;
}

/**
 * The ring that is drawn for the focused element (its own, or the one a box
 * round it draws in its place), and every side of it a clipping box cuts.
 */
function ringCuts(): { drawn: boolean; cuts: Cut[] } {
  const focused = document.activeElement as HTMLElement;
  const visible = (el: Element) => {
    const style = getComputedStyle(el);
    const colour = style.outlineColor;
    return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0 && !/, 0\)$|transparent/.test(colour);
  };
  let ringed: Element | null = focused;
  while (ringed && !visible(ringed)) ringed = ringed.parentElement;
  if (!ringed) return { drawn: false, cuts: [] };
  const style = getComputedStyle(ringed);
  const grow = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
  const box = ringed.getBoundingClientRect();
  const ring = { top: box.top - grow, left: box.left - grow, right: box.right + grow, bottom: box.bottom + grow };
  const cuts: Cut[] = [];
  for (let el = ringed.parentElement; el; el = el.parentElement) {
    const clip = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const inner = {
      top: rect.top + el.clientTop,
      left: rect.left + el.clientLeft,
      right: rect.left + el.clientLeft + el.clientWidth,
      bottom: rect.top + el.clientTop + el.clientHeight,
    };
    const by = el.className || el.tagName;
    if (clip.overflowY !== 'visible') {
      if (inner.top - ring.top > 0.1) cuts.push({ by, side: 'top', px: inner.top - ring.top });
      if (ring.bottom - inner.bottom > 0.1) cuts.push({ by, side: 'bottom', px: ring.bottom - inner.bottom });
    }
    if (clip.overflowX !== 'visible') {
      if (inner.left - ring.left > 0.1) cuts.push({ by, side: 'left', px: inner.left - ring.left });
      if (ring.right - inner.right > 0.1) cuts.push({ by, side: 'right', px: ring.right - inner.right });
    }
  }
  return { drawn: true, cuts };
}

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

describe('a focus ring', () => {
  test('round every option of a segmented control is whole, the first and the last included', async () => {
    await mount(<SegmentedControl label="Time range" semantics="radio" options={RANGES} value="7d" onValueChange={() => {}} />, 600);
    await userEvent.tab();
    for (const _ of RANGES) {
      expect(ringCuts()).toEqual({ drawn: true, cuts: [] });
      await userEvent.keyboard('{ArrowRight}');
    }
  });

  test('round a pill tab is whole, and the row scrolls inside a narrow place rather than growing past it', async () => {
    const tabs = ['Board', 'List', 'Table', 'Timeline', 'Calendar', 'Workload'].map((label) => ({
      value: label.toLowerCase(),
      label,
    }));
    const el = await mount(<Tabs variant="pill" ariaLabel="View" items={tabs} value="board" onValueChange={() => {}} />, 240);
    const row = el.querySelector('.crewlet-tabs--pill')!;
    expect(row.getBoundingClientRect().width).toBeLessThanOrEqual(240.5);
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    await userEvent.tab();
    for (const _ of tabs) {
      // Polled: a tab past the edge is brought into view by a scroll that eases.
      await expect.poll(ringCuts).toEqual({ drawn: true, cuts: [] });
      await userEvent.keyboard('{ArrowRight}');
    }
  });

  test('round a link in truncating text is whole, inside a cell that clips too', async () => {
    await mount(
      <div style={{ overflow: 'hidden', width: 160 }}>
        <Text truncate>
          <Link href="#seat">agent-with-a-long-seat-name-that-does-not-fit</Link>
        </Text>
      </div>,
      400,
    );
    await userEvent.tab();
    expect(document.activeElement?.tagName).toBe('A');
    expect(ringCuts()).toEqual({ drawn: true, cuts: [] });
  });
});
