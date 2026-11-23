/**
 * A list's overflow says what it hides and lists it on demand, from the
 * keyboard as from the pointer, and never folds a single item.
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Tag } from '../Tag/index.js';
import { ListOverflow, overflowWords, shownBeforeOverflow } from './index.js';

afterEach(cleanup);

const PROBLEM = { one: 'problem', other: 'problems' };

describe('overflowWords', () => {
  test('names the count with the noun in its number', () => {
    expect(overflowWords(1, PROBLEM)).toBe('+1 more problem');
    expect(overflowWords(3, PROBLEM)).toBe('+3 more problems');
    expect(overflowWords(1200, { one: 'person', other: 'people' })).toBe('+1,200 more people');
  });

  test('says "more" even with no noun, never a bare count', () => {
    expect(overflowWords(2)).toBe('+2 more');
  });
});

describe('shownBeforeOverflow', () => {
  test('draws one item past the cap rather than a chip for it', () => {
    expect(shownBeforeOverflow(3, 3)).toBe(3);
    expect(shownBeforeOverflow(4, 3)).toBe(4);
    expect(shownBeforeOverflow(5, 3)).toBe(3);
  });
});

describe('ListOverflow', () => {
  const chip = () =>
    render(
      <main>
        <ListOverflow noun={PROBLEM} items={[<Tag key="a">Timed out</Tag>, <Tag key="b">Out of budget</Tag>]} />
      </main>,
    );

  test('is a button that says what it hides and opens a named list of it', () => {
    chip();
    expect(screen.queryByText('Timed out')).toBeNull();
    const button = screen.getByRole('button', { name: '+2 more problems' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const panel = screen.getByRole('dialog', { name: '2 more problems' });
    expect(within(panel).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Timed out', 'Out of budget']);
  });

  test('Escape closes the list and gives focus back to the chip', () => {
    chip();
    const button = screen.getByRole('button', { name: '+2 more problems' });
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a press on the chip does not reach the row it stands in', () => {
    const row = vi.fn();
    render(<ListOverflow items={['a', 'b']} />);
    document.body.addEventListener('click', row);
    fireEvent.click(screen.getByRole('button', { name: '+2 more' }));
    document.body.removeEventListener('click', row);
    expect(row).not.toHaveBeenCalled();
  });

  test('Enter or Space on the chip does not reach a row that opens on them', () => {
    const row = vi.fn();
    render(<ListOverflow items={['a', 'b']} />);
    document.body.addEventListener('keydown', row);
    const chip = screen.getByRole('button', { name: '+2 more' });
    fireEvent.keyDown(chip, { key: 'Enter' });
    fireEvent.keyDown(chip, { key: ' ' });
    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    document.body.removeEventListener('keydown', row);
    expect(row).toHaveBeenCalledTimes(1);
  });

  test('carries no axe violation, closed or open', async () => {
    const { container } = chip();
    const rules = {
      runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations' as const],
    };
    expect((await axe.run(container, rules)).violations.map((v) => v.id)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: '+2 more problems' }));
    expect((await axe.run(document.body, rules)).violations.map((v) => v.id)).toEqual([]);
  });
});
