/**
 * The keyboard half of a listbox that follows a text field.
 *
 * WHY IT EXISTS. A field that offers a list while somebody types (a combobox,
 * a searchable multi-select, a command palette) keeps focus in the text box
 * and points at the highlighted option with `aria-activedescendant`. The keys
 * that move that highlight, take an option and dismiss the list are the same
 * in every one of them, and a second hand-written copy is how one list starts
 * wrapping at the ends while the other stops, or how Escape in one closes the
 * dialog around it.
 *
 * THE RULES IT KEEPS.
 *
 * - THE HIGHLIGHT WRAPS: Down from the last option goes to the first, Up from
 *   the first to the last.
 * - IT IS CLAMPED, NOT RESET, when the list shrinks under somebody's typing,
 *   so the highlight stays on a row that exists instead of jumping to the top.
 * - ENTER TAKES THE HIGHLIGHTED OPTION and is prevented, because the field is
 *   usually inside a form that submits on Enter, and choosing is not saving.
 *   Tab takes it too where the list is a completion (`tabCommits`); a
 *   multi-select leaves Tab to move focus, as every form control does.
 * - ESCAPE CLOSES THE LIST AND NOTHING ELSE. It stops there, so the dialog or
 *   sheet the field sits in stays open; a second Escape reaches it. That holds
 *   for a list that is showing with nothing in it too, and for nothing else:
 *   `open` means the reader can see a list, so an Escape with none on screen
 *   goes straight to the surface around it.
 * - THE LIST IS A POPUP ON THE LAYER STACK, so a press outside it closes the
 *   list before anything beneath it: a press on a dialog's veil while the list
 *   is open closes the list and leaves the dialog. The component attaches
 *   `listRef` to the list it draws and `anchorRef` to the element around the
 *   field, whose presses are not outside.
 * - A LIST THAT IS A MODAL'S WHOLE BODY IS NOT A POPUP (`popup: false`). A
 *   command palette is a modal whose content is its results: the modal's own
 *   Escape and veil already close it. Registered as a popup above that modal,
 *   the list would take Escape from the stack and the veil's press on
 *   `pointerdown`, closing the palette before the press's click and letting
 *   that click land on whatever the veil was covering.
 * - THE HIGHLIGHTED ROW STAYS IN VIEW, by scrolling THE LIST ELEMENT and
 *   nothing else. `scrollIntoView` scrolls every scrollable ancestor it finds,
 *   and jsdom does not implement it at all, so an unguarded call throws the
 *   moment a suite opens a list. Re-run when the options change as well as the
 *   cursor: typing over a list scrolled by the wheel leaves the cursor at 0
 *   and the row out of view.
 * - NOTHING IS TAKEN MID-COMPOSITION. While an input method is composing a
 *   word, the arrows, Enter and Escape are its own, and the handler reports
 *   them unhandled so the component around it leaves them alone too.
 * - A PRESS ON AN OPTION IS TAKEN ON `mousedown`, with the default prevented:
 *   the field would otherwise blur first, and a list that closes on blur takes
 *   the row out from under the click that was choosing it.
 *
 * It owns no markup and no filtering: the component renders the list, decides
 * what is offered and what taking an option means. The classes it is drawn
 * with are in `Listbox.css`.
 *
 * Ported from the engine dashboard's `ui/useListbox.ts`.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { isComposing, usePopupLayer } from '../Layer/stack.js';

export interface ListboxOptions {
  /** A stable base for element ids, usually from `useId`. */
  id: string;
  /** Whether a list is on screen, including one that says nothing matches. */
  open: boolean;
  /** How many options are offered right now. */
  count: number;
  /** Taking the option at `index`. */
  onCommit: (index: number) => void;
  /** Escape, or a press outside the list, while the list is a popup. */
  onClose: () => void;
  /**
   * Whether the list is a popup on the layer stack (the default), or the body
   * of a modal that owns Escape and its veil itself.
   */
  popup?: boolean | undefined;
  /** Whether Tab takes the highlighted option (a completion) or moves focus (a form control). */
  tabCommits?: boolean | undefined;
}

export interface Listbox {
  /** The highlighted option's index, clamped to what is offered; -1 when nothing is. */
  active: number;
  setActive: (index: number) => void;
  /** The listbox element's id. */
  listId: string;
  /** The list on screen: what a press outside is measured against, and what scrolls. */
  listRef: (el: HTMLElement | null) => void;
  /** The element around the field: a press on it is not outside the list. */
  anchorRef: (el: HTMLElement | null) => void;
  /** The id of the option element at `index`. */
  optionId: (index: number) => string;
  /** The field's keydown handler. Returns whether it handled the key. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  /** Mouse wiring for the option element at `index`. */
  optionHandlers: (index: number) => {
    onMouseDown: (event: MouseEvent<HTMLElement>) => void;
    onMouseEnter: () => void;
  };
}

export function useListbox({
  id,
  open,
  count,
  onCommit,
  onClose,
  tabCommits = false,
  popup = true,
}: ListboxOptions): Listbox {
  const [at, setAt] = useState(0);
  const active = count === 0 ? -1 : Math.min(Math.max(at, 0), count - 1);
  const listId = `${id}-listbox`;
  const layer = usePopupLayer({ open: open && popup, onDismiss: () => onClose() });
  const list = useRef<HTMLElement | null>(null);

  const listRef = useCallback(
    (el: HTMLElement | null) => {
      list.current = el;
      layer.panelRef(el);
    },
    [layer],
  );

  useEffect(() => {
    const box = list.current;
    const row = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !row) return;
    const bounds = box.getBoundingClientRect();
    const spot = row.getBoundingClientRect();
    if (spot.top < bounds.top) box.scrollTop -= bounds.top - spot.top;
    else if (spot.bottom > bounds.bottom) box.scrollTop += spot.bottom - bounds.bottom;
  }, [active, count, open]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>): boolean {
    if (!open || isComposing(event)) return false;
    if (event.key === 'Escape') {
      if (!popup) return false;
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return true;
    }
    if (count === 0) return false;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setAt((active + 1) % count);
        return true;
      case 'ArrowUp':
        event.preventDefault();
        setAt((active - 1 + count) % count);
        return true;
      case 'Enter':
        event.preventDefault();
        onCommit(active);
        return true;
      case 'Tab':
        if (!tabCommits || event.shiftKey) return false;
        event.preventDefault();
        onCommit(active);
        return true;
      default:
        return false;
    }
  }

  return {
    active,
    setActive: setAt,
    listId,
    listRef,
    anchorRef: layer.insideRef,
    optionId: (index) => `${listId}-${index}`,
    onKeyDown,
    optionHandlers: (index) => ({
      onMouseDown: (event) => {
        event.preventDefault();
        onCommit(index);
      },
      onMouseEnter: () => setAt(index),
    }),
  };
}
