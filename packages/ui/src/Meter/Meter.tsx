import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/**
 * What the bar is saying.
 *
 * `quantity` is the ordinary reading, because a budget that is being spent is
 * not in a state; it is just a number. It is the first data series,
 * `--color-data-1`: a meter is a figure of one quantity, and the label that
 * names it is what a data hue asks for, where the accent it used to take
 * means "act here" and a bar is not an action. The three that ARE states are
 * derived from the fill unless a caller overrides them, so a bar that is
 * nearly full says so without every call site remembering to. A caller that
 * owns the rule passes a `MeterState` instead, which names the state rather
 * than the paint.
 */
export type MeterTone = 'quantity' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * WHICH DIRECTION A FULL BAR POINTS, which is the one thing the fill itself
 * cannot say. A budget at 100 percent is a fault; a goal at 100 percent is the
 * whole point of the goal. The same arithmetic, the opposite conclusion — so
 * the polarity is a property of what is being measured and belongs to the call
 * site, not to the ramp.
 *
 * `spent` is the default and is what every existing caller already gets.
 *
 * IT MOVES THE TONE RAMP AND NOTHING ELSE — in particular it does not reach
 * for `role="progressbar"`. That role is for an operation the application is
 * running while the user waits on it, which is why the meter role says authors
 * "SHOULD NOT use the meter role to indicate progress". A goal that is eight
 * tenths achieved is not an operation anybody is waiting on; it is a scalar
 * measurement within a known range, which is a meter. A file upload is the
 * other thing, and it is not this component.
 */
export type MeterPolarity = 'spent' | 'progress';

/**
 * WHAT A LIMITED QUANTITY HAS COME TO, in the words of whoever enforces the
 * limit: `ok` is inside it, `near` is close enough that somebody should look,
 * and `refusing` is at it, where whatever the limit guards has stopped
 * accepting more. It is the `spent` ramp's three steps named for what they
 * MEAN rather than for how they are painted, which is what lets a consumer
 * that owns the rule hand the meter its verdict instead of a number to judge.
 */
export type MeterState = 'ok' | 'near' | 'refusing';

/** Every `MeterState`, in escalating order, for a caller checking a value it was sent. */
export const METER_STATES: readonly MeterState[] = Object.freeze(['ok', 'near', 'refusing']);

/**
 * Where the `spent` ramp turns, as FRACTIONS OF THE LIMIT rather than
 * percentages, because a limit is what the rule that owns it is written
 * against ("warn at nine tenths of the budget").
 *
 * Only `near` is a threshold. `refusing` is the limit itself, a fraction of
 * 1: a meter's maximum IS the limit, so a refusal anywhere else would be a
 * second ceiling the bar could not draw.
 */
export interface MeterThresholds {
  /**
   * The fraction of the limit at and above which the reading is `near`.
   * Greater than 0 and at most 1; at 1 the meter has no middle step, since
   * the limit itself is `refusing`.
   */
  near: number;
}

/**
 * The thresholds a meter uses when nobody says otherwise: `near` at three
 * quarters of the limit, the ramp every existing caller has always had.
 */
export const DEFAULT_METER_THRESHOLDS: Readonly<MeterThresholds> = Object.freeze({ near: 0.75 });

interface MeterBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  value: number;
  /**
   * The ceiling. NON-POSITIVE MEANS THERE IS NO CEILING, and the bar is then
   * drawn as decoration rather than as a reading — see the note on the
   * component.
   */
  max: number;
  /**
   * What is being measured. REQUIRED, and LINKED to the bar: the meter this
   * replaces drew its legend as a sibling and named nothing, so a screen
   * reader announced "meter, 62 percent" with no idea of what.
   */
  label: ReactNode;
  /**
   * The value in words, for a reader who is told the number rather than shown
   * the bar: "12.4K of 20K tokens". Without one, the platform reads the raw
   * value against the maximum, which is right for a plain count and wrong for
   * anything with a unit.
   */
  valueText?: string | undefined;
  /** Drawn at the trailing edge of the legend. Falls back to `valueText`. */
  hint?: ReactNode;
  /**
   * `compact` is the bar inside a table cell. Its legend drops a type step;
   * the track does not: it is the design's 6px at both sizes, and a thinner
   * one in a dense row is the one a reader takes for a divider.
   */
  size?: 'default' | 'compact' | undefined;
  /** Keep the label out of the picture. It stays in the accessibility tree. */
  hideLabel?: boolean | undefined;
}

/**
 * THE VERDICT: a caller that owns the rule says which state the quantity is
 * in, and the meter paints it and derives nothing. The fill still draws the
 * value against the maximum; only the tone is the caller's.
 *
 * Nothing else that decides a tone may stand beside it, because each would be
 * a second opinion about one reading, and the types refuse them.
 */
