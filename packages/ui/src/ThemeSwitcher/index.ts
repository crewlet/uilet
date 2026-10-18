export { DensitySwitcher, ThemeSwitcher } from './ThemeSwitcher.js';
export type { DensitySwitcherProps, PreferenceControl, ThemeSwitcherProps } from './ThemeSwitcher.js';

export {
  applyDensity,
  applyPalette,
  applyTheme,
  DENSITY_PREFERENCES,
  isDensityPreference,
  isPaletteId,
  isThemePreference,
  PALETTE_ID,
  THEME_PREFERENCES,
} from './apply.js';
export {
  applyStoredPreferences,
  resolveTheme,
  useDensityPreference,
  useSystemTheme,
  useThemePreference,
} from './preferences.js';
export type { DensityPreference, ThemePreference } from './apply.js';
export type { PreferenceOptions, ResolvedTheme, StoredPreferences } from './preferences.js';
