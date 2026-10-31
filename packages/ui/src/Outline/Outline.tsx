import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import { prefersReducedMotion } from '../MediaMatch/index.js';

/** One heading of a document, as an outline lists it. */
export interface OutlineItem {
  /** The `id` of the heading this entry moves to. */
  id: string;
  /** What the reader sees: the heading's own text. */
  label: string;
  /** The heading's level, from 1. Each level deeper than the shallowest entry is indented one step. */
  level: number;
}

export interface OutlineProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /** The landmark's name, drawn as the outline's own heading: "On this page". */
  label: string;
  items: readonly OutlineItem[];
  /**
   * The entry whose section the reader is in, usually `useActiveHeading`'s
   * answer. Drawn with the accent edge and `aria-current="location"`.
   */
  activeId?: string | null | undefined;
  /**
   * Called with an entry's id when it is pressed. `scrollToHeading` by default,
   * which brings the heading into view and moves focus to it.
   */
  onSelect?: ((id: string) => void) | undefined;
}

/**
 * The headings of the document beside it, as a list a reader moves through
 * the document with: "On this page".
 *
 * BUTTONS, NOT ANCHORS. An application with a hash router keeps its own route
 * in the fragment, so `href="#section"` would navigate away from the page the
 * outline belongs to. A press moves to the heading instead, and the address
 * stays the page's.
 *
 * THE CURRENT ENTRY IS MARKED BY ITS OWN EDGE, the accent rule every current
 * row in the system takes, and by `aria-current="location"`, so a screen reader
 * hears where in the document the reader is rather than a colour standing for
 * it.
 */
export function Outline({ label, items, activeId = null, onSelect, className, ...rest }: OutlineProps) {
  const shallowest = items.reduce((min, item) => Math.min(min, item.level), Number.POSITIVE_INFINITY);
  const select = onSelect ?? ((id: string) => scrollToHeading(id));
  return (
    <nav {...rest} aria-label={label} className={cx('crewlet-outline', className)}>
      {/* The landmark is named by `aria-label`, so the drawn heading is hidden
          rather than read twice. */}
      <p className="crewlet-outline__title" aria-hidden="true">
        {label}
      </p>
      <ol className="crewlet-outline__list">
        {items.map((item) => {
          const current = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cx('crewlet-outline__item', current && 'crewlet-outline__item--current')}
                style={{ '--crewlet-outline-depth': item.level - shallowest } as CSSProperties}
                aria-current={current ? 'location' : undefined}
                onClick={() => select(item.id)}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Brings the element with `id` into view and moves focus to it, so a keyboard
 * carries on reading from the heading it chose rather than from the outline.
 *
 * A heading is not focusable, so it is given `tabindex="-1"`: focusable by
 * script, never a tab stop. The scroll is smooth unless the reader asked for
 * less motion, and focus is moved without a second, instant scroll. Answers
 * false when nothing has that id.
 */
export function scrollToHeading(id: string, ownerDocument: Document = document): boolean {
  const heading = ownerDocument.getElementById(id);
  if (!heading) return false;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  const still = prefersReducedMotion(ownerDocument.defaultView);
  heading.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
  return true;
}

export interface ActiveHeadingOptions {
  /** The element that scrolls the headings, or `null` for the window. */
  root?: HTMLElement | null | undefined;
  /**
   * How far below the top of the scroller a heading counts as reached, in
   * pixels. The heading the reader has scrolled past last is the current one.
   */
  offset?: number | undefined;
}

/** Defers to the next frame, or to the next task where a frame is not drawn at all. */
function nextFrame(view: Window, run: () => void): () => void {
  if (typeof view.requestAnimationFrame === 'function') {
    const frame = view.requestAnimationFrame(run);
    return () => view.cancelAnimationFrame(frame);
  }
  const timer = view.setTimeout(run, 0);
  return () => view.clearTimeout(timer);
}

/**
 * Which of the headings `ids` the reader is in: the last one scrolled past
 * the top of `root`, the first while none has been, and the LAST once the
 * scroller can go no further, because a closing section shorter than the
 * view would otherwise never become current at all.
 *
 * MEASURED ON A FRAME, never on every scroll event: a scroll fires faster than
 * a screen draws, and reading every heading's box on each one is a layout per
 * event. A heading the document does not hold is skipped rather than fatal,
 * so an outline built a moment before its body renders settles on the next
 * frame instead of throwing.
 */
export function useActiveHeading(ids: readonly string[], { root = null, offset = 0 }: ActiveHeadingOptions = {}): string | null {
  const key = ids.join('\u0000');
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const latest = useRef(active);
  latest.current = active;

  useEffect(() => {
    const list = key === '' ? [] : key.split('\u0000');
    const owner = root?.ownerDocument ?? document;
    const view = owner.defaultView;
    if (!view) return undefined;

    const measure = () => {
      if (list.length === 0) {
        if (latest.current !== null) setActive(null);
        return;
      }
      const top = root ? root.getBoundingClientRect().top : 0;
      let current = list[0] ?? null;
      for (const id of list) {
        const heading = owner.getElementById(id);
        if (!heading) continue;
        // In document order, so the first heading still below the line ends the walk.
        if (heading.getBoundingClientRect().top - top <= offset + 1) current = id;
        else break;
      }
      const scrolled = root ? root.scrollTop : view.scrollY;
      const height = root ? root.clientHeight : view.innerHeight;
      const extent = root ? root.scrollHeight : owner.documentElement.scrollHeight;
      if (scrolled > 0 && scrolled + height >= extent - 1) current = list[list.length - 1] ?? current;
      if (current !== latest.current) setActive(current);
    };

    let cancel: (() => void) | null = null;
    const schedule = () => {
      if (cancel) return;
      cancel = nextFrame(view, () => {
        cancel = null;
        measure();
      });
    };
    schedule();
    const target: HTMLElement | Window = root ?? view;
    target.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    return () => {
      target.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
      cancel?.();
    };
  }, [key, root, offset]);

  return active;
}
