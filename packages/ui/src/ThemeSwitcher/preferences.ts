import { useCallback, useEffect, useState } from 'react';

/** What a reader can ask the palette to be. `system` follows the platform. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** How much room the interface gives itself. `normal` is the unscaled step. */
export type DensityPreference = 'normal' | 'compact' | 'comfortable';

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
const DENSITIES: readonly DensityPreference[] = ['normal', 'compact', 'comfortable'];

/**
 * Reading a stored preference, which can throw.
 *
 * NOT JUST AN UNKNOWN VALUE. A browser in a private window, one with site
 * data blocked, and a page in a sandboxed frame all throw on the ACCESS
 * rather than answering null, so a bare `localStorage.getItem` takes the
 * whole application down before the first render. And what comes back is a
 * string somebody could have written by hand, so it is checked against the
 * values that exist rather than cast to the type they should have been.
 */
function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const held = globalThis.localStorage?.getItem(key);
    return allowed.includes(held as T) ? (held as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // A reader who has turned storage off has said what they want: the
    // setting works for this visit and is forgotten, which is not a failure
    // worth telling anybody about.
  }
}

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement;
}

/**
 * Puts the theme on the root element.
 *
 * `system` REMOVES the attribute rather than writing a third value, because
 * the stylesheet's own default is the system's: a document with no attribute
 * is light, or dark where the platform asks for dark. A `data-theme="system"`
 * would match neither selector and paint the light palette on a reader who
 * asked for dark.
 */
export function applyTheme(theme: ThemePreference): void {
  const el = root();
  if (!el) return;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
}

/** Puts the density on the root element. `normal` removes the attribute. */
export function applyDensity(density: DensityPreference): void {
  const el = root();
  if (!el) return;
  if (density === 'normal') el.removeAttribute('data-density');
  else el.setAttribute('data-density', density);
}

export interface PreferenceOptions {
  /** Where the choice is kept. An application picks its own name. */
  storageKey: string;
}

/**
 * The reader's theme, kept on the root element and in storage.
 *
 * WHY IT IS A HOOK RATHER THAN A CONTEXT. Nothing renders differently by
 * theme: the palette is CSS custom properties on the root, so the only state
 * is which attribute is set, and a context would make every component that
 * reads it re-render for a change none of them draw.
 */
export function useThemePreference({
  storageKey,
}: PreferenceOptions): [ThemePreference, (next: ThemePreference) => void] {
  const [theme, setTheme] = useState<ThemePreference>(() => read(storageKey, THEMES, 'system'));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const choose = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
      applyTheme(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  return [theme, choose];
}

/** The reader's density, kept on the root element and in storage. */
export function useDensityPreference({
  storageKey,
}: PreferenceOptions): [DensityPreference, (next: DensityPreference) => void] {
  const [density, setDensity] = useState<DensityPreference>(() =>
    read(storageKey, DENSITIES, 'normal'),
  );

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const choose = useCallback(
    (next: DensityPreference) => {
      setDensity(next);
      applyDensity(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  return [density, choose];
}

export interface StoredPreferences {
  themeKey?: string | undefined;
  densityKey?: string | undefined;
}

/**
 * Puts the stored preferences on the root element before the first render.
 *
 * WHY IT IS EXPORTED RATHER THAN DONE IN AN EFFECT. An effect runs after the
 * first paint, so a reader who chose dark sees one frame of light on every
 * load. The usual answer is a small inline script in the document head, and a
 * strict Content-Security-Policy refuses one: this is the same work, called
 * from the module bundle at its top level, which the policy already allows.
 *
 * It returns what it applied, so a caller can seed its own state from the
 * same read rather than making a second one.
 */
export function applyStoredPreferences({ themeKey, densityKey }: StoredPreferences): {
  theme: ThemePreference;
  density: DensityPreference;
} {
  const theme = themeKey ? read(themeKey, THEMES, 'system') : 'system';
  const density = densityKey ? read(densityKey, DENSITIES, 'normal') : 'normal';
  applyTheme(theme);
  applyDensity(density);
  return { theme, density };
}
