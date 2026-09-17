import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import { cx } from '../utils/cx.js';

/**
 * What the bar is saying.
 *
 * `brand` is the ordinary reading, because a budget that is being spent is not
 * in a state; it is just a number. The three that ARE states are derived from
 * the fill unless a caller overrides them, so a bar that is nearly full says
 * so without every call site remembering to.
 */
export type MeterTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

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

export interface MeterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
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
  /** Overrides the tone derived from the fill. */
  tone?: MeterTone | undefined;
  /**
   * Which ramp the derived tone comes from. `spent` (the default) reads a full
   * bar as a fault; `progress` reads it as an achievement. Ignored when `tone`
   * is given, which overrides the ramp entirely.
   */
  polarity?: MeterPolarity | undefined;
  /**
   * `compact` is the bar inside a table cell. Its legend drops a type step;
   * the track does not, because the track is already the engine's 4px and
   * there is nothing below four a fill still reads as a proportion in.
   */
  size?: 'default' | 'compact' | undefined;
  /** Keep the label out of the picture. It stays in the accessibility tree. */
  hideLabel?: boolean | undefined;
}

/**
 * The `spent` ramp: at the top it is a fault, near the top it wants a person,
 * below that it is just a number.
 *
 * Keeps its plain name because renaming an export is breaking, and it is still
 * the ramp a `Meter` uses when nobody says otherwise.
 */
export function meterTone(percent: number): MeterTone {
  if (percent >= 100) return 'danger';
  if (percent >= 75) return 'warning';
  return 'brand';
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
  return percent >= 100 ? 'success' : 'brand';
}

const RAMPS: Record<MeterPolarity, (percent: number) => MeterTone> = {
  spent: meterTone,
  progress: progressTone,
};

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
  tone,
  polarity = 'spent',
  size = 'default',
  hideLabel = false,
  className,
  ...rest
}: MeterProps) {
  const labelId = useId();
  const bounded = max > 0;
  const percent = bounded ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const drawn = tone ?? RAMPS[polarity](percent);
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
