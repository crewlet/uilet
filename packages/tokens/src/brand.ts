/**
 * The brand mapping's contract, read from its one source
 * (`stylesheets/brand.css`) by everything that builds on it:
 *
 * - the token build emits that file as `css/brand.css`, and writes
 *   `css/brand-scope.css` from it here (`brandScopeCss`);
 * - @crewlethq/artifact-kit's build bundles `css/brand.css` into kit.css and
 *   moves the theme's value of every public token it declares aside to
 *   `--crewlet-theme-<name>` (`brandSlots`, `brandThemeName`);
 * - the suites hold the two stylesheets to declaring the same mapping.
 *
 * Like color.ts it uses only syntax Node strips without compiling, because the
 * token build imports it from source before tsc has run.
 */

/** The prefix the theme's own value of a brand-driven token takes. */
export const BRAND_THEME_PREFIX = '--crewlet-theme-';

/** The name a token's theme value takes: `--color-brand-accent` becomes `--crewlet-theme-color-brand-accent`. */
export function brandThemeName(slot: string): string {
  return `${BRAND_THEME_PREFIX}${slot.slice(2)}`;
}

/** The scope's outer element: it carries the inputs and captures the page's values. */
export const BRAND_SCOPE_CLASS = 'crewlet-brand-scope';

/** The scope's inner element: the mapping applies to it and everything inside it. */
export const BRAND_SCOPE_LAYER_CLASS = 'crewlet-brand-scope__layer';

/** The three selectors the source declares the mapping under, and nothing else. */
const DARK = ':root';
const LIGHT_QUERY = '@media (prefers-color-scheme: light)';
const LIGHT_MEDIA = ':root:not([data-theme="dark"])';
const LIGHT_ATTRIBUTE = ':root[data-theme="light"]';

/** The mapping as the source declares it: the bare root's (dark) block and the light block. */
export interface BrandLayer {
  /** Every declaration of the bare root, in order: the dark steps, the shared steps and the public tokens. */
  dark: ReadonlyMap<string, string>;
  /** The light steps, declared alike under the system's setting and under an explicit choice. */
  light: ReadonlyMap<string, string>;
}

/** Every value the default theme declares in one mode, for a scope that pins its mode. */
export interface BrandModeValues {
  light: ReadonlyMap<string, string>;
  dark: ReadonlyMap<string, string>;
}

const withoutComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** A block's custom properties, in order, each value with its white space collapsed. */
function declarationsOf(body: string, where: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const part of body.split(';')) {
    if (part.trim() === '') continue;
    const colon = part.indexOf(':');
    const name = colon < 0 ? '' : part.slice(0, colon).trim();
    if (!name.startsWith('--')) throw new Error(`${where} declares "${part.trim()}", and the brand mapping declares custom properties only`);
    if (found.has(name)) throw new Error(`${where} declares ${name} twice`);
    found.set(name, part.slice(colon + 1).replace(/\s+/g, ' ').trim());
  }
  return found;
}

/**
 * The mapping, read from the source, which is held to its shape: the bare
 * root's block, the light block under the system's setting and the same block
 * under an explicit choice, and nothing else. A rule added anywhere else would
 * reach one of the two built stylesheets and not the other, so it stops here.
 */
export function parseBrandLayer(css: string): BrandLayer {
  const text = withoutComments(css);
  const blocks: { context: string | null; selector: string; body: string }[] = [];
  // Each open block's head, and whether a block has opened inside it: only
  // the innermost blocks declare, and a wrapper (the media query) is context.
  const stack: { head: string; wraps: boolean }[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') {
      const parent = stack.at(-1);
      if (parent) parent.wraps = true;
      stack.push({ head: text.slice(start, i).trim().replace(/\s+/g, ' '), wraps: false });
      start = i + 1;
    } else if (ch === '}') {
      const open = stack.pop();
      if (open === undefined) throw new Error('the brand mapping has an unbalanced "}"');
      if (!open.wraps) blocks.push({ context: stack.at(-1)?.head ?? null, selector: open.head, body: text.slice(start, i) });
      start = i + 1;
    }
  }
  if (stack.length > 0) throw new Error('the brand mapping has an unbalanced "{"');

  const shape = blocks.map((block) => `${block.context ?? ''} ${block.selector}`.trim());
  const expected = [DARK, `${LIGHT_QUERY} ${LIGHT_MEDIA}`, LIGHT_ATTRIBUTE];
  if (shape.join('\n') !== expected.join('\n')) {
    throw new Error(`the brand mapping declares under ${JSON.stringify(shape)}; it may declare under ${JSON.stringify(expected)} only, in that order`);
  }
  const [dark, lightMedia, lightAttribute] = blocks.map((block) => declarationsOf(block.body, block.selector)) as [
    Map<string, string>,
    Map<string, string>,
    Map<string, string>,
  ];
  if (JSON.stringify([...lightMedia]) !== JSON.stringify([...lightAttribute])) {
    throw new Error('the brand mapping\'s two light blocks differ; a reader\'s system setting and an explicit choice paint one light mode');
  }
  for (const name of lightMedia.keys()) {
    if (!dark.has(name)) throw new Error(`the light block declares ${name}, which the bare root does not; every mode names the same steps`);
  }
  for (const [name, value] of dark) {
    if (name.startsWith('--brand-')) throw new Error(`the brand mapping declares the input ${name}; an input is set by the engine or a page, never here`);
    if (/url\(/i.test(value)) throw new Error(`the brand mapping names a file in ${name}; every file is an input`);
  }
  return { dark, light: lightMedia };
}

