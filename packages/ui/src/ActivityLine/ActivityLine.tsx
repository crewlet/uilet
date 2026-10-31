import type { HTMLAttributes } from 'react';
import { ThinkingIndicator } from '../ThinkingIndicator/index.js';
import { cx } from '../utils/cx.js';

export interface ActivityLineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Who is typing, in words: "Product Manager is typing". Empty or left out, nothing is drawn for it. */
  typing?: string | undefined;
  /**
   * The agent at work, in words, beside the Ask Crewlet mark under its
   * shimmer: "Senior Backend Engineer is writing a reply · Reading the diff".
   * It may change with every step.
   */
  working?: string | undefined;
  /**
   * What a screen reader is told once when the agent starts, which never
   * changes with its steps: "Senior Backend Engineer is writing a reply".
   * `working` by default.
   */
  workingLabel?: string | undefined;
}

/**
 * Who is typing and which agent is working, in one quiet line under a
 * composer. It keeps one line's height when it is empty, so the box above it
 * never moves as people start and stop.
 *
 * TYPING is announced politely as it changes. WORKING is a
 * `ThinkingIndicator`, which announces its label once and keeps its changing
 * steps to the eye.
 */
export function ActivityLine({ typing, working, workingLabel, className, ...rest }: ActivityLineProps) {
  return (
    <div {...rest} className={cx('crewlet-activity-line', className)}>
      {working ? (
        <ThinkingIndicator status={working} label={workingLabel ?? working} className="crewlet-activity-line__working" />
      ) : null}
      <span className="crewlet-activity-line__typing" role="status">
        {typing ? (
          <>
            <span className="crewlet-activity-line__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {typing}
          </>
        ) : null}
      </span>
    </div>
  );
}
