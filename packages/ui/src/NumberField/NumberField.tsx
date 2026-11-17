import { forwardRef, useEffect, useImperativeHandle, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { MinusGlyph, PlusGlyph } from '@crewlethq/icons/glyphs';
import { IconButton } from '../IconButton/index.js';
import { Input } from '../Input/index.js';
import { useFieldError } from '../Input/fieldContext.js';
import { PresetChips, type PresetChip } from '../PresetChips/index.js';
import { cx } from '../utils/cx.js';

/** Every string the field draws itself. */
export interface NumberFieldLabels {
  decrease: string;
  increase: string;
  /** The preset that empties the field, with the default it stands for: "Default (10)". */
  defaultPreset: (value: string) => string;
  /** Names the preset row. */
  presets: string;
}

export const NUMBER_FIELD_LABELS: NumberFieldLabels = {
  decrease: 'Decrease',
  increase: 'Increase',
  defaultPreset: (value) => `Default (${value})`,
  presets: 'Common values',
};

export interface NumberFieldProps {
  id?: string | undefined;
  /** What is typed. Empty is the default, drawn as the placeholder. */
  value: string;
  onValueChange: (value: string) => void;
  /** The value an empty field stands for: its placeholder, and where a step from empty starts. */
  defaultValue?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  /** How far one press or arrow moves the value. Defaults to 1. */
  step?: number | undefined;
  /** The unit after the number, inside the field: "characters", "%". */
  unit?: ReactNode;
  /**
   * Values offered as chips under the field. Given (even empty), a "Default"
   * chip leads them where `defaultValue` is set; left out, no chips are drawn.
   */
  presets?: readonly PresetChip[] | undefined;
  /** How a preset or the default is said on its chip: "10 characters". Defaults to the number. */
  formatValue?: ((value: number) => string) | undefined;
  error?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Puts the focus in the field once it is drawn: a panel opened to change this value. */
  focusOnMount?: boolean | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  labels?: Partial<NumberFieldLabels> | undefined;
  className?: string | undefined;
}

/** The digits after the point a step carries, so 0.1 + 0.2 is drawn 0.3. */
function decimals(step: number): number {
  const text = String(step);
  const at = text.indexOf('.');
  return at === -1 ? 0 : text.length - at - 1;
}

/** What is typed, as a number, or null where it is empty or not one. */
export function typedNumber(value: string): number | null {
  const text = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** `n` held to the field's bounds. */
function clamp(n: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

/**
 * A number typed or stepped: a field between a decrease and an increase
 * button, held to its bounds, with the default as its placeholder.
 *
 * THE STEPPERS STAND BESIDE THE FIELD, never inside it, and take no tab stop:
 * the arrows step from the field itself (Page Up and Page Down by ten steps),
 * as a spin button does. A step from an empty field starts at the default, so
 * one press of + on "10 (default)" reads 11. At a bound its button is held.
 *
 * WHAT IS TYPED STAYS THE CALLER'S, as text: a half-typed "1." or a word is
 * the caller's to read and refuse, and empty is the default.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    id,
    value,
    onValueChange,
    defaultValue,
    min,
    max,
    step = 1,
    unit,
    presets,
    formatValue,
    error: errorProp,
    disabled = false,
    focusOnMount = false,
    labels: overrides,
    className,
    ...aria
  },
  ref,
) {
  const labels = { ...NUMBER_FIELD_LABELS, ...overrides };
  const field = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => field.current!, []);
  useEffect(() => {
    if (focusOnMount) field.current?.focus();
  }, [focusOnMount]);
  const error = useFieldError(errorProp);
  const typed = typedNumber(value);
  const current = value.trim() === '' ? defaultValue : (typed ?? undefined);
  const say = formatValue ?? ((n: number) => n.toLocaleString());
  const places = decimals(step);

  const stepBy = (times: number) => {
    const from = current ?? defaultValue ?? min ?? 0;
    const next = clamp(Number((from + times * step).toFixed(places)), min, max);
    onValueChange(String(next));
  };
  const atMin = min !== undefined && current !== undefined && current <= min;
  const atMax = max !== undefined && current !== undefined && current >= max;

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    const by =
      event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : event.key === 'PageUp' ? 10 : event.key === 'PageDown' ? -10 : 0;
    if (by === 0 || disabled) return;
    event.preventDefault();
    stepBy(by);
  };

  const chips: PresetChip[] = [
    ...(defaultValue === undefined ? [] : [{ value: '', label: labels.defaultPreset(say(defaultValue)) }]),
    ...(presets ?? []),
  ];

  return (
    <div className={cx('crewlet-number-field', className)}>
      <div className="crewlet-number-field__row">
        <IconButton
          size="md"
          variant="secondary"
          icon={<MinusGlyph />}
          label={labels.decrease}
          tabIndex={-1}
          disabled={disabled || atMin}
          onClick={() => stepBy(-1)}
        />
        <Input
          ref={field}
          id={id}
          role="spinbutton"
          value={value}
          placeholder={defaultValue === undefined ? undefined : String(defaultValue)}
          inputMode={places > 0 || (min !== undefined && min < 0) ? 'decimal' : 'numeric'}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          error={error}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
          aria-label={aria['aria-label']}
          aria-describedby={aria['aria-describedby']}
          trailing={unit === undefined ? undefined : <span className="crewlet-number-field__unit">{unit}</span>}
          containerClassName="crewlet-number-field__input"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={keys}
        />
        <IconButton
          size="md"
          variant="secondary"
          icon={<PlusGlyph />}
          label={labels.increase}
          tabIndex={-1}
          disabled={disabled || atMax}
          onClick={() => stepBy(1)}
        />
      </div>
      {presets !== undefined && chips.length > 0 ? (
        <PresetChips label={labels.presets} options={chips} value={value.trim()} disabled={disabled} onPick={onValueChange} />
      ) : null}
    </div>
  );
});
