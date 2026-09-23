import { MonitorGlyph, MoonGlyph, SunGlyph } from '@crewlethq/icons/glyphs';
import { SegmentedControl } from '../SegmentedControl/index.js';
import {
  useDensityPreference,
  useThemePreference,
  type DensityPreference,
  type ThemePreference,
} from './preferences.js';

/**
 * Who holds a preference: the control, or the application around it.
 *
 * STORED, the default: the control reads the choice kept under `storageKey`,
 * writes the root attribute and storage when it changes, and tells `onChange`
 * afterwards. Every stored control on one key reads one value, so two of them
 * on a page agree.
 *
 * CONTROLLED, with `value`: the control draws `value`, calls `onChange` with
 * the reader's pick and WRITES NOTHING, neither the root attribute nor
 * storage. The application owns the preference (normally one
 * `useThemePreference` it hands to every control that shows it), so a second
 * writer here would be a second opinion about which theme is on. A
 * `storageKey` has nothing to name in that mode, and the types refuse one.
 *
 * A control is one or the other for its whole life: the two are different
 * components underneath, so switching remounts it.
 */
export type PreferenceControl<T extends string> =
  | {
      value?: undefined;
      /** Told after a pick is applied and stored. */
      onChange?: ((next: T) => void) | undefined;
      /** Where the choice is kept. */
      storageKey?: string | undefined;
    }
  | {
      /** The choice to draw. The control writes nothing of its own. */
      value: T;
      /** The reader's pick. Nothing changes until `value` does. */
      onChange: (next: T) => void;
      storageKey?: undefined;
    };

interface ThemeRowProps {
  /** Names the group. */
  label?: string | undefined;
  /** What each choice is called out loud. The glyphs say nothing on their own. */
  lightLabel?: string | undefined;
  systemLabel?: string | undefined;
  darkLabel?: string | undefined;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}

export type ThemeSwitcherProps = ThemeRowProps & PreferenceControl<ThemePreference>;

/**
 * Light, the system's, or dark.
 *
 * A SETTING, so it is a radio group and the arrows change it as they move: a
 * choice that is not in the URL and pushes no history entry costs nothing to
 * change on every keypress. The engine drew this row as TABS, so a screen
 * reader announced three tabs and went looking for the panels they opened.
 *
 * EACH OPTION IS A WORD, not a picture of one. The glyphs are the whole of
 * what is drawn, so without a spoken name the row is three unnamed buttons.
 */
export function ThemeSwitcher(props: ThemeSwitcherProps) {
  if (props.value !== undefined) {
    const { storageKey: _none, ...controlled } = props;
    return <ThemeRow {...controlled} />;
  }
  const { value: _stored, storageKey = 'crewlet_theme', ...row } = props;
  return <StoredThemeSwitcher {...row} storageKey={storageKey} />;
}

function StoredThemeSwitcher({
  storageKey,
  onChange,
  ...row
}: ThemeRowProps & { storageKey: string; onChange?: ((next: ThemePreference) => void) | undefined }) {
  const [theme, choose] = useThemePreference({ storageKey });
  return (
    <ThemeRow
      {...row}
      value={theme}
      onChange={(next) => {
        choose(next);
        onChange?.(next);
      }}
    />
  );
}

function ThemeRow({
  value,
  onChange,
  label = 'Theme',
  lightLabel = 'Light',
  systemLabel = 'Follow the system',
  darkLabel = 'Dark',
  size = 'sm',
  className,
}: ThemeRowProps & { value: ThemePreference; onChange: (next: ThemePreference) => void }) {
  return (
    <SegmentedControl<ThemePreference>
      label={label}
      semantics="radio"
      size={size}
      className={className}
      value={value}
      onValueChange={onChange}
      options={[
        { value: 'light', icon: <SunGlyph />, srLabel: lightLabel, title: lightLabel },
        { value: 'system', icon: <MonitorGlyph />, srLabel: systemLabel, title: systemLabel },
        { value: 'dark', icon: <MoonGlyph />, srLabel: darkLabel, title: darkLabel },
      ]}
    />
  );
}

interface DensityRowProps {
  label?: string | undefined;
  /** What each choice is called out loud. */
  compactLabel?: string | undefined;
  normalLabel?: string | undefined;
  comfortableLabel?: string | undefined;
  /** What each choice is drawn as. One letter, which is a picture of a size. */
  compactMark?: string | undefined;
  normalMark?: string | undefined;
  comfortableMark?: string | undefined;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}

export type DensitySwitcherProps = DensityRowProps & PreferenceControl<DensityPreference>;

/**
 * How much room the interface gives itself.
 *
 * THE LETTERS ARE A PICTURE AND THE WORDS ARE THE NAME. Drawn as S, M and L
 * with nothing else, a screen reader read out three letters, which name
 * nothing: a reader was offered "S" and left to guess. The mark stays, and
 * each option is called Compact, Normal or Comfortable.
 */
export function DensitySwitcher(props: DensitySwitcherProps) {
  if (props.value !== undefined) {
    const { storageKey: _none, ...controlled } = props;
    return <DensityRow {...controlled} />;
  }
  const { value: _stored, storageKey = 'crewlet_density', ...row } = props;
  return <StoredDensitySwitcher {...row} storageKey={storageKey} />;
}

function StoredDensitySwitcher({
  storageKey,
  onChange,
  ...row
}: DensityRowProps & { storageKey: string; onChange?: ((next: DensityPreference) => void) | undefined }) {
  const [density, choose] = useDensityPreference({ storageKey });
  return (
    <DensityRow
      {...row}
      value={density}
      onChange={(next) => {
        choose(next);
        onChange?.(next);
      }}
    />
  );
}

function DensityRow({
  value,
  onChange,
  label = 'Density',
  compactLabel = 'Compact',
  normalLabel = 'Normal',
  comfortableLabel = 'Comfortable',
  compactMark = 'S',
  normalMark = 'M',
  comfortableMark = 'L',
  size = 'sm',
  className,
}: DensityRowProps & { value: DensityPreference; onChange: (next: DensityPreference) => void }) {
  return (
    <SegmentedControl<DensityPreference>
      label={label}
      semantics="radio"
      size={size}
      className={className}
      value={value}
      onValueChange={onChange}
      options={[
        { value: 'compact', label: compactMark, srLabel: compactLabel, title: compactLabel },
        { value: 'normal', label: normalMark, srLabel: normalLabel, title: normalLabel },
        {
          value: 'comfortable',
          label: comfortableMark,
          srLabel: comfortableLabel,
          title: comfortableLabel,
        },
      ]}
    />
  );
}
