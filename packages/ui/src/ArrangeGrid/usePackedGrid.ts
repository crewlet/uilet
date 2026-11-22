import { createContext, useLayoutEffect, useRef, type RefObject } from 'react';

/** Whether a board's grids pack their blocks: `ArrangeGrid`'s `pack`, which a group's body follows. */
export const ArrangePackContext = createContext(false);

/** The most row lines a pass lays down: every browser places items on at least 10,000. */
const MAX_TRACKS = 9000;

/** Feet closer than this many row gaps are one row: a smaller step reads as a misalignment. */
const LEVEL_GAPS = 3;

/** Passes that level neighbours' feet; each can only lengthen spans, and one or two settle a board. */
const LEVEL_PASSES = 4;

interface Measured {
  /** Its height with the gap under it. */
  outer: number;
  /** The gap under it. */
  gap: number;
}

/** What a grid's last pass laid out, so a pass over the same blocks lays nothing again. */
interface Laid {
  key: string;
  unit: number;
  spans: number[];
}

const laid = new WeakMap<HTMLElement, Laid>();

/** Frames this hook gave a `min-height`, so a pass never clears one it did not write. */
const stretched = new WeakSet<HTMLElement>();

/** A block's height and the gap under it, or null for a child the grid does not place. */
function measure(el: HTMLElement, scale: number): Measured | null {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') return null;
  const gap = parseFloat(style.marginBlockEnd) || 0;
  return { outer: el.getBoundingClientRect().height / scale + (parseFloat(style.marginBlockStart) || 0) + gap, gap };
}

/**
 * Where a block is laid out, in the grid's own pixels (`scale` is its drawn
 * size over its laid-out size, below 1 in a scaled preview), without the
 * translation a reorder's glide draws it at.
 */
function placed(el: HTMLElement, scale: number) {
  const r = el.getBoundingClientRect();
  const m = /^matrix(3d)?\((.+)\)$/.exec(getComputedStyle(el).transform);
  const v = m ? m[2]!.split(',').map(parseFloat) : [];
  const x = (m?.[1] ? v[12] : v[4]) ?? 0;
  const y = (m?.[1] ? v[13] : v[5]) ?? 0;
  return { top: r.top / scale - y, bottom: r.bottom / scale - y, left: r.left / scale - x, right: r.right / scale - x };
}

/** A frame whose height is its content's; one the reader set a height for keeps it. */
const stretches = (el: HTMLElement) =>
  el.classList.contains('crewlet-arrange-frame') && !el.classList.contains('is-fixed-height');

function writeSpans(items: HTMLElement[], spans: number[]) {
  items.forEach((el, i) => {
    const span = spans[i] ? `span ${spans[i]}` : '';
    if (el.style.gridRowEnd !== span) el.style.gridRowEnd = span;
  });
}

/**
 * Lengthens the span of a block whose foot is a step short of a neighbour's
 * beside it, so the blocks after both start level, as in a row.
 */
function level(items: HTMLElement[], sizes: (Measured | null)[], spans: number[], unit: number, scale: number) {
  for (let pass = 0; pass < LEVEL_PASSES; pass++) {
    const areas = items.map((el, i) => {
      const size = sizes[i];
      if (!size) return null;
      const top = placed(el, scale).top;
      return { top, bottom: top + spans[i]! * unit, step: LEVEL_GAPS * size.gap };
    });
    let longer = false;
    areas.forEach((a, i) => {
      if (!a) return;
      for (const b of areas) {
        if (!b || b === a || b.top >= a.bottom || a.top >= b.bottom) continue;
        const short = b.bottom - a.bottom;
        if (short <= 0 || short >= a.step) continue;
        const span = Math.round((b.bottom - a.top) / unit);
        if (span > spans[i]!) {
          spans[i] = span;
          longer = true;
        }
      }
    });
    if (!longer) return;
    writeSpans(items, spans);
  }
}

/** Lays the blocks at `unit`: spans from their heights, levelled, the lowest ones' gap taken back. Returns the lines used. */
function lay(items: HTMLElement[], sizes: (Measured | null)[], unit: number, spans: number[], scale: number): number {
  sizes.forEach((s, i) => (spans[i] = s ? Math.max(1, Math.round(s.outer / unit)) : 0));
  writeSpans(items, spans);
  level(items, sizes, spans, unit, scale);
  const tops = items.map((el, i) => (spans[i] ? placed(el, scale).top : Infinity));
  const first = Math.min(...tops);
  const ends = tops.map((t, i) => (spans[i] ? Math.round((t - first) / unit) + spans[i]! : 0));
  const lines = Math.max(0, ...ends);
  // Nothing stands under the lowest blocks, so their gap would only lengthen the grid.
  items.forEach((_, i) => {
    if (spans[i] && ends[i] === lines) spans[i] = Math.max(1, spans[i]! - Math.round(sizes[i]!.gap / unit));
  });
  writeSpans(items, spans);
  return lines;
}

/** Puts a grid back in rows: no spans, no stretch, no packed rules. */
function unpack(grid: HTMLElement) {
  grid.removeAttribute('data-packed');
  grid.style.removeProperty('grid-auto-rows');
  laid.delete(grid);
  for (const el of Array.from(grid.children) as HTMLElement[]) {
    el.style.removeProperty('grid-row-end');
    if (stretched.delete(el)) el.style.removeProperty('min-height');
  }
}

