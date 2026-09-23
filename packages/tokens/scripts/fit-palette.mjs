/**
 * The palette fit: from the approved design, the least move that clears every
 * rule the palette suite holds, found the same way every time.
 *
 *   npm run build --workspace @crewlethq/tokens
 *   node packages/tokens/scripts/fit-palette.mjs            # both palettes
 *   node packages/tokens/scripts/fit-palette.mjs light      # one of them
 *
 * WHY IT EXISTS. Every colour the kit ships is one of two things: the value the
 * approved design declares (tokens/intent.json), or the least move from it that
 * one of the suite's floors forced, and a moved token's comment names the
 * design value, the dE of the move and the rule. Found by hand, one token at a
 * time with the others held still, a "least move" is only least against the
 * palette as it stood that afternoon, and nothing can say later whether it
 * still is. This finds every move at once, from the design, against the rule
 * table as it stands, and prints each one with what forced it.
 *
 * WHAT IT READS. The built sheets in dist/css, which are what the suite
 * measures and the only place the derived steps exist (a state's soft and line
 * steps, the accent's triple); tokens/intent.json for the design; and the two
 * theme files, only to tell a WRITTEN value, which can be fitted, from one the
 * build derives, which follows its fill. A token neither intent.json nor
 * ANCHORS names stays exactly as built, and every candidate is measured by
 * runPalette over the whole palette, never by a second copy of a rule.
 *
 * WHAT IT FITS. A ROLE is a written token and its ANCHOR, the value it would
 * take if no floor were in the way: the design's value for it, or, for a token
 * the design never drew or whose drawing the kit replaced, the value ANCHORS
 * derives. A hex role moves in OKLCh: along lightness alone for a neutral step
 * and for the accent's family, which is how every move before this tool was
 * made, and along lightness, chroma and HUE_FAMILY degrees of hue for a state
 * or a chart series, whose identity is a hue range rather than one hue. A
 * translucent role (an overlay, a written soft tint) moves its alpha and keeps
 * its channels.
 *
 * THE OBJECTIVE is the total dE the design moves, the principle every moved
 * token states: a hex role costs its distance from its anchor, and a
 * translucent one the sum of its distances over the four rungs it is drawn on
 * (OPAQUE_SURFACES), because an overlay is one alpha on four grounds while the
 * design's hover is one opaque colour. The kit's own tokens (ANCHORS) are
 * summed apart and weigh only between palettes that move the design equally,
 * so a focus ring never buys a design value back by moving itself. A palette
 * with a failing check is worse than any palette without one, whatever it
 * costs.
 *
 * THE DESIGN'S ORDER IS KEPT, because the suite does not state it: the step
 * between two rungs is held to a distance, not a direction (in light, raised
 * is BELOW the card), and a pressed row to a distance from a hovered one. Left
 * to the objective alone, the cheapest palette puts raised under the card and
 * the press under the hover. So no two steps of a LADDER swap lightness from
 * the design's, and a pressed overlay stays at least as strong as the hover.
 *
 * ONLY WHAT FAILS MOVES. A repair moves the value a failing check is about,
 * never the ground it was measured on nor a value that clears every floor of
 * its own, and the search only ever walks a value the fit has moved: a
 * cheaper total bought by pulling a passing value off the design, a frame
 * lightened to spare a chart series, is not a least move of the series.
 *
 * THE SEARCH is seeded: mulberry32 at SEED, and BUDGET evaluations of the
 * palette, in three shares. From the anchors it REPAIRS: a failing check is
 * taken in a seeded order, the roles it is about are RESEATED (the nearest
 * point to the role's anchor, on shells of growing radius, where fewer checks
 * fail and none fails worse), and when no one seat can do it, one role is
 * seated where its check holds and what that breaks is repaired in turn. Once
 * nothing fails it IMPROVES, walking a moved role back toward its anchor, or
 * nudging it and repairing and walking back the roles it shares a check with,
 * which is how a trade is found (the hover overlay against the tertiary step
 * it takes contrast from). The FINISH takes every moved role's profile, every
 * step near where it is as such a trade, and keeps the best; the last share
 * walks every role back once more. Same seed, same budget, same built sheets:
 * the same fit, to the byte.
 *
 * WHAT IT PRINTS, per palette: every role with its anchor, the value the fit
 * ships, the dE between them and, for a role the fit moved, the BINDING rule:
 * what fails when that role alone goes back to its anchor. Then the tokens
 * whose built value is not the fit, which is the edit the token files owe.
 *
 * It is a development tool. It is not published, and no test runs it or reads
 * what it prints: the gate is the palette suite, and this is how a value that
 * passes it was chosen.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  deltaE,
  flatten,
  fromOklab,
  hex,
  LABEL_ON_FILL,
  oklabToLinear,
  OPAQUE_SURFACES,
  paletteStates,
  parseHex,
  parseRgba,
  runPalette,
  TEXT_STEPS,
  toOklab,
  VEIL,
  VEIL_GROUND,
  withAlpha,
} from '../test/palette.mjs';

/** The seed of the one random stream every choice the search makes is drawn from. */
const SEED = 1;

/**
 * The evaluations each palette is fitted in, every one a runPalette over the
 * candidate sheets. The fit is the best found within them, so a different
 * budget is a different fit; this one is where both palettes come out clean
 * and a larger one changes nothing the dark palette ships. The light palette,
 * which starts with four times as many failing checks, needs about half of it
 * to have none, and at 9000 did not always get there. It is about a minute a
 * palette.
 */
const BUDGET = 12000;

/**
 * How far a state or series hue may turn from the design's, in degrees of
 * OKLCh hue, either way. A hue family is a range, and the widest turn the
 * plan's indicative fits make is the light chart yellow's to an ochre, 12
 * degrees; at 15 a red is still a red rather than an orange.
 */
