/**
 * A canvas of artboards: what is framed, who holds the pointer, and what an
 * edit reports. jsdom has no layout, so the viewport's size is fed through a
 * controllable ResizeObserver, as the Canvas suite does.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createRef } from 'react';
import { IDENTITY_VIEW, type CanvasHandle } from '../Canvas/index.js';
import { installHover, installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import {
  BOARD_TITLE_MIN_WIDTH,
  CanvasBoard,
  TITLE_GLYPH_EM,
  boardRoom,
  titleSize,
  type CanvasBoardItem,
  type CanvasBoardNote,
  type CanvasBoardSelection,
} from './CanvasBoard.js';
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

test('only live boards render their page; the rest draw a placeholder of their size', () => {
  const { container } = mount({ maxLive: 2 });
  const running = pages(container);
  expect(running).toHaveLength(2);
  expect(running).not.toContain('mobile');
  // The placeholder is named by the title above it, and says only its size
  // and, with the room for it, why it is not running.
  const placeholder = screen.getByRole('region', { name: 'Mobile, 390 by 844' });
  const text = placeholder.querySelector('.crewlet-canvas-board__placeholder')!.textContent;
  expect(text).toContain('390 by 844');
  expect(text).not.toContain('Mobile');
});

test('what a board says is held to the room it is drawn in', () => {
  // Named only when wide enough to read a name.
  expect(boardRoom(BOARD_TITLE_MIN_WIDTH - 1, 200).title).toBe(false);
  expect(boardRoom(BOARD_TITLE_MIN_WIDTH, 200).title).toBe(true);
  // A placeholder drops its lines in turn rather than clipping them.
  expect(boardRoom(400, 300).lines).toBe(2);
  expect(boardRoom(120, 300).lines).toBe(1);
  expect(boardRoom(400, 40).lines).toBe(1);
  expect(boardRoom(60, 300).lines).toBe(0);
});

test('a board drawn too narrow to name is drawn unnamed, and a placeholder says only what fits', () => {
  // Fitted into 1200 pixels, the design is drawn at about a third; held to
  // twelve, the 390 pixel board is about 130 pixels wide.
  mount({ maxLive: 0 });
  const mobile = screen.getByRole('region', { name: 'Mobile, 390 by 844' });
  expect(mobile.hasAttribute('data-untitled')).toBe(false);
  const lines = mobile.querySelectorAll('.crewlet-canvas-board__placeholder-text > *');
  expect(lines).toHaveLength(1);
  expect(lines[0]!.textContent).toBe('390 by 844');
  // The same canvas in a viewport a tenth as wide draws every board too
  // narrow to name.
  cleanup();
  render(<CanvasBoard label="Landing page" boards={BOARDS} renderBoard={page} maxLive={0} />);
  FakeResizeObserver.last!.resize(120, 80);
  for (const board of BOARDS) {
    expect(
      screen.getByRole('region', { name: new RegExp(`^${board.title},`) }).hasAttribute('data-untitled'),
    ).toBe(true);
  }
});

test('a caller can hold the selection, and hears every change to it', () => {
  const onSelectedChange = vi.fn();
  const { rerender } = render(
    <CanvasBoard
      label="Landing page"
      boards={BOARDS}
      renderBoard={page}
      minLiveWidth={0}
      selected={{ kind: 'board', id: 'pricing' }}
      onSelectedChange={onSelectedChange}
    />,
  );
  FakeResizeObserver.last!.resize(1200, 800);
  const pricing = screen.getByRole('region', { name: 'Pricing, 1440 by 900' });
  const hero = screen.getByRole('region', { name: 'Hero, 1440 by 900' });
  expect(pricing.hasAttribute('data-selected')).toBe(true);
  // A press asks for the change; the canvas draws what the caller holds.
  fireEvent.click(hero.querySelector('.crewlet-canvas-board__shield')!);
  expect(onSelectedChange).toHaveBeenLastCalledWith({ kind: 'board', id: 'hero' });
  expect(hero.hasAttribute('data-selected')).toBe(false);
  const next: CanvasBoardSelection = { kind: 'board', id: 'hero' };
  rerender(
    <CanvasBoard
      label="Landing page"
      boards={BOARDS}
      renderBoard={page}
      minLiveWidth={0}
      selected={next}
      onSelectedChange={onSelectedChange}
    />,
  );
  expect(hero.hasAttribute('data-selected')).toBe(true);
  // Pressing the board already selected is no change.
  const calls = onSelectedChange.mock.calls.length;
  fireEvent.click(hero.querySelector('.crewlet-canvas-board__shield')!);
  expect(onSelectedChange).toHaveBeenCalledTimes(calls);
  // Escape clears it.
  fireEvent.keyDown(document.querySelector('.crewlet-canvas__viewport')!, { key: 'Escape' });
  expect(onSelectedChange).toHaveBeenLastCalledWith(null);
});

test('a board name that is a move handle keeps the name\'s type', () => {
  const uninstall = installSheets('CanvasBoard/CanvasBoard.css');
  const { container } = mount();
  const read = container.querySelector('.crewlet-canvas-board__title')!;
  const size = px(read, 'font-size');
  cleanup();
  mount({ editable: true });
  // Under the handle's `font: inherit` the name was set at the page's size.
  expect(px(screen.getByRole('button', { name: 'Move Hero' }), 'font-size')).toBe(size);
  uninstall();
});

test('nothing is framed before the canvas has been fitted', () => {
  const { container } = render(<CanvasBoard label="Landing page" boards={BOARDS} renderBoard={page} minLiveWidth={0} />);
  expect(pages(container)).toEqual([]);
});

// ---- who holds the pointer -------------------------------------------------

test('a click selects a board and a double-click hands it the pointer; Escape gives it back, then clears the selection', () => {
  const onActivate = vi.fn();
  const { container } = mount({ onActivate });
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  const hero = screen.getByRole('region', { name: 'Hero, 1440 by 900' });
  fireEvent.click(hero.querySelector('.crewlet-canvas-board__shield')!);
  expect(hero.hasAttribute('data-selected')).toBe(true);
  expect(onActivate).not.toHaveBeenCalled();
  const status = container.querySelector('.crewlet-canvas__hint')!;
  expect(status.getAttribute('role')).toBe('status');
  expect(status.textContent).toBe('Double-click to use this board');
  fireEvent.doubleClick(hero.querySelector('.crewlet-canvas-board__shield')!);
  expect(onActivate).toHaveBeenLastCalledWith('hero');
  expect(hero.hasAttribute('data-active')).toBe(true);
  expect(hero.querySelector('.crewlet-canvas-board__shield')).toBeNull();
  expect(status.textContent).toBe('Press Escape to return to the canvas');
  fireEvent.keyDown(viewport, { key: 'Escape' });
  expect(onActivate).toHaveBeenLastCalledWith(null);
  expect(hero.querySelector('.crewlet-canvas-board__shield')).not.toBeNull();
  expect(hero.hasAttribute('data-selected')).toBe(true);
  fireEvent.keyDown(viewport, { key: 'Escape' });
  expect(hero.hasAttribute('data-selected')).toBe(false);
  // The region stays, empty, for the next message.
  expect(status.isConnected && status.textContent).toBe('');
});

test('a click on the field clears the selection, and a board\'s name selects its board', () => {
  const { container } = mount();
  const pricing = screen.getByRole('region', { name: 'Pricing, 1440 by 900' });
  fireEvent.click(pricing.querySelector('.crewlet-canvas-board__title')!);
  expect(pricing.hasAttribute('data-selected')).toBe(true);
  fireEvent.click(container.querySelector('.crewlet-canvas__viewport')!);
  expect(pricing.hasAttribute('data-selected')).toBe(false);
});

test('a board that is not running is still selected by a click, but never handed the pointer', () => {
  const onActivate = vi.fn();
  mount({ onActivate, maxLive: 1 });
  const mobile = screen.getByRole('region', { name: 'Mobile, 390 by 844' });
  fireEvent.click(mobile.querySelector('.crewlet-canvas-board__shield')!);
  expect(mobile.hasAttribute('data-selected')).toBe(true);
  fireEvent.doubleClick(mobile.querySelector('.crewlet-canvas-board__shield')!);
  expect(onActivate).not.toHaveBeenCalled();
});

test('a narrower window refits a canvas nobody has moved, so no board is cut off', () => {
  const { container } = mount();
  const zoom = () =>
    Number(
      (container.querySelector('.crewlet-canvas-board__layer') as HTMLElement).style.getPropertyValue(
        '--crewlet-canvas-board-zoom',
      ),
    );
  const wide = zoom();
  FakeResizeObserver.last!.resize(600, 800);
  expect(zoom()).toBeLessThan(wide);
});

// ---- tools -----------------------------------------------------------------

const toolNames = () => within(screen.getByRole('toolbar', { name: 'Tools' })).getAllByRole('button').map((b) => b.getAttribute('aria-label'));

test('the palette offers Move and Hand, and Text and Sticky only where a person can place notes', () => {
  const { rerender } = mount();
  expect(toolNames()).toEqual(['Move', 'Hand']);
  expect(screen.getByRole('button', { name: 'Move' }).getAttribute('aria-pressed')).toBe('true');
  const props = { label: 'Landing page', boards: BOARDS, notes: NOTES, renderBoard: page, minLiveWidth: 0 };
  // Editable but placing nothing: still no note tools.
  rerender(<CanvasBoard {...props} editable />);
  expect(toolNames()).toEqual(['Move', 'Hand']);
  rerender(<CanvasBoard {...props} editable onNoteCreate={() => undefined} />);
  expect(toolNames()).toEqual(['Move', 'Hand', 'Text', 'Sticky note']);
  // Picking Sticky, then ending the edit, puts the tool down.
  fireEvent.click(screen.getByRole('button', { name: 'Sticky note' }));
  expect(screen.getByRole('button', { name: 'Sticky note' }).getAttribute('aria-pressed')).toBe('true');
  rerender(<CanvasBoard {...props} />);
  expect(screen.getByRole('button', { name: 'Move' }).getAttribute('aria-pressed')).toBe('true');
});

test('the palette can be left out, and its keys still work', () => {
  const { container } = mount({ toolbar: false });
  expect(screen.queryByRole('toolbar', { name: 'Tools' })).toBeNull();
  fireEvent.keyDown(container.querySelector('.crewlet-canvas__viewport')!, { key: 'h' });
  expect(container.querySelector('.crewlet-canvas-board')!.getAttribute('data-tool')).toBe('hand');
});

test('each tool shows its own pointer, picked by its letter; a field keeps its letters', () => {
  const { container } = mount({ editable: true, onNoteCreate: () => undefined });
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  const board = container.querySelector('.crewlet-canvas-board')!;
  const canvas = container.querySelector('.crewlet-canvas')!;
  const state = () => [board.getAttribute('data-tool'), canvas.getAttribute('data-cursor')];
  expect(state()).toEqual(['move', 'pointer']);
  fireEvent.keyDown(viewport, { key: 'h' });
  expect(state()).toEqual(['hand', 'hand']);
  fireEvent.keyDown(viewport, { key: 'T' });
  expect(state()).toEqual(['text', 'text']);
  fireEvent.keyDown(viewport, { key: 's' });
  expect(state()).toEqual(['sticky', 'crosshair']);
  // A chord is somebody else's.
  fireEvent.keyDown(viewport, { key: 'v', metaKey: true });
  expect(state()).toEqual(['sticky', 'crosshair']);
  fireEvent.keyDown(viewport, { key: 'v' });
  expect(state()).toEqual(['move', 'pointer']);
  // Typing a note is typing.
  fireEvent.doubleClick(container.querySelector('[data-kind="sticky"]')!);
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note text' }), { key: 'h' });
  expect(state()).toEqual(['move', 'pointer']);
});

test('Space holds the Hand until it is let go, and a focused control keeps its own Space', () => {
  const { container } = mount();
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  const board = container.querySelector('.crewlet-canvas-board')!;
  fireEvent.keyDown(viewport, { key: ' ' });
  expect(board.getAttribute('data-tool')).toBe('hand');
  expect(container.querySelector('.crewlet-canvas')!.getAttribute('data-cursor')).toBe('hand');
  // The palette still shows the tool in hand underneath.
  expect(screen.getByRole('button', { name: 'Move' }).getAttribute('aria-pressed')).toBe('true');
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
  });
  expect(board.getAttribute('data-tool')).toBe('move');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Hand' }), { key: ' ' });
  expect(board.getAttribute('data-tool')).toBe('move');
});

test('Text and Sticky place a note where the field is clicked, open it for typing, and hand back Move', () => {
  const canvasRef = createRef<CanvasHandle>();
  const onNoteCreate = vi.fn((kind: CanvasBoardNote['kind']) => (kind === 'sticky' ? 'n9' : undefined));
  const { container, rerender } = mount({ editable: true, onNoteCreate, canvasRef });
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  fireEvent.keyDown(viewport, { key: 's' });
  fireEvent.click(viewport, { clientX: 300, clientY: 200 });
  const at = canvasRef.current!.worldAt({ x: 300, y: 200 });
  expect(onNoteCreate).toHaveBeenCalledWith('sticky', { x: Math.round(at.x), y: Math.round(at.y) });
  expect(container.querySelector('.crewlet-canvas-board')!.getAttribute('data-tool')).toBe('move');
  // The caller adds the note it was asked for, and it opens for typing.
  const added: CanvasBoardNote = { id: 'n9', kind: 'sticky', x: at.x, y: at.y, w: 280, h: 200, text: 'Note' };
  rerender(
    <CanvasBoard
      label="Landing page"
      boards={BOARDS}
      notes={[...NOTES, added]}
      renderBoard={page}
      minLiveWidth={0}
      editable
      onNoteCreate={onNoteCreate}
      canvasRef={canvasRef}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Note text' })).toBe(document.activeElement);
  // Text places a title; under Move a click on the field places nothing.
  fireEvent.keyDown(viewport, { key: 't' });
  fireEvent.click(viewport, { clientX: 10, clientY: 10 });
  expect(onNoteCreate).toHaveBeenLastCalledWith('title', expect.any(Object));
  fireEvent.click(viewport, { clientX: 10, clientY: 10 });
  expect(onNoteCreate).toHaveBeenCalledTimes(2);
});

test('Frame is offered only where a person can place boards, and places one where the field is clicked', () => {
  const canvasRef = createRef<CanvasHandle>();
  const onBoardCreate = vi.fn(() => 'b9');
  const onSelectedChange = vi.fn();
  const props = { label: 'Landing page', boards: BOARDS, notes: NOTES, renderBoard: page, minLiveWidth: 0 };
  const { container, rerender } = mount({ onBoardCreate });
  // A view-only canvas never offers Frame, whatever the caller passes.
  expect(toolNames()).toEqual(['Move', 'Hand']);
  rerender(<CanvasBoard {...props} editable onBoardCreate={onBoardCreate} onNoteCreate={() => undefined} />);
  expect(toolNames()).toEqual(['Move', 'Hand', 'Frame', 'Text', 'Sticky note']);
  rerender(
    <CanvasBoard
      {...props}
      editable
      onBoardCreate={onBoardCreate}
      onSelectedChange={onSelectedChange}
      canvasRef={canvasRef}
    />,
  );
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  const state = () => [
    container.querySelector('.crewlet-canvas-board')!.getAttribute('data-tool'),
    container.querySelector('.crewlet-canvas')!.getAttribute('data-cursor'),
  ];
  fireEvent.keyDown(viewport, { key: 'f' });
  expect(state()).toEqual(['frame', 'crosshair']);
  // A click on a board is the board's, not a place for a new one.
  fireEvent.click(container.querySelector('.crewlet-canvas-board__shield')!);
  expect(onBoardCreate).not.toHaveBeenCalled();
  fireEvent.click(viewport, { clientX: 300, clientY: 200 });
  const at = canvasRef.current!.worldAt({ x: 300, y: 200 });
  expect(onBoardCreate).toHaveBeenCalledWith({ x: Math.round(at.x), y: Math.round(at.y) });
  expect(onSelectedChange).toHaveBeenLastCalledWith({ kind: 'board', id: 'b9' });
  expect(state()).toEqual(['move', 'pointer']);
});

test('Delete removes a selected board only where the caller removes boards', () => {
  const onBoardRemove = vi.fn();
  const { container, rerender } = mount({ editable: true });
  const viewport = container.querySelector('.crewlet-canvas__viewport')!;
  fireEvent.click(container.querySelector('.crewlet-canvas-board__shield')!);
  fireEvent.keyDown(viewport, { key: 'Delete' });
  expect(container.querySelector('[data-selected]')).not.toBeNull();
  rerender(
    <CanvasBoard
      label="Landing page"
      boards={BOARDS}
      notes={NOTES}
      renderBoard={page}
      minLiveWidth={0}
      editable
      onBoardRemove={onBoardRemove}
    />,
  );
  fireEvent.keyDown(viewport, { key: 'Backspace' });
  expect(onBoardRemove).toHaveBeenCalledWith('hero');
  expect(container.querySelector('.crewlet-canvas-board__board[data-selected]')).toBeNull();
});

test('a selected item draws four corners, and a corner resizes with the opposite corner held still', () => {
  const onBoardChange = vi.fn();
  const { container } = mount({ editable: true, onBoardChange });
  const hero = screen.getByRole('region', { name: 'Hero, 1440 by 900' });
  expect(hero.querySelectorAll('.crewlet-canvas-board__resize')).toHaveLength(1);
  fireEvent.focus(screen.getByRole('button', { name: 'Move Hero' }));
  expect(hero.hasAttribute('data-selected')).toBe(true);
  const corners = hero.querySelectorAll('.crewlet-canvas-board__resize');
  expect([...corners].map((c) => c.getAttribute('data-corner'))).toEqual(['resize-nw', 'resize-ne', 'resize-sw', 'resize-se']);
  // Only the keyboard's corner is exposed.
  expect([...corners].filter((c) => c.getAttribute('aria-hidden') !== 'true')).toHaveLength(1);
  const k = Number(
    (container.querySelector('.crewlet-canvas-board__layer') as HTMLElement).style.getPropertyValue(
      '--crewlet-canvas-board-zoom',
    ),
  );
  const nw = hero.querySelector('[data-corner="resize-nw"]')!;
  fireEvent.pointerDown(nw, { pointerId: 3, button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(nw, { pointerId: 3, clientX: 100 - 40 * k, clientY: 100 - 20 * k });
  fireEvent.pointerUp(nw, { pointerId: 3, clientX: 100 - 40 * k, clientY: 100 - 20 * k });
  expect(onBoardChange).toHaveBeenCalledTimes(1);
  expect(onBoardChange).toHaveBeenCalledWith('hero', { x: -40, y: -20, w: 1480, h: 920 });
});

test('a corner held to the minimum side keeps its opposite edge where it was', () => {
  const onBoardChange = vi.fn();
  const { container } = mount({ editable: true, onBoardChange, minSide: 100 });
  const mobile = screen.getByRole('region', { name: 'Mobile, 390 by 844' });
  fireEvent.focus(screen.getByRole('button', { name: 'Move Mobile' }));
  const k = Number(
    (container.querySelector('.crewlet-canvas-board__layer') as HTMLElement).style.getPropertyValue(
      '--crewlet-canvas-board-zoom',
    ),
  );
  const ne = mobile.querySelector('[data-corner="resize-ne"]')!;
  fireEvent.pointerDown(ne, { pointerId: 4, button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(ne, { pointerId: 4, clientX: -1000 * k, clientY: 1000 * k });
  fireEvent.pointerUp(ne, { pointerId: 4, clientX: -1000 * k, clientY: 1000 * k });
  // Width and height are held at 100; the left edge and the bottom edge stay.
  expect(onBoardChange).toHaveBeenCalledWith('mobile', { x: 1540, y: 1000 + 844 - 100, w: 100, h: 100 });
});

test('a note is selected by its paper, dragged by it, retyped on a double-click and deleted with Delete', () => {
  const onNoteChange = vi.fn();
  const onNoteRemove = vi.fn();
  const { container } = mount({ editable: true, onNoteChange, onNoteRemove });
  const sticky = container.querySelector('[data-kind="sticky"]')!;
  fireEvent.click(sticky);
  expect(sticky.hasAttribute('data-selected')).toBe(true);
  const k = Number(
    (container.querySelector('.crewlet-canvas-board__layer') as HTMLElement).style.getPropertyValue(
      '--crewlet-canvas-board-zoom',
    ),
  );
  fireEvent.pointerDown(sticky, { pointerId: 5, button: 0, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(sticky, { pointerId: 5, clientX: 50 * k, clientY: 0 });
  fireEvent.pointerUp(sticky, { pointerId: 5, clientX: 50 * k, clientY: 0 });
  expect(onNoteChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1', x: 3150, y: 0 }));
  // A press on the paper's own controls is the control's, not a drag.
  fireEvent.pointerDown(within(sticky as HTMLElement).getByRole('button', { name: 'Edit note' }), {
    pointerId: 6,
    button: 0,
  });
  fireEvent.pointerMove(sticky, { pointerId: 6, clientX: 500, clientY: 0 });
  fireEvent.pointerUp(sticky, { pointerId: 6, clientX: 500, clientY: 0 });
  expect(onNoteChange).toHaveBeenCalledTimes(1);
  fireEvent.doubleClick(sticky);
  expect(screen.getByRole('textbox', { name: 'Note text' })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note text' }), { key: 'Escape' });
  fireEvent.keyDown(container.querySelector('.crewlet-canvas__viewport')!, { key: 'Delete' });
  expect(onNoteRemove).toHaveBeenCalledWith('s1');
});

test('a view-only canvas deletes nothing with Delete', () => {
  const onNoteRemove = vi.fn();
  const { container } = mount({ onNoteRemove });
  fireEvent.click(container.querySelector('[data-kind="sticky"]')!);
  fireEvent.keyDown(container.querySelector('.crewlet-canvas__viewport')!, { key: 'Delete' });
  expect(onNoteRemove).not.toHaveBeenCalled();
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

test('a drag released where the last move left it is still reported', () => {
  // The item is drawn at its preview while the drag runs, so the release
  // must be judged against the frame the drag began on.
  const onBoardChange = vi.fn();
  mount({ editable: true, onBoardChange });
  const handle = screen.getByRole('button', { name: 'Move Hero' });
  fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 180, clientY: 140 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientX: 180, clientY: 140 });
  expect(onBoardChange).toHaveBeenCalledTimes(1);
  expect(onBoardChange.mock.calls[0]![1]).not.toEqual({ x: 0, y: 0, w: 1440, h: 900 });
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

// A TITLE FITS ITS BOX: as large as three fifths of its height allows, and set
// smaller when its text would otherwise run past the box's width, so a long
// heading never spills over the boards beside it at any zoom.
test('a title is set to fit its box both ways, and its box clips the rest', () => {
  const short = { w: 1200, h: 100, text: 'Launch' };
  expect(titleSize(short)).toBe(60);
  const long = {
    w: 1200,
    h: 100,
    text: 'FairSplit 1.0 launch landing page: hero, features, pricing and sign up, for review before copy freeze',
  };
  const size = titleSize(long);
  expect(size).toBeLessThan(60);
  expect(Array.from(long.text).length * size * TITLE_GLYPH_EM).toBeLessThanOrEqual(long.w + 0.001);

  const { container } = mount({ notes: [{ id: 't1', kind: 'title', x: 0, y: -160, ...long }] });
  const text = container.querySelector(
    '.crewlet-canvas-board__note[data-kind="title"] .crewlet-canvas-board__note-text',
  ) as HTMLElement;
  expect(text.style.fontSize).toBe(`${size}px`);
});

test('a board\'s name and controls are drawn over every board and note, so a note never takes their press', () => {
  const uninstall = installSheets('CanvasBoard/CanvasBoard.css');
  const { container } = mount({ editable: true });
  const chrome = container.querySelector('.crewlet-canvas-board__chrome')!;
  const note = container.querySelector('.crewlet-canvas-board__note')!;
  const tools = container.querySelector('.crewlet-canvas-board__note-tools')!;
  // The notes come after the boards in the layer, so in document order they
  // would be drawn over the names; the chrome's own layer is what lifts it.
  expect(chrome.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getComputedStyle(chrome).zIndex).toBe('1');
  expect(getComputedStyle(tools).zIndex).toBe('1');
  expect(getComputedStyle(note).zIndex).not.toBe('1');
  uninstall();
});

test('a hidden open control takes no room from its board\'s name, and a touch screen always shows it', () => {
  let uninstall = installHover('hover', 'CanvasBoard/CanvasBoard.css');
  mount({ onOpen: () => {} });
  const open = () => screen.getByRole('button', { name: 'Open Hero full size' });
  // At rest the control is out of the row, so the name may run the board's
  // whole width; it took that width while only transparent.
  expect(getComputedStyle(open()).position).toBe('absolute');
  expect(getComputedStyle(open()).opacity).toBe('0');
  // Selected, it is back in the row and drawn.
  fireEvent.click(screen.getByRole('region', { name: 'Hero, 1440 by 900' }).querySelector('.crewlet-canvas-board__shield')!);
  expect(getComputedStyle(open()).position).not.toBe('absolute');
  expect(getComputedStyle(open()).opacity).not.toBe('0');
  uninstall();
  cleanup();
  uninstall = installHover('none', 'CanvasBoard/CanvasBoard.css');
  mount({ onOpen: () => {} });
  expect(getComputedStyle(open()).opacity).not.toBe('0');
  uninstall();
});
