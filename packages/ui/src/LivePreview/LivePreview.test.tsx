/**
 * A live preview: the budget's bookkeeping (a cap, the oldest ask first, a
 * slot given back and an ask withdrawn, one grant per tick when paced, a
 * parked slot reclaimed only for an ask that has none, the one parked longest
 * first), and the component's life: the stand-in with no observer, the
 * content mounted only near what its scroller shows after a dwell and a
 * grant, the swap on `ready`, the content kept when it leaves and found again
 * when it comes back, a still copy where its slot was taken back, the slot
 * given back on `fail`, and a live layer that is inert and unannounced.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLivePreviewBudget, immediately, LivePreview, LivePreviewBudgetProvider, PreviewScale, useLivePreview, type LivePreviewSchedule } from './index.js';
import { scrollRoot } from './LivePreview.js';

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
  c.release(); // withdrawn before it was granted
  a.release(); // a slot given back
  expect(granted).toEqual(['a', 'b', 'd']);
  a.release(); // a second give-back does nothing
  expect([budget.live(), budget.waiting()]).toEqual([2, 0]);
});

// WHAT HAS DRAWN STAYS DRAWN until a slot is needed: a parked slot is held,
// and taken back only for an ask with none, the one that left first first.
test('a parked slot is reclaimed only for an ask that has none, the one parked longest first', () => {
  const budget = createLivePreviewBudget(2);
  const events: string[] = [];
  const a = budget.request(() => events.push('grant a'), () => events.push('reclaim a'));
  const b = budget.request(() => events.push('grant b'), () => events.push('reclaim b'));
  b.park();
  a.park();
  expect([budget.live(), budget.parked()]).toEqual([2, 2]);
  expect(events).toEqual(['grant a', 'grant b']);
  budget.request(() => events.push('grant c'));
  expect(events).toEqual(['grant a', 'grant b', 'reclaim b', 'grant c']);
  expect(b.resume()).toBe(false);
  // Back before anybody needed it: still held, and no longer reclaimable.
  expect(a.resume()).toBe(true);
  budget.request(() => events.push('grant d'));
  expect(events).toEqual(['grant a', 'grant b', 'reclaim b', 'grant c']);
  expect([budget.live(), budget.parked(), budget.waiting()]).toEqual([2, 0, 1]);
});

// A RECLAIM THE READER WOULD SEE COMES LAST: a frame's page cannot be kept
// as a still copy, so a preview that can is reclaimed before it.
test('a slot whose drawing survives as a still copy is reclaimed before one whose stand-in would show', () => {
  const budget = createLivePreviewBudget(2);
  const reclaimed: string[] = [];
  const frame = budget.request(() => {}, () => reclaimed.push('frame'));
  const page = budget.request(() => {}, () => reclaimed.push('page'));
  frame.park(false);
  page.park(true);
  budget.request(() => {});
  expect(reclaimed).toEqual(['page']);
  // With nothing else parked, the frame is reclaimed all the same.
  budget.request(() => {});
  expect(reclaimed).toEqual(['page', 'frame']);
  expect([budget.live(), budget.parked(), budget.waiting()]).toEqual([2, 0, 0]);
});

// A FRAME IS THE DEAR THING: frames have a cap of their own, a frame over it
// takes back only a parked frame, and a page behind a waiting frame is not
// held up by it.
test('frames are capped apart, and a frame waiting on its cap holds up no page behind it', () => {
  const budget = createLivePreviewBudget(4, immediately, 1);
  const events: string[] = [];
  const one = budget.request(() => events.push('frame 1'), () => events.push('reclaim frame 1'), true);
  const page = budget.request(() => events.push('page'), () => events.push('reclaim page'));
  budget.request(() => events.push('frame 2'), undefined, true);
  budget.request(() => events.push('page 2'));
  expect(events).toEqual(['frame 1', 'page', 'page 2']);
  expect([budget.frames(), budget.waiting()]).toEqual([1, 1]);
  // A parked page frees nothing a frame needs.
  page.park(true);
  expect(events).toEqual(['frame 1', 'page', 'page 2']);
  one.park(false);
  expect(events).toEqual(['frame 1', 'page', 'page 2', 'reclaim frame 1', 'frame 2']);
  expect([budget.live(), budget.frames(), budget.parked(), budget.waiting()]).toEqual([3, 1, 1, 0]);
});

test('parking an ask that was never granted withdraws it', () => {
  const budget = createLivePreviewBudget(1);
  budget.request(() => {});
  const waiting = budget.request(() => {
    throw new Error('never granted');
  });
  waiting.park();
  expect([budget.live(), budget.parked(), budget.waiting()]).toEqual([1, 0, 0]);
  expect(waiting.resume()).toBe(false);
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
});

// THE GLITCH A READER SAW: a card that scrolled out was torn down and drew
// again from its stand-in when it came back. It is kept, and found again.
test('content that leaves and comes back is kept as it was, never drawn again', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observer);
  let mounts = 0;
  function Counted() {
    useEffect(() => {
      mounts++;
    }, []);
    return <Content outcome="ready" />;
  }
  const { container } = render(
    <LivePreviewBudgetProvider>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0}>
        <Counted />
      </LivePreview>
    </LivePreviewBudgetProvider>,
  );
  act(() => report!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(stateOf(container)).toBe('ready');
  act(() => report!(false));
  act(() => void vi.advanceTimersByTime(500));
  expect(stateOf(container)).toBe('ready');
  expect(screen.getByTestId('content')).toBeDefined();
  act(() => report!(true));
  act(() => void vi.advanceTimersByTime(500));
  expect(stateOf(container)).toBe('ready');
  expect(mounts).toBe(1);
});

/** Observers per box, so a test can move each of several boxes on its own. */
const reports = new Map<Element, (near: boolean) => void>();
class Observers {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    reports.set(target, (near) => this.callback([{ isIntersecting: near, target } as IntersectionObserverEntry], this as never));
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

test('a preview whose slot is taken back keeps a still copy of what it drew, and drops it once drawn again', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  reports.clear();
  const { container } = render(
    <LivePreviewBudgetProvider max={1}>
      <LivePreview fallback={<span data-testid="fallback-a" />} dwellMs={0} className="a">
        <span data-testid="a">first</span>
        <Content outcome="ready" />
      </LivePreview>
      <LivePreview fallback={<span data-testid="fallback-b" />} dwellMs={0} className="b">
        <Content outcome="ready" />
      </LivePreview>
    </LivePreviewBudgetProvider>,
  );
  const [a, b] = [container.querySelector('.a')!, container.querySelector('.b')!];
  act(() => reports.get(a)!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(a.getAttribute('data-state')).toBe('ready');
  // A leaves, B comes near and needs the one slot: A's is taken back.
  act(() => reports.get(a)!(false));
  act(() => reports.get(b)!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(b.getAttribute('data-state')).toBe('ready');
  expect(a.getAttribute('data-state')).toBe('idle');
  expect(a.querySelector('.crewlet-live-preview__live')).toBeNull();
  const still = a.querySelector('.crewlet-live-preview__still');
  expect(still?.textContent).toBe('firstlive');
  expect(still?.hasAttribute('inert')).toBe(true);
  // B leaves, A comes back: drawn again over its copy, which is then let go.
  act(() => reports.get(b)!(false));
  act(() => reports.get(a)!(true));
  act(() => void vi.advanceTimersByTime(50));
  expect(a.getAttribute('data-state')).toBe('ready');
  act(() => void vi.advanceTimersByTime(2000));
  expect(a.querySelector('.crewlet-live-preview__still')).toBeNull();
  expect(b.querySelector('.crewlet-live-preview__still')?.textContent).toBe('live');
});

// THE MARGIN IS THE SCROLLER'S: rooted at the window, an observer's margin
// is clipped away by a page that scrolls inside a frame, and a box was only
// ever drawn once it was already on screen.
test('a preview watches against the nearest container that scrolls', () => {
  const roots: (Element | Document | null | undefined)[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class extends Observer {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback);
        roots.push(options?.root);
      }
    },
  );
  const { container } = render(
    <div data-testid="scroller" style={{ overflowY: 'auto' }}>
      <div style={{ overflow: 'hidden' }}>
        <LivePreview fallback={null}>
          <Content outcome="ready" />
        </LivePreview>
      </div>
    </div>,
  );
  expect(roots).toEqual([screen.getByTestId('scroller')]);
  expect(scrollRoot(container.firstElementChild!)).toBeNull();
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
