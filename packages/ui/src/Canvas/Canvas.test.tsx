/**
 * The canvas's wiring: who owns a key, a wheel and a finger, and that a data
 * push never moves the view. The arithmetic is `geometry.test.tsx`; jsdom has
 * no layout, so a controllable ResizeObserver feeds the viewport's size.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { createRef, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LAYER_REPOSITION_EVENT, useLayerContainer } from '../Layer/index.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { Canvas, gridOf, type CanvasCursor, type CanvasHandle } from './Canvas.js';

/** The stylesheet's own source, for the rules jsdom cannot resolve a value in. */
const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Canvas.css'), 'utf8');
import {
  CANVAS_ZOOM_STEP,
  clampPan,
  fitView,
  zoomLimits,
  type CanvasRect,
  type CanvasView,
} from './geometry.js';

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;

class FakeResizeObserver {
  static last: FakeResizeObserver | null = null;
  static all: FakeResizeObserver[] = [];
  constructor(private callback: Callback) {
    FakeResizeObserver.last = this;
    FakeResizeObserver.all.push(this);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  resize(width: number, height: number) {
    act(() => this.callback([{ contentRect: { width, height } }]));
  }
}

// Assigned rather than stubbed: the setup file defines the property writable
// but not configurable, so it can be replaced and must be put back by hand.
const realResizeObserver = globalThis.ResizeObserver;
beforeEach(() => {
  FakeResizeObserver.all = [];
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
});

/** Every observer this canvas made sees the viewport's size: an end bar observes its own box too. */
const resizeAll = (size: { width: number; height: number }) => {
  for (const observer of FakeResizeObserver.all) observer.resize(size.width, size.height);
};
afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = realResizeObserver;
});

const SIZE = { width: 800, height: 600 };
const SMALL: CanvasRect = { x: 0, y: 0, width: 400, height: 300 };

function Harness({
  content,
  handle,
  onItem,
}: {
  content: CanvasRect | null;
  handle?: Ref<CanvasHandle> | undefined;
  onItem?: (() => void) | undefined;
}) {
  return (
    <Canvas label="Organization chart" content={content} ref={handle}>
      <div role="tree" aria-label="Units">
        {/* A stand-in for a consumer's own item, so a drag can be shown not to
            reach it. Its keys are TreeCanvas's job, not this fixture's. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- see above */}
        <div role="treeitem" aria-selected={false} tabIndex={-1} onClick={onItem}>
          Chief Executive
        </div>
      </div>
      <button type="button">card action</button>
    </Canvas>
  );
}

function world(container: HTMLElement): HTMLElement {
  return container.querySelector('.crewlet-canvas__world') as HTMLElement;
}

function viewOf(container: HTMLElement): CanvasView {
  const match = /translate\((-?[\d.e+-]+)px, (-?[\d.e+-]+)px\) scale\(([\d.e+-]+)\)/.exec(
    world(container).style.transform,
  );
  if (!match) throw new Error(`no transform on the world layer: ${world(container).style.transform}`);
  return { x: Number(match[1]), y: Number(match[2]), k: Number(match[3]) };
}

function viewport(): HTMLElement {
  return screen.getByRole('group', { name: 'Organization chart' });
}

function mount(content: CanvasRect | null = SMALL, onItem?: () => void) {
  const handle = createRef<CanvasHandle>();
  const utils = render(<Harness content={content} handle={handle} onItem={onItem} />);
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  return { ...utils, handle };
}

test('the viewport is a focusable, labelled canvas that says what its keys do', () => {
  mount();
  const el = viewport();
  expect(el.tabIndex).toBe(0);
  expect(el.getAttribute('aria-roledescription')).toBe('canvas');
  const help = document.getElementById(el.getAttribute('aria-describedby')!);
  expect(help?.textContent).toMatch(/plus and minus zoom/i);
});

test('nothing is shown or fitted until both the viewport and the content are measured', () => {
  const { container, rerender } = render(<Harness content={null} />);
  const canvas = container.querySelector('.crewlet-canvas')!;
  expect(canvas.getAttribute('data-ready')).toBe('false');

  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(canvas.getAttribute('data-ready')).toBe('false');

  const content = { x: 0, y: 0, width: 2000, height: 900 };
  rerender(<Harness content={content} />);
  expect(canvas.getAttribute('data-ready')).toBe('true');
  expect(viewOf(container)).toEqual(fitView(content, SIZE));
});

test('a data push that reshapes the content never refits the view the operator set', () => {
  const { container, rerender, handle } = mount();
  fireEvent.keyDown(viewport(), { key: '+' });
  const zoomed = viewOf(container);

  const grown = { x: 0, y: 0, width: 900, height: 700 };
  rerender(<Harness content={grown} handle={handle} />);
  expect(viewOf(container)).toEqual(zoomed);

  // Only a request fits again.
  act(() => handle.current!.fit());
  expect(viewOf(container)).toEqual(fitView(grown, SIZE));
});

test('a canvas that refits on resize refits a view nobody has moved since its fit, and keeps one somebody has', () => {
  // Without it, a resize keeps the zoom the old size was fitted at.
  mount(WIDE);
  const kept = viewOf(document.body).k;
  FakeResizeObserver.last!.resize(500, 600);
  expect(viewOf(document.body).k).toBe(kept);
  cleanup();

  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={WIDE} refitOnResize ref={handle}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(viewOf(container)).toEqual(fitView(WIDE, SIZE));
  // The window narrows: the untouched fit follows it, so nothing is cut off.
  const narrow = { width: 500, height: 600 };
  FakeResizeObserver.last!.resize(narrow.width, narrow.height);
  expect(viewOf(container)).toEqual(fitView(WIDE, narrow));
  // Once the reader zooms, a resize keeps their zoom.
  fireEvent.keyDown(viewport(), { key: '+' });
  const zoomed = viewOf(container).k;
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(viewOf(container).k).toBe(zoomed);
  // A fit they ask for is untouched again, and follows the next resize.
  act(() => handle.current!.fit());
  FakeResizeObserver.last!.resize(narrow.width, narrow.height);
  expect(viewOf(container)).toEqual(fitView(WIDE, narrow));
});

/*
 * The tab stop is an item inside the viewport, never the viewport, so the zoom
 * keys answer anywhere in the canvas, while the arrows belong to whatever holds
 * focus.
 */