/**
 * Every public token the mapping declares, sorted: each custom property it
 * sets that is neither one of its private steps (`--crewlet-`) nor an input
 * (`--brand-`).
 */
export function brandSlots(css: string): string[] {
  return [...parseBrandLayer(css).dark.keys()].filter((name) => !name.startsWith('--crewlet-') && !name.startsWith('--brand-')).sort();
}

const block = (selector: string, declarations: Iterable<readonly [string, string]>, indent = ''): string =>
  `${indent}${selector} {\n${[...declarations].map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n')}\n${indent}}`;

/**
 * The scope's stylesheet, from the same source as the root layer.
 *
 * TWO ELEMENTS, because a custom property cannot fall back to its own earlier
 * value. The outer element (`.crewlet-brand-scope`) captures the page's value
 * of every public token into `--crewlet-theme-<name>`; the inner one
 * (`.crewlet-brand-scope__layer`) declares the public tokens from the inputs,
 * falling back to the captured values, exactly as the root layer falls back to
 * the values the kit's build moved aside. The mapping's blocks are the
 * source's, their selectors moved onto the inner element, so the scope follows
 * the page's light or dark as the root layer does.
 *
 * A PINNED MODE (`data-mode` on the outer element) is that mode whatever the
 * page is in: a preview that shows a brand in light beside the same brand in
 * dark. The default theme's value of every public token the mapping drives is
 * captured for the mode in place of the page's, every other token of the mode
 * (the secondary text, the hairlines, the raised grounds) is declared on the
 * layer itself, and the mapping takes the mode's own steps. Its blocks come
 * last, so they win the ties.
 */
export function brandScopeCss(css: string, modes: BrandModeValues): string {
  const layer = parseBrandLayer(css);
  const slots = brandSlots(css);
  const scope = `.${BRAND_SCOPE_CLASS}`;
  const inner = `.${BRAND_SCOPE_LAYER_CLASS}`;
  const pinned = (mode: 'light' | 'dark') => `${scope}[data-mode="${mode}"]`;
  const capture = (values: ReadonlyMap<string, string> | null) =>
    slots.flatMap((slot): [string, string][] => {
      if (values === null) return [[brandThemeName(slot), `var(${slot})`]];
      const value = values.get(slot);
      return value === undefined ? [] : [[brandThemeName(slot), value]];
    });
  // The dark steps a pinned dark scope restates over a light page: every step
  // the light block also names, at the bare root's value.
  const darkSteps = [...layer.dark].filter(([name]) => layer.light.has(name));
  // The rest of a pinned mode's palette: every token the theme declares for it
  // that the mapping does not drive (those are captured above, so the mapping
  // still falls back to them).
  const driven = new Set(slots);
  const palette = (values: ReadonlyMap<string, string>) => [...values].filter(([name]) => !driven.has(name));
  return [
    '/* Generated by @crewlethq/tokens from stylesheets/brand.css (src/brand.ts). Do not edit. */',
    '',
    '/* The page\'s own values, one element above the mapping. */',
    block(scope, capture(null)),
    '',
    block(inner, layer.dark),
    '',
    `${LIGHT_QUERY} {\n${block(`${LIGHT_MEDIA} ${inner}`, layer.light, '  ')}\n}`,
    '',
    block(`${LIGHT_ATTRIBUTE} ${inner},\n${pinned('light')} > ${inner}`, layer.light),
    '',
    '/* A pinned mode: the default theme\'s values for it, its own steps and the rest of its palette. */',
    block(pinned('light'), capture(modes.light)),
    '',
    block(pinned('dark'), capture(modes.dark)),
    '',
    block(`${pinned('dark')} > ${inner}`, darkSteps),
    '',
    block(`${pinned('light')} > ${inner}`, palette(modes.light)),
    '',
    block(`${pinned('dark')} > ${inner}`, palette(modes.dark)),
    '',
  ].join('\n');
}
