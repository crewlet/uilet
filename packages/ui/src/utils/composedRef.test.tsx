/**
 * One ref for an element several owners need, stable while they are.
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { createRef, useState, type Ref } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { attachRef, useComposedRef } from './composedRef.js';

afterEach(cleanup);

describe('attachRef', () => {
  test('hands the element to an object and empties it on release', () => {
    const box = createRef<HTMLElement>();
    const element = document.createElement('div');
    const release = attachRef(box, element);
    expect(box.current).toBe(element);
    release();
    expect(box.current).toBeNull();
  });

  test('calls a callback with null on release, or the teardown it returned', () => {
    const element = document.createElement('div');
    const plain = vi.fn();
    attachRef(plain, element)();
    expect(plain.mock.calls).toEqual([[element], [null]]);
    const teardown = vi.fn();
    const owning = vi.fn(() => teardown);
    attachRef(owning, element)();
    expect(owning).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  test('does nothing for no ref', () => {
    expect(() => attachRef(undefined, document.createElement('div'))()).not.toThrow();
  });
});

describe('useComposedRef', () => {
  test('is the same callback while the refs it joins are, so a re-render never moves the element', () => {
    const own = vi.fn();
    const seen: unknown[] = [];
    function Probe({ tick }: { tick: number; owner: Ref<HTMLElement> }) {
      const joined = useComposedRef<HTMLElement>(own);
      seen.push(joined);
      return <span ref={joined}>{tick}</span>;
    }
    const { rerender } = render(<Probe tick={1} owner={own} />);
    rerender(<Probe tick={2} owner={own} />);
    expect(seen[0]).toBe(seen[1]);
    // Handed the element once, and never taken back in between.
    expect(own).toHaveBeenCalledTimes(1);
    expect(own.mock.calls[0]?.[0]).toBeInstanceOf(HTMLSpanElement);
  });

  test('hands the element to every ref it joins, and moves when one of them changes', () => {
    const box = createRef<HTMLElement>();
    const first = vi.fn();
    const second = vi.fn();
    function Probe() {
      const [which, setWhich] = useState<'first' | 'second'>('first');
      const joined = useComposedRef<HTMLElement>(box, which === 'first' ? first : second);
      return (
        <button ref={joined} type="button" onClick={() => setWhich('second')}>
          swap
        </button>
      );
    }
    const { getByRole } = render(<Probe />);
    const button = getByRole('button');
    expect(box.current).toBe(button);
    expect(first).toHaveBeenLastCalledWith(button);
    fireEvent.click(button);
    // As React moves a ref of its own: the old one released, the new one handed the element.
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenLastCalledWith(button);
    expect(box.current).toBe(button);
  });
});