test('the zoom keys answer anywhere inside the canvas, and the arrows do not', () => {
  const { container } = mount();
  const start = viewOf(container);
  const item = () => screen.getByRole('treeitem');

  fireEvent.keyDown(item(), { key: '+' });
  expect(viewOf(container).k).toBeCloseTo(start.k * CANVAS_ZOOM_STEP);
  fireEvent.keyDown(item(), { key: '-' });
  expect(viewOf(container).k).toBeCloseTo(start.k);
  fireEvent.keyDown(item(), { key: '0' });
  expect(viewOf(container)).toEqual(fitView(SMALL, SIZE));

  // The arrows stay the item's: a tree walks its nodes with them.
  fireEvent.keyDown(item(), { key: 'ArrowLeft' });
  expect(viewOf(container)).toEqual(viewOf(container));
  expect(viewOf(container)).toEqual(fitView(SMALL, SIZE));

  fireEvent.keyDown(viewport(), { key: '+' });
  expect(viewOf(container).k).toBeCloseTo(start.k * CANVAS_ZOOM_STEP);
  fireEvent.keyDown(viewport(), { key: '=', ctrlKey: true });
  expect(viewOf(container).k).toBeCloseTo(start.k * CANVAS_ZOOM_STEP * CANVAS_ZOOM_STEP);
  fireEvent.keyDown(viewport(), { key: '-', metaKey: true });
  expect(viewOf(container).k).toBeCloseTo(start.k * CANVAS_ZOOM_STEP);
  fireEvent.keyDown(viewport(), { key: '0' });
  expect(viewOf(container)).toEqual(fitView(SMALL, SIZE));

  // A plain `=` is not a zoom key: it belongs to whatever else wants it.
  expect(fireEvent.keyDown(viewport(), { key: '=' })).toBe(true);
});

/*
 * A TEXT FIELD KEEPS EVERY KEY IT IS SENT. `-` and `0` are characters, and the
 * canvas's own zoom field is the one place inside it where both are typed.
 */
test('a key typed into a field inside the canvas is not a zoom', () => {
  const { container } = mount();
  fireEvent.click(readout());
  const field = screen.getByRole('textbox');
  const before = viewOf(container);
  fireEvent.keyDown(field, { key: '-' });
  fireEvent.keyDown(field, { key: '0' });
  expect(viewOf(container)).toEqual(before);
});

test('the arrow keys pan a focused viewport', () => {
  const { container } = mount();
  const start = viewOf(container);
  fireEvent.keyDown(viewport(), { key: 'ArrowRight' });
  expect(viewOf(container).x).toBeLessThan(start.x);
});

test('a plain wheel belongs to the page until the canvas holds focus; Ctrl or Command zooms anywhere', () => {
  const { container } = mount();
  const start = viewOf(container);

  // Not focused: the page scrolls, and the chart does not move.
  expect(fireEvent.wheel(viewport(), { deltaY: 80 })).toBe(true);
  expect(viewOf(container)).toEqual(start);

  expect(fireEvent.wheel(viewport(), { deltaY: -100, ctrlKey: true })).toBe(false);
  const zoomed = viewOf(container);
  expect(zoomed.k).toBeCloseTo(start.k * CANVAS_ZOOM_STEP);

  viewport().focus();
  expect(fireEvent.wheel(viewport(), { deltaY: 80 })).toBe(false);
  expect(viewOf(container).y).not.toBe(zoomed.y);
});

function touch(type: 'pointerDown' | 'pointerMove' | 'pointerUp', id: number, x: number, y: number) {
  const init = { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, button: 0 };
  if (type === 'pointerDown') fireEvent.pointerDown(viewport(), init);
  else fireEvent[type](window, init);
}

test('one finger pans only after a tap activates the canvas, and Done hands it back', () => {
  const { container } = mount();
  const start = viewOf(container);

  // A swipe on an inactive canvas is the page scrolling, not a pan.
  touch('pointerDown', 1, 100, 100);
  touch('pointerMove', 1, 220, 160);
  touch('pointerUp', 1, 220, 160);
  expect(viewOf(container)).toEqual(start);
  expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();

  // A tap activates it.
  touch('pointerDown', 2, 100, 100);
  touch('pointerUp', 2, 101, 100);
  expect(screen.getByRole('button', { name: 'Done' })).toBeDefined();
  expect(container.querySelector('.crewlet-canvas')!.getAttribute('data-touch-active')).toBe('true');

  touch('pointerDown', 3, 100, 100);
  touch('pointerMove', 3, 160, 130);
  touch('pointerUp', 3, 160, 130);
  expect(viewOf(container).x).toBeCloseTo(start.x + 60);
  expect(viewOf(container).y).toBeCloseTo(start.y + 30);

  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
});

test('a canvas that declines touch panning never takes the finger, whatever is tapped', () => {
  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} touch={false} ref={handle}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const start = viewOf(container);

  touch('pointerDown', 1, 100, 100);
  touch('pointerUp', 1, 101, 100);
  expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
  touch('pointerDown', 2, 100, 100);
  touch('pointerMove', 2, 200, 160);
  touch('pointerUp', 2, 200, 160);
  expect(viewOf(container)).toEqual(start);

  // Two fingers are never a scroll, so a pinch still reaches it.
  touch('pointerDown', 3, 300, 300);
  touch('pointerDown', 4, 500, 300);
  touch('pointerMove', 4, 700, 300);
  expect(viewOf(container).k).toBeCloseTo(start.k * 2);
});

test('two fingers pinch toward their midpoint without activating the canvas first', () => {
  const { container } = mount();
  expect(viewOf(container).k).toBe(1);
  touch('pointerDown', 1, 300, 300);
  touch('pointerDown', 2, 500, 300);
  touch('pointerMove', 2, 700, 300);
  // The spread went from 200 to 400 pixels.
  expect(viewOf(container).k).toBeCloseTo(2);
  touch('pointerUp', 1, 300, 300);
  touch('pointerUp', 2, 700, 300);
});

