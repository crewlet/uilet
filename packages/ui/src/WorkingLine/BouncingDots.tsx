import { cx } from '../utils/cx.js';

/**
 * Three small dots bouncing in turn, in the ink around them: somebody typing,
 * or agents at work. Decoration only; the words beside them say what is
 * happening. Still under reduced motion.
 */
export function BouncingDots({ className }: { className?: string | undefined }) {
  return (
    <span className={cx('crewlet-bouncing-dots', className)} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