const HUE_FAMILY = 15;

/**
 * The LADDERS whose order the fit keeps: the four rungs, lowest first, and the
 * text ramp, strongest first. The suite holds each step to a distance and
 * never to a direction (in light, raised is BELOW the card, by design), so
 * left to the objective alone the cheapest palette puts raised under the card.
 * No two steps of one ladder swap lightness from where the design has them;
 * values on different ladders (a muted glyph and a chart's residual mark, say)
 * owe each other nothing.
 */
const LADDERS = [OPAQUE_SURFACES, [...TEXT_STEPS.map(([token]) => token), '--color-text-muted']];

/**
 * How the budget is spent. The search is where a palette with failing checks
 * becomes one without, and it gets most; the finish trades what the search
 * left; the rest is the last walk back, every role toward its anchor once,
 * which has to have evaluations left to run at all or the fit ships a step
 * longer than it needs, the one thing it exists to stop.
 */
const SEARCH_SHARE = 0.6;
const FINISH_SHARE = 0.3;

/** The least move, in dE, the finish tries to win back: a hundredth of a step a reader can see. */
const FINISH_FLOOR = 0.03;

/**
 * How far either way the finish's profile of a role reaches, in the role's
 * smallest steps: eight thousandths of alpha, 0.016 of OKLab lightness. The
 * search leaves a trade within a few steps of where it pays best; a profile
 * wider than that spends the finish on steps that cannot win.
 */
const FINISH_REACH = 8;

/**
 * The shells a reseat looks on: radii from SHELL_FIRST to SHELL_LAST dE,
 * doubling, with SHELL_POINTS directions on each for a hue and the two ways
 * along its axis for any other role. The first is under a step a reader could
 * see and the last is past the widest move the plan's indicative fits make
 * (the light chart yellow's, dE 13.6); twelve points put one within about 50
 * degrees of any direction.
 */
const SHELL_FIRST = 0.25;
const SHELL_LAST = 32;
const SHELL_POINTS = 12;

/**
 * How deep a repair looks ahead: seat one role where its check holds whatever
 * that breaks, and repair what broke. One level is what the chart ramp needs
 * (a series moved onto its neighbour, which then moves); more multiplies the
 * cost of every stuck repair for moves the finish's trades already reach.
 */
const LOOKAHEAD = 1;

/**
 * How far past 0 or 1 a linear channel may be and still count as shown: half
 * of one 8-bit step at the dark end, which is where rounding to a hex lands a
 * colour that sits exactly on the gamut's edge.
 */
const GAMUT_SLACK = 0.5 / 255 / 12.92;

/** The precision an alpha ships at, the one every translucent token is written to. */
const ALPHA_STEP = 0.001;

// ---------------------------------------------------------------------------
// What is fitted, and from where
// ---------------------------------------------------------------------------

/**
 * The anchors the kit decides rather than the design: for a token the design
 * never drew, and for one whose drawing the kit replaced. `of` anchors a role
 * to another role's CURRENT value, so it follows that role as the fit moves
 * it; `design` to one of the design's declarations; `beyond` keeps a
 * translucent role at least as strong as its anchor.
 */
const ANCHORS = {
  '--color-focus': { of: '--color-brand-accent', why: 'the ring is drawn in the accent' },
  '--color-border-control': { design: '--mark', why: "the design draws no control boundary; it starts from the neutral mark" },
  '--color-surface-pressed': { of: '--color-surface-hover', beyond: true, why: 'the design draws no pressed row; a press is a stronger hover' },
  '--color-brand-accent-hover': {
    of: '--color-brand-accent',
    why: "a step of the accent: the design's brightness(1.08) moves toward the white label",
  },
  '--color-brand-accent-active': { of: '--color-brand-accent-hover', why: 'the design draws no pressed primary action' },
};

/**
 * Written tokens that are another token at an alpha (or a copy of it), by a
 * rule the suite holds or both theme files state, so they move with it.
 */
const TIES = {
  [VEIL]: VEIL_GROUND, // the veil is this root's frame at VEIL_ALPHA
  '--color-surface-glass': '--color-surface-subtle', // glass is the card at 0.90
  '--color-border-hover': '--color-border-strong', // the hover border keeps the strong step's value
};

/** The hues that are a family rather than a value: the four states and the chart series. */
const HUE_FAMILIES = [/^--color-feedback-(info|warning|danger|success)(-ink)?$/, /^--color-data-\d+$/];

