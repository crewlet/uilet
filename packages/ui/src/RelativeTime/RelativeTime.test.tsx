/**
 * Relative time, and the one clock behind it.
 *
 * The three grammar cases are ported from the engine dashboard's
 * `lib/format.test.ts`, which is deleted along with the second implementation
 * they covered.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RelativeTime, currentNow, formatElapsed, formatRelative, formatUntil, toInstant, useNow } from './index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const NOW = Date.parse('2026-01-01T12:00:00Z');

describe('the grammar', () => {
  test('an age reads backwards in the shortest honest unit', () => {
    expect(formatRelative('2026-01-01T11:56:00Z', NOW)).toBe('4m ago');
    expect(formatRelative('2026-01-01T12:00:00Z', NOW)).toBe('just now');
    expect(formatRelative('2026-01-01T09:00:00Z', NOW)).toBe('3h ago');
  });

  test('a future stamp reads forwards rather than as a negative age', () => {
    expect(formatRelative('2026-01-01T12:30:00Z', NOW)).toBe('in 30m');
    expect(formatUntil('2026-01-01T11:00:00Z', NOW)).toBe('due');
  });

  test('a missing stamp is null, so the caller decides what an absence looks like', () => {
    // Never the epoch, and never a bare dash chosen here: an absence that says
    // nothing about itself is the one thing this product does not ship.
    expect(formatRelative(undefined, NOW)).toBeNull();
    expect(formatUntil('', NOW)).toBeNull();
    expect(formatRelative('not a date', NOW)).toBeNull();
  });

  test('a naive stamp is read as UTC, as the aware form of the same instant is', () => {
    // Read as local time, a naive stamp is wrong by the reader's own offset,
    // and the two encodings of one instant render as two different times on
    // one screen.
    expect(toInstant('2026-01-01T00:00:00')).toBe(toInstant('2026-01-01T00:00:00Z'));
  });

  test('elapsed says how long, where relative would claim it is over', () => {
    expect(formatElapsed('2026-01-01T11:55:40Z', NOW)).toBe('4m 20s');
    expect(formatElapsed('2026-01-01T10:54:00Z', NOW)).toBe('1h 6m');
    // A clock a second ahead of the server is not a negative duration.
    expect(formatElapsed('2026-01-01T12:00:05Z', NOW)).toBe('0s');
  });
});

describe('the element', () => {
  test('it is a time element carrying the exact instant', () => {
    render(<RelativeTime value="2026-01-01T11:56:00Z" now={NOW} />);
    const time = screen.getByText('4m ago');
    expect(time.tagName).toBe('TIME');
    expect(time.getAttribute('dateTime')).toBe('2026-01-01T11:56:00.000Z');
    // The words are approximate on purpose; the title is where a reader goes
    // for the real one.
    expect(time.getAttribute('title')).toBeTruthy();
  });

  test('a stamp nothing can parse is a marked absence, not a wrong time', () => {
    render(<RelativeTime value={null} emptyLabel="Never run" />);
    expect(screen.getByText('Never run')).toBeDefined();
    expect(document.querySelector('time')).toBeNull();
  });
});

describe('the clock', () => {
  test('one ticker advances every reader together, once a second', () => {
    vi.useFakeTimers();
    function Two() {
      const a = useNow();
      const b = useNow();
      return <span data-testid="pair">{a === b ? 'agreed' : 'disagreed'}</span>;
    }
    render(<Two />);
    const start = currentNow();
    expect(screen.getByTestId('pair').textContent).toBe('agreed');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // It actually moved: a ticker that never fires agrees with itself, so the
    // check above passes for the wrong reason without this one. Strictly
    // greater, because "at least" is what a clock that never ticked reports.
    expect(currentNow()).toBeGreaterThan(start);
    expect(screen.getByTestId('pair').textContent).toBe('agreed');
  });

  test('the last reader leaving stops the interval', () => {
    vi.useFakeTimers();
    function Reader() {
      useNow();
      return null;
    }
    const { unmount } = render(<Reader />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    // A screen with no relative time on it runs no timer at all.
    expect(vi.getTimerCount()).toBe(0);
  });
});
