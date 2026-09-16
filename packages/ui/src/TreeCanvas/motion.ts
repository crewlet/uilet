/**
 * The two motions a chart of cards has, and the one question they both ask
 * first: has the reader asked for less?
 *
 * A CHART ARRIVES RANK BY RANK. Every card at once is a picture that appears;
 * one rank after another, a few dozen milliseconds apart, is a hierarchy being
 * drawn, and the order the eye is walked in (down, then across) is the order
 * the chart is read in afterwards. It runs ONCE, when the chart is first laid
 * out, and never again: a chart that replayed its entrance on every push would
 * be a chart nobody could read while anything was happening.
 *
 * A RELAYOUT MOVES CARDS RATHER THAN REPLACING THEM. Adding a seat re-centres
 * every ancestor over its children and shifts whole subtrees sideways; jumped,
 * the card the operator just made appears somewhere that has nothing to do
 * with where the one they pressed was, and so does everything else. Tweened,
 * the chart is visibly the same chart rearranging, which is the only way the
 * reader keeps their place in it. The canvas's own anchor is the other half of
 * that and is unaffected: it keeps the node acted on STILL ON SCREEN, over the
 * targets, while the cards travel to them.
 *
 * NEITHER RUNS WHEN THE READER HAS ASKED FOR LESS. Both are read through
 * [useStillness], and under `prefers-reduced-motion: reduce` the chart is laid
 * out complete and every relayout is a jump: nothing is hidden, nothing is
 * slower to reach, and no control moves later than it would have.
 *
 * WHY IT IS JAVASCRIPT AND NOT CSS. A card's position is a transform the
 * layout computes, and a CSS transition on it would fire on the first paint of
 * every card the measurement pass adds, which is the entrance played twice at
 * two speeds. The tween is over the layout's own numbers, so a frame is a
 * position rather than a promise about one, and the connectors are recomputed
 * from those same numbers: a line that did not travel with its cards would
 * spend the whole relayout pointing at where a card used to be.
 */

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ForestLayout, PlacedNode } from '../Tree/index.js';

/** How far apart two cards are revealed, in milliseconds. */
export const ENTRANCE_STEP_MS = 60;

/** How long a relayout takes to move every card from where it was to where it is. */
export const REFLOW_MS = 350;

/**
 * How far apart two cards' tops may be and still count as one row.
 *
 * On shared ranks a rank is one band and a card shorter than the band is
 * centred in it, so two cards on one rank differ in y by half the difference
 * in their heights. The reveal follows what a reader sees as a row rather than
 * what the arithmetic makes of it.
 */
const ROW_TOLERANCE = 5;

/** The order cards are revealed in: down the chart, then across each row. */
export function entranceOrder(layout: ForestLayout): string[] {
  const row = (one: PlacedNode) => Math.round(one.y / ROW_TOLERANCE);
  // Ties broken on the id, so the order is the same on every engine: a
  // comparator that answers "equal" leaves the rest to the sort's stability,
  // and the layout's own order is pre-order rather than left to right.
  return [...layout.nodes]
    .sort((a, b) => row(a) - row(b) || a.x - b.x || (a.id < b.id ? -1 : 1))
    .map((one) => one.id);
}

/** Whether the reader has asked for less motion, and again whenever that changes. */
export function useStillness(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', notify);
    return () => list.removeEventListener('change', notify);
  }, []);
  const read = useCallback(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false,
    [],
  );
  // On a server, and anywhere the query cannot be asked, the answer is the one
  // that draws everything: a chart nobody can see the motion of is still a
  // chart that has to be complete.
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * The cards revealed so far, or `null` once the chart is whole.
 *
 * `null` rather than "every id" so a caller has one cheap answer for the state
 * a chart is in for all but its first second, and never walks a set per card
 * per render for the rest of its life.
 */
export function useEntrance(layout: ForestLayout | null, still: boolean): ReadonlySet<string> | null {
  const [shown, setShown] = useState<ReadonlySet<string> | null>(null);
  const started = useRef(false);
  // Read through a ref: the layout's IDENTITY changes each time another card
  // is measured, and an entrance restarted by that is a chart that flickers
  // its way in instead of arriving once.
  const latest = useRef(layout);
  latest.current = layout;
  const ready = layout !== null && layout.nodes.length > 0;

  useLayoutEffect(() => {
    if (!ready || started.current) return undefined;
    started.current = true;
    if (still) return undefined;
    const order = entranceOrder(latest.current!);
    setShown(new Set());
    const timers = order.map((id, at) =>
      setTimeout(() => {
        setShown((was) => (was === null ? was : new Set([...was, id])));
      }, at * ENTRANCE_STEP_MS),
    );
    // One step past the last card, so the last reveal has begun before the
    // whole thing is handed over to the "chart is whole" answer.
    const whole = setTimeout(() => setShown(null), (order.length + 1) * ENTRANCE_STEP_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(whole);
    };
  }, [ready, still]);

  return shown;
}

/** easeInOutQuad: the acceleration a chart rearranging reads as one movement. */
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * The layout as it is DRAWN this frame: the target, or a point on the way to
 * it while a relayout is travelling.
 *
 * The bounds are the target's throughout, so the canvas neither grows nor
 * shrinks under a pan while the cards move: what is scrollable is where the
 * chart is going to be.
 */
export function useReflow(layout: ForestLayout | null, still: boolean): ForestLayout | null {
  const [drawn, setDrawn] = useState<ForestLayout | null>(null);
  const shown = useRef(new Map<string, { x: number; y: number }>());
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (layout === null) return undefined;
    const cancel = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    cancel();
    const record = (nodes: readonly PlacedNode[]) => {
      shown.current = new Map(nodes.map((one) => [one.id, { x: one.x, y: one.y }]));
    };
    const from = shown.current;
    // A card that was not on the chart before has nowhere to travel from, so a
    // relayout that only ADDS cards is not a movement and is not tweened.
    const moves = layout.nodes.some((one) => {
      const was = from.get(one.id);
      return was !== undefined && (was.x !== one.x || was.y !== one.y);
    });
    if (still || !moves || typeof requestAnimationFrame !== 'function') {
      record(layout.nodes);
      setDrawn(layout);
      return undefined;
    }
    const start = new Map(from);
    const began = performance.now();
    const tick = (now: number) => {
      const through = ease(Math.min((now - began) / REFLOW_MS, 1));
      const nodes = layout.nodes.map((one) => {
        const was = start.get(one.id);
        if (was === undefined) return one;
        return { ...one, x: was.x + (one.x - was.x) * through, y: was.y + (one.y - was.y) * through };
      });
      record(nodes);
      setDrawn({ nodes, byId: new Map(nodes.map((one) => [one.id, one])), bounds: layout.bounds });
      frame.current = through < 1 ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
    return cancel;
  }, [layout, still]);

  return drawn;
}