test('a mouse drag pans, and the click it ends with does not reach the item', async () => {
  const onItem = vi.fn();
  const { container } = mount(SMALL, onItem);
  const start = viewOf(container);
  const item = screen.getByRole('treeitem');
  const mouse = { pointerId: 9, pointerType: 'mouse', button: 0 };

  fireEvent.pointerDown(item, { ...mouse, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { ...mouse, clientX: 60, clientY: 10 });
  fireEvent.pointerUp(window, { ...mouse, clientX: 60, clientY: 10 });
  fireEvent.click(item);
  expect(viewOf(container).x).toBeCloseTo(start.x + 50);
  expect(onItem).not.toHaveBeenCalled();

  // A later, real click is not eaten.
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(item);
  expect(onItem).toHaveBeenCalledTimes(1);
});

test('the pointer is captured only once a press becomes a drag, so a plain click reaches its item', () => {
  mount();
  // jsdom has no pointer capture: this is the browser's, feature detected.
  const captured = vi.fn();
  (viewport() as HTMLElement & { setPointerCapture: (id: number) => void }).setPointerCapture = captured;
  const mouse = { pointerId: 12, pointerType: 'mouse', button: 0 };
  const item = screen.getByRole('treeitem');

  fireEvent.pointerDown(item, { ...mouse, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { ...mouse, clientX: 12, clientY: 11 });
  fireEvent.pointerUp(window, { ...mouse, clientX: 12, clientY: 11 });
  expect(captured).not.toHaveBeenCalled();

  fireEvent.pointerDown(item, { ...mouse, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { ...mouse, clientX: 80, clientY: 10 });
  expect(captured).toHaveBeenCalledWith(12);
  fireEvent.pointerUp(window, { ...mouse, clientX: 80, clientY: 10 });
});

test('a press on a control inside the canvas never starts a pan', () => {
  const { container } = mount();
  const start = viewOf(container);
  const mouse = { pointerId: 4, pointerType: 'mouse', button: 0 };
  fireEvent.pointerDown(screen.getByRole('button', { name: 'card action' }), {
    ...mouse,
    clientX: 0,
    clientY: 0,
  });
  fireEvent.pointerMove(window, { ...mouse, clientX: 90, clientY: 90 });
  fireEvent.pointerUp(window, { ...mouse, clientX: 90, clientY: 90 });
  expect(viewOf(container)).toEqual(start);
});

test('a browser scrolling the viewport to show a focused item becomes a pan', () => {
  const { container } = mount();
  const start = viewOf(container);
  const el = viewport();
  let left = 30;
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = value;
    },
  });
  fireEvent.scroll(el);
  expect(left).toBe(0);
  expect(viewOf(container).x).toBeCloseTo(start.x - 30);
});

test('a request eases and a gesture does not', () => {
  const { container, handle } = mount();
  const canvas = container.querySelector('.crewlet-canvas')!;
  act(() => handle.current!.zoomBy(CANVAS_ZOOM_STEP));
  expect(canvas.getAttribute('data-animate')).toBe('near');
  fireEvent.wheel(viewport(), { deltaY: 20, ctrlKey: true });
  expect(canvas.getAttribute('data-animate')).toBe('false');
});

test('a data push while a requested move eases does not cut the easing short', () => {
  const { container, handle, rerender } = mount();
  const canvas = container.querySelector('.crewlet-canvas')!;
  act(() => handle.current!.fit());
  act(() => handle.current!.zoomBy(CANVAS_ZOOM_STEP));
  expect(canvas.getAttribute('data-animate')).toBe('near');
  // The same bounds as a new object: what every push of a live chart sends.
  rerender(<Harness content={{ ...SMALL }} handle={handle} />);
  expect(canvas.getAttribute('data-animate')).toBe('near');
});

test('an easing ends with its transition, and a clamp after it moves at once', () => {
  const { container, handle, rerender } = mount();
  const canvas = container.querySelector('.crewlet-canvas')!;
  const layer = container.querySelector('.crewlet-layer-host')!;
  const told = vi.fn();
  layer.addEventListener(LAYER_REPOSITION_EVENT, told);

  act(() => handle.current!.zoomBy(CANVAS_ZOOM_STEP * CANVAS_ZOOM_STEP));
  expect(canvas.getAttribute('data-animate')).toBe('near');
  told.mockClear();

  // A transition inside a card is not the world's.
  const inner = document.createElement('span');
  world(container).appendChild(inner);
  fireEvent.transitionEnd(inner, { propertyName: 'transform' });
  expect(canvas.getAttribute('data-animate')).toBe('near');

  // Nor is the world's own blur, which the same element transitions while the
  // content is pushed back behind a surface.
  fireEvent.transitionEnd(world(container), { propertyName: 'filter' });
  expect(canvas.getAttribute('data-animate')).toBe('near');

  fireEvent.transitionEnd(world(container), { propertyName: 'transform' });
  expect(canvas.getAttribute('data-animate')).toBe('false');
  // The layer hears where the content came to rest.
  expect(told).toHaveBeenCalledTimes(1);

  // Content that moved out from under the view is clamped back into reach, and
  // that move nobody asked for does not ease.
  const before = viewOf(container);
  rerender(<Harness content={{ x: 2000, y: 2000, width: 10, height: 10 }} handle={handle} />);
  expect(viewOf(container)).not.toEqual(before);
  expect(canvas.getAttribute('data-animate')).toBe('false');
});

test('a request that moves nothing starts no easing', () => {
  const { container, handle } = mount();
  const canvas = container.querySelector('.crewlet-canvas')!;
  // Already fitted on mount: fitting again moves nothing, and an easing
  // switched on with no transition to end it would ease the next clamp.
  act(() => handle.current!.fit());
  expect(canvas.getAttribute('data-animate')).toBe('false');
});

test('items inside reach a layer host that the zoom does not transform', () => {
  function Surface() {
    const layer = useLayerContainer();
    const [open] = useState(true);
    return layer && open ? createPortal(<div role="menu" aria-label="Seat actions" />, layer) : null;
  }
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL}>
      <Surface />
    </Canvas>,
  );
  const menu = screen.getByRole('menu', { name: 'Seat actions' });
  expect(menu.parentElement?.classList.contains('crewlet-layer-host')).toBe(true);
  expect(world(container).contains(menu)).toBe(false);
});

test('the overlay is drawn over the viewport, outside the layer that the content transforms', () => {
  const { container } = mount();
  // Asserted while it is still on the page. After a cleanup every query over
  // this container answers null, so the same line below the cleanup passed for
  // a canvas that drew the layer unconditionally.
  expect(container.querySelector('.crewlet-canvas__overlay')).toBeNull();
  cleanup();

  const { container: withNote } = render(
    <Canvas label="Organization chart" content={SMALL} overlay={<p>These lines are from the last check.</p>}>
      <div />
    </Canvas>,
  );
  const note = screen.getByText('These lines are from the last check.');
  expect(note.closest('.crewlet-canvas__overlay')).not.toBeNull();
  expect(world(withNote).contains(note)).toBe(false);
});

