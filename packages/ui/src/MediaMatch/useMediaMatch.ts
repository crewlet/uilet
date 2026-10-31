import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches now, and again whenever that changes.
 *
 * ONE COPY FOR EVERY CONSUMER. The shell reads it to decide where its rail
 * goes, the switcher whether it opens as a sheet, and an application the one
 * layout decision a stylesheet cannot make (which element a phone draws, not
 * how it is styled); two copies of the subscription would be two answers to
 * "is this a phone" that can disagree for a frame while a window is resized.
 * Anything a media query in a stylesheet CAN decide belongs there instead: a
 * width written in both places is a width that can disagree with itself.
 *
 * READ DURING RENDER, through `useSyncExternalStore`, so the first render
 * already has the answer: a layout decided in an effect paints the wrong
 * shape for a frame and then moves.
 *
 * On the server, and in a browser without `matchMedia`, the answer is `false`:
 * the wide layout is the one that needs no JavaScript to be usable.
 */
export function useMediaMatch(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  const read = useCallback(
    () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    [query],
  );
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * The reader's request for less motion: the one spelling of the query every
 * component asks, through `useMediaMatch` during render and through
 * `prefersReducedMotion` outside it. A copy of the string is a copy that can
 * drift, and a query spelt one character off never matches.
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the reader has asked for less motion, read once, for code outside a
 * render: a scroll, a timer's length. `view` is the window the element lives
 * in (`ownerDocument.defaultView`), the page's own by default. False on the
 * server and wherever `matchMedia` is missing, as `useMediaMatch` answers.
 */
export function prefersReducedMotion(view: Window | null = typeof window === 'undefined' ? null : window): boolean {
  return view?.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}
