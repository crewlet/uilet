import { Children, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useAnnouncer } from '../Announcer/index.js';
import { cx } from '../utils/cx.js';

export interface TagGroupProps {
  /**
   * What the tags are about, read before them: "what this is about", "Labels",
   * "Subjects". REQUIRED, because a bare row of handles is a row of words a
   * screen reader reads with nothing to hang them on.
   */
  label: string;
  /**
   * How many to show before the rest go behind a count. Six, because six
   * handles or addresses are legible at a glance on one line of a card and the
   * seventh is where a row starts wrapping; the measured long case is
   * thirty-six service accounts.
   */
  max?: number | undefined;
  /**
   * What happens to the tags that do not fit.
   *
   * `expand` (the default) folds everything past `max` behind a "+N more"
   * button that shows them in place.
   *
   * `fit` keeps the group on ONE LINE in whatever width it is given: the tags
   * that would wrap are left out and counted in a static "+N" chip, so a tag is
   * never cut mid-glyph by the box it sits in. It is for a dense row (a sheet
   * cell, a table) where a button per row would be a tab stop per row; the
   * group's name still says how many there are.
   */
  overflow?: 'expand' | 'fit' | undefined;
  /** The overflow control's label. */
  moreLabel?: ((hidden: number) => string) | undefined;
  /** The `fit` count chip's text. */
  countLabel?: ((hidden: number) => string) | undefined;
  /** What is said once the rest are shown. */
  expandedMessage?: ((total: number) => string) | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * A labelled list of tags, with the tail behind a count.
 *
 * IT EXPANDS IN PLACE rather than linking away, because the reason the rest
 * are folded is WIDTH, not secrecy: the list somebody is working through has
 * thirty-six things in it and sending them to another screen to read it is the
 * opposite of helping. It is not a disclosure either. A disclosure whose
 * summary reads "all 1 agents" is ungrammatical twice and hides, behind a
 * click, exactly what the sentence above it has already said.
 *
 * A LIST, not a row of spans: the count is what a reader is told when they
 * arrive, and only a list carries one.
 *
 * The sentence it says on expanding goes through the shared announcer, so the
 * application needs one `<Announcer>` mounted in its shell. Without one the
 * expansion still works and the announcer says loudly that nothing was said,
 * which is the point of it being one region rather than one per component.
 */
export function TagGroup({
  label,
  max = 6,
  overflow = 'expand',
  moreLabel = (hidden) => `+${hidden} more`,
  countLabel = (hidden) => `+${hidden}`,
  expandedMessage = (total) => `Showing all ${total}.`,
  className,
  children,
}: TagGroupProps) {
  const [open, setOpen] = useState(false);
  const announce = useAnnouncer();
  const list = useRef<HTMLUListElement | null>(null);

  const all = Children.toArray(children);
  const fit = overflow === 'fit';
  const fitted = useFitted(list, fit, all.length);
  const shown = fit ? all.slice(0, fitted) : open ? all : all.slice(0, max);
  const hidden = all.length - shown.length;

  return (
    <ul
      ref={list}
      /*
       * Focusable only on purpose, never by Tab. The control that expands the
       * list REMOVES ITSELF in doing so, so somebody who pressed it from the
       * keyboard would be left on the document body with the rest of the page
       * to walk back through; focus lands on the list that now holds them.
       */
      tabIndex={-1}
      className={cx('crewlet-tag-group', fit && 'crewlet-tag-group--fit', className)}
      aria-label={`${label}, ${all.length}`}
    >
      {shown.map((tag, index) => (
        // Keyed by position: the list only ever grows at the end, as the tail
        // is revealed, so no item ever changes the index it sits at.
        <li key={index} className="crewlet-tag-group__item">
          {tag}
        </li>
      ))}
      {hidden > 0 && fit ? (
        <li className="crewlet-tag-group__item" data-count="">
          <span className="crewlet-tag-group__count">{countLabel(hidden)}</span>
        </li>
      ) : hidden > 0 ? (
        <li className="crewlet-tag-group__item">
          <button
            type="button"
            className="crewlet-tag-group__more"
            onClick={() => {
              setOpen(true);
              // The rest appear where the button was, and the button goes with
              // it, so the reader is put on the list and told what it holds.
              list.current?.focus();
              announce(expandedMessage(all.length));
            }}
          >
            {moreLabel(hidden)}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * How many tags fit on the group's first line, with room for the count chip
 * when any are left out. Measured after layout and again when the group's
 * width changes: every item laid out below the first line's top is one that
 * wrapped. Starts at all of them, so a group that fits never re-renders.
 */
function useFitted(list: RefObject<HTMLUListElement | null>, active: boolean, total: number): number {
  const [fitted, setFitted] = useState(total);
  const width = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    setFitted(total);
  }, [active, total]);

  useLayoutEffect(() => {
    const box = list.current;
    if (!active || !box) return;
    const items = [...box.children] as HTMLElement[];
    const first = items[0];
    if (!first) return;
    const top = first.offsetTop;
    const tags = items.filter((item) => !item.hasAttribute('data-count'));
    const count = items.find((item) => item.hasAttribute('data-count'));
    const onLine = tags.filter((item) => item.offsetTop === top).length;
    // The count chip itself must sit on the line too, or one more tag gives way to it.
    const room = count && count.offsetTop !== top ? onLine - 1 : onLine;
    const next = Math.max(1, Math.min(room, tags.length));
    if (next < tags.length) setFitted(next);
  }, [list, active, fitted, total]);

  useLayoutEffect(() => {
    const box = list.current;
    if (!active || !box || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const now = entry?.contentRect.width ?? 0;
      if (width.current !== null && width.current !== now) setFitted(total);
      width.current = now;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [list, active, total]);

  return active ? fitted : total;
}