test('the first fit is reported once, and a later data push does not report it again', () => {
  const ready = vi.fn();
  const { rerender } = render(
    <Canvas label="Organization chart" content={null} onReady={ready}>
      <div />
    </Canvas>,
  );
  expect(ready).not.toHaveBeenCalled();
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(ready).not.toHaveBeenCalled();

  rerender(
    <Canvas label="Organization chart" content={SMALL} onReady={ready}>
      <div />
    </Canvas>,
  );
  expect(ready).toHaveBeenCalledTimes(1);
  rerender(
    <Canvas label="Organization chart" content={{ ...SMALL, width: 900 }} onReady={ready}>
      <div />
    </Canvas>,
  );
  expect(ready).toHaveBeenCalledTimes(1);
});

test('the view is reported from the first fit on, with the viewport, and on every zoom', () => {
  const seen = vi.fn();
  render(
    <Canvas label="Design" content={SMALL} onViewChange={seen}>
      <div />
    </Canvas>,
  );
  expect(seen).not.toHaveBeenCalled();
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(seen).toHaveBeenLastCalledWith(fitView(SMALL, SIZE), SIZE);
  const calls = seen.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(seen.mock.calls.length).toBe(calls + 1);
  const [view] = seen.mock.lastCall as [CanvasView];
  expect(view.k).toBeCloseTo(fitView(SMALL, SIZE).k * CANVAS_ZOOM_STEP);
});

/*
 * ───────────────────────────────────────────────────────────────────────────
 * The zoom readout: shown, typed, and clamped like every other zoom.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** The readout button, whatever percentage it currently says. */
const readout = () => screen.getByRole('button', { name: /^Zoom is \d+ percent/ });
const readsPercent = () => Number(/Zoom is (\d+) percent/.exec(readout().getAttribute('aria-label')!)![1]);

test('the readout says where the view stands, and follows every way the zoom changes', () => {
  const { container } = mount();
  // SMALL fits inside the viewport, and a fit never blows content up past
  // actual size, so the canvas opens at 100%.
  expect(readout().textContent).toBe('100%');
  expect(viewOf(container).k).toBe(1);

  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(readsPercent()).toBe(Math.round(CANVAS_ZOOM_STEP * 100));
  // And a zoom nobody pressed a button for reaches it too.
  fireEvent.keyDown(viewport(), { key: '0' });
  expect(readout().textContent).toBe('100%');
});

test('pressing it opens a field, and Enter applies the zoom that was typed', () => {
  const { container } = mount();
  fireEvent.click(readout());
  const field = screen.getByRole('textbox', { name: 'Zoom level, percent' });
  // It opens on the value it is replacing, so a small correction is a small
  // edit rather than a number typed from nothing, and it holds the focus the
  // press was aimed at rather than leaving it on a button that is now gone.
  expect((field as HTMLInputElement).value).toBe('100');
  expect(document.activeElement).toBe(field);

  fireEvent.change(field, { target: { value: '150' } });
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(viewOf(container).k).toBeCloseTo(1.5, 5);
  // The field is gone and the button has focus: a keyboard reader is never
  // left standing in a control that has just been replaced.
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.activeElement).toBe(readout());
  expect(readout().textContent).toBe('150%');
});

test('everything but digits is dropped, so there is no invalid value to report', () => {
  mount();
  fireEvent.click(readout());
  const field = screen.getByRole('textbox', { name: 'Zoom level, percent' });
  fireEvent.change(field, { target: { value: '1e-2 %pt' } });
  expect((field as HTMLInputElement).value).toBe('12');
});

/*
 * AN EMPTY FIELD IS NOT A ZOOM OF NOTHING. Everything but digits is dropped as
 * it is typed, so the one value left that is not a number is no value at all,
 * and applying it would put NaN through the transform and blank the canvas.
 */
test('Enter on an empty field leaves the view alone', () => {
  const { container } = mount();
  const before = viewOf(container);
  fireEvent.click(readout());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
  expect(viewOf(container)).toEqual(before);
  expect(readout().textContent).toBe('100%');
});

/*
 * A typed zoom is applied as a factor, so it goes through the same clamp as
 * every other: a canvas whose floor is a quarter reads 40 as a quarter.
 */
test('a zoom beyond the bounds lands on the bound, not past it', () => {
  const { container } = mount();
  const bounds = zoomLimits(SMALL, SIZE);
  fireEvent.click(readout());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '9000' } });
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
  expect(viewOf(container).k).toBe(bounds.max);

  fireEvent.click(readout());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '1' } });
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
  expect(viewOf(container).k).toBe(bounds.min);
});

/*
 * Out no further than the fit, since nothing lies beyond the whole chart, and
 * in as far as one item filling the pane.
 */
test('the floor is the fit and the ceiling is one item filling the viewport', () => {
  const { container, handle } = mount();
  const fit = fitView(SMALL, SIZE);
  act(() => {
    for (let press = 0; press < 30; press++) handle.current!.zoomBy(1 / CANVAS_ZOOM_STEP);
  });
  expect(viewOf(container).k).toBeCloseTo(fit.k);

  const wide = { x: 0, y: 0, width: 4000, height: 3000 };
  const { container: big, handle: bigHandle } = mount(wide);
  const bigFit = fitView(wide, SIZE);
  expect(bigFit.k).toBeLessThan(1);
  act(() => {
    for (let press = 0; press < 30; press++) bigHandle.current!.zoomBy(1 / CANVAS_ZOOM_STEP);
  });
  expect(viewOf(big).k).toBeCloseTo(bigFit.k);
});

/*
 * A stepper at its limit is held with its reason, softly, so a reader whose
 * focus is on it keeps it.
 */
test('Zoom out is held at the fit and Zoom in at the ceiling, each with its reason', () => {
  const { handle } = mount({ x: 0, y: 0, width: 4000, height: 3000 });
  const out = screen.getByRole('button', { name: 'Zoom out' });
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  const reason = (el: HTMLElement) => document.getElementById(el.getAttribute('aria-describedby') ?? '')?.textContent;
  expect(out.getAttribute('aria-disabled')).toBe('true');
  expect(reason(out)).toBe('All of it is in view');
  expect(zoomIn.getAttribute('aria-disabled')).toBeNull();
  // Held softly: it keeps focus.
  out.focus();
  expect(document.activeElement).toBe(out);

  act(() => handle.current!.zoomBy(CANVAS_ZOOM_STEP));
  expect(out.getAttribute('aria-disabled')).toBeNull();
  act(() => {
    for (let press = 0; press < 60; press++) handle.current!.zoomBy(CANVAS_ZOOM_STEP);
  });
  expect(zoomIn.getAttribute('aria-disabled')).toBe('true');
  expect(reason(zoomIn)).toBe('Zoomed in as far as it goes');
  expect(out.getAttribute('aria-disabled')).toBeNull();
});

