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
 * And it gets a SELECTOR LIST wrong, twice over, so every sheet goes in with
 * one selector to a rule (`oneSelectorPerRule`). It scores a list by its most
 * specific member rather than by the member that matched, so
 * `.a, .b .c .d { … }` outranks `.x .a` on the element only `.a` matches; and
 * a list with a pseudo-element anywhere in it matches NOTHING, so
 * `.a, .b::before { … }` never reaches `.a`. A browser does neither. Both
 * answer "this rule wins" or "this rule loses" where a browser says the
 * opposite, and the first is exactly how a reduced-motion stop written as a
 * list reads as winning here while the motion it stops keeps running.
 *
 * Nor does it compute a style for a PSEUDO-ELEMENT: `getComputedStyle` with a
 * second argument is not implemented and answers for the element itself. So a
 * rule for `::before` or `::after` goes in as a rule for a child element that
 * stands in for it (`standInPseudoElement`), and a suite that measures one puts
 * that child where the pseudo-element would be (`pseudoElement`).
 *
 * It is NOT a browser. It answers what the cascade decides, never what the
 * page looks like: a flex gap, a wrap and a scrollbar are all outside it.
 */
import { readFileSync } from "node:fs";
import * as tokens from "@crewlethq/tokens";
import { parseHex } from "@crewlethq/tokens/test/palette";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const uiSource = join(here, "../../../packages/ui/src");
const tokenSource = join(here, "../../../packages/tokens/tokens");
const tokenDist = join(here, "../../../packages/tokens/dist/css");

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
  style.textContent = oneSelectorPerRule(css, standInPseudoElement);
  document.head.append(style);
  return () => style.remove();
}

/**
 * Every rule whose selector is a LIST, written out as one rule per selector,
 * in the list's own place and order: the correction for the two things jsdom
 * gets wrong about a list (see the file's header). A browser scores and
 * matches each member of a list on its own, so the rules this writes are the
 * rules a browser already sees, and every other cascade question (source
 * order, the at-rule a rule sits in, a keyframe's stops) is left exactly as
 * it was. Each selector is passed through `rewrite` on its way in, which is
 * where `installCss` stands in for the pseudo-elements.
 */
export function oneSelectorPerRule(
  css: string,
  rewrite: (selector: string) => string = (selector) => selector,
): string {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const split = (body: string, keyframes: boolean): string => {
    let out = "";
    let from = 0;
    for (let open = body.indexOf("{"); open >= 0; open = body.indexOf("{", from)) {
      const before = body.slice(from, open);
      const head = before.slice(Math.max(before.lastIndexOf(";"), before.lastIndexOf("}")) + 1);
      out += before.slice(0, before.length - head.length);
      let depth = 1;
      let close = open + 1;
      for (; depth > 0; close += 1) {
        if (close >= body.length) throw new Error(`"${head.trim()}" is never closed`);
        if (body[close] === "{") depth += 1;
        else if (body[close] === "}") depth -= 1;
      }
      const inner = body.slice(open + 1, close - 1);
      const selector = head.trim();
      if (selector.startsWith("@")) {
        out += `${head}{${split(inner, keyframes || /^@keyframes\b/.test(selector))}}`;
      } else if (keyframes) {
        out += `${head}{${inner}}`;
      } else {
        out += selectorList(selector)
          .map((one) => `\n${rewrite(one.trim())} {${split(inner, false)}}`)
          .join("");
      }
      from = close;
    }
    return out + body.slice(from);
  };
  return split(text, false);
}

/** The element name a pseudo-element's stand-in takes, with `-before` or `-after`. */
const STAND_IN = "crewlet-pseudo";

/**
 * One selector as jsdom has to be given it for a pseudo-element to be
 * measured: `X::after` becomes `X > crewlet-pseudo-after`, a rule for the
 * child `pseudoElement` puts in X, and every selector that names no
 * pseudo-element is kept off that child.
 *
 * EXACT, not approximate, on both halves. The stand-in is named by a TYPE
 * selector, which scores what `::after` scores, so the rules for one
 * pseudo-element tie and win among themselves as a browser has them do; the
 * stand-in inherits from X, as the pseudo-element does. And a browser never
 * matches a pseudo-element with a selector that does not name it, so `.x *`
 * does not reach `.x::after`: every such selector gets the SAME `:not()`,
 * which keeps it off the stand-in and adds one weight to all of them, so their
 * order among themselves is unchanged. Without it a catch-all stop would
 * reach the stand-in and read as winning while the pseudo-element kept
 * moving, which is the very defect this harness exists to catch.
 *
 * A selector naming any other pseudo-element (`::placeholder`, `::marker`) is
 * left as it is, and matches nothing here, as before.
 */
