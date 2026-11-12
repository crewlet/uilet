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

test('a disc is one entry: round, with a vendor mark on its corner and a dashed edge while unconfirmed', () => {
  const { container, rerender } = render(
    <IconTile shape="disc" tone="neutral" mark={<svg data-mark />}>
      x
    </IconTile>,
  );
  const tile = container.querySelector('.crewlet-icon-tile')!;
  expect(tile.classList.contains('crewlet-icon-tile--disc')).toBe(true);
  expect(tile.querySelector('.crewlet-icon-tile__mark [data-mark]')).not.toBeNull();
  expect(tile.hasAttribute('data-dashed')).toBe(false);
  // A quiet entry draws no badge at all: the absence of one is the state.
  expect(tile.querySelector('.crewlet-icon-tile__badge')).toBeNull();
  rerender(
    <IconTile shape="disc" dashed>
      x
    </IconTile>,
  );
  expect(container.querySelector('.crewlet-icon-tile')!.hasAttribute('data-dashed')).toBe(true);
  expect(container.querySelector('.crewlet-icon-tile__mark')).toBeNull();
});

test('a status is a ring in its tone and a badge with a glyph, never colour alone, and stays unannounced', () => {
  const { container, rerender } = render(
    <IconTile shape="disc" status={{ tone: 'danger' }}>
      x
    </IconTile>,
  );
  const tile = container.querySelector('.crewlet-icon-tile')!;
  expect(tile.getAttribute('data-status')).toBe('danger');
  expect(tile.querySelector('.crewlet-icon-tile__badge svg')).not.toBeNull();
  // The word is said beside the tile: the tile itself stays out of the reading order.
  expect(tile.getAttribute('aria-hidden')).toBe('true');
  rerender(
    <IconTile status={{ tone: 'warning', glyph: <i data-own /> }}>
      x
    </IconTile>,
  );
  expect(container.querySelector('.crewlet-icon-tile__badge [data-own]')).not.toBeNull();
  expect(container.querySelector('.crewlet-icon-tile')!.getAttribute('data-status')).toBe('warning');
});
