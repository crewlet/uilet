import { SegmentedControl, type SegmentedSize } from '../SegmentedControl/SegmentedControl.js';
import { cx } from '../utils/cx.js';
import { NODE_HUES, NODE_HUE_NAMES, type NodeHue } from '../utils/nodeHue.js';

interface HuePickerBase {
  /** The group's name, said on entering it: "Color". */
  label: string;
  size?: SegmentedSize | undefined;
  /** Nothing can be chosen, and the row says so. */
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/**
 * The six hues, or the six and NO HUE first, named by `none` ("Plain"): a
 * surface that may carry a colour (a group's band, a note) but need not.
 */
export type HuePickerProps = HuePickerBase &
  (
    | { none?: undefined; value: NodeHue; onValueChange: (hue: NodeHue) => void }
    | { none: string; value: NodeHue | 'none'; onValueChange: (hue: NodeHue | 'none') => void }
  );

/**
 * A hue's swatch, a dot in the hue, or the hairline ring of no hue: what a
 * hue picker, a hue menu or a list of coloured choices draws beside a name.
 * Decorative: the name beside it carries the hue.
 */
export function HueSwatch({ hue, className }: { hue: NodeHue | 'none'; className?: string | undefined }) {
  return <span aria-hidden="true" className={cx('crewlet-hue-picker__swatch', `crewlet-hue-picker__swatch--${hue}`, className)} />;
}

const optionsFor = (disabled: boolean) =>
  NODE_HUES.map((hue) => ({
    value: hue,
    label: NODE_HUE_NAMES[hue],
    icon: <HueSwatch hue={hue} />,
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
export function HuePicker(props: HuePickerProps) {
  const { label, size, disabled = false, className } = props;
  const hues = disabled ? DISABLED : ENABLED;
  const options =
    props.none === undefined
      ? hues
      : [
          {
            value: 'none' as const,
            label: props.none,
            icon: <HueSwatch hue="none" />,
            disabled,
          },
          ...hues,
        ];
  return (
    <SegmentedControl<NodeHue | 'none'>
      semantics="radio"
      layout="chips"
      label={label}
      options={options}
      value={props.value}
      onValueChange={(next) => {
        if (props.none === undefined) {
          if (next !== 'none') props.onValueChange(next);
        } else props.onValueChange(next);
      }}
      size={size}
      className={cx('crewlet-hue-picker', className)}
    />
  );
}
