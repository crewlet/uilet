import { useSyncExternalStore } from 'react';

/**
 * ONE CLOCK for a whole application.
 *
 * WHY IT IS SHARED. Every relative time on a screen has to agree with every
 * other one, and a component reading its own clock re-renders on its own
 * schedule: that is how "3m ago" ends up next to "2m ago" for the same row.
 * One ticker, one instant, and they all advance together.
 *
 * WHY IT IS A TICKER AT ALL. The screens this replaces baked every relative
 * time at render, so "in 4h" on a schedule and "12s" on a lease were frozen
 * until some unrelated push happened to re-render them. Three row types even
 * carried a timestamp attribute as if a ticker were planned; none existed.
 *
 * It ticks once a second and only while the tab is VISIBLE. A background tab
 * has nobody reading it, and a per-second re-render there is pure battery.
 */

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | 0 = 0;

function tick(): void {
  now = Date.now();
  for (const listener of [...listeners]) listener();
}

function onVisible(): void {
  if (document.visibilityState === 'visible') tick();
}

function start(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') tick();
  }, 1000);
  // A tab coming back from the background is exactly when the clock is most
  // wrong, so re-read it immediately rather than waiting out the interval.
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
}

function stop(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = 0;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    // The last reader leaving takes the interval with it, so a screen with no
    // relative time on it runs no timer at all.
    if (listeners.size === 0) stop();
  };
}

/**
 * The shared instant, in epoch ms, re-rendering the caller once a second.
 *
 * Pass the value DOWN rather than calling this again deeper: two components
 * reading their own clock is the disagreement it exists to prevent.
 */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}

/** The current instant without subscribing, for an event handler or an effect. */
export function currentNow(): number {
  return now;
}
