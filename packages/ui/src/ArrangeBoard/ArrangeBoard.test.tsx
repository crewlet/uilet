/**
 * The ground under a page being arranged: drawn only while editing, carrying
 * the page's column count for its lanes, and handing everything else it is
 * given to its element.
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ArrangeBoard } from './index.js';

afterEach(cleanup);

const board = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-arrange-board')!;

test('it is the ground only while the page is being arranged', () => {
  const { container, rerender } = render(
    <ArrangeBoard editing={false}>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  expect(board(container).classList.contains('is-editing')).toBe(false);
  rerender(
    <ArrangeBoard editing>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  expect(board(container).classList.contains('is-editing')).toBe(true);
  expect(board(container).textContent).toBe('Cards');
});

test('it carries the column count its lanes are drawn at, twelve unless told', () => {
  const { container, rerender } = render(
    <ArrangeBoard editing>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  expect(board(container).style.getPropertyValue('--crewlet-arrange-board-columns')).toBe('12');
  rerender(
    <ArrangeBoard editing columns={6}>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  expect(board(container).style.getPropertyValue('--crewlet-arrange-board-columns')).toBe('6');
});

test('a caller’s class and style are kept beside its own', () => {
  const { container } = render(
    <ArrangeBoard editing className="home-board" style={{ marginTop: '4px' }}>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  const el = board(container);
  expect(el.classList.contains('home-board')).toBe(true);
  expect(el.style.marginTop).toBe('4px');
  expect(el.style.getPropertyValue('--crewlet-arrange-board-columns')).toBe('12');
});

test('the rest of its props reach the element, so the board can be a drop target', () => {
  const onDragOver = vi.fn();
  const onDrop = vi.fn();
  const { container } = render(
    <ArrangeBoard editing data-reorder-over="true" onDragOver={onDragOver} onDrop={onDrop}>
      <p>Cards</p>
    </ArrangeBoard>,
  );
  const el = board(container);
  expect(el.getAttribute('data-reorder-over')).toBe('true');
  fireEvent.dragOver(el);
  fireEvent.drop(el);
  expect(onDragOver).toHaveBeenCalledTimes(1);
  expect(onDrop).toHaveBeenCalledTimes(1);
});