test('the ceiling follows the largest item the content says it draws', () => {
  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} ref={handle} largestItemWidth={100}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  act(() => {
    for (let press = 0; press < 30; press++) handle.current!.zoomBy(CANVAS_ZOOM_STEP);
  });
  // (800 - 2 * 24) / 100: one 100px card, with the fit's own padding either
  // side of it.
  expect(viewOf(container).k).toBeCloseTo(7.52);
});

test('Escape abandons what was typed and never reaches the canvas behind it', () => {
  const { container } = mount();
  const before = viewOf(container);
  fireEvent.click(readout());
  const field = screen.getByRole('textbox');
  fireEvent.change(field, { target: { value: '175' } });

  // On the body, outside React's own root, which is where a consumer's own
  // Escape handler (a dialog's, a drawer's) would be listening.
  const escaped = vi.fn();
  document.body.addEventListener('keydown', escaped);
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(escaped).not.toHaveBeenCalled();
  document.body.removeEventListener('keydown', escaped);

  expect(viewOf(container)).toEqual(before);
  expect(document.activeElement).toBe(readout());
});

test('leaving the field without Enter abandons it too', () => {
  const { container } = mount();
  const before = viewOf(container);
  fireEvent.click(readout());
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '175' } });
  fireEvent.blur(screen.getByRole('textbox'));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(viewOf(container)).toEqual(before);
});

/* Nothing is shown before the first fit, so nothing may be set before it either. */
test('the readout is dead until the canvas has been fitted', () => {
  render(<Harness content={null} />);
  expect(screen.getByRole('button', { name: /^Zoom is/ }).hasAttribute('disabled')).toBe(true);
});

// ---------------------------------------------------------------------------
// The chart's own chrome
// ---------------------------------------------------------------------------

/*
 * The bar, the key hint and the caller's controls stand in one group in one
 * corner of the canvas they act on.
 */
test('the controls take the corner they are given, with the caller in the same group', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas
      label="Organization chart"
      content={SMALL}
      controlsPlacement="top-right"
      controlsExtra={<button type="button">Fullscreen</button>}
      controlsBelow={<div className="chart-switch">Structure</div>}
    >
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const group = container.querySelector('.crewlet-canvas__controls')!;
  expect(group.getAttribute('data-placement')).toBe('top-right');
  expect(getComputedStyle(group).bottom).toBe('auto');
  expect(px(group, 'top')).toBe(12);
  // The extra control is IN the bar, after the four the canvas draws itself.
  const bar = group.querySelector('.crewlet-canvas__bar')!;
  expect(
    [...bar.querySelectorAll('button')].map(
      (one) => one.getAttribute('aria-label') ?? one.textContent,
    ),
  ).toEqual(['Zoom out', 'Zoom is 100 percent. Set a zoom level', 'Zoom in', 'Fit to view', 'Fullscreen']);
  // And what the caller stacks under it is a bar of its own, under the group.
  expect(group.lastElementChild!.className).toBe('chart-switch');
  uninstall();
});

/* THE START BAR mirrors the control group across the canvas, in the same row. */
test('a start bar stands in the opposite corner, on the surface and height of the control bar', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} controlsPlacement="top-right" controlsStart={<span>Reporting view</span>}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const start = container.querySelector('.crewlet-canvas__controls--start')!;
  expect(start.getAttribute('data-placement')).toBe('top-right');
  expect(getComputedStyle(start).right).toBe('auto');
  expect(px(start, 'left')).toBe(12);
  expect(px(start, 'top')).toBe(12);
  const bar = start.querySelector('.crewlet-canvas__bar')!;
  expect(bar.textContent).toBe('Reporting view');
  // The zoom bar is a small control, its well's padding and its hairlines.
  expect(px(bar, 'height')).toBe(26 + 4 * 2 + 2);
  // The zoom bar keeps its own corner.
  expect(container.querySelectorAll('.crewlet-canvas__controls:not(.crewlet-canvas__controls--start)')).toHaveLength(1);
  uninstall();
});

test('no start bar is drawn unless one is given', () => {
  const { container } = mount();
  expect(container.querySelector('.crewlet-canvas__controls--start')).toBeNull();
});

/* THE END BAR stands across the canvas from the controls, and a fit keeps clear of it. */
test('an end bar stands at the bottom right beside top-right controls, and wraps inside the canvas', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} controlsPlacement="top-right" overlayEnd={<span>Working 4</span>}>
      <div />
    </Canvas>,
  );
  resizeAll(SIZE);
  const end = container.querySelector('.crewlet-canvas__controls--end')!;
  expect(end.getAttribute('data-placement')).toBe('top-right');
  expect(getComputedStyle(end).top).toBe('auto');
  expect(px(end, 'bottom')).toBe(12);
  expect(px(end, 'right')).toBe(12);
  expect(px(end, 'left')).toBe(12);
  const bar = end.querySelector('.crewlet-canvas__bar')!;
  expect(bar.textContent).toBe('Working 4');
  expect(getComputedStyle(bar).flexWrap).toBe('wrap');
  expect(getComputedStyle(bar).maxWidth).toBe('100%');
  uninstall();
});

test('beside bottom-right controls the end bar takes the top right', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} overlayEnd={<span>Legend</span>}>
      <div />
    </Canvas>,
  );
  const end = container.querySelector('.crewlet-canvas__controls--end')!;
  expect(px(end, 'top')).toBe(12);
  expect(getComputedStyle(end).bottom).toBe('auto');
  uninstall();
});

test('a fit is made in the room the end bar leaves, so no content is drawn under it', () => {
  const tall: CanvasRect = { x: 0, y: 0, width: 400, height: 1200 };
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 800, width: 800, height, x: 0, y: top }) as DOMRect;
    if (this.classList.contains('crewlet-canvas__viewport')) return box(0, 600);
    if (this.parentElement?.classList.contains('crewlet-canvas__controls--end')) return box(540, 48);
    return realRect.call(this);
  };
  try {
    const { container } = render(
      <Canvas label="Organization chart" content={tall} controlsPlacement="top-right" overlayEnd={<span>Legend</span>}>
        <div />
      </Canvas>,
    );
    resizeAll(SIZE);
    // The bar's top is 60px above the viewport's foot: the fit is the one for 540px of height.
    expect(viewOf(container).k).toBeCloseTo(fitView(tall, { width: 800, height: 540 }).k);
    expect(viewOf(container).k).toBeLessThan(fitView(tall, SIZE).k);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});

