/**
 * The rules this package's stylesheets have to keep, asserted over the
 * stylesheets themselves.
 *
 * WHY A SOURCE TEST RATHER THAN A RENDERED ONE. jsdom applies no stylesheet:
 * a CSS import resolves to an empty module in this runner, `getComputedStyle`
 * answers the initial value for every property, and it resolves no custom
 * property at all. So a focus ring, a target's size and the token a colour
 * comes from are invisible to every other suite in this package, which is
 * exactly why all three drifted. The file is the only place they can be
 * measured here, so it is where they are measured.
 *
 * The COLOUR values behind the tokens are measured in @crewlethq/tokens'
 * palette suite, over the built stylesheets. What is held here is which token
 * a rule reaches for, which is the half a palette cannot see.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const src = dirname(dirname(fileURLToPath(import.meta.url)));
const sheet = (path: string): string => readFileSync(join(src, path), 'utf8');

const SHEETS: Record<string, string> = {
  'DataTable/DataTable.css': sheet('DataTable/DataTable.css'),
  'Table/Table.css': sheet('Table/Table.css'),
  'Charts/Charts.css': sheet('Charts/Charts.css'),
  'DiffList/DiffList.css': sheet('DiffList/DiffList.css'),
  'TreeGrid/TreeGrid.css': sheet('TreeGrid/TreeGrid.css'),
  'TreeCanvas/TreeCanvas.css': sheet('TreeCanvas/TreeCanvas.css'),
  'DataView/DataView.css': sheet('DataView/DataView.css'),
};

/** The rule block a selector opens, without its comments. */
function block(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return '';
  return css.slice(at, css.indexOf('}', at));
}

/**
 * The fill steps: a mark's colour, and never a word's.
 *
 * Each of these is measured to 3:1 as a MARK and no further, so a rule that
 * paints text with one is a rule that puts a fact under the 4.5:1 floor. The
 * accent's own fill measures 4.06:1 light and 3.18:1 dark as text, which is
 * how it reached a table header and a toolbar link; every family's `-ink`
 * step exists for this.
 */
const FILL_STEPS = [
  'brand-accent',
  'feedback-success',
  'feedback-warning',
  'feedback-danger',
  'feedback-info',
  'phase-onboarding',
  'phase-execute',
  'phase-review',
  'data-1',
  'data-2',
  'data-3',
  'data-4',
  'data-5',
  /*
   * Assembled rather than spelt out, because `check-css-variables.mjs` reads
   * a quoted token name in a `.tsx` file as a component DECLARING one, which
   * is the rule that keeps token values out of components. There is nothing
   * to declare here; this is a test naming what it measures.
   */
].map((family) => `--color-${family}`);

/** One level of the component's own indirection, resolved. */
function resolveLocals(css: string, value: string): string {
  return value.replace(/var\((--crewlet-[\w-]+)(?:,[^)]*)?\)/g, (whole, name: string) => {
    const declared = new RegExp(`\\n\\s*${name}:\\s*([^;]+);`).exec(css);
    return declared ? declared[1]! : whole;
  });
}

test('no rule in this package paints a word with a fill step', () => {
  const offences: string[] = [];
  for (const [name, css] of Object.entries(SHEETS)) {
    for (const [, raw] of css.matchAll(/(?:^|[\s;{])color:\s*([^;}]+)/g)) {
      const resolved = resolveLocals(css, raw!.trim());
      for (const fill of FILL_STEPS) {
        // The bare step only: `-ink`, `-soft` and `-hover` all end differently.
        if (new RegExp(`var\\(${fill}[,)]`).test(resolved)) {
          offences.push(`${name}: color: ${raw!.trim()}`);
        }
      }
    }
  }
  expect(offences).toEqual([]);
});

/**
 * Every class this package puts on something a keyboard can land on.
 *
 * The list is the claim: a control added without a line here is a control
 * nobody checked, so adding one to the markup means adding one here. The
 * components that carry their own ring (Button, IconButton, Checkbox,
 * Popover, Menu, Modal) are not in it, because their own suites hold theirs.
 */
