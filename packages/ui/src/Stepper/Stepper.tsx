import type { HTMLAttributes, ReactNode } from 'react';
import { CheckGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
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

/**
 * Where one step stands. `done`, `current` and `upcoming` are what a step's
 * position against `current` already says; `optional` is a step that may be
 * skipped and has not been completed, drawn quietly with the word "Optional";
 * `attention` is a step with something to look at again (a low-contrast pair,
 * a refused file), drawn with a warning glyph and the words "Needs attention".
 */
export type StepperStatus = 'done' | 'current' | 'upcoming' | 'optional' | 'attention';

/** How the steps are laid out: a row of pills, or a column of rows with a mark each. */
export type StepperOrientation = 'horizontal' | 'vertical';

/** One step of the sequence. */
export interface StepperStep {
  /** What tells two steps apart, unique within the stepper: `execute`, `review`. */
  id: string;
  /**
   * The step's words, and anything the step carries beside them: "Execute ·
   * round 7 of 25", "Context 0.8s".
   */
  label: ReactNode;
  /**
   * Where the step stands, when its position does not say it all. Left out,
   * a step before `current` is `done` and one after it is `upcoming`. The
   * current step is always drawn current: `attention` or `optional` on it adds
   * the warning glyph or the word "Optional" to it, and `current` on any other
   * step is refused, since only `current` names the step under way.
   */
  status?: StepperStatus | undefined;
  /** A line under the label, in the vertical orientation only: "Name and tagline". */
  description?: ReactNode;
}

export interface StepperProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children' | 'onSelect'> {
  /** Every step, in order. */
  steps: readonly StepperStep[];
  /**
   * The step under way, by its id. Every step before it is done and every
   * step after it is still to come, unless a step's `status` says otherwise.
   * `null` once EVERY step is done, which is how a finished run is drawn: a
   * turn's history in a task's timeline reads "Execute ✓, Review ✓" with
   * nothing current.
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
  /** A row of pills (the default), or a column of rows, as a setup wizard's rail draws it. */
  orientation?: StepperOrientation | undefined;
  /**
   * Called with a step's id when a reader picks it. Given, every VISITED step
   * (the current one, every step before it, and every step up to `reached`)
   * is a button; a step not visited yet stays words, reachable only by
   * whatever moves the sequence on, never a disabled button that is a tab stop
   * with nothing behind it.
   */
  onSelect?: ((id: string) => void) | undefined;
  /**
   * The furthest step a reader has visited, by its id, for a sequence they
   * can walk back through and forward again: on step 2 after reaching step 5,
   * steps 3 to 5 are still buttons. `current` by default.
   */
  reached?: string | undefined;
  /**
   * Said before a finished step's words, where the check glyph stands for a
   * reader who sees it: "Done Context".
   */
  doneLabel?: string | undefined;
  /** Said after an optional step's words, and shown under them in the vertical orientation. "Optional" by default. */
  optionalLabel?: string | undefined;
  /** Said after the words of a step that needs attention, and shown under them vertically. "Needs attention" by default. */
  attentionLabel?: string | undefined;
}

