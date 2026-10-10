import { SegmentedControl, type SegmentedSize } from '../SegmentedControl/SegmentedControl.js';
import { cx } from '../utils/cx.js';
import { NODE_HUES, NODE_HUE_NAMES, type NodeHue } from '../utils/nodeHue.js';

export interface HuePickerProps {
  /** The group's name, said on entering it: "Color". */
  label: string;
  value: NodeHue;
  onValueChange: (hue: NodeHue) => void;
  size?: SegmentedSize | undefined;
  /** Nothing can be chosen, and the row says so. */
  disabled?: boolean | undefined;
  className?: string | undefined;
}

const optionsFor = (disabled: boolean) =>
  NODE_HUES.map((hue) => ({
    value: hue,
    label: NODE_HUE_NAMES[hue],
    icon: <span className={`crewlet-hue-picker__swatch crewlet-hue-picker__swatch--${hue}`} />,
    disabled,
  }));

const ENABLED = optionsFor(false);
const DISABLED = optionsFor(true);

/**
 * The choice of an entity's hue: the six node hues as a row of chips, each a
 * swatch and the hue's name.
 *
 * THE NAME IS PRINTED, not left to the swatch, because a swatch alone asks the
 * reader to tell six hues apart, which some readers cannot, and says nothing
 * to a screen reader. It is a `SegmentedControl` radio row, so it keeps the
 * kit's one tab stop and the arrows that choose as they move.
 *
 * DISABLED IS EVERY CHIP DISABLED, as `CharacterPicker` is every tile: the
 * row is still read and the chosen hue still shown, and nothing in it takes
 * focus or a press.
 */
export function HuePicker({ label, value, onValueChange, size, disabled = false, className }: HuePickerProps) {
  return (
    <SegmentedControl
      semantics="radio"
      layout="chips"
      label={label}
      options={disabled ? DISABLED : ENABLED}
      value={value}
      onValueChange={onValueChange}
      size={size}
      className={cx('crewlet-hue-picker', className)}
    />
  );
}
