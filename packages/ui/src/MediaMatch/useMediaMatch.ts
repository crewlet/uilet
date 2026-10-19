import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches now, and again whenever that changes.
 *
 * ONE COPY FOR THE PACKAGE. The shell reads it to decide where its rail goes
 * and the switcher to decide whether it opens as a sheet; two copies of the
 * subscription would be two answers to "is this a phone" that can disagree for
 * a frame while a window is resized.
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
