/**
 * TileGrid: a fixed track count, carried on the grid so its folds are the
 * stylesheet's, and the attributes a list needs on the list itself.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { TileGrid } from './index.js';

afterEach(cleanup);

test('draws three tracks unless told otherwise', () => {
  const { container } = render(<TileGrid>tiles</TileGrid>);
  const grid = container.querySelector('.crewlet-tile-grid')!;
  expect(grid.getAttribute('data-columns')).toBe('3');
  expect(grid.querySelector(':scope > .crewlet-tile-grid__track')!.textContent).toBe('tiles');
});

test('carries the count it is given', () => {
  const { container } = render(<TileGrid columns={4}>tiles</TileGrid>);
  expect(container.querySelector('.crewlet-tile-grid')!.getAttribute('data-columns')).toBe('4');
});

test('is the list itself when drawn as one, named on the list', () => {
  render(
    <TileGrid as="ul" aria-label="Spaces" className="page-grid">
      <li>Engineering</li>
      <li>Design</li>
    </TileGrid>,
  );
  const list = screen.getByRole('list', { name: 'Spaces' });
  expect(list.classList.contains('crewlet-tile-grid__track')).toBe(true);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  // The page places the grid's box, not its track.
  expect(list.parentElement!.classList.contains('page-grid')).toBe(true);
});
