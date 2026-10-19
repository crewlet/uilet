import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * How tall a `fit="view"` stage may be so that its show is seen whole.
 *
 * THE SHOW IS THE STAGE'S PARENT: the stage and whatever the parent sets
 * around it (a count, Previous and Next), all of which must be on screen
 * together. No length in a stylesheet can say how tall that may be, because it
 * is the view's height less whatever the page sets above the show (a title, a
 * description, tabs), and that wraps differently on every window. So it is
 * MEASURED, after layout and again whenever the view, the show or the stage
 * is resized.
 *
 * The show asks for the stage at its full width plus the rest of the show, and
 * is given that or the room from its top to the foot of its scrollport,
 * measured with the scrollport at its top, whichever is less. When that room
 * would shrink it below half of what it asks, it is too low on the page to be
 * read there: it takes the scrollport's whole height instead and is scrolled
 * into view. The show's `scroll-margin-top` and `scroll-margin-bottom` are
 * kept clear, so a sticky bar over the view and the page's own foot are never
 * covered.
 */

export interface StageFit {
  /** The stage's height, in CSS pixels. */
  height: number;
  /** Whether the show only fits once it is scrolled into view. */
  scroll: boolean;
}

/** The nearest ancestor that scrolls vertically, or null when the window does. */
export function scrollportOf(el: Element): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/^(auto|scroll)$/.test(getComputedStyle(p).overflowY)) return p;
  }
  return null;
}

const px = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/** The fit of `stage`, whose slide is `ratio` (height over width) of its width. */
export function fitInView(stage: HTMLElement, ratio: number): StageFit {
  const show = stage.parentElement ?? stage;
  const port = scrollportOf(show);
  const box = show.getBoundingClientRect();
  // THE SHOW'S TOP IN THE SCROLLED CONTENT, so the answer does not move as
  // the reader scrolls.
  const top = port
    ? box.top - port.getBoundingClientRect().top - port.clientTop + port.scrollTop
    : box.top + window.scrollY;
  const view = port ? port.clientHeight : document.documentElement.clientHeight;
  const margins = getComputedStyle(show);
  const above = px(margins.scrollMarginTop);
  const below = px(margins.scrollMarginBottom);
  // WHAT THE SHOW HOLDS BESIDES THE STAGE, which does not change with the
  // stage's height: the show's own height follows its content.
  const rest = show === stage ? 0 : Math.max(0, show.offsetHeight - stage.offsetHeight);
  const need = stage.clientWidth * ratio + rest;
  const room = view - top - below;
  const scroll = room < need / 2;
  const height = Math.min(need, scroll ? view - above - below : room);
  return { height: Math.max(0, height - rest), scroll };
}

/** Whether the document's full screen element is, or holds, `el`. */
function inFullscreen(el: Element): boolean {
  const full = typeof document === 'undefined' ? null : document.fullscreenElement;
  return !!full && full.contains(el);
}

/**
 * The height a `fit="view"` stage takes, or null when it is not measured: off,
 * not yet laid out, or in full screen, where the stage fills its box. A show
 * that only fits once scrolled into view is scrolled there when it is first
 * measured.
 */
export function useFitInView(
  stage: RefObject<HTMLElement | null>,
  enabled: boolean,
  ratio: number,
): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || !enabled) return undefined;
    let first = true;
    const measure = () => {
      if (inFullscreen(el)) {
        setHeight(null);
        return;
      }
      const fit = fitInView(el, ratio);
      setHeight(Math.floor(fit.height));
      if (first && fit.scroll) (el.parentElement ?? el).scrollIntoView?.({ block: 'start' });
      first = false;
    };
    measure();
    document.addEventListener('fullscreenchange', measure);
    if (typeof ResizeObserver === 'undefined') {
      return () => document.removeEventListener('fullscreenchange', measure);
    }
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    if (el.parentElement) watch.observe(el.parentElement);
    watch.observe(scrollportOf(el) ?? document.documentElement);
    return () => {
      watch.disconnect();
      document.removeEventListener('fullscreenchange', measure);
    };
  }, [stage, enabled, ratio]);
  return enabled ? height : null;
}
