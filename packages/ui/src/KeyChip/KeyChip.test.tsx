/**
 * A project's key as a chip: the key's own text, bold where a search matched.
 */

import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { KeyChip } from './index.js';
import { findMatch } from '../utils/highlight.js';

afterEach(cleanup);

test('draws the key as text in the chip, with no role of its own', () => {
  const { container } = render(<KeyChip>FAIR</KeyChip>);
  const chip = container.querySelector('.crewlet-key-chip')!;
  expect(chip.textContent).toBe('FAIR');
  expect(chip.getAttribute('role')).toBeNull();
  expect(chip.querySelector('b')).toBeNull();
});

test('a search bolds the start of the key first, then anywhere in it', () => {
  const { container, rerender } = render(<KeyChip highlight="sp">SPLIT</KeyChip>);
  expect(container.querySelector('.crewlet-key-chip__match')!.textContent).toBe('SP');
  rerender(<KeyChip highlight="li">SPLIT</KeyChip>);
  expect(container.querySelector('.crewlet-key-chip__match')!.textContent).toBe('LI');
  // The words are unchanged, so a screen reader reads the key itself.
  expect(container.querySelector('.crewlet-key-chip')!.textContent).toBe('SPLIT');
  rerender(<KeyChip highlight="zz">SPLIT</KeyChip>);
  expect(container.querySelector('.crewlet-key-chip__match')).toBeNull();
});

test('a word match prefers the start of a word to a letter inside one', () => {
  expect(findMatch('Receipt scanning', 's', 'word')).toEqual([8, 9]);
  expect(findMatch('Split engine', 'eng', 'word')).toEqual([6, 9]);
  expect(findMatch('Settle up', 'tl', 'word')).toEqual([3, 5]);
  expect(findMatch('Settle up', '', 'word')).toBeNull();
});

test('passes axe', async () => {
  const { container } = render(
    <p>
      <KeyChip highlight="fa">FAIR</KeyChip> Product and Engineering
    </p>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
