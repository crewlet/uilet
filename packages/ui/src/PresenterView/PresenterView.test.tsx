/**
 * The presenter's screen: the slide, the next one, the notes, a timer that
 * pauses and resets, and controls that stop at the ends.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PresenterView, formatStopwatch } from './index.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function view(overrides: Partial<Parameters<typeof PresenterView>[0]> = {}) {
  let now = 0;
  const clock = { advance: (ms: number) => (now += ms) };
  const props = {
    current: <p>Plan</p>,
    currentTitle: 'The plan',
    next: <p>Numbers</p>,
    nextTitle: 'Numbers',
    notes: 'Receive the questions first.',
    position: 4,
    total: 12,
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    now: () => now,
    ...overrides,
  };
  return { ...render(<PresenterView {...props} />), props, clock };
}

test('the stopwatch reads m:ss, and h:mm:ss past an hour', () => {
  expect(formatStopwatch(0)).toBe('0:00');
  expect(formatStopwatch(65_000)).toBe('1:05');
  expect(formatStopwatch(3_725_000)).toBe('1:02:05');
});

test('the view names the slide, the next one and the notes', () => {
  view();
  expect(screen.getByRole('group', { name: 'Slide 4 of 12, The plan' })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Next, Numbers' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Speaker notes' }).textContent).toContain('Receive the questions');
  expect(screen.getByText('4 of 12')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Next' }).textContent).toContain('Numbers');
  expect(screen.getByRole('region', { name: 'Current' }).textContent).toContain('Plan');
});

test('the timer runs, pauses, resumes from where it stopped and resets', () => {
  const { clock } = view();
  const timer = () => screen.getByRole('timer').textContent;
  act(() => {
    clock.advance(65_000);
    vi.advanceTimersByTime(1000);
  });
  expect(timer()).toBe('1:05');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  act(() => {
    clock.advance(30_000);
    vi.advanceTimersByTime(1000);
  });
  expect(timer()).toBe('1:05');
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  act(() => {
    clock.advance(5_000);
    vi.advanceTimersByTime(1000);
  });
  expect(timer()).toBe('1:10');
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(timer()).toBe('0:00');
});

test('the controls move the show and stop at its ends', () => {
  const { props } = view({ position: 12, next: null });
  fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
  expect(props.onPrevious).toHaveBeenCalledOnce();
  expect(screen.getByText('End of the deck', { selector: 'p' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Next slide' }).getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
  expect(props.onNext).not.toHaveBeenCalled();
});

test('the view passes axe', async () => {
  vi.useRealTimers();
  const { container } = view();
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