export function standInPseudoElement(selector: string): string {
  const pseudo = /^(.*)::(before|after)$/s.exec(selector);
  if (pseudo) {
    // `::after` alone, or after a combinator, is the pseudo-element of ANY
    // element there, which a compound has to say out loud.
    const host = pseudo[1]!;
    const originating = host === "" || /[\s>+~]$/.test(host) ? `${host}*` : host;
    return `${originating} > ${STAND_IN}-${pseudo[2]}`;
  }
  if (selector.includes("::")) return selector;
  return `${selector}:not(${STAND_IN}-before, ${STAND_IN}-after)`;
}

/**
 * Puts the stand-in for `host::before` or `host::after` where the
 * pseudo-element would be, first or last among the host's children, and
 * returns it for `getComputedStyle`. It takes the rules `installCss` wrote for
 * the pseudo-element and no others.
 */
export function pseudoElement(host: Element, which: "before" | "after"): Element {
  const standIn = document.createElement(`${STAND_IN}-${which}`);
  if (which === "before") host.prepend(standIn);
  else host.append(standIn);
  return standIn;
}

/** A selector list split at its own commas, not the ones inside `:not(…)` or `[…]`. */
function selectorList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let at = 0; at < list.length; at += 1) {
    const char = list[at];
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(list.slice(from, at));
      from = at + 1;
    }
  }
  parts.push(list.slice(from));
  return parts;
}

/**
 * A computed colour as its three channels, whichever notation jsdom answers
 * in: the `#rrggbb` a declaration was written with, or the `rgb(r, g, b)` it
 * serialises most colours to. Compare it with `parseHex` of the token's value.
 */
export function channels(value: string): { r: number; g: number; b: number } {
  const hex = parseHex(value.trim());
  if (hex) return hex;
  const parts = /rgba?\(([^)]+)\)/
    .exec(value)?.[1]
    ?.split(",")
    .map((one) => Number.parseFloat(one));
  if (!parts || parts.length < 3) throw new Error(`not a colour: ${value}`);
  return { r: parts[0]!, g: parts[1]!, b: parts[2]! };
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
  return installCss(
    paths
      .map((path) => readFileSync(join(uiSource, path), "utf8"))
      .map((css) =>
        css.replace(
          /var\((--[\w-]+)\)/g,
          (whole, name: string) => table.get(name) ?? whole,
        ),
      )
      .join("\n"),
  );
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

/**
 * THE BUILT THEME LAYER, AS A BROWSER ON THE NAMED SYSTEM APPLIES IT.
 *
 * jsdom cascades custom properties and matches `:not()` and attribute
 * selectors, which is everything the theme contract's precedence is made of,
 * but it evaluates NO media query: a rule inside `@media` is never applied,
 * whatever the query says. So the one input the contract turns on, the
 * palette the reader's system asks for, cannot be put to it directly.
 *
 * This installs the built `tokens.css` and `themes.css`, in import order, with
 * each `prefers-color-scheme` query ANSWERED for the system named: a block
 * whose query matches is unwrapped where it stands, keeping its selector and
 * its place in the file, and one that does not match is dropped. Nothing else
 * is decided here. Which block wins is left to jsdom's own cascade, over the
 * selectors, specificity and source order the build emitted, which is exactly
 * what decides whether an explicit choice beats the system.
 *
 * Any other at-rule in either file is REFUSED rather than guessed at: a query
 * this cannot answer honestly is one whose block would silently never apply.
 * Returns the remover, as above.
 */
export function installThemes(system: "light" | "dark"): () => void {
  const css = ["tokens.css", "themes.css"]
    .map((name) =>
      answerColorScheme(readFileSync(join(tokenDist, name), "utf8"), system),
    )
    .join("\n");
  return installCss(css);
}

