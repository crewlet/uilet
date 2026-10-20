/**
 * A live preview: the budget's bookkeeping (a cap on renders at once, the
 * oldest ask first, a render given back when it has drawn, frames kept and
 * capped apart, a parked frame reclaimed only for a frame that needs its
 * place, one grant per tick when paced), the still copy (cloned, a canvas as
 * an image, nothing that loads), and the component's life: the stand-in with
 * no observer, the content rendered only near what its scroller shows after
 * a dwell and a grant, copied ONCE when it has drawn and then unmounted, a
 * copy that never refreshes and holds nothing live, kept by key for the
 * provider's life and taken afresh by a new one, a frame kept rather than
 * copied, and a live layer and a copy that are inert and unannounced.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  createLivePreviewBudget,
  createLivePreviewStills,
  immediately,
  LIVE_PREVIEW_RENDER_MS,
  LivePreview,
  LivePreviewBudgetProvider,
  PREVIEW_FILL_MAX_CUT,
  PreviewScale,
  useLivePreview,
  type LivePreviewSchedule,
} from './index.js';
import { scrollRoot } from './LivePreview.js';
import { copyOf } from './stills.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('the budget renders up to its cap, then the oldest ask first as renders end', () => {
  const budget = createLivePreviewBudget(2);
  const granted: string[] = [];
  const a = budget.request(() => granted.push('a'));
  const b = budget.request(() => granted.push('b'));
  const c = budget.request(() => granted.push('c'));
  budget.request(() => granted.push('d'));
  expect(granted).toEqual(['a', 'b']);
  expect([budget.live(), budget.waiting()]).toEqual([2, 2]);
  c.release(); // withdrawn before it was granted
  a.drawn(); // a render that has drawn gives its slot back
  b.release(); // and so does one given up
  expect(granted).toEqual(['a', 'b', 'd']);
  a.release(); // a drawn page holds nothing more, so this does nothing
  expect([budget.live(), budget.waiting()]).toEqual([1, 0]);
});

// A RENDER IS NOT A HOLD: a page that has drawn is a still copy and keeps
// nothing, and one whose box left runs on to its end.
test('a page holds a slot only while it renders, wherever its box goes', () => {
  const budget = createLivePreviewBudget(1);
  const page = budget.request(() => {});
  page.park();
  expect([budget.live(), budget.parked()]).toEqual([1, 0]);
  expect(page.resume()).toBe(true);
  page.drawn();
  expect([budget.live(), budget.frames(), budget.parked()]).toEqual([0, 0, 0]);
  expect(page.resume()).toBe(false);
});

// A FRAME IS KEPT, not copied: drawn, it gives its render back and keeps its
// place among the frames, which a frame coming near takes back only once the
// reader has left it, the one left longest ago first.
test('a drawn frame keeps its place, and is reclaimed only when parked, for a frame that needs it', () => {
  const budget = createLivePreviewBudget(4, immediately, 2);
  const events: string[] = [];
  const one = budget.request(() => events.push('frame 1'), () => events.push('reclaim 1'), true);
  const two = budget.request(() => events.push('frame 2'), () => events.push('reclaim 2'), true);
  one.drawn();
  two.drawn();
  expect([budget.live(), budget.frames()]).toEqual([0, 2]);
  budget.request(() => events.push('frame 3'), undefined, true);
  expect(events).toEqual(['frame 1', 'frame 2']);
  two.park();
  one.park();
  expect(events).toEqual(['frame 1', 'frame 2', 'reclaim 2', 'frame 3']);
  expect(two.resume()).toBe(false);
  // Back before anybody needed it: still held, and no longer reclaimable.
  expect(one.resume()).toBe(true);
  budget.request(() => events.push('frame 4'), undefined, true);
  expect(events).toEqual(['frame 1', 'frame 2', 'reclaim 2', 'frame 3']);
  expect([budget.frames(), budget.parked(), budget.waiting()]).toEqual([2, 0, 1]);
});

test('a frame waiting on the frames cap holds up no page behind it', () => {
  const budget = createLivePreviewBudget(4, immediately, 1);
  const events: string[] = [];
  budget.request(() => events.push('frame 1'), undefined, true).drawn();
  budget.request(() => events.push('frame 2'), undefined, true);
  budget.request(() => events.push('page'));
  expect(events).toEqual(['frame 1', 'page']);
  expect([budget.live(), budget.frames(), budget.waiting()]).toEqual([1, 1, 1]);
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
  const budget = createLivePreviewBudget(6, later);
  const granted: number[] = [];
  for (let i = 0; i < 3; i++) budget.request(() => granted.push(i));
  expect(granted).toEqual([]);
  ticks.shift()!();
  expect(granted).toEqual([0]);
  ticks.shift()!();
  ticks.shift()!();
  expect(granted).toEqual([0, 1, 2]);
});

test('the store keeps copies by key up to its size, dropping the one used longest ago', () => {
  const stills = createLivePreviewStills(2);
  const copy = { nodes: [], width: 600, size: { w: 1, h: 1 } };
  stills.put('a', copy);
  stills.put('b', 'failed');
  expect(stills.get('a')).toBe(copy); // using a moves it to the back
  stills.put('c', copy);
  expect([stills.get('a'), stills.get('b'), stills.get('c')]).toEqual([copy, undefined, copy]);
});

test('a copy is the drawn DOM, a canvas as an image of it, with nothing that would load again', () => {
  const host = document.createElement('div');
  host.innerHTML = '<p class="x">text</p><canvas class="chart"></canvas><iframe src="about:blank"></iframe><video></video>';
  const canvas = host.querySelector('canvas')!;
  canvas.toDataURL = () => 'data:image/png;base64,AAAA';
  const copied = copyOf([...host.childNodes]);
  expect(copied).toHaveLength(2);
  const [p, drawn] = copied as Element[];
  expect(p!.outerHTML).toBe('<p class="x">text</p>');
  expect(drawn!.tagName).toBe('IMG');
  expect(drawn!.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  expect(drawn!.getAttribute('class')).toBe('chart');
  // Inside a copied tree as well as at its top.
  const [whole] = copyOf([host]) as Element[];
  expect(whole!.querySelector('iframe, video, canvas')).toBeNull();
  expect(whole!.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  // The drawing itself is left as it was.
  expect(host.querySelector('canvas')).toBe(canvas);
});

/** Observers per box, so a test can move each of several boxes on its own. */
const reports = new Map<Element, (near: boolean) => void>();
let watching = 0;
class Observers {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    watching++;
    reports.set(target, (near) => this.callback([{ isIntersecting: near, target } as IntersectionObserverEntry], this as never));
  }
  disconnect() {
    watching--;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  reports.clear();
  watching = 0;
});

