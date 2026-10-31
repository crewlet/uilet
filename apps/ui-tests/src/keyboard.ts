import { act, fireEvent } from '@testing-library/react';

/**
 * FOCUS AN ELEMENT AS TAB DOES: the key, then a real focus.
 *
 * A dispatched `focus` event leaves the element unfocused, so nothing that
 * asks `:focus-visible` (a tooltip, which opens for keyboard focus only) can
 * match it. A real `element.focus()` is not enough on its own either: jsdom
 * answers `:focus-visible` from the event before the focus, as a browser's
 * heuristic does, so after a click earlier in the same file a scripted focus
 * reads as a pointer's. Pressing Tab on the document first makes the focus
 * the keyboard's, which is what a suite that means keyboard focus is asking.
 */
export function tabTo(element: HTMLElement): void {
  fireEvent.keyDown(element.ownerDocument.body, { key: 'Tab' });
  act(() => {
    element.focus();
  });
}
