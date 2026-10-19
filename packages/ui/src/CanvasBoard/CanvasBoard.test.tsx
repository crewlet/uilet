/**
 * A canvas of artboards: what is framed, who holds the pointer, and what an
 * edit reports. jsdom has no layout, so the viewport's size is fed through a
 * controllable ResizeObserver, as the Canvas suite does.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { IDENTITY_VIEW } from '../Canvas/index.js';
import { CanvasBoard, type CanvasBoardItem, type CanvasBoardNote } from './CanvasBoard.js';
import { liveBoards } from './budget.js';

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

const realResizeObserver = globalThis.ResizeObserver;
beforeEach(() => {
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  globalThis.ResizeObserver = realResizeObserver;
});

const BOARDS: CanvasBoardItem[] = [
  { id: 'hero', x: 0, y: 0, w: 1440, h: 900, title: 'Hero' },
  { id: 'features', x: 1540, y: 0, w: 1440, h: 900, title: 'Features' },
  { id: 'pricing', x: 0, y: 1000, w: 1440, h: 900, title: 'Pricing' },
  { id: 'mobile', x: 1540, y: 1000, w: 390, h: 844, title: 'Mobile' },
];

const NOTES: CanvasBoardNote[] = [
  { id: 's1', kind: 'sticky', x: 3100, y: 0, w: 240, h: 200, text: 'Copy from marketing', color: 'pink' },
  { id: 't1', kind: 'title', x: 0, y: -120, w: 900, h: 80, text: 'Launch landing page' },
];

const page = (b: CanvasBoardItem) => <div data-page={b.id}>{b.title} page</div>;

function mount(props: Partial<Parameters<typeof CanvasBoard>[0]> = {}) {
  const utils = render(
    <CanvasBoard label="Landing page" boards={BOARDS} notes={NOTES} renderBoard={page} minLiveWidth={0} {...props} />,
  );
  FakeResizeObserver.last!.resize(1200, 800);
  return utils;
}

const pages = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-page]')].map((el) => el.getAttribute('data-page'));

// ---- the budget ------------------------------------------------------------

test('a board is live only on screen, wide enough, and within the budget, the most visible first', () => {
  const frames = BOARDS.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));
  const viewport = { width: 1000, height: 1000 };
  // At actual size with the origin at the top left, only the hero is on screen.
  expect(liveBoards(frames, IDENTITY_VIEW, viewport, 12, 0)).toEqual(['hero']);
  // Zoomed out to a quarter, all four are on screen, in the boards' order.
  const quarter = { x: 0, y: 0, k: 0.25 };
  expect(liveBoards(frames, quarter, viewport, 12, 0)).toEqual(['hero', 'features', 'pricing', 'mobile']);
  // A budget of two keeps the two largest on screen.
  expect(liveBoards(frames, quarter, viewport, 2, 0)).toEqual(['hero', 'features']);
  // Drawn under the minimum width, a board is not run: the mobile board is 97px wide here.
  expect(liveBoards(frames, quarter, viewport, 12, 160)).toEqual(['hero', 'features', 'pricing']);
  // Panned off screen, nothing is.
  expect(liveBoards(frames, { x: -5000, y: 0, k: 1 }, viewport, 12, 0)).toEqual([]);
  expect(liveBoards(frames, IDENTITY_VIEW, { width: 0, height: 0 })).toEqual([]);
});

test('only live boards render their page; the rest draw a titled placeholder of their size', () => {
  const { container } = mount({ maxLive: 2 });
  const running = pages(container);
  expect(running).toHaveLength(2);
  expect(running).not.toContain('mobile');
  const placeholder = screen.getByRole('region', { name: 'Mobile, 390 by 844' });
  expect(placeholder.textContent).toContain('Zoom in to run this board');
});

test('nothing is framed before the canvas has been fitted', () => {
  const { container } = render(<CanvasBoard label="Landing page" boards={BOARDS} renderBoard={page} minLiveWidth={0} />);
  expect(pages(container)).toEqual([]);
});

// ---- who holds the pointer -------------------------------------------------

test('a click on a live board hands it the pointer, and Escape gives it back', () => {
  const onActivate = vi.fn();
  const { container } = mount({ onActivate });
  const hero = screen.getByRole('region', { name: 'Hero, 1440 by 900' });
  const shield = hero.querySelector('.crewlet-canvas-board__shield')!;
  fireEvent.click(shield);
  expect(onActivate).toHaveBeenLastCalledWith('hero');
  expect(hero.hasAttribute('data-active')).toBe(true);
  expect(hero.querySelector('.crewlet-canvas-board__shield')).toBeNull();
  expect(hero.textContent).toContain('Press Escape to return to the canvas');
  fireEvent.keyDown(container.querySelector('.crewlet-canvas__viewport')!, { key: 'Escape' });
  expect(onActivate).toHaveBeenLastCalledWith(null);
  expect(hero.querySelector('.crewlet-canvas-board__shield')).not.toBeNull();
});

test('a board opens full size from its own control', () => {
  const onOpen = vi.fn();
  mount({ onOpen });
  fireEvent.click(screen.getByRole('button', { name: 'Open Pricing full size' }));
  expect(onOpen).toHaveBeenCalledWith('pricing');
});

test('a view-only canvas offers no handle and no shield click', () => {
  mount();
  expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Resize / })).toBeNull();
});

// ---- editing ---------------------------------------------------------------

test('the arrow keys move a board by a step, Shift by a larger one, each reported once', () => {
  const onBoardChange = vi.fn();
  mount({ editable: true, onBoardChange });
  const handle = screen.getByRole('button', { name: 'Move Hero' });
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(onBoardChange).toHaveBeenLastCalledWith('hero', { x: 8, y: 0, w: 1440, h: 900 });
  fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true });
  expect(onBoardChange).toHaveBeenLastCalledWith('hero', { x: 0, y: 64, w: 1440, h: 900 });
  expect(onBoardChange).toHaveBeenCalledTimes(2);
});

test('a resize is held to the side bounds', () => {
  const onBoardChange = vi.fn();
  mount({
    editable: true,
    onBoardChange,
    boards: [{ id: 'tiny', x: 0, y: 0, w: 44, h: 44, title: 'Tiny' }],
    notes: [],
  });
  fireEvent.keyDown(screen.getByRole('button', { name: 'Resize Tiny' }), { key: 'ArrowLeft' });
  expect(onBoardChange).toHaveBeenLastCalledWith('tiny', { x: 0, y: 0, w: 40, h: 44 });
});

test('a pointer drag previews the move and reports it once, in canvas pixels', () => {
  const onBoardChange = vi.fn();
  mount({ editable: true, onBoardChange });
  const handle = screen.getByRole('button', { name: 'Move Mobile' });
  const mobile = screen.getByRole('region', { name: /^Mobile/ });
  const zoom = Number(
    (mobile.closest('.crewlet-canvas-board__layer') as HTMLElement).style.getPropertyValue(
      '--crewlet-canvas-board-zoom',
    ),
  );
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 150, clientY: 100 });
  expect(mobile.style.left).toBe(`${1540 + Math.round(50 / zoom)}px`);
  expect(onBoardChange).not.toHaveBeenCalled();
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: 150, clientY: 125 });
  expect(onBoardChange).toHaveBeenCalledTimes(1);
  expect(onBoardChange).toHaveBeenCalledWith('mobile', {
    x: 1540 + Math.round(50 / zoom),
    y: 1000 + Math.round(25 / zoom),
    w: 390,
    h: 844,
  });
});

test('a press on a handle that never moves reports nothing', () => {
  const onBoardChange = vi.fn();
  mount({ editable: true, onBoardChange });
  const handle = screen.getByRole('button', { name: 'Move Hero' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: 10, clientY: 10 });
  expect(onBoardChange).not.toHaveBeenCalled();
});

test('a note is retyped in place, moved by its handle and deleted', () => {
  const onNoteChange = vi.fn();
  const onNoteRemove = vi.fn();
  mount({ editable: true, onNoteChange, onNoteRemove });
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit note' })[0]!);
  const field = screen.getByRole('textbox', { name: 'Note text' });
  fireEvent.change(field, { target: { value: 'Copy is final' } });
  fireEvent.blur(field, { target: { value: 'Copy is final' } });
  expect(onNoteChange).toHaveBeenLastCalledWith({ ...NOTES[0], text: 'Copy is final' });

  fireEvent.keyDown(screen.getByRole('button', { name: 'Move Launch landing page' }), { key: 'ArrowUp' });
  expect(onNoteChange).toHaveBeenLastCalledWith({ ...NOTES[1], y: -128 });

  fireEvent.click(screen.getAllByRole('button', { name: 'Delete note' })[1]!);
  expect(onNoteRemove).toHaveBeenCalledWith('t1');
});

test('Escape abandons a note edit, and empty text is never saved', () => {
  const onNoteChange = vi.fn();
  mount({ editable: true, onNoteChange });
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit note' })[0]!);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note text' }), { key: 'Escape' });
  expect(screen.queryByRole('textbox', { name: 'Note text' })).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit note' })[0]!);
  fireEvent.blur(screen.getByRole('textbox', { name: 'Note text' }), { target: { value: '   ' } });
  expect(onNoteChange).not.toHaveBeenCalled();
});

test('a sticky is drawn on its colour\'s paper, the first colour by default', () => {
  const { container } = mount({
    notes: [{ id: 'a', kind: 'sticky', x: 0, y: 0, w: 200, h: 200, text: 'Plain' }, NOTES[0]!],
  });
  const stickies = container.querySelectorAll('.crewlet-canvas-board__note[data-kind="sticky"]');
  expect(stickies[0]!.classList.contains('crewlet-note--amber')).toBe(true);
  expect(stickies[1]!.classList.contains('crewlet-note--rose')).toBe(true);
});
