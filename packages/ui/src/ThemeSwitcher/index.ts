export { DensitySwitcher, ThemeSwitcher } from './ThemeSwitcher.js';
export type { DensitySwitcherProps, PreferenceControl, ThemeSwitcherProps } from './ThemeSwitcher.js';

export {
  applyDensity,
  applyStoredPreferences,
  applyTheme,
  resolveTheme,
  useDensityPreference,
  useSystemTheme,
  useThemePreference,
} from './preferences.js';
export type {
  DensityPreference,
  PreferenceOptions,
  ResolvedTheme,
  StoredPreferences,
  ThemePreference,
} from './preferences.js';
