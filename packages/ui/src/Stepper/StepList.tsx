import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import {
  CircleAlertGlyph,
  CircleCheckGlyph,
  CircleDashedGlyph,
  CircleStopGlyph,
  ClockGlyph,
  LockGlyph,
} from '@crewlethq/icons/glyphs';
import { Spinner } from '../Spinner/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * Where one step of a request stands. Unlike a `Stepper`'s position against
 * one current step, every step carries its own state, because the steps of a
 * request finish, fail or are refused on their own: `running` while it works,
 * `done`, `failed` (the system could not do it), `refused` (the person's own
 * access does not allow it), `stopped` (the person stopped the request before
 * it finished), `waiting` (it waits on the person's approval) and `pending`
 * (it has not started: the request has not reached it yet, or ended before
 * it, as the steps after a failed check that the check never got to).
 */
export type StepState = 'running' | 'done' | 'failed' | 'refused' | 'stopped' | 'waiting' | 'pending';

export const STEP_STATES = [
  'running',
  'done',
  'failed',
  'refused',
  'stopped',
  'waiting',
  'pending',
] as const satisfies readonly StepState[];

/** The words each state is said with, after the step's own words: "Read token spend by agent, Done". */
export type StepStateLabels = Record<StepState, string>;

export const STEP_STATE_LABELS: StepStateLabels = {
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  refused: 'Not permitted',
  stopped: 'Stopped',
  waiting: 'Waiting for your approval',
  pending: 'Not started',
};

export interface StepStateMarkProps {
  state: StepState;
  className?: string | undefined;
}

/**
 * A state's mark in its 16px box: the 14px glyph, or the spinner at the same
 * size while it runs, so nothing moves when the ring becomes a check. Running
 * takes the secondary ink, done the success ink, failed the danger ink,
 * waiting the warning ink, and refused, stopped and pending the tertiary
 * ink; pending is a dashed circle, the outline of a step still to come. One
 * mark for a request's steps and for the request's own state (`RunChip`),
 * which is what makes them one column.
 */
export function StepStateMark({ state, className }: StepStateMarkProps) {
  return (
    <span className={cx('crewlet-step-mark', `crewlet-step-mark--${state}`, className)} aria-hidden="true">
      {state === 'running' ? (
        <Spinner size="sm" />
      ) : state === 'done' ? (
        <CircleCheckGlyph size="sm" />
      ) : state === 'failed' ? (
        <CircleAlertGlyph size="sm" />
      ) : state === 'refused' ? (
        <LockGlyph size="sm" />
      ) : state === 'stopped' ? (
        <CircleStopGlyph size="sm" />
      ) : state === 'pending' ? (
        <CircleDashedGlyph size="sm" />
      ) : (
        <ClockGlyph size="sm" />
      )}
    </span>
  );
}

/** One step of a request. */
export interface StepListStep {
  /** What tells two steps apart, unique within the list. */
  id: string;
  /** What the step does, in plain words: "Read token spend by agent". */
  label: ReactNode;
  state: StepState;
  /** How long it took, already formatted: "0.4s". Drawn in the mono face at the end of the label's line. */
  duration?: string | undefined;
  /**
   * What the step asked for, in the mono face under the label: the tool and
   * the request it made (`get_spend · GET /tokens/breakdown?group=seat`). A
   * string breaks only at a space or after `/`, `?` or `&`, never inside a
   * name such as `sign-in`, and wraps inside a piece only when that piece is
   * wider than the line. A node is drawn as given.
   */
  detail?: ReactNode;
}

export interface StepListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  steps: readonly StepListStep[];
  /** Names the list for a screen reader: "Steps". REQUIRED, for `Stepper`'s reason. */
  label: string;
  /** A line above the steps, such as "1 of 2 done". Left out, none is drawn. */
  summary?: ReactNode;
  /** The words each state is said with. */
  labels?: Partial<StepStateLabels> | undefined;
}

/** A request's detail, cut into the pieces a line may break between. */
export function stepDetailPieces(text: string): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const character of text) {
    if (character === ' ') {
      if (piece) pieces.push(piece);
      pieces.push(' ');
      piece = '';
      continue;
    }
    piece += character;
    if (character === '/' || character === '?' || character === '&') {
      pieces.push(piece);
      piece = '';
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function Detail({ children }: { children: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>;
  return (
    <>
      {stepDetailPieces(children).map((piece, index) =>
        piece === ' ' ? (
          <Fragment key={index}> </Fragment>
        ) : (
          <span key={index} className="crewlet-step-list__piece">
            {piece}
          </span>
        ),
      )}
    </>
  );
}

/**
 * The steps a request took, each with its own state, its duration and what it
 * asked for: the list a run chip opens (`RunChip`).
 *
 * ONE STATE COLUMN. Every step's mark sits in the same 16px box, as tall as
 * the label's first line, so the mark and the duration stay on that line
 * however far the detail under it wraps, and the request's own mark in the
 * chip above stands in the same column.
 *
 * AN ORDERED LIST, because the order is what happened. Each state is also
 * said in words after the step's label, because the mark is a picture of it.
 *
 * ON THE INSET GROUND, with no edge: it is a well inside the thread rather
 * than a card of its own.
 */
export function StepList({ steps, label, summary, labels: overrides, className, ...rest }: StepListProps) {
  const labels = overrides ? { ...STEP_STATE_LABELS, ...overrides } : STEP_STATE_LABELS;
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) throw new RangeError(`StepList step ids must be unique; "${step.id}" is used twice`);
    seen.add(step.id);
  }
  return (
    <div {...rest} className={cx('crewlet-step-list', className)}>
      {summary === undefined ? null : <div className="crewlet-step-list__summary">{summary}</div>}
      {/* The role is restated for WebKit, which drops it from a list with no markers. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ol role="list" aria-label={label} className="crewlet-step-list__steps">
        {steps.map((step) => (
          <li key={step.id} className={cx('crewlet-step-list__step', `crewlet-step-list__step--${step.state}`)}>
            <StepStateMark state={step.state} className="crewlet-step-list__mark" />
            <span className="crewlet-step-list__text">
              <span className="crewlet-step-list__label">
                {step.label}
                <VisuallyHidden>{`, ${labels[step.state]}`}</VisuallyHidden>
              </span>
              {step.detail === undefined ? null : (
                <code className="crewlet-step-list__detail">
                  <Detail>{step.detail}</Detail>
                </code>
              )}
            </span>
            {step.duration === undefined ? null : <span className="crewlet-step-list__duration">{step.duration}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
