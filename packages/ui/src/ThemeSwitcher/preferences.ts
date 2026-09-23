import { useCallback, useEffect, useSyncExternalStore } from 'react';

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

/**
 * Writing a stored preference, which can also throw. Answers whether the
 * value was kept, because a refused write is not the end of the choice: it
 * still holds for this visit (see `held`).
 */
function write(key: string, value: string): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    // A reader who has turned storage off has said what they want: the
    // setting works for this visit and is forgotten, which is not a failure
    // worth telling anybody about.
    return false;
  }
}

/*
 * ONE VALUE PER KEY, WHOEVER DRAWS IT.
 *
 * A page routinely draws the theme twice: a toggle in the rail and the full
 * row on a settings screen. Each used to hold its own copy of the choice in
 * component state, so a press on one repainted the page and left the other
 * showing the choice it had replaced, and a press on the stale one then
 * "changed" to what was already on. The choice is a fact about the key, so it
 * is read from the key: every hook reading one key subscribes to it, and a
 * change through any of them notifies all of them.
 *
 * `unsaved` is the visit's memory of a value storage REFUSED. Without it a
 * reader in a private window pressed the toggle, the root repainted, and the
 * next render read storage again, found nothing and drew the control for the
 * choice they had just left.
 */
const listeners = new Map<string, Set<() => void>>();
const unsaved = new Map<string, string>();

function held<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const kept = unsaved.get(key);
  if (kept !== undefined) return kept as T;
  return read(key, allowed, fallback);
}

function keep(key: string, value: string): void {
  if (write(key, value)) unsaved.delete(key);
  else unsaved.set(key, value);
  for (const notify of listeners.get(key) ?? []) notify();
}

function subscribeTo(key: string, notify: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(notify);
  // Another tab writing the same key is the same fact changing: the window's
  // `storage` event is how a browser says so, and a `null` key is a clear.
  const fromElsewhere = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  const target = typeof window === 'undefined' ? null : window;
  target?.addEventListener('storage', fromElsewhere);
  return () => {
    set.delete(notify);
    if (set.size === 0) listeners.delete(key);
    target?.removeEventListener('storage', fromElsewhere);
  };
}

/**
 * A choice kept under `key`, applied to the root and shared with every other
 * reader of that key.
 *
 * The server's answer is the fallback, because a server has no storage to
 * read: the document it sends follows the system, and the stored choice is
 * applied before the first paint by `applyStoredPreferences`.
 */
function useStoredChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  apply: (value: T) => void,
): [T, (next: T) => void] {
  const subscribe = useCallback((notify: () => void) => subscribeTo(key, notify), [key]);
  const value = useSyncExternalStore(
    subscribe,
    () => held(key, allowed, fallback),
    () => fallback,
  );

  useEffect(() => {
    apply(value);
  }, [apply, value]);

  const choose = useCallback(
    (next: T) => {
      apply(next);
      keep(key, next);
    },
    [apply, key],
  );

  return [value, choose];
}

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement;
}

/**
 * Puts the theme on the root element.
 *
 * `system` REMOVES the attribute rather than writing a third value, because
 * following the system IS the absence of a choice, and the stylesheet's own
 * default is the system's: a document with no attribute is dark, or light
 * where the platform asks for light. What beats the system is an explicit
 * value, in both directions: `light` by a block of its own, `dark` by keeping
 * the light media block from matching. A `data-theme="system"` names no
 * palette, so it would be a choice only to the code that asks whether the
 * attribute is there at all, which is the wrong answer to give it.
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
 * reads it re-render for a change none of them draw. Two calls with one
 * `storageKey` read one value, so a toggle and a row on the same page agree.
 */
export function useThemePreference({
  storageKey,
}: PreferenceOptions): [ThemePreference, (next: ThemePreference) => void] {
  return useStoredChoice(storageKey, THEMES, 'system', applyTheme);
}

/** The reader's density, kept on the root element and in storage. */
export function useDensityPreference({
  storageKey,
}: PreferenceOptions): [DensityPreference, (next: DensityPreference) => void] {
  return useStoredChoice(storageKey, DENSITIES, 'normal', applyDensity);
}

/** The palette the root actually paints: a choice, or the system's answer. */
export type ResolvedTheme = 'light' | 'dark';

/*
 * The query is the stylesheet's own. The theme layer is dark first and
 * repaints light only under `(prefers-color-scheme: light)`, so a browser that
 * reports NO preference matches neither query and is painted dark. Asking
 * "is the system dark" would answer no for that browser and call a dark page
 * light, and a toggle reading it would offer to switch to the palette already
 * on the screen.
 */
const LIGHT_SYSTEM = '(prefers-color-scheme: light)';

function systemLight(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(LIGHT_SYSTEM).matches
    : false;
}

function subscribeToSystem(notify: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const list = window.matchMedia(LIGHT_SYSTEM);
  list.addEventListener('change', notify);
  return () => list.removeEventListener('change', notify);
}

/**
 * The palette the platform asks for, now and whenever it changes. A server,
 * and a browser that cannot be asked, are answered dark, which is what the
 * theme layer paints for them.
 */
export function useSystemTheme(): ResolvedTheme {
  const light = useSyncExternalStore(subscribeToSystem, systemLight, () => false);
  return light ? 'light' : 'dark';
}

/** What a preference paints on a platform that asks for `system`. */
export function resolveTheme(preference: ThemePreference, system: ResolvedTheme): ResolvedTheme {
  return preference === 'system' ? system : preference;
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
  const theme = themeKey ? held(themeKey, THEMES, 'system') : 'system';
  const density = densityKey ? held(densityKey, DENSITIES, 'normal') : 'normal';
  applyTheme(theme);
  applyDensity(density);
  return { theme, density };
}