test('an initial view opens instead of the fit, held within the zoom range', () => {
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} initialView={{ x: 40, y: 30, k: 1.5 }}>
      <div />
    </Canvas>,
  );
  resizeAll(SIZE);
  expect(viewOf(container)).toEqual({ x: 40, y: 30, k: 1.5 });
  cleanup();
  const far = render(
    <Canvas label="Organization chart" content={SMALL} initialView={{ x: 0, y: 0, k: 400 }}>
      <div />
    </Canvas>,
  );
  resizeAll(SIZE);
  expect(viewOf(far.container).k).toBe(zoomLimits(SMALL, SIZE).max);
});

/*
 * An opening that depends on the viewport is asked once the canvas has its
 * size, with the room and the fit. Answering nothing is an untouched fit, so a
 * resize refits it.
 */
test('an opening worked out from the viewport is asked with its room and the fit, and nothing is the fit', () => {
  const asked: Array<[CanvasRect, CanvasView]> = [];
  const { container } = render(
    <Canvas
      label="Organization chart"
      content={WIDE}
      initialView={(room, fit) => {
        asked.push([room, fit]);
        return { x: room.width / 2, y: room.height / 2, k: 1 };
      }}
    >
      <div />
    </Canvas>,
  );
  resizeAll(SIZE);
  expect(asked).toEqual([[{ x: 0, y: 0, ...SIZE }, fitView(WIDE, SIZE)]]);
  expect(viewOf(container)).toEqual(clampPan({ x: 400, y: 300, k: 1 }, WIDE, SIZE));
  cleanup();

  const fitted = render(
    <Canvas label="Organization chart" content={WIDE} refitOnResize initialView={() => null}>
      <div />
    </Canvas>,
  );
  resizeAll(SIZE);
  expect(viewOf(fitted.container)).toEqual(fitView(WIDE, SIZE));
  const narrow = { width: 500, height: 600 };
  resizeAll(narrow);
  expect(viewOf(fitted.container)).toEqual(fitView(WIDE, narrow));
});

/*
 * Pressing the readout must not move the bar: an `<input>` is as wide as its
 * `size` attribute, so the field keeps the readout's fixed width.
 */
test('typing a zoom does not move the controls beside it', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  mount();
  const before = px(readout(), 'width');
  fireEvent.click(readout());
  const field = screen.getByRole('textbox');
  expect(px(field, 'width')).toBe(before);
  expect(before).toBe(44);
  uninstall();
});

/*
 * THE CONTENT PUSHED BACK, for a surface opened over the canvas about one part
 * of it: the chart is still there behind the decision being made about it.
 */
test('the content is dimmed on request, and the chrome over it is not', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} dimmed>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(container.querySelector('.crewlet-canvas')!.getAttribute('data-dimmed')).toBe('true');
  expect(getComputedStyle(world(container)).filter).toMatch(/^blur\(/);
  expect(Number.parseFloat(getComputedStyle(world(container)).opacity)).toBeLessThan(1);
  // The chrome over it is not: a blur on the canvas itself would take the
  // controls and every menu the content opens with it.
  expect(
    getComputedStyle(container.querySelector('.crewlet-canvas__controls')!).filter,
  ).not.toMatch(/^blur\(/);

  cleanup();
  const { container: plain } = render(
    <Canvas label="Organization chart" content={SMALL}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(getComputedStyle(world(plain)).filter).not.toMatch(/^blur\(/);
  expect(getComputedStyle(world(plain)).opacity).not.toBe('0.55');
  uninstall();
});

/*
 * A surface about one node eases the chart onto that node, and the reader's
 * view is given back when the surface closes.
 */
test('a region is brought to the middle with room around it, and the view is given back', () => {
  const handle = createRef<CanvasHandle>();
  // A ceiling high enough that the region's own size is what decides the zoom.
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} ref={handle} largestItemWidth={100}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const before = viewOf(container);
  act(() => handle.current!.focusRegion({ x: 300, y: 200, width: 100, height: 50 }));
  const onIt = viewOf(container);
  expect(onIt).not.toEqual(before);
  // The region's own middle is the viewport's middle.
  expect(onIt.x + 350 * onIt.k).toBeCloseTo(SIZE.width / 2);
  expect(onIt.y + 225 * onIt.k).toBeCloseTo(SIZE.height / 2);
  // And it is given a third of the width, not all of it.
  expect(100 * onIt.k).toBeCloseTo(SIZE.width / 3);

  act(() => handle.current!.restoreView());
  expect(viewOf(container)).toEqual(before);
});

/*
 * A fit, a zoom step and a reveal are corrections; easing onto a region and
 * back is travel. The canvas says which it runs, so the stylesheet times each.
 */
test('easing onto a region travels, and a fit or a reveal corrects', () => {
  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} ref={handle} largestItemWidth={100}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const canvas = container.querySelector('.crewlet-canvas')!;
  const ease = () => canvas.getAttribute('data-animate');

  act(() => handle.current!.focusRegion({ x: 300, y: 200, width: 100, height: 50 }));
  expect(ease()).toBe('travel');
  act(() => handle.current!.restoreView());
  expect(ease()).toBe('travel');

  act(() => handle.current!.zoomBy(CANVAS_ZOOM_STEP));
  expect(ease()).toBe('near');
  act(() => handle.current!.reveal({ x: 900, y: 700, width: 40, height: 20 }));
  expect(ease()).toBe('near');
  act(() => handle.current!.fit());
  expect(ease()).toBe('near');
});

/*
 * Read from the source: the cascade helper substitutes length tokens only, so
 * jsdom drops a declaration naming a motion token and would read zero.
 */
test('the two eases are declared, and reduced motion cancels both', () => {
  const rule = (mode: string) => {
    const at = SHEET.indexOf(`.crewlet-canvas[data-animate='${mode}'] .crewlet-canvas__world {`);
    expect(at).toBeGreaterThan(-1);
    return SHEET.slice(at, SHEET.indexOf('}', at));
  };
  expect(rule('near')).toContain('transform var(--motion-duration-base)');
  // Two moderate steps is the console chart's own 400ms, written as steps of
  // this scale rather than as a number off it.
  expect(rule('travel')).toContain('transform calc(var(--motion-duration-moderate) * 2)');
  expect(rule('travel')).toContain('var(--motion-easing-in-out)');

  const at = SHEET.indexOf('@media (prefers-reduced-motion: reduce)');
  const guarded = SHEET.slice(at, SHEET.indexOf('\n}\n', at));
  for (const mode of ['near', 'travel']) {
    expect(guarded).toContain(`[data-animate='${mode}']`);
  }
  expect(guarded).toContain('transition: none');
});

