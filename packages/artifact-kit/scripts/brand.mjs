// The brand layer's contract with the token stylesheets bundled under it.
//
// The mapping itself is not here: its one source is @crewlethq/tokens'
// stylesheets/brand.css, published as `@crewlethq/tokens/css/brand` and,
// moved onto a scope of its own, as `css/brand-scope` (for @crewlethq/ui's
// BrandScope). The kit bundles the root layer into kit.css, and the token
// package's own module (`brandSlots`, `brandThemeName`) is what names the
// public tokens it declares, so the kit, the scope and the rename read one
// list.
//
// The layer declares each public token a brand restyles once, as the brand's
// value or the theme's. A custom property cannot fall back to an earlier
// value of its own name, so the theme's value has to be reachable under a
// second one: the build renames every declaration of those tokens in the
// token stylesheets to `--crewlet-theme-<name>`, in every block (the base
// root, the default theme's dark and light blocks, every named theme's), and
// the brand layer is then the only place a public name is declared. A token
// the token stylesheets do not declare stops the build rather than shipping a
// public token with nothing to fall back to.

import { BRAND_THEME_PREFIX, brandSlots, brandThemeName } from '@crewlethq/tokens';

/** The prefix a theme's own value of a brand-driven token is moved to. */
export const THEME_PREFIX = BRAND_THEME_PREFIX;

export { brandSlots };

/** The name a token's theme value is moved to: `--color-brand-accent` becomes `--crewlet-theme-color-brand-accent`. */
export const themeName = brandThemeName;

const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The root layer as kit.css carries it: comments out and white space
 * collapsed, every declaration otherwise exactly as its source writes it. Not
 * minified, because a minifier rewrites values (`0.179` to `.179`), and a
 * byte-for-byte copy is what lets the suite find the source's mapping in the
 * built kit.
 */
export function compactLayer(css) {
  return withoutComments(css)
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .trim();
}

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
    throw new Error(`the token stylesheets declare no theme value for ${missing.join(', ')}, which the brand layer falls back to`);
  }
  return moved;
}
