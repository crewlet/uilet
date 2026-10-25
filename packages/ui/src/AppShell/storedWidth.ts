/**
 * A width the reader dragged a panel to, kept per browser.
 *
 * NULL WHERE THEY NEVER DRAGGED ONE, rather than a default: the resting width
 * is the host's (a canvas may rest a panel narrower than a list does), and a
 * preference that answered with a default when nothing was stored would read
 * as a reader who chose it.
 *
 * WHAT IS STORED IS A NUMBER AND NOTHING ELSE. A stored value is read back
 * only when it is a finite number inside the bounds, so a value another
 * build wrote, a hand-edited one, or one outside today's bounds is ignored
 * rather than trusted. Storage that cannot be read or written (a private
 * window, a blocked origin, a full quota) leaves the width working for the
 * session: a preference is a convenience, never a reason to draw no panel.
 *
 * The key is the caller's, so an application keeps every storage key it
 * writes in one registry of its own.
 */

import { useCallback, useState } from 'react';
import { clampSize } from './ResizeHandle.js';

/** The part of `Storage` the hook reads and writes. */
export interface WidthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StoredWidthOptions {
  /** The storage key, from the application's own registry. */
  key: string;
  /** The narrowest width that is kept, in px. */
  min: number;
  /** The widest, in px. */
  max: number;
  /**
   * Where the width is kept. The browser's `localStorage` when left out;
   * `null` keeps it for the session only.
   */
  storage?: WidthStorage | null | undefined;
}

export interface StoredWidth {
  /** The width the reader chose, or null where they never chose one. */
  width: number | null;
  /** Draw a width without keeping it: a drag's every move. */
  setWidth: (px: number) => void;
  /** Draw a width and keep it: where a drag or a key press ends. */
  commitWidth: (px: number) => void;
}

/** The browser's local storage, where reading it does not throw. */
function defaultStorage(): WidthStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // A blocked origin throws on the property itself.
    return null;
  }
}

/** The stored width, when it is one this panel can take; null otherwise. */
export function readStoredWidth(storage: WidthStorage | null, key: string, min: number, max: number): number | null {
  if (!storage) return null;
  try {
    const stored = storage.getItem(key);
    if (stored === null || stored.trim() === '') return null;
    const value = Number(stored);
    return Number.isFinite(value) && value >= min && value <= max ? Math.round(value) : null;
  } catch {
    return null;
  }
}

export function useStoredWidth({ key, min, max, storage }: StoredWidthOptions): StoredWidth {
  const [store] = useState(() => (storage === undefined ? defaultStorage() : storage));
  const [width, setStored] = useState<number | null>(() => readStoredWidth(store, key, min, max));

  const setWidth = useCallback((px: number) => setStored(clampSize(px, min, max)), [min, max]);

  const commitWidth = useCallback(
    (px: number) => {
      const next = clampSize(px, min, max);
      setStored(next);
      if (!store) return;
      try {
        store.setItem(key, String(next));
      } catch {
        // The width still applies for this session.
      }
    },
    [key, min, max, store],
  );

  return { width, setWidth, commitWidth };
}