const FOCUSABLE = [
  ['DataTable/DataTable.css', 'crewlet-data-table__sort-button'],
  ['DataTable/DataTable.css', 'crewlet-data-table__column-resizer'],
  ['DataTable/DataTable.css', 'crewlet-data-table__resizer'],
  ['DataTable/DataTable.css', 'crewlet-data-table__header-btn'],
  ['DataTable/DataTable.css', 'crewlet-data-table__items-per-page-btn'],
  ['DataTable/DataTable.css', 'crewlet-data-table__clear-filters'],
  ['DataTable/DataTable.css', 'crewlet-data-table__copy-cell-button'],
  ['DataTable/DataTable.css', 'crewlet-data-table__expand-btn'],
  ['DataTable/DataTable.css', 'crewlet-data-table__expand-all-btn'],
  ['DataTable/DataTable.css', 'crewlet-data-table__row-link'],
  ['DataTable/DataTable.css', 'crewlet-data-table__row--clickable'],
  ['Table/Table.css', 'crewlet-table__action-btn'],
  ['Charts/Charts.css', 'crewlet-bar-list__row--pressable'],
] as const;

test('every control this package draws itself shows where the focus is', () => {
  const missing: string[] = [];
  for (const [file, className] of FOCUSABLE) {
    const css = SHEETS[file]!;
    /*
     * An OUTLINE, and the selector has to be `:focus-visible`. Forced-colors
     * mode drops every box-shadow and keeps outlines, so a ring drawn as a
     * shadow disappears for exactly the readers who most need one.
     */
    const rule = new RegExp(
      `\\.${className}(?::[\\w-]+)*:focus-visible[^{]*\\{[^}]*outline:\\s*(?!none)`,
    );
    if (!rule.test(css)) missing.push(`${file}: .${className}`);
  }
  expect(missing).toEqual([]);
});

test('no control this package sizes itself is smaller than the target floor', () => {
  /*
   * 24px is the smallest WCAG 2.2 accepts, and it is a floor at EVERY
   * density: a control sized in density steps shrinks through it exactly
   * where the rows are tightest. Only an explicit pixel box is checked here;
   * a control sized by its padding is measured by the layout, which jsdom
   * does not do.
   */
  const undersized: string[] = [];
  for (const [file, className] of FOCUSABLE) {
    const css = SHEETS[file]!;
    const block = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(css);
    if (!block) continue;
    for (const [, property, px] of block[1]!.matchAll(/(width|height):\s*(\d+)px/g)) {
      if (Number(px) < 24) undersized.push(`${file}: .${className} ${property}: ${px}px`);
    }
  }
  expect(undersized).toEqual([]);
});

/* ─── A control under the floor grows its TARGET, not its drawing ───
   Two controls here are the chevron and nothing more, because each one sets a
   height everything else is measured against: the header's sets the row of
   column names, and the row's sets every row in the table. Painted at the
   control step they spent six pixels of the first and ten of every one of the
   rest, which is what moved this table off the one the product reads. So the
   pressable area is grown where it costs nothing, on a pseudo element at the
   control step (a floor of 24px however the density is set), CENTRED on the
   control so it reaches into the cell's own padding instead of making the cell
   taller. Anything that shrinks the painted box has to bring one of these
   with it. */
const GROWN_TARGETS: [className: string, painted: string][] = [
  // The drawing plus one step of halo, which is the box 0.2.0 paints under
  // the pointer, and the drawing alone on the row, where 0.2.0 paints none.
  ['crewlet-data-table__expand-all-btn', 'width: calc(var(--font-size-lg) + var(--spacing-1))'],
  ['crewlet-data-table__expand-btn', 'width: var(--font-size-lg)'],
];

test('a control drawn under the target floor grows its pressable area instead', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const missing: string[] = [];
  for (const [className, painted] of GROWN_TARGETS) {
    // The painted box is the chevron's own size. Grown back to the control
    // step it takes the row with it, which is the whole of what this holds.
    if (!block(css, `.${className}`).includes(painted)) {
      missing.push(`.${className} is painted at something other than ${painted}`);
    }
    const grown = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(
      ([, selector, body]) =>
        // endsWith rather than equality: the capture reaches back over the
        // comment above the rule, which the sheet is read with.
        selector!.split(',').some((one) => one.trim().endsWith(`.${className}::after`)) &&
        body!.includes('width: var(--size-control-sm)'),
    );
    if (!grown) {
      missing.push(`.${className} paints a box under the floor and grows no target`);
      continue;
    }
    for (const declaration of [
      'height: var(--size-control-sm)',
      'position: absolute',
      'transform: translate(-50%, -50%)',
    ]) {
      if (!grown[2]!.includes(declaration)) missing.push(`.${className}::after is missing ${declaration}`);
    }
  }
  expect(missing).toEqual([]);
});


