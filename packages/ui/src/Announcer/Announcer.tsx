import { useCallback, useSyncExternalStore } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * Saying out loud what only the picture changed.
 *
 * WHY IT EXISTS. A list that reorders, a tag that is removed, a copy that
 * reached the clipboard and a canvas node that moved all change the page
 * without moving focus and without any text a screen reader would read on its
 * own. Each place that needed one wrote its own `aria-live` region with its
 * own politeness and its own key, and a region declared ad hoc is a region
 * that is sometimes assertive, sometimes inside the control it describes (so
 * the control's own name becomes "Copied copied to the clipboard"), and
 * sometimes not read at all.
 *
 * THE RULES IT KEEPS.
 *
 * - POLITE, always. An announcement reports what the reader just did; it never
 *   interrupts them mid-sentence.
 * - THE CHILD IS KEYED BY A COUNTER, so the same sentence twice in a row (two
 *   removals of the same tag) is announced twice rather than read as no
 *   change. A region whose text is set to the string it already holds
 *   announces nothing.
 * - A SIBLING, NEVER A CHILD, of the control it describes: an accessible name
 *   is computed from an element's contents, so a status inside a button
 *   becomes part of what the button claims to be.
 * - ONE REGION, mounted once. A component calls `announce` from anywhere
 *   beneath it; the region itself belongs to the shell, and inside a
 *   `LayerHost` where a fullscreen surface would otherwise leave it unpainted.
 */

interface Said {
  text: string;
  /** Bumped on every call, so a repeat of the same words is a new child. */
  n: number;
}

let said: Said = { text: '', n: 0 };
const listeners = new Set<() => void>();
let mounted = 0;

/**
 * A region subscribing. Declared once at module scope rather than inline in
 * the component: `useSyncExternalStore` re-subscribes whenever this function's
 * identity changes, and an arrow written in the render body is a new function
 * every render, so the region would unsubscribe and resubscribe forever.
 */
function subscribe(listener: () => void): () => void {
  mounted += 1;
  listeners.add(listener);
  return () => {
    mounted -= 1;
    listeners.delete(listener);
    /*
     * The last region leaving takes the words with it. Left standing, the next
     * region to mount would come up already holding the previous one's
     * sentence and announce it: a reader who navigated away and back would be
     * told again what they did before they left.
     */
    if (mounted === 0) said = { text: '', n: said.n + 1 };
  };
}

/**
 * Announces `text` in the mounted region.
 *
 * A plain function rather than a hook's closure, so a callback outside React
 * (a store, a socket handler) can use the same one.
 */
export function announce(text: string): void {
  if (text === '') return;
  if (mounted === 0) {
    // Loud rather than silent: an announcement with no region is a promise of
    // accessibility that nothing keeps, and it looks exactly like one that
    // worked.
    console.warn('[crewlet] announce() was called with no <Announcer> mounted, so nothing was said:', text);
    return;
  }
  said = { text, n: said.n + 1 };
  for (const listener of [...listeners]) listener();
}

/** The announcer, for a component that would rather take it as a value. */
export function useAnnouncer(): (text: string) => void {
  return useCallback(announce, []);
}

export interface AnnouncerProps {
  /** Names the region for a reader browsing landmarks. */
  label?: string | undefined;
}

/** The polite region itself. Mount one, in the shell. */
export function Announcer({ label = 'Notifications' }: AnnouncerProps) {
  const current = useSyncExternalStore(
    subscribe,
    () => said,
    () => said,
  );
  return (
    <VisuallyHidden>
      <span role="status" aria-live="polite" aria-label={label}>
        <span key={current.n}>{current.text}</span>
      </span>
    </VisuallyHidden>
  );
}
