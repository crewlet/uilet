/**
 * The grip a panel is resized with: a separator with a value, moved by the
 * keyboard as well as the pointer, and a width kept per browser that is read
 * back only when it is one the panel can take.
 */

import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { AppShell, ResizeHandle, readStoredWidth, useStoredWidth, type WidthStorage } from './index.js';

afterEach(cleanup);

function Harness({
  edge = 'left',
  onCommit = () => {},
  start = 420,
}: {
  edge?: 'left' | 'right';
  onCommit?: (value: number) => void;
  start?: number;
}) {
  const [width, setWidth] = useState(start);
  return (
    <ResizeHandle
      label="Resize the assistant panel"
      value={width}
      min={360}
      max={640}
      defaultValue={420}
      edge={edge}
      onValueChange={setWidth}
      onValueCommit={onCommit}
    />
  );
}

const handle = () => screen.getByRole('separator', { name: 'Resize the assistant panel' });

test('is a vertical separator that states its value and its bounds', () => {
  render(<Harness />);
  const grip = handle();
  expect(grip.getAttribute('aria-orientation')).toBe('vertical');
  expect(grip.getAttribute('aria-valuenow')).toBe('420');
  expect(grip.getAttribute('aria-valuemin')).toBe('360');
  expect(grip.getAttribute('aria-valuemax')).toBe('640');
  expect(grip.getAttribute('aria-valuetext')).toBe('420 pixels');
  expect(grip.tabIndex).toBe(0);
});

test('on a left edge, ArrowLeft widens by 16 and Shift by 64, and each key is kept', () => {
  const commit = vi.fn();
  render(<Harness onCommit={commit} />);
  fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
  expect(handle().getAttribute('aria-valuenow')).toBe('436');
  fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
  expect(handle().getAttribute('aria-valuenow')).toBe('500');
  fireEvent.keyDown(handle(), { key: 'ArrowRight' });
  expect(handle().getAttribute('aria-valuenow')).toBe('484');
  expect(commit.mock.calls.map(([value]) => value)).toEqual([436, 500, 484]);
});

test('on a right edge the arrows point the other way', () => {
  render(<Harness edge="right" />);
  fireEvent.keyDown(handle(), { key: 'ArrowRight' });
  expect(handle().getAttribute('aria-valuenow')).toBe('436');
});

test('Home and End take it to its bounds, and Enter and a double press reset it', () => {
  render(<Harness start={500} />);
  fireEvent.keyDown(handle(), { key: 'Home' });
  expect(handle().getAttribute('aria-valuenow')).toBe('360');
  fireEvent.keyDown(handle(), { key: 'End' });
  expect(handle().getAttribute('aria-valuenow')).toBe('640');
  fireEvent.keyDown(handle(), { key: 'Enter' });
  expect(handle().getAttribute('aria-valuenow')).toBe('420');
  fireEvent.keyDown(handle(), { key: 'End' });
  fireEvent.doubleClick(handle());
  expect(handle().getAttribute('aria-valuenow')).toBe('420');
});

test('a key it answers is not also a page key, and one it does not is left alone', () => {
  render(<Harness />);
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
  handle().dispatchEvent(arrow);
  expect(arrow.defaultPrevented).toBe(true);
  const letter = new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true });
  handle().dispatchEvent(letter);
  expect(letter.defaultPrevented).toBe(false);
});

test('never goes past its bounds', () => {
  render(<Harness start={630} />);
  fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
  expect(handle().getAttribute('aria-valuenow')).toBe('640');
});

test('a drag is measured from where it started, and is kept once, where it ends', () => {
  const commit = vi.fn();
  render(<Harness onCommit={commit} />);
  const grip = handle();
  fireEvent.pointerDown(grip, { button: 0, clientX: 1000, pointerId: 1 });
  expect(grip.hasAttribute('data-dragging')).toBe(true);
  fireEvent.pointerMove(grip, { clientX: 960, pointerId: 1 });
  expect(handle().getAttribute('aria-valuenow')).toBe('460');
  fireEvent.pointerMove(grip, { clientX: 1100, pointerId: 1 });
  expect(handle().getAttribute('aria-valuenow')).toBe('360');
  expect(commit).not.toHaveBeenCalled();
  fireEvent.pointerUp(grip, { clientX: 1100, pointerId: 1 });
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit).toHaveBeenCalledWith(360);
  expect(handle().hasAttribute('data-dragging')).toBe(false);
});

test('a secondary press does not start a drag', () => {
  render(<Harness />);
  fireEvent.pointerDown(handle(), { button: 2, clientX: 1000, pointerId: 1 });
  fireEvent.pointerMove(handle(), { clientX: 900, pointerId: 1 });
  expect(handle().getAttribute('aria-valuenow')).toBe('420');
});

test('is offered on the shell as AppShell.ResizeHandle', () => {
  expect(AppShell.ResizeHandle).toBe(ResizeHandle);
});

test('carries no violation', async () => {
  const { container } = render(<Harness />);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

function memory(initial: Record<string, string> = {}): WidthStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

test('a stored width is read back only when it is a number inside the bounds', () => {
  expect(readStoredWidth(memory({ w: '480' }), 'w', 360, 640)).toBe(480);
  expect(readStoredWidth(memory({ w: '9000' }), 'w', 360, 640)).toBeNull();
  expect(readStoredWidth(memory({ w: 'wide' }), 'w', 360, 640)).toBeNull();
  expect(readStoredWidth(memory({ w: '' }), 'w', 360, 640)).toBeNull();
  expect(readStoredWidth(memory(), 'w', 360, 640)).toBeNull();
  expect(readStoredWidth(null, 'w', 360, 640)).toBeNull();
});

test('a width is null until the reader chooses one, drawn on every move and kept only when committed', () => {
  const storage = memory();
  const { result } = renderHook(() => useStoredWidth({ key: 'crewlet.test.width', min: 360, max: 640, storage }));
  expect(result.current.width).toBeNull();
  act(() => result.current.setWidth(500));
  expect(result.current.width).toBe(500);
  expect(storage.data['crewlet.test.width']).toBeUndefined();
  act(() => result.current.commitWidth(9000));
  expect(result.current.width).toBe(640);
  expect(storage.data['crewlet.test.width']).toBe('640');
});

test('storage that throws leaves the width working for the session', () => {
  const storage: WidthStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  const { result } = renderHook(() => useStoredWidth({ key: 'k', min: 360, max: 640, storage }));
  expect(result.current.width).toBeNull();
  act(() => result.current.commitWidth(400));
  expect(result.current.width).toBe(400);
});