/* ─── The register a column's name is written in ────────────────────
   ONE MICRO-LABEL STEP, wherever a column is named. Three surfaces in this
   package name columns (both table variants and the treegrid) and each used to
   spell its own subset of the register: the treegrid left the tracking and the
   case off entirely, so a grid and a table standing on the same screen headed
   their columns two different ways. The declarations are listed rather than
   the selectors, because what has to hold is that all five are present. */
const COLUMN_HEADS: [file: string, selector: string][] = [
  ['DataTable/DataTable.css', '.crewlet-data-table--default .crewlet-data-table__table th'],
  ['DataTable/DataTable.css', '.crewlet-data-table--compact .crewlet-data-table__table th'],
  ['TreeGrid/TreeGrid.css', '.crewlet-tree-grid__head .crewlet-tree-grid__row'],
  ['Table/Table.css', '.crewlet-table__table th'],
];

const REGISTER = [
  'font-size: var(--font-size-2xs)',
  'font-weight: var(--font-weight-medium)',
  'letter-spacing: var(--font-letter-spacing-wide)',
  'text-transform: uppercase',
  'color: var(--color-text-tertiary)',
];

test('every surface that names a column writes the name in the same register', () => {
  const wrong: string[] = [];
  for (const [file, selector] of COLUMN_HEADS) {
    const rule = block(SHEETS[file]!, selector);
    if (rule === '') {
      wrong.push(`${file}: ${selector} has no rule at all`);
      continue;
    }
    for (const declaration of REGISTER) {
      if (!rule.includes(declaration)) wrong.push(`${file}: ${selector} is missing ${declaration}`);
    }
  }
  expect(wrong).toEqual([]);
});

/* ─── A tint under the pointer is drawn on a ground nobody knows ────
   EVERY row lights up, because on a wide table the tint is how a reader holds
   their eye on one row while they cross it; what says a row can be PRESSED is
   the cursor, and only a row that acts takes one. What the tint may never be
   is an OPAQUE surface: these tables stand on the page, inside a card and
   inside a dialog, and an opaque hover is right on one of those three and a
   block of the wrong grey on the other two. So the rule is about the value,
   and it is the value that broke real screens. */
/* Assembled rather than spelt out, for the reason FILL_STEPS is: a quoted
   token name in a `.tsx` file reads to `check-css-variables.mjs` as a
   component DECLARING one. */
const ROW_HOVER_SURFACES = ['subtle', 'elevated', 'muted'].map((step) => `--color-surface-${step}`);

test('a hovered row takes the overlay step, never an opaque surface', () => {
  const opaque: string[] = [];
  for (const [name, css] of Object.entries(SHEETS)) {
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const paint = /(?:^|;|\s)background(?:-color)?:([^;]*)/.exec(body!);
      if (!paint) continue;
      for (const selector of selectors!.split(',')) {
        const one = selector.trim();
        // The row itself is the subject: the selector ENDS at the hovered tr,
        // so a rule reaching into a cell of a hovered row is not one of these.
        if (!/\btr[^\s]*:hover$/.test(one)) continue;
        const value = resolveLocals(css, paint[1]!);
        for (const surface of ROW_HOVER_SURFACES) {
          if (value.includes(surface)) opaque.push(`${name}: ${one} -> ${paint[1]!.trim()}`);
        }
      }
    }
  }
  expect(opaque).toEqual([]);
});

/* And the cursor is the half that says the row acts. A table whose rows
   navigate has to point at them, or the only thing separating a row that
   opens a page from a row that does nothing is a tint they both carry. */
test('a row that acts says so with the pointer', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  expect(/\.crewlet-data-table__row--clickable\s*\{[^}]*cursor:\s*pointer/.test(css)).toBe(true);
});

/* ─── A mark on a row is measured on the row's own tint ─────────────
   The fill steps are measured to 3:1 against the OPAQUE surfaces and no
   further. A row's leading rail is drawn on the row, which on the row the
   reader is on is the accent tint: the danger fill measured 2.86:1 there in
   dark on a card, so the one row that was both selected and broken had a mark
   nobody could see. Every ink step clears 4.5:1 on that composite, and
   @crewlethq/tokens' palette suite holds all of them there. */