test('the view given back is the one the first region was left from', () => {
  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL} ref={handle} largestItemWidth={100}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const before = viewOf(container);
  act(() => handle.current!.focusRegion({ x: 300, y: 200, width: 100, height: 50 }));
  act(() => handle.current!.focusRegion({ x: 10, y: 10, width: 40, height: 20 }));
  act(() => handle.current!.restoreView());
  expect(viewOf(container)).toEqual(before);
  // And a restore with nothing to give back moves nothing.
  act(() => handle.current!.restoreView());
  expect(viewOf(container)).toEqual(before);
});

/*
 * A fit is given back as a fit of the content as it now stands, so content
 * added while a surface was open is not cut off. A moved view comes back as is.
 */
test('a view given back that was the untouched fit is the fit of the content as it now stands', () => {
  const grown: CanvasRect = { x: 0, y: 0, width: 1600, height: 900 };
  const larger: CanvasRect = { x: 0, y: 0, width: 2400, height: 1200 };
  const { container, rerender, handle } = mount();
  act(() => handle.current!.rememberView());
  act(() => handle.current!.focusRegion({ x: 300, y: 200, width: 100, height: 50 }));
  rerender(<Harness content={grown} handle={handle} />);
  act(() => handle.current!.restoreView());
  expect(viewOf(container)).toEqual(fitView(grown, SIZE));

  fireEvent.keyDown(viewport(), { key: '+' });
  const moved = viewOf(container);
  act(() => handle.current!.focusRegion({ x: 300, y: 200, width: 100, height: 50 }));
  rerender(<Harness content={larger} handle={handle} />);
  act(() => handle.current!.restoreView());
  expect(viewOf(container)).toEqual(moved);
});

/*
 * The least pan suits a step to the next item; an item wholly out of view is
 * centred instead, so it does not land against the edge.
 */
test('a reveal asked to centre brings an item wholly outside the view to the middle, and one partly in it the least distance', () => {
  const content: CanvasRect = { x: 0, y: 0, width: 3000, height: 2000 };
  const handle = createRef<CanvasHandle>();
  const { container } = render(
    <Canvas label="Organization chart" content={content} ref={handle} initialView={{ x: 0, y: 0, k: 1 }}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const far = { x: 2000, y: 1500, width: 100, height: 40 };
  act(() => handle.current!.reveal(far, 'centre'));
  const centred = viewOf(container);
  expect(centred.k).toBe(1);
  expect(centred.x + (far.x + far.width / 2) * centred.k).toBeCloseTo(SIZE.width / 2);
  expect(centred.y + (far.y + far.height / 2) * centred.k).toBeCloseTo(SIZE.height / 2);
  // Going somewhere else, so it travels rather than corrects.
  expect(container.querySelector('.crewlet-canvas')!.getAttribute('data-animate')).toBe('travel');

  // Partly in view: the least pan, to just inside the right edge.
  const edge = { x: far.x + 400, y: far.y, width: 100, height: 40 };
  act(() => handle.current!.reveal(edge, 'centre'));
  const nudged = viewOf(container);
  expect(nudged.x + (edge.x + edge.width) * nudged.k).toBeCloseTo(SIZE.width - 24);
  expect(nudged.y).toBe(centred.y);

  // Not asked to centre, an item wholly outside is brought just inside the nearest edge, as before.
  act(() => handle.current!.reveal({ x: 100, y: 100, width: 100, height: 40 }));
  expect(viewOf(container).x + 100).toBeCloseTo(24);
});

/*
 * AND NOTHING IS REVEALED UNDER THE END BAR. A fit is made in the room the
 * bar leaves; a reveal measured against the whole viewport stopped an item
 * at the foot of the pane, under the legend drawn there.
 */
test('a reveal keeps the item clear of the end bar, and centres it in the room the bar leaves', () => {
  const content: CanvasRect = { x: 0, y: 0, width: 800, height: 2000 };
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 800, width: 800, height, x: 0, y: top }) as DOMRect;
    if (this.classList.contains('crewlet-canvas__viewport')) return box(0, 600);
    if (this.parentElement?.classList.contains('crewlet-canvas__controls--end')) return box(540, 48);
    return realRect.call(this);
  };
  try {
    const handle = createRef<CanvasHandle>();
    const { container } = render(
      <Canvas
        label="Organization chart"
        content={content}
        ref={handle}
        controlsPlacement="top-right"
        overlayEnd={<span>Legend</span>}
        initialView={{ x: 0, y: 0, k: 1 }}
      >
        <div />
      </Canvas>,
    );
    resizeAll(SIZE);
    // Drawn from 520 to 560: inside the pane, and its foot under the bar, whose top is at 540.
    act(() => handle.current!.reveal({ x: 100, y: 520, width: 100, height: 40 }));
    expect(viewOf(container).y + 560).toBeCloseTo(540 - 24);
    act(() => handle.current!.reveal({ x: 100, y: 1500, width: 100, height: 40 }, 'centre'));
    expect(viewOf(container).y + 1520).toBeCloseTo(540 / 2);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});

/*
 * A note under the controls is a `status` region, so a state the canvas enters
 * is announced, and inert, so a press meant for the chart reaches the chart.
 */
test('a hint is announced, drawn under the controls, and takes no press', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  render(
    <Canvas label="Organization chart" content={SMALL} hint={<span>Press Esc to leave</span>}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const note = screen.getByRole('status');
  expect(note.textContent).toBe('Press Esc to leave');
  expect(note.closest('.crewlet-canvas__controls')).not.toBeNull();
  expect(getComputedStyle(note).pointerEvents).toBe('none');
  uninstall();
});

test('a hint in a bottom corner is drawn above the zoom bar, so the bar never moves', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { rerender } = render(
    <Canvas label="Design" content={SMALL} hint="Press Escape to return to the canvas">
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(getComputedStyle(screen.getByRole('status')).order).toBe('-1');
  // In the top corner it grows downward, away from the corner, as it is drawn.
  rerender(
    <Canvas label="Design" content={SMALL} hint="Press Escape" controlsPlacement="top-right">
      <div />
    </Canvas>,
  );
  expect(getComputedStyle(screen.getByRole('status')).order).not.toBe('-1');
  uninstall();
});

