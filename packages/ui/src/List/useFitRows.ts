import { useLayoutEffect, useRef, type RefObject } from 'react';

export interface FitRowsOptions {
  /** Off, every row shows and nothing is measured. */
  enabled?: boolean | undefined;
  /** Hears how many rows show, each time that changes. */
  onFit?: ((shown: number) => void) | undefined;
}

/** A row ending within this much of the box's edge still fits: layout rounds. */
const EDGE = 0.5;

/**
 * How many of a box's rows (its element children) fit inside it whole: every
 * row before the first one its edge would cut.
 */
export function fitRows(box: HTMLElement): number {
  const rows = Array.from(box.children);
  const bottom = box.getBoundingClientRect().top + box.clientTop + box.clientHeight + EDGE;
  const cut = rows.findIndex((row) => row.getBoundingClientRect().bottom > bottom);
  return cut === -1 ? rows.length : cut;
}

function hide(box: HTMLElement, shown: number) {
  Array.from(box.children).forEach((row, i) => {
    // Hidden but still laid out, so the row is measured again as the box grows.
    (row as HTMLElement).style.visibility = i < shown ? '' : 'hidden';
    row.toggleAttribute('data-fit-hidden', i >= shown);
  });
}

const idle = () => {};

/**
 * Shows the rows of `ref`'s box that fit it whole and hides the rest, so no
 * row is ever cut in half, measured again whenever the box, a row or the set
 * of rows changes. The box is held to the room it is given and clips.
 */
export function useFitRows(ref: RefObject<HTMLElement | null>, { enabled = true, onFit }: FitRowsOptions = {}) {
  const heard = useRef(onFit);
  const measure = useRef(idle);
  const last = useRef<number | null>(null);

  // Every render may have changed the rows.
  useLayoutEffect(() => {
    heard.current = onFit;
    measure.current();
  });

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const run = () => {
      const shown = enabled ? fitRows(box) : box.children.length;
      hide(box, shown);
      if (last.current === shown) return;
      last.current = shown;
      heard.current?.(shown);
    };
    measure.current = run;
    run();
    if (!enabled) {
      return () => {
        measure.current = idle;
      };
    }
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run);
    const watch = () => {
      if (!resized) return;
      resized.disconnect();
      resized.observe(box);
      for (const row of Array.from(box.children)) resized.observe(row);
    };
    watch();
    const changed = new MutationObserver(() => {
      watch();
      run();
    });
    changed.observe(box, { childList: true });
    return () => {
      measure.current = idle;
      resized?.disconnect();
      changed.disconnect();
      hide(box, box.children.length);
      last.current = null;
    };
  }, [enabled, ref]);
}