test('a rail drawn on a row takes an ink step, never a fill step', () => {
  const offences: string[] = [];
  for (const [name, css] of Object.entries(SHEETS)) {
    for (const [declaration] of css.matchAll(/box-shadow:\s*inset[^;]*;/g)) {
      for (const fill of FILL_STEPS) {
        /*
         * The bare step only. An `-ink` token cannot match this: the step's
         * name is a PREFIX of it and the character after the prefix is a
         * hyphen rather than a comma or a bracket. A second test for `-ink`
         * anywhere in the declaration was doing nothing here and was a hole
         * where a shadow carries two marks, because one ink step excused the
         * fill beside it.
         */
        if (!new RegExp(`var\\(${fill}[,)]`).test(declaration)) continue;
        /*
         * The accent is the exception the palette measures separately: a
         * selection rail is drawn on a row that has no tint of its own,
         * because the rail IS how that row says it is selected. Matched on
         * the suffix rather than on the whole name, for the reason
         * FILL_STEPS is assembled: `check-css-variables.mjs` reads a quoted
         * token name in a `.tsx` file as a component declaring one.
         */
        if (fill.endsWith('brand-accent')) continue;
        offences.push(`${name}: ${declaration.trim()}`);
      }
    }
  }
  expect(offences).toEqual([]);
});

/* ─── A pinned cell stays opaque ────────────────────────────────────
   The sticky pane exists so the rows scrolling behind it do not show through
   the pinned action. Every row tint in this table is a translucent overlay, so
   a rule assigning one to `background` REPLACES that opaque base and the pane
   becomes a window. The tint is painted as a LAYER over the base instead. */
test('a row tint reaches a pinned cell as a layer, never as its background', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const offences: string[] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]*--sticky-right[^{}]*)\{([^}]*)\}/g)) {
    if (!/:hover|is-expanded|row--selected/.test(selector!)) continue;
    if (!/background-image:\s*linear-gradient/.test(body!)) offences.push(selector!.trim());
  }
  expect(offences).toEqual([]);
});

/* ─── And it reaches the pane on the same rows the tint reaches ─────
   Every row lights up under the pointer, so every hovered row has to carry
   that tint all the way to its pinned end. Gated on the rows that ACT, the
   pane held its own ground under a row that had just taken the tint and the
   right-hand end of the row came away from the rest of it, which is exactly
   what the mirror exists to prevent. The table the pane was drawn for has no
   clickable row in it: its action is a link inside the pane. */
test('the pinned pane mirrors the tint of every hovered row, not only one that acts', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const hover = [...css.matchAll(/([^{}]*--sticky-right[^{}]*)\{([^}]*)\}/g)].filter(([, selector]) =>
    /:hover/.test(selector!),
  );
  expect(hover.length).toBeGreaterThan(0);
  const gated = hover
    .flatMap(([, selector]) => selector!.split(','))
    .filter((one) => /:hover/.test(one) && /row--clickable|row-link/.test(one));
  expect(gated).toEqual([]);
});

/* ─── The rule under the last row belongs to whatever ends the rows ─
   A row's hairline separates it from the row BELOW it, and a table standing on
   the page has nothing below the last one, so it draws the line itself and
   the list stops on an edge rather than in mid-air. Inside a PANEL something
   else already ends it: the frame's own bottom edge, directly beneath, which
   the last row's own line met and doubled into a two-pixel rule the rest of
   the table never draws. So the suppression is the panel's, written where the
   panel is, and the pairing is what is asserted here: the table keeps the
   line, the frame takes it away. */
test('the rule under the last row is dropped by the frame, not by the table', () => {
  const wrong: string[] = [];
  const table = SHEETS['DataTable/DataTable.css']!;
  for (const [, selector, body] of table.matchAll(/([^{}]*tbody tr:last-child td[^{}]*)\{([^}]*)\}/g)) {
    if (/border-bottom:\s*none/.test(body!)) wrong.push(`the table drops it itself: ${selector!.trim()}`);
  }
  const frame = [
    ...SHEETS['DataView/DataView.css']!.matchAll(/([^{}]*tbody tr:last-child td[^{}]*)\{([^}]*)\}/g),
  ];
  if (!frame.some(([, selector, body]) => /--framed/.test(selector!) && /border-bottom:\s*none/.test(body!))) {
    wrong.push('the framed list keeps the doubled rule at its foot');
  }
  expect(wrong).toEqual([]);
});

/* ─── A sideways scroll stays inside the table ──────────────────────
   A box that scrolls sideways and does not contain its overscroll hands the
   gesture on when it reaches the end, and on a trackpad that is the browser's
   own back navigation: a reader pushing a wide table one column too far left
   loses the page. Every horizontal scroller this package draws declares it,
   and the two the table draws were the only ones that did not. */
test('every sideways scroller this package draws contains its overscroll', () => {
  const offences: string[] = [];
  for (const [name, css] of Object.entries(SHEETS)) {
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/overflow-x:\s*auto/.test(body!)) continue;
      if (/overscroll-behavior(-x)?:\s*contain/.test(body!)) continue;
      offences.push(`${name}: ${selectors!.trim()}`);
    }
  }
  expect(offences).toEqual([]);
});


