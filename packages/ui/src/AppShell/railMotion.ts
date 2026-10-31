/**
 * How the rail moves between its two shapes.
 *
 * THE STYLESHEET MOVES IT, THIS DECIDES THE ORDER. The rail's width eases
 * between the full rail and the compact column (AppShell.css), and its
 * content is laid out at the width of the shape drawn, clipped by the moving
 * edge, so nothing in it rewraps at a width it will never rest at. What the
 * stylesheet cannot decide is WHEN the content changes shape, because the
 * application draws a different tree for each one:
 *
 * - UNFOLDING, the full rail is drawn at once, and the moving edge uncovers
 *   it while its words fade in (`unfold`).
 * - FOLDING, the full rail stays drawn while the edge narrows over it and its
 *   words fade out (`fold`), and the compact column is drawn once they are
 *   gone, fading in while the edge settles (`folded`). Drawn at once instead,
 *   the column would replace the words before the reader saw them go.
 *
 * NOTHING MOVES WHERE NOTHING ANIMATES. The phases last as long as the rail's
 * own transition, read from the computed style, so under reduced motion
 * (where the stylesheet takes the transition away) and wherever no stylesheet
 * is loaded the new shape is drawn in the same commit, before any paint.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';
import type { AppShellRailShape } from './railShape.js';

/**
 * Where a change of shape is: `fold` while the rail narrows over the full
 * rail's fading words, `folded` while the compact column fades in after it,
 * and `unfold` while the rail widens and the full rail's words fade in.
 */
export type AppShellRailMotion = 'fold' | 'folded' | 'unfold';

/**
 * The keyframes the full rail's words fade out by while it folds, and the
 * ones the compact column fades in by after (AppShell.css). Named here
 * because the event that reports the end of an animation names it, and each
 * ends its own phase.
 *
 * A FOLD ENDS WHEN THE WORDS ARE GONE, not when the edge stops: the edge
 * decelerates, and it has covered nearly all its way by the time the words
 * have faded, so waiting for its last pixels left an empty column between
 * the words going and the compact places arriving.
 */
export const RAIL_FADE_ANIMATION = 'crewlet-app-shell-rail-fade';
export const RAIL_SETTLE_ANIMATION = 'crewlet-app-shell-rail-settle';

/** A computed list of CSS times (`0.3s, 120ms`), in ms. */
function cssTimes(list: string): number[] {
  return list.split(',').map((part) => {
    const value = Number.parseFloat(part);
    if (!Number.isFinite(value)) return 0;
    return part.trim().endsWith('ms') ? value : value * 1000;
  });
}

/**
 * The longest transition an element runs, in whole ms, its delay included: 0
 * where it runs none. A list shorter than another repeats, as the cascade
 * repeats it.
 *
 * A REDUCED-MOTION BASELINE IS NONE. The document baseline stops motion by
 * setting every transition to `none` over a hundredth of a millisecond rather
 * than to no duration at all, so a property of `none` counts for nothing, and
 * a duration under half a millisecond rounds to none.
 */
export function transitionMs(element: Element): number {
  const style = getComputedStyle(element);
  const properties = style.transitionProperty.split(',').map((part) => part.trim());
  const durations = cssTimes(style.transitionDuration);
  const delays = cssTimes(style.transitionDelay);
  const longest = durations.reduce((most, duration, index) => {
    if (properties[index % properties.length] === 'none') return most;
    return Math.max(most, duration + (delays[index % delays.length] ?? 0));
  }, 0);
  return Math.round(longest);
}

interface RailMotionState {
  target: AppShellRailShape;
  moves: boolean;
  motion: AppShellRailMotion | null;
}

/**
 * The shape to draw the rail's content in, and the phase of the change under
 * way, for a rail whose chosen shape is `target`.
 *
 * `moves` is whether a change may animate at all: never in the drawer, where
 * the rail is always the full list and a shape is not a width. A change that
 * arrives WITH the window crossing into the wide layout does not animate
 * either: the reader resized a window, they did not fold a rail.
 */
export function useRailMotion(
  target: AppShellRailShape,
  moves: boolean,
  rail: RefObject<HTMLElement | null>,
): { drawn: AppShellRailShape; motion: AppShellRailMotion | null } {
  const [state, setState] = useState<RailMotionState>({ target, moves, motion: null });

  /*
   * THE PHASE STARTS IN THE RENDER THAT CHANGES THE SHAPE, not in an effect
   * after it: started a commit later, a fold would mount the compact tree and
   * then put the full one back, running every effect the application's
   * compact rail has for nothing.
   */
  let current = state;
  if (state.target !== target || state.moves !== moves) {
    let motion: AppShellRailMotion | null = null;
    if (moves && state.target === target) motion = state.motion;
    else if (moves && state.moves) motion = target === 'compact' ? 'fold' : 'unfold';
    current = { target, moves, motion };
    setState(current);
  }
  const { motion } = current;

  useLayoutEffect(() => {
    if (motion === null) return undefined;
    const element = rail.current;
    const ms = element ? transitionMs(element) : 0;
    const next: AppShellRailMotion | null = motion === 'fold' ? 'folded' : null;
    // Only from the phase this effect was started for: a press during a fold
    // has started a phase of its own, and this one is no longer the rail's.
    const advance = (to: AppShellRailMotion | null) =>
      setState((now) => (now.motion === motion ? { ...now, motion: to } : now));
    if (!element || ms === 0) {
      // Nothing animates: the destination is drawn before the first paint.
      advance(null);
      return undefined;
    }
    /*
     * THE EVENT ENDS A PHASE, AND THE CLOCK ENDS IT WHERE NONE COMES: a rail
     * whose two widths are the same runs no transition and reports no end,
     * and a reader whose tab is hidden is sent no events at all. The clock is
     * the rail's own transition, the longest any phase lasts.
     */
    const timer = window.setTimeout(() => advance(next), ms);
    const onTransitionEnd = (event: TransitionEvent) => {
      if (motion === 'unfold' && event.target === element && event.propertyName === 'width') advance(next);
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === (motion === 'fold' ? RAIL_FADE_ANIMATION : RAIL_SETTLE_ANIMATION)) advance(next);
    };
    element.addEventListener('transitionend', onTransitionEnd);
    element.addEventListener('animationend', onAnimationEnd);
    return () => {
      window.clearTimeout(timer);
      element.removeEventListener('transitionend', onTransitionEnd);
      element.removeEventListener('animationend', onAnimationEnd);
    };
  }, [motion, rail]);

  return { drawn: motion === 'fold' ? 'full' : target, motion };
}