/**
 * Where a sequence has got to: the phases of a turn, the stages of a run, the
 * steps of a setup a person walks themselves.
 *
 * AN ORDERED LIST, because the order IS the information: a step's position
 * says whether it is behind the current one or ahead of it, and a list says
 * how many there are before a reader has heard any of them. The step under
 * way carries `aria-current="step"`, the one value ARIA gives this exact
 * meaning, and it is on exactly one step while the sequence is running and on
 * none once it has finished. When the steps are buttons it is on the button,
 * which is what a reader focuses and so what tells them.
 *
 * EVERY STATE IS DRAWN TWO WAYS, so colour is never the only carrier. A
 * finished step is the secondary ink with a check, and says "Done" before its
 * words to a screen reader, where the check stands for a reader who sees it.
 * The current step is its tone's soft tint under the tone's ink with the
 * tone's dot. A step still to come is the tertiary ink and nothing else; an
 * optional one says "Optional", and one that needs attention carries the
 * warning glyph on the warning tint and says "Needs attention".
 *
 * TWO ORIENTATIONS. The row is the approved design's pills joined by a short
 * rule. The column is a setup wizard's rail: a 20px mark per step (the check,
 * the dot, the warning glyph or the step's number) on a hairline that joins
 * them, the label beside it, and a description and the status words under
 * the label.
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
  orientation = 'horizontal',
  onSelect,
  reached,
  doneLabel = 'Done',
  optionalLabel = 'Optional',
  attentionLabel = 'Needs attention',
  className,
  ...rest
}: StepperProps) {
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) throw new RangeError(`Stepper step ids must be unique; "${step.id}" is used twice`);
    seen.add(step.id);
  }
  const ids = () => steps.map((step) => `"${step.id}"`).join(', ');
  const at = current === null ? steps.length : steps.findIndex((step) => step.id === current);
  if (at < 0) {
    // A current step that is not one of the steps has no honest picture: drawn
    // as nothing started it says a running turn has not begun, and drawn as
    // everything finished it says one that is running has ended. Refused by
    // name, as `AvatarStack` refuses a `max` it cannot draw.
    throw new RangeError(
      `Stepper current must be the id of one of its steps, or null once every step is done; "${current}" is not one of ${ids()}`,
    );
  }
  const furthest = reached === undefined ? at : steps.findIndex((step) => step.id === reached);
  if (furthest < 0) throw new RangeError(`Stepper reached must be the id of one of its steps; "${reached}" is not one of ${ids()}`);
  for (const [index, step] of steps.entries()) {
    if (step.status === 'current' && index !== at) {
      throw new RangeError(`Stepper step "${step.id}" says it is current, but current is ${current === null ? 'null' : `"${current}"`}`);
    }
  }
  if (steps.length === 0) return null;

  const visitedTo = Math.max(at, furthest);
  const vertical = orientation === 'vertical';

  const drawnOf = (step: StepperStep, index: number): StepperStatus => {
    if (index === at) return 'current';
    if (step.status !== undefined && step.status !== 'current') return step.status;
    return index < at ? 'done' : 'upcoming';
  };

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
      className={cx(
        'crewlet-stepper',
        `crewlet-stepper--${tone}`,
        vertical && 'crewlet-stepper--vertical',
        onSelect && 'crewlet-stepper--selectable',
        className,
      )}
      aria-label={label}
    >
      {steps.map((step, index) => {
        const drawn = drawnOf(step, index);
        const isCurrent = drawn === 'current';
        const attention = drawn === 'attention' || (isCurrent && step.status === 'attention');
        const optional = drawn === 'optional' || (isCurrent && step.status === 'optional');
        const note = attention ? attentionLabel : optional ? optionalLabel : null;
        const selectable = onSelect !== undefined && index <= visitedTo;

        const mark =
          drawn === 'done' ? (
            <CheckGlyph size="xs" className="crewlet-stepper__check" />
          ) : attention ? (
            <TriangleAlertGlyph size="xs" className="crewlet-stepper__warning" />
          ) : isCurrent ? (
            <StatusDot tone={tone} pulse={pulse} className="crewlet-stepper__dot" />
          ) : vertical ? (
            <span className="crewlet-stepper__number" aria-hidden="true">
              {index + 1}
            </span>
          ) : null;

        const words = (
          <>
            {drawn === 'done' ? (
              <>
                <VisuallyHidden>{doneLabel}</VisuallyHidden>
                {/*
                  A TEXT NODE between the two, as `ListItem` draws one: an
                  accessible name is its parts run together, and whitespace
                  inside the hidden span is trimmed off it, so without this the
                  step reads "DoneContext".
                */}{' '}
              </>
            ) : null}
            <span className="crewlet-stepper__label">{step.label}</span>
            {/* Said and not shown: a pill has no room for the words. */}
            {note !== null && !vertical ? <VisuallyHidden>{`, ${note}`}</VisuallyHidden> : null}
          </>
        );

        const content = vertical ? (
          <>
            <span className="crewlet-stepper__mark">{mark}</span>
            <span className="crewlet-stepper__text">
              <span className="crewlet-stepper__title">{words}</span>
              {step.description ? <span className="crewlet-stepper__description">{step.description}</span> : null}
              {note !== null ? <span className="crewlet-stepper__note">{note}</span> : null}
            </span>
          </>
        ) : (
          <>
            {mark}
            {words}
          </>
        );

        const surface = vertical ? 'crewlet-stepper__row' : 'crewlet-stepper__chip';
        return (
          <li
            key={step.id}
            className={cx(
              'crewlet-stepper__step',
              `crewlet-stepper__step--${drawn}`,
              attention && drawn !== 'attention' && 'crewlet-stepper__step--attention',
            )}
            aria-current={isCurrent && !selectable ? 'step' : undefined}
          >
            {selectable ? (
              <button
                type="button"
                className={cx(surface, 'crewlet-stepper__target')}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(step.id)}
              >
                {content}
              </button>
            ) : (
              <span className={surface}>{content}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
