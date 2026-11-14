import { useLayoutEffect, useState } from 'react';

/** What a Tab can land on inside an element: the same list the layer's Tab trap walks. */
const STOPS = [
  'a[href]',
  'button:not([disabled])',
  "input:not([disabled]):not([type='hidden'])",
  'select:not([disabled])',
  'textarea:not([disabled])',
  "[contenteditable='true']",
  '[tabindex]',
].join(',');

function holdsStop(scroller: HTMLElement): boolean {
  for (const el of scroller.querySelectorAll<HTMLElement>(STOPS)) {
    if (el.tabIndex >= 0 && !el.closest('[hidden],[inert]')) return true;
  }
  return false;
}

function scrolls(scroller: HTMLElement): boolean {
  const style = getComputedStyle(scroller);
  const along = (overflow: string, content: number, box: number) =>
    (overflow === 'auto' || overflow === 'scroll') && content > box;
  return (
    along(style.overflowY, scroller.scrollHeight, scroller.clientHeight) ||
    along(style.overflowX, scroller.scrollWidth, scroller.clientWidth)
  );
}

/**
 * Whether a scrolling element has to take focus itself for a keyboard to
 * scroll it: true while its content is taller or wider than its box AND
 * nothing inside it is a Tab stop.
 *
 * WHY IT IS MEASURED, never set for good. A scroller holding a field or a
 * button scrolls as focus moves through it, and one whose content fits has
 * nothing to scroll: a Tab stop on either is a stop that does nothing, one
 * more press between a reader and the control they came for. A scroller of
 * plain words that overflows is the one case nothing else reaches, and a
 * keyboard reader could not see the end of it.
 *
 * It is read again when the element or one of its children changes size and
 * when its contents change, so a list that grows past its box becomes a stop
 * and one that gains a button stops being one. Both observers are
 * feature-checked, as every observer in this package is.
 *
 * The caller gives the element `tabIndex={0}` while this is true, and a role
 * and a name so the stop says what it is.
 */
export function useScrollerFocus(scroller: HTMLElement | null): boolean {
  const [needed, setNeeded] = useState(false);

  useLayoutEffect(() => {
    if (!scroller) {
      setNeeded(false);
      return undefined;
    }
    const measure = () => setNeeded(scrolls(scroller) && !holdsStop(scroller));
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    // The box, and what stands in it: content growing inside a box of a fixed
    // height resizes a child, never the box.
    const watch = () => {
      resize?.disconnect();
      resize?.observe(scroller);
      for (const child of scroller.children) resize?.observe(child);
    };
    const mutation =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            watch();
            measure();
          })
        : null;
    mutation?.observe(scroller, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'hidden', 'inert', 'href', 'contenteditable'],
    });
    watch();
    measure();
    return () => {
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [scroller]);

  return needed;
}
