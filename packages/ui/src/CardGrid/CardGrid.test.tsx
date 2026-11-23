/**
 * CardGrid: its steps carried on the grid so the stylesheet draws them, and a
 * list's attributes on the list itself. The row heights are measured in the
 * layout suite (`apps/ui-layout-tests/src/card-grid.test.tsx`).
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { CardGrid } from './index.js';

afterEach(cleanup);

test('draws as many cards as fit at the middle step unless told otherwise', () => {
  const { container } = render(<CardGrid>cards</CardGrid>);
  const grid = container.querySelector('.crewlet-card-grid')!;
  expect(grid.tagName).toBe('DIV');
  expect(grid.getAttribute('data-columns')).toBeNull();
  expect(grid.getAttribute('data-min')).toBe('md');
  expect(grid.getAttribute('data-gap')).toBe('4');
});

test('carries the count, step and gap it is given', () => {
  const { container } = render(
    <CardGrid columns={2} min="lg" gap={5} className="page-cards">
      cards
    </CardGrid>,
  );
  const grid = container.querySelector('.crewlet-card-grid')!;
  expect(grid.getAttribute('data-columns')).toBe('2');
  expect(grid.getAttribute('data-min')).toBe('lg');
  expect(grid.getAttribute('data-gap')).toBe('5');
  expect(grid.classList.contains('page-cards')).toBe(true);
});

test('is the list itself when drawn as one, named on the list', () => {
  render(
    <CardGrid as="ul" aria-label="Models">
      <li>Sign-in</li>
      <li>Answers</li>
    </CardGrid>,
  );
  const list = screen.getByRole('list', { name: 'Models' });
  expect(list.classList.contains('crewlet-card-grid')).toBe(true);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
