/**
 * What a listbox has to do that the platform's own dropdown did for free.
 *
 * WHY IT IS ITS OWN FILE. `useListbox` is the keyboard of a list that follows a
 * TEXT FIELD: the arrows, Enter, Escape and the layer it sits on. It knows
 * nothing about the options themselves, so it cannot step over a disabled row,
 * cannot answer Home or End, and has no type-ahead. Those three are exactly
 * what a reader loses the moment a product stops drawing a native `<select>`,
 * and the house style is now the listbox everywhere (a native control is drawn
 * only where a caller asks for one). Written twice, one list would skip
 * disabled rows while the one beside it parked the highlight on them, and only
 * one of the two would answer End.
 *
 * THE RULES IT KEEPS.
 *
 * - THE ARROWS, HOME AND END STEP OVER A DISABLED ROW. A highlight parked on
 *   one is a list where Enter does nothing and nobody is told why.
 * - TYPE-AHEAD IS THE NATIVE CONTROL'S ONE IRREPLACEABLE TRICK. Letters typed
 *   within half a second are one run, so "sa" reaches Saturday rather than
 *   stopping at the first S; a single letter repeated walks the rows starting
 *   with it, which is what a `<select>` does. A list with a search box has no
 *   type-ahead at all, because there the letters belong to the box.
 * - A RUN IS MATCHED FROM THE ROW AFTER THE HIGHLIGHT, so pressing one letter
 *   twice moves on rather than re-finding the row already under it.
 * - IT REPORTS WHAT IT HANDLED, so the component around it can take the keys
 *   it owns itself (a Select takes Tab) and leave the rest alone.
 *
 * It owns no markup and no state beyond the type-ahead run: the highlight
 * lives in `useListbox`, and this moves it.
 */

import { useCallback, useRef, type KeyboardEvent } from 'react';
import type { Listbox } from './useListbox.js';

/** How long a type-ahead run stays open, in milliseconds. */
export const TYPE_AHEAD_WINDOW = 500;

export interface OptionKeysOptions {
  /** The highlight this moves. */
  listbox: Listbox;
  /** How many options are offered right now. */
  count: number;
  /** Whether the option at `index` refuses to be taken. */
  disabled?: ((index: number) => boolean) | undefined;
  /**
   * The words type-ahead matches at `index`. Leave it out for a list whose
   * letters belong to a search box: that list has no type-ahead, on purpose.
   */
  textOf?: ((index: number) => string) | undefined;
}

export interface OptionKeys {
  /**
   * Handles the keys the options themselves decide, and says whether it did.
   * Anything it does not take belongs to `listbox.onKeyDown` and then to the
   * component.
   */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  /** The next index at or after `from`, walking `by`, that Enter would accept, or -1. */
  step: (from: number, by: 1 | -1) => number;
  /**
   * Which row a freshly opened list highlights: the chosen one when it can be
   * taken, else the first that can. A list that opens on a disabled row is one
   * where the first Enter does nothing.
   */
  opening: (chosen: number) => number;
}

export function useOptionKeys({ listbox, count, disabled, textOf }: OptionKeysOptions): OptionKeys {
  const typed = useRef({ text: '', at: 0 });
  const { active, setActive } = listbox;

  const step = useCallback(
    (from: number, by: 1 | -1): number => {
      if (count === 0) return -1;
      for (let i = 0; i < count; i += 1) {
        const at = (((from + by * i) % count) + count) % count;
        if (!disabled?.(at)) return at;
      }
      return -1;
    },
    [count, disabled],
  );

  const opening = useCallback((chosen: number) => (chosen >= 0 && !disabled?.(chosen) ? chosen : Math.max(step(0, 1), 0)), [disabled, step]);

  const typeAhead = useCallback(
    (key: string): boolean => {
      if (!textOf) return false;
      const now = Date.now();
      const run = now - typed.current.at < TYPE_AHEAD_WINDOW ? typed.current.text + key : key;
      typed.current = { text: run, at: now };
      // A fresh single letter starts looking BELOW the highlight, so pressing
      // it again walks the rows that begin with it; a longer run starts at the
      // highlight, so "sa" refines "s" rather than skipping past its match.
      const from = active < 0 ? 0 : active + (run.length === 1 ? 1 : 0);
      for (let i = 0; i < count; i += 1) {
        const at = (((from + i) % count) + count) % count;
        if (disabled?.(at)) continue;
        if (textOf(at).toLowerCase().startsWith(run.toLowerCase())) {
          setActive(at);
          return true;
        }
      }
      return false;
    },
    [active, count, disabled, setActive, textOf],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): boolean => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const by = event.key === 'ArrowDown' ? 1 : -1;
        const next = step(active + by, by);
        if (next >= 0) setActive(next);
        return true;
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const next = event.key === 'Home' ? step(0, 1) : step(count - 1, -1);
        if (next >= 0) setActive(next);
        return true;
      }
      // A chord is an application shortcut, never a letter of a word.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (typeAhead(event.key)) {
          event.preventDefault();
          return true;
        }
      }
      return false;
    },
    [active, count, setActive, step, typeAhead],
  );

  return { onKeyDown, step, opening };
}
