/**
 * A glyph on a tinted square: decoration, tinted by the hue it is given.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { IconTile } from './index.js';

afterEach(cleanup);

test('is hidden from assistive technology, so the name beside it is what is read', () => {
  const { container } = render(
    <IconTile>
      <svg />
    </IconTile>,
  );
  const tile = container.querySelector('.crewlet-icon-tile')!;
  expect(tile.getAttribute('aria-hidden')).toBe('true');
  expect(tile.querySelector('svg')).not.toBeNull();
});

test('takes the accent and the middle row height when no hue or size is given', () => {
  const { container } = render(<IconTile>x</IconTile>);
  const tile = container.querySelector('.crewlet-icon-tile')!;
  expect(tile.className).toBe('crewlet-icon-tile crewlet-icon-tile--md');
});

test('carries its hue and size as modifiers', () => {
  const { container } = render(
    <IconTile hue="rose" size="lg">
      x
    </IconTile>,
  );
  const tile = container.querySelector('.crewlet-icon-tile')!;
  expect(tile.classList.contains('crewlet-icon-tile--rose')).toBe(true);
  expect(tile.classList.contains('crewlet-icon-tile--lg')).toBe(true);
});

test('a neutral tile is a place rather than a kind: no hue, and a hue wins over the tone', () => {
  const { container, rerender } = render(
    <IconTile tone="neutral">
      <svg />
    </IconTile>,
  );
  expect(container.firstElementChild!.className).toContain('crewlet-icon-tile--neutral');
  rerender(
    <IconTile tone="neutral" hue="rose">
      <svg />
    </IconTile>,
  );
  expect(container.firstElementChild!.className).toContain('crewlet-icon-tile--rose');
  expect(container.firstElementChild!.className).not.toContain('crewlet-icon-tile--neutral');
});
