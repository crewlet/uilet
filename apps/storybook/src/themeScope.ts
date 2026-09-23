import type { CSSProperties } from 'react';
import { themes, type ThemeName } from '@crewlethq/tokens';

/**
 * One palette, scoped to ONE element, for a story that draws both palettes
 * side by side.
 *
 * WHY A DATA-THEME ON A PANEL IS NOT ENOUGH. @crewlethq/tokens/css/themes
 * paints on the root element and nowhere else: its three blocks are `:root`,
 * a media-queried `:root:not([data-theme="dark"])` and
 * `:root[data-theme="light"]`, so a `data-theme` attribute on a div selects
 * nothing, and the div paints whatever the root is painting. The four stories
 * that compare the two palettes put one there, and drew the root's palette
 * twice, under a "Light" heading and a "Dark" one.
 *
 * What this returns is the palette's own declarations as the element's inline
 * custom properties: every `--color-*` and `--shadow-*` slot the theme
 * declares, read from the typed export rather than copied (the tokens suite
 * holds that export to themes.css, value for value, under these same names),
 * and the palette's `color-scheme`. Every descendant reading one of them gets
 * this palette's value whatever the root has, which is what a theme block does
 * for the whole document.
 */
export function themeScope(theme: ThemeName): CSSProperties {
  const scope: Record<string, string> = { colorScheme: theme };
  const kebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const walk = (name: string, node: unknown): void => {
    if (typeof node === 'string') {
      scope[name] = node;
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) walk(`${name}-${kebab(key)}`, child);
  };
  walk('--color', themes[theme].color);
  walk('--shadow', themes[theme].shadow);
  return scope as CSSProperties;
}
