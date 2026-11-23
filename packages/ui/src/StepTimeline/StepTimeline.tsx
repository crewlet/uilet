import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { CircleCheckGlyph, CircleDashedGlyph, CircleXGlyph } from '@crewlethq/icons/glyphs';
import { Spinner } from '../Spinner/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** Where a step stands: finished, failed, under way, or not begun. */
export type StepTimelineState = 'done' | 'failed' | 'running' | 'pending';

/** One step a process took, in words a reader follows. */
export interface StepTimelineStep {
  key: string;
  /** One plain line: what the step did ("Read token spend, last 7 days"). */
  text: ReactNode;
  state: StepTimelineState;
  /** A quiet second line in monospace: the call behind the step and its parameters. */
  detail?: ReactNode;
  /** Why a step failed, in words, under it. */
  why?: ReactNode;
  /** When it happened, at the row's end ("07:02"). */
  time?: ReactNode;
  /** The instant `time` stands for, for the `<time>` element. */
  dateTime?: string | undefined;
}

export interface StepTimelineLabels {
  /** Read after a step's words with its state. */
  done: string;
  failed: string;
  running: string;
  pending: string;
  /** The summary of the steps a collapsed list hides. */
  earlier: (hidden: number, failed: number) => string;
  /** Opens every step. */
  showAll: (count: number) => string;
  /** Folds the list back to its last steps. */
  showFewer: string;
}

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n.toLocaleString()} ${many}`);

export const STEP_TIMELINE_LABELS: StepTimelineLabels = {
  done: 'Done',
  failed: 'Failed',
  running: 'In progress',
  pending: 'Not started',
  earlier: (hidden, failed) =>
    `${count(hidden, 'earlier step', 'earlier steps')}${failed > 0 ? `, ${failed.toLocaleString()} failed` : ''}`,
  showAll: (n) => `Show all ${n.toLocaleString()}`,
  showFewer: 'Show fewer',
};

export interface StepTimelineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  steps: readonly StepTimelineStep[];
  /** Names the list for a screen reader: "What the run did". */
  label: string;
  /** Past this many steps the list folds to its last `tail` under a summary of the rest. */
  collapseAfter?: number | undefined;
  /** How many of the last steps a folded list shows. */
  tail?: number | undefined;
  /** Starts with every step shown. */
  defaultExpanded?: boolean | undefined;
  labels?: Partial<StepTimelineLabels> | undefined;
}

/**
 * The steps a process took, one plain line each, oldest first: a status mark
 * (done, failed, in progress, not started), the call behind the step quiet
 * under it, and a failed step's reason. A long list folds to its last steps
 * under one line that counts the rest and the failures among them.
 */
export function StepTimeline({
  steps,
  label,
  collapseAfter = 8,
  tail = 5,
  defaultExpanded = false,
  labels: given,
  className,
  ...rest
}: StepTimelineProps) {
  const labels = { ...STEP_TIMELINE_LABELS, ...given };
  const id = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const folds = steps.length > collapseAfter;
  const hidden = folds && !expanded ? steps.length - Math.min(tail, steps.length) : 0;
  const shown = steps.slice(hidden);
  const failedHidden = steps.slice(0, hidden).filter((s) => s.state === 'failed').length;

  return (
    <div {...rest} className={cx('crewlet-step-timeline', className)}>
      {hidden > 0 ? (
        <button
          type="button"
          className="crewlet-step-timeline__fold"
          aria-expanded={false}
          aria-controls={id}
          onClick={() => setExpanded(true)}
        >
          <span className="crewlet-step-timeline__fold-mark" aria-hidden="true">
            <CircleDashedGlyph size="sm" />
          </span>
          <span className="crewlet-step-timeline__fold-words">
            {labels.earlier(hidden, failedHidden)}
            <span className="crewlet-step-timeline__fold-action">{labels.showAll(steps.length)}</span>
          </span>
        </button>
      ) : null}
      <ol id={id} className="crewlet-step-timeline__list" aria-label={label}>
        {shown.map((step) => (
          <li
            key={step.key}
            className={cx('crewlet-step-timeline__step', `crewlet-step-timeline__step--${step.state}`)}
            data-state={step.state}
          >
            <span className="crewlet-step-timeline__mark" aria-hidden="true">
              {step.state === 'running' ? (
                <Spinner size="sm" />
              ) : step.state === 'done' ? (
                <CircleCheckGlyph size="sm" />
              ) : step.state === 'failed' ? (
                <CircleXGlyph size="sm" />
              ) : (
                <CircleDashedGlyph size="sm" />
              )}
            </span>
            <div className="crewlet-step-timeline__body">
              <p className="crewlet-step-timeline__text">
                {step.text}
                <VisuallyHidden>{`, ${labels[step.state]}`}</VisuallyHidden>
              </p>
              {step.why ? <p className="crewlet-step-timeline__why">{step.why}</p> : null}
              {step.detail ? <p className="crewlet-step-timeline__detail">{step.detail}</p> : null}
            </div>
            {step.time ? (
              <time className="crewlet-step-timeline__time" dateTime={step.dateTime}>
                {step.time}
              </time>
            ) : null}
          </li>
        ))}
      </ol>
      {folds && expanded ? (
        <button
          type="button"
          className="crewlet-step-timeline__fewer"
          aria-expanded={true}
          aria-controls={id}
          onClick={() => setExpanded(false)}
        >
          {labels.showFewer}
        </button>
      ) : null}
    </div>
  );
}
