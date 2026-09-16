import { useRef, type KeyboardEvent } from 'react';

/**
 * Which item in a row holds its ONE TAB STOP.
 *
 * The selected one, unless it is disabled: a browser refuses a disabled
 * button focus, so a row whose chosen option is disabled (a tab for a section
 * a plan does not include, a lens with nothing to draw) had its only stop on
 * an element Tab skips, and the keyboard could not enter the row at all. It
 * falls back to the first option that can take focus, and to none where every
 * option is disabled, which is a row with nothing to reach.
 */
export function tabStop(items: readonly { disabled?: boolean | undefined }[], selected: number): number {
  if (selected >= 0 && !items[selected]?.disabled) return selected;
  return items.findIndex((item) => !item.disabled);
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
 * A DISABLED BUTTON IS STEPPED OVER rather than focused: a browser refuses it
 * focus, so a move that lands on one drops focus on the page body and the
 * next arrow press does nothing at all.
 */
export function useRoving(count: number, select: ((index: number) => void) | null) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

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

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, vertical: boolean) => {
    const at = buttons.current.findIndex((button) => button === document.activeElement);
    if (at < 0) return;
    const next = moveTo(event.key, at, vertical);
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    select?.(next);
  };

  return { buttons, onKeyDown };
}
