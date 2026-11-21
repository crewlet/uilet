/**
 * A rating is read as its figure and drawn to the nearest half star, in the
 * text's ink and never the warning hue.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Rating } from './index.js';

afterEach(cleanup);

const stars = (container: HTMLElement) =>
  [...container.querySelectorAll('.crewlet-rating__star')].map((star) => {
    const on = star.querySelector('.crewlet-rating__on');
    return on === null ? 0 : on.classList.contains('crewlet-rating__on--half') ? 0.5 : 1;
  });

test('is one image named by its exact figure', () => {
  render(<Rating value={4.6} />);
  expect(screen.getByRole('img', { name: 'Rated 4.6 out of 5' })).toBeTruthy();
});

test.each([
  [4, [1, 1, 1, 1, 0]],
  [4.6, [1, 1, 1, 1, 0.5]],
  [4.8, [1, 1, 1, 1, 1]],
  [0.2, [0, 0, 0, 0, 0]],
  [1.3, [1, 0.5, 0, 0, 0]],
] as const)('%s fills the stars it rounds to by halves', (value, filled) => {
  const { container } = render(<Rating value={value} />);
  expect(stars(container)).toEqual(filled);
});

test('holds a value outside its scale to the scale, and draws a ten-star scale', () => {
  const { container } = render(<Rating value={12} max={10} />);
  expect(stars(container)).toEqual(Array(10).fill(1));
  expect(screen.getByRole('img', { name: 'Rated 10 out of 10' })).toBeTruthy();
  cleanup();
  render(<Rating value={-1} />);
  expect(screen.getByRole('img', { name: 'Rated 0 out of 5' })).toBeTruthy();
});

test('draws the figure only when asked, and keeps it out of the name it already says', () => {
  const { container } = render(<Rating value={4.62} showValue />);
  const figure = container.querySelector('.crewlet-rating__value')!;
  expect(figure.textContent).toBe('4.6');
  expect(figure.getAttribute('aria-hidden')).toBe('true');
});

test('takes the ink and the control edge, never a status hue, and cuts a half star by a class', () => {
  const sheet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Rating.css'), 'utf8');
  expect(sheet).toMatch(/\.crewlet-rating__on\s*\{[^}]*color:\s*var\(--color-text-primary\)/);
  expect(sheet).toMatch(/\.crewlet-rating__off\s*\{[^}]*color:\s*var\(--color-border-strong\)/);
  expect(sheet).not.toMatch(/--color-(status|warning|danger)/);
  const { container } = render(<Rating value={2.5} />);
  expect(container.querySelector('[style]')?.closest('.crewlet-rating__on--half')).toBeFalsy();
});
