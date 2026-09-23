import { useCallback, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';

/** What moved the reading: a pointer over the plot, or a key on the focused plot. */
export type ChartHoverSource = 'pointer' | 'keyboard';

export interface ChartHover {
  /**
   * The mark being read, as an index into the chart's own marks, or null when
   * nothing is. Always inside `0..count-1`: a push that shortens the data
   * clamps it to the last mark rather than pointing past the end.
   */
  active: number | null;
  /** What put `active` there, or null when nothing is being read. */
  source: ChartHoverSource | null;
  /**
   * Point at a mark, or at nothing, from a pointer. A chart calls it from its
   * own pointer handler, because only the chart knows which mark lies under a
   * position: a column chart per column, a time series by nearest instant.
   */
  point: (index: number | null) => void;
  /**
   * Spread on the ONE focusable element that holds the plot. It is what takes
   * the keys, and what ends a reading when focus or the pointer leaves it.
   */
  plotProps: {
    tabIndex: 0;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
    onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  };
}

/**
 * The reading layer every chart here shares: which mark a reader is on, moved
 * by a pointer or by the keyboard, and dismissed by Escape.
 *
 * THE KEYBOARD IS NOT AN AFTERTHOUGHT OF THE POINTER. A tooltip a mouse alone
 * can open is a figure a keyboard reader cannot read, so the plot is ONE tab
 * stop and ←/→ walk its marks (Home and End jump to the ends). The first key on
 * a plot nobody has read yet opens where that key points: ← and End at the last
 * mark, which is "now" on every chart this kit draws, → and Home at the first.
 * After that a key moves from where the reading stands, and it stops at an end
 * rather than wrapping: a time axis does not come round again.
 *
 * ESCAPE CLOSES THE READING AND ONLY THAT. It stops at the plot when it closed
 * something, so a chart inside a dialog does not take the dialog down with its
 * tooltip; with nothing open it passes through untouched. The place is
 * remembered, so the next arrow reopens where the reader left off rather than
 * throwing them back to an end.
 *
 * A READING ENDS WHERE ITS READER LEFT. Focus leaving the plot ends any
 * reading. The pointer leaving ends a POINTER reading only: a keyboard reader
 * whose mouse happens to drift off the card has not stopped reading.
 *
 * It holds an index and nothing else. What an index MEANS (a column, an
 * instant) and where its tooltip stands are the chart's, so this never
 * measures anything and never draws anything.
 */
export function useChartHover(count: number): ChartHover {
  const [reading, setReading] = useState<{ index: number | null; source: ChartHoverSource | null }>({
    index: null,
    source: null,
  });
  // Where the last reading stood, kept through a close so a key can resume it.
  const remembered = useRef<number | null>(null);

  const clamp = (index: number) => Math.min(Math.max(index, 0), count - 1);
  const active = reading.index == null || count === 0 ? null : clamp(reading.index);

  const open = useCallback((index: number | null, source: ChartHoverSource) => {
    if (index != null) remembered.current = index;
    setReading(index == null ? { index: null, source: null } : { index, source });
  }, []);

  const point = useCallback((index: number | null) => open(index, 'pointer'), [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      if (active == null) return;
      event.preventDefault();
      event.stopPropagation();
      open(null, 'keyboard');
      return;
    }
    if (count === 0) return;
    const from = active ?? (remembered.current == null ? null : clamp(remembered.current));
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        // Closed, a key reopens where the reading was before it moves anything.
        next = from == null ? count - 1 : active == null ? from : from - 1;
        break;
      case 'ArrowRight':
        next = from == null ? 0 : active == null ? from : from + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    open(clamp(next), 'keyboard');
  };

  const onBlur = () => {
    if (reading.index != null) open(null, 'keyboard');
  };

  const onPointerLeave = () => {
    if (reading.source === 'pointer') open(null, 'pointer');
  };

  return {
    active,
    source: active == null ? null : reading.source,
    point,
    plotProps: { tabIndex: 0, onKeyDown, onBlur, onPointerLeave },
  };
}