/** The palettes, the theme blocks that declare each, and the suite states that measure it. */
const PALETTES = {
  dark: { openings: [':root {'], states: ['dark'] },
  light: {
    openings: [':root:not([data-theme="dark"]) {', ':root[data-theme="light"] {'],
    states: ['light (media query)', 'light (attribute)'],
  },
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const here = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const readText = (path) => {
  if (!existsSync(here(path))) throw new Error(`${path} is missing: run \`npm run build --workspace @crewlethq/tokens\` first`);
  return readFileSync(here(path), 'utf8');
};

/** The CSS name Style Dictionary gives a token path, as test/build.test.mjs spells it. */
const kebab = (path) => path.map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('-');

/** Every value a theme file WRITES, by CSS name. The rest of its block the build derives. */
function writtenIn(tree, path = [], out = new Set()) {
  for (const [key, node] of Object.entries(tree)) {
    if (node === null || typeof node !== 'object') continue;
    if ('value' in node) out.add(`--${kebab([...path, key])}`);
    else writtenIn(node, [...path, key], out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** The signed turn from one hue to another, in degrees, the short way round. */
const turn = (from, to) => ((((to - from) % 360) + 540) % 360) - 180;

function lch(value) {
  const { L, a, b } = toOklab(parseHex(value));
  return { L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI };
}

/**
 * A colour from OKLCh, with its chroma cut to what sRGB can show rather than
 * clipped channel by channel. Clipping turns the hue, so a yellow asked for
 * darker and as saturated came back red, a hue family away from the one the
 * fit was moving inside; cut to the gamut's edge it stays a dark ochre.
 */
function fromLch({ L, C, h }) {
  const at = (chroma) => ({ L, a: chroma * Math.cos((h * Math.PI) / 180), b: chroma * Math.sin((h * Math.PI) / 180) });
  const shown = (chroma) => Object.values(oklabToLinear(at(chroma))).every((v) => v >= -GAMUT_SLACK && v <= 1 + GAMUT_SLACK);
  let chroma = C;
  if (!shown(chroma)) {
    let [inside, outside] = [0, C];
    for (let i = 0; i < 24; i += 1) {
      const mid = (inside + outside) / 2;
      if (shown(mid)) inside = mid;
      else outside = mid;
    }
    chroma = inside;
  }
  return hex(fromOklab(at(chroma)));
}

/** A colour at an alpha, spelled as the build spells a derived step. */
const atAlpha = (value, alpha) => withAlpha(value, Number(alpha.toFixed(3)));

/** mulberry32: a 32-bit seeded generator, uniform on [0, 1). */
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// One palette
// ---------------------------------------------------------------------------

/** The roles of one palette, and the design declarations that are measured but not fitted. */
function rolesOf(name, intent, built, written) {
  const roles = new Map();
  const add = (token, anchor) => {
    const value = built.get(token);
    if (value === undefined) throw new Error(`${name}: ${token} is a role, and the built palette does not declare it`);
    if (!written.has(token)) throw new Error(`${name}: ${token} is a role, and tokens/themes/${name}.json does not write it`);
    const kind = parseHex(value) ? 'hex' : 'alpha';
    const axes = kind === 'alpha' ? ['a'] : HUE_FAMILIES.some((family) => family.test(token)) ? ['L', 'C', 'h'] : ['L'];
    roles.set(token, { token, kind, axes, built: value, ...anchor });
  };

  const followers = [];
  const declared = [
    ...Object.entries(intent[name]).map(([variable, entry]) => ({ ...entry, label: variable })),
    ...intent.literals.map((entry) => ({ ...entry, label: entry.where })),
  ];
  for (const entry of declared) {
    if (entry.token === null || ANCHORS[entry.token] !== undefined) continue;
    if (TIES[entry.token] !== undefined || !written.has(entry.token)) {
      followers.push({ token: entry.token, design: entry.value, why: TIES[entry.token] ? `follows ${TIES[entry.token]}` : 'derived by the build from its fill' });
      continue;
    }
    if (!parseHex(entry.value) && !parseRgba(entry.value)) throw new Error(`${name}: ${entry.token} is anchored at "${entry.value}", which is not a colour`);
    add(entry.token, { design: entry.value, label: entry.label });
  }
  for (const [token, anchor] of Object.entries(ANCHORS)) {
    const replaced = declared.find((entry) => entry.token === token);
    const label = replaced ? `${anchor.why} (the design: ${replaced.value})` : anchor.why;
    if (anchor.design !== undefined) add(token, { design: intent[name][anchor.design].value, kit: true, label });
    else add(token, { of: anchor.of, beyond: anchor.beyond === true, kit: true, label });
  }
  return { roles, followers };
}

function fitPalette(name, sources, intent) {
  const palette = PALETTES[name];
  const built = paletteStates(sources)[palette.states[0]];
  const written = writtenIn(JSON.parse(readText(`tokens/themes/${name}.json`)));
  for (const token of written) {
    if (built.get(token) === undefined) throw new Error(`${name}: tokens/themes/${name}.json writes ${token}, which the built palette does not declare`);
  }
  const { roles, followers } = rolesOf(name, intent, built, written);
  const rng = mulberry32(SEED);
  const pick = (list) => list[Math.floor(rng() * list.length)];

  // A COMPANION is a derived step spelled from a role's own channels under the
  // role's own name: a state's -soft and -line, the accent's -rgb and
  // -soft-strong. It follows the role. The accent's -soft is a companion and a
  // role at once: its alpha is fitted, and its channels follow the accent.
  const companions = new Map();
  for (const role of roles.values()) {
    if (role.kind !== 'hex') continue;
    const { r, g, b } = parseHex(role.built);
    for (const [token, value] of built) {
      if (!token.startsWith(`${role.token}-`)) continue;
      const rgba = parseRgba(value);
      const triple = value === `${r}, ${g}, ${b}`;
      if (!triple && !(rgba && rgba.rgb.r === r && rgba.rgb.g === g && rgba.rgb.b === b)) continue;
      companions.set(token, { of: role.token, alpha: triple ? null : rgba.a });
    }
  }
  /** The role a token moves with, or null for one the fit never moves. */
  const owner = (token) => (roles.has(token) ? token : (companions.get(token)?.of ?? TIES[token] ?? null));

  // A role anchored `of` another is fitted as an OFFSET from it, so it keeps
  // its step when that role moves: the press stays a press of the hover, the
  // pressed primary action a step past the hovered one. Its anchor is no
  // offset at all. Render in an order that puts every such role after the one
  // it is measured from.
  const order = [];
  for (const pending = new Set(roles.keys()); pending.size > 0; ) {
    for (const token of pending) {
      const role = roles.get(token);
      if (role.of !== undefined && pending.has(role.of)) continue;
      if (role.of !== undefined && roles.get(role.of).kind !== role.kind) throw new Error(`${name}: ${token} is anchored at ${role.of}, which is not a ${role.kind} role`);
      order.push(role);
      pending.delete(token);
    }
  }

  // --- a candidate's values and sheets --------------------------------------

  const inkOf = (role, values) => (companions.has(role.token) ? values.get(companions.get(role.token).of) : role.built);

  function render(params) {
    const values = new Map();
    for (const role of order) {
      const p = params.get(role.token);
      if (role.kind === 'hex') {
        const base = role.of === undefined ? { L: 0, C: 0, h: 0 } : lch(values.get(role.of));
        values.set(role.token, fromLch({ L: base.L + p.L, C: Math.max(0, base.C + p.C), h: base.h + p.h }));
      } else {
        const base = role.of === undefined ? 0 : parseRgba(values.get(role.of)).a;
        values.set(role.token, atAlpha(inkOf(role, values), Math.min(1, Math.max(0, base + p.a))));
      }
    }
    for (const [token, { of, alpha }] of companions) {
      if (roles.has(token)) continue;
      const { r, g, b } = parseHex(values.get(of));
      values.set(token, alpha === null ? `${r}, ${g}, ${b}` : withAlpha(values.get(of), alpha));
    }
    for (const [token, from] of Object.entries(TIES)) {
      const source = values.get(from) ?? built.get(from);
      const own = parseRgba(built.get(token));
      values.set(token, own && own.a < 1 ? withAlpha(source, own.a) : source);
    }
    return values;
  }

  function sheets(values) {
    let themes = sources.themes;
    for (const opening of palette.openings) {
      const start = themes.indexOf(opening);
      if (start < 0) throw new Error(`themes.css has no block opening with ${opening}`);
      const bodyStart = start + opening.length;
      const bodyEnd = themes.indexOf('}', bodyStart);
      let body = themes.slice(bodyStart, bodyEnd);
      for (const [token, value] of values) {
        const declaration = new RegExp(`(\\n\\s*${token}: )[^;]+;`);
        if (!declaration.test(body)) throw new Error(`${opening} declares no ${token}`);
        body = body.replace(declaration, `$1${value};`);
      }
      themes = themes.slice(0, bodyStart) + body + themes.slice(bodyEnd);
    }
    return { tokens: sources.tokens, themes };
  }

  // --- anchors, and what a candidate costs ----------------------------------

  const anchorOf = (role, values) => (role.of === undefined ? role.design : values.get(role.of));
  const rungsOf = (values) => OPAQUE_SURFACES.map((token) => parseHex(values.get(token) ?? built.get(token)));
  const overRungs = (value, anchor, values) => rungsOf(values).map((rung) => deltaE(flatten(value, rung), flatten(anchor, rung)));

  function costOf(role, values) {
    const value = values.get(role.token);
    const anchor = anchorOf(role, values);
    if (role.kind === 'hex') return deltaE(parseHex(value), parseHex(anchor));
    return overRungs(value, anchor, values).reduce((sum, distance) => sum + distance, 0);
  }

  /**
   * The anchor in the role's own parameters: no offset for a role anchored at
   * another, the design's OKLCh for a hex role, and for a translucent one the
   * alpha whose composites over the rungs sit closest to the design's.
   */
  function anchorParams(role, values) {
    if (role.of !== undefined) return role.kind === 'hex' ? { L: 0, C: 0, h: 0 } : { a: 0 };
    if (role.kind === 'hex') return lch(role.design);
    const ink = inkOf(role, values);
    let best = { a: 0, cost: Infinity };
    for (let i = 0; i <= 1 / ALPHA_STEP; i += 1) {
      const cost = overRungs(atAlpha(ink, i * ALPHA_STEP), role.design, values).reduce((sum, distance) => sum + distance, 0);
      if (cost < best.cost) best = { a: i * ALPHA_STEP, cost };
    }
    return { a: best.a };
  }

  // --- the design's order ----------------------------------------------------

  const DISORDER = "the fit keeps the design's order";
  const above = [];
  for (const ladder of LADDERS) {
    const rungs = ladder.map((token) => roles.get(token)).filter((role) => role !== undefined && role.of === undefined);
    for (const a of rungs) for (const b of rungs) if (lch(a.design).L > lch(b.design).L + 1e-6) above.push([a.token, b.token]);
  }
  const disorder = (values) =>
    above
      .filter(([hi, lo]) => lch(values.get(hi)).L <= lch(values.get(lo)).L)
      .map(([hi, lo]) => ({ state: name, rule: DISORDER, subject: `${hi} above ${lo}`, detail: `${values.get(hi)} is no lighter than ${values.get(lo)}` }));

  // --- measuring --------------------------------------------------------------

  let evaluations = 0;
  const cache = new Map();
  const failing = (values) => runPalette(sheets(values)).failures.filter((check) => palette.states.includes(check.state) || check.state === 'the token files');
  function measure(params) {
    const values = render(params);
    const key = [...values.values()].join('|');
    let failures = cache.get(key);
    if (failures === undefined) {
      failures = disorder(values);
      if (failures.length === 0) {
        evaluations += 1;
        failures = failing(values);
      }
      cache.set(key, failures);
    }
    // Two sums, compared in order: the design's own values first, and the
    // kit's tokens (ANCHORS) only between palettes that move the design
    // equally. A token the design never drew fits around the design; it never
    // buys a value of the design's back by moving itself.
    let cost = 0;
    let kit = 0;
    for (const role of order) {
      if (role.kit) kit += costOf(role, values);
      else cost += costOf(role, values);
    }
    // A candidate out of the design's order is never measured, and ranks below
    // every candidate in it, however many checks that one fails.
    const rank = failures.some((check) => check.rule === DISORDER) ? Infinity : failures.length;
    return { params, values, failures, rank, cost, kit, keys: new Set(failures.map(keyOf)), failing: new Map(failures.map((check) => [keyOf(check), check])) };
  }
  let limit = BUDGET;
  const spent = () => evaluations >= limit;
  const EPSILON = 1e-9;
  const cheaper = (a, b) => a.cost < b.cost - EPSILON || (Math.abs(a.cost - b.cost) <= EPSILON && a.kit < b.kit - EPSILON);
  const better = (a, b) => a.rank < b.rank || (a.rank === b.rank && cheaper(a, b));
  const cleanAndCheaper = (a, b) => a.rank === 0 && cheaper(a, b);

  const keyOf = (check) => `${check.state}|${check.rule}|${check.subject}`;

  // Which roles move which check. A check's own words name most of them (its
  // subject, and the ground it measured worst on), through the companions and
  // ties that follow a role. Not all: "the selected tint outreads the hover
  // overlay" names only the rung, and the two overlays it compares are what a
  // fix has to move. So each role is also nudged once, from the anchors, and
  // every check whose measurement that changes is its check too.
  const moves = new Map();
  const named = (check) => [...`${check.subject} ${check.detail}`.matchAll(/--[a-z0-9-]+/g)].map(([token]) => owner(token)).filter((token) => token !== null);
  /** The roles that can move a check. */
  const mentioned = (check) => [...new Set([...named(check), ...(moves.get(keyOf(check)) ?? [])])];

  /**
   * The roles a failing check is ABOUT, which are the ones a repair moves: the
   * value that fails a floor is the one that moves, and a value that clears
   * every floor of its own stays where the design put it. The subject says
   * which. "A vs B" is about both. Otherwise it is about A, the thing
   * measured, and not about B, where or from what it was measured ("the
   * tertiary step on the frame", "the hover after the accent", "the sheet over
   * the frame"): a ground that moved to rescue a mark would move every other
   * measurement taken on it. The one turn in that grammar is a label on its
   * fill (LABEL_ON_FILL), which is about the FILL: the label is white on every
   * fill, and it is the fill that is dark enough or is not. A check that names
   * no role it is about (a phase hue against the accent, where only the accent
   * is fitted) falls back to the roles that move its measurement, the four
   * rungs excepted.
   */
  const GROUNDS = new Set(OPAQUE_SURFACES);
  const LABELLED = new Set(LABEL_ON_FILL.map(([label, fill]) => `${label} on ${fill}`));
  const about = (check) => {
    const tokens = [...check.subject.matchAll(/--[a-z0-9-]+/g)].map(([token]) => token);
    const own = check.subject.includes(' vs ') ? tokens : LABELLED.has(tokens.slice(0, 2).join(' on ')) ? [tokens[1]] : tokens.slice(0, 1);
    const roles = [...new Set(own.map(owner).filter((token) => token !== null))];
    return roles.length > 0 ? roles : mentioned(check).filter((token) => !GROUNDS.has(token));
  };

  // --- moving one role --------------------------------------------------------

  const STEP = { L: 0.002, C: 0.002, h: 0.5, a: ALPHA_STEP };

  function clamp(role, p) {
    if (role.kind === 'alpha') return { a: Math.max(role.beyond ? 0 : -1, Math.min(1, Math.round(p.a / ALPHA_STEP) * ALPHA_STEP)) };
    if (role.of !== undefined) return p;
    return { L: Math.min(1, Math.max(0, p.L)), C: Math.max(0, p.C), h: role.hue + Math.min(HUE_FAMILY, Math.max(-HUE_FAMILY, turn(role.hue, p.h))) };
  }
  const moved = (params, role, axis, delta) => new Map(params).set(role.token, clamp(role, { ...params.get(role.token), [axis]: params.get(role.token)[axis] + delta }));
  function toward(params, role, target, t) {
    const p = params.get(role.token);
    const q = role.kind === 'alpha' ? { a: p.a + (target.a - p.a) * t } : { L: p.L + (target.L - p.L) * t, C: p.C + (target.C - p.C) * t, h: p.h + turn(p.h, target.h) * t };
    return new Map(params).set(role.token, clamp(role, q));
  }

  // --- the start: every role at its anchor ------------------------------------

  // Every role where it is built, then, in order, each moved to its anchor:
  // a translucent role's anchor is measured on the rungs as they stand.
  const params = new Map(
    order.map((role) => [role.token, role.of !== undefined ? anchorParams(role) : role.kind === 'hex' ? lch(role.built) : { a: parseRgba(role.built).a }]),
  );
  for (const role of order) {
    const anchor = anchorParams(role, render(params));
    if (role.kind === 'hex' && role.of === undefined) role.hue = anchor.h;
    params.set(role.token, anchor);
  }
  const start = measure(params);
  let current = start;

  const measured = (values) => {
    evaluations += 1;
    return runPalette(sheets(values)).checks.filter((check) => palette.states.includes(check.state));
  };
  const atStart = new Map(measured(start.values).map((check) => [keyOf(check), check]));
  const SENSE = { L: 0.02, C: 0.02, h: 5, a: 0.02 };
  for (const role of order) {
    for (const axis of role.axes) {
      for (const check of measured(render(moved(params, role, axis, SENSE[axis])))) {
        const was = atStart.get(keyOf(check));
        if (was !== undefined && Math.abs(was.value - check.value) < 1e-9 && was.ok === check.ok) continue;
        if (!moves.has(keyOf(check))) moves.set(keyOf(check), new Set());
        moves.get(keyOf(check)).add(role.token);
      }
    }
  }

  // Which roles share a check: the ones a trade is made between.
  const coupled = new Map(order.map((role) => [role.token, new Set()]));
  for (const check of atStart.values()) {
    const tokens = mentioned(check);
    for (const a of tokens) for (const b of tokens) if (a !== b) coupled.get(a).add(b);
  }

  // --- repair: the nearest seat that clears a check ---------------------------

  /**
   * Whether a candidate clears checks. Given a check rather than a mode, only
   * whether that one now holds, which is where a lookahead starts (below);
   * `improve`, whether nothing fails and the design moved less. Otherwise
   * both modes ask that fewer fail and that
   * no check failing before fails by more after: a count cannot see a red that
   * cleared its separation from the green by going lighter and took its white
   * label from 2.9:1 to 1.9:1 on the way, and from there no seat clears the
   * label without breaking the separation again. A check's measurement is
   * higher for better except in a band or under a ceiling, which is the one
   * kind whose detail reads "<". `clean` also asks that nothing that held
   * breaks; `net` lets a failure be traded for fewer elsewhere.
   */
  const higherIsBetter = (check) => !check.detail.includes('<');
  const worsens = (candidate, from) =>
    candidate.failures.some((check) => {
      const was = from.failing.get(keyOf(check));
      return was !== undefined && higherIsBetter(check) && check.value < was.value - 1e-9;
    });
  function clears(candidate, from, mode) {
    if (typeof mode === 'object') return candidate.rank < Infinity && !candidate.keys.has(keyOf(mode));
    if (mode === 'improve') return cleanAndCheaper(candidate, from);
    return (
      candidate.rank < from.rank &&
      !worsens(candidate, from) &&
      (mode === 'net' || candidate.failures.every((check) => from.keys.has(keyOf(check))))
    );
  }

  /** A direction drawn uniformly from the unit sphere: three normals, by Box-Muller, normalised. */
  function unit() {
    const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const v = [normal(), normal(), normal()];
    const length = Math.hypot(...v) || 1;
    return v.map((x) => x / length);
  }

  /**
   * One role's points at a distance from its anchor, in dE: a hue's are
   * SHELL_POINTS directions drawn from the seeded stream, in OKLab, inside its
   * hue family; a lightness step's and an alpha's are the two ways along
   * their one axis.
   */
  function around(role, anchor, radius) {
    if (role.kind === 'alpha') return [1, -1].map((sign) => clamp(role, { a: anchor.a + (sign * radius) / 100 }));
    if (role.axes.length === 1) return [1, -1].map((sign) => clamp(role, { ...anchor, L: anchor.L + (sign * radius) / 100 }));
    const centre = { L: anchor.L, a: anchor.C * Math.cos((anchor.h * Math.PI) / 180), b: anchor.C * Math.sin((anchor.h * Math.PI) / 180) };
    return Array.from({ length: SHELL_POINTS }, () => {
      const [dL, da, db] = unit();
      const [a, b] = [centre.a + (da * radius) / 100, centre.b + (db * radius) / 100];
      return clamp(role, { L: centre.L + (dL * radius) / 100, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI });
    });
  }

  /**
   * The nearest SEAT for one role that clears checks, the others held where
   * they are: points on shells round its ANCHOR, of doubling radius, the best
   * on the first shell that has one, then the least radius along that point's
   * own direction that still clears as many. Round the anchor, not round
   * where the role now is: a hue that went the wrong way comes back the
   * moment the others let it, instead of walking on from its mistake. A red
   * that must carry a white label and part from a green is darker and a
   * little bluer, and looking on a shell finds that where walking one axis
   * and then the next finds the first way out, lighter, which sinks the label.
   */
  function reseat(from, role, mode) {
    const anchor = anchorParams(role, from.values);
    let best = null;
    let inside = 0;
    for (let radius = SHELL_FIRST; radius <= SHELL_LAST && !spent(); radius *= 2) {
      for (const params of around(role, anchor, radius)) {
        const candidate = measure(new Map(from.params).set(role.token, params));
        if (clears(candidate, from, mode) && (best === null || better(candidate, best.candidate))) best = { candidate, params, radius, inside };
      }
      if (best !== null) break;
      inside = radius;
    }
    if (best === null) return null;
    // Back along the point's own direction to the least radius that clears as many.
    const atAnchor = new Map(from.params).set(role.token, anchor);
    const reach = best.radius;
    let [low, high] = [best.inside / reach, 1];
    for (let i = 0; i < 6 && !spent(); i += 1) {
      const t = (low + high) / 2;
      const candidate = measure(toward(atAnchor, role, best.params, t));
      if (clears(candidate, from, mode) && candidate.rank <= best.candidate.rank) [high, best] = [t, { ...best, candidate }];
      else low = t;
    }
    return best.candidate;
  }

  /**
   * The seat that clears a check, and the most checks with it. The failing
   * checks are taken in a seeded order; for the first that a role it is ABOUT
   * can clear, each such role is reseated, and the seat leaving the fewest
   * checks failing is taken, the least dE breaking a tie. A seat that breaks
   * nothing is preferred to one that trades a failure for a failure, which is
   * only looked for when no check has one.
   */
  function repair(from, exclude = null, depth = 1) {
    const fixable = () => from.failures.filter((check) => about(check).some((token) => token !== exclude));
    for (const mode of ['clean', 'net']) {
      for (let checks = fixable(); checks.length > 0 && !spent(); ) {
        const check = checks.splice(Math.floor(rng() * checks.length), 1)[0];
        let best = null;
        for (const token of about(check)) {
          if (token === exclude) continue;
          const candidate = reseat(from, roles.get(token), mode);
          if (candidate !== null && (best === null || better(candidate, best))) best = candidate;
        }
        if (best !== null) return best;
      }
    }
    // A LOOKAHEAD, for a check no one seat can clear without breaking more
    // than it clears: seat its role where that check holds, whatever it
    // breaks, then repair what broke with the other roles, and keep it if the
    // palette ends better. A chart yellow dark enough to be a mark on the
    // light frame lands on the orange beside it; the orange can move, and
    // only then does the yellow's seat pay.
    if (depth > LOOKAHEAD) return null;
    for (let checks = fixable(); checks.length > 0 && !spent(); ) {
      const check = checks.splice(Math.floor(rng() * checks.length), 1)[0];
      for (const token of about(check)) {
        if (token === exclude) continue;
        const seat = reseat(from, roles.get(token), check);
        if (seat === null) continue;
        let trial = seat;
        for (let i = 0; i < 4 && trial.rank > 0 && !spent(); i += 1) trial = repair(trial, token, depth + 1) ?? trial;
        if (better(trial, from) && !worsens(trial, from)) return trial;
      }
    }
    return null;
  }

  function repairAll(from, exclude = null, steps = Infinity) {
    let at = from;
    for (let i = 0; i < steps && at.rank > 0 && !spent(); i += 1) {
      const next = repair(at, exclude);
      if (next === null) break;
      at = next;
    }
    return at;
  }

  // --- improve: back toward the anchors ---------------------------------------

  /**
   * The furthest walk of one role back toward its anchor that keeps the
   * palette clean: all the way if it can, else the boundary, found by
   * bisection to 1/2^depth of the way.
   */
  function relax(from, role, depth = 8) {
    if (costOf(role, from.values) < 1e-6 || spent()) return null;
    const anchor = anchorParams(role, from.values);
    // Along the straight line back, and for a hue along each axis on its own:
    // a red held dark by its label can often win its hue back even where its
    // lightness cannot move at all.
    const here = from.params.get(role.token);
    const targets = [anchor, ...(role.axes.length > 1 ? role.axes.map((axis) => ({ ...here, [axis]: anchor[axis] })) : [])];
    let best = null;
    for (const target of targets) {
      const found = walkBack(from, role, target, depth);
      if (found !== null && (best === null || better(found, best))) best = found;
    }
    return best;
  }

  function walkBack(from, role, target, depth) {
    const whole = measure(toward(from.params, role, target, 1));
    if (cleanAndCheaper(whole, from)) return whole;
    let best = null;
    let [inside, outside] = [0, 1];
    for (let i = 0; i < depth && !spent(); i += 1) {
      const t = (inside + outside) / 2;
      const candidate = measure(toward(from.params, role, target, t));
      if (cleanAndCheaper(candidate, from)) [inside, best] = [t, candidate];
      else outside = t;
    }
    return best;
  }

  /** Move one role anyway, repair what that breaks with the others, and walk them back. */
  function trade(from, role, params, partners = coupled.get(role.token)) {
    let trial = repairAll(measure(params), role.token, 6);
    if (trial.rank > 0) return null;
    for (const other of partners) trial = relax(trial, roles.get(other)) ?? trial;
    return cleanAndCheaper(trial, from) ? trial : null;
  }

  /**
   * A seeded nudge of one role: between 1 and 256 of its axis's smallest
   * step, either way, the length drawn evenly on a log scale. The long end is
   * for a role no single seat can repair, a press that has to part from the
   * hover by dE 3 on four rungs at once, say, which only a step past what it
   * breaks and a repair of that can reach; a continuous length, because a
   * nudge the search has already measured teaches it nothing.
   */
  const nudge = (from, role) => {
    const axis = pick(role.axes);
    return moved(from.params, role, axis, (rng() < 0.5 ? -1 : 1) * STEP[axis] * 2 ** (rng() * 8));
  };

  /** One search from a palette: repair until nothing fails, then improve, until its share is spent. */
  function search(from) {
    let current = from;
    for (let idle = 0; !spent() && idle < 1000; ) {
      const before = evaluations;
      let next;
      if (current.rank > 0) {
        next = repair(current);
        if (next === null) {
          // No one role can clear a check alone: nudge a role a failing check
          // names, repair from there, and keep it if fewer checks fail.
          const movable = current.failures.map(about).filter((tokens) => tokens.length > 0);
          if (movable.length === 0) break;
          next = repairAll(measure(nudge(current, roles.get(pick(pick(movable))))), null, 6);
        }
      } else {
        // A role the fit has moved, which is where the design can be won back.
        // One still at its anchor stays there: pulling a value that clears
        // every floor of its own off the design, to spare another, is the move
        // the principle forbids, however little it would cost.
        const away = order.filter((candidate) => costOf(candidate, current.values) > 1e-6);
        if (away.length === 0) break;
        const role = pick(away);
        next =
          relax(current, role) ??
          (role.axes.length > 1 ? reseat(current, role, 'improve') : null) ??
          trade(current, role, toward(current.params, role, anchorParams(role, current.values), rng())) ??
          trade(current, role, nudge(current, role));
      }
      if (next !== null && better(next, current)) current = next;
      idle = evaluations === before ? idle + 1 : 0;
    }
    return current;
  }

  limit = BUDGET * SEARCH_SHARE;
  current = search(start);

  // --- the finish: every trade that still pays --------------------------------
  //
  // The search ends where its share of the budget runs out, which is not
  // necessarily where no trade helps: a role it pushed early can hold its
  // neighbours further from the design than they need to be (a hover a step
  // stronger than it need be holds the tertiary step lighter). So the finish
  // takes each moved role in turn, the design's own before the kit's and the
  // dearest first, and takes its PROFILE (below): every step near where it
  // is, each one repairing what it breaks and walking back the roles it BINDS
  // (those whose check fails, back at their own anchor, on a measurement this
  // role moves), and keeps the best if the design moved less. A hue is
  // reseated instead, nearer its anchor where the others allow. Passes repeat
  // until one keeps nothing.
  limit = BUDGET * (SEARCH_SHARE + FINISH_SHARE);
  const lineage = (token) => (roles.get(token)?.of === undefined ? [token] : [token, ...lineage(roles.get(token).of)]);
  function boundBy(role) {
    const out = [];
    for (const other of order) {
      if (other === role || costOf(other, current.values) < 1e-6) continue;
      const restored = measure(toward(current.params, other, anchorParams(other, current.values), 1));
      if (restored.failures.some((check) => mentioned(check).flatMap(lineage).includes(role.token))) out.push(other.token);
    }
    return out;
  }
  /**
   * A PROFILE of one role along its axis: every offset within FINISH_REACH of
   * its smallest step either way, each a trade, and the best of them. Every
   * offset rather than a walk that stops at the first one that does not pay,
   * because the partners' walks back land on whole hex steps: a hover a
   * thousandth weaker can leave the tertiary step on the same hex and cost
   * more, where two thousandths weaker takes it a step back and costs less.
   */
  function profile(role) {
    const axis = role.axes[0];
    const partners = boundBy(role);
    if (partners.length === 0) return relax(current, role, 12);
    let best = null;
    for (let offset = -FINISH_REACH; offset <= FINISH_REACH && !spent(); offset += 1) {
      if (offset === 0) continue;
      const next = trade(current, role, moved(current.params, role, axis, offset * STEP[axis]), partners);
      if (next !== null && (best === null || better(next, best))) best = next;
    }
    return best;
  }
  // None under FINISH_FLOOR: an inset whose design is drawn in black where the
  // kit's is drawn in its own near-black costs 0.01, and trading it against
  // everything drawn on it buys nothing.
  for (let kept = true; kept && !spent(); ) {
    kept = false;
    const finishing = order
      .map((role) => ({ role, cost: costOf(role, current.values) }))
      .filter(({ cost }) => cost >= FINISH_FLOOR)
      .sort((a, b) => (a.role.kit === b.role.kit ? b.cost - a.cost : a.role.kit ? 1 : -1))
      .map(({ role }) => role);
    for (const role of finishing) {
      if (spent()) break;
      const next = role.axes.length > 1 ? reseat(current, role, 'improve') : profile(role);
      if (next !== null) [current, kept] = [next, true];
    }
  }
  // Last, with the rest of the budget, every role walked back once more, in
  // order, as far as it will go.
  limit = BUDGET;
  for (const role of order) current = relax(current, role, 12) ?? current;

  // --- what forced each move --------------------------------------------------

  const searched = evaluations;

  const rows = order.map((role) => {
    const anchor = anchorOf(role, current.values);
    const value = current.values.get(role.token);
    const distance = role.kind === 'hex' ? deltaE(parseHex(value), parseHex(anchor)) : Math.max(...overRungs(value, anchor, current.values));
    // What fails when this role alone goes back to its anchor, one check per
    // rule, measured even where going back also breaks the design's order,
    // since the search never measures such a palette and the order is rarely
    // the whole story.
    const binding = new Map();
    if (distance >= 0.005) {
      const restored = render(toward(current.params, role, anchorParams(role, current.values), 1));
      for (const check of [...failing(restored), ...disorder(restored)]) {
        if (!binding.has(check.rule)) binding.set(check.rule, check);
      }
    }
    return { role, anchor, value, distance, binding: [...binding.values()] };
  });
  return { name, rows, followers, start, current, evaluations: searched };
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

function print({ name, rows, followers, start, current, evaluations }) {
  const out = [];
  out.push(`The ${name} palette, fitted with seed ${SEED} in ${evaluations} of ${BUDGET} evaluations.`);
  out.push(`At the design: ${start.failures.length} failing checks. The fit: ${current.failures.length} failing; the design moved dE ${current.cost.toFixed(2)} in all, the kit's own tokens ${current.kit.toFixed(2)}.`);
  for (const check of current.failures) out.push(`  STILL FAILING: ${check.rule}: ${check.subject}: ${check.detail}`);
  out.push('');
  const table = [['role', 'design', 'shipped', 'dE']];
  const notes = [];
  for (const { role, anchor, value, distance, binding } of rows) {
    table.push([role.token, anchor, value, distance.toFixed(2)]);
    const lines = [];
    if (role.of !== undefined) lines.push(`anchored at ${role.of}: ${role.label}`);
    else if (role.design !== anchor) lines.push(role.label);
    for (const check of binding) lines.push(`binding: ${check.rule}: ${check.subject}: ${check.detail}`);
    notes.push(lines);
  }
  for (const { token, design, why } of followers) {
    table.push([token, design, current.values.get(token) ?? '', '']);
    notes.push([why]);
  }
  const widths = table[0].map((_, i) => Math.max(...table.map((row) => row[i].length)));
  const line = (row) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd();
  out.push(line(table[0]));
  table.slice(1).forEach((row, i) => {
    out.push(line(row));
    for (const note of notes[i]) out.push(`    ${note}`);
  });
  const drift = rows.filter(({ role, value }) => role.built !== value);
  out.push('');
  if (drift.length === 0) out.push('Every role ships its fitted value.');
  else {
    out.push('Tokens whose built value is not the fit:');
    const width = Math.max(...drift.map(({ role }) => role.token.length));
    for (const { role, value } of drift) out.push(`  ${role.token.padEnd(width)}  built ${role.built}, fit ${value}`);
  }
  process.stdout.write(`${out.join('\n')}\n\n`);
}

const sources = { tokens: readText('dist/css/tokens.css'), themes: readText('dist/css/themes.css') };
const intent = JSON.parse(readText('tokens/intent.json'));
const asked = process.argv.slice(2);
for (const name of asked.length > 0 ? asked : Object.keys(PALETTES)) {
  if (PALETTES[name] === undefined) throw new Error(`"${name}" is not a palette; the palettes are ${Object.keys(PALETTES).join(' and ')}`);
  print(fitPalette(name, sources, intent));
}
