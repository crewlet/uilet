/**
 * A live preview: the budget's bookkeeping (a cap, the oldest ask first, a
 * slot given back and an ask withdrawn, one grant per tick when paced), and
 * the component's life: the stand-in with no observer, the content mounted
 * only near the viewport after a dwell and a grant, the swap on `ready`, the
 * slot given back on `fail`, and a live layer that is inert and unannounced.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLivePreviewBudget, LivePreview, LivePreviewBudgetProvider, PreviewScale, useLivePreview, type LivePreviewSchedule } from './index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('the budget grants up to its cap, then the oldest ask first as slots free', () => {
  const budget = createLivePreviewBudget(2);
  const granted: string[] = [];
  const a = budget.request(() => granted.push('a'));
  budget.request(() => granted.push('b'));
  const c = budget.request(() => granted.push('c'));
  budget.request(() => granted.push('d'));
  expect(granted).toEqual(['a', 'b']);
  expect([budget.live(), budget.waiting()]).toEqual([2, 2]);
  c(); // withdrawn before it was granted
  a(); // a slot given back
  expect(granted).toEqual(['a', 'b', 'd']);
  a(); // a second give-back does nothing
  expect([budget.live(), budget.waiting()]).toEqual([2, 0]);
});

test('a paced budget grants one ask per tick', () => {
  const ticks: (() => void)[] = [];
  const later: LivePreviewSchedule = (run) => {
    ticks.push(run);
    return () => ticks.splice(ticks.indexOf(run), 1);
  };
  const budget = createLivePreviewBudget(12, later);
  const granted: number[] = [];
  for (let i = 0; i < 3; i++) budget.request(() => granted.push(i));
  expect(granted).toEqual([]);
  ticks.shift()!();
  expect(granted).toEqual([0]);
  ticks.shift()!();
  ticks.shift()!();
  expect(granted).toEqual([0, 1, 2]);
});

/** An observer whose boxes are near the viewport when the test says so. */
let report: ((near: boolean) => void) | null = null;
class Observer {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    report = (near) => this.callback([{ isIntersecting: near, target } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function Content({ outcome }: { outcome: 'ready' | 'fail' | 'none' }) {
  const preview = useLivePreview();
  useEffect(() => {
    if (outcome === 'ready') preview.ready();
    if (outcome === 'fail') preview.fail();
  }, [outcome, preview]);
  return <span data-testid="content">live</span>;
}

const stateOf = (container: HTMLElement) => container.querySelector('.crewlet-live-preview')?.getAttribute('data-state');

beforeEach(() => {
  report = null;
});

test('with no observer, the stand-in is all that is drawn', () => {
  render(
    <LivePreview fallback={<span data-testid="fallback" />}>
      <Content outcome="ready" />
    </LivePreview>,
  );
  expect(screen.getByTestId('fallback')).toBeDefined();
  expect(screen.queryByTestId('content')).toBeNull();
});

test('near the viewport for a dwell and granted a slot, the content mounts, inert and unannounced, and replaces the stand-in once ready', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observer);
  const { container } = render(
    <LivePreviewBudgetProvider>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={100}>
        <Content outcome="ready" />
      </LivePreview>
    </LivePreviewBudgetProvider>,
  );
  expect(stateOf(container)).toBe('idle');
  act(() => report!(true));
  expect(stateOf(container)).toBe('waiting');
  act(() => void vi.advanceTimersByTime(100));
  // The provider paces grants by frame; the frame and its task run here.
  act(() => void vi.advanceTimersByTime(50));
  expect(stateOf(container)).toBe('ready');
  const live = screen.getByTestId('content').closest('.crewlet-live-preview__live') as HTMLElement;
  expect(live.hasAttribute('inert')).toBe(true);
  expect(live.closest('.crewlet-live-preview')?.getAttribute('aria-hidden')).toBe('true');
  act(() => report!(false));
  expect(screen.queryByTestId('content')).toBeNull();
  expect(stateOf(container)).toBe('idle');
});

test('a box that only flies past asks for nothing', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observer);
  const { container } = render(
    <LivePreview fallback={null} dwellMs={100}>
      <Content outcome="ready" />
    </LivePreview>,
  );
  act(() => report!(true));
  act(() => void vi.advanceTimersByTime(40));
  act(() => report!(false));
  act(() => void vi.advanceTimersByTime(500));
  expect(stateOf(container)).toBe('idle');
  expect(screen.queryByTestId('content')).toBeNull();
});

test('content that fails keeps the stand-in and gives its slot back for good', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observer);
  const { container } = render(
    <LivePreviewBudgetProvider max={1}>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0}>
        <Content outcome="fail" />
      </LivePreview>
    </LivePreviewBudgetProvider>,
  );
  act(() => report!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(stateOf(container)).toBe('failed');
  expect(screen.queryByTestId('content')).toBeNull();
  act(() => report!(false));
  act(() => report!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(stateOf(container)).toBe('failed');
});

test('a disabled preview never asks', () => {
  vi.stubGlobal('IntersectionObserver', Observer);
  const { container } = render(
    <LivePreview fallback={null} disabled>
      <Content outcome="ready" />
    </LivePreview>,
  );
  expect(report).toBeNull();
  expect(stateOf(container)).toBe('idle');
});

test('a scaled layer is laid out at its own width and scaled to the box', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 180 } as DOMRect);
  const { container } = render(
    <PreviewScale width={1280}>
      <span />
    </PreviewScale>,
  );
  const layer = container.querySelector<HTMLElement>('.crewlet-preview-scale__layer')!;
  expect(layer.style.width).toBe('1280px');
  expect(layer.style.height).toBe('720px');
  expect(layer.style.transform).toBe('translate(0px, 0px) scale(0.25)');
  rect.mockRestore();
});

test('a contained layer is scaled to fit the box whole, and centred', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 180 } as DOMRect);
  const { container } = render(
    <PreviewScale width={390} height={844} fit="contain">
      <span />
    </PreviewScale>,
  );
  const layer = container.querySelector<HTMLElement>('.crewlet-preview-scale__layer')!;
  const k = 180 / 844;
  expect(layer.style.transform).toBe(`translate(${(320 - 390 * k) / 2}px, 0px) scale(${k})`);
  rect.mockRestore();
});
