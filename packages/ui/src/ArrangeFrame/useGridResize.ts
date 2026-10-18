import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { announce } from '../Announcer/index.js';

/** A block's size on a page grid: columns it spans, and rows tall or null for its content's height. */
export interface GridSize {
  columns: number;
  rows: number | null;
}

export interface GridResizeOptions {
  /** What the block is called, for the handle's name and the announcement. */
  name: string;
  size: GridSize;
  /** One row's height in pixels: the step a height snaps to. */
  rowHeight: number;
  minColumns?: number | undefined;
  /** Left out, the grid's own column count. */
  maxColumns?: number | undefined;
  minRows?: number | undefined;
  maxRows?: number | undefined;
  /** False for a block whose height is always its content's (a group): width only. */
  vertical?: boolean | undefined;
  /** A finished resize: a pointer released, a key pressed, or the height fitted. */
  onResize: (next: GridSize) => void;
}

export interface GridResizeHandleProps {
  'aria-label': string;
  'aria-keyshortcuts': string;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}

/**
 * Where the grid's columns fall, measured from the block's own left edge, so
 * a block can draw the guides of the grid it sits on (the page's, or a
 * group's) while it is being resized.
 */
export interface GridGuides {
  left: number;
  width: number;
  columns: number;
  gap: number;
}

interface Drag {
  pointer: number;
  x: number;
  y: number;
  width: number;
  height: number;
  step: number;
  gap: number;
  columns: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The grid a block sits on: its column count, one column's step, the gap, and its content box. */
function gridOf(node: HTMLElement): { columns: number; step: number; gap: number; left: number; width: number } {
  const grid = node.parentElement;
  const own = node.getBoundingClientRect();
  if (!grid) return { columns: 12, step: own.width, gap: 0, left: 0, width: own.width };
  const style = getComputedStyle(grid);
  const tracks = style.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n));
  const gap = parseFloat(style.columnGap) || 0;
  const track = tracks[0] ?? grid.clientWidth / 12;
  const box = grid.getBoundingClientRect();
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  return {
    columns: tracks.length || 12,
    step: track + gap,
    gap,
    left: box.left + padLeft - own.left,
    width: box.width - padLeft - padRight,
  };
}

/**
 * Resizing a block on a page grid by its corner, snapped to whole columns
 * across and whole rows down, with the keyboard doing the same.
 *
 * SNAPPED AS IT MOVES. The block follows the pointer in steps of the grid it
 * sits on, so what the reader sees while dragging is exactly where it will
 * land; nothing reflows after the release. The release reports once, and
 * Escape puts the block back.
 *
 * WIDTH ALONE LEAVES THE HEIGHT TO THE CONTENT. A block whose height fits its
 * content keeps doing so until the pointer has moved down or up by half a
 * row; a sideways drag is a width change and nothing else. A double press on
 * the handle (or Enter) fits the height to the content again.
 *
 * THE ARROW KEYS ON THE HANDLE resize by one column or one row, and every
 * change is said, because a corner that only a pointer can drag is a control
 * nobody on a keyboard has.
 */
export function useGridResize(
  frame: RefObject<HTMLElement | null>,
  { name, size, rowHeight, minColumns = 1, maxColumns, minRows = 2, maxRows = 60, vertical = true, onResize }: GridResizeOptions,
) {
  const [live, setLive] = useState<GridSize | null>(null);
  const [guides, setGuides] = useState<GridGuides | null>(null);
  const drag = useRef<Drag | null>(null);

  const say = useCallback(
    (next: GridSize, columns: number) => {
      const height = next.rows === null ? 'its height fits its content' : `${next.rows * rowHeight} pixels tall`;
      announce(`${name}: ${next.columns} of ${columns} columns wide, ${height}.`);
    },
    [name, rowHeight],
  );

  const cancel = useCallback(() => {
    drag.current = null;
    setLive(null);
    setGuides(null);
  }, []);

  // Escape while dragging puts the block back.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, cancel]);

  const sizeAt = (d: Drag, x: number, y: number): GridSize => {
    const hi = Math.min(maxColumns ?? d.columns, d.columns);
    const columns = clamp(Math.round((d.width + (x - d.x) + d.gap) / d.step), Math.min(minColumns, hi), hi);
    const dy = y - d.y;
    const rows = !vertical
      ? size.rows
      : size.rows === null && Math.abs(dy) < rowHeight / 2
        ? null
        : clamp(Math.round((d.height + dy) / rowHeight), minRows, maxRows);
    return { columns, rows };
  };

  const handleProps: GridResizeHandleProps = {
    'aria-label': `Resize ${name}`,
    'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Enter',
    onPointerDown: (event) => {
      if (event.button !== 0 || !frame.current) return;
      event.preventDefault();
      event.stopPropagation();
      // Capture keeps the moves coming when the pointer leaves the handle. A
      // pointer the browser no longer tracks refuses it, which must not stop
      // the resize: the handle's own moves still arrive.
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Not captured; the resize goes on without it.
      }
      const rect = frame.current.getBoundingClientRect();
      const grid = gridOf(frame.current);
      drag.current = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        width: rect.width,
        height: rect.height,
        step: grid.step,
        gap: grid.gap,
        columns: grid.columns,
      };
      setGuides({ left: grid.left, width: grid.width, columns: grid.columns, gap: grid.gap });
      setLive(size);
    },
    onPointerMove: (event) => {
      const d = drag.current;
      if (!d || d.pointer !== event.pointerId) return;
      const next = sizeAt(d, event.clientX, event.clientY);
      setLive((was) => (was && was.columns === next.columns && was.rows === next.rows ? was : next));
    },
    onPointerUp: (event) => {
      const d = drag.current;
      if (!d || d.pointer !== event.pointerId) return;
      const next = sizeAt(d, event.clientX, event.clientY);
      drag.current = null;
      setLive(null);
      setGuides(null);
      if (next.columns !== size.columns || next.rows !== size.rows) {
        onResize(next);
        say(next, d.columns);
      }
    },
    onPointerCancel: cancel,
    onKeyDown: (event) => {
      if (!frame.current || event.altKey || event.ctrlKey || event.metaKey) return;
      const grid = gridOf(frame.current);
      const hi = Math.min(maxColumns ?? grid.columns, grid.columns);
      const rowsNow = size.rows ?? Math.round(frame.current.getBoundingClientRect().height / rowHeight);
      let next: GridSize | null = null;
      if (event.key === 'ArrowLeft') next = { ...size, columns: clamp(size.columns - 1, Math.min(minColumns, hi), hi) };
      if (event.key === 'ArrowRight') next = { ...size, columns: clamp(size.columns + 1, Math.min(minColumns, hi), hi) };
      if (vertical && event.key === 'ArrowUp') next = { ...size, rows: clamp(rowsNow - 1, minRows, maxRows) };
      if (vertical && event.key === 'ArrowDown') next = { ...size, rows: clamp(rowsNow + 1, minRows, maxRows) };
      if (vertical && event.key === 'Enter') next = { ...size, rows: null };
      if (!next) return;
      event.preventDefault();
      event.stopPropagation();
      if (next.columns === size.columns && next.rows === size.rows) return;
      onResize(next);
      say(next, grid.columns);
    },
    onDoubleClick: () => {
      if (!vertical || size.rows === null) return;
      const next = { ...size, rows: null };
      onResize(next);
      say(next, frame.current ? gridOf(frame.current).columns : 12);
    },
  };

  return { live, guides, handleProps };
}