function answerColorScheme(css: string, system: "light" | "dark"): string {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let from = 0;
  for (
    let at = text.indexOf("@", from);
    at >= 0;
    at = text.indexOf("@", from)
  ) {
    const open = text.indexOf("{", at);
    if (open < 0)
      throw new Error(`an at-rule with no block: ${text.slice(at, at + 60)}`);
    const prelude = text.slice(at, open).trim();
    const query =
      /^@media\s*\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/.exec(
        prelude,
      );
    if (!query) throw new Error(`installThemes cannot answer "${prelude}"`);
    // The block's end is its MATCHING brace, since the query wraps a rule.
    let depth = 1;
    let close = open + 1;
    for (; depth > 0; close += 1) {
      if (close >= text.length) throw new Error(`"${prelude}" is never closed`);
      if (text[close] === "{") depth += 1;
      else if (text[close] === "}") depth -= 1;
    }
    out += text.slice(from, at);
    if (query[1] === system) out += text.slice(open + 1, close - 1);
    from = close;
  }
  return out + text.slice(from);
}

/**
 * A COMPONENT'S SHEETS AS A BROWSER APPLIES THEM FOR THE NAMED MOTION
 * PREFERENCE, lengths resolved as `installSheets` resolves them.
 *
 * jsdom evaluates no media query, so a `prefers-reduced-motion` block is never
 * applied, and the only way its rule was ever checked was to read the block's
 * source. That is the guard that passes while the defect ships: a stop that
 * names a selector one class short of the rule that starts the motion reads
 * perfectly and loses on specificity, and a stop written ABOVE the rule it
 * cancels loses on source order. Both reached this package.
 *
 * So each reduced-motion query is ANSWERED here, as `installThemes` answers
 * the colour scheme: a block whose query matches is unwrapped where it stands,
 * keeping its selectors and its place in the file, and one that does not is
 * dropped. Which rule then wins is left to jsdom's own cascade, over the
 * specificity and the source order the stylesheet was written with, and a
 * suite reads the result back with `getComputedStyle(element).animation` or
 * `.transition`, which jsdom answers with the declared value of the rule that
 * won. Returns the remover, as above.
 */
export function installMotion(
  preference: "reduce" | "no-preference",
  ...paths: string[]
): () => void {
  const source = paths
    .map((path) => readFileSync(join(uiSource, path), "utf8"))
    .join("\n");
  return installCss(
    answerMotion(resolveOwn(resolveLengths(source)), preference),
  );
}

/**
 * The stylesheet with every `prefers-reduced-motion` query answered for the
 * preference named, and every other at-rule left exactly where it was.
 *
 * A query that COMBINES the preference with anything else is refused rather
 * than guessed at: answering half of it would apply a block the other half
 * says a browser would not.
 */
export function answerMotion(
  css: string,
  preference: "reduce" | "no-preference",
): string {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let from = 0;
  for (
    let at = text.indexOf("@media", from);
    at >= 0;
    at = text.indexOf("@media", from)
  ) {
    const open = text.indexOf("{", at);
    if (open < 0)
      throw new Error(`an at-rule with no block: ${text.slice(at, at + 60)}`);
    const prelude = text.slice(at, open).trim();
    // The block's end is its MATCHING brace, since the query wraps rules.
    let depth = 1;
    let close = open + 1;
    for (; depth > 0; close += 1) {
      if (close >= text.length) throw new Error(`"${prelude}" is never closed`);
      if (text[close] === "{") depth += 1;
      else if (text[close] === "}") depth -= 1;
    }
    if (!prelude.includes("prefers-reduced-motion")) {
      out += text.slice(from, close);
      from = close;
      continue;
    }
    const query =
      /^@media\s*\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/.exec(
        prelude,
      );
    if (!query) throw new Error(`answerMotion cannot answer "${prelude}"`);
    out += text.slice(from, at);
    if (query[1] === preference) out += text.slice(open + 1, close - 1);
    from = close;
  }
  return out + text.slice(from);
}

/**
 * Every colour a theme's own blocks declare, by custom-property name, from the
 * typed export: what the root has to paint when that theme is the one that
 * won. The build's own suite holds the export to the stylesheet, value for
 * value, so this is the palette as shipped rather than a list kept here.
 */
export function themeColours(
  theme: "light" | "dark",
): ReadonlyMap<string, string> {
  return new Map(
    [...themeTokens(theme)].filter(([name]) => name.startsWith("--color-")),
  );
}