/** Content that says how it ended, and counts its mounts. */
let mounts = 0;
let unmounts = 0;
function Content({ outcome, text = 'live' }: { outcome: 'ready' | 'fail' | 'none'; text?: string }) {
  const preview = useLivePreview();
  useEffect(() => {
    mounts++;
    if (outcome === 'ready') preview.ready();
    if (outcome === 'fail') preview.fail();
    return () => {
      unmounts++;
    };
  }, [outcome, preview]);
  return <span data-testid="content">{text}</span>;
}
beforeEach(() => {
  mounts = 0;
  unmounts = 0;
});

const box = (container: HTMLElement, name = '') => container.querySelector(`.crewlet-live-preview${name}`)!;
const near = (el: Element, is = true) => act(() => reports.get(el)!(is));
/**
 * Lets the dwell, the paced grant and the frames a copy waits for all run:
 * each step is a commit of its own, so each is a turn of its own.
 */
const settle = () => {
  for (let i = 0; i < 4; i++) act(() => void vi.advanceTimersByTime(50));
};

function Gallery({ children, max = 6 }: { children: ReactNode; max?: number }) {
  return <LivePreviewBudgetProvider max={max}>{children}</LivePreviewBudgetProvider>;
}

test('with no observer, the stand-in is all that is drawn', () => {
  render(
    <LivePreview fallback={<span data-testid="fallback" />}>
      <Content outcome="ready" />
    </LivePreview>,
  );
  expect(screen.getByTestId('fallback')).toBeDefined();
  expect(screen.queryByTestId('content')).toBeNull();
});

