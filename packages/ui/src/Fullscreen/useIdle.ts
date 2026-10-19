import { useEffect, useState, type RefObject } from 'react';

/** How long the pointer rests before a full screen show puts its controls and cursor away. */
export const IDLE_AFTER_MS = 2500;

/**
 * Whether the reader has left the pointer still over `ref` for `timeout`
 * milliseconds: what a full screen show reads to put its controls and the
 * cursor away, and bring them back on the next move.
 *
 * A MOVE, A PRESS OR A TOUCH WAKES IT; a key does not. A clicker sends keys,
 * and a show whose controls flashed up on every slide would put them over the
 * room's screen each time the presenter moved on. The controls stay reachable
 * from the keyboard regardless: focus inside the element also keeps it awake.
 *
 * Off (`enabled` false), it is never idle and listens to nothing.
 */
export function useIdle(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  timeout: number = IDLE_AFTER_MS,
): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setIdle(false);
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rest = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // A CONTROL IN FOCUS keeps them out: a reader tabbing to Full screen
        // must not have it vanish under the focus ring.
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && focused !== el && el.contains(focused) && focused.matches(':focus-visible')) {
          rest();
          return;
        }
        setIdle(true);
      }, timeout);
    };
    const wake = () => {
      setIdle(false);
      rest();
    };
    rest();
    el.addEventListener('pointermove', wake);
    el.addEventListener('pointerdown', wake);
    el.addEventListener('focusin', wake);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('pointermove', wake);
      el.removeEventListener('pointerdown', wake);
      el.removeEventListener('focusin', wake);
    };
  }, [ref, enabled, timeout]);
  return enabled && idle;
}
