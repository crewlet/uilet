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

import { useRef, type Ref, type RefCallback, type RefObject } from 'react';

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
 * One ref callback that hands the element to every ref given and releases
 * each as React would, for code outside a component.
 */
export function composeRefs<T>(...refs: readonly (Ref<T> | undefined)[]): RefCallback<T> {
  return (element: T | null) => {
    const releases = refs.map((ref) => attachRef(ref, element));
    return () => {
      for (const release of releases) release();
    };
  };
}

/** Whether two lists hold the same refs, in the same order. */
function sameRefs<T>(a: readonly (Ref<T> | undefined)[], b: readonly (Ref<T> | undefined)[]): boolean {
  return a.length === b.length && a.every((ref, index) => ref === b[index]);
}

/**
 * `composeRefs` for a component: any number of refs joined into one callback
 * that is THE SAME CALLBACK for as long as the refs given are the same, in the
 * same order, and a new one the render any of them changes.
 *
 * Held in a ref and compared ref by ref rather than memoised on a dependency
 * list, which must be written out, and a list of refs of any length cannot
 * be. Not state: a ref written inline beside the hook is new on every render,
 * and replacing state for it would render again for ever. Here it simply
 * makes a new callback, which is what React does with an inline ref.
 */
export function useComposedRef<T>(...refs: readonly (Ref<T> | undefined)[]): RefCallback<T> {
  const joined = useRef<{ refs: readonly (Ref<T> | undefined)[]; callback: RefCallback<T> } | null>(null);
  if (!joined.current || !sameRefs(joined.current.refs, refs)) {
    joined.current = { refs, callback: composeRefs(...refs) };
  }
  return joined.current.callback;
}