/* ─── A node of a chart is the chart's to draw ──────────────────────
   TreeCanvas hands the caller `role="treeitem"` through `ctx.item(id)`, so
   what a node LOOKS like is the component's decision: its inset, its radius,
   the stack its lines sit in and the cursor over it. Every one of those was
   written out in each consumer once, which is how two charts in one product
   came to space their nodes differently. The list is the whole of the rule
   the engine's chart draws; what a node SAYS is still the caller's. */
const NODE = [
  'display: flex',
  'flex-direction: column',
  'gap: var(--spacing-1)',
  'padding: var(--spacing-2) var(--spacing-3)',
  'border-radius: var(--radius-lg)',
  'cursor: default',
];

test("a chart draws its own nodes, not just the card they sit on", () => {
  const rule = block(SHEETS['TreeCanvas/TreeCanvas.css']!, ".crewlet-tree-canvas__card [role='treeitem']");
  expect(NODE.filter((declaration) => !rule.includes(declaration))).toEqual([]);
});

/* ─── The register conlet reads this table in ───────────────────────
   The three renderings the owner pasted are the specification for the look,
   and each of these is a value the restyle had moved off them. They are held
   here rather than by eye, because every one of them drifted by two pixels or
   one token at a time and nothing said so. */
test('the cell inset is the pair the table declares, not a bare spacing step', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const root = block(css, '.crewlet-data-table--compact');
  // The midpoint of two steps, so it stays on the scale and still moves with
  // --density. A bare step here is the two pixels a row lost.
  expect(root).toContain('--crewlet-data-table-cell-pad-y: calc((var(--spacing-2) + var(--spacing-3)) / 2)');
  /*
   * The chrome inset is on the root that BOTH variants carry: each draws a
   * toolbar, and unset on one of them every padding written through it is an
   * invalid declaration the browser drops whole, which is a bar with no inset
   * at all. And the step it is built from is named once more, on the chrome
   * row, which is drawn on a card's header wherever the table fills one and
   * has the table's own root above it nowhere. Declared twice over, the two
   * copies are free to drift; declared only on the root, the hosted cog loses
   * the gap its separator is drawn in.
   */
  const step = block(css, '.crewlet-data-table,\n.crewlet-data-table__chrome');
  expect(step).toContain('--crewlet-data-table-chrome-step: calc((var(--spacing-3) + var(--spacing-4)) / 2)');
  const shared = block(css, '.crewlet-data-table');
  expect(shared).toContain('--crewlet-data-table-chrome-pad-x: var(--crewlet-data-table-chrome-step)');

  const cells = block(css, '.crewlet-data-table--compact .crewlet-data-table__table th,\n.crewlet-data-table--compact .crewlet-data-table__table td');
  expect(cells).toContain('padding: var(--crewlet-data-table-cell-pad-y) var(--crewlet-data-table-cell-pad-x)');
  // The sort control replaces the header cell's own padding, so it has to sit
  // on the same pair or a sortable column's label steps out of line with the
  // plain one beside it.
  const sort =
    /\.crewlet-data-table--compact \.crewlet-data-table__sort-button \{([^}]*padding[^}]*)\}/.exec(css);
  expect(sort?.[1]).toContain('padding: var(--crewlet-data-table-head-pad-y) var(--crewlet-data-table-cell-pad-x)');
});

test('the header row is a band only where the table was asked to pin it', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  for (const variant of ['default', 'compact']) {
    const head = block(css, `.crewlet-data-table--${variant} .crewlet-data-table__table th`);
    expect(head).not.toContain('position: sticky');
    expect(head).not.toContain('background:');
  }
  const pinned = block(css, '.crewlet-data-table--sticky-head .crewlet-data-table__table th');
  expect(pinned).toContain('position: sticky');
  // The ground comes WITH the pin: names pinned over rows with nothing behind
  // them are names read through the rows.
  expect(pinned).toContain('background: var(--color-surface-subtle)');
});

test('the header divides one column from the next, and never a chrome cell', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const selector =
    '.crewlet-data-table--compact .crewlet-data-table__table thead th:not(:last-child):not(.crewlet-data-table__th--chrome):not(:has(+ .crewlet-data-table__th--chrome))::after';
  const rule = block(css, selector);
  expect(rule).toContain('background: var(--color-border-default)');
  // Inset at both ends, so it reads as a delimiter rather than as a border.
  expect(rule).toContain('top: calc((var(--spacing-1) + var(--spacing-2)) / 2)');
  expect(rule).toContain('bottom: calc((var(--spacing-1) + var(--spacing-2)) / 2)');
});

