import { DEFAULT_THEME_ID } from '@crewlethq/tokens';

/*
 * The three appearance attributes on the root element, and nothing that needs
 * React.
 *
 * WHY THIS IS A MODULE OF ITS OWN. The same three attributes are written in
 * two documents: the application's, by the preference hooks, and an
 * artifact's, inside a sandboxed frame, by a bootstrap script that must stay
 * under two kilobytes and cannot carry React. One module with no framework in
 * it is what both import, so the frame and the page around it cannot come to
 * disagree about what "system" or "normal" means on the root.
 */

/** What a reader can ask the palette to be. `system` follows the platform. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** How much room the interface gives itself. `normal` is the unscaled step. */
export type DensityPreference = 'normal' | 'compact' | 'comfortable';

/** Every theme preference, in the order a control offers them. */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const satisfies readonly ThemePreference[];

/** Every density, in the order a control offers them. */
export const DENSITY_PREFERENCES = ['normal', 'compact', 'comfortable'] as const satisfies readonly DensityPreference[];

/**
 * The shape a palette id has: the theme's folder name in `@crewlethq/tokens`,
 * which a stylesheet quotes as an attribute value without escaping. A value
 * outside it is refused rather than written, because it arrives from storage
 * or from another document, and the attribute is read by a selector.
 */
export const PALETTE_ID = /^[a-z][a-z0-9-]{0,63}$/;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function isDensityPreference(value: unknown): value is DensityPreference {
  return typeof value === 'string' && (DENSITY_PREFERENCES as readonly string[]).includes(value);
}

export function isPaletteId(value: unknown): value is string {
  return typeof value === 'string' && PALETTE_ID.test(value);
}

function documentRoot(): Element | null {
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
export function applyTheme(theme: ThemePreference, root: Element | null = documentRoot()): void {
  if (!root) return;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** Puts the density on the root element. `normal` removes the attribute. */
export function applyDensity(density: DensityPreference, root: Element | null = documentRoot()): void {
  if (!root) return;
  if (density === 'normal') root.removeAttribute('data-density');
  else root.setAttribute('data-density', density);
}

/**
 * Puts a named theme on the root element.
 *
 * The default theme REMOVES the attribute, for the reason `system` does: the
 * default paints the bare root and has no block of its own under the
 * attribute, so writing its id would select nothing. An id that is not the
 * shape of one is refused with an error rather than written, because the
 * caller handed over something that was never a palette.
 */
export function applyPalette(palette: string, root: Element | null = documentRoot()): void {
  if (!isPaletteId(palette)) throw new Error(`"${palette}" is not a palette id.`);
  if (!root) return;
  if (palette === DEFAULT_THEME_ID) root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', palette);
}
