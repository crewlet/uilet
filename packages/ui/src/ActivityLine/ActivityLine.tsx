import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';
import { BouncingDots, WorkingLine, type WorkingAgent, type WorkingLineLabels } from '../WorkingLine/index.js';

export interface ActivityLineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Who is typing, in words: "Product Manager is typing". Empty or left out, nothing is drawn for it. */
  typing?: string | undefined;
  /**
   * The agents at work, drawn as one `WorkingLine`: their faces, one sentence
   * naming them and, on demand, a line per agent. Empty or left out, nothing
   * is drawn for them.
   */
  agents?: readonly WorkingAgent[] | undefined;
  /** The working line's words, for a surface in another language. */
  workingLabels?: Partial<WorkingLineLabels> | undefined;
}

/**
 * Who is typing and which agents are working, in one quiet line under a
 * composer. It keeps one line's height when it is empty, so the box above it
 * never moves as people start and stop.
 *
 * KEPT APART. People typing are words and dots, with no face; agents at work
 * are faces, names under a sweeping band and dots. Both at once stand side by
 * side, and wrap to two lines where the column is too narrow for both.
 *
 * EACH ANNOUNCED ONCE PER CHANGE. Typing is a polite status as it changes;
 * the working line's own region names who starts and stops, never a phrase.
 * Both regions stay mounted while empty, so the first change is heard.
 */
export function ActivityLine({ typing, agents, workingLabels, className, ...rest }: ActivityLineProps) {
  return (
    <div {...rest} className={cx('crewlet-activity-line', className)}>
      <WorkingLine agents={agents ?? []} labels={workingLabels} className="crewlet-activity-line__working" />
      <span className="crewlet-activity-line__typing" role="status">
        {typing ? (
          <>
            {typing}
            <BouncingDots />
          </>
        ) : null}
      </span>
    </div>
  );
}
