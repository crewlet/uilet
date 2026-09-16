/**
 * The CASCADE, in jsdom: which rule actually wins on the element a component
 * renders.
 *
 * WHY THIS EXISTS. jsdom applies no stylesheet on its own, so every suite here
 * runs against unstyled DOM and the only way a rule was ever checked was to
 * read the source of the stylesheet and match a string in it. A guard like
 * that passes while the defect ships: it cannot see a later rule that wins on
 * source order, a selector that matches nothing the component renders, or a
 * base declaration that ties with a modifier and beats it. Two defects reached
 * an owner that way in one week, and the second was a padding written down in
 * a rule nothing ever selected.
 *
 * jsdom DOES cascade the sheets a document holds, `:empty` and specificity
 * included. What it does not do is resolve a custom property or lay anything
 * out, so `installSheets` substitutes every `var(--token)` it can from the
 * tokens package before the sheet goes in, and `inset` adds up the box model
 * by hand rather than asking for a rectangle nothing measured.
 *
 * It is NOT a browser. It answers what the cascade decides, never what the
 * page looks like: a flex gap, a wrap and a scrollbar are all outside it.
 */
import { readFileSync } from "node:fs";
import * as tokens from "@crewlethq/tokens";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const uiSource = join(here, "../../../packages/ui/src");
const tokenSource = join(here, "../../../packages/tokens/tokens");

/**
 * Every token whose value is a LENGTH, by the custom property name the tokens
 * build emits: the path through the file, joined with hyphens. The families
 * with a colour or a shadow in them are left out on purpose, so a substitution
 * here can never stand in for a value the palette suite measures.
 *
 * `typography` is in the list because a font size is a length like any other,
 * and a rule that sets one is dropped by jsdom while its var() stands: a title
 * drawn a step too small, which is a real defect, measured as zero rather than
 * as the wrong number.
 *
 * EVERY KEY IS KEBAB-CASED ON THE WAY IN, exactly as the tokens build does it.
 * The walk used to join the raw JSON keys, so `size.targetMin` was recorded as
 * `--size-targetMin` while the stylesheet asks for `--size-target-min`: the
 * var() stood, jsdom dropped the declaration holding it, and every measurement
 * through that rule read ZERO. `--size-target-min` is the pointer-target floor
 * this package guards in a dozen places, so a case asserting a small number
 * passed while nothing at all was applied. Fourteen tokens were in that state
 * (`size.targetMin`, `size.contentMax`, `size.measureNarrow`,
 * `size.focusRingInsetOffset`, `size.nav.rowPad`, and the `lineHeight` and
 * `letterSpacing` families).
 */
/**
 * A token's JSON key as the build writes it into a custom property name: the
 * camel case split back into hyphens. ONE READING, because the two walks below
 * used to disagree about it and that disagreement is what made every rule
 * naming `--size-target-min` measure as zero.
 */
const kebab = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const LENGTHS: ReadonlyMap<string, string> = (() => {
  const found = new Map<string, string>();
  const walk = (name: string, node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const value = record["value"];
    if (typeof value === "string") {
      found.set(name, value);
      return;
    }
    for (const [key, child] of Object.entries(record))
      walk(`${name}-${kebab(key)}`, child);
  };
  for (const family of [
    "spacing",
    "size",
    "radius",
    "breakpoint",
    "typography",
  ]) {
    const json = JSON.parse(
      readFileSync(join(tokenSource, `${family}.json`), "utf8"),
    ) as Record<string, unknown>;
    for (const [name, node] of Object.entries(json))
      walk(`--${kebab(name)}`, node);
  }
  /*
   * A TOKEN MAY BE WRITTEN IN TERMS OF ANOTHER, as `--radius-chip` is
   * (`calc({radius.md} - 1px)`). Style Dictionary resolves those on the way to
   * the stylesheet, and substituted raw they are not CSS at all: css-tree
   * refuses the DECLARATION, jsdom then refuses the whole SHEET, and every
   * measurement taken through it silently becomes zero.
   */
  const dotted = (reference: string) =>
    `--${reference.split(".").map(kebab).join("-")}`;
  for (const [name, value] of found) {
    if (!value.includes("{")) continue;
    found.set(
      name,
      value.replace(
        /\{([\w.]+)\}/g,
        (whole, reference: string) => found.get(dotted(reference)) ?? whole,
      ),
    );
  }
  return found;
})();

/**
 * A stylesheet with its length tokens resolved. A `var()` naming anything else
 * is left standing, which makes the declaration holding it invalid and drops
 * it: a colour or a shadow is measured where its value lives, never here.
 */
function resolveLengths(css: string): string {
  return css.replace(
    /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,
    (whole: string, name: string, fallback?: string) =>
      LENGTHS.get(name) ??
      (fallback && fallback.trim() ? fallback.trim() : whole),
  );
}

/**
 * Puts one or more of the package's stylesheets into the document, by path
 * under `packages/ui/src`. Returns the remover; call it from `afterEach`, or
 * the next test in the file inherits the sheet.
 */
export function installSheets(...paths: string[]): () => void {
  const source = paths
    .map((path) => readFileSync(join(uiSource, path), "utf8"))
    .join("\n");
  return installCss(resolveOwn(resolveLengths(source)));
}

