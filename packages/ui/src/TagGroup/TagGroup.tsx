import { Children, isValidElement, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useAnnouncer } from '../Announcer/index.js';
import { ListOverflow, overflowWords, shownBeforeOverflow, type ListNoun } from '../ListOverflow/index.js';
import { cx } from '../utils/cx.js';

export interface TagGroupProps {
  /**
   * What the tags are about, read before them: "what this is about", "Labels",
   * "Subjects". REQUIRED, because a bare row of handles is a row of words a
   * screen reader reads with nothing to hang them on.
   */
  label: string;
  /**
   * How many to show before the rest go behind a count; one more is drawn rather than counted. Six, because six
   * handles or addresses are legible at a glance on one line of a card and the
   * seventh is where a row starts wrapping; the measured long case is
   * thirty-six service accounts.
   */
  max?: number | undefined;
  /**
   * `expand` (the default) folds everything past `max` behind a "+N more" button that shows them in place;
   * `fit` keeps ONE LINE in any width, naming what wraps in a chip that lists it ("+2 more labels").
   */
  overflow?: 'expand' | 'fit' | undefined;
  /** What the tags are called, for the overflow's words: "+2 more problems". */
  noun?: ListNoun | undefined;
  /**
   * The `fit` chip is words, not a button: for a group inside a widget that
   * owns the pointer and the keyboard (a grid cell), whose editor lists them all.
   */
  countOnly?: boolean | undefined;
  /** The overflow control's label. */
  moreLabel?: ((hidden: number) => string) | undefined;
  /** The `fit` chip's text. */
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
  noun,
  countOnly = false,
  moreLabel = (hidden) => overflowWords(hidden, noun),
  countLabel = (hidden) => overflowWords(hidden, noun),
  expandedMessage = (total) => `Showing all ${total}.`,
  className,
  children,
}: TagGroupProps) {
  const [open, setOpen] = useState(false);
  const announce = useAnnouncer();
  const list = useRef<HTMLUListElement | null>(null);

  const all = Children.toArray(children);
  const fit = overflow === 'fit';
  const signature = all.map((tag) => (isValidElement(tag) ? String(tag.key) : String(tag))).join('\u0000');
  const fitted = useFitted(list, fit, all.length, signature);
  // Ending a row of 18px pills (a sheet cell), the chip takes their step.
  const xs = all.some((tag) => isValidElement<{ size?: unknown }>(tag) && tag.props.size === 'xs');
  const shown = fit ? all.slice(0, fitted) : open ? all : all.slice(0, shownBeforeOverflow(all.length, max));
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
      // One tag left beside the chip: the line stops wrapping and the tag gives way.
      data-folded={fit && hidden > 0 && shown.length === 1 ? '' : undefined}
      aria-label={`${label}, ${all.length}`}
    >
      {shown.map((tag, index) => (
        // Keyed by position: the list only ever grows at the end, as the tail
        // is revealed, so no item ever changes the index it sits at.
        <li key={index} className="crewlet-tag-group__item">
          {tag}
        </li>
      ))}
      {hidden > 0 && fit && countOnly ? (
        <li className="crewlet-tag-group__item" data-count="">
          <span className="crewlet-tag-group__count">{countLabel(hidden)}</span>
        </li>
      ) : hidden > 0 && fit ? (
        <li className="crewlet-tag-group__item" data-count="">
          <ListOverflow items={all.slice(shown.length)} noun={noun} size={xs ? 'xs' : 'sm'} label={`${label}, ${hidden} more`}>
            {shown.length === 0 ? allWords(hidden, noun) : countLabel(hidden)}
          </ListOverflow>
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

/** The chip's words when no tag fits beside it, so it never says "more" than nothing: "3 problems". */
function allWords(count: number, noun: ListNoun | undefined): string {
  return noun === undefined ? `Show ${count}` : `${count.toLocaleString()} ${count === 1 ? noun.one : noun.other}`;
}

/** The narrowest a tag may give way to beside the chip: its round ends and about four letters. */
const MIN_TAG = 48;

/**
 * How many tags, of natural `widths`, fit on one line of `room` beside a chip
 * `chip` wide. Folded to one, the tag gives way down to MIN_TAG; past that the chip stands alone.
 */
function fitCount(room: number, widths: readonly number[], chip: number, gap: number): number {
  const span = (n: number) => widths.slice(0, n).reduce((sum, width) => sum + width, 0) + gap * Math.max(0, n - 1);
  if (span(widths.length) <= room) return widths.length;
  for (let n = widths.length - 1; n >= 1; n -= 1) if (span(n) + gap + chip <= room) return n;
  return room - chip - gap >= MIN_TAG ? 1 : 0;
}

/**
 * How many tags fit on the group's one line. Each tag's natural width is
 * measured once, with all of them drawn, so a resize is arithmetic: the chip
 * (and a panel open from it) is never torn down just to measure again.
 */
function useFitted(list: RefObject<HTMLUListElement | null>, active: boolean, total: number, signature: string): number {
  const [fitted, setFitted] = useState(total);
  const [round, setRound] = useState(0);
  const widths = useRef<number[] | null>(null);

  useLayoutEffect(() => {
    if (!active) return undefined;
    const remeasure = () => {
      widths.current = null;
      setFitted(total);
      setRound((n) => n + 1);
    };
    remeasure();
    // A web font that arrives later changes every tag's width.
    let live = true;
    void document.fonts?.ready.then(() => live && remeasure());
    return () => {
      live = false;
    };
  }, [active, total, signature]);

  useLayoutEffect(() => {
    const box = list.current;
    // A group with no width (inside a hidden panel) has nothing to measure yet.
    if (!active || !box || box.clientWidth === 0) return;
    const items = [...box.children] as HTMLElement[];
    const tags = items.filter((item) => !item.hasAttribute('data-count'));
    if (widths.current === null) {
      if (tags.length < total) return;
      widths.current = tags.map((tag) => tag.offsetWidth);
    }
    const chip = items.find((item) => item.hasAttribute('data-count'))?.offsetWidth ?? 0;
    const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
    const next = fitCount(box.clientWidth, widths.current, chip, gap);
    if (next !== fitted) setFitted(next);
  }, [list, active, total, fitted, round]);

  useLayoutEffect(() => {
    const box = list.current;
    if (!active || !box || typeof ResizeObserver !== 'function') return undefined;
    let last: number | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const now = entry?.contentRect.width ?? 0;
      if (last !== null && last !== now) setRound((n) => n + 1);
      last = now;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [list, active]);

  return active ? fitted : total;
}
