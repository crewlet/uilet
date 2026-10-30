/**
 * The grip that sizes a panel standing beside the page: the assistant in the
 * shell's aside, a peek beside a list, a side panel beside an artifact.
 *
 * A SEPARATOR WITH A VALUE. It is `role="separator"` with
 * `aria-orientation="vertical"` and the panel's width as `aria-valuenow`
 * between `aria-valuemin` and `aria-valuemax`, which is the WAI-ARIA window
 * splitter: a screen reader hears what it sizes and where it stands, and the
 * keyboard moves it. The grip it replaces was mouse only, which left a reader
 * without a pointer with whatever width somebody else had dragged.
 *
 * THE KEYS. Left and Right move the edge by `step` (16px), with Shift by
 * `largeStep` (64px); Home and End take the panel to its narrowest and its
 * widest; Enter or a double press puts it back at `defaultValue`. The edge
 * moves the way the arrow points, so on a panel's left edge ArrowLeft widens
 * it and on a right edge it narrows it.
 *
 * THE POINTER. A drag is measured from where it started, not from the
 * window's edge: a panel inside an inset sheet stands a hairline and an inset
 * in from the window, and a width read as `innerWidth - clientX` runs ahead
 * of the hand by exactly that much. The pointer is captured, so a drag that
 * leaves the grip, or the window, keeps sizing until it is released.
 *
 * TWO CALLBACKS, because the two moments are different: `onValueChange` for
 * every step of a drag, to draw it, and `onValueCommit` once, where the
 * gesture ends, to keep it. A preference written on every pointer move is a
 * storage write per frame.
 *
 * Drawn as nothing at rest, a soft accent wash under the pointer, under
 * focus and while dragging, and a 24px target whatever its drawn width.
 */

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { HIT_AREA_CLASS } from '../HitArea/hitArea.js';
import { cx } from '../utils/cx.js';

/** The step an arrow key moves the edge by, in px. */
export const RESIZE_HANDLE_STEP = 16;
/** The step Shift with an arrow key moves it by, in px. */
export const RESIZE_HANDLE_LARGE_STEP = 64;

export interface ResizeHandleProps {
  /** The size the handle controls, in px. */
  value: number;
  /** The narrowest the panel may be, in px. */
  min: number;
  /**
   * The widest, in px. A host that caps the panel so the page beside it
   * keeps its floor passes the cap here, so End and a drag both stop where
   * the panel is actually drawn.
   */
  max: number;
  /** Every change, while it happens: a drag's move, a key's step. */
  onValueChange: (value: number) => void;
  /** Where a gesture ends (a released drag, a key, a reset): the moment to persist. */
  onValueCommit?: ((value: number) => void) | undefined;
  /** The resting size Enter and a double press return to. Without one neither does anything. */
  defaultValue?: number | undefined;
  /** Names the separator: "Resize the Ask Crewlet panel". */
  label: string;
  /**
   * Which edge of the sized panel the handle stands on. On the `left` edge
   * (a panel at the window's right) moving the edge left widens the panel;
   * on the `right` edge (a panel at the left) moving it right does. The
   * shell is drawn left to right throughout, so the edge is physical.
   */
  edge?: 'left' | 'right' | undefined;
  /** The element the handle sizes, by id. */
  controls?: string | undefined;
  /** What the value is read as: "420 pixels". */
  valueText?: ((value: number) => string) | undefined;
  /** The step an arrow key moves the edge by. */
  step?: number | undefined;
  /** The step Shift with an arrow key moves it by. */
  largeStep?: number | undefined;
  className?: string | undefined;
}

/** A width held inside its bounds, in whole pixels. */
export function clampSize(value: number, min: number, max: number): number {
  const ceiling = Math.max(min, max);
  return Math.round(Math.min(ceiling, Math.max(min, value)));
}

export function ResizeHandle({
  value,
  min,
  max,
  onValueChange,
  onValueCommit,
  defaultValue,
  label,
  edge = 'left',
  controls,
  valueText = (px) => `${px} pixels`,
  step = RESIZE_HANDLE_STEP,
  largeStep = RESIZE_HANDLE_LARGE_STEP,
  className,
}: ResizeHandleProps) {
  const now = clampSize(value, min, max);
  const ceiling = Math.max(min, max);
  const [dragging, setDragging] = useState(false);
  // Where the drag started, and the size at that moment. A ref, because every
  // move reads it and none of them should re-render for it.
  const drag = useRef<{ x: number; from: number; last: number; pointer: number } | null>(null);
  // On the left edge the panel grows as the edge moves left, so a movement to
  // the left is a positive change; on the right edge it is the other way.
  const grows = edge === 'left' ? -1 : 1;

  const change = useCallback(
    (next: number, commit: boolean) => {
      const clamped = clampSize(next, min, max);
      if (clamped !== now) onValueChange(clamped);
      if (commit) onValueCommit?.(clamped);
    },
    [max, min, now, onValueChange, onValueCommit],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = event.shiftKey ? largeStep : step;
    switch (event.key) {
      case 'ArrowLeft':
        change(now - by * grows, true);
        break;
      case 'ArrowRight':
        change(now + by * grows, true);
        break;
      case 'Home':
        change(min, true);
        break;
      case 'End':
        change(ceiling, true);
        break;
      case 'Enter':
        if (defaultValue === undefined) return;
        change(defaultValue, true);
        break;
      default:
        return;
    }
    // Answered, so a page key on the same press (an arrow that scrolls, a
    // Home that jumps) does not also act on it.
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // The primary button only: a secondary press opens a context menu, and a
    // drag started by it would follow the pointer until the menu closed.
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = { x: event.clientX, from: now, last: now, pointer: event.pointerId };
    // Captured where the platform can, so a drag that leaves the grip keeps
    // sizing; the guard is for environments without pointer capture.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const next = clampSize(start.from + (event.clientX - start.x) * grows, min, max);
    if (next === start.last) return;
    start.last = next;
    onValueChange(next);
  };

  const end = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    onValueCommit?.(start.last);
  };

  /*
   * A FOCUSABLE SEPARATOR IS A WIDGET. WAI-ARIA 1.2 makes `separator` an
   * interactive role when it can take focus and carries a value (the window
   * splitter pattern), which is what this is; the lint rules below read the
   * role's static, non-focusable meaning only.
   */
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={min}
      aria-valuemax={ceiling}
      aria-valuetext={valueText(now)}
      aria-controls={controls}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
      tabIndex={0}
      className={cx('crewlet-resize-handle', `crewlet-resize-handle--${edge}`, HIT_AREA_CLASS, className)}
      data-dragging={dragging || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={() => {
        if (defaultValue !== undefined) change(defaultValue, true);
      }}
    />
  );
}
