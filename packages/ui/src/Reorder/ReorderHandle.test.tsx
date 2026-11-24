import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ReorderHandle, useReorder } from './index.js';

afterEach(cleanup);

function List({ pointerOnly, onReorder }: { pointerOnly?: boolean; onReorder: (next: string[]) => void }) {
  const reorder = useReorder({ keys: ['a', 'b'], onReorder, nameOf: (key) => key });
  return (
    <ul {...reorder.containerProps}>
      {reorder.order.map((key) => (
        <li key={key} {...reorder.itemProps(key)}>
          <ReorderHandle {...reorder.handleProps(key)} pointerOnly={pointerOnly} />
          {key}
        </li>
      ))}
    </ul>
  );
}

test('a handle is a named, draggable grip whose arrow keys move its item', () => {
  const onReorder = vi.fn();
  render(<List onReorder={onReorder} />);
  const handle = screen.getAllByRole('button')[1]!;
  expect(handle.getAttribute('draggable')).toBe('true');
  expect(handle.getAttribute('aria-label')).toMatch(/b/);
  expect(handle.classList.contains('crewlet-reorder-handle')).toBe(true);
  handle.focus();
  fireEvent.keyDown(handle, { key: 'ArrowUp' });
  expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
});

test('a pointer-only handle stays out of the tab order', () => {
  render(<List pointerOnly onReorder={() => {}} />);
  for (const handle of screen.getAllByRole('button')) expect(handle.tabIndex).toBe(-1);
});
