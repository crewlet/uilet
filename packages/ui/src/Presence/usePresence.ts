/**
 * Keeps something drawn while it leaves, and says when it has arrived.
 *
 * A SURFACE THAT EASES SHUT HAS TO STAY DRAWN UNTIL IT IS SHUT. Unmounted the
 * moment it is closed, a column that eases its width to nothing eases an
 * empty box, and the reader sees its content vanish before the motion they
 * asked for has begun. So the content is kept for as long as the motion runs,
 * and INERT all the while: it is on its way out, and nothing in it may take
 * focus, a press or a screen reader's attention.
 *
 * THE STYLESHEET SAYS HOW LONG. The wait is for the animations and the
 * transitions actually running on the element (`getAnimations()`), whatever
 * the stylesheet set them to, rather than for a duration written again here:
 * a copy of the duration is a second number that drifts from the first. A
 * motion replaced mid way (a transition retargeted, or reversed by a reopen)
 * is waited out in its turn, and an endless one (a pulse) is never waited for.
 *
 * NOTHING WAITS WHERE NOTHING MOVES. Under `prefers-reduced-motion: reduce`,
 * where no motion runs, and where the Web Animations API is missing, the
 * change goes straight through in the same commit, before any paint.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';
import { REDUCED_MOTION_QUERY, useMediaMatch } from '../MediaMatch/index.js';
import { returnFocus } from '../utils/focusModality.js';

/**
 * The animations and transitions running on an element (and, with `subtree`,
 * inside it) that will end: an endless one, such as a status dot's pulse, is
 * left out, because waiting for it is waiting for ever.
 */
export function runningMotion(element: Element, subtree = false): Animation[] {
  if (typeof element.getAnimations !== 'function') return [];
  return element.getAnimations({ subtree }).filter((animation) => {
    if (animation.playState === 'finished' || animation.playState === 'idle') return false;
    const end = animation.effect?.getComputedTiming().endTime;
    return typeof end === 'number' && Number.isFinite(end);
  });
}

/**
 * Calls `done` once every motion running on `element` has ended: AT ONCE,
 * synchronously, where none runs, so a caller in a layout effect draws the
 * outcome before the first paint. Returns the cancel, which a caller runs
 * when the wait no longer matters (the thing was opened again).
 *
 * A motion cancelled rather than finished (retargeted, reversed) counts as
 * ended, and whatever runs in its place is waited for in turn.
 */
export function afterMotion(element: Element | null, done: () => void, subtree = false): () => void {
  let live = true;
  const wait = () => {
    if (!live) return;
    const running = element ? runningMotion(element, subtree) : [];
    if (running.length === 0) {
      done();
      return;
    }
    void Promise.allSettled(running.map((animation) => animation.finished)).then(wait);
  };
  wait();
  return () => {
    live = false;
  };
}

/**
 * Takes focus out of something that is about to turn inert, as it starts to
 * leave: to `target` where the host names one (the control that brings it
 * back), and otherwise off the element that held it.
 *
 * FOCUS IS NEVER LEFT INSIDE WHAT IS LEAVING. An inert element cannot hold
 * focus, and a browser that blurs it hands the reader to the top of the
 * document, with no telling where Tab goes next; one that does not leaves a
 * keyboard reader typing into a panel that takes nothing. Does nothing when
 * focus is elsewhere: a reader who has moved on is not pulled back.
 */
export function releaseFocus(container: Element | null, target?: HTMLElement | null): void {
  const held = container?.ownerDocument.activeElement;
  if (!container || !(held instanceof HTMLElement) || !container.contains(held)) return;
  if (target?.isConnected && !container.contains(target) && returnFocus(target)) return;
  held.blur();
}

export interface PresenceOptions {
  /**
   * Waits for the motion inside the element as well as its own: a rail whose
   * words fade while its edge moves. Off by default, which waits for the
   * element's own transition alone, the one a column's width eases by.
   */
  subtree?: boolean | undefined;
  /**
   * Makes this change instant: the host knows it is not one the reader made
   * (a window resized across a breakpoint), so nothing waits for it.
   */
  instant?: boolean | undefined;
}

export interface Presence {
  /** Whether to draw it: while it is shown, and while it leaves. */
  present: boolean;
  /** Drawn only to finish leaving: make it `inert`. */
  leaving: boolean;
  /**
   * Shown again (never on the first draw) and its motion still running: the
   * window a stylesheet scopes an entrance to, so the first paint of a page
   * plays none.
   */
  entering: boolean;
}

interface PresenceState {
  shown: boolean;
  leaving: boolean;
  entering: boolean;
}

/**
 * Whether to draw something that is `shown`, and whether it is on its way in
 * or out, waiting on the motion running on `motion`'s element.
 *
 * The element to wait on is the one the stylesheet moves: a column easing its
 * width, or a rail. It can be the same element the content stands in or an
 * ancestor of it; it is never the content itself, which is gone once it has
 * left.
 */
export function usePresence(
  shown: boolean,
  motion: RefObject<Element | null>,
  { subtree = false, instant = false }: PresenceOptions = {},
): Presence {
  const still = useMediaMatch(REDUCED_MOTION_QUERY) || instant;
  const [state, setState] = useState<PresenceState>({ shown, leaving: false, entering: false });

  /*
   * THE CHANGE IS READ IN THE RENDER THAT MAKES IT, not in an effect after
   * it: read a commit later, the content would be unmounted and mounted again
   * on the way out, running every effect it has for nothing.
   */
  let current = state;
  if (state.shown !== shown) current = { shown, leaving: !shown && !still, entering: shown && !still };
  // A reader who asks for less motion mid way ends the motion there.
  if (still && (current.leaving || current.entering)) current = { ...current, leaving: false, entering: false };
  if (current !== state) setState(current);
  const { leaving, entering } = current;
  const moving = leaving || entering;

  useLayoutEffect(() => {
    if (!moving) return undefined;
    // Only the change this wait was started for: a reopen on the way out has
    // started another, and the state has moved on without it.
    return afterMotion(
      motion.current,
      () => setState((now) => (now.shown === shown ? { ...now, leaving: false, entering: false } : now)),
      subtree,
    );
  }, [moving, shown, motion, subtree]);

  return { present: shown || leaving, leaving, entering };
}
