/**
 * The canvas: who owns a key, a wheel and a finger.
 *
 * The arithmetic is `geometry.test.tsx`. What is asserted here is the wiring
 * jsdom can observe: which element a key belongs to, when the wheel is the
 * page's rather than the chart's, that a finger does not trap the page until
 * the canvas is asked for it, and that a data push never moves the view. jsdom
 * has no layout, so the viewport's size is fed through a controllable
 * ResizeObserver and every rectangle starts at the origin.
 *
 * Ported from the engine dashboard's `ui/Canvas.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LAYER_REPOSITION_EVENT, useLayerContainer } from '../Layer/index.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { Canvas, type CanvasHandle } from './Canvas.js';

/** The stylesheet's own source, for the rules jsdom cannot resolve a value in. */
const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Canvas.css'), 'utf8');
import {
  CANVAS_ZOOM_STEP,
  fitView,
  zoomLimits,
  type CanvasRect,
  type CanvasView,
} from './geometry.js';

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;

class FakeResizeObserver {
  static last: FakeResizeObserver | null = null;
  constructor(private callback: Callback) {
    FakeResizeObserver.last = this;
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
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
});
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

/*
 * WHOSE KEYS ARE WHOSE. The tab stop a chart hands out is an ITEM inside the
 * viewport, never the viewport, so zoom keys that answered only to the
 * viewport element answered to nobody who had navigated the chart: measured on
 * the running build, `+` on a focused node left the zoom at 120% while the
 * canvas's own description went on saying it would zoom. The ARROWS are the
 * other half of the same rule: they belong to whatever holds focus, so an item
 * keeps them and the viewport pans with them.
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

/*
 * ───────────────────────────────────────────────────────────────────────────
 * The zoom readout
 *
 * A zoom has a VALUE as well as a direction, and two chevrons say only the
 * direction. What these protect is that the value is shown, that it can be
 * typed, and that typing it neither leaves a field open in the toolbar nor
 * escapes the clamp every other zoom goes through.
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
 * THE TYPED ZOOM GOES THROUGH THE SAME CLAMP as every other, because it is
 * applied as a factor rather than set as a scale. A canvas whose floor is a
 * quarter reads 40 as a quarter, not as a fortieth, and nothing in the readout
 * has to know what the floor is.
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
 * OUT AS FAR AS THE FIT AND NO FURTHER. There is nothing beyond the whole
 * chart to see, and a reader who shrank it to a quarter of that had a screen
 * of grey with no way back; the console chart refuses it outright. In as far
 * as ONE ITEM filling the pane, which is what a reader pressing Zoom in is
 * asking for: a fixed ceiling of double size was a fifth of that.
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
 * ONE GROUP IN ONE CORNER. The console chart stacks its toolbar, its key hint
 * and its chart switch in one absolutely placed column at the top right; this
 * canvas's bar had moved to the bottom right and two of its three companions
 * had ended up in the page's own toolbar 800px away, acting on a canvas they
 * were nowhere near.
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

/*
 * THE BAR DOES NOT MOVE WHEN THE READOUT IS PRESSED. The field replaced the
 * button with an `<input>`, whose own intrinsic width is its `size` attribute:
 * measured on the running build the bar went from 150px to 261px and every
 * button in it moved out from under the pointer. The console chart's is a
 * fixed width in the slot the readout used.
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
 * EASING ONTO ONE REGION, AND BACK. A surface about one node has to be able to
 * say WHERE that node is, and the chart is the only thing that can say it; the
 * view the reader had is given back when the surface closes, which is what the
 * console chart does with the viewBox it saved.
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
 * A CORRECTION AND A JOURNEY ARE DIFFERENT MOVEMENTS, and the canvas says
 * which it is running so the stylesheet can give each its own time.
 *
 * A fit, a zoom step and a reveal are corrections to the view the reader
 * already has. Easing onto a region and giving the view back are the chart
 * GOING somewhere, which is the movement that says WHERE the place is: run at
 * the correction's step it read as a jump, 2.7 times faster than the console
 * chart's own 400ms viewBox ease, and the gesture was lost.
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
 * AND BOTH ARE IN THE STYLESHEET, with the travel the longer of the two and
 * both cancelled for a reader who asked for less motion. Read from the source
 * because a duration is not a length: the cascade helper substitutes the
 * length families only, so jsdom drops any declaration naming a motion token
 * and every measurement through it would read zero.
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
 * A NOTE UNDER THE CONTROLS, about a key or a state the canvas is in: it is a
 * `status` region, so entering a state a reader cannot see out of is said to a
 * reader who cannot see it either, and it is inert, so a press meant for the
 * chart reaches the chart.
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
