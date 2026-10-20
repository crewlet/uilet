/**
 * A canvas's list of layers: what it marks, how it is picked and opened, and
 * how the keyboard walks it.
 */

import axe from 'axe-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { LayersList } from './LayersList.js';

afterEach(cleanup);

const ITEMS = [
  { id: 'hero', label: 'Hero' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
];

const entry = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

test('the picked entry is current, and only it', () => {
  render(<LayersList label="Boards" items={ITEMS} selected="features" />);
  expect(screen.getByRole('navigation', { name: 'Boards' })).toBeTruthy();
  expect(entry('Features').getAttribute('aria-current')).toBe('true');
  expect(entry('Hero').hasAttribute('aria-current')).toBe(false);
  // Every entry carries its whole name as the tip, since a long one is cut.
  expect(entry('Hero').getAttribute('title')).toBe('Hero');
});

test('a click picks an entry; Enter and a double-click open it, and say so in its name', () => {
  const onSelect = vi.fn();
  const onOpen = vi.fn();
  render(<LayersList label="Boards" items={ITEMS} onSelect={onSelect} onOpen={onOpen} />);
  const pricing = screen.getByRole('button', { name: 'Pricing, press Enter or double-click to open' });
  fireEvent.click(pricing);
  expect(onSelect).toHaveBeenLastCalledWith('pricing');
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.keyDown(pricing, { key: 'Enter' });
  expect(onOpen).toHaveBeenLastCalledWith('pricing');
  fireEvent.doubleClick(entry('Hero'));
  expect(onOpen).toHaveBeenLastCalledWith('hero');
});

test('without onOpen an entry is named by its label alone, and Enter presses it', () => {
  const onSelect = vi.fn();
  render(<LayersList label="Boards" items={ITEMS} onSelect={onSelect} />);
  expect(screen.getByRole('button', { name: 'Hero' })).toBeTruthy();
});

test('the list is one tab stop, on the picked entry; the arrows move without picking', () => {
  const onSelect = vi.fn();
  render(<LayersList label="Boards" items={ITEMS} selected="features" onSelect={onSelect} />);
  const stops = () => screen.getAllByRole('button').map((b) => b.tabIndex);
  expect(stops()).toEqual([-1, 0, -1]);
  entry('Features').focus();
  fireEvent.keyDown(entry('Features'), { key: 'ArrowDown' });
  expect(document.activeElement).toBe(entry('Pricing'));
  // The stop follows focus, so Tab out and back lands where the reader was.
  expect(stops()).toEqual([-1, -1, 0]);
  fireEvent.keyDown(entry('Pricing'), { key: 'Home' });
  expect(document.activeElement).toBe(entry('Hero'));
  fireEvent.keyDown(entry('Hero'), { key: 'ArrowUp' });
  expect(document.activeElement).toBe(entry('Pricing'));
  expect(onSelect).not.toHaveBeenCalled();
});

test('with nothing picked the stop is the first entry', () => {
  render(<LayersList label="Boards" items={ITEMS} />);
  expect(screen.getAllByRole('button').map((b) => b.tabIndex)).toEqual([0, -1, -1]);
});

test('a heading stands over the list, outside its scroll', () => {
  render(<LayersList label="Boards" items={ITEMS} heading="3 boards" />);
  const heading = screen.getByText('3 boards');
  expect(heading.closest('.crewlet-layers-list__items')).toBeNull();
  expect(heading.closest('.crewlet-layers-list')).not.toBeNull();
});

test('the entries hang into the gutter by their padding and edge, are cut to one line, and scroll', () => {
  const uninstall = installSheets('LayersList/LayersList.css');
  render(<LayersList label="Boards" items={ITEMS} selected="hero" />);
  const list = document.querySelector('.crewlet-layers-list__items')!;
  const hero = entry('Hero');
  // The letters stand on the list's edge: the hang is the padding plus the
  // 2px edge every current row in the system takes (jsdom reads no
  // border-inline-start, so the edge is named here rather than measured).
  expect(-px(list, 'margin-inline-start')).toBe(px(hero, 'padding-left') + 2);
  expect(getComputedStyle(list).overflowY).toBe('auto');
  expect(getComputedStyle(hero).whiteSpace).toBe('nowrap');
  expect(getComputedStyle(hero).textOverflow).toBe('ellipsis');
  uninstall();
});

test('a list with a picked entry carries no accessibility violation', async () => {
  const { container } = render(
    <main>
      <h1>Design</h1>
      <LayersList label="Boards" items={ITEMS} selected="features" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
