/**
 * One block of a page being arranged: nothing of its own at rest, and while
 * arranging its own move handle, a toolbar on its edge and a resize handle
 * that says which way it moves.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import type { ReorderHandleProps } from '../Reorder/index.js';
import { ArrangeFrame, type ArrangeFrameProps } from './index.js';

afterEach(cleanup);

function handleOf(): ReorderHandleProps {
  return {
    draggable: true,
    'aria-label': 'Move Projects',
    'aria-describedby': 'reorder-hint',
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onKeyDown: vi.fn(),
  };
}

function frame(props: Partial<ArrangeFrameProps> = {}) {
  const { container } = render(
    <div className="grid">
      <ArrangeFrame name="Projects" editing columns={4} {...props}>
        {props.children ?? <p>Three projects</p>}
      </ArrangeFrame>
    </div>,
  );
  return container.querySelector<HTMLElement>('.crewlet-arrange-frame')!;
}

test('at rest it draws its child and nothing of its own', () => {
  const el = frame({ editing: false, handle: handleOf(), onRemove: () => {}, resize: { onResize: () => {} } });
  expect(el.textContent).toBe('Three projects');
  expect(el.classList.contains('is-editing')).toBe(false);
  expect(el.querySelector('.crewlet-arrange-frame__bar')).toBeNull();
  expect(el.querySelector('.crewlet-arrange-frame__resize')).toBeNull();
  expect(el.getAttribute('draggable')).toBeNull();
  expect(el.getAttribute('tabindex')).toBeNull();
  expect(el.getAttribute('role')).toBeNull();
  expect(el.querySelector('.crewlet-arrange-frame__content')!.hasAttribute('inert')).toBe(false);
});

test('while arranging, its toolbar is named for the block and carries its actions', () => {
  const el = frame({ actions: <button type="button">Edit Projects</button> });
  const bar = el.querySelector('.crewlet-arrange-frame__bar')!;
  expect(bar.getAttribute('role')).toBe('group');
  expect(bar.getAttribute('aria-label')).toBe('Tools for Projects');
  expect(bar.querySelector('button')!.textContent).toBe('Edit Projects');
});

test('Remove takes the block off, and is drawn only when it can', () => {
  const onRemove = vi.fn();
  frame({ onRemove });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Projects' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
  cleanup();
  frame();
  expect(screen.queryByRole('button', { name: 'Remove Projects' })).toBeNull();
});

test('a fixed block says why it cannot be removed, and the press does nothing', () => {
  const onRemove = vi.fn();
  frame({ onRemove, fixed: 'Home always shows its figures.' });
  const remove = screen.getByRole('button', { name: 'Remove Projects' });
  expect(remove.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByText('Home always shows its figures.')).toBeTruthy();
  fireEvent.click(remove);
  expect(onRemove).not.toHaveBeenCalled();
});

test('its content is inert while arranging, except in a container, whose blocks stay operable', () => {
  expect(frame().querySelector('.crewlet-arrange-frame__content')!.hasAttribute('inert')).toBe(true);
  cleanup();
  expect(frame({ container: true }).querySelector('.crewlet-arrange-frame__content')!.hasAttribute('inert')).toBe(false);
});

test('given a handle, the block itself is the drag source and a named, focusable group', () => {
  const handle = handleOf();
  const el = frame({ handle });
  expect(el.getAttribute('draggable')).toBe('true');
  expect(el.getAttribute('tabindex')).toBe('0');
  expect(el.getAttribute('role')).toBe('group');
  expect(el.getAttribute('aria-label')).toBe('Projects');
  expect(el.getAttribute('aria-describedby')).toBe('reorder-hint');
});

test('without a handle the block does not move', () => {
  const el = frame();
  expect(el.getAttribute('draggable')).toBeNull();
  expect(el.getAttribute('tabindex')).toBeNull();
});

test('the arrows move the block only when the block itself has focus, never from a field inside it', () => {
  const handle = handleOf();
  const el = frame({ handle, container: true, children: <input aria-label="Group name" /> });
  fireEvent.keyDown(el, { key: 'ArrowRight' });
  expect(handle.onKeyDown).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(el.querySelector('input')!, { key: 'ArrowRight' });
  expect(handle.onKeyDown).toHaveBeenCalledTimes(1);
});

test('a drag that starts on a field is refused, and one that starts on the surface is the handle’s', () => {
  const handle = handleOf();
  const el = frame({ handle, container: true, children: <input aria-label="Group name" /> });
  const input = el.querySelector('input')!;

  fireEvent.pointerDown(input);
  const fromField = fireEvent.dragStart(el);
  expect(fromField).toBe(false);
  expect(handle.onDragStart).not.toHaveBeenCalled();

  fireEvent.pointerDown(el);
  fireEvent.dragStart(el);
  expect(handle.onDragStart).toHaveBeenCalledTimes(1);
  fireEvent.dragEnd(el);
  expect(handle.onDragEnd).toHaveBeenCalledTimes(1);
});

test('bare, container and fresh mark the block; selected marks it only while arranging', () => {
  const el = frame({ bare: true, container: true, fresh: true, selected: true });
  for (const name of ['is-bare', 'is-container', 'is-fresh', 'is-selected']) {
    expect(el.classList.contains(name), name).toBe(true);
  }
  cleanup();
  expect(frame({ editing: false, selected: true }).classList.contains('is-selected')).toBe(false);
});

test('it spans its columns, and a set height is its rows times the row height', () => {
  const fitted = frame({ columns: 6 });
  expect(fitted.style.gridColumn).toBe('span 6');
  expect(fitted.dataset.columns).toBe('6');
  expect(fitted.style.height).toBe('');
  expect(fitted.classList.contains('is-fixed-height')).toBe(false);
  cleanup();
  const fixedHeight = frame({ columns: 4, rows: 10, rowHeight: 16 });
  expect(fixedHeight.style.height).toBe('160px');
  expect(fixedHeight.classList.contains('is-fixed-height')).toBe(true);
});

test('a block sized both ways has a corner handle; one sized by width alone has an edge grip', () => {
  const corner = frame({ resize: { onResize: () => {} } });
  const both = screen.getByRole('button', { name: 'Resize Projects' });
  expect(both.classList.contains('is-corner')).toBe(true);
  expect(corner.contains(both)).toBe(true);
  cleanup();
  frame({ resize: { vertical: false, onResize: () => {} } });
  const across = screen.getByRole('button', { name: 'Change the width of Projects' });
  expect(across.classList.contains('is-edge')).toBe(true);
});

test('without resize there is no handle to resize by', () => {
  const el = frame();
  expect(el.querySelector('.crewlet-arrange-frame__resize')).toBeNull();
});

test('the resize handle resizes from the keyboard, one column or one row at a time', () => {
  const onResize = vi.fn();
  frame({ columns: 4, rows: 10, rowHeight: 16, resize: { minColumns: 3, onResize } });
  const handle = screen.getByRole('button', { name: 'Resize Projects' });
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 5, rows: 10 });
  fireEvent.keyDown(handle, { key: 'ArrowDown' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 4, rows: 11 });
  fireEvent.keyDown(handle, { key: 'Enter' });
  expect(onResize).toHaveBeenLastCalledWith({ columns: 4, rows: null });
});

test('passes axe while arranging', async () => {
  const { container } = render(
    <div>
      <p id="reorder-hint">Drag to move, or press the arrow keys.</p>
      <ArrangeFrame
        name="Projects"
        editing
        columns={4}
        handle={handleOf()}
        onRemove={() => {}}
        resize={{ onResize: () => {} }}
      >
        <p>Three projects</p>
      </ArrangeFrame>
    </div>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
