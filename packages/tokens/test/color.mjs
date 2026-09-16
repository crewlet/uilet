/**
 * Colour maths for the palette suite: sRGB, WCAG, OKLab and dichromat
 * simulation, with no dependencies.
 *
 * This exists because the token files make promises that cannot be checked by
 * reading them: that every text step clears contrast on the WORST surface it
 * can land on (not the panel it was designed against), that a fill step is
 * never used where a text step belongs, and that the categorical hues stay
 * separable, including for red-green colour vision. Measured once by hand and
 * written into a comment, those numbers rot silently. Here they are computed
 * from the stylesheets that actually ship.
 *
 * It is published as part of `@crewlethq/tokens/test/palette`, so a consumer
 * runs the same maths over the version it installed.
 */

/** @typedef {{ r: number, g: number, b: number }} RGB */

// ---------------------------------------------------------------------------
// Stylesheet parsing
// ---------------------------------------------------------------------------

/**
 * Every custom-property block in a stylesheet, in source order, as
 * `{ atRule, selector, declarations }`.
 *
 * A real (if small) parser rather than a regex over `([^{}]+)\{([^{}]*)\}`:
 * the theme sheet nests its dark block inside `@media`, and a flat regex can
 * only reach that block by failing to match the at-rule and picking the inner
 * one up on a later pass. That works until an at-rule holds two blocks, or a
 * selector repeats inside and outside one, and then it mis-reports rather than
 * failing. `atRule` is the enclosing at-rule prelude, or null at the top level.
 */
export function parseBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === '{') {
      stack.push(clean.slice(start, i).trim());
      start = i + 1;
    } else if (ch === '}') {
      const prelude = stack.pop();
      if (prelude === undefined) throw new Error('unbalanced "}" in stylesheet');
      const body = clean.slice(start, i);
      // A block that holds another block is a wrapper (an at-rule); only the
      // innermost blocks carry declarations.
      if (!body.includes('{')) {
        const enclosing = stack.at(-1);
        for (const selector of prelude.split(',')) {
          blocks.push({
            atRule: enclosing === undefined ? null : enclosing,
            selector: selector.trim(),
            declarations: parseDeclarations(body),
          });
        }
      }
      start = i + 1;
    }
  }
  if (stack.length > 0) throw new Error('unbalanced "{" in stylesheet');
  return blocks;
}

/** The custom properties in one block body, as a Map in source order. */
export function parseDeclarations(body) {
  const declarations = new Map();
  for (const line of body.split(';')) {
    const index = line.indexOf(':');
    if (index < 0) continue;
    const name = line.slice(0, index).trim();
    if (!name.startsWith('--')) continue;
    declarations.set(name, line.slice(index + 1).trim());
  }
  return declarations;
}

/**
 * Merge every block that matches, in cascade order, into one token map.
 * `sources` are `{ name, css }` in IMPORT order, because these files share
 * the `:root` selector and the later import is what a browser paints.
 */
export function cascade(sources, matches) {
  const out = new Map();
  for (const source of sources) {
    for (const block of parseBlocks(source.css)) {
      if (!matches(block)) continue;
      for (const [name, value] of block.declarations) out.set(name, value);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Colour values
// ---------------------------------------------------------------------------

export function parseHex(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function parseRgba(value) {
  const match = /^rgba?\(([^)]+)\)$/i.exec(value.trim());
  if (!match) return null;
  const parts = match[1]
    .split(/[,/\s]+/)
    .filter(Boolean)
    .map(Number);
  const [r, g, b, a] = parts;
  if (r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b].some(Number.isNaN)) return null;
  return { rgb: { r, g, b }, a: a === undefined ? 1 : a };
}

/** Composite a possibly translucent value over an opaque backdrop. */
export function flatten(value, backdrop) {
  const hex = parseHex(value);
  if (hex) return hex;
  const rgba = parseRgba(value);
  if (!rgba) return null;
  const { rgb, a } = rgba;
  return {
    r: rgb.r * a + backdrop.r * (1 - a),
    g: rgb.g * a + backdrop.g * (1 - a),
    b: rgb.b * a + backdrop.b * (1 - a),
  };
}

/** The same colour at a new alpha, as the CSS value the build emits. */
export function withAlpha(value, alpha) {
  const rgb = parseHex(value) ?? parseRgba(value)?.rgb;
  if (!rgb) throw new Error(`cannot re-alpha "${value}"`);
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// WCAG
// ---------------------------------------------------------------------------

function channel(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// OKLab. Perceptual distance is what "these two hues are separable" means.
// RGB distance says magenta and red are far apart and says the same of two
// greens a reader cannot tell apart at 11px.
// ---------------------------------------------------------------------------

export function toOklab({ r, g, b }) {
  const lr = channel(r);
  const lg = channel(g);
  const lb = channel(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Perceptual distance, scaled to roughly CIE dE units so floors read familiar. */
export function deltaE(x, y) {
  const a = toOklab(x);
  const b = toOklab(y);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b) * 100;
}

export function chroma(c) {
  const { a, b } = toOklab(c);
  return Math.hypot(a, b) * 100;
}

function fromLinear(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, c * 255));
}

/** OKLab to sRGB, clipped. Used to search for the nearest passing value. */
export function fromOklab({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: Math.round(fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: Math.round(fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: Math.round(fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  };
}

export const hex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Move a colour along OKLab lightness only, keeping hue and chroma, until
 * `ok` holds. A failing token moves MINIMALLY and inside its own hue family;
 * that is what keeps a contrast fix from becoming a repaint.
 */
export function nudge(value, direction, ok, step = 0.002) {
  const lab = toOklab(parseHex(value));
  for (let i = 0; i <= 500; i += 1) {
    const candidate = fromOklab({ L: lab.L + direction * step * i, a: lab.a, b: lab.b });
    if (ok(candidate)) return { value: hex(candidate), dL: +(direction * step * i * 100).toFixed(1) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dichromat simulation (a Brettel/Vienot-style linear approximation)
// ---------------------------------------------------------------------------

/** Simulate protanopia or deuteranopia. Enough to answer "do these collide?". */
export function simulate(c, kind) {
  const r = channel(c.r);
  const g = channel(c.g);
  const b = channel(c.b);
  const L = 0.31399022 * r + 0.63951294 * g + 0.04649755 * b;
  const M = 0.15537241 * r + 0.75789446 * g + 0.08670142 * b;
  const S = 0.01775239 * r + 0.10944209 * g + 0.87256922 * b;
  let L2 = L;
  let M2 = M;
  const S2 = S;
  if (kind === 'protan') L2 = 1.05118294 * M - 0.05116099 * S;
  else M2 = 0.9513092 * L + 0.04866992 * S;
  return {
    r: fromLinear(5.47221206 * L2 - 4.6419601 * M2 + 0.16963708 * S2),
    g: fromLinear(-1.1252419 * L2 + 2.29317094 * M2 - 0.1678952 * S2),
    b: fromLinear(0.02980165 * L2 - 0.19318073 * M2 + 1.16364789 * S2),
  };
}

/** The three visions every separation rule is measured under. */
export const VISIONS = ['normal', 'protan', 'deutan'];

/** One pair's separation under each vision, in VISIONS order. */
export function separation(a, b) {
  return VISIONS.map((vision) =>
    vision === 'normal' ? deltaE(a, b) : deltaE(simulate(a, vision), simulate(b, vision)),
  );
}
