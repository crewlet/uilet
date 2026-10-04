/**
 * The palette's promises, recomputed from the stylesheets that ship.
 *
 * Every claim the token files make in their own comments is measured here, in
 * every theme state, over the composited surfaces a token can actually land
 * on. The point is not that the numbers are pretty: it is that an edit which
 * lowers one of them fails a build instead of shipping.
 *
 * This module is PUBLISHED, as `@crewlethq/tokens/test/palette`. The rule
 * table and the colour maths have one implementation and two callers: this
 * package's own suite, over the CSS it just built, and a consumer's suite,
 * over the version it installed. The owner's constraint is that the floors
 * are kept, not only that the measurement moves, and a tokens bump that
 * lowered a ratio would otherwise reach a consumer through an auto-merged
 * dependency update with nothing measuring a ratio again.
 *
 * Usage:
 *
 *   import { readFileSync } from 'node:fs';
 *   import { runPalette } from '@crewlethq/tokens/test/palette';
 *
 *   const dir = 'node_modules/@crewlethq/tokens/dist/css';
 *   const { failures } = runPalette({
 *     tokens: readFileSync(`${dir}/tokens.css`, 'utf8'),
 *     themes: readFileSync(`${dir}/themes.css`, 'utf8'),
 *   });
 *   expect(failures).toEqual([]);
 *
 * The two files are passed in IMPORT order, because they share the `:root`
 * selector: themes.css is imported second and is what paints.
 */

import { cascade, chroma, contrast, deltaE, flatten, parseBlocks, parseHex, separation, VISIONS, withAlpha } from './color.mjs';

export * from './color.mjs';

/** The alpha a soft tint is drawn at, and the one the build derives it with. */
export const SOFT_ALPHA = 0.12;

// ---------------------------------------------------------------------------
// The token names each rule reads
// ---------------------------------------------------------------------------

/**
 * Every opaque ground a piece of text can end up on: the four RUNGS.
 *
 *   frame        the application ground: the rail, and the body around the sheet
 *   background   the SHEET, the page content sits on
 *   subtle       the CARD: a card, a popover, a dialog body
 *   elevated     RAISED: a chip, a well, a key cap, a track, a lifted row
 *
 * This list is the whole point of the exercise. A text ramp anchored to the
 * panel it was designed against and then spent on a selected row inside a
 * dialog body is how a palette ships six steps under 4.5:1 without anybody
 * noticing.
 *
 * It is exported so a component suite measures on these grounds rather than
 * on a copy of them: six suites in @crewlethq/ui each kept a copy of their
 * own, and five of the six had already drifted from this list.
 */
export const OPAQUE_SURFACES = [
  '--color-surface-frame',
  '--color-surface-background',
  '--color-surface-subtle',
  '--color-surface-elevated',
];

/**
 * How far apart each rung sits from the one beneath it, in OKLab dE, and why.
 *
 * The four rungs are one ladder, and each step is held to what the step has
 * to do on its own:
 *
 * - THE SHEET OVER THE FRAME is the whole layering device: a content sheet
 *   floating inside the application ground. At dE 3, the floor this file holds
 *   every "can a reader notice it" difference to, the sheet reads as a
 *   separate plane; the approved dark sheet, #0c0e15, measured 2.96 and was
 *   nudged to clear it.
 * - A CARD OVER THE SHEET is deliberately near-flat, dE 1.5, because a card is
 *   found by its HAIRLINE rather than by its fill: a page of cards each lifted
 *   by dE 3 is a relief map. So the step comes with a second rule, and that is
 *   the one that carries the card: the plain border (CARD_HAIRLINE) has to be
 *   a line a reader can see, dE 3 against the card it bounds and against the
 *   sheet around it. That a card actually DRAWS that border is a component
 *   rule, held by the Card suite in @crewlethq/ui, because a palette cannot see
 *   a stylesheet.
 * - RAISED OVER THE CARD is a chip, a well or a key cap with no border of its
 *   own, so it is the fill alone that says it is there: dE 3.
 *
 * There is deliberately no rule between the card and the frame, or raised and
 * the sheet: nothing is drawn across two rungs at once, and a rule over a pair
 * nobody puts side by side is a floor that binds for no reason.
 */
export const RUNG_STEPS = [
  ['the sheet lifts off the frame', '--color-surface-background', '--color-surface-frame', 3],
  ['a card separates from the sheet', '--color-surface-subtle', '--color-surface-background', 1.5],
  ['raised separates from the card', '--color-surface-elevated', '--color-surface-subtle', 3],
];

/**
 * The line that finds a card, and the two grounds it runs between: the card
 * inside it and the sheet outside it. See RUNG_STEPS for why the card leans
 * on it.
 */
export const CARD_HAIRLINE = ['--color-border-default', '--color-surface-subtle', '--color-surface-background'];
export const HAIRLINE_DE = 3;

/**
 * A chip drawn on the raised rung inside the strong hairline, as [fill,
 * edge]: the neutral pill, and a key cap. Its fill IS raised, so on a raised
 * ground (a lead block, a raised card, the rail's current row) the fill alone
 * draws nothing, and what finds the chip is its edge. So the chip's boundary,
 * the fill or the edge, whichever stands further off its ground, is held to
 * HAIRLINE_DE on every ground it can land on: each opaque rung, and each
 * overlay a hovered, pressed or inset row composites onto one. A component
 * suite holds the chip to drawing this pair; this is what keeps a palette
 * from taking the edge away.
 */
export const RAISED_CHIP = ['--color-surface-elevated', '--color-border-strong'];

/**
 * THE OVERLAY STEPS HAVE TO BE SEEN, on every rung.
 *
 * A translucent overlay is one alpha on four grounds, and a stronger overlay
 * costs the tertiary text step contrast on the rungs it lightens or darkens
 * most. Left to that trade alone, the cheapest answer for the text is an
 * overlay nobody sees, and a light frame keeps asking for it: an overlay that
 * clears the sheet and the card can still sit under dE 3 on the frame. This
 * is the floor that stops it. A hovered row separates
 * from its rung by dE 3, and a pressed row from a hovered one by dE 3 more,
 * because dE 3 is the floor this file holds every "can a reader notice it"
 * difference to. The marketing root is exempt, as it is from the rungs.
 */
export const OVERLAY_STEPS = [
  ['a hovered row is visible on every rung', '--color-surface-hover', null],
  ['a pressed row is visible over a hovered one', '--color-surface-pressed', '--color-surface-hover'],
];
export const OVERLAY_DE = 3;

/**
 * The translucent overlays composited onto each ground. A hovered or pressed
 * row IS one of these, and so is an inset well.
 *
 * There is deliberately no hover-over-selected composite, and that is a RULE
 * rather than a gap: a row shows the selected tint or the hover overlay, never
 * both, because both are background-color on the same element and the selected
 * state wins.
 */
export const OVERLAYS = ['--color-surface-hover', '--color-surface-pressed', '--color-surface-inset'];

