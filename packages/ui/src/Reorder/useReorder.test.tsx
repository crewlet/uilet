/**
 * Putting items in order, within one list and between several: by the arrow
 * keys on a named handle, by command, and by drag, every move reported once
 * and said aloud.
 */

import { cleanup, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { moveKey, useReorder, useReorderLists, type ReorderAxis, type ReorderLabels } from './index.js';

afterEach(cleanup);

/** What a drag carries, as far as the hook reads or writes it. */
function dataTransfer() {
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: vi.fn(),
    setDragImage: vi.fn(),
  };
}

function OneList({
  initial,
  axis,
  labels,
  onReorder,
}: {
  initial: string[];
  axis?: ReorderAxis;
  labels?: Partial<ReorderLabels>;
  onReorder?: (keys: string[]) => void;
}) {
  const [keys, setKeys] = useState(initial);
  const r = useReorder({
    keys,
    onReorder: (next) => {
      setKeys(next);
      onReorder?.(next);
    },
    nameOf: (key) => key.toUpperCase(),
    axis,
    labels,
  });
  return (
    <>
      <Announcer />
      <span id={r.hintId}>{r.hint}</span>
      <ul aria-label="Items" {...r.containerProps}>
        {r.order.map((key) => (
          <li key={key} data-key={key} {...r.itemProps(key)}>
            <button type="button" {...r.handleProps(key)}>
              {key}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * A drag passing over `el` at (x, y). jsdom has no DragEvent, so the pointer's
 * place is set on the event the library builds rather than passed to it.
 */
function dragOverAt(el: Element, x: number, y: number) {
  const event = createEvent.dragOver(el, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, 'clientX', { value: x });
  Object.defineProperty(event, 'clientY', { value: y });
  fireEvent(el, event);
}

const order = () =>
  within(screen.getByRole('list', { name: 'Items' }))
    .getAllByRole('listitem')
    .map((li) => li.getAttribute('data-key'));

const handle = (name: string) => screen.getByRole('button', { name: `Move ${name}` });

test('moveKey takes a key out and puts it back at a place, clamped to the ends', () => {
  expect(moveKey(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
  expect(moveKey(['a', 'b', 'c'], 'c', -4)).toEqual(['c', 'a', 'b']);
  expect(moveKey(['a', 'b', 'c'], 'b', 9)).toEqual(['a', 'c', 'b']);
});

test('the handle is a named control, described by the hint', () => {
  render(<OneList initial={['a', 'b']} />);
  const control = handle('A');
  const hint = document.getElementById(control.getAttribute('aria-describedby')!);
  expect(hint?.textContent).toBe('Drag to move, or press the arrow keys.');
  expect(control.getAttribute('draggable')).toBe('true');
});

test('the handle takes its name and the hint from the labels given', () => {
  render(<OneList initial={['a']} labels={{ handle: (name) => `Arrange ${name}`, hint: 'Use the arrows.' }} />);
  const control = screen.getByRole('button', { name: 'Arrange A' });
  expect(document.getElementById(control.getAttribute('aria-describedby')!)?.textContent).toBe('Use the arrows.');
});

test('in a vertical list, Down moves an item later and Up earlier', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b', 'c']} onReorder={onReorder} />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowDown' });
  expect(order()).toEqual(['b', 'a', 'c']);
  fireEvent.keyDown(handle('C'), { key: 'ArrowUp' });
  expect(order()).toEqual(['b', 'c', 'a']);
  expect(onReorder).toHaveBeenCalledTimes(2);
});

test('in a vertical list, Left and Right move nothing', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b']} onReorder={onReorder} />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowRight' });
  fireEvent.keyDown(handle('B'), { key: 'ArrowLeft' });
  expect(onReorder).not.toHaveBeenCalled();
});

test('in a grid, Left and Right move an item as Up and Down do', () => {
  render(<OneList initial={['a', 'b', 'c']} axis="grid" />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowRight' });
  expect(order()).toEqual(['b', 'a', 'c']);
  fireEvent.keyDown(handle('C'), { key: 'ArrowLeft' });
  expect(order()).toEqual(['b', 'c', 'a']);
});

test('a move past either end is no move, and reports nothing', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b']} onReorder={onReorder} />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowUp' });
  fireEvent.keyDown(handle('B'), { key: 'ArrowDown' });
  expect(onReorder).not.toHaveBeenCalled();
  expect(order()).toEqual(['a', 'b']);
});

