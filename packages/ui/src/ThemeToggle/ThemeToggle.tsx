import { MoonGlyph, SunGlyph } from '@crewlethq/icons/glyphs';
import { IconButton, type IconButtonSize, type IconButtonVariant } from '../IconButton/index.js';
import type { PreferenceControl } from '../ThemeSwitcher/ThemeSwitcher.js';
import {
  resolveTheme,
  useSystemTheme,
  useThemePreference,
  type ThemePreference,
} from '../ThemeSwitcher/preferences.js';

interface ToggleButtonProps {
  /** Named for what a press does, while the page is dark. */
  toLightLabel?: string | undefined;
  /** Named for what a press does, while the page is light. */
  toDarkLabel?: string | undefined;
  /** The rail's foot wears `sm`, the quiet step beside the identity row. */
  size?: IconButtonSize | undefined;
  variant?: IconButtonVariant | undefined;
  className?: string | undefined;
}

/**
 * `onChange` receives `light` or `dark`, never `system`: a press is a choice.
 * Stored (the default) or controlled by `value`, as `ThemeSwitcher` is, and a
 * controlled toggle writes nothing of its own.
 */
export type ThemeToggleProps = ToggleButtonProps & PreferenceControl<ThemePreference>;

/**
 * One press from the palette on the screen to the other one.
 *
 * IT FLIPS WHAT IS PAINTED, NOT WHAT WAS CHOSEN. A reader following a dark
 * system has the preference `system`; toggling that preference has no
 * opposite to go to, and cycling light, system, dark would spend a press on
 * `system`, which repaints nothing and reads as a button that did not work.
 * So the toggle RESOLVES the preference against the platform (the query the
 * theme layer itself answers) and writes the explicit opposite, which beats
 * the system in both directions. Following the system again is a choice in the
 * full `ThemeSwitcher`, which is where a settings screen offers it.
 *
 * NAMED FOR THE ACTION, drawn as the destination. The name changes with the
 * palette ("Switch to the light theme" on a dark page), so a screen reader
 * hears what a press will do, and the glyph is the palette it goes to: a sun
 * on a dark page, a moon on a light one. It is NOT `aria-pressed`, because
 * neither palette is the "on" state of the other, and a pressed state beside a
 * changing name would announce the change twice in two contradicting ways.
 */
export function ThemeToggle(props: ThemeToggleProps) {
  if (props.value !== undefined) {
    const { storageKey: _none, ...controlled } = props;
    return <ToggleButton {...controlled} />;
  }
  const { value: _stored, storageKey = 'crewlet_theme', ...button } = props;
  return <StoredThemeToggle {...button} storageKey={storageKey} />;
}

function StoredThemeToggle({
  storageKey,
  onChange,
  ...button
}: ToggleButtonProps & { storageKey: string; onChange?: ((next: ThemePreference) => void) | undefined }) {
  const [theme, choose] = useThemePreference({ storageKey });
  return (
    <ToggleButton
      {...button}
      value={theme}
      onChange={(next) => {
        choose(next);
        onChange?.(next);
      }}
    />
  );
}

function ToggleButton({
  value,
  onChange,
  toLightLabel = 'Switch to the light theme',
  toDarkLabel = 'Switch to the dark theme',
  size = 'sm',
  variant = 'ghost',
  className,
}: ToggleButtonProps & { value: ThemePreference; onChange: (next: ThemePreference) => void }) {
  const system = useSystemTheme();
  const next = resolveTheme(value, system) === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={next === 'light' ? toLightLabel : toDarkLabel}
      icon={next === 'light' ? <SunGlyph /> : <MoonGlyph />}
      size={size}
      variant={variant}
      className={className}
      onClick={() => onChange(next)}
    />
  );
}
