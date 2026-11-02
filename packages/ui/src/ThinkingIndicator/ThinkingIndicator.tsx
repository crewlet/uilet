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
   * "Thinking" by default, and "Queued" while `queued`. It never changes with
   * `status`, so a reader is not told every step the assistant takes while
   * they read.
   */
  label?: string | undefined;
  /**
   * The work has not started: the request is waiting behind something the
   * agent is already doing ("is queued behind its current task"). The mark
   * rests in its idle pose and the line is drawn without its shimmer, so a
   * person can tell a reply that is being written from one that is waiting
   * its turn. When the work starts, drop it and the indicator moves again in
   * place, with nothing else on the page moving.
   */
  queued?: boolean | undefined;
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
 *
 * QUEUED, NOTHING MOVES. A request waiting behind the agent's current task is
 * drawn with the mark in its idle pose and the line in the secondary ink, at
 * the same height, so the moment the work starts is the moment the mark
 * starts to turn. Motion means work under way, and a queued request has none
 * yet.
 */
export function ThinkingIndicator({ status, label, queued = false, className, ...rest }: ThinkingIndicatorProps) {
  const announced = label ?? (queued ? 'Queued' : 'Thinking');
  return (
    <div {...rest} className={cx('crewlet-thinking', queued && 'crewlet-thinking--queued', className)}>
      <ProductMark product="assistant" size="md" className="crewlet-thinking__mark" />
      {status === undefined || status === '' ? null : (
        // Keyed by its words, so a new step's line fades in rather than
        // swapping in place mid shimmer.
        <span key={status} className="crewlet-thinking__status" aria-hidden="true">
          {status}
        </span>
      )}
      <VisuallyHidden>
        <span role="status">{announced}</span>
      </VisuallyHidden>
    </div>
  );
}
