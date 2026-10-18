/**
 * A list a reader puts in order and switches items on and off in: a named
 * handle per item, Move up and Move down beside it, ends that say why rather
 * than going dead, and a toggle that can refuse with a reason.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { ArrangeList, type ArrangeItem } from './index.js';

afterEach(cleanup);

const ITEMS: ArrangeItem[] = [
  { key: 'figures', label: 'Figures', description: 'Agents working and tokens.', shown: true },
  { key: 'live', label: 'Live now', shown: true },
  { key: 'feed', label: 'Recent activity', shown: false },
];

function Arranged({
  initial = ITEMS,
  toggle,
  onReorder,
  onShownChange,
}: {
  initial?: ArrangeItem[];
  toggle?: 'switch' | 'checkbox';
  onReorder?: (keys: string[]) => void;
  onShownChange?: (key: string, shown: boolean) => void;
}) {
  const [items, setItems] = useState(initial);
  return (
    <>
      <Announcer />
      <ArrangeList
        label="Sections on Home"
        toggle={toggle}
        items={items}
        onReorder={(keys) => {
          setItems(keys.map((k) => items.find((i) => i.key === k)!));
          onReorder?.(keys);
        }}
        onShownChange={(key, shown) => {
          setItems(items.map((i) => (i.key === key ? { ...i, shown } : i)));
          onShownChange?.(key, shown);
        }}
      />
    </>
  );
}

const labels = () =>
  screen
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.crewlet-switch__label, .crewlet-checkbox__label, label')?.textContent);

test('the list is named, and every item has a handle named for it', () => {
  render(<Arranged />);
  expect(screen.getByRole('list', { name: 'Sections on Home' })).toBeTruthy();
  for (const name of ['Figures', 'Live now', 'Recent activity']) {
    expect(screen.getByRole('button', { name: `Move ${name}` })).toBeTruthy();
  }
});

test('Move down moves an item one place, reports the order and says so', () => {
  const onReorder = vi.fn();
  render(<Arranged onReorder={onReorder} />);
  fireEvent.click(screen.getByRole('button', { name: 'Move Figures down' }));
  expect(onReorder).toHaveBeenCalledWith(['live', 'figures', 'feed']);
  expect(screen.getByRole('status').textContent).toBe('Figures moved to position 2 of 3.');
});

test('the arrow keys on a handle move its item', () => {
  const onReorder = vi.fn();
  render(<Arranged onReorder={onReorder} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Move Recent activity' }), { key: 'ArrowUp' });
  expect(onReorder).toHaveBeenCalledWith(['figures', 'feed', 'live']);
});

test('the ends stay reachable and say why they move nothing', () => {
  const onReorder = vi.fn();
  render(<Arranged onReorder={onReorder} />);
  const up = screen.getByRole('button', { name: 'Move Figures up' });
  const down = screen.getByRole('button', { name: 'Move Recent activity down' });
  expect(up.getAttribute('aria-disabled')).toBe('true');
  expect(down.getAttribute('aria-disabled')).toBe('true');
  expect(up.hasAttribute('disabled')).toBe(false);
  expect(document.getElementById(up.getAttribute('aria-describedby')!)?.textContent).toBe('Figures is first.');
  fireEvent.click(up);
  fireEvent.click(down);
  expect(onReorder).not.toHaveBeenCalled();
});

test('the toggle switches an item off and on, and an item off keeps its place', () => {
  const onShownChange = vi.fn();
  render(<Arranged onShownChange={onShownChange} />);
  fireEvent.click(screen.getByRole('switch', { name: /Live now/ }));
  expect(onShownChange).toHaveBeenCalledWith('live', false);
  const live = screen.getByRole('button', { name: 'Move Live now' }).closest('li')!;
  expect(live.classList.contains('is-off')).toBe(true);
  expect(screen.getAllByRole('listitem').indexOf(live)).toBe(1);
  fireEvent.click(screen.getByRole('switch', { name: /Recent activity/ }));
  expect(onShownChange).toHaveBeenLastCalledWith('feed', true);
});

test('a fixed item refuses to turn off and says why', () => {
  const onShownChange = vi.fn();
  render(
    <Arranged
      initial={ITEMS.map((i, n) => (n === 0 ? { ...i, fixed: 'At least one section stays.' } : i))}
      onShownChange={onShownChange}
    />,
  );
  const toggle = screen.getByRole('switch', { name: /Figures/ });
  expect(toggle.getAttribute('aria-disabled')).toBe('true');
  expect(toggle.hasAttribute('disabled')).toBe(false);
  expect(screen.getByText('At least one section stays.')).toBeTruthy();
  fireEvent.click(toggle);
  expect(onShownChange).not.toHaveBeenCalled();
});

test('checkbox mode draws ticks rather than switches', () => {
  render(<Arranged toggle="checkbox" />);
  expect(screen.queryAllByRole('switch')).toHaveLength(0);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  expect(labels()).toHaveLength(3);
});

test('passes axe', async () => {
  const { container } = render(<Arranged />);
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
