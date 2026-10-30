import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Which tabs of a row fold into its "More" menu, from their widths: the
 * arithmetic, apart from the DOM it is measured in, so it can be held to its
 * rules directly.
 *
 * `widths` are the tabs' own, in order; `space` is the row's inner width,
 * `gap` the space between two items and `more` the "More" trigger's width.
 * Returns the INDEXES that fold. Everything fits, none. Otherwise the row
 * keeps the tab the reader is on (`current`) and, before it, as long a run of
 * the others FROM THE START as fits beside it and the trigger. A run, never a
 * pick of whichever narrower tabs would squeeze in further along, because a
 * row whose order changes with its width is one a reader cannot learn.
 */
export function foldTabs({
  widths,
  current,
  space,
  gap,
  more,
}: {
  widths: readonly number[];
  current: number;
  space: number;
  gap: number;
  more: number;
}): number[] {
  const all = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1);
  if (all <= space) return [];
  let used = more + (current >= 0 ? (widths[current] ?? 0) + gap : 0);
  const kept = new Set<number>(current >= 0 ? [current] : []);
  for (let i = 0; i < widths.length; i++) {
    if (i === current) continue;
    const next = used + (widths[i] ?? 0) + gap;
    if (next > space) break;
    used = next;
    kept.add(i);
  }
  return widths.map((_, i) => i).filter((i) => !kept.has(i));
}

/**
 * Whether a row's note has room at its end BESIDE EVERY TAB.
 *
 * THE TABS COME FIRST. A note is a sentence about how to read the row; a tab
 * is a place. So the note takes no room a tab would need: it is drawn only
 * where every tab fits with it, and gives way before a single tab folds. A
 * note measured at no width is one the page is not drawing, and has nothing
 * to fit.
 */
export function noteFits({
  widths,
  space,
  gap,
  note,
}: {
  widths: readonly number[];
  space: number;
  gap: number;
  note: number;
}): boolean {
  if (note <= 0) return false;
  const tabs = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1);
  return tabs + gap + note <= space;
}

/** What a folding row draws: the values that live in "More", and whether its note is shown. */
export interface Fold {
  folded: readonly string[];
  note: boolean;
}

const NOTHING_FOLDED: Fold = { folded: [], note: true };

const px = (value: string) => parseFloat(value) || 0;
const widthOf = (el: Element | null) => (el ? el.getBoundingClientRect().width : 0);

/**
 * The fold of a row, MEASURED after layout and again whenever the row or
 * anything in it changes size: a count arriving, a web font replacing its
 * fallback, a density step.
 *
 * A folded tab STAYS IN THE DOCUMENT, out of the flow and invisible, so its
 * width is known when the row grows again; "More" and the note are always in
 * the document for the same reason. `box` is the element whose inner width is
 * the room the row has; `row` holds the tabs. They are one element for a row
 * of links, and two for a tab list, which holds tabs alone and leaves "More"
 * beside it, where the box's own gap and the row's chrome are counted too.
 */
export function useFold(
  enabled: boolean,
  box: RefObject<HTMLElement | null>,
  row: RefObject<HTMLElement | null>,
  values: readonly string[],
  current: string | undefined,
  /** Anything else that moves the room the row has, such as actions arriving beside it. */
  layout: unknown = null,
): Fold {
  const [fold, setFold] = useState<Fold>(NOTHING_FOLDED);
  const signature = values.join('\n');
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = row.current;
    if (!enabled || !outer || !inner) return;
    const keys = signature === '' ? [] : signature.split('\n');
    const measure = () => {
      const boxStyle = getComputedStyle(outer);
      let space = outer.clientWidth - px(boxStyle.paddingLeft) - px(boxStyle.paddingRight);
      const rowStyle = getComputedStyle(inner);
      const gap = px(rowStyle.columnGap);
      let more = widthOf(outer.querySelector('[data-tabs-more]'));
      if (inner !== outer) {
        // The row's own border and padding, and the box's gap where it is not
        // the row's: both stand between the tabs and "More".
        space -=
          px(rowStyle.paddingLeft) +
          px(rowStyle.paddingRight) +
          px(rowStyle.borderLeftWidth) +
          px(rowStyle.borderRightWidth);
        more += px(boxStyle.columnGap) - gap;
      }
      const trailing = outer.querySelector('[data-tabs-trailing]');
      if (trailing) space -= widthOf(trailing) + gap;
      const widths = [...inner.querySelectorAll('.crewlet-tabs__tab')].map(widthOf);
      const next = foldTabs({ widths, current: current ? keys.indexOf(current) : -1, space, gap, more })
        .map((i) => keys[i])
        .filter((key): key is string => key !== undefined);
      const note = noteFits({ widths, space, gap, note: widthOf(outer.querySelector('[data-tabs-note]')) });
      setFold((was) =>
        was.note === note && was.folded.join('\n') === next.join('\n') ? was : { folded: next, note },
      );
    };
    measure();
    // FEATURE-CHECKED, as the slider's is: jsdom and older embedded browsers
    // have no ResizeObserver, and the row is still drawn, whole, without one.
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(measure);
    watch.observe(outer);
    for (const item of outer.querySelectorAll(
      '.crewlet-tabs__tab, [data-tabs-more], [data-tabs-note], [data-tabs-trailing]',
    )) {
      watch.observe(item);
    }
    return () => watch.disconnect();
  }, [enabled, box, row, signature, current, layout]);
  return enabled ? fold : NOTHING_FOLDED;
}
