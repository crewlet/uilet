/**
 * Puts the element's whole words on its title while they are cut, and takes
 * the title off while they fit. One line is cut across (`inline`), a clamp
 * down (`block`). The words are read from the element itself, so a run of
 * marked-up text (a mono id inside the line) reads as it is shown, with its
 * white space collapsed as the line collapses it.
 *
 * MEASURED WHEN THE POINTER ARRIVES, the only moment a title is read, so it
 * never goes stale after a resize or a new value, and a table of a thousand
 * cut cells costs nothing until one is hovered. One helper for every element
 * the kit cuts with an ellipsis (`Text`, the table cells, a grid's heads), so
 * no cut is drawn without its words on hover.
 */
export function titleIfCut(element: HTMLElement, axis: 'inline' | 'block' = 'inline'): void {
  const cut =
    axis === 'inline' ? element.scrollWidth > element.clientWidth : element.scrollHeight > element.clientHeight;
  const words = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (cut && words !== '') element.setAttribute('title', words);
  else element.removeAttribute('title');
}

/** `onMouseEnter` for a one-line cut: see [titleIfCut]. */
export const titleWhenCut = (event: { currentTarget: HTMLElement }): void => titleIfCut(event.currentTarget, 'inline');