/** The neutral steps that carry a FACT, and the floor each clears. */
export const TEXT_STEPS = [
  ['--color-text-primary', 7],
  ['--color-text-secondary', 4.5],
  ['--color-text-tertiary', 4.5],
];

/** A hue used as TEXT on a surface. */
export const INK_STEPS = [
  '--color-brand-accent-ink',
  '--color-feedback-success-ink',
  '--color-feedback-warning-ink',
  '--color-feedback-danger-ink',
  '--color-feedback-info-ink',
];

/** A hue used as a MARK, or as a fill behind a label. */
export const FILL_STEPS = [
  '--color-brand-accent',
  '--color-feedback-success',
  '--color-feedback-warning',
  '--color-feedback-danger',
  '--color-feedback-info',
];

export const STATUS = [
  '--color-feedback-success',
  '--color-feedback-warning',
  '--color-feedback-danger',
  '--color-feedback-info',
];

/**
 * The chart series, in the order a figure assigns them: blue, orange, green
 * and yellow, the four the approved palette draws.
 *
 * FOUR, because four is what both floors below can hold at once. The shipped
 * four clear them with room (their tightest neighbours sit dE 20.6 apart under
 * normal vision), and a fifth would have to sit between two of them in a hue
 * budget the reserved red, the accent and a dichromat's collapse of red onto
 * green have already spent.
 */
export const DATA = ['--color-data-1', '--color-data-2', '--color-data-3', '--color-data-4'];

/**
 * How far apart two NEIGHBOURING series sit: dE 9 under every vision, and dE
 * 15 under normal vision on top of it.
 *
 * Neighbours, because a stacked bar, a legend and a line chart assign series
 * in order and only neighbours touch. The dichromat floor is the budget a
 * palette can afford once deuteranopia has folded red onto green; on its own
 * it let a pair sit dE 9 apart for EVERY reader, which to full-colour vision
 * is two shades of one hue rather than two series. The normal-vision floor is
 * the companion gate of the validated categorical method the design's four
 * hues come from: its worst adjacent pair clears dE 15 unsimulated, so a
 * reader who sees every colour is never the one left squinting at a legend.
 */
export const DATA_ADJACENT_DE = 9;
export const DATA_ADJACENT_NORMAL_DE = 15;

/**
 * A fill with the label a component paints on it: the primary action at rest,
 * under the pointer and pressed, the danger fill, and the inverse ground. The
 * label on every fill but the last is on-accent, which is white in every
 * palette, and each fill is measured over every ground it can sit on.
 */
export const LABEL_ON_FILL = [
  ['--color-text-on-accent', '--color-brand-accent'],
  ['--color-text-on-accent', '--color-brand-accent-hover'],
  ['--color-text-on-accent', '--color-brand-accent-active'],
  ['--color-text-on-accent', '--color-feedback-danger'],
  ['--color-text-on-accent', '--color-feedback-danger-hover'],
  ['--color-text-inverse', '--color-surface-inverse'],
];

/**
 * THE PRIMARY ACTION'S THREE FILLS, at rest, under the pointer and pressed,
 * each held against the one before it: [rule, the step, the fill it follows].
 *
 * The primary action IS the accent, in both palettes, and on a filled button
 * the fill is the whole of the feedback, so every step clears two things. It
 * is SEEN: ACTION_DE, the floor this file holds every "can a reader notice
 * it" difference to. And it moves AWAY from its label, which is ACTION_LABEL
 * on every fill: a hover or a press only ever gains contrast. A hover drawn as
 * brightness(1.08) is the step TOWARD a white label: on either accent it
 * takes white under the text floor (4.25:1 in dark, 4.19:1 in light) at the
 * moment a reader is about to press, which the label rule above catches. This
 * rule is what catches a step toward the label that still clears it: the
 * accent dulled at its own lightness reads as a step and keeps its label over
 * 4.5:1, and only its direction is wrong.
 *
 * The DESTRUCTIVE action is the other filled action, and it is held the same
 * way: a toast's destructive action is the danger fill under the same white
 * label, and its hover is --color-feedback-danger-hover. The danger fill is
 * fitted from the design's stopped red and the design draws no hover for it,
 * so this rule is what decides where its hover goes, as it decides the
 * accent's: a step a reader can see, away from the label.
 */
export const ACTION_STEPS = [
  ['a hovered primary action is a visible step away from its label', '--color-brand-accent-hover', '--color-brand-accent'],
  [
    'a pressed primary action is a visible step past a hovered one',
    '--color-brand-accent-active',
    '--color-brand-accent-hover',
  ],
  [
    'a hovered destructive action is a visible step away from its label',
    '--color-feedback-danger-hover',
    '--color-feedback-danger',
  ],
];
export const ACTION_LABEL = '--color-text-on-accent';
export const ACTION_DE = 3;

/** The ten seeded avatar grounds, each carrying white initials. */
export const AVATAR_TINTS = Array.from({ length: 10 }, (_, i) => `--color-avatar-tint-${i}`);

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

/**
 * The application rail, and every pair it paints on its own grounds.
 *
 * The rail stands on the FRAME rather than on the sheet, which no other
 * column of text does. Its rows have three grounds: the frame itself, the
 * frame under the hover overlay, and RAISED for the row the reader is on
 * (RAIL_CURRENT_ROW). The badge, a count of what is waiting on the reader, is
 * the one hue in it, an opaque accent fill carrying the on-accent label; a
 * project's key chip is the raised rung inside the plain hairline, carrying
 * the secondary ink, on every row alike.
 *
 * WHAT THIS TABLE IS, HONESTLY. Every ink in it is also reached by a rule
 * above, which measures the same composites over every rung: the text steps
 * over the overlays on the frame, the focus ring over raised, the on-accent
 * label on the accent fill. So none of these can fail on its own. What it is,
 * is the MAP from what the rail paints to the ground it lands on, which the
 * SidebarNav suite in @crewlethq/ui reads the stylesheet's own pairs against,
 * so a rail that spent a token nobody measured there says so by name. The
 * rules the table cannot reach are the current row's own, below.
 */
export const RAIL_GROUND = '--color-surface-frame';

/**
 * The row the reader is on, as [fill, hairline]: raised, with the plain
 * border drawn round it INSIDE the row, and the primary ink.
 *
 * It is found the way a card is found. Its fill is allowed to be near-flat on
 * the frame, RAIL_CURRENT_LIFT, because in light raised is only dE 1.93 off
 * the frame (the design draws it there); what carries the row is the
 * hairline, held to HAIRLINE_DE against the fill it is drawn on. The hairline
 * is also what tells the current row from a HOVERED one, which draws none: a
 * hover overlay strong enough to be seen on the frame can lift it close to
 * raised, and nothing else keeps the two apart.
 *
 * It used to be the accent's own soft tint with the label in the accent ink.
 * The accent is the primary action's fill now, so a violet row in the rail
 * would read as a second primary on every screen, beside the one the screen
 * actually asks for; where the reader is, is the row's position, its lift and
 * its line.
 */
export const RAIL_CURRENT_ROW = ['--color-surface-elevated', '--color-border-default'];
export const RAIL_CURRENT_LIFT = 1.5;

