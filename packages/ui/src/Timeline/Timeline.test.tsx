/**
 * A ledger that only grows at the end, and never redraws what is already
 * there.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Timeline } from './index.js';

afterEach(cleanup);

function rounds(count: number) {
  return (
    <Timeline itemLabel="Round">
      {Array.from({ length: count }, (_, index) => (
        <Timeline.Item key={index} state={index === count - 1 ? 'active' : 'default'}>
          round {index + 1} said something
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

test('appending an item moves no earlier one', () => {
  // The rail used to be drawn with `:not(:last-child)`, so appending a round
  // changed the APPEARANCE of the round before it: the previously last one
  // suddenly grew a bracket. Every item carries its own rail, on every render.
  const { container, rerender } = render(rounds(2));
  const before = [...container.querySelectorAll('.crewlet-timeline__item')].map((item) => ({
    className: item.className,
    rails: item.querySelectorAll('.crewlet-timeline__rail').length,
    node: item.querySelector('.crewlet-timeline__node')?.textContent,
  }));

  rerender(rounds(3));
  const after = [...container.querySelectorAll('.crewlet-timeline__item')].map((item) => ({
    className: item.className,
    rails: item.querySelectorAll('.crewlet-timeline__rail').length,
    node: item.querySelector('.crewlet-timeline__node')?.textContent,
  }));

  expect(after).toHaveLength(3);
  expect(after.slice(0, 1)).toEqual(before.slice(0, 1));
  // Every item has a rail, the last one included: a ledger of ONE step is the
  // common case, and it used to get no bracket at all.
  expect(after.every((item) => item.rails === 1)).toBe(true);
});

test('the number is drawn once and read once', () => {
  render(rounds(3));
  // The drawn number is decoration beside the spoken label; a reader handed
  // both hears "3 Round 3".
  expect(screen.getByText('Round 3')).toBeDefined();
  const node = screen.getByText('Round 3').closest('.crewlet-timeline__item')?.querySelector('.crewlet-timeline__node');
  expect(node?.getAttribute('aria-hidden')).toBe('true');
  expect(node?.textContent).toBe('3');
});

test('it is an ordered list, because the order is the meaning', () => {
  const { container } = render(rounds(2));
  expect(container.querySelector('ol')).not.toBeNull();
  expect(container.querySelectorAll('li')).toHaveLength(2);
});

test('a marker replaces the number where the step has an identity of its own', () => {
  render(
    <Timeline itemLabel="Step">
      <Timeline.Item marker={<span>A</span>} label="Plan">
        body
      </Timeline.Item>
    </Timeline>,
  );
  expect(screen.getByText('A')).toBeDefined();
  expect(screen.getByText('Plan')).toBeDefined();
});

test('an item outside a Timeline says so rather than drawing a wrong number', () => {
  expect(() => render(<Timeline.Item>orphan</Timeline.Item>)).toThrow(/inside a Timeline/);
});