test('near for a dwell and granted, the content renders out of sight, inert and unannounced', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <Gallery>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={100}>
        <Content outcome="none" />
      </LivePreview>
    </Gallery>,
  );
  const el = box(container);
  expect(el.getAttribute('data-state')).toBe('idle');
  near(el);
  expect(el.getAttribute('data-state')).toBe('waiting');
  act(() => void vi.advanceTimersByTime(100));
  act(() => void vi.advanceTimersByTime(50));
  expect(el.getAttribute('data-state')).toBe('live');
  const live = screen.getByTestId('content').closest('.crewlet-live-preview__live') as HTMLElement;
  expect(live.hasAttribute('inert')).toBe(true);
  expect(el.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByTestId('fallback')).toBeDefined();
});

// THE SNAPSHOT: drawn once, copied, and the live content unmounted at once.
// After it the preview holds nothing: no content, no observer, no timer.
test('once drawn, the content is copied, unmounted and never asked for again', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <Gallery>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0} snapshot="doc:1">
        <Content outcome="ready" text="the opening paragraph" />
      </LivePreview>
    </Gallery>,
  );
  const el = box(container);
  near(el);
  settle();
  expect(el.getAttribute('data-state')).toBe('ready');
  expect(el.querySelector('.crewlet-live-preview__live')).toBeNull();
  expect([mounts, unmounts]).toEqual([1, 1]);
  const still = el.querySelector('.crewlet-live-preview__still')!;
  expect(still.textContent).toBe('the opening paragraph');
  expect(still.hasAttribute('inert')).toBe(true);
  expect(el.hasAttribute('data-fresh')).toBe(true);
  // Nothing watches it and nothing is waiting to run.
  expect(watching).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
  // Scrolled away and back, any number of times: never drawn again.
  for (let i = 0; i < 3; i++) {
    act(() => reports.get(el)?.(false));
    act(() => reports.get(el)?.(true));
    settle();
  }
  expect(mounts).toBe(1);
  expect(el.querySelector('.crewlet-live-preview__still')?.textContent).toBe('the opening paragraph');
});

test('a render frees its slot for the next as soon as it is copied', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <Gallery max={1}>
      <LivePreview fallback={null} dwellMs={0} className="a">
        <Content outcome="ready" text="a" />
      </LivePreview>
      <LivePreview fallback={null} dwellMs={0} className="b">
        <Content outcome="ready" text="b" />
      </LivePreview>
    </Gallery>,
  );
  const [a, b] = [box(container, '.a'), box(container, '.b')];
  near(a);
  near(b);
  settle();
  settle();
  // Both on screen, one render at a time, and both copied.
  expect([a.getAttribute('data-state'), b.getAttribute('data-state')]).toEqual(['ready', 'ready']);
  expect([a.textContent, b.textContent]).toEqual(['a', 'b']);
  expect(mounts).toBe(2);
});

// A RENDER RUNS TO ITS END: what it is drawing is about to be kept, so a box
// the reader scrolled past while it drew is copied all the same.
test('content granted a render is copied even if its box has left', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  let finish: (() => void) | null = null;
  function Slow() {
    const preview = useLivePreview();
    useEffect(() => {
      finish = () => preview.ready();
    }, [preview]);
    return <span>slow</span>;
  }
  const { container } = render(
    <Gallery>
      <LivePreview fallback={null} dwellMs={0}>
        <Slow />
      </LivePreview>
    </Gallery>,
  );
  const el = box(container);
  near(el);
  settle();
  near(el, false);
  act(() => finish!());
  settle();
  expect(el.getAttribute('data-state')).toBe('ready');
  expect(el.querySelector('.crewlet-live-preview__still')?.textContent).toBe('slow');
});