/** The three grounds a row in the rail can have, over that ground. */
export const RAIL_ROWS = [
  ['a row', null],
  ['a hovered row', '--color-surface-hover'],
  ['the row the reader is on', RAIL_CURRENT_ROW[0]],
];

/**
 * What the rail paints: the ink, the fill it is drawn on (null for the row's
 * own ground), which rows carry it, and the floor it clears.
 *
 * The glyph has no entry of its own: it is drawn in the row's colour on
 * every row, at rest as much as pointed or current, so each label entry below
 * is the glyph's too. A resting row is the secondary step, as the approved
 * design draws it, and a hovered or current one lifts to the primary.
 */
export const RAIL_PAINTS = [
  ["a row's label and glyph", '--color-text-secondary', null, ['a row'], 4.5],
  ['a hovered row, label and glyph', '--color-text-primary', null, ['a hovered row'], 4.5],
  ['the current row, label, glyph and count', '--color-text-primary', null, ['the row the reader is on'], 4.5],
  ['a group label and its action, a count, a foot row', '--color-text-tertiary', null, ['a row', 'a hovered row'], 4.5],
  [
    "a project's key chip",
    '--color-text-secondary',
    '--color-surface-elevated',
    ['a row', 'a hovered row', 'the row the reader is on'],
    4.5,
  ],
  [
    'the badge, what is waiting on the reader',
    '--color-text-on-accent',
    '--color-brand-accent',
    ['a row', 'a hovered row', 'the row the reader is on'],
    4.5,
  ],
  ['the focus ring', '--color-focus', null, ['a row', 'a hovered row', 'the row the reader is on'], 3],
];

/**
 * The label a component draws ON THE SCRIM, and every ground the scrim itself
 * can land on.
 *
 * The scrim is the one ground in the palette that is not a surface step: it is
 * a wash over whatever is already there, so the pair a reader sees depends on
 * what that was. An upload overlay puts a word on it over an identity badge,
 * which is a seeded tint or the initials tile on whichever surface the form
 * sits on, and the tints are not reachable from the surface list. Every ground
 * here is measured because the shallowest one is what sets the number: a 60
 * percent black over a white page is much lighter than the same wash over a
 * dark tint.
 *
 * The accent's fill is not one of them. It was, while a badge could be filled
 * with it; @crewlethq/ui's Avatar has no such tone any more (a SELECTED badge
 * is a ring round a neutral one), so it would be a composite nothing draws.
 */
export const SCRIM_GROUNDS = [...AVATAR_TINTS];

// The controls
// ---------------------------------------------------------------------------

/**
 * The segmented row, which is the one CONTROL that paints a tint on a tint.
 *
 * Its container is the inset well and the option that is on is lifted off it
 * with the card surface, so the label of the chosen answer sits on a
 * composite of two overlays rather than on a ground any other rule reaches.
 * It is the label a reader looks for first in the row, so it is held to the
 * primary step's own floor rather than to the 4.5 a fact needs.
 *
 * The resting options are not listed: their ink is the tertiary step on the
 * well alone, which is a plain overlay composite the text rule already
 * measures over every ground.
 *
 * WHAT THIS RULE DOES NOT CLAIM, and the next reader should not assume: that
 * the chip's own FACE is separable from the well it sits in. It is not, on
 * every ground. The face is the card surface and the well is the inset
 * overlay, and on the sheet those land dE 1.17 apart in dark (3.61 in light)
 * and inside a card 2.89 (1.83 in light), against a floor of 3 elsewhere in
 * this file; only on the raised rung are they 5.84 and 5.40 apart. So a
 * segmented row is drawn on the product's own page exactly as it is at
 * :8020, and which option is on is read there from the INK step, primary
 * against tertiary, and from the chip's shadow. Both inks
 * are measured, which is why this holds the on label to the primary floor
 * rather than to the 4.5 a fact needs. A restyle that flattened the two ink
 * steps together would take the last thing saying which option is on.
 */
export const CONTROL_WELL = '--color-surface-inset';
export const CONTROL_CHIP = '--color-surface-subtle';

/**
 * The destructive button's face, and what its hover has to do on it.
 *
 * The button states itself in its INK and takes the hue only under the
 * pointer, so the hover tint IS the whole of the feedback: a reader who
 * cannot see it has no signal that the control under the pointer is the one
 * that deletes. Both of its inks are measured elsewhere (the danger ink on
 * the panel, and on its own soft tint), so what is left to measure is that
 * the tint is separable from the face it replaces at all.
 */
export const DESTRUCTIVE_FACE = '--color-surface-subtle';

// The veil
// ---------------------------------------------------------------------------

/**
 * The ground a modal surface sits on, and the one overlay in the palette that
 * covers the WHOLE PAGE rather than a component.
 *
 * Every other translucent step here is composited UNDER something a component
 * draws: a hovered row, a soft tint behind a badge. The veil is composited over
 * everything already on the page, so what it changes is not a component's ink
 * but whether the page behind a dialog is still a page. Nothing measured that,
 * and the alpha is the only thing deciding it.
 *
 * It is a BAND rather than a floor, for the same reason --color-text-muted is:
 * both ends are real failures and only one of them looks like one. Too little
 * and the page keeps reading as something to act on, competing with the
 * surface that just took the keyboard; too much and the veil is a scrim, the
 * page is gone, and an operator loses the place they were keeping. The
 * measurement is the page's OWN primary text seen through the veil, against the
 * veiled ground beside it, because that is the strongest thing the page has.
 *
 * The upper bound is the 3:1 mark floor: below it, nothing behind the surface
 * reads as a thing a reader could use. The lower bound is 1.5:1, which is where
 * a large dark heading stops being perceptible at all.
 */
export const VEIL = '--color-surface-veil';
export const VEIL_BAND = [1.5, 3];

/**
 * The ground the veil is drawn in, and the alpha it is drawn at: the only
 * number the veil is free to choose.
 *
 * Its COLOUR is not free: a veil is the application seen through less of
 * itself, so it is each root's own FRAME at this alpha and never a hue of its
 * own. The frame rather than the sheet because the veil covers the whole
 * window, the rail as well as the sheet, and the frame is the ground both of
 * them stand on: the application recedes into its own ground rather than
 * under a film of its page. A veil that is a different colour from what is
 * under it is a wash laid over it, which moves every ground behind it
 * somewhere the ink steps were never measured against, and it does it in the
 * one state where a reader cannot tell a rendering fault from a design.
 *
 * 0.65 is the least alpha that brings every root into the band: the marketing
 * root, near-white on black, needs it before its brightest composite comes
 * under the 3:1 ceiling, and the approved palette draws its veil at it in both
 * themes. At 0.65 dark measures 2.56:1 to 2.76:1, light 2.18:1 to 2.29:1 and
 * the marketing root 2.75:1 to 2.93:1. A light veil drawn as a dark wash
 * instead leaves the light page's text readable through it: a page nobody has
 * faded at all.
 */
export const VEIL_GROUND = '--color-surface-frame';
export const VEIL_ALPHA = 0.65;

