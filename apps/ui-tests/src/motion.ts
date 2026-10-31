import { act } from '@testing-library/react';

/**
 * MOTION A SUITE STARTS AND ENDS BY HAND: the Web Animations API, in jsdom.
 *
 * jsdom runs no transition and has no `getAnimations()`, so a component that
 * waits on the motion actually running (`usePresence`) sees none and goes
 * straight through, which is right for every suite that is not about motion
 * and leaves the waiting itself untested. `driveMotion` gives one element a
 * `getAnimations()` that answers with the motions the suite has started and
 * not yet ended, each with the `finished` promise a browser's has.
 */

/** One motion a suite has started. */
export interface DrivenMotion {
  /** Ends it as a browser does when it runs to its end. */
  finish(): void;
  /** Ends it as a browser does when it is replaced or reversed. */
  cancel(): void;
}

export interface MotionDriver {
  /**
   * Starts a motion on the element. `endTime` Infinity is an endless one (a
   * pulse); `during` keeps it running only while it answers true, as a
   * stylesheet animates only while a rule matches.
   */
  start(options?: { endTime?: number; during?: () => boolean }): DrivenMotion;
}

interface FakeAnimation {
  playState: AnimationPlayState;
  effect: { getComputedTiming: () => { endTime: number } };
  finished: Promise<void>;
  during: () => boolean;
}

export function driveMotion(element: Element): MotionDriver {
  const started: FakeAnimation[] = [];
  Object.defineProperty(element, 'getAnimations', {
    configurable: true,
    value: () => started.filter((animation) => animation.playState === 'running' && animation.during()),
  });
  return {
    start({ endTime = 200, during = () => true } = {}) {
      let resolve: () => void = () => {};
      let reject: (reason: unknown) => void = () => {};
      const finished = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      // A cancelled motion's promise rejects; nothing has to hear it.
      finished.catch(() => {});
      const animation: FakeAnimation = {
        playState: 'running',
        effect: { getComputedTiming: () => ({ endTime }) },
        finished,
        during,
      };
      started.push(animation);
      return {
        finish: () => {
          animation.playState = 'finished';
          resolve();
        },
        cancel: () => {
          animation.playState = 'idle';
          reject(new DOMException('The motion was replaced.', 'AbortError'));
        },
      };
    },
  };
}

/** Lets the promises an ended motion settles run, and React draw what they decide. */
export async function settleMotion(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

/**
 * Answers the reader's motion preference for every media query the suite's
 * components ask, and the width question as wide.
 */
export function preferReducedMotion(reduce: boolean): () => void {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return () => {
    if (had) Object.defineProperty(globalThis, 'matchMedia', had);
    else delete (globalThis as Record<string, unknown>).matchMedia;
  };
}
