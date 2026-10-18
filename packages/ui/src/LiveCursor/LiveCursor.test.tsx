/**
 * A live cursor: at its point, with its flag, fading as it rests and hidden
 * when it has been still for long enough, and back at full strength the
 * moment it moves.
 */

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LiveCursor } from './index.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const cursor = (container: HTMLElement) => container.querySelector('.crewlet-live-cursor') as HTMLElement;

test('stands at its point with a filled pointer and the name flag, decorative to assistive technology', () => {
  const { container } = render(<LiveCursor x={120} y={48} name="Jane" hue="green" />);
  const element = cursor(container);
  expect(element.getAttribute('aria-hidden')).toBe('true');
  expect(element.style.transform).toBe('translate(120px, 48px)');
  expect(element.textContent).toBe('Jane');
  expect(element.querySelector('svg')).not.toBeNull();
  expect(element.classList.contains('crewlet-live-cursor--glide')).toBe(true);
});

test('fades after it rests, hides after it has been still for long, and comes back when it moves', () => {
  const { container, rerender } = render(<LiveCursor x={0} y={0} name="Jane" hue="green" idleAfterMs={5000} hideAfterMs={30000} />);
  expect(cursor(container).dataset['phase']).toBe('live');
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(cursor(container).dataset['phase']).toBe('resting');
  act(() => {
    vi.advanceTimersByTime(25000);
  });
  expect(cursor(container).dataset['phase']).toBe('gone');
  rerender(<LiveCursor x={10} y={0} name="Jane" hue="green" idleAfterMs={5000} hideAfterMs={30000} />);
  expect(cursor(container).dataset['phase']).toBe('live');
});

test('jumps rather than glides when asked to', () => {
  const { container } = render(<LiveCursor x={0} y={0} name="Jane" hue="green" interpolate={false} />);
  expect(cursor(container).classList.contains('crewlet-live-cursor--glide')).toBe(false);
});
