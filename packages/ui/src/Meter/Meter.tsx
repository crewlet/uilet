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

export interface MeterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  value: number;
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
   * `compact` is the bar inside a table cell. Its legend drops a type step;
   * the track does not, because the track is already the engine's 4px and
   * there is nothing below four a fill still reads as a proportion in.
   */
  size?: 'default' | 'compact' | undefined;
  /** Keep the label out of the picture. It stays in the accessibility tree. */
  hideLabel?: boolean | undefined;
}

/** At the top it is a fault, near the top it wants a person, below that it is just a number. */
export function meterTone(percent: number): MeterTone {
  if (percent >= 100) return 'danger';
  if (percent >= 75) return 'warning';
  return 'brand';
}

/**
 * A budget, a share, a fill.
 *
 * THE TRACK IS ALWAYS DRAWN. A bar with no track is a bar whose maximum the
 * reader has to guess, and at 8 percent it is indistinguishable from a bar
 * that is simply short.
 */
export function Meter({
  value,
  max,
  label,
  valueText,
  hint,
  tone,
  size = 'default',
  hideLabel = false,
  className,
  ...rest
}: MeterProps) {
  const labelId = useId();
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const drawn = tone ?? meterTone(percent);
  const trailing = hint ?? valueText;

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
      <div
        className="crewlet-meter__track"
        role="meter"
        aria-labelledby={labelId}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
      >
        <div className="crewlet-meter__fill" data-tone={drawn} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
