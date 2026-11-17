import type { ReactNode } from 'react';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { cx } from '../utils/cx.js';

/** One value a field offers to fill in. */
export interface PresetChip {
  /** What a pick hands the field, as the field holds it: "" for its default. */
  value: string;
  label: ReactNode;
}

export interface PresetChipsProps {
  /** Names the row: "Common values". */
  label: string;
  options: readonly PresetChip[];
  /** What the field holds now. The chip of that value is drawn chosen; none is where no chip matches. */
  value: string;
  onPick: (value: string) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Common values for one field, as a row of chips that fill it in: the
 * default first, then a few a reader most often wants.
 *
 * A SHORTCUT, NOT THE CONTROL. The field beside it stays the value: a pick
 * writes into it, typing past a chip leaves every chip unchosen, and the chip
 * matching what the field holds is drawn chosen, so a typed "1h" lights the
 * "1 hour" chip.
 */
export function PresetChips({ label, options, value, onPick, disabled = false, className }: PresetChipsProps) {
  return (
    <SegmentedControl
      semantics="radio"
      layout="chips"
      size="sm"
      label={label}
      className={cx('crewlet-preset-chips', className)}
      options={options.map((option) => ({ value: option.value, label: option.label, disabled }))}
      value={value}
      onValueChange={onPick}
    />
  );
}
