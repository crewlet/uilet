/**
 * The rows with news a reader cannot see: `unread` rows (not muted) wholly outside the
 * view of the scroller holding the list, and the least scroll that brings the nearest in.
 * Measured from the rows as drawn, so a folded group or a filter counts what scrolling finds.
 */

import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import { prefersReducedMotion } from '../MediaMatch/useMediaMatch.js';

/** Which edge of the view a hidden row lies past. */
export type UnseenSide = 'above' | 'below';

/** How many rows with news lie wholly above and wholly below the view. */
export interface Unseen {
  above: number;
  below: number;
}

/** The part of the screen the scroller shows, in client coordinates. */
export interface ViewSpan {
  top: number;
  bottom: number;
}

const NONE: Unseen = { above: 0, below: 0 };

/** A row with news: the component drops the unread class from a muted row. */
const CALLING_ROWS = '.crewlet-nav-item--unread > .crewlet-nav-item__head > .crewlet-nav-item__row';

/** How far a revealed row stands off the pill that asked for it. */
const PILL_CLEARANCE = 8;

const isAbove = (box: DOMRect, view: ViewSpan) => box.bottom <= view.top + 1;
const isBelow = (box: DOMRect, view: ViewSpan) => box.top >= view.bottom - 1;

/** The rows with news in `root` that are drawn, in document order. */
export function callingRows(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(CALLING_ROWS)].filter((row) => row.getBoundingClientRect().height > 0);
}

/** Counts the rows wholly outside `view`; a row partly in view is seen. */
export function unseenIn(rows: readonly HTMLElement[], view: ViewSpan): Unseen {
  let above = 0;
  let below = 0;
  for (const row of rows) {
    const box = row.getBoundingClientRect();
    if (isAbove(box, view)) above += 1;
    else if (isBelow(box, view)) below += 1;
  }
  return above === 0 && below === 0 ? NONE : { above, below };
}

/**
 * The nearest row hidden on `side`, and the scroll position that brings it wholly
 * into view `clear` px inside that edge: the least the list has to move.
 */
export function nearestUnseen(
  rows: readonly HTMLElement[],
  view: ViewSpan,
  scrollTop: number,
  side: UnseenSide,
  clear: number,
): { row: HTMLElement; top: number } | null {
  let hidden: HTMLElement | undefined;
  if (side === 'below') {
    hidden = rows.find((row) => isBelow(row.getBoundingClientRect(), view));
  } else {
    for (const row of rows) if (isAbove(row.getBoundingClientRect(), view)) hidden = row;
  }
  if (!hidden) return null;
  const box = hidden.getBoundingClientRect();
  const top = side === 'below' ? scrollTop + (box.bottom - view.bottom) + clear : scrollTop - (view.top - box.top) - clear;
  return { row: hidden, top: Math.max(0, Math.round(top)) };
}

/** The nearest element, `el` included, that scrolls on the block axis; `null` when the page does. */
export function scrollerOf(el: HTMLElement): HTMLElement | null {
  const view = el.ownerDocument.defaultView;
  for (let at: HTMLElement | null = el; at && at !== el.ownerDocument.body; at = at.parentElement) {
    const overflow = view?.getComputedStyle(at).overflowY ?? '';
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') return at;
  }
  return null;
}

function spanOf(scroller: HTMLElement | null, view: Window): ViewSpan {
  if (scroller === null) return { top: 0, bottom: view.innerHeight };
  const box = scroller.getBoundingClientRect();
  return { top: box.top, bottom: box.bottom };
}

/**
 * What waits outside the view of the scroller holding `list`, measured at most once a
 * frame on every scroll, resize and change to the rows, and `reveal`, which scrolls the
 * nearest one on a side into view and focuses it. Off while `enabled` is false.
 */
export function useUnseenRows(
  list: RefObject<HTMLElement | null>,
  enabled: boolean,
): { unseen: Unseen; reveal: (side: UnseenSide, pill: HTMLElement | null) => void } {
  const [unseen, setUnseen] = useState<Unseen>(NONE);

  useLayoutEffect(() => {
    const el = list.current;
    const view = el?.ownerDocument.defaultView;
    if (!enabled || !el || !view) {
      setUnseen(NONE);
      return;
    }
    const scroller = scrollerOf(el);
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = unseenIn(callingRows(el), spanOf(scroller, view));
      setUnseen((was) => (was.above === next.above && was.below === next.below ? was : next));
    };
    const schedule = () => {
      if (frame === 0) frame = view.requestAnimationFrame(measure);
    };
    measure();
    const scrolled: EventTarget = scroller ?? view;
    scrolled.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    const resized = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
    resized?.observe(el);
    if (scroller) resized?.observe(scroller);
    const changed = new view.MutationObserver(schedule);
    changed.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    return () => {
      scrolled.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
      resized?.disconnect();
      changed.disconnect();
      if (frame !== 0) view.cancelAnimationFrame(frame);
    };
  }, [list, enabled]);

  const reveal = useCallback(
    (side: UnseenSide, pill: HTMLElement | null) => {
      const el = list.current;
      const view = el?.ownerDocument.defaultView;
      if (!el || !view) return;
      const scroller = scrollerOf(el);
      const span = spanOf(scroller, view);
      // Land the row clear of the pill that asked, so it is not drawn under it.
      const box = pill?.getBoundingClientRect();
      const reach = box && box.height > 0 ? (side === 'below' ? span.bottom - box.top : box.bottom - span.top) : 0;
      const clear = Math.max(0, Math.ceil(reach)) + PILL_CLEARANCE;
      const scrollTop = scroller ? scroller.scrollTop : view.scrollY;
      const next = nearestUnseen(callingRows(el), span, scrollTop, side, clear);
      if (!next) return;
      (scroller ?? view).scrollTo({ top: next.top, behavior: prefersReducedMotion(view) ? 'auto' : 'smooth' });
      next.row.focus({ preventScroll: true });
    },
    [list],
  );

  return { unseen, reveal };
}
