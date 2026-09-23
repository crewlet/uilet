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
 * WHAT IT FITS AGAINST: every rule of the suite but the phase family's
 * (UNFITTED). That family is measured and never fitted, and it is removed
 * later in this release: held to it at the hues the family had, the search
 * bends the states round hues that are not staying and ends at a palette the
 * design moves further for (dE 42.74 against 35.12 in dark, 78.55 against
 * 77.89 in light). So the phase hues moved out of the fitted states' way
 * instead, each the least that clears the whole suite, which still holds them
 * to every rule of their own.
 *
 * THE SEARCH is seeded, mulberry32 at SEED. From the anchors it first SEATS
 * THE KIT'S STEPS, each role anchored at another (a press, a hover of an
 * action) where its own rule holds, because at its anchor it is the value it
 * is a step of, which that rule refuses. Then, in SEARCH_BUDGET evaluations of
 * the palette, it REPAIRS: a failing check is taken in a seeded order, a
 * role's own floors before a separation between two, the roles it is about
 * are RESEATED (the nearest point to the role's anchor, on shells of growing
 * radius that always carry the two ways along lightness, where fewer checks
 * fail and none fails worse), and when no one seat can do it, one role is
 * seated where its check holds and what that breaks is repaired in turn. Once
 * nothing fails it IMPROVES with what is left, walking a moved role back
 * toward its anchor, or nudging it and repairing and walking back the roles it
 * shares a check with, which is how a trade is found (the hover overlay
 * against the tertiary step it takes contrast from).
 *
 * THE FINISH then runs until no move it knows pays. It SETTLES first: every
 * moved role walked back toward its anchor, and a hue reseated and its
 * direction from the anchor TURNED until the seat is as near as the floors
 * allow, again and again until none moves. Only a settled palette pays for a
 * TRADE: a lightness or alpha step's PROFILE (every step near where it is,
 * what each breaks repaired, the roles it binds walked back), and a hue's
 * JOINT SEAT, nearer its anchor together with the roles measured ON it (an ink
 * on its own fill's soft tint), which are repaired as it moves. After a trade
 * is kept the palette settles again, and a role is tried again only once a
 * role that held it has moved. Same seed, same built sheets: the same fit, to
 * the byte.
 *
 * WHAT IT PRINTS, per palette: the evaluations the search and the finish
 * took, and whether the finish ran until no move paid; every role with its
 * anchor, the value the fit ships, the dE between them and, for a role the fit
 * moved, the BINDING rule: what fails when that role alone goes back to its
 * anchor. Then the tokens whose built value is not the fit, which is the edit
 * the token files owe.
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
 * The evaluations the SEARCH is given, every one a runPalette over the
 * candidate sheets. The light palette, which starts with 86 failing checks,
 * has none after about 6300 of them, and the rest improve the clean palette
 * with seeded moves. The seeded moves take a different path at a different
 * length, and the finish converges from wherever they stop, so this number
 * chooses among nearby fits rather than bounding one: at 18000 and at 24000
 * the dark palette is the same palette, and the light one differs only in
 * its danger red, the red's ink and hover and, at 18000, the success green,
 * dE 0.19 and 0.80 dearer in all.
 */
const SEARCH_BUDGET = 12000;

/**
 * A ceiling on the FINISH, which runs until no move pays and is not meant to
 * reach it: the light palette's finish converges in about 17000 evaluations
 * and the dark's in about 3300, and the two whole fits take about two minutes
 * and one. It is what stops
 * a finish that a rule table made grind through ever smaller wins, and the
 * fit says so when it stopped there, because a finish that did is not a
 * least move.
 */
const FINISH_CEILING = 60000;

/**
 * How far a state or series hue may turn from the design's, in degrees of
 * OKLCh hue, either way. A hue family is a range, and the widest turns the fit
 * makes are the light warning amber's and the light chart yellow's toward
 * red, darkening to ochres, and the dark danger red's toward crimson, away
 * from the chart orange: 10.4, 9.9 and 9.9 degrees. At 15 a red is still a
 * red rather than an orange or a pink.
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
 * How a hue's seat is TURNED toward its anchor: the direction from the anchor
 * to the seat is rotated REFINE_FIRST degrees each of four ways, and kept where
 * the least radius along it that clears is nearer; then half that, down to
 * REFINE_LAST, each direction walked back in REFINE_STEPS halvings. A shell's
 * twelve drawn directions put one within about 50 degrees of any, and a seat
 * walked back along one of them is only as near as that direction lets it be:
 * the light chart aqua shipped dE 6.76 from the design where its own floor,
 * with every other value held, allowed 6.43. 24 degrees is half that spread;
 * at 1.5 a turn moves a seat dE 15 out by 0.4, about an 8-bit step, and seven
 * halvings put the walk back within a 128th of its reach.
 */
const REFINE_FIRST = 24;
const REFINE_LAST = 1.5;
const REFINE_STEPS = 7;

/**
 * A JOINT SEAT's reach: on a shell, the JOINT_POINTS points that fail the
 * fewest checks, each walked back toward the anchor in JOINT_STEPS halvings of
 * the band between the shell and the one inside it. Every point of a joint
 * seat is a trade that reseats an ink, tens of evaluations, which makes it the
 * dearest move the fit has, so it is spent on the points nearest to holding;
 * five halvings of the widest band a hue walks (dE 8 to 16) land within dE
 * 0.25 of the least radius.
 */
const JOINT_POINTS = 4;
const JOINT_STEPS = 5;

/**
 * The shells a reseat looks on: radii from SHELL_FIRST to SHELL_LAST dE,
 * doubling, with the two ways along lightness and SHELL_POINTS drawn
 * directions on each for a hue, and the two ways along its axis for any other
 * role. The first is under a step a reader could see and the last is past the
 * widest move the fit makes (the dark danger red's, dE 13.4); twelve drawn
 * points put one within about 50 degrees of any direction.
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
  '--color-feedback-danger-hover': {
    of: '--color-feedback-danger',
    why: "a step of the danger fill: the design draws no hover for the destructive action",
  },
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

/** The checks the fit does not fit against: every one about a phase hue. See WHAT IT FITS AGAINST. */
const UNFITTED = /--color-phase-/;

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
   * How far a role is from its anchor as a reader sees it, which is what the
   * table prints and what FINISH_FLOOR is compared with: for a translucent
   * role its farthest rung, where the cost sums the four.
   */
  function distanceOf(role, values) {
    const value = values.get(role.token);
    const anchor = anchorOf(role, values);
    if (role.kind === 'hex') return deltaE(parseHex(value), parseHex(anchor));
    return Math.max(...overRungs(value, anchor, values));
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
  const fitted = (check) => (palette.states.includes(check.state) || check.state === 'the token files') && !UNFITTED.test(check.subject);
  const failing = (values) => runPalette(sheets(values)).failures.filter(fitted);
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
  let limit = SEARCH_BUDGET;
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
    return runPalette(sheets(values)).checks.filter((check) => palette.states.includes(check.state) && fitted(check));
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
   * One role's points at a distance from its anchor, in dE: a hue's are the
   * two ways along lightness, keeping its hue and chroma, and then
   * SHELL_POINTS directions drawn from the seeded stream, in OKLab, inside its
   * hue family; a lightness step's and an alpha's are the two ways along
   * their one axis. The lightness pair is always there because it is the move
   * a hue's own floors most often ask for (a mark too light for the frame, a
   * fill too light for its white label) and the one every hand fit made, and
   * twelve drawn directions can miss it by 50 degrees: a chart yellow darkened
   * on a drawn direction instead came back dE 25 from the design, twice the
   * move lightness alone needed.
   */
  function around(role, anchor, radius) {
    if (role.kind === 'alpha') return [1, -1].map((sign) => clamp(role, { a: anchor.a + (sign * radius) / 100 }));
    if (role.axes.length === 1) return [1, -1].map((sign) => clamp(role, { ...anchor, L: anchor.L + (sign * radius) / 100 }));
    return [[1, 0, 0], [-1, 0, 0], ...Array.from({ length: SHELL_POINTS }, unit)].map((direction) => pointAt(role, anchor, direction, radius));
  }

  /** A hue's parameters as an OKLab point. */
  const labOf = ({ L, C, h }) => ({ L, a: C * Math.cos((h * Math.PI) / 180), b: C * Math.sin((h * Math.PI) / 180) });

  /** A hue's point a distance in dE from its anchor, along a unit OKLab direction, kept inside its family. */
  function pointAt(role, anchor, [dL, da, db], radius) {
    const centre = labOf(anchor);
    const [a, b] = [centre.a + (da * radius) / 100, centre.b + (db * radius) / 100];
    return clamp(role, { L: centre.L + (dL * radius) / 100, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180) / Math.PI });
  }

  /** Where a hue's seat lies from its anchor: the unit OKLab direction and the distance in dE. */
  function rayOf(anchor, seat) {
    const [from, to] = [labOf(anchor), labOf(seat)];
    const v = [to.L - from.L, to.a - from.a, to.b - from.b];
    const length = Math.hypot(...v);
    return { direction: length > 0 ? v.map((x) => x / length) : [1, 0, 0], radius: length * 100 };
  }

  /**
   * The nearest SEAT for one role that clears checks, the others held where
   * they are: points on shells round its ANCHOR, of doubling radius, and on
   * the first shell that has any, every point that leaves the fewest checks
   * failing is taken back along its own direction to the least radius that
   * still clears as many, and the nearest of those is the seat. Every such
   * point rather than the first: on one shell they all cost the shell's
   * radius, so which of them is nearest is only known once each is walked
   * back, and the one a shell happened to list first is a random direction.
   * Round the anchor, not round where the role now is: a hue that went the
   * wrong way comes back the moment the others let it, instead of walking on
   * from its mistake. A red that must carry a white label and part from a
   * green is darker and a little bluer, and looking on a shell finds that
   * where walking one axis and then the next finds the first way out,
   * lighter, which sinks the label.
   *
   * To IMPROVE a hue, the seat found is then TURNED (below), and so is the
   * seat the hue already has when no shell holds a nearer one: a seat found
   * on a drawn direction is the nearest along that direction, not the
   * nearest there is.
   */
  function reseat(from, role, mode) {
    const anchor = anchorParams(role, from.values);
    let found = [];
    let inside = 0;
    let reach = 0;
    for (let radius = SHELL_FIRST; radius <= SHELL_LAST && !spent(); radius *= 2) {
      for (const params of around(role, anchor, radius)) {
        const candidate = measure(new Map(from.params).set(role.token, params));
        if (clears(candidate, from, mode)) found.push({ candidate, params });
      }
      if (found.length > 0) {
        reach = radius;
        break;
      }
      inside = radius;
    }
    const turns = mode === 'improve' && role.axes.length > 1;
    if (found.length === 0) {
      if (!turns) return null;
      const turned = turnSeat(from, role, anchor, from, mode);
      return turned === from ? null : turned;
    }
    const fewest = Math.min(...found.map(({ candidate }) => candidate.rank));
    found = found.filter(({ candidate }) => candidate.rank === fewest);
    const atAnchor = new Map(from.params).set(role.token, anchor);
    let best = null;
    for (const seat of found) {
      // Back along the point's own direction to the least radius that clears as many.
      let [low, high] = [inside / reach, 1];
      let kept = seat.candidate;
      for (let i = 0; i < 6 && !spent(); i += 1) {
        const t = (low + high) / 2;
        const candidate = measure(toward(atAnchor, role, seat.params, t));
        if (clears(candidate, from, mode) && candidate.rank <= kept.rank) [high, kept] = [t, candidate];
        else low = t;
      }
      if (best === null || better(kept, best)) best = kept;
    }
    return turns ? turnSeat(from, role, anchor, best, mode) : best;
  }

  /**
   * A hue's seat TURNED toward its anchor: the direction from the anchor to
   * the seat rotated REFINE_FIRST degrees each of four ways, and moved to
   * whichever clears nearer the anchor, until none does; then the same at
   * half the angle, down to REFINE_LAST. A seat on a smooth floor sits where
   * the floor is nearest the anchor, and rotating toward that point shortens
   * the walk back at every step, which drawing more directions only does by
   * chance.
   */
  function turnSeat(from, role, anchor, seat, mode) {
    const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const unitOf = (v) => v.map((x) => x / Math.hypot(...v));
    let best = seat;
    let { direction, radius } = rayOf(anchor, seat.params.get(role.token));
    for (let angle = REFINE_FIRST; angle >= REFINE_LAST && !spent(); angle /= 2) {
      const [cos, sin] = [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)];
      for (let turned = true; turned && !spent(); ) {
        turned = false;
        const across = unitOf(cross(direction, Math.abs(direction[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
        const sideways = cross(direction, across);
        for (const way of [across, across.map((x) => -x), sideways, sideways.map((x) => -x)]) {
          const next = nearestAlong(from, role, anchor, unitOf(direction.map((x, i) => x * cos + way[i] * sin)), radius, mode);
          if (next === null || !better(next, best)) continue;
          best = next;
          ({ direction, radius } = rayOf(anchor, best.params.get(role.token)));
          turned = true;
          break;
        }
      }
    }
    return best;
  }

  /** The least radius along one direction from a hue's anchor, up to `reach`, that clears, or null if even `reach` does not. */
  function nearestAlong(from, role, anchor, direction, reach, mode) {
    const at = (t) => measure(new Map(from.params).set(role.token, pointAt(role, anchor, direction, reach * t)));
    let kept = at(1);
    if (!clears(kept, from, mode)) return null;
    let [low, high] = [0, 1];
    for (let i = 0; i < REFINE_STEPS && !spent(); i += 1) {
      const t = (low + high) / 2;
      const candidate = at(t);
      if (clears(candidate, from, mode)) [high, kept] = [t, candidate];
      else low = t;
    }
    return kept;
  }

  /**
   * The next failing check a repair takes: one about a single role before one
   * about a pair, and in a seeded order within each. A check about one role is
   * a floor of that role's own (a mark too light for the frame, a label under
   * the text floor), and where it sends the role does not depend on anything
   * else; a separation between two roles does. Parted first, a pair is parted
   * from a place one of them is about to leave: the chart orange darkened to
   * clear a red that its own label then took darker still, and the light
   * palette ended with its warning fill stranded under 3:1, boxed in by
   * neighbours that had moved for hues that were not staying.
   */
  function nextCheck(checks) {
    const own = checks.filter((check) => about(check).length === 1);
    const pool = own.length > 0 ? own : checks;
    const check = pool[Math.floor(rng() * pool.length)];
    checks.splice(checks.indexOf(check), 1);
    return check;
  }

  /**
   * The seat that clears a check, and the most checks with it. The failing
   * checks are taken in the order nextCheck gives; for the first that a role
   * it is ABOUT can clear, each such role is reseated, and the seat leaving
   * the fewest checks failing is taken, the least dE breaking a tie. A seat
   * that breaks nothing is preferred to one that trades a failure for a
   * failure, which is only looked for when no check has one.
   */
  function repair(from, exclude = null, depth = 1) {
    const fixable = () => from.failures.filter((check) => about(check).some((token) => token !== exclude));
    for (const mode of ['clean', 'net']) {
      for (let checks = fixable(); checks.length > 0 && !spent(); ) {
        const check = nextCheck(checks);
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
      const check = nextCheck(checks);
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

  function repairAll(from, exclude = null, steps = Infinity, depth = 1) {
    let at = from;
    for (let i = 0; i < steps && at.rank > 0 && !spent(); i += 1) {
      const next = repair(at, exclude, depth);
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

  /**
   * Move one role anyway, repair what that breaks with the others, and walk
   * the partners back: the palette that leaves, clean, or null when what the
   * move broke could not all be repaired. Whether it is cheaper is the
   * caller's question, since a finish walking a trade toward the anchor keeps
   * a point that costs more to learn where the one that costs less lies.
   */
  function traded(role, params, partners, depth = 1) {
    let trial = repairAll(measure(params), role.token, 6, depth);
    if (trial.rank > 0) return null;
    for (const other of partners) trial = relax(trial, roles.get(other)) ?? trial;
    return trial;
  }

  /** A trade the design moves less for, or null. */
  function trade(from, role, params, partners = coupled.get(role.token)) {
    const trial = traded(role, params, partners);
    return trial !== null && cleanAndCheaper(trial, from) ? trial : null;
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

  /** One search from a palette: repair until nothing fails, then improve, until SEARCH_BUDGET is spent. */
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

  limit = SEARCH_BUDGET;

  // THE KIT'S STEPS ARE SEATED FIRST. A role anchored at another starts AT it,
  // offset zero, which is a point its own rule refuses by construction: a
  // press that is the hover, a hover that is the rest state. Repaired in turn
  // with everything else, such a step is often seated last, after every ink
  // and text step measured on it has been seated against the refused point,
  // and then it cannot move without breaking all of them at once: the light
  // palette ended with its pressed row still the hover, under inks that
  // cleared 4.5:1 on a press that could not ship. So before the search each
  // is seated where its own checks hold, whatever that breaks, and the design
  // is repaired around it; the objective still walks it back toward its
  // anchor as far as the floors let it.
  let seated = start;
  for (const role of order) {
    if (role.of === undefined) continue;
    for (const check of seated.failures) {
      if (!about(check).includes(role.token) || !seated.keys.has(keyOf(check))) continue;
      seated = reseat(seated, role, check) ?? seated;
    }
  }
  current = search(seated);
  const searched = evaluations;

  // --- the finish: until no move pays -----------------------------------------
  //
  // The search ends where its budget runs out, which is not where no move
  // helps: a role it pushed early can hold its neighbours further from the
  // design than they need to be, and a hue it seated on a drawn direction is
  // only as near its anchor as that direction allows. So the finish SETTLES
  // the palette, and then TRADES, and settles again after every trade it
  // keeps, until nothing it tries pays.
  //
  // To settle, every moved role is walked back toward its anchor (relax), and
  // a hue that cannot walk is reseated and turned (reseat), over and over
  // until none moves. A trade is dearer, a repair per step, so it is only
  // tried on a settled palette: for a lightness or alpha step its PROFILE
  // (below), for a hue its JOINT SEAT (below). Roles are taken the design's
  // own before the kit's and the dearest first, and none under FINISH_FLOOR:
  // an inset whose design is drawn in black where the kit's is drawn in its
  // own near-black is dE 0.01 away, and trading it against everything drawn
  // on it buys nothing.
  //
  // A role is tried again only once a role that HELD it has moved: one named
  // by, or moving the measurement of, a check that fails when it alone goes
  // back to its anchor. A move anywhere else leaves the checks that held it
  // as they were, so a try that found nothing would find nothing again.
  limit = searched + FINISH_CEILING;
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
   * A PROFILE of one lightness or alpha role: each offset along its axis out
   * to FINISH_REACH of its smallest step either way, each a trade that
   * repairs what the offset breaks and walks back the roles this one BINDS
   * (those whose check fails, back at their own anchor, on a measurement this
   * role moves), and the best of them. Every offset rather than a walk that
   * stops at the first one that does not pay, because the partners' walks
   * back land on whole hex steps: a hover a thousandth weaker can leave the
   * tertiary step on the same hex and cost more, where two thousandths weaker
   * takes it a step back and costs less. A side does stop at the first offset
   * whose breakage no repair clears, because the next one breaks as much
   * again. Its repairs do not look ahead: a trade that needs a chain of seats
   * is the search's to find.
   */
  function profile(role) {
    const axis = role.axes[0];
    const partners = boundBy(role);
    if (partners.length === 0) return null;
    let best = null;
    for (const sign of [-1, 1]) {
      for (let offset = 1; offset <= FINISH_REACH && !spent(); offset += 1) {
        const trial = traded(role, moved(current.params, role, axis, sign * offset * STEP[axis]), partners, LOOKAHEAD + 1);
        if (trial === null) break;
        if (cleanAndCheaper(trial, current) && (best === null || better(trial, best))) best = trial;
      }
    }
    return best;
  }

  /**
   * A hue's JOINT SEAT: nearer its anchor TOGETHER with the roles measured ON
   * it, each repaired as it moves. An ink is held to 4.5:1 on its own fill's
   * soft tint and on a code chip over that tint, so a fill that walks back
   * toward the design moves the ground its ink was seated on: the light
   * danger red, back at the design's hue and chroma and only as dark as its
   * floors need (#c11930), left its ink at 4.43:1 on the chip, and on its own
   * no seat of either was nearer than the maroon, #9c3a48, dE 15.19 off the
   * design, that the fit had ended it at. So the
   * points of the fill's shells, round its anchor as reseat's are, are taken
   * where every failing check is about another role and was measured on this
   * one, which is what a repair of those roles can clear. On the first shell
   * that has any, the JOINT_POINTS that fail the fewest are each traded and
   * walked back toward the anchor while the trade still repairs, and the
   * cheapest palette any step reaches is the seat, if the design moved less.
   */
  function jointSeat(from, role) {
    const anchor = anchorParams(role, from.values);
    const own = costOf(role, from.values);
    const partners = coupled.get(role.token);
    const measuredOn = (check) => {
      const tokens = (text) => [...text.matchAll(/--[a-z0-9-]+/g)].map(([token]) => owner(token));
      return !tokens(check.subject).includes(role.token) && tokens(check.detail).includes(role.token) && about(check).some((token) => token !== role.token);
    };
    const joint = (candidate) => candidate.rank < Infinity && candidate.failures.every(measuredOn);
    let inside = 0;
    for (let radius = SHELL_FIRST; inside < own && radius <= SHELL_LAST && !spent(); radius *= 2) {
      const points = around(role, anchor, radius)
        .map((params) => ({ params, plain: measure(new Map(from.params).set(role.token, params)) }))
        .filter(({ plain }) => joint(plain))
        .sort((a, b) => a.plain.rank - b.plain.rank)
        .slice(0, JOINT_POINTS);
      let best = null;
      for (const { params } of points) {
        if (spent()) break;
        const { direction } = rayOf(anchor, params);
        const at = (t) => new Map(from.params).set(role.token, pointAt(role, anchor, direction, radius * t));
        const step = (t) => (joint(measure(at(t))) ? traded(role, at(t), partners, LOOKAHEAD + 1) : null);
        const whole = step(1);
        if (whole === null) continue;
        let found = cleanAndCheaper(whole, from) ? whole : null;
        let [low, high] = [inside / radius, 1];
        for (let i = 0; i < JOINT_STEPS && !spent(); i += 1) {
          const t = (low + high) / 2;
          const trial = step(t);
          if (trial === null) {
            low = t;
            continue;
          }
          high = t;
          if (cleanAndCheaper(trial, from) && (found === null || better(trial, found))) found = trial;
        }
        if (found !== null && (best === null || better(found, best))) best = found;
      }
      if (best !== null) return best;
      inside = radius;
    }
    return null;
  }

  const finishing = () =>
    order
      .map((role) => ({ role, distance: distanceOf(role, current.values) }))
      .filter(({ distance }) => distance >= FINISH_FLOOR)
      .sort((a, b) => (a.role.kit === b.role.kit ? b.distance - a.distance : a.role.kit ? 1 : -1))
      .map(({ role }) => role);

  let kept = 0;
  const movedAt = new Map(order.map((role) => [role.token, 0]));
  const heldBy = new Map();
  const keep = (next) => {
    kept += 1;
    for (const role of order) if (next.values.get(role.token) !== current.values.get(role.token)) movedAt.set(role.token, kept);
    current = next;
  };
  const hold = (role) => {
    const restored = measure(toward(current.params, role, anchorParams(role, current.values), 1));
    heldBy.set(role.token, new Set([role.token, ...restored.failures.flatMap(mentioned).flatMap(lineage)]));
  };
  const due = (tried, role) =>
    !tried.has(role.token) || !heldBy.has(role.token) || [...heldBy.get(role.token)].some((token) => movedAt.get(token) > tried.get(role.token));

  const settledAt = new Map();
  function settle() {
    for (let moving = true; moving && !spent(); ) {
      moving = false;
      for (const role of finishing()) {
        if (spent()) break;
        if (!due(settledAt, role)) continue;
        settledAt.set(role.token, kept);
        const next = relax(current, role, 12) ?? (role.axes.length > 1 ? reseat(current, role, 'improve') : null);
        if (next === null) hold(role);
        else {
          keep(next);
          moving = true;
        }
      }
    }
  }

  const tradedAt = new Map();
  settle();
  for (let role; !spent() && (role = finishing().find((candidate) => due(tradedAt, candidate))) !== undefined; ) {
    tradedAt.set(role.token, kept);
    const next = role.axes.length > 1 ? jointSeat(current, role) : profile(role);
    if (next === null) hold(role);
    else {
      keep(next);
      settle();
    }
  }
  const finished = { evaluations: evaluations - searched, converged: !spent() };

  // --- what forced each move --------------------------------------------------

  const rows = order.map((role) => {
    const anchor = anchorOf(role, current.values);
    const value = current.values.get(role.token);
    const distance = distanceOf(role, current.values);
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
  return { name, rows, followers, start, current, searched, finished };
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

function print({ name, rows, followers, start, current, searched, finished }) {
  const out = [];
  const finish = finished.converged
    ? `the finish ran until no move paid, in ${finished.evaluations}`
    : `the finish STOPPED AT ITS CEILING of ${FINISH_CEILING} with moves still paying, so this is not a least move`;
  out.push(`The ${name} palette, fitted with seed ${SEED}: the search in ${searched} of ${SEARCH_BUDGET} evaluations, ${finish}.`);
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
