// The brand layer's contract with the token stylesheets bundled under it.
//
// src/brand.css declares each public token a brand restyles (the accent
// family, the label on it, the grounds, the body text, the faces) once, as
// the brand's value or the theme's. A custom property cannot fall back to an
// earlier value of its own name, so the theme's value has to be reachable
// under a second one: the build renames every declaration of those tokens in
// the token stylesheets to `--crewlet-theme-<name>`, in every block (the base
// root, the default theme's dark and light blocks, every named theme's), and
// the brand layer is then the only place a public name is declared.
//
// The list of tokens is read from src/brand.css itself, so the layer and the
// rename cannot disagree: a token added to the layer is moved aside by the
// next build, and one the token stylesheets do not declare stops the build
// rather than shipping a public token with nothing to fall back to.

/** The prefix a theme's own value of a brand-driven token is moved to. */
export const THEME_PREFIX = '--crewlet-theme-';

const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every public token the brand layer declares: each custom property it sets
 * that is neither one of its own private steps (`--crewlet-`) nor an input
 * (`--brand-`).
 */
export function brandSlots(brandCss) {
  const names = new Set();
  for (const match of withoutComments(brandCss).matchAll(/(?:^|[{;\s])(--[a-z0-9-]+)\s*:/g)) {
    const name = match[1];
    if (!name.startsWith('--crewlet-') && !name.startsWith('--brand-')) names.add(name);
  }
  return [...names].sort();
}

/** The name a token's theme value is moved to: `--color-brand-accent` becomes `--crewlet-theme-color-brand-accent`. */
export const themeName = (slot) => `${THEME_PREFIX}${slot.slice(2)}`;

/**
 * A stylesheet with every declaration of a slot renamed to its theme name,
 * and the slots it declared. References (`var(--color-brand-accent)`) are
 * left alone, so a token that aliases a slot follows the brand.
 */
export function renameSlots(css, slots) {
  const escaped = slots.map((slot) => slot.replace(/[-]/g, '\\-'));
  const declaration = new RegExp(`(^|[{;\\s])(${escaped.join('|')})(\\s*:)`, 'g');
  const found = new Set();
  const renamed = withoutComments(css).replace(declaration, (_, before, slot, colon) => {
    found.add(slot);
    return `${before}${themeName(slot)}${colon}`;
  });
  return { css: renamed, found };
}

/**
 * The whole token stylesheet with its slots moved aside (renameSlots), held
 * to declaring every one: a slot it never declares is one the layer would
 * fall back to in vain, so the build stops on it.
 */
export function moveThemeValues(tokenCss, slots) {
  const { css: moved, found } = renameSlots(tokenCss, slots);
  const missing = slots.filter((slot) => !found.has(slot));
  if (missing.length > 0) {
    throw new Error(`the token stylesheets declare no theme value for ${missing.join(', ')}, which src/brand.css falls back to`);
  }
  return moved;
}