// KEPT FOR THE PAGE: a card mounted again under the same provider and key
// shows its copy at once, with nothing rendered; a fresh page (a new
// provider) takes a new snapshot.
test('a copy is kept by key for the provider, and a page loaded afresh draws afresh', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const page = (shown: boolean) => (
    <Gallery>
      {shown ? (
        <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0} snapshot="sheet:4">
          <Content outcome="ready" text="rows" />
        </LivePreview>
      ) : null}
    </Gallery>
  );
  const first = render(page(true));
  near(box(first.container));
  settle();
  expect(mounts).toBe(1);
  // Filtered away and back: the same copy, no render, no fade.
  first.rerender(page(false));
  first.rerender(page(true));
  const back = box(first.container);
  expect(back.getAttribute('data-state')).toBe('ready');
  expect(back.hasAttribute('data-fresh')).toBe(false);
  expect(back.querySelector('.crewlet-live-preview__still')?.textContent).toBe('rows');
  expect(mounts).toBe(1);
  expect(watching).toBe(0);
  // A refresh: a new provider, so a new snapshot.
  first.unmount();
  const second = render(page(true));
  expect(box(second.container).getAttribute('data-state')).toBe('idle');
  near(box(second.container));
  settle();
  expect(mounts).toBe(2);
});

test('a new key is a new snapshot', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const at = (version: number) => (
    <Gallery>
      <LivePreview fallback={null} dwellMs={0} snapshot={`doc:${version}`}>
        <Content outcome="ready" text={`version ${version}`} />
      </LivePreview>
    </Gallery>
  );
  const { container, rerender } = render(at(1));
  near(box(container));
  settle();
  rerender(at(2));
  expect(box(container).getAttribute('data-state')).toBe('idle');
  near(box(container));
  settle();
  expect(box(container).textContent).toBe('version 2');
  expect(mounts).toBe(2);
});

test('a copy laid out at a width is placed in a layer scaled to its box, and rescaled when the box changes size', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const resized: ((w: number) => void)[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        resized.push((w) => {
          rect.mockReturnValue({ width: w, height: (w * 9) / 16 } as DOMRect);
          this.callback([{ target } as ResizeObserverEntry], this as never);
        });
      }
      unobserve() {}
      disconnect() {}
    },
  );
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 180 } as DOMRect);
  const { container } = render(
    <Gallery>
      <LivePreview fallback={null} dwellMs={0} width={640}>
        <Content outcome="ready" text="page" />
      </LivePreview>
    </Gallery>,
  );
  near(box(container));
  settle();
  const layer = container.querySelector<HTMLElement>('.crewlet-live-preview__still .crewlet-preview-scale__layer')!;
  expect(layer.textContent).toBe('page');
  expect([layer.style.width, layer.style.height, layer.style.transform]).toEqual(['640px', '360px', 'translate(0px, 0px) scale(0.5)']);
  act(() => resized.at(-1)!(160));
  expect(layer.style.transform).toBe('translate(0px, 0px) scale(0.25)');
  expect(mounts).toBe(1);
  rect.mockRestore();
});

// A FRAME IS KEPT, never copied: there is nothing in this document to copy.
test('a framed preview keeps its content once drawn, and parks it when the reader leaves', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <Gallery>
      <LivePreview fallback={null} dwellMs={0} frame snapshot="page:1">
        <Content outcome="ready" text="framed" />
      </LivePreview>
    </Gallery>,
  );
  const el = box(container);
  near(el);
  settle();
  expect(el.getAttribute('data-state')).toBe('ready');
  expect(el.querySelector('.crewlet-live-preview__still')).toBeNull();
  expect(el.querySelector('.crewlet-live-preview__live')?.textContent).toBe('framed');
  near(el, false);
  near(el);
  settle();
  expect(el.getAttribute('data-state')).toBe('ready');
  expect(mounts).toBe(1);
});

test('a parked frame is taken back for a frame that needs its place, and shows its stand-in', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <LivePreviewBudgetProvider maxFrames={1}>
      <LivePreview fallback={<span data-testid="fallback-a" />} dwellMs={0} frame className="a">
        <Content outcome="ready" text="a" />
      </LivePreview>
      <LivePreview fallback={null} dwellMs={0} frame className="b">
        <Content outcome="ready" text="b" />
      </LivePreview>
    </LivePreviewBudgetProvider>,
  );
  const [a, b] = [box(container, '.a'), box(container, '.b')];
  near(a);
  settle();
  near(b);
  settle();
  expect(b.getAttribute('data-state')).toBe('waiting');
  near(a, false);
  settle();
  expect([a.getAttribute('data-state'), b.getAttribute('data-state')]).toEqual(['idle', 'ready']);
  expect(a.querySelector('.crewlet-live-preview__live')).toBeNull();
});

