import { useRef, useState, type KeyboardEvent } from 'react';

/**
 * Which item in a row holds its ONE TAB STOP.
 *
 * The selected one, unless it is disabled: a browser refuses a disabled
 * button focus, so a row whose chosen option is disabled (a tab for a section
 * a plan does not include, a lens with nothing to draw) had its only stop on
 * an element Tab skips, and the keyboard could not enter the row at all. It
 * falls back to the first option that can take focus, and to none where every
 * option is disabled, which is a row with nothing to reach.
 *
 * `selected` is where the stop BELONGS rather than what is chosen: under
 * manual activation that is where focus last was, which is not the chosen
 * option (see [RovingOptions.followFocus]).
 */
export function tabStop(items: readonly { disabled?: boolean | undefined }[], selected: number): number {
  if (selected >= 0 && !items[selected]?.disabled) return selected;
  return items.findIndex((item) => !item.disabled);
}

/**
 * How a row places its ONE TAB STOP while focus moves inside it.
 */
export interface RovingOptions {
  /**
   * Whether the stop FOLLOWS FOCUS rather than staying on the selection.
   *
   * Off by default, which is the only honest answer for a row that SELECTS AS
   * FOCUS MOVES: there the two are the same element, so the stop needs no
   * state of its own and an arrow key costs the render it was going to cost
   * anyway.
   *
   * On is what a row whose arrows do NOT select has to have. With the stop
   * left on the selection, a reader who arrows three options along without
   * committing, Tabs out of the row and Tabs back is dropped on the option
   * they started from rather than the one they left, and every move they made
   * is gone with nothing said about it. It is half of manual activation, not
   * a refinement of it.
   */
  followFocus?: boolean | undefined;
}

/**
 * Roving focus over a row of buttons: ONE TAB STOP for the row, the arrows to
 * move inside it.
 *
 * WHY ONE STOP. A row of eight lenses is one control, not eight: Tab should
 * pass it, not walk it. That is the ARIA pattern for a tablist, a radio group
 * and a toolbar alike, and it is what makes the arrows mean anything.
 *
 * `select` is called on a move only where the row SELECTS AS FOCUS MOVES (a
 * radio group, whose choice is a setting). A tab row leaves selection to
 * Enter and Space, which a real button already turns into its own click: a
 * tab is a section that pushes a history entry, and a row that selected on
 * every arrow press left one entry per keystroke for Back to walk through.
 *
 * THE TWO ARGUMENTS GO TOGETHER. A caller that passes no `select` is a row
 * under manual activation and wants `followFocus`, because the stop and the
 * selection have come apart; a caller that passes one wants neither.
 *
 * A DISABLED BUTTON IS STEPPED OVER rather than focused: a browser refuses it
 * focus, so a move that lands on one drops focus on the page body and the
 * next arrow press does nothing at all.
 */
export function useRoving(
  count: number,
  select: ((index: number) => void) | null,
  { followFocus = false }: RovingOptions = {},
) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  /*
   * Where focus last WAS in the row, kept after it leaves: the stop a reader
   * Tabs back onto is the one they Tabbed away from. Written only under
   * `followFocus`, so a row that selects as it moves is rendered exactly as
   * often as it was before this existed.
   */
  const [landed, setLanded] = useState<number | null>(null);

  /** The next button that can take focus, walking `by` from `from`. */
  function step(from: number, by: 1 | -1): number | null {
    for (let i = 0; i < count; i += 1) {
      const at = (((from + by * i) % count) + count) % count;
      const el = buttons.current[at];
      if (el && !el.disabled) return at;
    }
    return null;
  }

  function moveTo(key: string, at: number, vertical: boolean): number | null {
    if (count === 0) return null;
    switch (key) {
      case 'ArrowRight':
        return step(at + 1, 1);
      case 'ArrowLeft':
        return step(at - 1, -1);
      case 'ArrowDown':
        return vertical ? step(at + 1, 1) : null;
      case 'ArrowUp':
        return vertical ? step(at - 1, -1) : null;
      case 'Home':
        return step(0, 1);
      case 'End':
        return step(count - 1, -1);
      default:
        return null;
    }
  }

  /**
   * Focus landed on an index by something OTHER than a move: a pointer press,
   * a Tab into the row, a caller focusing an option itself. The stop follows
   * that too, or a click and an arrow key would leave the row disagreeing
   * with itself about where the reader is.
   */
  const onFocusAt = (index: number) => {
    if (followFocus) setLanded(index);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, vertical: boolean) => {
    const at = buttons.current.findIndex((button) => button === document.activeElement);
    if (at < 0) return;
    const next = moveTo(event.key, at, vertical);
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    // Said here as well as on the button's own focus event, because that is a
    // browser's answer to `focus()` rather than a promise of this module's.
    onFocusAt(next);
    select?.(next);
  };

  return {
    buttons,
    onKeyDown,
    onFocusAt,
    /*
     * Where the stop belongs, or null for "on the caller's selection, as
     * ever". Bounded by the CURRENT count, because a row whose options
     * changed under a remembered index would otherwise put its only stop past
     * its own end, where Tab finds nothing at all.
     */
    focused: followFocus && landed !== null && landed < count ? landed : null,
  };
}