/**
 * One pass over a packed grid: each child spans as many fine rows as it is
 * tall (feet a step apart levelled), so the grid's own auto-placement starts
 * the next block under the shortest one it fits beside; then each stretching
 * frame reaches down to the next block in its columns, or the grid's foot.
 * A grid with no box (hidden) is left in rows. Says whether anything changed.
 */
export function packGrid(grid: HTMLElement): boolean {
  if (typeof grid.checkVisibility === 'function' && !grid.checkVisibility()) {
    const was = grid.hasAttribute('data-packed');
    unpack(grid);
    return was;
  }
  const entering = !grid.hasAttribute('data-packed');
  grid.setAttribute('data-packed', '');
  // offsetWidth is a whole pixel, so a ratio within a hundredth of 1 is an unscaled grid.
  const ratio = grid.offsetWidth > 0 ? grid.getBoundingClientRect().width / grid.offsetWidth : 1;
  const scale = !ratio || Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
  const items = Array.from(grid.children).filter((el): el is HTMLElement => el instanceof HTMLElement);
  const before = items.map((el) => `${el.style.gridRowEnd}|${el.style.minHeight}`);
  // Measured at their own heights: a stretch from the last pass would hide a shrink.
  for (const el of items) if (stretched.delete(el)) el.style.removeProperty('min-height');
  const sizes = items.map((el) => measure(el, scale));
  const columns = items.map((el) => {
    const s = getComputedStyle(el);
    return `${s.gridColumnStart}/${s.gridColumnEnd}`;
  });
  const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const key = JSON.stringify([tracks, sizes.map((s) => (s ? Math.round(s.outer * 100) : -1)), columns]);
  const last = laid.get(grid);
  let spans: number[];
  if (last && last.key === key && grid.style.gridAutoRows === `${last.unit}px`) {
    spans = last.spans;
    writeSpans(items, spans);
  } else {
    let unit = 1;
    spans = [];
    grid.style.gridAutoRows = `${unit}px`;
    // A page taller than the line limit takes coarser rows, laid again.
    for (let lines = lay(items, sizes, unit, spans, scale), tries = 0; lines > MAX_TRACKS && tries < 4; tries++) {
      unit = Math.ceil((lines * unit) / MAX_TRACKS);
      grid.style.gridAutoRows = `${unit}px`;
      lines = lay(items, sizes, unit, spans, scale);
    }
    laid.set(grid, { key, unit, spans: spans.slice() });
  }

  const boxes = items.map((el, i) => (sizes[i] ? placed(el, scale) : null));
  const foot = Math.max(...boxes.map((b) => b?.bottom ?? -Infinity));
  items.forEach((el, i) => {
    const box = boxes[i];
    if (!box || !stretches(el)) return;
    let floor = foot;
    for (const other of boxes) {
      if (!other || other === box || other.top < box.bottom - 0.5) continue;
      if (other.left < box.right - 1 && other.right > box.left + 1) floor = Math.min(floor, other.top - sizes[i]!.gap);
    }
    if (floor - box.bottom < 1) return;
    el.style.minHeight = `${floor - box.top}px`;
    stretched.add(el);
  });
  return entering || items.some((el, i) => `${el.style.gridRowEnd}|${el.style.minHeight}` !== before[i]);
}

/**
 * Packs a grid's blocks as a masonry while `on`, in their own order. Content
 * changes are measured before the next paint (a mutation observer), size
 * changes with no DOM change (a narrower page, a grid shown again) at the
 * next frame.
 */
export function usePackedGrid(ref: RefObject<HTMLElement | null>, on: boolean) {
  const pass = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!on || !grid || typeof MutationObserver === 'undefined') return;
    const watched = new Set<Element>();
    let frame = 0;
    let sizes: ResizeObserver | null = null;
    let mutations: MutationObserver | null = null;

    const run = () => {
      packGrid(grid);
      // What this pass wrote is not a change to answer.
      mutations?.takeRecords();
      if (!sizes) return;
      const children = new Set(Array.from(grid.children));
      for (const el of watched) {
        if (children.has(el)) continue;
        sizes.unobserve(el);
        watched.delete(el);
      }
      for (const el of children) {
        if (watched.has(el)) continue;
        sizes.observe(el);
        watched.add(el);
      }
    };
    const next = () => {
      if (frame !== 0 || typeof requestAnimationFrame === 'undefined') return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        run();
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      sizes = new ResizeObserver(next);
      sizes.observe(grid);
    }
    mutations = new MutationObserver(run);
    pass.current = run;
    run();
    mutations.observe(grid, { childList: true, subtree: true, characterData: true, attributes: true });
    window.addEventListener('resize', run);
    return () => {
      pass.current = null;
      mutations?.disconnect();
      sizes?.disconnect();
      if (frame !== 0 && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame);
      window.removeEventListener('resize', run);
      unpack(grid);
    };
  }, [ref, on]);
  // Every render packs before its parents' layout effects run, so a reorder's
  // glide (`useReorderLists`) measures where the blocks will be drawn.
  useLayoutEffect(() => pass.current?.());
}