// THE MARGIN IS THE SCROLLER'S: rooted at the window, an observer's margin
// is clipped away by a page that scrolls inside a frame, and a box was only
// ever drawn once it was already on screen.
test('a preview watches against the nearest container that scrolls', () => {
  const roots: (Element | Document | null | undefined)[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class extends Observers {
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
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <LivePreview fallback={null} dwellMs={100}>
      <Content outcome="ready" />
    </LivePreview>,
  );
  const el = box(container);
  near(el);
  act(() => void vi.advanceTimersByTime(40));
  near(el, false);
  act(() => void vi.advanceTimersByTime(500));
  expect(el.getAttribute('data-state')).toBe('idle');
  expect(screen.queryByTestId('content')).toBeNull();
});

test('content that fails keeps the stand-in for good, and its key remembers it', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const page = (shown: boolean) => (
    <Gallery max={1}>
      {shown ? (
        <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0} snapshot="empty:1">
          <Content outcome="fail" />
        </LivePreview>
      ) : null}
    </Gallery>
  );
  const { container, rerender } = render(page(true));
  near(box(container));
  settle();
  expect(box(container).getAttribute('data-state')).toBe('failed');
  expect(screen.queryByTestId('content')).toBeNull();
  expect(watching).toBe(0);
  rerender(page(false));
  rerender(page(true));
  expect(box(container).getAttribute('data-state')).toBe('failed');
  expect(mounts).toBe(1);
});

test('a render that never draws gives up and keeps its stand-in', () => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <Gallery>
      <LivePreview fallback={<span data-testid="fallback" />} dwellMs={0}>
        <Content outcome="none" />
      </LivePreview>
    </Gallery>,
  );
  near(box(container));
  settle();
  expect(box(container).getAttribute('data-state')).toBe('live');
  act(() => void vi.advanceTimersByTime(LIVE_PREVIEW_RENDER_MS));
  expect(box(container).getAttribute('data-state')).toBe('failed');
  expect(screen.queryByTestId('content')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

test('a disabled preview never asks', () => {
  vi.stubGlobal('IntersectionObserver', Observers);
  const { container } = render(
    <LivePreview fallback={null} disabled>
      <Content outcome="ready" />
    </LivePreview>,
  );
  expect(watching).toBe(0);
  expect(box(container).getAttribute('data-state')).toBe('idle');
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

test('a filled layer covers the box edge to edge, centred across and held at the top', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  // A LAPTOP'S BOARD (16:10) IN A CARD'S 16:9: contained, it left an empty
  // strip down each side of the card; filled, it loses a tenth of its foot.
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 282.9, height: 158.1 } as DOMRect);
  const { container } = render(
    <PreviewScale width={1440} height={900} fit="fill">
      <span />
    </PreviewScale>,
  );
  const layer = container.querySelector<HTMLElement>('.crewlet-preview-scale__layer')!;
  const k = 282.9 / 1440;
  expect(layer.style.transform).toBe(`translate(${(282.9 - 1440 * k) / 2}px, 0px) scale(${k})`);
  expect(900 * k).toBeGreaterThanOrEqual(158.1);
  rect.mockRestore();
});

test('a filled layer that would lose more than a fifth of itself is contained instead', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  // A PHONE'S BOARD in the same card would show only its top fifth filled.
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 320, height: 180 } as DOMRect);
  const { container } = render(
    <PreviewScale width={390} height={844} fit="fill">
      <span />
    </PreviewScale>,
  );
  const layer = container.querySelector<HTMLElement>('.crewlet-preview-scale__layer')!;
  const k = 180 / 844;
  expect(layer.style.transform).toBe(`translate(${(320 - 390 * k) / 2}px, 0px) scale(${k})`);
  expect(PREVIEW_FILL_MAX_CUT).toBe(0.2);
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