export interface MeterVerdictProps {
  /** The state the owner of the limit says this is: `ok`, `near` or `refusing`. */
  state?: MeterState | undefined;
  tone?: undefined;
  polarity?: undefined;
  thresholds?: undefined;
}

/** A tone chosen by hand, or derived from the fill on either ramp's own steps. */
export interface MeterRampProps {
  state?: undefined;
  /** Overrides the tone derived from the fill. */
  tone?: MeterTone | undefined;
  /**
   * Which ramp the derived tone comes from. `spent` (the default) reads a full
   * bar as a fault; `progress` reads it as an achievement. Ignored when `tone`
   * is given, which overrides the ramp entirely.
   */
  polarity?: MeterPolarity | undefined;
  thresholds?: undefined;
}

/**
 * The `spent` ramp with its middle step moved. Only that ramp has one, and a
 * tone given by hand would ignore it, so neither stands beside `thresholds`.
 */
export interface MeterThresholdProps {
  state?: undefined;
  tone?: undefined;
  polarity?: 'spent' | undefined;
  /** Where `near` begins, as a fraction of the limit. Replaces `DEFAULT_METER_THRESHOLDS`. */
  thresholds?: MeterThresholds | undefined;
}

export type MeterProps = MeterBaseProps & (MeterVerdictProps | MeterRampProps | MeterThresholdProps);

/**
 * How each state is painted: `near` is the warning, `refusing` the danger, and
 * `ok` is not a state a reader has to notice at all, so it keeps the ordinary
 * reading, `quantity`.
 */
const STATE_TONES: Record<MeterState, MeterTone> = {
  ok: 'quantity',
  near: 'warning',
  refusing: 'danger',
};

/** The tone a `MeterState` is painted in. */
export function meterStateTone(state: MeterState): MeterTone {
  // Own keys only: a state read off the wire as "toString" would otherwise
  // find the prototype's function and paint the fill with nothing at all.
  if (!Object.hasOwn(STATE_TONES, state)) {
    throw new RangeError(`Meter state must be one of ${METER_STATES.join(', ')}; it was ${String(state)}`);
  }
  return STATE_TONES[state];
}

/**
 * The state a fraction of the limit is in: at or past the limit it is
 * `refusing`, at or past `thresholds.near` it is `near`, below that `ok`.
 *
 * The boundaries are INCLUSIVE, so `near: 0.9` flips at exactly `9 / 10`:
 * a rule that says "warn at nine tenths" warns at nine tenths.
 *
 * A `near` outside (0, 1] is refused with a `RangeError` naming it, because
 * every such value is a rule that cannot be drawn: at 0 or below everything,
 * even an empty bar, is `near`, and past 1 the limit is `refusing` before it
 * can ever be `near`.
 */
export function meterState(fraction: number, thresholds: MeterThresholds = DEFAULT_METER_THRESHOLDS): MeterState {
  const { near } = thresholds;
  if (!Number.isFinite(near) || near <= 0 || near > 1) {
    throw new RangeError(`Meter thresholds.near must be a fraction of the limit above 0 and at most 1; it was ${near}`);
  }
  if (fraction >= 1) return 'refusing';
  if (fraction >= near) return 'near';
  return 'ok';
}

/**
 * The `spent` ramp: at the top it is a fault, near the top it wants a person,
 * below that it is just a number.
 *
 * Keeps its plain name because renaming an export is breaking, and it is still
 * the ramp a `Meter` uses when nobody says otherwise. It is `meterState` at
 * `DEFAULT_METER_THRESHOLDS`, painted, over a percentage.
 */
export function meterTone(percent: number): MeterTone {
  return meterStateTone(meterState(percent / 100));
}

/**
 * The `progress` ramp: finished is finished, and everything short of it is
 * just a number.
 *
 * TWO STEPS RATHER THAN THREE, deliberately. The spent ramp has a middle step
 * because a budget carries two escalating facts a reader has to act on — near
 * the limit somebody should look, past it something is already wrong. A goal
 * carries one: it is done or it is not. "Nearly done" is not a warning and
 * "barely started" is only a fault against a DEADLINE, which is not one of
 * this component's inputs — so a middle step here would be an alarm invented
 * out of a number the meter cannot interpret.
 */
export function progressTone(percent: number): MeterTone {
  return percent >= 100 ? 'success' : 'quantity';
}

/**
 * The tone a meter is drawn in, in order of who has the say. A verdict is the
 * rule's owner speaking, so it wins and nothing is derived; a hand-picked tone
 * comes next; only then is the fill read, on the ramp its polarity names and,
 * on the `spent` ramp, at the caller's thresholds.
 *
 * The spent ramp reads `value / max` as the caller gave it; the clamp is for
 * the drawing, and a fraction past 1 is as `refusing` as one at it.
 */
