/**
 * A media query's answer, read during render and again whenever it changes.
 */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useMediaMatch } from './index.js';

type Listener = () => void;

/** A window whose width the test sets, answering `(width < Npx)` queries the way a browser would. */
function installWidth(initial: number) {
  let width = initial;
  const lists = new Map<string, Set<Listener>>();
  const original = window.matchMedia;
  const matches = (query: string) => {
    const m = /\(width < (\d+)px\)/.exec(query);
    return m ? width < Number(m[1]) : false;
  };
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches(query);
    },
    media: query,
    addEventListener: (_: string, fn: Listener) => {
      if (!lists.has(query)) lists.set(query, new Set());
      lists.get(query)!.add(fn);
    },
    removeEventListener: (_: string, fn: Listener) => lists.get(query)?.delete(fn),
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: number) {
      width = next;
      for (const set of lists.values()) for (const fn of set) fn();
    },
    listeners: (query: string) => lists.get(query)?.size ?? 0,
    restore() {
      window.matchMedia = original;
    },
  };
}

let restore: (() => void) | null = null;
afterEach(() => {
  cleanup();
  restore?.();
  restore = null;
});

test('the first render already has the answer, and a change re-renders with the new one', () => {
  const win = installWidth(390);
  restore = win.restore;
  const { result } = renderHook(() => useMediaMatch('(width < 640px)'));
  expect(result.current).toBe(true);
  act(() => win.set(1280));
  expect(result.current).toBe(false);
  // At the breakpoint's own edge, both sides.
  act(() => win.set(639));
  expect(result.current).toBe(true);
  act(() => win.set(640));
  expect(result.current).toBe(false);
});

test('a new query is listened to in place of the old one, and nothing is left listening after unmount', () => {
  const win = installWidth(800);
  restore = win.restore;
  const { result, rerender, unmount } = renderHook(({ q }) => useMediaMatch(q), {
    initialProps: { q: '(width < 640px)' },
  });
  expect(result.current).toBe(false);
  rerender({ q: '(width < 1024px)' });
  expect(result.current).toBe(true);
  expect(win.listeners('(width < 640px)')).toBe(0);
  expect(win.listeners('(width < 1024px)')).toBe(1);
  unmount();
  expect(win.listeners('(width < 1024px)')).toBe(0);
});

test('a browser without matchMedia answers false, the wide layout', () => {
  const original = window.matchMedia;
  // @ts-expect-error: a browser that has no matchMedia at all.
  delete window.matchMedia;
  restore = () => {
    window.matchMedia = original;
  };
  const { result } = renderHook(() => useMediaMatch('(width < 640px)'));
  expect(result.current).toBe(false);
});
