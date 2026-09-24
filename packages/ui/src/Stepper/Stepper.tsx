import type { HTMLAttributes, ReactNode } from 'react';
import { CheckGlyph } from '@crewlethq/icons/glyphs';
import { StatusDot } from '../StatusDot/index.js';
import { cx } from '../utils/cx.js';
import type { Tone } from '../utils/tone.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * The state the CURRENT step is in, drawn as its chip's soft tint under its
 * ink. `info` is the default: work under way, the design's working step. A
 * run parked on a question is `warning`, one that stopped at this step is
 * `danger`, and `brand` is where the reader is, for a sequence the reader is
 * walking themselves.
 *
 * NOT `neutral`. The quiet chip is what every step that is not current already
 * is, so a neutral current step would be told from its neighbours by nothing
 * but `aria-current`, which nobody sees.
 */
export type StepperTone = Exclude<Tone, 'neutral'>;

/** One step of the sequence. */
export interface StepperStep {
  /** What tells two steps apart, unique within the stepper: `execute`, `review`. */
  id: string;
  /**
   * The step's words, and anything the step carries beside them: "Execute ·
   * round 7 of 25", "Context 0.8s".
   */
  label: ReactNode;
}

export interface StepperProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  /** Every step, in order. */
  steps: readonly StepperStep[];
  /**
   * The step under way, by its id. Every step before it is done and every
   * step after it is still to come. `null` once EVERY step is done, which is
   * how a finished run is drawn: a turn's history in a task's timeline reads
   * "Execute ✓ — Review ✓" with nothing current.
   */
  current: string | null;
  /**
   * What the sequence is, for a screen reader: "Turn progress". REQUIRED,
   * because a list of four short words with nothing to say what they are the
   * steps OF is a riddle to somebody who cannot see the row it stands in.
   */
  label: string;
  /** The current step's state. `info` by default. */
  tone?: StepperTone | undefined;
  /**
   * The current step's dot breathes, for a step still under way: the approved
   * design pulses a working turn's. It is `StatusDot`'s own pulse, so it
   * never fades the dot, never touches it, and is held still under a reduced
   * motion preference.
   */
  pulse?: boolean | undefined;
  /**
   * Said before a finished step's words, where the check glyph stands for a
   * reader who sees it: "Done Context".
   */
  doneLabel?: string | undefined;
}

type StepState = 'done' | 'current' | 'later';

/**
 * Where a sequence has got to: the phases of a turn, the stages of a run.
 *
 * AN ORDERED LIST, because the order IS the information: a step's position
 * says whether it is behind the current one or ahead of it, and a list says
 * how many there are before a reader has heard any of them. The step under
 * way carries `aria-current="step"`, the one value ARIA gives this exact
 * meaning, and it is on exactly one step while the sequence is running and on
 * none once it has finished.
 *
 * THREE STATES, EACH DRAWN TWO WAYS, so colour is never the only carrier. A
 * finished step is the secondary ink with a check, and says "Done" before its
 * words to a screen reader, where the check stands for a reader who sees it.
 * The current step is its tone's soft tint under the tone's ink with the
 * tone's dot, and is `aria-current`. A step still to come is the tertiary ink
 * and nothing else. The hairline round the chips, and the short rule between
 * two of them, are the design's quiet furniture.
 *
 * THE TONE IS DRAWN, NEVER SPOKEN: a reader hears which step is current, not
 * that it is in the warning hue. A current step whose state is anything but
 * ordinary work says so in its own words ("Review · sent back").
 */
export function Stepper({
  steps,
  current,
  label,
  tone = 'info',
  pulse = false,
  doneLabel = 'Done',
  className,
  ...rest
}: StepperProps) {
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) throw new RangeError(`Stepper step ids must be unique; "${step.id}" is used twice`);
    seen.add(step.id);
  }
  const at = current === null ? steps.length : steps.findIndex((step) => step.id === current);
  if (at < 0) {
    // A current step that is not one of the steps has no honest picture: drawn
    // as nothing started it says a running turn has not begun, and drawn as
    // everything finished it says one that is running has ended. Refused by
    // name, as `AvatarStack` refuses a `max` it cannot draw.
    throw new RangeError(
      `Stepper current must be the id of one of its steps, or null once every step is done; "${current}" is not one of ${steps.map((step) => `"${step.id}"`).join(', ')}`,
    );
  }
  if (steps.length === 0) return null;

  const stateOf = (index: number): StepState => (index < at ? 'done' : index === at ? 'current' : 'later');

  return (
    /*
     * `role="list"` although an `ol` already has one, which is why the lint
     * rule that calls it redundant is silenced here rather than obeyed, as
     * `Legend` and `DiffList` silence it: the stylesheet takes the markers off,
     * and WebKit answers a marker-less list as a group of paragraphs, so a
     * reader would no longer be told how many steps there are before hearing
     * them. The role puts that back.
     */
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ol
      {...rest}
      role="list"
      className={cx('crewlet-stepper', `crewlet-stepper--${tone}`, className)}
      aria-label={label}
    >
      {steps.map((step, index) => {
        const state = stateOf(index);
        return (
          <li
            key={step.id}
            className={cx('crewlet-stepper__step', `crewlet-stepper__step--${state}`)}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="crewlet-stepper__chip">
              {state === 'done' ? (
                <>
                  <CheckGlyph size="xs" className="crewlet-stepper__check" />
                  <VisuallyHidden>{doneLabel}</VisuallyHidden>
                  {/*
                    A TEXT NODE between the two, as `ListItem` draws one: an
                    accessible name is its parts run together, and whitespace
                    inside the hidden span is trimmed off it, so without this the
                    step reads "DoneContext".
                  */}{' '}
                </>
              ) : null}
              {state === 'current' ? <StatusDot tone={tone} pulse={pulse} className="crewlet-stepper__dot" /> : null}
              <span className="crewlet-stepper__label">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
