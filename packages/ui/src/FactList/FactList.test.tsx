/**
 * Read-only facts as one-line rows: the label with its value, and the reason a
 * fact is locked said on hover, on focus and to a screen reader, never as a
 * caption under every row.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { FactList } from './index.js';

afterEach(cleanup);

const ITEMS = [
  { key: 'handle', label: 'Handle', value: 'engineer', reason: 'An existing seat keeps its handle.' },
  { key: 'placement', label: 'Placement', value: 'Any node' },
];

test('is a description list, each label with its value', () => {
  const { container } = render(<FactList items={ITEMS} label="Seat facts" />);
  const list = container.querySelector('dl')!;
  expect(list.getAttribute('aria-label')).toBe('Seat facts');
  expect([...list.querySelectorAll('dt')].map((t) => t.textContent)).toEqual(['Handle', 'Placement']);
  expect([...list.querySelectorAll('dd')].map((d) => d.firstChild?.textContent)).toEqual(['engineer', 'Any node']);
});

test('a locked row carries a lock and its reason, read after the value; a plain one does neither', () => {
  const { container } = render(<FactList items={ITEMS} />);
  const [locked, plain] = [...container.querySelectorAll('.crewlet-fact-list__row')] as HTMLElement[];
  expect(locked!.querySelector('.crewlet-fact-list__lock')).not.toBeNull();
  expect(locked!.querySelector('dd')!.textContent).toBe('engineer, An existing seat keeps its handle.');
  expect(plain!.querySelector('.crewlet-fact-list__lock')).toBeNull();
  expect(plain!.querySelector('dd')!.textContent).toBe('Any node');
});

test('the reason opens as a tooltip when the pointer rests on the row, and is never a caption at rest', () => {
  vi.useFakeTimers();
  try {
    const { container } = render(<FactList items={ITEMS} />);
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    fireEvent.pointerEnter(container.querySelector('.crewlet-fact-list__row.is-locked')!);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('tooltip').textContent).toBe('An existing seat keeps its handle.');
  } finally {
    vi.useRealTimers();
  }
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Seat</h1>
      <FactList items={ITEMS} label="Seat facts" />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
