/**
 * Where a list's highlight COMES TO REST, told once per resting place.
 *
 * WHY IT EXISTS. A list that previews what its highlight is on (a theme the
 * whole screen repaints in while the reader decides) has to know where the
 * reader STOPPED, not every row they passed. A key moves the highlight on
 * purpose, so where a key lands is told at once. A pointer crosses rows on
 * its way somewhere else, so a row it passes over is told only once the
 * pointer has rested on it for `HIGHLIGHT_REST_MS`; told on every row it
 * crossed, a list over a screen that repaints would flash every theme between
 * the pointer's start and its goal.
 *
 * THE RULES IT KEEPS.
 *
 * - A RESTING PLACE IS TOLD ONCE. Telling the same row twice is a second
 *   repaint of a screen already showing it, so a re-render, or a list handed
 *   new option objects for the same rows, says nothing.
 * - A KEY CANCELS A POINTER STILL ON ITS WAY. Where the arrows put the
 *   highlight wins over a row the pointer had not yet rested on.
 * - `null` IS NOWHERE, and it is told when the list stops offering anything:
 *   it closed, it emptied, the pointer left it, or the component went away.
 *   A preview never outlives the list that started it.
 *
 * It owns no markup and no highlight: the component keeps its own, and hands
 * this the KEY of each row the highlight reaches (a value, an id).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

/** How long a pointer rests on a row before the row is where the highlight rests, in milliseconds. */
export const HIGHLIGHT_REST_MS = 120;

export interface HighlightRest {
  /** The highlight moved by a key or by the list itself, or left the list (`null`): told now. */
  now: (key: string | null) => void;
  /** The pointer came onto a row: told once it rests there. */
  rest: (key: string) => void;
}

export function useHighlightRest(onRest: ((key: string | null) => void) | undefined): HighlightRest {
  const told = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onRest);
  callback.current = onRest;

  const cancel = useCallback(() => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const tell = useCallback((key: string | null) => {
    if (told.current === key) return;
    told.current = key;
    callback.current?.(key);
  }, []);

  const now = useCallback(
    (key: string | null) => {
      cancel();
      tell(key);
    },
    [cancel, tell],
  );

  const rest = useCallback(
    (key: string) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        tell(key);
      }, HIGHLIGHT_REST_MS);
    },
    [cancel, tell],
  );

  useEffect(
    () => () => {
      cancel();
      // GONE IS NOWHERE. Reset as well as told, so a component mounted again
      // (React's development double mount among them) tells its first resting
      // place afresh rather than taking it for the one already told.
      if (told.current !== null) {
        told.current = null;
        callback.current?.(null);
      }
    },
    [cancel],
  );

  // One object for the component's life, so an effect that names it as a
  // dependency runs when the highlight moves and not on every render.
  return useMemo(() => ({ now, rest }), [now, rest]);
}
