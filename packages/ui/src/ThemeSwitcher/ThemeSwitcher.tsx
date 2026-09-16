import { ComputerGlyph, DarkModeGlyph, LightModeGlyph } from '@crewlethq/icons/glyphs';
import { SegmentedControl } from '../SegmentedControl/index.js';
import {
  useDensityPreference,
  useThemePreference,
  type DensityPreference,
  type ThemePreference,
} from './preferences.js';

export interface ThemeSwitcherProps {
  /** Where the choice is kept. */
  storageKey?: string;
  /** Names the group. */
  label?: string;
  /** What each choice is called out loud. The glyphs say nothing on their own. */
  lightLabel?: string;
  systemLabel?: string;
  darkLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

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
export function ThemeSwitcher({
  storageKey = 'crewlet_theme',
  label = 'Theme',
  lightLabel = 'Light',
  systemLabel = 'Follow the system',
  darkLabel = 'Dark',
  size = 'sm',
  className,
}: ThemeSwitcherProps) {
  const [theme, choose] = useThemePreference({ storageKey });
  return (
    <SegmentedControl<ThemePreference>
      label={label}
      semantics="radio"
      size={size}
      className={className}
      value={theme}
      onValueChange={choose}
      options={[
        { value: 'light', icon: <LightModeGlyph />, srLabel: lightLabel, title: lightLabel },
        { value: 'system', icon: <ComputerGlyph />, srLabel: systemLabel, title: systemLabel },
        { value: 'dark', icon: <DarkModeGlyph />, srLabel: darkLabel, title: darkLabel },
      ]}
    />
  );
}

export interface DensitySwitcherProps {
  storageKey?: string;
  label?: string;
  /** What each choice is called out loud. */
  compactLabel?: string;
  normalLabel?: string;
  comfortableLabel?: string;
  /** What each choice is drawn as. One letter, which is a picture of a size. */
  compactMark?: string;
  normalMark?: string;
  comfortableMark?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * How much room the interface gives itself.
 *
 * THE LETTERS ARE A PICTURE AND THE WORDS ARE THE NAME. Drawn as S, M and L
 * with nothing else, a screen reader read out three letters, which name
 * nothing: a reader was offered "S" and left to guess. The mark stays, and
 * each option is called Compact, Normal or Comfortable.
 */
export function DensitySwitcher({
  storageKey = 'crewlet_density',
  label = 'Density',
  compactLabel = 'Compact',
  normalLabel = 'Normal',
  comfortableLabel = 'Comfortable',
  compactMark = 'S',
  normalMark = 'M',
  comfortableMark = 'L',
  size = 'sm',
  className,
}: DensitySwitcherProps) {
  const [density, choose] = useDensityPreference({ storageKey });
  return (
    <SegmentedControl<DensityPreference>
      label={label}
      semantics="radio"
      size={size}
      className={className}
      value={density}
      onValueChange={choose}
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