// The data surfaces
// ---------------------------------------------------------------------------

/**
 * The MARKS a table, a tree and a chart draw, on every ground a row can have.
 *
 * `FILL_STEPS` above measures a mark on the OPAQUE surfaces and stops there,
 * which is right for a badge and wrong for a row: a row is the panel it sits
 * on, OR that panel under the hover overlay, OR that panel under the accent
 * tint when it is the row the reader is on. A mark painted on the last of
 * those is the case nothing was measuring, and it is exactly the row that most
 * needs one: the row that is both selected and broken. The danger FILL measured
 * 2.86:1 there in dark on a card and 2.65:1 on the elevated step, under the 3:1
 * a graphical object has to clear, so the leading rail on that row could not be
 * seen at all. The other two tones cleared it (the tightest is the warning fill
 * at 3.58:1), and all three move to the ink step together: which tone a row
 * carries is not a reason for its rail to be drawn to a different floor, and a
 * rule that held for two of three is a rule nobody can state. The ink steps are
 * what those rails take now, and this is where they are held.
 *
 * Each entry is what the mark is, the token, which grounds it can land on, and
 * the floor it clears. "every row ground" is all three; "a row at rest" is the
 * opaque surfaces alone, for a mark that is only ever drawn on a row that has
 * no tint of its own (a treegrid row carries its selection AS the rail, so the
 * rail and the tint are never both there).
 *
 * WHAT THIS TABLE IS, HONESTLY. Every entry here is also reached by a rule
 * above it: the ink steps by "ink step clears 4.5:1 as text", which measures
 * the same composites to a HIGHER floor, the accent by the fill-step rule and
 * the control boundary by its own. So none of these can fail on its own, and
 * this table is not what would catch a regression in a token. What it is, is
 * the MAP from a mark a data surface draws to the ground it actually lands
 * on, written down where the next person choosing a token for a rail will
 * look: the rails were fill steps because nobody had written that a row is
 * sometimes the accent tint. The guard that catches the component putting a
 * fill step back is `a rail drawn on a row takes an ink step` in
 * @crewlethq/ui's DataTable suite, and it is the one with teeth.
 */
export const DATA_MARKS = [
  ["a row's leading state rail", '--color-feedback-danger-ink', 'every row ground', 3],
  ["a row's leading state rail", '--color-feedback-warning-ink', 'every row ground', 3],
  ["a row's leading state rail", '--color-feedback-info-ink', 'every row ground', 3],
  ["a selected row's rail, and a selected card's ring", '--color-brand-accent', 'a row at rest', 3],
  ["a chart's connector between two cards", '--color-border-control', 'a row at rest', 3],
];

/**
 * The one mark in these surfaces that is drawn at an OPACITY rather than at a
 * step of its own: the sort arrow in a table's header, which is the only thing
 * saying a column can be sorted at all and therefore has to stay resolvable.
 *
 * It is the header's own ink, faded, so it cannot be looked up in the palette:
 * the alpha is part of the colour. Measured here because the alternative is a
 * number in a stylesheet comment that nothing recomputes, which is what it was.
 */
export const SORT_MARK_ALPHA = 0.7;

/** Every shadow step. Each has to be declared in BOTH theme blocks. */
export const SHADOW_STEPS = [
  '--shadow-xs',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-2xl',
  '--shadow-card',
  '--shadow-rim-lit',
  '--shadow-hairline',
  '--shadow-focus',
  '--shadow-selection',
  '--shadow-glow',
];

// Two cross-family rules, and both protect a RESERVED meaning from being
// claimed by another family: nothing may read as the accent, which is what to
// act on and what is chosen, and no series may read as the danger red. Their
// dichromat floors are lower than the within-family ones because the hue
// budget is finite (nine hues, the accent, four states and four series, in a
// space deuteranopia collapses to blue, yellow and lightness) and because
// across families colour is never the only signal: a Tag always renders its
// label, a status Callout always renders its glyph, a series is named by its
// legend, and the accent appears only as position. They are floors, not
// targets, and every measured value is reported so a later edit shows its cost.
//
// No floor here is about a CATEGORY. A phase, a unit or a model is drawn in the
// neutral colour with its word, and inside a figure as the series its legend
// names, so no category family spends this budget. The phase family did: three
// hues held apart from each other, from the four states and from the accent,
// which is three hues fewer for everything that carries a meaning.
const ACCENT_NORMAL = 10;
const ACCENT_DICHROMAT = 8;
// The reserved red keeps the highest normal floor of any cross-family pair,
// because it is the one hue that means the same thing everywhere in a product,
// and the accent's dichromat floor. Red, orange and green fall onto one axis
// for a dichromat, so this is the floor the chart's orange and aqua spend the
// most on: the approved green sat dE 6.79 from the approved red under
// deuteranopia in dark and 2.30 in light, and the approved orange 11.39 from
// it under normal vision in dark. The fit moves the red darker, because it had
// to darken for its white label anyway, and turns the green toward aqua, which
// takes it off the axis the red falls on.
const DANGER_NORMAL = 14;
const DANGER_DICHROMAT = 8;

// ---------------------------------------------------------------------------
// Theme states
// ---------------------------------------------------------------------------

// The theme layer is DARK FIRST: the dark palette is the bare :root, and light
// is painted over it by two blocks, one for a system that asks for light and
// one for an explicit choice. There is no dark attribute block, because the
// bare root already is one; the media block's :not() is what lets an explicit
// dark beat a light system.
const THEME_ROOT = ':root';
const LIGHT_MEDIA = '@media (prefers-color-scheme: light)';
const LIGHT_MEDIA_SELECTOR = ':root:not([data-theme="dark"])';
const LIGHT_ATTRIBUTE_SELECTOR = ':root[data-theme="light"]';

/**
 * The two sheets, each parsed ONCE, as sources cascade() reads. A measurement
 * reads four states and three theme blocks out of them, and parsing both
 * sheets over again for every read was most of what a runPalette call cost,
 * which scripts/fit-palette.mjs makes tens of thousands of.
 */
const sheetsOf = ({ tokens, themes }) => ({
  tokens: { name: 'tokens.css', blocks: parseBlocks(tokens) },
  themes: { name: 'themes.css', blocks: parseBlocks(themes) },
});

/** The theme file's three blocks, each on its own, as the file declares it. */
function themeBlocks(themesSource) {
  const block = (atRule, selector) => cascade([themesSource], (b) => b.atRule === atRule && b.selector === selector);
  return {
    dark: block(null, THEME_ROOT),
    lightMedia: block(LIGHT_MEDIA, LIGHT_MEDIA_SELECTOR),
    lightAttribute: block(null, LIGHT_ATTRIBUTE_SELECTOR),
  };
}

/**
 * The four sets of values a browser can end up with.
 *
 * `base` is tokens.css on its own, which is what an application that imports
 * only the token layer paints: the marketing palette. The other three are what
 * the theme layer paints over it: `dark`, the bare root, which is what a
 * document that sets nothing gets and what an explicit dark gets on either
 * system; and light twice over, once by the media query and once by the
 * attribute, because they are two declarations a browser reaches by two
 * different routes and either can drift from the other.
 */
