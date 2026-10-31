/**
 * A motion token as a number of milliseconds, for a delay or a bound that
 * JavaScript has to count (`tokenMs(motion.duration.fast)`). The tokens are
 * written in ms (`120ms`), so the number is the token's own, never a copy.
 */
export function tokenMs(value: string): number {
  return Number.parseFloat(value);
}
