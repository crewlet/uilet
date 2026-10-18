/**
 * Resizing a block by its corner: snapped to whole columns of the grid it sits
 * on and whole rows down while the pointer moves, reported once on release,
 * put back by Escape, and the same by keyboard.
 */

import { useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useGridResize, type GridResizeOptions } from './index.js';

/*
 * THE GRID IS MEASURED, and jsdom lays nothing out, so the grid the block sits
 * on is described here: twelve 90px tracks with a 10px gap, a step of 100px
 * per column, and a block four columns wide (390px) and ten 16px rows tall.
 */
const TRACK = 90;
const GAP = 10;
const ROW = 16;

const real = window.getComputedStyle;
let grid: HTMLElement | null = null;

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    if (el !== grid) return real.call(window, el, pseudo);
    return {
      gridTemplateColumns: Array.from({ length: 12 }, () => `${TRACK}px`).join(' '),
      columnGap: `${GAP}px`,
      paddingLeft: '0px',
      paddingRight: '0px',
    } as CSSStyleDeclaration;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  grid = null;
});

function Harness(options: GridResizeOptions) {
  const frame = useRef<HTMLDivElement | null>(null);
  const { live, guides, handleProps } = useGridResize(frame, options);
  return (
    <div className="grid">
      <div
        ref={frame}
        className="frame"
        data-live={live ? `${live.columns}x${live.rows ?? 'fit'}` : ''}
        data-guides={guides ? `${guides.columns}/${guides.gap}` : ''}
      >
        <button type="button" {...handleProps} />
      </div>
    </div>
  );
}

function box(width: number, height: number): DOMRect {
  return { x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height, toJSON: () => ({}) } as DOMRect;
}

function setup(over: Partial<GridResizeOptions> = {}) {
  const onResize = vi.fn();
  const options: GridResizeOptions = {
    name: 'Projects',
    size: { columns: 4, rows: 10 },
    rowHeight: ROW,
    onResize,
    ...over,
  };
  const { container } = render(<Harness {...options} />);
  grid = container.querySelector<HTMLElement>('.grid')!;
  const frame = container.querySelector<HTMLElement>('.frame')!;
  const columns = options.size.columns;
  const height = (options.size.rows ?? 6) * ROW;
  frame.getBoundingClientRect = () => box(columns * TRACK + (columns - 1) * GAP, height);
  grid.getBoundingClientRect = () => box(12 * TRACK + 11 * GAP, 400);
  const handle = container.querySelector<HTMLElement>('button')!;
  return { onResize, frame, handle };
}

const down = (el: HTMLElement, x = 100, y = 100, pointerId = 1) =>
  fireEvent.pointerDown(el, { button: 0, pointerId, clientX: x, clientY: y });
const move = (el: HTMLElement, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerMove(el, { pointerId, clientX: x, clientY: y });
const up = (el: HTMLElement, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerUp(el, { pointerId, clientX: x, clientY: y });

test('the handle is named for the block and lists its keys', () => {
  const { handle } = setup();
  expect(handle.getAttribute('aria-label')).toBe('Resize Projects');
  expect(handle.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown Enter');
});

test('a press shows the grid the block snaps to, and the block’s size as it stands', () => {
  const { frame, handle } = setup();
  down(handle);
  expect(frame.dataset.guides).toBe(`12/${GAP}`);
  expect(frame.dataset.live).toBe('4x10');
});

test('the size snaps to whole columns and whole rows as the pointer moves', () => {
  const { frame, handle } = setup();
  down(handle, 100, 100);
  move(handle, 300, 132);
  expect(frame.dataset.live).toBe('6x12');
  move(handle, 340, 132);
  expect(frame.dataset.live).toBe('6x12');
  move(handle, 360, 92);
  expect(frame.dataset.live).toBe('7x10');
});

test('the release reports the new size once, and the live size goes', () => {
  const { onResize, frame, handle } = setup();
  down(handle, 100, 100);
  move(handle, 300, 132);
  up(handle, 300, 132);
  expect(onResize).toHaveBeenCalledTimes(1);
  expect(onResize).toHaveBeenCalledWith({ columns: 6, rows: 12 });
  expect(frame.dataset.live).toBe('');
  expect(frame.dataset.guides).toBe('');
});

test('a release where it started reports nothing', () => {
  const { onResize, handle } = setup();
  down(handle, 100, 100);
  up(handle, 120, 104);
  expect(onResize).not.toHaveBeenCalled();
});

test('the width stays between its minimum and the grid’s columns, and the height between its rows', () => {
  const { onResize, handle } = setup({ minColumns: 3, minRows: 4, maxRows: 20 });
  down(handle, 100, 100);
  move(handle, 5000, 5000);
  up(handle, 5000, 5000);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 12, rows: 20 });

  down(handle, 100, 100);
  move(handle, -5000, -5000);
  up(handle, -5000, -5000);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 3, rows: 4 });
});