function drawnTone(
  {
    state,
    tone,
    polarity = 'spent',
    thresholds,
  }: {
    state: MeterState | undefined;
    tone: MeterTone | undefined;
    polarity: MeterPolarity | undefined;
    thresholds: MeterThresholds | undefined;
  },
  fraction: number,
  percent: number,
): MeterTone {
  if (state !== undefined) return meterStateTone(state);
  if (tone !== undefined) return tone;
  if (polarity === 'progress') return progressTone(percent);
  return meterStateTone(meterState(fraction, thresholds));
}

/**
 * A budget, a share, a fill.
 *
 * THE TRACK IS ALWAYS DRAWN. A bar with no track is a bar whose maximum the
 * reader has to guess, and at 8 percent it is indistinguishable from a bar
 * that is simply short.
 *
 * A NON-POSITIVE MAXIMUM IS NOT A METER, because ARIA gives the meter role no
 * way at all to say "there is no ceiling" and both attempts are a false claim.
 * `max={0}` renders `aria-valuemax="0"` against an `aria-valuemin` of 0: a
 * range of zero width, in which the fraction a reader is offered is 0/0 and
 * every value but 0 breaks the role's own "the value of aria-valuenow MUST NOT
 * fall below or exceed the computed values of aria-valuemin and aria-valuemax"
 * — and a negative maximum additionally breaks "authors MUST ensure the value
 * of aria-valuemax is greater than or equal to the value of aria-valuemin".
 * Leaving the attribute off instead is WORSE rather than better, because
 * missing is precisely when the role's implicit value takes over — "if
 * aria-valuemax is missing or not a number, it defaults to 100" — so the bar
 * stops saying nothing and starts announcing a confident fraction of a ceiling
 * that nobody set.
 *
 * So the only honest move is to stop being a meter. The bar drops the role and
 * every value attribute and is hidden from the accessibility tree as the
 * decoration it is; the legend still names it and still carries the figure.
 * (`DataTable`'s column resizer reaches the same conclusion from the same
 * place: a maximum invented to fill the attribute is a number a reader is told
 * they cannot pass.)
 *
 * THE REPORTED VALUE IS CLAMPED INTO THE SCALE. A budget lowered under a
 * counter that has already passed it is an ordinary event, and it used to
 * publish `aria-valuenow` outside `[min,max]` — the same normative MUST NOT as
 * above, which assistive technology is therefore free to resolve however it
 * likes. The clamp makes the pair valid and `aria-valuetext` keeps the true
 * figures, so nothing is lost: what a reader hears is "140 of 100", not a bar
 * that quietly rounds itself down to exactly the limit it has overrun.
 */
export function Meter({
  value,
  max,
  label,
  valueText,
  hint,
  state,
  tone,
  polarity,
  thresholds,
  size = 'default',
  hideLabel = false,
  className,
  ...rest
}: MeterProps) {
  const labelId = useId();
  const bounded = max > 0;
  const fraction = bounded ? value / max : 0;
  const percent = bounded ? Math.min(100, Math.max(0, fraction * 100)) : 0;
  const drawn = drawnTone({ state, tone, polarity, thresholds }, fraction, percent);
  const trailing = hint ?? valueText;

  // The fill was already clamped; the fact it reported was not. Both ends
  // matter — a negative counter is as invalid against a floor of 0 as an
  // overrun is against the ceiling.
  const reported = bounded ? Math.min(max, Math.max(0, value)) : value;
  // Only where the clamp actually moved something, so every valid call site
  // keeps reading exactly as it did: no words at all, and the platform reads
  // the number. The phrasing is the platform's own reading of a meter, written
  // out because the clamped number can no longer produce it.
  const spoken = bounded ? (valueText ?? (reported === value ? undefined : `${value} of ${max}`)) : undefined;
  // A decorative bar carries no aria-valuetext, so a figure the legend does
  // not draw has nowhere left to be announced.
  const unspoken =
    !bounded && valueText !== undefined && (hideLabel || hint !== undefined) ? valueText : undefined;

  return (
    <div {...rest} className={cx('crewlet-meter', `crewlet-meter--${size}`, className)}>
      {hideLabel ? (
        <VisuallyHidden id={labelId}>{label}</VisuallyHidden>
      ) : (
        <div className="crewlet-meter__legend">
          <span id={labelId} className="crewlet-meter__label">
            {label}
          </span>
          {trailing === undefined ? null : <span className="crewlet-meter__hint">{trailing}</span>}
        </div>
      )}
      {unspoken === undefined ? null : <VisuallyHidden>{unspoken}</VisuallyHidden>}
      <div
        className="crewlet-meter__track"
        role={bounded ? 'meter' : undefined}
        aria-labelledby={bounded ? labelId : undefined}
        aria-valuenow={bounded ? reported : undefined}
        aria-valuemin={bounded ? 0 : undefined}
        aria-valuemax={bounded ? max : undefined}
        aria-valuetext={spoken}
        aria-hidden={bounded ? undefined : true}
      >
        <div className="crewlet-meter__fill" data-tone={drawn} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
