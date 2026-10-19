/**
 * Idle: a still pointer puts a show's controls away, a move brings them back,
 * a key (a clicker) does not, and a control in keyboard focus keeps them out.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { IDLE_AFTER_MS, useIdle } from './index.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Show({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const idle = useIdle(ref, enabled);
  return (
    <div ref={ref} data-testid="show" data-idle={idle ? 'true' : 'false'}>
      <button type="button">Next</button>
    </div>
  );
}

const idle = () => screen.getByTestId('show').getAttribute('data-idle');

test('a still pointer goes idle, and a move wakes it', () => {
  render(<Show />);
  expect(idle()).toBe('false');
  act(() => vi.advanceTimersByTime(IDLE_AFTER_MS));
  expect(idle()).toBe('true');
  fireEvent.pointerMove(screen.getByTestId('show'));
  expect(idle()).toBe('false');
  act(() => vi.advanceTimersByTime(IDLE_AFTER_MS - 1));
  expect(idle()).toBe('false');
});

test('a key does not wake it, since a clicker sends keys', () => {
  render(<Show />);
  act(() => vi.advanceTimersByTime(IDLE_AFTER_MS));
  fireEvent.keyDown(screen.getByTestId('show'), { key: 'ArrowRight' });
  expect(idle()).toBe('true');
});

test('off, it is never idle', () => {
  render(<Show enabled={false} />);
  act(() => vi.advanceTimersByTime(IDLE_AFTER_MS * 2));
  expect(idle()).toBe('false');
});
