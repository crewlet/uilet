import { useId } from 'react';
import { NumberField, typedNumber } from '../NumberField/index.js';
import { PresetChips } from '../PresetChips/index.js';
import { Select } from '../Select/index.js';
import { cx } from '../utils/cx.js';

/** The units a duration is typed in. */
export type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

/** Each unit's length in seconds, largest first. */
export const DURATION_UNIT_SECONDS: Readonly<Record<DurationUnit, number>> = {
  days: 86_400,
  hours: 3_600,
  minutes: 60,
  seconds: 1,
};

const UNITS_LARGEST_FIRST: readonly DurationUnit[] = ['days', 'hours', 'minutes', 'seconds'];

/** A duration as the field holds it: the amount as typed, in a unit. Empty is the default. */
export interface DurationValue {
  amount: string;
  unit: DurationUnit;
}

/** Every string the field draws itself. */
export interface DurationFieldLabels {
  /** A unit's name, for one and for many. */
  units: Readonly<Record<DurationUnit, readonly [one: string, many: string]>>;
  /** Names the unit picker. */
  unit: string;
  /** The preset that empties the field, with the default it stands for: "Default (12 hours)". */
  defaultPreset: (words: string) => string;
  presets: string;
  decrease: string;
  increase: string;
}

export const DURATION_FIELD_LABELS: DurationFieldLabels = {
  units: {
    seconds: ['second', 'seconds'],
    minutes: ['minute', 'minutes'],
    hours: ['hour', 'hours'],
    days: ['day', 'days'],
  },
  unit: 'Unit',
  defaultPreset: (words) => `Default (${words})`,
  presets: 'Common durations',
  decrease: 'Decrease',
  increase: 'Increase',
};

/** The largest of `units` that `seconds` is a whole number of; the smallest where none is. */
function unitOf(seconds: number, units: readonly DurationUnit[]): DurationUnit {
  const ordered = UNITS_LARGEST_FIRST.filter((u) => units.includes(u));
  for (const unit of ordered) {
    if (seconds !== 0 && seconds % DURATION_UNIT_SECONDS[unit] === 0) return unit;
  }
  return ordered[ordered.length - 1] ?? 'seconds';
}

/** A number of seconds as the field holds it, in the largest whole unit; null is the default (empty). */
export function durationValue(
  seconds: number | null,
  fallback: number | null = null,
  units: readonly DurationUnit[] = UNITS_LARGEST_FIRST,
): DurationValue {
  if (seconds === null) return { amount: '', unit: unitOf(fallback ?? 0, units) };
  const unit = unitOf(seconds, units);
  return { amount: String(seconds / DURATION_UNIT_SECONDS[unit]), unit };
}

/** What the field holds, in seconds: null where it is empty, NaN where the amount is not a number. */
export function durationSeconds(value: DurationValue): number | null {
  if (value.amount.trim() === '') return null;
  const n = typedNumber(value.amount);
  return n === null ? Number.NaN : n * DURATION_UNIT_SECONDS[value.unit];
}

/** A number of seconds in words, in its largest whole unit: "12 hours", "90 seconds". */
export function durationWords(
  seconds: number,
  labels: Pick<DurationFieldLabels, 'units'> = DURATION_FIELD_LABELS,
): string {
  const { amount, unit } = durationValue(seconds);
  const n = Number(amount);
  const [one, many] = labels.units[unit];
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export interface DurationFieldProps {
  id?: string | undefined;
  value: DurationValue;
  onValueChange: (value: DurationValue) => void;
  /** The duration an empty field stands for, in seconds. */
  defaultValue?: number | undefined;
  /** The bounds, in seconds: the amount's steppers hold to them in whichever unit is picked. */
  min?: number | undefined;
  max?: number | undefined;
  /** The units offered, from those the bounds can hold. All four by default. */
  units?: readonly DurationUnit[] | undefined;
  /** Durations offered as chips, in seconds, after a "Default" chip where `defaultValue` is set. */
  presets?: readonly number[] | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Puts the focus in the amount once it is drawn. */
  focusOnMount?: boolean | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  labels?: Partial<DurationFieldLabels> | undefined;
  className?: string | undefined;
}

/**
 * A duration typed as an amount and a unit (seconds, minutes, hours, days),
 * with common durations as chips: "12" and "hours", never "43200" or "12h".
 *
 * A PRESET PICKS ITS OWN UNIT: "7 days" fills 7 and days. A typed amount
 * keeps the unit beside it, and an empty field (the default) shows the
 * default's amount as its placeholder in the default's unit.
 */
export function DurationField({
  id,
  value,
  onValueChange,
  defaultValue,
  min,
  max,
  units = UNITS_LARGEST_FIRST,
  presets,
  error,
  disabled = false,
  focusOnMount,
  labels: overrides,
  className,
  ...aria
}: DurationFieldProps) {
  const labels = { ...DURATION_FIELD_LABELS, ...overrides };
  const unitId = useId();
  const size = DURATION_UNIT_SECONDS[value.unit];
  const fallback = defaultValue === undefined ? undefined : defaultValue / size;
  const seconds = durationSeconds(value);
  const words = (s: number) => durationWords(s, labels);
  const chosen =
    seconds === null
      ? ''
      : (presets ?? []).find((p) => p === seconds) !== undefined
        ? String(seconds)
        : '#typed';
  const chips = [
    ...(defaultValue === undefined ? [] : [{ value: '', label: labels.defaultPreset(words(defaultValue)) }]),
    ...(presets ?? []).map((p) => ({ value: String(p), label: words(p) })),
  ];
  return (
    <div className={cx('crewlet-duration-field', className)}>
      <div className="crewlet-duration-field__row">
        <NumberField
          id={id}
          value={value.amount}
          onValueChange={(amount) => onValueChange({ amount, unit: value.unit })}
          defaultValue={fallback !== undefined && Number.isInteger(fallback) ? fallback : undefined}
          min={min === undefined ? 0 : Math.ceil(min / size)}
          max={max === undefined ? undefined : Math.floor(max / size)}
          error={error}
          disabled={disabled}
          focusOnMount={focusOnMount}
          aria-label={aria['aria-label']}
          aria-describedby={aria['aria-describedby']}
          labels={{ decrease: labels.decrease, increase: labels.increase }}
          className="crewlet-duration-field__amount"
        />
        <Select
          id={unitId}
          ariaLabel={labels.unit}
          size="md"
          width="auto"
          disabled={disabled}
          value={value.unit}
          options={UNITS_LARGEST_FIRST.filter((u) => units.includes(u))
            .reverse()
            .map((u) => ({ value: u, label: labels.units[u][1] }))}
          onChange={(next) => onValueChange({ amount: value.amount, unit: next as DurationUnit })}
          className="crewlet-duration-field__unit"
        />
      </div>
      {chips.length > 0 ? (
        <PresetChips
          label={labels.presets}
          options={chips}
          value={chosen}
          disabled={disabled}
          onPick={(picked) =>
            onValueChange(picked === '' ? durationValue(null, defaultValue ?? null, units) : durationValue(Number(picked), null, units))
          }
        />
      ) : null}
    </div>
  );
}
