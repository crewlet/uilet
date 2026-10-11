/**
 * Where a highlight comes to rest, told once per resting place. Select and
 * CommandPalette hold the lists that use it to their own rules; this holds the
 * timing and the bookkeeping they share.
 */

import { act, cleanup, render } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HIGHLIGHT_REST_MS, useHighlightRest, type HighlightRest } from './index.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(told: (string | null)[], first: string | null = null) {
  const handle: { current: HighlightRest | null } = { current: null };
  function Probe() {
    const rest = useHighlightRest((key) => told.push(key));
    handle.current = rest;
    useEffect(() => {
      if (first !== null) rest.now(first);
    }, [rest]);
    return null;
  }
  return { handle, Probe };
}

test('a key is told at once, a pointer once it rests, and one resting place once', () => {
  const told: (string | null)[] = [];
  const { handle, Probe } = mount(told);
  render(<Probe />);
  const rest = handle.current!;
  act(() => rest.now('a'));
  act(() => rest.now('a'));
  expect(told).toEqual(['a']);
  act(() => rest.rest('b'));
  act(() => vi.advanceTimersByTime(HIGHLIGHT_REST_MS - 1));
  expect(told).toEqual(['a']);
  act(() => vi.advanceTimersByTime(1));
  expect(told).toEqual(['a', 'b']);
  // A key cancels a pointer still on its way.
  act(() => rest.rest('c'));
  act(() => rest.now('d'));
  act(() => vi.advanceTimersByTime(HIGHLIGHT_REST_MS * 2));
  expect(told).toEqual(['a', 'b', 'd']);
});

test('the object is one for the life of the component', () => {
  const told: (string | null)[] = [];
  const { handle, Probe } = mount(told);
  const { rerender } = render(<Probe />);
  const first = handle.current;
  rerender(<Probe />);
  expect(handle.current).toBe(first);
});

test('going away is nowhere, a pending rest included, and a double mount tells its place afresh', () => {
  const told: (string | null)[] = [];
  const { handle, Probe } = mount(told, 'a');
  const { unmount } = render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );
  // Mounted, unmounted and mounted again: the second mount is told its place.
  expect(told.at(-1)).toBe('a');
  act(() => handle.current!.rest('b'));
  unmount();
  act(() => vi.advanceTimersByTime(HIGHLIGHT_REST_MS * 2));
  expect(told.at(-1)).toBe(null);
  expect(told).not.toContain('b');
});
