/**
 * TileGrid: a fixed track count, carried on the grid so its folds are the
 * stylesheet's, and the attributes a list needs on the list itself.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/*
 * A COMPACT TILE NEEDS 30rem for its one-line header (measured: two compact
 * tiles on 415px tracks cut the name to its first letter). So for every count,
 * a grid holding one folds before a track would fall under that, reading the
 * folds off the stylesheet since jsdom evaluates no container query.
 */
test('a grid of compact tiles folds before a track is narrower than a compact header', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'TileGrid.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const TILE = 30;
  const GAP = 0.75;
  const folds: { below: number; columns: string; tracks: number }[] = [];
  for (const block of css.matchAll(/@container crewlet-tile-grid \(width < ([\d.]+)rem\) \{([\s\S]*?)\n\}/g)) {
    for (const rule of block[2]!.matchAll(/\.crewlet-tile-grid\[data-columns(?:='(\d)')?\]:has\(\.crewlet-catalog-tile--compact\)[^{]*\{\s*--crewlet-tile-grid-tracks: (\d);/g)) {
      folds.push({ below: Number(block[1]), columns: rule[1] ?? 'any', tracks: Number(rule[2]) });
    }
  }
  /** The widest container at which a grid of `columns` still draws `tracks` or more. */
  const need = (tracks: number) => tracks * TILE + (tracks - 1) * GAP;
  const foldTo = (columns: number, tracks: number) =>
    folds.find((f) => (f.columns === String(columns) || f.columns === 'any') && f.tracks <= tracks);
  for (const columns of [2, 3, 4]) {
    // Below the width `columns` tracks need, the grid has folded to fewer.
    const fold = foldTo(columns, columns - 1);
    expect(fold, `a compact grid of ${columns} never folds`).toBeDefined();
    expect(fold!.below).toBeGreaterThanOrEqual(need(columns));
  }
  // Two tracks of four need what two of two need.
  expect(folds.find((f) => f.columns === 'any' && f.tracks === 1)!.below).toBeGreaterThanOrEqual(need(2));
});
