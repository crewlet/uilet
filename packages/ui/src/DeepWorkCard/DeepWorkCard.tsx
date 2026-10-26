import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { CircleAlertGlyph, CircleCheckGlyph, CircleStopGlyph, ClockGlyph, TelescopeGlyph } from '@crewlethq/icons/glyphs';
import { Disclosure } from '../Disclosure/index.js';
import { Meter } from '../Meter/index.js';
import { ReceiptStrip, type ReceiptStripTone } from '../ReceiptStrip/index.js';
import { Spinner } from '../Spinner/index.js';
import { StatusCard, type StatusCardStatus } from '../StatusCard/index.js';
import { StepList, type StepListStep } from '../Stepper/index.js';
import { cx } from '../utils/cx.js';

/**
 * Where a long, bounded run stands: `starting` before its first step,
 * `running` while it works, `waiting` on the person's approval of a change it
 * prepared, `finished`, `stopped` (by the person, or at one of its limits)
 * and `failed` (the system could not finish it).
 */
export type DeepWorkState = 'starting' | 'running' | 'waiting' | 'finished' | 'stopped' | 'failed';

export const DEEP_WORK_STATES = [
  'starting',
  'running',
  'waiting',
  'finished',
  'stopped',
  'failed',
] as const satisfies readonly DeepWorkState[];

/** The words each state is said with, on the card's state tag. */
export type DeepWorkStateLabels = Record<DeepWorkState, string>;

export const DEEP_WORK_STATE_LABELS: DeepWorkStateLabels = {
  starting: 'Starting',
  running: 'Working',
  waiting: 'Waiting for your approval',
  finished: 'Finished',
  stopped: 'Stopped',
  failed: 'Failed',
};

/** The state tag's tone and mark, one per state. */
const STATUS: Record<DeepWorkState, Omit<StatusCardStatus, 'label'>> = {
  starting: { tone: 'info', icon: <Spinner size="xs" /> },
  running: { tone: 'info', icon: <Spinner size="xs" /> },
  waiting: { tone: 'warning', icon: <ClockGlyph size="xs" /> },
  finished: { tone: 'success', icon: <CircleCheckGlyph size="xs" /> },
  stopped: { tone: 'neutral', icon: <CircleStopGlyph size="xs" /> },
  failed: { tone: 'danger', icon: <CircleAlertGlyph size="xs" /> },
};

/** The note's strip tone, one per state: a failure is an alert, everything else a status. */
const NOTE_TONE: Record<DeepWorkState, ReceiptStripTone> = {
  starting: 'info',
  running: 'info',
  waiting: 'warning',
  finished: 'success',
  stopped: 'neutral',
  failed: 'danger',
};

/** The states in which the run is over. Its body steps back so the note reads first. */
const SETTLED: ReadonlySet<DeepWorkState> = new Set(['finished', 'stopped', 'failed']);

/** One of the run's limits, as a meter: time against its deadline, calls against their cap, budget used. */
export interface DeepWorkMeasure {
  /** What tells two measures apart, unique within the card. */
  key: string;
  /** What is measured, in a word or two: "Time", "Crewlet calls", "Budget used". */
  label: string;
  value: number;
  /** The limit. A run's measure always has one. */
  max: number;
  /** The reading in words, at the legend's end: "4m of 20m", "12 of 60", "34%". */
  hint: string;
  /** The reading for a screen reader, where the hint abbreviates: "4 minutes of 20". Defaults to `hint`. */
  valueText?: string | undefined;
}

export interface DeepWorkCardLabels {
  /** The card's title. */
  title: string;
  /** Names the activity lines for a screen reader. */
  activity: string;
  /** Names the nested steps for a screen reader. */
  steps: string;
  /** The folded steps' title, by their count. */
  stepCount: (count: number) => string;
}

export const DEEP_WORK_CARD_LABELS: DeepWorkCardLabels = {
  title: 'Deep work',
  activity: 'Latest activity',
  steps: 'Steps',
  stepCount: (count) => (count === 1 ? '1 step' : `${count} steps`),
};

