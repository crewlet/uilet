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

interface Fitting {
  box: HTMLElement;
  run: () => void;
  stop: () => void;
}

/** Fits `box` now, and again whenever it, a row or the set of rows changes. */
function fit(box: HTMLElement, heard: RefObject<FitRowsOptions['onFit']>): Fitting {
  let last: number | null = null;
  const run = () => {
    const shown = fitRows(box);
    hide(box, shown);
    if (last === shown) return;
    last = shown;
    heard.current?.(shown);
  };
  const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run);
  const watch = () => {
    if (!resized) return;
    resized.disconnect();
    resized.observe(box);
    for (const row of Array.from(box.children)) resized.observe(row);
  };
  const changed = new MutationObserver(() => {
    watch();
    run();
  });
  watch();
  changed.observe(box, { childList: true });
  run();
  return {
    box,
    run,
    stop: () => {
      resized?.disconnect();
      changed.disconnect();
      hide(box, box.children.length);
    },
  };
}

/**
 * Shows the rows of `ref`'s box that fit it whole and hides the rest, so no
 * row is ever cut in half, measured again whenever the box, a row or the set
 * of rows changes. The box is held to the room it is given and clips. Nothing
 * may size a row by whether it is hidden, or a row on the edge refits forever.
 */
export function useFitRows(ref: RefObject<HTMLElement | null>, { enabled = true, onFit }: FitRowsOptions = {}) {
  const heard = useRef(onFit);
  const fitting = useRef<Fitting | null>(null);

  // Every render: the rows may have changed, and so may the box (a list drawn
  // after its owner, or drawn anew), which a ref only shows by holding it.
  useLayoutEffect(() => {
    heard.current = onFit;
    const box = enabled ? ref.current : null;
    if (fitting.current?.box === box) {
      fitting.current?.run();
      return;
    }
    fitting.current?.stop();
    fitting.current = box ? fit(box, heard) : null;
  });

  useLayoutEffect(
    () => () => {
      fitting.current?.stop();
      fitting.current = null;
    },
    [],
  );
}