test('a key pressed with a modifier is left to the platform', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b']} onReorder={onReorder} />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowDown', metaKey: true });
  fireEvent.keyDown(handle('A'), { key: 'ArrowDown', altKey: true });
  expect(onReorder).not.toHaveBeenCalled();
});

test('every move is said, by the item’s name and its new place', () => {
  render(<OneList initial={['a', 'b', 'c']} />);
  fireEvent.keyDown(handle('A'), { key: 'ArrowDown' });
  expect(screen.getByRole('status').textContent).toBe('A moved to position 2 of 3.');
});

test('a drag marks the item it carries, and the end of the drag clears it', () => {
  render(<OneList initial={['a', 'b']} />);
  const item = handle('A').closest('li')!;
  expect(item.getAttribute('data-reorder')).toBe('idle');
  const carried = dataTransfer();
  fireEvent.dragStart(handle('A'), { dataTransfer: carried });
  expect(item.getAttribute('data-reorder')).toBe('dragging');
  expect(carried.effectAllowed).toBe('move');
  expect(carried.setData).toHaveBeenCalledWith('text/plain', 'A');
  fireEvent.dragEnd(handle('A'));
  expect(item.getAttribute('data-reorder')).toBe('idle');
});

test('a drag ended anywhere but a list leaves the order as it was', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b', 'c']} onReorder={onReorder} />);
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  dragOverAt(handle('C').closest('li')!, 10, 10);
  fireEvent.dragEnd(handle('A'));
  expect(onReorder).not.toHaveBeenCalled();
  expect(order()).toEqual(['a', 'b', 'c']);
});

test('a drop commits the previewed order once', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b', 'c']} onReorder={onReorder} />);
  const target = handle('C').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  // Past the middle of C on the way down: A takes C's place in the preview.
  dragOverAt(target, 10, 10);
  expect(order()).toEqual(['b', 'c', 'a']);
  fireEvent.drop(target, { dataTransfer: dataTransfer() });
  expect(onReorder).toHaveBeenCalledTimes(1);
  expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
  expect(screen.getByRole('status').textContent).toBe('A moved to position 3 of 3.');
});

test('an item takes another’s place only once the pointer is past that item’s middle', () => {
  render(<OneList initial={['a', 'b', 'c']} />);
  const c = handle('C').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  // Still in C's upper half on the way down: no swap yet.
  dragOverAt(c, 10, -10);
  expect(order()).toEqual(['a', 'b', 'c']);
  dragOverAt(c, 10, 10);
  expect(order()).toEqual(['b', 'c', 'a']);
});

test('a drop that changes nothing reports nothing', () => {
  const onReorder = vi.fn();
  render(<OneList initial={['a', 'b']} onReorder={onReorder} />);
  const own = handle('A').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  fireEvent.dragOver(own, { dataTransfer: dataTransfer() });
  fireEvent.drop(own, { dataTransfer: dataTransfer() });
  expect(onReorder).not.toHaveBeenCalled();
});

// ---- several lists ------------------------------------------------------------

type Lists = Record<string, string[]>;

function Board({
  initial,
  axis = 'vertical',
  accepts,
  onReorder,
}: {
  initial: Lists;
  axis?: ReorderAxis;
  accepts?: (key: string, list: string) => boolean;
  onReorder?: (next: Lists) => void;
}) {
  const [lists, setLists] = useState<Lists>(initial);
  const r = useReorderLists({
    lists,
    onReorder: (next) => {
      setLists(next);
      onReorder?.(next);
    },
    nameOf: (key) => key.toUpperCase(),
    accepts,
    axis,
  });
  return (
    <>
      <Announcer />
      {Object.keys(r.lists).map((list) => (
        <ul key={list} aria-label={list} {...r.listProps(list)}>
          {(r.lists[list] ?? []).map((key) => (
            <li key={key} data-key={key} {...r.itemProps(key)}>
              <button type="button" {...r.handleProps(key)}>
                {key}
              </button>
            </li>
          ))}
        </ul>
      ))}
      <button type="button" onClick={() => r.moveTo('a', 'right')}>
        Move A to right
      </button>
      <button type="button" onClick={() => r.move('a', 1)}>
        Move A down
      </button>
    </>
  );
}