export function paletteStates(sources) {
  return statesOf(sheetsOf(sources));
}

/** paletteStates over sheets already parsed, which runPalette shares with the structural rules. */
function statesOf(sheets) {
  const tokensOnly = [sheets.tokens];
  const both = [...tokensOnly, sheets.themes];
  const bare = (block) => block.atRule === null && block.selector === THEME_ROOT;
  const dark = cascade(both, bare);
  const withLight = (selector, atRule) =>
    new Map([...dark, ...cascade(both, (block) => block.atRule === atRule && block.selector === selector)]);
  return {
    base: cascade(tokensOnly, bare),
    dark,
    'light (media query)': withLight(LIGHT_MEDIA_SELECTOR, LIGHT_MEDIA),
    'light (attribute)': withLight(LIGHT_ATTRIBUTE_SELECTOR, null),
  };
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

function surfacesOf(values) {
  const ground = resolve(values, '--color-surface-background');
  const opaque = OPAQUE_SURFACES.map((name) => [name, flatten(values.get(name), ground)]);
  const all = [...opaque];
  for (const overlay of OVERLAYS) {
    for (const [name, rgb] of opaque) all.push([`${overlay} on ${name}`, flatten(values.get(overlay), rgb)]);
  }
  for (const [name, rgb] of opaque) {
    all.push([`--color-brand-accent-soft on ${name}`, flatten(values.get('--color-brand-accent-soft'), rgb)]);
  }
  return { ground, opaque, all };
}

function resolve(values, name, ground) {
  const raw = values.get(name);
  if (raw === undefined) throw new Error(`token ${name} has no value`);
  const rgb = parseHex(raw) ?? (ground ? flatten(raw, ground) : null);
  if (!rgb) throw new Error(`token ${name} is "${raw}", which is not a colour this rule can measure`);
  return rgb;
}

/**
 * Run every rule over one state's values.
 * `profile` is 'full' for a theme, or 'base' for the marketing root, which is
 * exempt from the separation, rail, overlay and rung rules: its one pure black
 * ground and its single brand hue are a deliberate marketing look rather than
 * a product palette.
 */
function checkState(state, values, profile, push) {
  const { ground, opaque, all } = surfacesOf(values);
  const colour = (name) => resolve(values, name, ground);
  const worst = (rgb, list) =>
    list.reduce((low, [name, surface]) => {
      const ratio = contrast(rgb, surface);
      return ratio < low.ratio ? { ratio, name } : low;
    }, { ratio: Infinity, name: '' });
  const say = (rule, ok, subject, value, detail) => push({ state, rule, ok, subject, value, detail });

  for (const [name, floor] of TEXT_STEPS) {
    const low = worst(colour(name), all);
    say('text step clears its floor', low.ratio >= floor, name, low.ratio, `${low.ratio.toFixed(2)}:1 >= ${floor} (worst on ${low.name})`);
  }

  {
    // It exists for a hairline glyph and a disabled affordance. The assertion
    // is that it stays BELOW the fact floor: a step that quietly crept up to
    // 4.5 would invite itself into a table cell, which is the whole failure
    // the separate name prevents. And that it stays ABOVE the band's floor on
    // the three grounds a glyph beside its word is drawn on: the frame (the
    // rail and the drawer), the sheet and a card. Raised is not one of them:
    // it is a chip's or a well's fill, and what a chip carries is its label.
    for (const [name, surface] of opaque.filter(([rung]) => rung !== '--color-surface-elevated')) {
      const ratio = contrast(colour('--color-text-muted'), surface);
      say('text-muted is decoration', ratio > 2.8 && ratio < 4.5, '--color-text-muted', ratio, `2.8 < ${ratio.toFixed(2)}:1 < 4.5 on ${name}`);
    }
  }

  for (const name of INK_STEPS) {
    const low = worst(colour(name), all);
    say('ink step clears 4.5:1 as text', low.ratio >= 4.5, name, low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  // An ink on its OWN soft tint: a badge, a callout, a diff line. The tint is
  // recomputed from the fill here rather than read from the token, so a
  // hand-edited tint that no longer belongs to its fill fails.
  for (const fill of STATUS) {
    const { r, g, b } = colour(fill);
    const tints = opaque.map(([name, rgb]) => [
      `${fill} soft on ${name}`,
      flatten(`rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${SOFT_ALPHA})`, rgb),
    ]);
    const low = worst(colour(`${fill}-ink`), tints);
    say('ink clears 4.5:1 on its own soft tint', low.ratio >= 4.5, `${fill}-ink`, low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);

    // AND ON THE INSET WELL DRAWN OVER THAT TINT. An InlineCode chip inside a
    // Callout keeps the chip's own ground and takes only the message's ink,
    // which is what stops a calm grey identifier sitting in the middle of an
    // alarming sentence. That puts a status ink on a THIRD ground: the
    // overlay composited onto the soft tint composited onto the page. Neither
    // of the two rules above measures it, and the chip is the one place in a
    // callout where a reader has to make out an exact string.
    const chips = tints.map(([name, rgb]) => [
      `the inset chip on ${name}`,
      flatten(values.get('--color-surface-inset'), rgb),
    ]);
    const chip = worst(colour(`${fill}-ink`), chips);
    say('ink clears 4.5:1 on a code chip inside its own callout', chip.ratio >= 4.5, `${fill}-ink`, chip.ratio, `${chip.ratio.toFixed(2)}:1 (worst on ${chip.name})`);
  }

  for (const name of [...FILL_STEPS, ...DATA, '--color-data-other', '--color-brand-mark']) {
    const low = worst(colour(name), opaque);
    say('fill step clears 3:1 as a mark', low.ratio >= 3, name, low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  for (const [label, fill] of LABEL_ON_FILL) {
    // Measured over every ground the fill can sit on, so a translucent fill
    // is measured as the composite a reader sees. None is today; the
    // monochrome primary this list used to carry had two.
    const low = worst(colour(label), opaque.map(([name, rgb]) => [`${fill} on ${name}`, flatten(values.get(fill), rgb)]));
    say('a label clears 4.5:1 on its own fill', low.ratio >= 4.5, `${label} on ${fill}`, low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  // THE PRIMARY ACTION'S STEPS. See ACTION_STEPS.
  for (const [rule, step, from] of ACTION_STEPS) {
    const label = colour(ACTION_LABEL);
    const [was, now] = [colour(from), colour(step)];
    const measured = deltaE(now, was);
    const gain = contrast(label, now) - contrast(label, was);
    say(
      rule,
      measured >= ACTION_DE && gain > 0,
      `${step} after ${from}`,
      measured,
      `dE ${measured.toFixed(2)} >= ${ACTION_DE}, and ${ACTION_LABEL} ${contrast(label, was).toFixed(2)}:1 -> ${contrast(label, now).toFixed(2)}:1 rises`,
    );
  }

  for (const name of AVATAR_TINTS) {
    const ratio = contrast(parseHex('#ffffff'), colour(name));
    say('an avatar tint clears 4.5:1 under white initials', ratio >= 4.5, name, ratio, `${ratio.toFixed(2)}:1`);
  }

  {
    // A word on the scrim. The scrim is a wash rather than a surface, so the
    // composite is taken over every ground it can be drawn on rather than read
    // from a token: an upload overlay's label sits on the scrim over an
    // identity badge, and the badge is a seeded tint or an initials tile on
    // whichever surface the form is on.
    const label = colour('--color-text-on-accent');
    const scrim = values.get('--color-surface-scrim');
    const over = [...opaque, ...SCRIM_GROUNDS.map((name) => [name, colour(name)])];
    const low = worst(label, over.map(([name, rgb]) => [`the scrim over ${name}`, flatten(scrim, rgb)]));
    say('a label on the scrim clears 4.5:1', low.ratio >= 4.5, '--color-text-on-accent', low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  {
    // Every surface the ring can be drawn on, the SELECTED tint included.
    //
    // An outset ring around a selected row does sit on the row's own ground
    // rather than on its tint, which is why this composite was left out once.
    // But --size-focus-ring-inset-offset exists precisely because a focusable
    // row inside a clipping scroller has to draw its ring INSIDE its own box,
    // where an outset one is clipped on the first and last rows and painted
    // over by the next; and a tree row or a grid row is the commonest row in a
    // product to be both focused and selected. So the tint is a ground the
    // ring lands on, and the rule measures it.
    const low = worst(colour('--color-focus'), all);
    say('the focus ring clears 3:1', low.ratio >= 3, '--color-focus', low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  {
    // THE SEGMENTED ROW, chip on well on ground. See CONTROL_WELL.
    for (const [name, rgb] of opaque) {
      const well = flatten(values.get(CONTROL_WELL), rgb);
      const chip = flatten(values.get(CONTROL_CHIP), well);
      const ratio = contrast(colour('--color-text-primary'), chip);
      say(
        "the segmented chip's label clears the primary floor on its own well",
        ratio >= 7,
        `--color-text-primary on the chip over ${name}`,
        ratio,
        `${ratio.toFixed(2)}:1 >= 7`,
      );
    }

    // THE DESTRUCTIVE BUTTON'S HOVER. See DESTRUCTIVE_FACE. dE 3 is the same
    // floor the selected tint is held to against a hovered row: below it a
    // colour difference is not one a reader can be relied on to notice.
    for (const [name, rgb] of opaque) {
      const face = flatten(values.get(DESTRUCTIVE_FACE), rgb);
      const tint = flatten(values.get('--color-feedback-danger-soft'), face);
      const measured = deltaE(tint, face);
      say(
        "the destructive button's hover is visible on its own face",
        measured >= 3,
        `--color-feedback-danger-soft on ${name}`,
        measured,
        `dE ${measured.toFixed(2)} >= 3`,
      );
    }

    // THE VEIL, on every ground it can be drawn over. See VEIL.
    const [floor, ceiling] = VEIL_BAND;
    const veil = values.get(VEIL);
    const own = withAlpha(values.get(VEIL_GROUND), VEIL_ALPHA);
    say(
      "the veil is this root's frame at an alpha, not a colour of its own",
      veil === own,
      VEIL,
      VEIL_ALPHA,
      `"${veil}" is the root's own frame at ${VEIL_ALPHA} ("${own}")`,
    );
    const ink = flatten(veil, colour('--color-text-primary'));
    for (const [name, rgb] of opaque) {
      const ratio = contrast(ink, flatten(veil, rgb));
      say(
        'the veil leaves the page as context and no more',
        ratio > floor && ratio < ceiling,
        `${VEIL} over ${name}`,
        ratio,
        `${floor} < ${ratio.toFixed(2)}:1 < ${ceiling} (the page's own primary text, veiled)`,
      );
    }

    // THE MARKS A TABLE, A TREE AND A CHART DRAW. See DATA_MARKS.
    const atRest = opaque;
    const everyRow = [
      ...opaque,
      ...opaque.flatMap(([name, rgb]) => [
        [`a hovered ${name}`, flatten(values.get('--color-surface-hover'), rgb)],
        [`a selected ${name}`, flatten(values.get('--color-brand-accent-soft'), rgb)],
      ]),
    ];
    for (const [what, mark, where, floor] of DATA_MARKS) {
      const low = worst(colour(mark), where === 'every row ground' ? everyRow : atRest);
      say(
        'a mark on a data surface clears its floor on every ground it lands on',
        low.ratio >= floor,
        `${mark} on ${where}`,
        low.ratio,
        `${low.ratio.toFixed(2)}:1 >= ${floor} (${what}, worst on ${low.name})`,
      );
    }
    // The sort arrow, which is the header's own ink faded rather than a step.
    // The header band is the panel surface, which is the only ground it has.
    const band = flatten(values.get('--color-surface-subtle'), ground);
    const sortInk = colour('--color-text-tertiary');
    const faded = {
      r: sortInk.r * SORT_MARK_ALPHA + band.r * (1 - SORT_MARK_ALPHA),
      g: sortInk.g * SORT_MARK_ALPHA + band.g * (1 - SORT_MARK_ALPHA),
      b: sortInk.b * SORT_MARK_ALPHA + band.b * (1 - SORT_MARK_ALPHA),
    };
    const ratio = contrast(faded, band);
    say(
      "a table's sort arrow stays resolvable at the alpha it is drawn with",
      ratio >= 3,
      `--color-text-tertiary at ${SORT_MARK_ALPHA}`,
      ratio,
      `${ratio.toFixed(2)}:1 >= 3 on the header band`,
    );
  }

  if (profile !== 'full') return;

  {
    // THE RAIL, on its own ground and on its own row tints. See RAIL_GROUND.
    const rail = flatten(values.get(RAIL_GROUND), ground);
    const rows = new Map(RAIL_ROWS.map(([name, tint]) => [name, tint === null ? rail : flatten(values.get(tint), rail)]));
    for (const [what, ink, tint, on, floor] of RAIL_PAINTS) {
      for (const row of on) {
        const under = rows.get(row);
        const surface = tint === null ? under : flatten(values.get(tint), under);
        const ratio = contrast(colour(ink), surface);
        say(
          "the rail's ink clears its floor on the row's own tint",
          ratio >= floor,
          `${ink} on ${row}`,
          ratio,
          `${ratio.toFixed(2)}:1 >= ${floor} (${what})`,
        );
      }
    }
    // THE ROW THE READER IS ON, found as a card is. See RAIL_CURRENT_ROW.
    const [fill, line] = RAIL_CURRENT_ROW;
    const current = rows.get('the row the reader is on');
    const lift = deltaE(current, rail);
    say(
      "the rail's current row lifts off the rail",
      lift >= RAIL_CURRENT_LIFT,
      `${fill} on ${RAIL_GROUND}`,
      lift,
      `dE ${lift.toFixed(2)} >= ${RAIL_CURRENT_LIFT}`,
    );
    const drawn = deltaE(flatten(values.get(line), current), current);
    say(
      "the hairline round the rail's current row is visible on it",
      drawn >= HAIRLINE_DE,
      `${line} on ${fill}`,
      drawn,
      `dE ${drawn.toFixed(2)} >= ${HAIRLINE_DE}`,
    );
  }

  for (const [set, floor, normal, adjacent, rule] of [
    [STATUS, 10, 10, false, 'status hues stay separable'],
    [DATA, DATA_ADJACENT_DE, DATA_ADJACENT_NORMAL_DE, true, 'adjacent data hues stay separable'],
  ]) {
    // ADJACENT, not every pair, for the data ramp: a legend reader
    // distinguishes series 2 from series 3 because they sit next to each
    // other, and demanding every pair be far apart is what forces a palette
    // to spread until it is ugly. Its second floor is the normal-vision one;
    // see DATA_ADJACENT_NORMAL_DE.
    const pairs = adjacent
      ? set.slice(0, -1).map((name, i) => [name, set[i + 1]])
      : set.flatMap((name, i) => set.slice(i + 1).map((other) => [name, other]));
    const floors = normal > floor ? `${normal} normal, ${floor} every vision` : `${floor}`;
    for (const [a, b] of pairs) {
      const measured = separation(colour(a), colour(b));
      const ok = Math.min(...measured) >= floor && measured[0] >= normal;
      say(rule, ok, `${a} vs ${b}`, Math.min(...measured), `dE ${describe(measured)} >= ${floors}`);
    }
  }

  // Red means "this broke" everywhere in a product. A chart series that
  // happens to be red says so too, to a reader who is scanning for it, and
  // THAT READER IS OFTEN THE DICHROMAT ONE: red and green collapse onto one
  // axis for them, so a chart's aqua or orange series is the likeliest thing
  // in the whole palette to be read as failure. Measured under normal vision
  // alone this rule once passed at dE 24.0 while a green fourth series sat 6.0
  // from the danger red under deuteranopia.
  for (const name of DATA) {
    const measured = separation(colour(name), colour('--color-feedback-danger'));
    const ok = measured[0] >= DANGER_NORMAL && Math.min(measured[1], measured[2]) >= DANGER_DICHROMAT;
    say('no data hue collides with danger', ok, name, Math.min(...measured), `dE ${describe(measured)} >= ${DANGER_NORMAL} normal, ${DANGER_DICHROMAT} dichromat`);
  }

  // "The accent is the most saturated hue" was a rule once, and was dropped
  // when danger, both outer phase hues and two data hues out-saturated the
  // indigo it was. It happens to hold of the violet (chroma 23.7 dark, 24.0
  // light, above every state and series), but a ranking is still not what
  // protects the selection: nothing else may READ as it, and that is a
  // distance, measured here under every vision.
  for (const name of [...STATUS, ...DATA]) {
    const measured = separation(colour(name), colour('--color-brand-accent'));
    const ok = measured[0] >= ACCENT_NORMAL && Math.min(measured[1], measured[2]) >= ACCENT_DICHROMAT;
    say('no hue is read as the accent', ok, name, Math.min(...measured), `dE ${describe(measured)} >= ${ACCENT_NORMAL} normal, ${ACCENT_DICHROMAT} dichromat`);
  }

  // A selected row has to outread a hovered one. One alpha for both themes
  // fails this: at 0.10 over the dark panel the selected tint separated dE
  // 3.94 from its ground while the plain hover overlay separated 4.68, so
  // selected read WEAKER than hovered.
  for (const [name, rgb] of opaque) {
    const selected = flatten(values.get('--color-brand-accent-soft'), rgb);
    const hovered = flatten(values.get('--color-surface-hover'), rgb);
    const fromGround = deltaE(selected, rgb);
    const fromHover = deltaE(selected, hovered);
    const ok = fromGround >= deltaE(hovered, rgb) && fromHover >= 3;
    say('the selected tint outreads the hover overlay', ok, `--color-brand-accent-soft on ${name}`, Math.min(fromGround - deltaE(hovered, rgb), fromHover), `dE ${fromGround.toFixed(2)} from the ground (hover ${deltaE(hovered, rgb).toFixed(2)}), dE ${fromHover.toFixed(2)} apart`);
  }

  {
    // Every surface a control can sit on, the overlay composites included: a
    // checkbox inside a hovered row in a dialog body is the case the opaque
    // surfaces alone do not catch.
    const low = worst(colour('--color-border-control'), all);
    say('a control boundary clears 3:1', low.ratio >= 3, '--color-border-control', low.ratio, `${low.ratio.toFixed(2)}:1 (worst on ${low.name})`);
  }

  // Glass is the ground of what floats OVER CONTENT rather than over
  // interface: a canvas's bars and notes, and a chart's reading, which stands
  // beside the mark it reads and so over its neighbours. Each carries words,
  // so every text step is held to 4.5:1 on the composite. The declared worst
  // backdrop is the INVERSE ground, the far end of the palette from the glass
  // itself, which is as far as anything under a floating panel can pull the
  // composite; the accent fill, the primary action on a canvas, and every data
  // hue a chart paints (the residual included) are measured by name beside it,
  // so the reading over a column is a measured case rather than an inference.
  const backdrops = [
    ['the inverse ground', colour('--color-surface-inverse')],
    ['the accent fill', colour('--color-brand-accent')],
    ...[...DATA, '--color-data-other'].map((name) => [name, colour(name)]),
    ...opaque,
  ];
  for (const [name, backdrop] of backdrops) {
    const glass = flatten(values.get('--color-surface-glass'), backdrop);
    for (const step of ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary']) {
      const ratio = contrast(colour(step), glass);
      say('text on glass clears 4.5:1', ratio >= 4.5, `${step} over ${name}`, ratio, `${ratio.toFixed(2)}:1`);
    }
  }

  // The chroma cap is what stops the ground drifting into a tint of the
  // accent, which leaves the accent nothing to separate itself from.
  for (const [name, rgb] of opaque) {
    const measured = chroma(rgb);
    say('the neutral ramp stays neutral', measured <= 2.2, name, measured, `chroma ${measured.toFixed(2)} <= 2.2`);
  }

  // THE OVERLAY STEPS. See OVERLAY_STEPS.
  for (const [rule, overlay, beneath] of OVERLAY_STEPS) {
    for (const [name, rgb] of opaque) {
      const from = beneath === null ? rgb : flatten(values.get(beneath), rgb);
      const measured = deltaE(flatten(values.get(overlay), rgb), from);
      say(
        rule,
        measured >= OVERLAY_DE,
        `${overlay} on ${name}`,
        measured,
        `dE ${measured.toFixed(2)} >= ${OVERLAY_DE} from ${beneath === null ? 'the rung' : `${beneath} on it`}`,
      );
    }
  }

  // THE LADDER. See RUNG_STEPS.
  for (const [rule, upper, lower, floor] of RUNG_STEPS) {
    const measured = deltaE(colour(upper), colour(lower));
    say(rule, measured >= floor, `${upper} over ${lower}`, measured, `dE ${measured.toFixed(2)} >= ${floor}`);
  }
  {
    // The other half of the card's step. See CARD_HAIRLINE.
    const [line, card, sheet] = CARD_HAIRLINE;
    for (const side of [card, sheet]) {
      const measured = deltaE(colour(line), colour(side));
      say(
        'the hairline that finds a card is visible on both sides of it',
        measured >= HAIRLINE_DE,
        `${line} on ${side}`,
        measured,
        `dE ${measured.toFixed(2)} >= ${HAIRLINE_DE}`,
      );
    }
  }
  {
    // A chip on every ground it can land on. See RAISED_CHIP.
    const [fill, edge] = RAISED_CHIP;
    const grounds = [
      ...opaque,
      ...OVERLAYS.flatMap((overlay) => opaque.map(([name, rgb]) => [`${overlay} on ${name}`, flatten(values.get(overlay), rgb)])),
    ];
    const low = grounds.reduce(
      (least, [name, ground]) => {
        const filled = flatten(values.get(fill), ground);
        const drawn = Math.max(deltaE(filled, ground), deltaE(flatten(values.get(edge), filled), ground));
        return drawn < least.drawn ? { drawn, name } : least;
      },
      { drawn: Infinity, name: '' },
    );
    say(
      'the strong hairline finds a raised chip on every ground',
      low.drawn >= HAIRLINE_DE,
      `${edge} round ${fill}`,
      low.drawn,
      `dE ${low.drawn.toFixed(2)} >= ${HAIRLINE_DE} (worst on ${low.name})`,
    );
  }
}

const describe = (measured) => measured.map((value, i) => `${VISIONS[i].slice(0, 1)}${value.toFixed(1)}`).join('/');

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

function checkStructure(sources, states, push) {
  const say = (rule, ok, subject, detail) => push({ state: 'the token files', rule, ok, subject, value: null, detail });

  const { dark: darkBlock, lightMedia, lightAttribute: lightBlock } = themeBlocks(sources.themesSource);

  // A colour whose only definition is inside the theme layer is a colour that
  // is missing for an application that imports the token layer alone. Read
  // off the three blocks themselves, so a slot only one of them declares is
  // still asked about.
  const themed = [...new Set([...darkBlock.keys(), ...lightMedia.keys(), ...lightBlock.keys()])].filter(
    (name) => name.startsWith('--color-') || name.startsWith('--shadow-'),
  );
  const missing = themed.filter((name) => !states.base.has(name));
  say('every themed token has a value on the bare :root of tokens.css', missing.length === 0, 'tokens.css', missing.length === 0 ? 'none missing' : `missing: ${missing.join(', ')}`);

  // The measured rules cannot catch a missing LIGHT slot: the token still has
  // a value, inherited from the dark root under it, and that value is the dark
  // one. Nor a missing DARK slot, which inherits the marketing palette's from
  // tokens.css. So parity is asserted directly.
  const onlyLight = [...lightBlock.keys()].filter((name) => !darkBlock.has(name));
  const onlyDark = [...darkBlock.keys()].filter((name) => !lightBlock.has(name));
  say(
    'the light block declares exactly the key set the dark block declares',
    onlyLight.length === 0 && onlyDark.length === 0,
    'themes.css',
    onlyLight.length === 0 && onlyDark.length === 0 ? 'the two key sets match' : `light only: ${onlyLight.join(', ') || 'none'}; dark only: ${onlyDark.join(', ') || 'none'}`,
  );

  // The light palette is written twice on purpose, once so the system setting
  // works and once so an explicit choice wins in both directions. A value that
  // drifts between them means the toggle paints colours the system setting
  // does not, and a slot one of them lacks is painted DARK in that one alone,
  // so the comparison runs from both sides: a slot missing from either block
  // is drift, not agreement.
  say('the light media block is present', lightMedia.size > 0, 'themes.css', `${lightMedia.size} declarations`);
  const drift = [...new Set([...lightMedia.keys(), ...lightBlock.keys()])]
    .filter((name) => lightMedia.get(name) !== lightBlock.get(name))
    .map((name) => `${name}: ${lightMedia.get(name) ?? 'undeclared'} by media query vs ${lightBlock.get(name) ?? 'undeclared'} by attribute`);
  say('the two light blocks agree', drift.length === 0, 'themes.css', drift.length === 0 ? 'no drift' : drift.join('; '));

  // A dark-tuned shadow on a white page is a smudge, so every step is declared
  // in both blocks rather than inherited from the token layer, AND the two
  // declarations actually differ.
  //
  // Both halves, because declaring a step in both blocks at the same value is
  // the defect wearing the fix's clothes: the key-set rule above passes, this
  // rule's name is satisfied, and the light page still carries a shadow tuned
  // for a dark one. The exception is a step whose value is composed of theme
  // aware var()s: --shadow-focus reads --color-surface-background and
  // --color-focus, --shadow-selection reads --color-brand-accent, and those
  // repaint with the palette without the declaration changing. So the rule is
  // applied to a LITERAL value, and a step that stops being var()-composed
  // falls back under it.
  const undeclared = SHADOW_STEPS.filter((name) => !lightBlock.has(name) || !darkBlock.has(name));
  say('every shadow step is declared in both blocks', undeclared.length === 0, 'themes.css', undeclared.length === 0 ? `all ${SHADOW_STEPS.length} steps declared in both blocks` : `not declared in both: ${undeclared.join(', ')}`);
  const literal = SHADOW_STEPS.filter((name) => !undeclared.includes(name) && !lightBlock.get(name).includes('var('));
  const invariant = literal.filter((name) => lightBlock.get(name) === darkBlock.get(name));
  say(
    'no shadow step is theme-invariant',
    invariant.length === 0,
    'themes.css',
    invariant.length === 0
      ? `all ${literal.length} literal steps differ between the palettes (${SHADOW_STEPS.length - literal.length} repaint through var())`
      : `the same value in both palettes: ${invariant.map((name) => `${name} (${lightBlock.get(name)})`).join('; ')}`,
  );
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

/**
 * Measure the whole rule table over one built pair of stylesheets.
 * Returns every check with its measured value, and the failing subset.
 */
export function runPalette(sources) {
  const sheets = sheetsOf(sources);
  const states = statesOf(sheets);
  const checks = [];
  const push = (check) => checks.push(check);
  for (const [name, values] of Object.entries(states)) {
    checkState(name, values, name === 'base' ? 'base' : 'full', push);
  }
  checkStructure({ themesSource: sheets.themes }, states, push);
  return { states, checks, failures: checks.filter((check) => !check.ok) };
}

/** One line per failing check, for a test's assertion message. */
export const describeFailure = (check) => `${check.state}: ${check.rule}: ${check.subject}: ${check.detail}`;

/** The tightest measured value under each rule, for a report or a story. */
export function tightest(checks) {
  const byRule = new Map();
  for (const check of checks) {
    if (check.value === null) continue;
    const low = byRule.get(check.rule);
    if (low === undefined || check.value < low.value) byRule.set(check.rule, check);
  }
  return [...byRule.values()];
}
