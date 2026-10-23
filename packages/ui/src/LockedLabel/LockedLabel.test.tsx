/**
 * LockedLabel: the words stay, the key says closed, the reason is said.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { LockedLabel } from './index.js';

afterEach(cleanup);

test('draws the words alone where nothing is missing', () => {
  const { container } = render(<LockedLabel>Nodes</LockedLabel>);
  expect(container.innerHTML).toBe('Nodes');
});

test('a locked place keeps its words, draws the key and says why', () => {
  const { container } = render(<LockedLabel reason="Needs Admin access">Nodes</LockedLabel>);
  const label = container.querySelector('.crewlet-locked-label')!;
  expect(label.getAttribute('title')).toBe('Needs Admin access');
  expect(label.textContent).toBe('Nodes, Needs Admin access');
  // The key is decoration: the sentence after the words carries the meaning.
  expect(label.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByText(', Needs Admin access').classList.contains('crewlet-visually-hidden')).toBe(true);
});