const keysIn = (list: string) =>
  within(screen.getByRole('list', { name: list }))
    .queryAllByRole('listitem')
    .map((li) => li.getAttribute('data-key'));

test('move steps an item within its own list', () => {
  render(<Board initial={{ left: ['a', 'b'], right: ['c'] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move A down' }));
  expect(keysIn('left')).toEqual(['b', 'a']);
});

test('moveTo puts an item at the end of another list, and says where', () => {
  const onReorder = vi.fn();
  render(<Board initial={{ left: ['a', 'b'], right: ['c'] }} onReorder={onReorder} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move A to right' }));
  expect(onReorder).toHaveBeenCalledWith({ left: ['b'], right: ['c', 'a'] });
  expect(screen.getByRole('status').textContent).toBe('A moved to position 2 of 2.');
});

test('moveTo is refused by a list that does not accept the item', () => {
  const onReorder = vi.fn();
  render(
    <Board
      initial={{ left: ['a'], right: ['c'] }}
      accepts={(_key, list) => list !== 'right'}
      onReorder={onReorder}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Move A to right' }));
  expect(onReorder).not.toHaveBeenCalled();
  expect(keysIn('left')).toEqual(['a']);
});

test('a drag into another list marks where it lands, and the drop moves it there', () => {
  const onReorder = vi.fn();
  render(<Board initial={{ left: ['a', 'b'], right: ['c'] }} onReorder={onReorder} />);
  const c = handle('C').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  // Below C, the last item: A would land after it.
  dragOverAt(c, 10, 10);
  expect(c.getAttribute('data-reorder-target')).toBe('after');
  // Each item spans its row in a vertical list, so the marker runs across it.
  expect(c.getAttribute('data-reorder-line')).toBe('horizontal');
  expect(screen.getByRole('list', { name: 'right' }).getAttribute('data-reorder-over')).toBe('true');
  // The carried item stays where it was until the drop: moving it would unmount it.
  expect(keysIn('left')).toEqual(['a', 'b']);
  fireEvent.drop(c, { dataTransfer: dataTransfer() });
  expect(onReorder).toHaveBeenCalledTimes(1);
  expect(onReorder).toHaveBeenCalledWith({ left: ['b'], right: ['c', 'a'] });
  expect(c.getAttribute('data-reorder-target')).toBeNull();
});

test('in a grid, an item that shares its row is marked beside it, before it', () => {
  render(<Board axis="grid" initial={{ left: ['a'], right: ['c'] }} />);
  const c = handle('C').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  // Above C: A would land before it.
  dragOverAt(c, 10, -10);
  expect(c.getAttribute('data-reorder-target')).toBe('before');
  expect(c.getAttribute('data-reorder-line')).toBe('vertical');
});

test('a list that does not accept the item takes no drop and marks nothing', () => {
  const onReorder = vi.fn();
  render(
    <Board
      initial={{ left: ['a'], right: ['c'] }}
      accepts={(_key, list) => list !== 'right'}
      onReorder={onReorder}
    />,
  );
  const c = handle('C').closest('li')!;
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  dragOverAt(c, 10, 10);
  expect(c.getAttribute('data-reorder-target')).toBeNull();
  fireEvent.drop(c, { dataTransfer: dataTransfer() });
  expect(onReorder).not.toHaveBeenCalled();
});

test('a drop on another list’s empty stretch lands the item at its end', () => {
  const onReorder = vi.fn();
  render(<Board initial={{ left: ['a', 'b'], right: [] }} onReorder={onReorder} />);
  const right = screen.getByRole('list', { name: 'right' });
  fireEvent.dragStart(handle('A'), { dataTransfer: dataTransfer() });
  dragOverAt(right, 10, 10);
  expect(right.getAttribute('data-reorder-over')).toBe('true');
  fireEvent.drop(right, { dataTransfer: dataTransfer() });
  expect(onReorder).toHaveBeenCalledWith({ left: ['b'], right: ['a'] });
});