test('a maximum narrower than the grid caps the width', () => {
  const { onResize, handle } = setup({ maxColumns: 8 });
  down(handle, 100, 100);
  up(handle, 5000, 100);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 8, rows: 10 });
});

test('a block that fits its content keeps doing so until the pointer moves half a row', () => {
  const { onResize, frame, handle } = setup({ size: { columns: 4, rows: null } });
  down(handle, 100, 100);
  move(handle, 300, 106);
  expect(frame.dataset.live).toBe('6xfit');
  up(handle, 300, 106);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 6, rows: null });
});

test('width alone never sets a height', () => {
  const { onResize, handle } = setup({ size: { columns: 4, rows: null }, vertical: false });
  down(handle, 100, 100);
  up(handle, 300, 400);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 6, rows: null });
});

test('Escape puts the block back and reports nothing', () => {
  const { onResize, frame, handle } = setup();
  down(handle, 100, 100);
  move(handle, 300, 132);
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
  expect(frame.dataset.live).toBe('');
  up(handle, 300, 132);
  expect(onResize).not.toHaveBeenCalled();
});

test('a cancelled pointer ends the resize', () => {
  const { onResize, frame, handle } = setup();
  down(handle, 100, 100);
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  expect(frame.dataset.live).toBe('');
  up(handle, 300, 132);
  expect(onResize).not.toHaveBeenCalled();
});

test('another pointer’s moves are not this resize’s', () => {
  const { frame, handle } = setup();
  down(handle, 100, 100, 1);
  move(handle, 600, 300, 2);
  expect(frame.dataset.live).toBe('4x10');
});

test('a pointer the browser refuses to capture still resizes', () => {
  const { onResize, handle } = setup();
  handle.setPointerCapture = () => {
    throw new DOMException('No active pointer with that id.', 'NotFoundError');
  };
  down(handle, 100, 100);
  up(handle, 300, 100);
  expect(onResize).toHaveBeenCalledWith({ columns: 6, rows: 10 });
});

test('only the primary button starts a resize', () => {
  const { frame, handle } = setup();
  fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientX: 100, clientY: 100 });
  expect(frame.dataset.live).toBe('');
});

test('the arrows resize by one column or one row, inside the limits', () => {
  const { onResize, handle } = setup({ minColumns: 4, maxRows: 10 });
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 5, rows: 10 });
  fireEvent.keyDown(handle, { key: 'ArrowUp' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 4, rows: 9 });
  onResize.mockClear();
  fireEvent.keyDown(handle, { key: 'ArrowLeft' });
  fireEvent.keyDown(handle, { key: 'ArrowDown' });
  expect(onResize).not.toHaveBeenCalled();
});

test('Enter and a double press fit the height to the content again', () => {
  const { onResize, handle } = setup();
  fireEvent.keyDown(handle, { key: 'Enter' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 4, rows: null });
  fireEvent.doubleClick(handle);
  expect(onResize).toHaveBeenCalledTimes(2);
  expect(onResize).toHaveBeenLastCalledWith({ columns: 4, rows: null });
});

test('a block sized by width alone takes no height keys', () => {
  const { onResize, handle } = setup({ vertical: false });
  for (const key of ['ArrowUp', 'ArrowDown', 'Enter']) fireEvent.keyDown(handle, { key });
  fireEvent.doubleClick(handle);
  expect(onResize).not.toHaveBeenCalled();
});

test('a modified arrow is left to the page', () => {
  const { onResize, handle } = setup();
  fireEvent.keyDown(handle, { key: 'ArrowRight', metaKey: true });
  fireEvent.keyDown(handle, { key: 'ArrowRight', altKey: true });
  expect(onResize).not.toHaveBeenCalled();
});
