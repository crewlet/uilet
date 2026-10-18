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

test('flush gives up the surface, the edge and the corner', () => {
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'StatGroup.css'), 'utf8');
  expect(sheet).toMatch(
    /\.crewlet-stat-group--flush\s*\{\s*background:\s*transparent;\s*border:\s*0;\s*border-radius:\s*var\(--radius-none\);\s*\}/,
  );
});
