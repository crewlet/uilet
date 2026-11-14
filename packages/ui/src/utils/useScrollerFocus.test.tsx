/**
 * When a scroller has to be a Tab stop: while it overflows and holds none.
 *
 * jsdom lays nothing out, so an element's content and box sizes are stated on
 * it here (`data-content`, `data-box`) and read back through the two getters a
 * browser would answer from layout.
 */
import { act, cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { useScrollerFocus } from './useScrollerFocus.js';

const size = (name: 'data-content' | 'data-box') =>
  function (this: HTMLElement) {
    return Number(this.getAttribute(name) ?? 0);
  };

let restore: (() => void) | undefined;
beforeEach(() => {
  const scrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!;
  const clientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!;
  Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: size('data-content') });
  Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: size('data-box') });
  restore = () => {
    Object.defineProperty(Element.prototype, 'scrollHeight', scrollHeight);
    Object.defineProperty(Element.prototype, 'clientHeight', clientHeight);
  };
});
afterEach(() => {
  cleanup();
  restore?.();
});

function Scroller({ content, overflow = 'auto', stop = false }: { content: number; overflow?: string; stop?: boolean }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const needed = useScrollerFocus(el);
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the stop under test
    <div ref={setEl} data-testid="scroller" data-content={content} data-box={100} style={{ overflowY: overflow as 'auto' }} tabIndex={needed ? 0 : undefined}>
      <p>Words</p>
      {stop ? <button type="button">Press</button> : null}
    </div>
  );
}

const stopOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-testid='scroller']")!.getAttribute('tabindex');

// Mutation: return true whenever the element scrolls, and a form's body gains a stop that does nothing.
test('a scroller of plain words that overflows is a stop', () => {
  const { container } = render(<Scroller content={400} />);
  expect(stopOf(container)).toBe('0');
});

test('one whose content fits is not', () => {
  const { container } = render(<Scroller content={100} />);
  expect(stopOf(container)).toBeNull();
});

test('one that holds a stop of its own is not: focus moving through it scrolls it', () => {
  const { container } = render(<Scroller content={400} stop />);
  expect(stopOf(container)).toBeNull();
});

test('one that overflows without scrolling is not: there is nothing a key could move', () => {
  const { container } = render(<Scroller content={400} overflow="hidden" />);
  expect(stopOf(container)).toBeNull();
});

test('it is read again when what the scroller holds changes', async () => {
  const { container, rerender } = render(<Scroller content={400} stop />);
  expect(stopOf(container)).toBeNull();
  rerender(<Scroller content={400} />);
  // The mutation observer reports on a microtask.
  await act(async () => {
    await Promise.resolve();
  });
  expect(stopOf(container)).toBe('0');
});
