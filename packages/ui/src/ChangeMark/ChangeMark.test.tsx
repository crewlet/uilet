/**
 * A change mark: a corner notch, decorative, with a tooltip that says who,
 * when and what it was.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ChangeMark } from './index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('is a decorative mark whose tooltip names the writer, the time and the previous value', () => {
  vi.useFakeTimers();
  const { container } = render(<ChangeMark by="Maya Ortiz" at="2026-10-17T10:42:00Z" previous="6.8" locale="en-GB" />);
  const mark = container.querySelector('.crewlet-change-mark') as HTMLElement;
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  fireEvent.pointerEnter(mark);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole('tooltip').textContent).toMatch(/^Changed by Maya Ortiz, \d{2}:\d{2}\. Was 6\.8\.$/);
});

test('says nothing of a previous value it was not given', () => {
  vi.useFakeTimers();
  const { container } = render(<ChangeMark by="PM" at={Date.parse('2026-10-17T10:42:00Z')} locale="en-GB" />);
  fireEvent.pointerEnter(container.querySelector('.crewlet-change-mark')!);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole('tooltip').textContent).toMatch(/^Changed by PM, \d{2}:\d{2}\.$/);
});
