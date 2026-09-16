/**
 * What the layout primitives promise, which is mostly about what they do NOT
 * do: they spend no pixel of their own, and they add nothing to the
 * accessibility tree.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { AutoGrid, Inline, Spacer, Stack } from './index.js';

afterEach(cleanup);

test('a gap is a step on the scale and never an inline length', () => {
  // A pixel count computed here would be frozen into the markup: a density
  // change redefines --spacing-3, and a Stack rendered before it would keep
  // the old distance for the life of the page. It would also need a style
  // attribute, which a strict Content-Security-Policy refuses.
  render(
    <Stack gap={3} data-testid="stack">
      <span>one</span>
    </Stack>,
  );
  const stack = screen.getByTestId('stack');
  expect(stack.className).toContain('crewlet-layout--gap-3');
  expect(stack.getAttribute('style')).toBeNull();
});

test('no gap prop leaves the stylesheet default in place', () => {
  render(<Stack data-testid="stack">rows</Stack>);
  expect(screen.getByTestId('stack').className).not.toContain('crewlet-layout--gap');
});

test('a spacer is decoration and is never announced', () => {
  render(
    <Inline data-testid="row">
      <button>Undo</button>
      <Spacer />
      <button>Save</button>
    </Inline>,
  );
  const spacer = screen.getByTestId('row').querySelector('.crewlet-spacer');
  expect(spacer?.getAttribute('aria-hidden')).toBe('true');
  expect(spacer?.textContent).toBe('');
});

test('a layout draws the element it is asked for, so a list stays a list', () => {
  render(
    <Stack as="ul" gap={1}>
      <li>one</li>
      <li>two</li>
    </Stack>,
  );
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByRole('list').className).toContain('crewlet-stack');
});

test('alignment and wrapping are classes rather than inline styles', () => {
  render(
    <Inline align="start" justify="between" wrap data-testid="row">
      <span>a</span>
    </Inline>,
  );
  const row = screen.getByTestId('row');
  expect(row.className).toContain('crewlet-layout--align-start');
  expect(row.className).toContain('crewlet-layout--justify-between');
  expect(row.className).toContain('crewlet-layout--wrap');
  expect(row.getAttribute('style')).toBeNull();
});

test('an auto grid names its track step and carries its own gap default', () => {
  render(<AutoGrid min="sm" data-testid="grid">cards</AutoGrid>);
  const grid = screen.getByTestId('grid');
  expect(grid.className).toContain('crewlet-auto-grid--sm');
  expect(grid.className).toContain('crewlet-layout--gap-4');
});

/**
 * The grid's two rules, both of which are about a row that is not full.
 *
 * `auto-fit` COLLAPSES the tracks nothing was placed in, so a list one card
 * short of a full row stretches its cards over the empty ones: one seat in a
 * company drew a single card the whole width of the pane where its neighbours
 * in a full row are 365px. `auto-fill` keeps them.
 *
 * And a container and a --gap-N modifier are both ONE class, so the later rule
 * in the file wins outright. The grid declared its own default below the
 * modifiers and `<AutoGrid gap={3}>` drew 16px, with the caller's step in the
 * class list and doing nothing.
 */
test('a card grid keeps the tracks a short row does not fill, and honours a gap step', () => {
  // Comments stripped: this file explains what `auto-fit` did, and a match
  // against the prose would pass or fail on the explanation rather than on a
  // declaration.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Layout.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const tracks = [...css.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((rule) => rule[1] ?? '');
  expect(tracks).toHaveLength(1);
  expect(tracks[0]).toContain('auto-fill');
  expect(css).not.toContain('auto-fit');

  const container = css.indexOf('.crewlet-auto-grid {');
  const modifier = css.indexOf('.crewlet-layout--gap-0 {');
  expect(container).toBeGreaterThan(-1);
  expect(modifier).toBeGreaterThan(-1);
  expect(container).toBeLessThan(modifier);
});
