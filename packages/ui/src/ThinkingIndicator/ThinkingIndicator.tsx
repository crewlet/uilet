import type { HTMLAttributes } from 'react';
import { ProductMark } from '@crewlethq/icons/product-mark';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

export interface ThinkingIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * What the assistant is doing now, beside the mark, under a slow shimmer:
   * "Thinking", then the step that runs ("Listing the agents"). Left out, the
   * mark stands alone, as it does while an answer's words arrive.
   */
  status?: string | undefined;
  /**
   * What a screen reader is told, once, when the indicator appears.
   * "Thinking" by default. It never changes with `status`, so a reader is not
   * told every step the assistant takes while they read.
   */
  label?: string | undefined;
}

/**
 * Ask Crewlet at work, drawn where its answer will be: the Ask Crewlet mark
 * with its main spark making a quarter turn while its companion twinkles, then
 * resting, and, while nothing of the answer is on screen yet, a line saying
 * what it is doing under a slow shimmer. The mark is drawn at 16 px, so it is
 * the 16 pixel grid drawing, and the motion is this component's stylesheet:
 * the mark carries only its `data-motion` parts.
 *
 * IN PLACE OF A CARET. A blinking bar after streamed text lands wherever the
 * last block ends, on a line of its own under a list or at the start of an
 * empty reply. The mark is a block of its own after the answer, one line of
 * prose tall, so it never sits inside the words, and nothing moves when the
 * first of them arrive: they are written above it, and it keeps its height.
 *
 * ONE ANNOUNCEMENT. `label` is said once, through a status region that keeps
 * the same words for as long as the indicator stands; the visible line, which
 * changes with every step, is hidden from assistive technology, where the
 * steps are read from their own list.
 *
 * UNDER REDUCED MOTION the mark holds a still working pose (the main spark
 * tucked, the companion dimmed) and the line is drawn in the secondary ink
 * without the shimmer: the mark and the words still say that work is under
 * way.
 */
export function ThinkingIndicator({ status, label = 'Thinking', className, ...rest }: ThinkingIndicatorProps) {
  return (
    <div {...rest} className={cx('crewlet-thinking', className)}>
      <ProductMark product="assistant" size="md" className="crewlet-thinking__mark" />
      {status === undefined || status === '' ? null : (
        // Keyed by its words, so a new step's line fades in rather than
        // swapping in place mid shimmer.
        <span key={status} className="crewlet-thinking__status" aria-hidden="true">
          {status}
        </span>
      )}
      <VisuallyHidden>
        <span role="status">{label}</span>
      </VisuallyHidden>
    </div>
  );
}