test('the header block says what the table is at the step a title takes', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const title = block(css, '.crewlet-data-table__title');
  expect(title).toContain('font-size: var(--font-size-md)');
  const description = block(css, '.crewlet-data-table__description');
  // A sentence, at the step and the ink a sentence is read at.
  expect(description).toContain('font-size: var(--font-size-compact)');
  expect(description).toContain('color: var(--color-text-secondary)');
});

test('the pinned pane stands one step off the ground the rows are on', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const pane = block(css, '.crewlet-data-table__th--sticky-right,\n.crewlet-data-table__td--sticky-right');
  expect(pane).toContain('var(--color-surface-elevated)');
});

test('the table draws its own chrome at its own size, over the icon button', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  /*
   * The two controls are the package IconButton, whose sheet is bundled after
   * this one: at equal specificity its radius and its 12px glyph win. The
   * table's own geometry is written through the CHROME ROW, which is two
   * classes like the root was and so still outranks them.
   */
  const geometry = block(css, '.crewlet-data-table__chrome .crewlet-data-table__page-btn,\n.crewlet-data-table__chrome .crewlet-data-table__settings-btn');
  expect(geometry).toContain('border-radius: var(--radius-sm)');
  const glyph = block(css, '.crewlet-data-table__chrome .crewlet-data-table__page-btn .crewlet-glyph,\n.crewlet-data-table__chrome .crewlet-data-table__settings-btn .crewlet-glyph');
  expect(glyph).toContain('width: var(--font-size-lg)');
});

test('the reduced-motion block outranks every rule it has to cancel', () => {
  /*
   * A CANCELLATION IS ONLY ONE IF IT OUTRANKS WHAT IT CANCELS. Written once,
   * `.crewlet-data-table *` is a single class, and the rules it had to beat
   * carry two: the row hover, the sort control, the action button, and the
   * pager and the cog all kept their transitions for a reader who had asked
   * for stillness. Only the document-wide rule in @crewlethq/tokens, which is
   * `!important`, was holding the promise, and a consumer that loads the
   * components without that sheet had nothing at all.
   *
   * Two facts decide it, and both are read off the sheet: the block has to be
   * at least as specific as anything it cancels, and it has to come after it,
   * since equal specificity is settled by order.
   */
  const css = SHEETS['DataTable/DataTable.css']!.replace(/\/\*[\s\S]*?\*\//g, '');
  const specificity = (selector: string): number =>
    (selector.match(/\.[A-Za-z0-9_-]+/g) ?? []).length
    + (selector.match(/:(?!:)[a-z-]/g) ?? []).length;

  const reduceAt = css.indexOf('@media (prefers-reduced-motion: reduce)');
  expect(reduceAt).toBeGreaterThan(0);
  const stilled = block(css, '@media (prefers-reduced-motion: reduce)');
  // The selector list is what follows the media query's own brace.
  const cancels = stilled.split('{')[1]!.split(',').map((part) => part.trim()).filter(Boolean);
  expect(cancels.length).toBeGreaterThan(5);
  const floor = Math.min(...cancels.map(specificity));

  const animated: string[] = [];
  for (const rule of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if ((rule.index ?? 0) > reduceAt) continue;
    const body = rule[2] ?? '';
    if (!/(^|\s)(transition|animation)\s*:/m.test(body)) continue;
    if (/(transition|animation)\s*:\s*none/.test(body)) continue;
    for (const part of (rule[1] ?? '').split(',')) {
      const selector = part.trim();
      if (!selector || /^\d/.test(selector) || selector.startsWith('%')) continue;
      animated.push(selector);
    }
  }
  // A sheet with nothing to cancel would pass for the wrong reason.
  expect(animated.length).toBeGreaterThan(5);
  const outranking = animated.filter((selector) => specificity(selector) > floor);
  expect(outranking).toEqual([]);

  // And the three parts of the table that are DRAWN SOMEWHERE ELSE, where the
  // root is no ancestor: the chrome row a card's header takes, and the two
  // controls inside the settings dialog.
  for (const drawn of [
    '.crewlet-data-table__chrome.crewlet-data-table__chrome *',
    '.crewlet-data-table__items-per-page-btn.crewlet-data-table__items-per-page-btn',
    '.crewlet-data-table__column-toggle-item.crewlet-data-table__column-toggle-item',
  ]) {
    expect(cancels).toContain(drawn);
  }
});

test('nothing dressing the pager or the cog is scoped to the table root', () => {
  /*
   * THE ROW TRAVELS. Where the table fills a card, the card's header holds
   * this row, so the table's own root is no longer an ancestor of the
   * controls in it. A rule written through the root would apply in the
   * table's own bar and nowhere else, which is a cog drawn at the icon
   * button's radius and its 12px glyph one row above the rows it settings.
   */
  const css = SHEETS['DataTable/DataTable.css']!.replace(/\/\*[\s\S]*?\*\//g, '');
  const rooted = [...css.matchAll(/([^{}]+)\{/g)]
    .flatMap((match) => (match[1] ?? '').split(','))
    .map((selector) => selector.trim())
    /*
     * A part that opens on the ROOT and then names one of these. The
     * catch-all `.crewlet-data-table *` is not one of them: it is the half of
     * the reduced-motion rule that covers what is still inside the table, and
     * the row that leaves carries a part of its own beside it.
     */
    .filter((selector) => /^\.crewlet-data-table\s/.test(selector))
    .filter((selector) => /__(page-btn|settings-btn|pagination|page-number|chrome)\b/.test(selector));
  expect(rooted).toEqual([]);
});

test('the pinned pane draws no edge: its ground is the whole of the mark', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  /*
   * The pane is told apart from the rows by its GROUND, one step off theirs,
   * and by nothing else. A line down its left is chrome claiming a depth the
   * surface does not have on every table that fits, which is all but the one
   * too narrow for its own floors.
   */
  const edges: string[] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]*--sticky-right[^{}]*)\{([^}]*)\}/g)) {
    if (/box-shadow/.test(body!)) edges.push(selector!.trim());
  }
  expect(edges).toEqual([]);
});

