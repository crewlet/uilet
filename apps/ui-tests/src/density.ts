/**
 * The cascade AT A DENSITY, for a guard about how big a thing is drawn.
 *
 * WHY IT IS NOT `cascade.ts`. That helper substitutes each length token's
 * value out of the tokens package's JSON SOURCE, which costs it two things a
 * size guard needs:
 *
 *  - A density. The scale reaches a pad and a control step through
 *    `calc(Npx * var(--density, 1))`, and the JSON carries the unscaled number
 *    and a separate `density: true` flag, so a sheet installed that way is the
 *    sheet at density 1 and cannot answer for the compact or the comfortable
 *    setting. Half of the defect this was written for was at compact density.
 *  - A derived token. `radius.chip`'s JSON value is
 *    `calc({radius.md} - 1px)`, a style-dictionary REFERENCE that the build
 *    resolves and a substitution from the JSON does not, so the sheet arrives
 *    holding `calc({radius.md} - 1px)` and jsdom's parser throws on the whole
 *    stylesheet. `Tabs.css` cannot be installed through `cascade.ts` at all.
 *
 * So the substitution here is made from the package's OWN BUILT STYLESHEET,
 * which is the artifact a consumer installs: every token arrives already
 * resolved against every other, and `var(--density, 1)` is the one thing left
 * to fill in. The two helpers want folding into one; they are apart because
 * the suites that use `cascade.ts` are being written at the same time as this.
 *
 * jsdom resolves `calc()`, `max()` and `rem` over concrete lengths, so a
 * substituted token arrives as the number a browser would compute. What it
 * will not do is resolve a custom property or lay anything out: read a box as
 * its box model (a minimum, a pad, a type step), never as a rectangle.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const uiSource = join(here, '../../../packages/ui/src');
const tokensCss = join(here, '../../../packages/tokens/dist/css/tokens.css');

/** The three settings `@crewlethq/tokens/css/density` defines, and their factors. */
export const DENSITIES = [
  ['compact', 0.82],
  ['normal', 1],
  ['comfortable', 1.14],
] as const;

/** Every custom property the tokens package emits, by name. */
const TOKENS: ReadonlyMap<string, string> = (() => {
  let source: string;
  try {
    source = readFileSync(tokensCss, 'utf8');
  } catch {
    throw new Error(`build @crewlethq/tokens first: ${tokensCss} is not there`);
  }
  const found = new Map<string, string>();
  for (const [, name, value] of source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    found.set(name!, value!.trim());
  }
  if (found.size === 0) throw new Error(`no custom properties in ${tokensCss}`);
  return found;
})();

/**
 * A stylesheet with every token resolved at one density. The loop is what
 * resolves a token whose value names another one; a `var()` naming nothing the
 * package emits is left standing, which makes its declaration invalid and
 * drops it, exactly as an unknown property would be dropped in a browser.
 */
export function atDensity(css: string, density: number): string {
  const scaled = (value: string) => value.replace(/var\(--density,\s*1\)/g, String(density));
  let out = scaled(css);
  for (let pass = 0; pass < 8; pass += 1) {
    const next = out.replace(
      /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,
      (whole: string, name: string, fallback?: string) => {
        const value = TOKENS.get(name);
        if (value !== undefined) return scaled(value);
        return fallback && fallback.trim() ? fallback.trim() : whole;
      },
    );
    if (next === out) return out;
    out = next;
  }
  return out;
}

/**
 * Puts one or more of the package's stylesheets into the document at one
 * density, by path under `packages/ui/src`. Returns the remover; call it from
 * a `finally` or an `afterEach`, or the next test inherits the sheet.
 */
export function installSheetsAtDensity(density: number, ...paths: string[]): () => void {
  const style = document.createElement('style');
  style.textContent = paths
    .map((path) => atDensity(readFileSync(join(uiSource, path), 'utf8'), density))
    .join('\n');
  document.head.append(style);
  return () => style.remove();
}