export interface DeepWorkCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  state: DeepWorkState;
  /** What the run was asked to do, in the person's or the assistant's words. */
  goal: ReactNode;
  /** The run's limits, each drawn as a compact meter in the order given. */
  measures?: readonly DeepWorkMeasure[] | undefined;
  /**
   * The run's own latest account of itself, oldest first: a command it ran,
   * a file it wrote. Drawn in the mono face, one line each, never wrapped
   * into a paragraph. The consumer bounds how many it keeps.
   */
  activity?: readonly string[] | undefined;
  /** The steps the run took, nested under it. */
  steps?: readonly StepListStep[] | undefined;
  /**
   * Up to this many steps are drawn open; more fold behind one disclosure
   * named by their count, so a long run stays one card. 3 by default.
   */
  stepsOpenAt?: number | undefined;
  /**
   * One sentence at the card's foot, in the state's tone: why a run stopped
   * or failed, or what a waiting run waits on.
   */
  note?: ReactNode;
  /** The state words on the card's tag. */
  stateLabels?: Partial<DeepWorkStateLabels> | undefined;
  labels?: Partial<DeepWorkCardLabels> | undefined;
}

/**
 * A long, bounded run an assistant switched to: its goal, where it stands,
 * how much of each limit it has used, what it is doing now and the steps it
 * took, on the product's `StatusCard`.
 *
 * UPDATED IN PLACE. The run is re-sent as it moves, so every part is drawn
 * from props and nothing animates on arrival: a meter's fill moves, a line of
 * activity is added at the end, and the reader's open or closed steps stay as
 * they left them.
 *
 * NOT A LIVE REGION. The card changes every second while the run works, so
 * it announces nothing itself; the note at its foot is the strip's own status
 * (an alert for a failure), which changes only when the run's state does.
 *
 * THE LIMITS ARE METERS ON THE SPENT RAMP: time, calls and budget are all
 * spent towards a ceiling, so a run near one reads as near it without the
 * consumer judging the number.
 */
export function DeepWorkCard({
  state,
  goal,
  measures = [],
  activity = [],
  steps = [],
  stepsOpenAt = 3,
  note,
  stateLabels,
  labels: labelOverrides,
  className,
  ...rest
}: DeepWorkCardProps) {
  const id = useId();
  const labels = labelOverrides ? { ...DEEP_WORK_CARD_LABELS, ...labelOverrides } : DEEP_WORK_CARD_LABELS;
  const words = stateLabels ? { ...DEEP_WORK_STATE_LABELS, ...stateLabels } : DEEP_WORK_STATE_LABELS;
  const hasNote = !(note === undefined || note === null || note === false || note === '');
  const list = steps.length > 0 ? <StepList label={labels.steps} steps={steps} /> : null;
  return (
    <StatusCard
      {...rest}
      className={cx('crewlet-deep-work-card', `crewlet-deep-work-card--${state}`, className)}
      title={labels.title}
      status={{ label: words[state], ...STATUS[state] }}
      settled={SETTLED.has(state)}
      strip={hasNote ? <ReceiptStrip tone={NOTE_TONE[state]}>{note}</ReceiptStrip> : undefined}
    >
      <div className="crewlet-deep-work-card__goal">
        <TelescopeGlyph size="sm" className="crewlet-deep-work-card__goal-mark" />
        <p className="crewlet-deep-work-card__goal-text">{goal}</p>
      </div>
      {measures.length > 0 ? (
        <div className="crewlet-deep-work-card__measures">
          {measures.map((measure) => (
            <Meter
              key={measure.key}
              size="compact"
              label={measure.label}
              value={measure.value}
              max={measure.max}
              hint={measure.hint}
              valueText={measure.valueText ?? measure.hint}
            />
          ))}
        </div>
      ) : null}
      {activity.length > 0 ? (
        /* The role is restated for WebKit, which drops it from a list with no markers. */
        /* eslint-disable-next-line jsx-a11y/no-redundant-roles */
        <ol role="list" aria-label={labels.activity} className="crewlet-deep-work-card__activity">
          {activity.map((line, index) => (
            <li key={`${index}:${line}`} className="crewlet-deep-work-card__line" title={line}>
              <code>{line}</code>
            </li>
          ))}
        </ol>
      ) : null}
      {list === null ? null : steps.length > stepsOpenAt ? (
        <Disclosure
          id={`${id}-steps`}
          className="crewlet-deep-work-card__steps"
          size="compact"
          headingLevel="none"
          title={labels.stepCount(steps.length)}
          defaultOpen={false}
        >
          {list}
        </Disclosure>
      ) : (
        <div className="crewlet-deep-work-card__steps">{list}</div>
      )}
    </StatusCard>
  );
}
