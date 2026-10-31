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
 * THE STYLESHEET SAYS HOW LONG. The wait is for the motion actually running
 * (`getAnimations()`), whatever the stylesheet set it to, rather than for a
 * duration written again here: a copy of the duration is a second number that
 * drifts from the first. A motion replaced mid way (a transition retargeted,
 * or reversed by a reopen) is waited out in its turn.
 *
 * AND IT WAITS ONLY FOR ITS OWN MOTION (`MotionOwnership`): the transitions on
 * the element ITSELF, and the keyframes the surface names, wherever they run
 * under it. Never a motion something else inside it happens to run (a meter
 * filling, a badge arriving), which would hold a rail inert for as long as
 * the meter took; never a paused one, which would hold it for ever; never an
 * endless one (a pulse). And never longer than the motion's own remaining
 * time and a margin, so a tab hidden mid motion, where a browser may not
 * report the end until it is seen again, still settles.
 *
 * NOTHING WAITS WHERE NOTHING MOVES. Under `prefers-reduced-motion: reduce`,
 * where no motion of its own runs, and where the Web Animations API is
 * missing, the change goes straight through in the same commit, before any
 * paint.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';
import { motion as motionTokens } from '@crewlethq/tokens';
import { REDUCED_MOTION_QUERY, useMediaMatch } from '../MediaMatch/index.js';
import { returnFocus } from '../utils/focusModality.js';
import { tokenMs } from '../utils/tokenMs.js';

/** Which motions are a surface's own: the ones its presence waits for. */
export interface MotionOwnership {
  /**
   * The transitions on the element ITSELF, by property: `width`, for a
   * column that eases its width. Left out, any transition on the element
   * itself. A transition on an element inside it is never its own.
   */
  transitions?: readonly string[] | undefined;
  /**
   * The keyframes that are part of the motion, by name, wherever they run
   * under the element: a rail's words fading in while its edge moves. Left
   * out, none.
   */
  animations?: readonly string[] | undefined;
}

/**
 * The grace a wait allows past the motion's own end before it stops waiting
 * to be told: the fast step, a little over a frame at any refresh rate.
 */
const MOTION_MARGIN_MS = tokenMs(motionTokens.duration.fast);

function transitionProperty(animation: Animation): string | null {
  const property = (animation as { transitionProperty?: unknown }).transitionProperty;
  return typeof property === 'string' ? property : null;
}

function animationName(animation: Animation): string | null {
  const name = (animation as { animationName?: unknown }).animationName;
  return typeof name === 'string' ? name : null;
}

function targetOf(animation: Animation): Element | null {
  const effect = animation.effect as KeyframeEffect | null;
  return effect && 'target' in effect ? effect.target : null;
}

/**
 * The motions of its own running on an element that will end (see
 * `MotionOwnership`): playing, not paused, not endless, and its own.
 */
export function runningMotion(element: Element, owned: MotionOwnership = {}): Animation[] {
  if (typeof element.getAnimations !== 'function') return [];
  const names = owned.animations ?? [];
  return element.getAnimations({ subtree: names.length > 0 }).filter((animation) => {
    if (animation.playState !== 'running') return false;
    const end = animation.effect?.getComputedTiming().endTime;
    if (typeof end !== 'number' || !Number.isFinite(end)) return false;
    const property = transitionProperty(animation);
    if (property !== null) {
      return targetOf(animation) === element && (owned.transitions?.includes(property) ?? true);
    }
    const name = animationName(animation);
    return name !== null && names.includes(name);
  });
}

/** The longest any of these still has to run, in ms. */
function remainingMs(running: readonly Animation[]): number {
  return Math.max(
    0,
    ...running.map((animation) => {
      const end = Number(animation.effect?.getComputedTiming().endTime ?? 0);
      const now = typeof animation.currentTime === 'number' ? animation.currentTime : 0;
      return end - now;
    }),
  );
}

/**
 * Calls `done` once the element's own motion has ended: AT ONCE,
 * synchronously, where none runs, so a caller in a layout effect draws the
 * outcome before the first paint, and never later than that motion's
 * remaining time and a margin. Returns the cancel, which a caller runs when
 * the wait no longer matters (the thing was opened again).
 *
 * A motion cancelled rather than finished (retargeted, reversed) counts as
 * ended, and whatever of its own runs in its place is waited for in turn.
 */
export function afterMotion(element: Element | null, done: () => void, owned: MotionOwnership = {}): () => void {
  let live = true;
  let bound: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    live = false;
    if (bound !== undefined) clearTimeout(bound);
  };
  const finish = () => {
    if (!live) return;
    stop();
    done();
  };
  const wait = () => {
    if (!live) return;
    const running = element ? runningMotion(element, owned) : [];
    if (running.length === 0) {
      finish();
      return;
    }
    if (bound !== undefined) clearTimeout(bound);
    bound = setTimeout(finish, remainingMs(running) + MOTION_MARGIN_MS);
    void Promise.allSettled(running.map((animation) => animation.finished)).then(wait);
  };
  wait();
  return stop;
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

export interface PresenceOptions extends MotionOwnership {
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
  { transitions, animations, instant = false }: PresenceOptions = {},
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

  // The lists by value, so a list written inline does not restart the wait on
  // every render.
  const ownTransitions = transitions?.join(' ');
  const ownAnimations = animations?.join(' ');

  useLayoutEffect(() => {
    if (!moving) return undefined;
    // Only the change this wait was started for: a reopen on the way out has
    // started another, and the state has moved on without it.
    return afterMotion(
      motion.current,
      () => setState((now) => (now.shown === shown ? { ...now, leaving: false, entering: false } : now)),
      {
        transitions: ownTransitions === undefined ? undefined : ownTransitions.split(' ').filter(Boolean),
        animations: ownAnimations === undefined ? undefined : ownAnimations.split(' ').filter(Boolean),
      },
    );
  }, [moving, shown, motion, ownTransitions, ownAnimations]);

  return { present: shown || leaving, leaving, entering };
}
