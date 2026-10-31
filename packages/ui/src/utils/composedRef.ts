/**
 * One ref for an element several owners need: a component that clones its
 * trigger (a tooltip, a popover) and the ref the trigger already carried.
 *
 * STABLE WHILE THE REFS IT JOINS ARE. A ref callback written inline is a new
 * function on every render, and React treats a new ref as a change: it
 * releases the old one in the commit's mutation phase and attaches the new
 * one in its layout phase, in tree order. So every render of the component
 * that cloned the trigger set the trigger's own ref to null and back, and a
 * layout effect EARLIER in the tree (a dock handing focus to that very
 * control as it closes) read null while the element stood in the document.
 * Memoised on the refs it joins, the joined ref changes only when one of
 * them does, which is exactly when React would have moved a ref of its own.
 */

import { useCallback, type Ref, type RefCallback, type RefObject } from 'react';

/**
 * Hands `element` to one ref, and returns how to take it back, the way React
 * would have released that ref itself: a callback that returns its own
 * teardown gets the teardown called, any other callback is called with null,
 * and an object's `current` is emptied.
 */
export function attachRef<T>(ref: Ref<T> | undefined, element: T | null): () => void {
  if (typeof ref === 'function') {
    const release = ref(element);
    return typeof release === 'function' ? release : () => void ref(null);
  }
  if (!ref) return () => {};
  const box = ref as RefObject<T | null>;
  box.current = element;
  return () => {
    box.current = null;
  };
}

/**
 * A ref callback that hands the element to every ref given and releases each
 * as React would, stable for as long as each ref given is the same.
 */
export function useComposedRef<T>(
  first: Ref<T> | undefined,
  second?: Ref<T> | undefined,
  third?: Ref<T> | undefined,
  fourth?: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      const releases = [first, second, third, fourth].map((ref) => attachRef(ref, element));
      return () => {
        for (const release of releases) release();
      };
    },
    [first, second, third, fourth],
  );
}