test('a grid ground pans with the view and keeps its pitch between one and two steps', () => {
  expect(gridOf({ x: 0, y: 0, k: 1 })).toEqual({ scale: 1, x: 0, y: 0 });
  // Zoomed out to a quarter and a bit, the world pitch is four steps.
  expect(gridOf({ x: 12, y: -30, k: 0.26 })).toEqual({ scale: 1.04, x: 12, y: -30 });
  // Zoomed in to three times, it is half a step on the world.
  expect(gridOf({ x: 0, y: 0, k: 3 }).scale).toBe(1.5);
  for (const k of [0.02, 0.1, 0.5, 0.99, 1.5, 2, 7]) {
    const { scale } = gridOf({ x: 0, y: 0, k });
    expect(scale).toBeGreaterThanOrEqual(1);
    expect(scale).toBeLessThan(2);
  }
  const { container } = render(
    <Canvas label="Design" content={SMALL} ground="grid">
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const root = container.querySelector<HTMLElement>('.crewlet-canvas')!;
  expect(root.dataset.ground).toBe('grid');
  expect(root.style.getPropertyValue('--crewlet-canvas-grid-scale')).not.toBe('');
});

test('a canvas with nothing to say draws no note, and keeps the region it has', () => {
  const uninstall = installSheets('Canvas/Canvas.css');
  const { container } = render(
    <Canvas label="Organization chart" content={SMALL}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(container.querySelector('.crewlet-canvas__hint')).toBeNull();

  // And a canvas whose caller has nothing to say RIGHT NOW keeps the region in
  // the document, so the message it is given later is announced, without an
  // empty bar being drawn for it in the meantime.
  cleanup();
  const { container: waiting } = render(
    <Canvas label="Organization chart" content={SMALL} hint={<>{false}</>}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  const note = waiting.querySelector('.crewlet-canvas__hint')!;
  expect(note.textContent).toBe('');
  expect(getComputedStyle(note).display).toBe('none');
  uninstall();
});

/*
 * ───────────────────────────────────────────────────────────────────────────
 * Actual size, the fit by Shift 1, the pointer, and the handle's new reach
 * ───────────────────────────────────────────────────────────────────────────
 */

const WIDE: CanvasRect = { x: 0, y: 0, width: 4000, height: 3000 };

test('Shift 0 shows actual size and Shift 1 fits, by the physical key whatever the layout prints', () => {
  const { container } = mount(WIDE);
  const fitted = viewOf(container).k;
  expect(fitted).toBeLessThan(1);
  // Shift turns 0 into `)` on a US layout; the key is still Digit0.
  fireEvent.keyDown(viewport(), { key: ')', code: 'Digit0', shiftKey: true });
  expect(viewOf(container).k).toBe(1);
  fireEvent.keyDown(viewport(), { key: '!', code: 'Digit1', shiftKey: true });
  expect(viewOf(container).k).toBe(fitted);
  // With Command or Control it is the browser's chord, not the canvas's.
  fireEvent.keyDown(viewport(), { key: ')', code: 'Digit0', shiftKey: true, metaKey: true });
  expect(viewOf(container).k).toBe(fitted);
});

test('the actual size control is drawn only where it is asked for, and every zoom control names its key', () => {
  mount(WIDE);
  expect(screen.queryByRole('button', { name: 'Zoom to 100%' })).toBeNull();
  cleanup();
  const { container } = render(
    <Canvas label="Organization chart" content={WIDE} controlsActualSize>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(viewOf(container).k).toBeLessThan(1);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom to 100%' }));
  expect(viewOf(container).k).toBe(1);
  // The tip says the shortcut, and is what the control is described by.
  const fit = screen.getByRole('button', { name: 'Fit to view' });
  tabTo(fit);
  const tip = document.getElementById(fit.getAttribute('aria-describedby')!.split(' ').pop()!);
  expect(tip?.textContent).toMatch(/Fit to view.*Shift.*1/);
  // The native title would be a second, plainer tip over it.
  expect(fit.getAttribute('title')).toBe('');
});

function CursorHarness({ cursor }: { cursor?: CanvasCursor }) {
  return (
    <Canvas label="Organization chart" content={SMALL} cursor={cursor}>
      <div />
    </Canvas>
  );
}

test("the pointer is the operating system's own, the one the canvas names", () => {
  /*
   * The canvas shows the platform's own pointers (grab hand, arrow, crosshair,
   * text beam), so no drawn pointer stands among native ones.
   */
  const uninstall = installSheets('Canvas/Canvas.css');
  try {
    const { container, rerender } = render(<CursorHarness />);
    const root = () => container.querySelector('.crewlet-canvas') as HTMLElement;
    const pointer = () => getComputedStyle(container.querySelector('.crewlet-canvas__viewport')!).cursor;
    expect(root().getAttribute('data-cursor')).toBe('hand');
    expect(pointer()).toBe('grab');
    // Nothing on the root carries a drawing for the stylesheet to read.
    expect(root().getAttribute('style') ?? '').not.toMatch(/cursor/);
    const keywords: [CanvasCursor, string][] = [
      ['pointer', 'default'],
      ['crosshair', 'crosshair'],
      ['text', 'text'],
      ['hand', 'grab'],
    ];
    for (const [cursor, keyword] of keywords) {
      rerender(<CursorHarness cursor={cursor} />);
      expect(root().getAttribute('data-cursor')).toBe(cursor);
      expect(pointer()).toBe(keyword);
      // A pan in progress is the closed hand, whatever the tool.
      root().setAttribute('data-panning', 'true');
      expect(pointer()).toBe('grabbing');
      root().removeAttribute('data-panning');
    }
  } finally {
    uninstall();
  }
  expect(SHEET).not.toMatch(/url\(|--crewlet-canvas-cursor/);
});

test('a canvas of pages fits below the chart floor when it names one', () => {
  const huge: CanvasRect = { x: 0, y: 0, width: 40000, height: 2000 };
  const { container } = render(
    <Canvas label="Design" content={huge} minZoom={0.01}>
      <div />
    </Canvas>,
  );
  FakeResizeObserver.last!.resize(SIZE.width, SIZE.height);
  expect(viewOf(container).k).toBeCloseTo(fitView(huge, SIZE, 24, 0.01).k);
  expect(viewOf(container).k).toBeLessThan(0.25);
});

test('the handle zooms to a scale within the limits, and reads a page point as a world point', () => {
  const { container, handle } = mount(WIDE);
  act(() => handle.current!.zoomTo(1));
  expect(viewOf(container).k).toBe(1);
  // Past the ceiling is the ceiling.
  act(() => handle.current!.zoomTo(1000));
  expect(viewOf(container).k).toBe(zoomLimits(WIDE, SIZE).max);
  const view = viewOf(container);
  // jsdom puts the viewport at the page's origin, so a page point is a viewport point.
  expect(handle.current!.worldAt({ x: 120, y: 80 })).toEqual({
    x: (120 - view.x) / view.k,
    y: (80 - view.y) / view.k,
  });
});
