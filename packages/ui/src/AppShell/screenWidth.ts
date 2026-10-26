/**
 * The SCREEN'S width: the content column the shell draws a screen in, which is
 * what a screen's layout has to fit, rather than the window's.
 *
 * WHY NOT THE WINDOW. The window reports what the frame takes from it only
 * while that never changes. The rail is a fixed share, but an aside the reader
 * opens (the assistant) and drags wider takes width the window never reports:
 * at a 1375px window with a 640px aside the screen is 443px wide while a
 * media query still answers "desktop". A split screen that asks the window
 * keeps its two columns and draws its reading pane 130px wide. Stylesheets
 * already answer this with a container query on the content column; this is
 * the same answer for the decisions a stylesheet cannot make, such as which
 * pane a screen renders or whether it fills the window.
 *
 * ONE MEASUREMENT FOR EVERY CONSUMER. The shell measures its content column
 * once and publishes the width through a store, so twenty screens asking do
 * not attach twenty observers, and every one of them reads the same number in
 * the same frame.
 *
 * RE-RENDERS ON A CROSSING, NOT ON A PIXEL. [useScreenBelow] subscribes to the
 * answer to its own question, so dragging the aside re-renders a screen only
 * when the screen crosses that screen's threshold.
 *
 * OUTSIDE A SHELL IT IS THE WINDOW. A primitive drawn in a story, a test or an
 * application without the shell still gets an answer: the window's, through
 * the same media query it would have asked before. The first render inside a
 * shell answers the same way, and the shell's measurement replaces it in a
 * layout effect, before anything is painted.
 */

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import { useMediaMatch } from '../MediaMatch/index.js';

/** Where the shell keeps the content column's width, and who listens. */
export interface ScreenWidthStore {
  /** The content column's inner width in px, or null before it is measured. */
  get(): number | null;
  /** Record a new width, telling every listener when it changed. */
  set(width: number | null): void;
  subscribe(listener: () => void): () => void;
}

/** A store for one shell's content column. */
export function createScreenWidthStore(): ScreenWidthStore {
  let width: number | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => width,
    set(next) {
      if (next === width) return;
      width = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const ScreenWidthContext = createContext<ScreenWidthStore | null>(null);

const noSubscription = () => () => {};

/**
 * The width of an element's content box: its client width less its inline
 * padding, which is what a container query on it measures.
 *
 * NULL FOR AN ELEMENT WITH NO BOX (hidden, detached, or a document without
 * layout such as a test's): a width of zero there is not a measurement, and
 * answering "narrower than everything" would fold every screen. The window's
 * answer stands instead.
 */
export function contentInlineSize(element: HTMLElement): number | null {
  if (element.getClientRects().length === 0) return null;
  const style = getComputedStyle(element);
  const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
  return Math.max(0, Math.round(element.clientWidth - padding));
}

/**
 * The width of the screen's content column in px, re-read whenever it
 * changes; null outside a shell, or before the shell has measured it.
 */
export function useScreenWidth(): number | null {
  const store = useContext(ScreenWidthContext);
  return useSyncExternalStore(
    store ? store.subscribe : noSubscription,
    () => (store ? store.get() : null),
    () => null,
  );
}

/**
 * Whether the screen's content column is narrower than `width` px: the
 * question a screen asks before it chooses its narrow shape. Inside a shell it
 * is answered from the shell's measured content column, so an aside the
 * reader opens or drags counts; outside one, by the window, exactly as
 * `useMediaMatch(`(width < ${width}px)`)` would.
 *
 * STRICTLY UNDER, like the stylesheets' `(width < 640px)`: at exactly the
 * threshold the wide shape fits.
 */
export function useScreenBelow(width: number): boolean {
  const store = useContext(ScreenWidthContext);
  const window = useMediaMatch(`(width < ${width}px)`);
  const read = useCallback((): boolean | null => {
    const measured = store ? store.get() : null;
    return measured === null ? null : measured < width;
  }, [store, width]);
  const measured = useSyncExternalStore(store ? store.subscribe : noSubscription, read, () => null);
  return measured ?? window;
}
