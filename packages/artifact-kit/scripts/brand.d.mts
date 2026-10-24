/**
 * Types for scripts/brand.mjs, which the kit build runs as plain JavaScript
 * and the Storybook's brand story imports to paint the layer exactly as the
 * build bundles it.
 */

/** The prefix a theme's own value of a brand-driven token is moved to. */
export const THEME_PREFIX: string;

/** Every public token the brand layer declares, sorted. */
export function brandSlots(brandCss: string): string[];

/** The name a token's theme value is moved to. */
export function themeName(slot: string): string;

/** A stylesheet with every declaration of a slot renamed to its theme name, and the slots it declared. */
export function renameSlots(css: string, slots: readonly string[]): { css: string; found: Set<string> };

/** The whole token stylesheet with its slots moved aside; throws for a slot it never declares. */
export function moveThemeValues(tokenCss: string, slots: readonly string[]): string;