test('a frozen rail scrolls when its columns cannot be fitted', () => {
  /*
   * The scroller under a frozen rail was locked to `overflow-x: hidden`, on
   * the reasoning that the fit pass always redistributes the regular columns
   * to fit. The fit has a floor, so a container narrower than the floors plus
   * the pinned pane cannot be fitted to, and what the lock did there was clip
   * the row: measured on the conlet fixture in a 460px box, 164px of it cut
   * off and reachable by no wheel, trackpad or bar a reader has.
   */
  const css = SHEETS['DataTable/DataTable.css']!.replace(/\/\*[\s\S]*?\*\//g, '');
  const locked: string[] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/--frozen/.test(selector!)) continue;
    if (/overflow-x:\s*hidden/.test(body!)) locked.push(selector!.trim());
  }
  expect(locked).toEqual([]);
  // And the scroller it holds is the one every other table has.
  expect(block(css, '.crewlet-data-table__scroll')).toContain('overflow-x: auto');
});

test('an empty table is laid out by content, not by the widths it holds', () => {
  /*
   * A table with no rows keeps its column widths stated, so its header holds
   * the shape the rows will land in (held in DataTable.test.tsx), and carries
   * `__table--rowless`. What that class changes is the LAYOUT: the automatic
   * algorithm reads a stated width as a preference and shrinks the row to its
   * container, where the fixed one carries the width out whatever it costs.
   * Measured on the default variant, which is automatic already: four columns
   * stating 1128px of width render at 362px in a 340px box.
   */
  const css = SHEETS['DataTable/DataTable.css']!.replace(/\/\*[\s\S]*?\*\//g, '');
  expect(block(css, '.crewlet-data-table__table--rowless')).toContain('table-layout: auto');
  // And the layout it overrides is the one a table with rows is drawn under.
  const table = block(css, '.crewlet-data-table--compact .crewlet-data-table__table');
  expect(table).toContain('table-layout: fixed');
  expect(table).toContain('width: 100%');
});

/* ─── The settings frame is sized by what is in it ──────────────────
   The frame is the one surface in this package whose numbers were written out
   by hand: a gap of 12px beside a gap of 8px, a row padded 10 by 12, and a
   list floored at 350px. The floor is the one a reader sees: a table of four
   columns opened onto a third of a screen of empty list, and a table of
   twenty scrolled the whole dialog past its own footer. */
test('the column list is capped and scrolls, rather than floored at a height', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const list = block(css, '.crewlet-data-table__column-toggles');
  expect(list).not.toContain('min-height');
  expect(list).toContain('overflow-y: auto');
  // A scroller keeps its own overscroll, here as everywhere else in the
  // package: a reader pushing past the last column must not navigate back.
  expect(list).toContain('overscroll-behavior: contain');
});