/**
 * The same, for a COMPONENT'S OWN custom properties, which are not tokens and
 * are not in the table above: a rule written as
 * `min-width: var(--crewlet-org-table-strip)` is dropped by jsdom while that
 * var() stands, and every measurement through it reads ZERO, the same way a
 * mistyped token name did, and just as invisibly.
 *
 * ONLY A PROPERTY THE SHEET DECLARES EXACTLY ONCE is substituted. jsdom
 * resolves no custom property and this helper cascades nothing, so a name a
 * modifier redeclares (`--crewlet-tag-height`, which has a value per step) has
 * no single answer and is LEFT STANDING, exactly as before: a measurement
 * through it still reads zero, which is honest, where picking one of three
 * values would be a number nobody drew.
 */
function resolveOwn(css: string): string {
  const seen = new Map<string, string | null>();
  for (const [, name, value] of css.matchAll(
    /(--crewlet-[\w-]+):\s*([^;{}]+);/g,
  )) {
    seen.set(name!, seen.has(name!) ? null : value!.trim());
  }
  let out = css;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = out.replace(
      /var\((--crewlet-[\w-]+)(?:,\s*([^()]*))?\)/g,
      (whole: string, name: string, fallback?: string) => {
        const value = seen.get(name);
        if (value !== undefined && value !== null) return value;
        return fallback && fallback.trim() ? fallback.trim() : whole;
      },
    );
    if (next === out) return out;
    out = next;
  }
  return out;
}

/**
 * The same, for CSS a suite has ALREADY prepared: a sheet with a colour or a
 * shadow token substituted by hand, which `resolveLengths` deliberately will
 * not do. Returns the remover, as above.
 *
 * It lives here rather than in a suite because `source-scan.test.ts` refuses
 * a style element anywhere under `packages/ui/src`, and rightly: a style
 * element a COMPONENT injects applies to the whole document and a strict
 * Content-Security-Policy refuses it outright. The rule cannot tell a
 * component from the suite beside it, so the one legitimate style element in
 * the arrangement is written once, here, outside the scanned tree.
 */
export function installCss(css: string): () => void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  return () => style.remove();
}

/** A computed length in px, with `auto`, `normal` and an empty value read as 0. */
export function px(element: Element, property: string): number {
  const value = getComputedStyle(element).getPropertyValue(property);
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Where an element's content starts, in px, measured from the inside edge of
 * an ancestor's own box: every padding on one side of the chain between them,
 * the two ends included.
 *
 * It is the quantity a browser reports as the distance from a card's own edge
 * to the first glyph inside it, which is the measurement that found the defect
 * this helper was written for, less the border. BORDERS ARE LEFT OUT because
 * jsdom does not answer for one: `border-left-width` computes to the same
 * `16px` on every element in a document, the initial `medium` included, so
 * adding it would put a number nobody drew into every reading.
 */
export function inset(
  from: Element,
  to: Element,
  side: "left" | "top" = "left",
): number {
  let total = 0;
  for (
    let node: Element | null = from;
    node !== null;
    node = node.parentElement
  ) {
    total += px(node, `padding-${side}`);
    if (node === to) return total;
  }
  throw new Error("inset: the second element is not an ancestor of the first");
}

/**
 * THE SAME SHEETS WITH THEIR COLOURS RESOLVED TOO, for one theme.
 *
 * `installSheets` resolves the LENGTH families and leaves a colour standing,
 * which makes the declaration holding it invalid and drops it: a suite reading
 * back an ink sees nothing at all. Installed this way the CASCADE answers what
 * is painted, on the ground of the theme named, which is the only form in
 * which a contrast can honestly be measured off a stylesheet. Colours are
 * resolved from the theme and everything else from the tokens module, so the
 * values are the ones the build ships rather than numbers repeated in a test.
 *
 * It is not a browser: a composite of two translucent layers is still the
 * caller's own arithmetic (`@crewlethq/tokens/test/palette` has it).
 */
export function installThemed(
  theme: "light" | "dark",
  ...paths: string[]
): () => void {
  const table = themeTokens(theme);
  const style = document.createElement("style");
  style.textContent = paths
    .map((path) => readFileSync(join(uiSource, path), "utf8"))
    .map((css) =>
      css.replace(
        /var\((--[\w-]+)\)/g,
        (whole, name: string) => table.get(name) ?? whole,
      ),
    )
    .join("\n");
  document.head.append(style);
  return () => style.remove();
}

/**
 * Every token the package publishes, by the custom-property name the tokens
 * build emits for it, through `kebab`. The colour family comes from the THEME,
 * because what a colour token is worth is what the theme says it is worth.
 */
function themeTokens(theme: "light" | "dark"): ReadonlyMap<string, string> {
  const found = new Map<string, string>();
  const walk = (name: string, node: unknown): void => {
    if (typeof node === "string" || typeof node === "number") {
      found.set(name, String(node));
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node))
      walk(`${name}-${kebab(key)}`, child);
  };
  for (const [group, values] of Object.entries(
    tokens as Record<string, unknown>,
  )) {
    if (group === "themes" || group === "color") continue;
    walk(`--${kebab(group)}`, values);
  }
  walk("--color", tokens.themes[theme].color);
  return found;
}
