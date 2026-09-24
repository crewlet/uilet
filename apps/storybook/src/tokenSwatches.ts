import { color, themes, type ThemeName } from '@crewlethq/tokens';

/** One colour token as the Colors story draws it. */
export interface TokenSwatch {
  /** The token's path in the typed export, `surface.frame`. */
  name: string;
  /** The value the root this list describes paints for it. */
  value: string;
  /**
   * Where that value comes from: the palette's own declaration, or the base
   * root's, which every palette inherits for a slot it does not declare (the
   * brand marks, the gradient, the avatar tints).
   */
  source: 'palette' | 'base';
}

/** The roots a swatch list can describe: a palette, or the base root alone. */
export type SwatchRoot = ThemeName | 'base';

function flatten(node: Record<string, unknown>, prefix = ''): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, child] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') out.push([path, child]);
    else if (child && typeof child === 'object') out.push(...flatten(child as Record<string, unknown>, path));
  }
  return out;
}

/**
 * Every colour token, with the value the cascade paints for it under `root`.
 *
 * WHY NOT `color` ALONE. The typed `color` export is the BASE root, the
 * marketing black a document with no theme layer paints. An application loads
 * `@crewlethq/tokens/css/themes`, whose blocks override it slot by slot, so
 * listing `color` under the theme toolbar showed a black frame and sheet in
 * the light palette and never showed the grounds either palette actually
 * paints. What a palette paints is its own declarations over the base root's,
 * which is exactly the cascade: `:root` first, the theme block after it.
 *
 * The order is the base root's, so the two lists line up row for row.
 */
export function swatchesFor(root: SwatchRoot): TokenSwatch[] {
  const own = new Map(root === 'base' ? [] : flatten(themes[root].color));
  return flatten(color).map(([name, base]) => {
    const value = own.get(name);
    return value === undefined ? { name, value: base, source: 'base' } : { name, value, source: 'palette' };
  });
}