test('the smallest control in the settings frame keeps the target floor', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const chip = block(css, '.crewlet-data-table__items-per-page-btn');
  /*
   * Padding alone shrinks with the density, and at the tightest step this chip
   * was under the 24px a pointer target has to keep. `--size-control-sm` is
   * the step that floors there whatever the density is set to.
   */
  expect(chip).toContain('min-height: var(--size-control-sm)');
  expect(chip).toContain('min-width: var(--size-control-sm)');
});

test('a tick that cannot move is drawn at a step a reader can still read', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  /*
   * It reaches the checkbox's own LABEL, which declares a colour of its own,
   * so a rule on the row around it lands on nothing at all. And the tertiary
   * step, not the muted one: this is the name of a column somebody has to
   * read, and muted is measured as decoration.
   */
  const rule = block(css, '.crewlet-data-table__column-toggle.is-fixed .crewlet-checkbox__label');
  expect(rule).toContain('color: var(--color-text-tertiary)');
});

test('every value the settings frame spends is a step, not a number', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const literals: string[] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const where = selector!.trim();
    if (!/__(settings-section|settings-footer|items-per-page|column-toggle|column-drag)/.test(where)) continue;
    for (const [, property, value] of body!.matchAll(/([a-z-]+):\s*([^;]+)/g)) {
      if (!/^(gap|padding|margin|min-height|min-width|height|width|row-gap|column-gap)$/.test(property!)) continue;
      // A literal length, with every token reference taken out first. An
      // outline is exempt: its 2px is what every focus ring in this package
      // is drawn at, and one rule spelling it differently is the drift.
      const bare = value!.replace(/var\(--[\w-]+\)/g, '');
      if (/(?<![\w-])\d*\.?\d+(px|rem|em)\b/.test(bare)) literals.push(`${where}: ${property}: ${value!.trim()}`);
    }
  }
  expect(literals).toEqual([]);
});

test('a reduced motion preference reaches the settings frame too', () => {
  const css = SHEETS['DataTable/DataTable.css']!;
  const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
  expect(at).toBeGreaterThan(-1);
  const rule = css.slice(at, css.indexOf('}', css.indexOf('transition: none', at)));
  /*
   * The frame is a Modal, and a Modal portals onto the layer host, so the
   * `.crewlet-data-table *` selector beside these reaches none of it. Both of
   * the frame's own animated surfaces have to be named outright, or an
   * application that imports this component without the token baseline still
   * animates them under the preference.
   */
  expect(rule).toContain('.crewlet-data-table__items-per-page-btn');
  expect(rule).toContain('.crewlet-data-table__column-toggle-item');
});

/*
 * THE COUNT LINE IS GONE, and so is everything that dressed it. A list used
 * to close on `.crewlet-table-footer`, and a rule left behind for it is a
 * rule that styles nothing while reading like the component is still there.
 * Asserted over every stylesheet in the package rather than over DataView's
 * alone: the class was a `crewlet-table-` name, so it was never this folder's
 * to keep, and the next file to reach for it would be a different one.
 */
test('no stylesheet still dresses a count line under a table', () => {
  const dressed: string[] = [];
  for (const folder of readdirSync(src, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const file of readdirSync(join(src, folder.name))) {
      if (!file.endsWith('.css')) continue;
      const css = readFileSync(join(src, folder.name, file), 'utf8');
      if (css.includes('crewlet-table-footer')) dressed.push(`${folder.name}/${file}`);
    }
  }
  expect(dressed).toEqual([]);
});

/*
 * WHAT FENCES THE LOAD MORE STRIP. A row's bottom hairline is what separates
 * the rows from whatever the table draws under them, because neither the
 * cursor list's Load more strip nor the end message carries a border of its
 * own. A framed list cancels that hairline so the frame's own edge is the
 * only line at the foot of the panel, and cancelled unconditionally it took
 * the fence away from a strip that still had rows above it.
 */
test('a framed list keeps the fence over whatever follows its rows', () => {
  const css = SHEETS['DataView/DataView.css']!;
  const at = css.indexOf('tr:last-child');
  expect(at).toBeGreaterThan(-1);
  const selector = css.slice(css.indexOf('.crewlet-data-view--framed', css.lastIndexOf('*/', at)), at);
  expect(selector).toContain(':not(:has(');
  expect(selector).toContain('.crewlet-data-table__load-more');
  expect(selector).toContain('.crewlet-data-table__end');
  // And one rule, not two: a second copy is the one that stops matching.
  expect(css.split('tr:last-child').length - 1).toBe(1);
});
