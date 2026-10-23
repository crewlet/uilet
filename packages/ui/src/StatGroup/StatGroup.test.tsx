/**
 * A row of stat tiles as one card, with a fixed column count, and `flush`
 * inside another card, where the row gives up its own surface and edge.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { StatCard } from '../StatCard/index.js';
import { StatGroup } from './index.js';

afterEach(cleanup);

const row = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-stat-group')!;

test('holds its tiles at a fixed column count, four unless told', () => {
  const { container, rerender } = render(
    <StatGroup>
      <StatCard label="Live" value="3" />
      <StatCard label="Drifted" value="0" />
    </StatGroup>,
  );
  expect(row(container).style.getPropertyValue('--crewlet-stat-group-cols')).toBe('4');
  expect(row(container).querySelectorAll('.crewlet-statcard')).toHaveLength(2);
  rerender(
    <StatGroup columns={3}>
      <StatCard label="Live" value="3" />
    </StatGroup>,
  );
  expect(row(container).style.getPropertyValue('--crewlet-stat-group-cols')).toBe('3');
});

test('is its own card unless flush', () => {
  const { container } = render(
    <StatGroup className="nodes">
      <StatCard label="Live" value="3" />
    </StatGroup>,
  );
  expect(row(container).className).toBe('crewlet-stat-group nodes');
});

test('flush adds one modifier and changes nothing else', () => {
  const { container } = render(
    <StatGroup flush columns={3} className="nodes" aria-label="Nodes">
      <StatCard label="Live" value="3" />
    </StatGroup>,
  );
  const el = row(container);
  expect(el.className).toBe('crewlet-stat-group crewlet-stat-group--flush nodes');
  expect(el.style.getPropertyValue('--crewlet-stat-group-cols')).toBe('3');
  expect(el.getAttribute('aria-label')).toBe('Nodes');
});

const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'StatGroup.css'), 'utf8');

/** The declarations of the rule whose selector list is exactly `selectors`. */
function ruleFor(selectors: string[]): string {
  const head = selectors.join(',\n');
  const at = sheet.indexOf(`${head} {`);
  expect(at, head).toBeGreaterThan(-1);
  return sheet.slice(at + head.length + 2, sheet.indexOf('}', at));
}

/** The body of one `@container crewlet-stat-group (width < N)` block. */
function containerBlock(width: string): string {
  const head = `@container crewlet-stat-group (width < ${width}) {`;
  const at = sheet.indexOf(head);
  expect(at, head).toBeGreaterThan(-1);
  const next = sheet.indexOf('\n}\n', at);
  return sheet.slice(at + head.length, next);
}

test('flush gives up the surface, the edge and the corner, and so does a row in a card', () => {
  // Six settings pages put a row in a card without `flush` and drew a box
  // inside a box; a row that is a card's content, or its body's, is flush by
  // where it stands, through the same declarations.
  const rule = ruleFor([
    '.crewlet-stat-group--flush',
    '.crewlet-card > .crewlet-stat-group',
    '.crewlet-card__body > .crewlet-stat-group',
  ]);
  expect(rule).toMatch(/^\s*background:\s*transparent;\s*border:\s*0;\s*border-radius:\s*var\(--radius-none\);\s*$/);
});

test('names its column count for the stylesheet as well as the property', () => {
  const { container } = render(
    <StatGroup columns={3}>
      <StatCard label="Live" value="3" />
    </StatGroup>,
  );
  expect(row(container).getAttribute('data-columns')).toBe('3');
  expect(row(container).style.getPropertyValue('--crewlet-stat-group-cols')).toBe('3');
});

test('folds by its own width, never the window', () => {
  // At a 1024px window a four-column row beside the rail and a settings
  // column was 489px wide and cut its figures, because the fold was a
  // viewport media query. The row is a size container now.
  expect(sheet).not.toMatch(/@media/);
  const base = ruleFor(['.crewlet-stat-group']);
  expect(base).toMatch(/container:\s*crewlet-stat-group\s*\/\s*inline-size;/);
  expect(base).toMatch(/grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\);/);
  expect(ruleFor(['.crewlet-stat-group > *'])).toMatch(/grid-column:\s*span calc\(12 \/ var\(--crewlet-stat-group-cols, 4\)\);/);

  // Four a row fold to two, so every row is full.
  const four = containerBlock('640px');
  expect(four).toMatch(/\[data-columns='4'\] > \*,[^{]*\{\s*grid-column:\s*span 6;/);
  // Three a row stack, so the third tile is never alone at double width.
  const three = containerBlock('480px');
  expect(three).toMatch(/\[data-columns='3'\] > \*,[^{]*\{\s*grid-column:\s*span 12;/);
  expect(three).toMatch(/\[data-columns='3'\] > :nth-child\(n \+ 2\)/);
});

// A ROW OF TILES SHARES ITS LINES: each tile is a subgrid over as many rows as
// it renders lines, so the span in the stylesheet and the lines StatCard draws
// have to agree. The count is read off rendered tiles, an absent sub and a
// hidden label included, rather than restated.
test('every tile in a row takes its lines from the row, one row per line it draws', () => {
  const { container } = render(
    <StatGroup columns={3}>
      <StatCard label="Live nodes" value={1} sub="holding an unexpired lease" />
      <StatCard label="Behind on config" value={0} />
      <StatCard label="Unplaceable" value={0} hideLabel />
    </StatGroup>,
  );
  const tiles = [...container.querySelectorAll('.crewlet-statcard')];
  const lines = new Set(tiles.map((tile) => tile.children.length));
  expect([...lines]).toHaveLength(1);
  const [count] = [...lines];
  const bare = sheet.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = [...bare.matchAll(/\.crewlet-stat-group > \.crewlet-statcard \{([^}]*)\}/g)]
    .map((block) => block[1] ?? '')
    .find((block) => block.includes('subgrid')) ?? '';
  expect(rule).toMatch(/display:\s*grid;/);
  expect(rule).toMatch(/grid-template-rows:\s*subgrid;/);
  expect(rule).toMatch(new RegExp(`grid-row:\\s*span ${count};`));
  // A label sits on its number.
  expect(bare).toMatch(/\.crewlet-stat-group > \.crewlet-statcard > \.crewlet-statcard__label \{\s*align-self: end;/);
});
