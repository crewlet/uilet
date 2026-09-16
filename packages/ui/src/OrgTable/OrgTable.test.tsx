/**
 * The org table: the drawing it adds to the treegrid, and the four controls
 * that drawing puts on a row.
 *
 * WHAT THESE PROTECT.
 * - The hierarchy is the indent: every row carries its own level, the wire
 *   element IS that indent, and the trunk is drawn from the row's middle at
 *   the root and through the row everywhere else.
 * - It composes `TreeGrid` through the ARIA contract that component documents,
 *   so the two stylesheet rules that reach across (the first cell's indent and
 *   the reveal keyed on the row) are held to the roles rather than to a
 *   private class name, and the rule this one takes back is still there.
 * - A hue reaches the branch arriving at a row and the mark and name in it,
 *   and never the caption, which is the one word it could not carry at the
 *   measured ratio.
 * - Expand all and Collapse all act on the whole table from a tab on its edge,
 *   and they do not wear the drawing the add on every row under them wears.
 * - The add on a row is the chart's own `AddPill`, in a slot as wide as that
 *   pill is open, and it is not behind the reveal the row's other controls
 *   are: it is the one control an operator reaches for by its colour.
 * - The row's controls are quiet until the row is reached, and focus is one of
 *   the three ways of reaching it.
 * - WHAT IS DRAWN IS MEASURED, through the real cascade: the indent's step,
 *   the row's own height, the name group filling its cell, the marks riding
 *   the caption, and the pill's split. A rule can be in the file and reach
 *   nothing, and a guard that matched the file's text went green for a week
 *   while three of those shipped wrong.
 *
 * The rows, the keys, the cells and the focus model are `TreeGrid`'s, and the
 * pill's own gesture is `AddPill`'s, each covered by its own suite; nothing
 * here asserts them again.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { OrgTable, OrgTableActions, OrgTableAdd, OrgTableName } from './OrgTable.js';
import type { TreeInput, TreeViewHandle } from '../Tree/index.js';
import type { TreeGridColumn, TreeGridContext } from '../TreeGrid/index.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const SHEET = readFileSync(join(here, 'OrgTable.css'), 'utf8');
const GRID_SHEET = readFileSync(join(here, '../TreeGrid/TreeGrid.css'), 'utf8');

/**
 * The declarations of the rule `selector` opens, without its comments. The
 * selector is matched where the rule's own braces begin, so a rule written as
 * a group is read by naming the part of it the block opens on.
 */
function rule(sheet: string, selector: string): string {
  const at = sheet.indexOf(`${selector} {`);
  if (at < 0) return '';
  return sheet.slice(at, sheet.indexOf('}', at));
}

const COLUMNS: TreeGridColumn[] = [
  { key: 'name', header: 'Name' },
  { key: 'actions', header: 'Actions', headerHidden: true, width: 'auto' },
];

const ROWS: readonly TreeInput[] = [
  {
    id: 'company',
    label: 'Nimbus',
    children: [
      {
        id: 'unit:eng',
        label: 'Engineering',
        children: [{ id: 'seat:dev', label: 'Developer' }],
      },
    ],
  },
];

const TONES: Record<string, 'purple' | undefined> = { 'seat:dev': 'purple' };

function mount(options: { ref?: React.Ref<TreeViewHandle>; controls?: boolean } = {}) {
  const picked = vi.fn<(id: string, kind: string) => void>();
  const rendered = render(
    <OrgTable
      label="Organization"
      columns={COLUMNS}
      rows={ROWS}
      tone={(id) => TONES[id]}
      cellHasControl={(_id, column) => column === 2}
      selectedId="unit:eng"
      {...(options.controls === undefined ? {} : { controls: options.controls })}
      {...(options.ref === undefined ? {} : { ref: options.ref })}
      renderCell={(id, column, grid: TreeGridContext) =>
        column === 1 ? (
          <OrgTableName
            name={id === 'company' ? 'Nimbus' : id === 'unit:eng' ? 'Engineering' : 'Developer'}
            caption={id === 'seat:dev' ? 'Agent seat' : 'Unit'}
            icon={<svg />}
            iconRing={id === 'seat:dev' ? 'dashed' : 'none'}
            tone={TONES[id]}
          />
        ) : (
          <>
            <OrgTableAdd
              label={`Add to ${id}`}
              onOpen={() => grid.opened(id, column)}
              sections={[
                { key: 'unit', label: 'Add a unit', icon: <svg />, onSelect: () => picked(id, 'unit') },
                { key: 'seat', label: 'Add a seat', icon: <svg />, onSelect: () => picked(id, 'seat') },
                { key: 'person', label: 'Add a person', icon: <svg />, onSelect: () => picked(id, 'person') },
              ]}
            />
            <OrgTableActions>
              <button type="button">Edit {id}</button>
            </OrgTableActions>
          </>
        )
      }
    />,
  );
  return { ...rendered, picked };
}

/** The row whose `data-tree-id` is `id`. */
const row = (id: string): HTMLElement =>
  screen.getAllByRole('row').find((one) => one.getAttribute('data-tree-id') === id)!;

/** The wire element of that row, which is its indent as well as its drawing. */
const wire = (id: string): HTMLElement => row(id).querySelector('.crewlet-org-table__wire')!;

describe('the hierarchy', () => {
  /*
   * THE INDENT IS THE DRAWING. One element whose width is the row's level, so
   * the gutter a row reserves and the branch drawn across that gutter can
   * never be two different widths.
   */
  test('every row carries its own level, and the wire is what holds it', () => {
    mount();
    expect(wire('company').style.getPropertyValue('--crewlet-org-table-depth')).toBe('0');
    expect(wire('unit:eng').style.getPropertyValue('--crewlet-org-table-depth')).toBe('1');
    expect(wire('seat:dev').style.getPropertyValue('--crewlet-org-table-depth')).toBe('2');
    expect(rule(SHEET, '.crewlet-org-table__wire')).toMatch(
      /width:\s*calc\(var\(--crewlet-org-table-indent\) \* var\(--crewlet-org-table-depth, 0\)\)/,
    );
  });

  /*
   * THE TRUNK IS ONE LINE, drawn as a segment on every row inside the tree so
   * the segments stack. At the root it starts at the row's own middle, and
   * only while the row is open: a line hanging off a closed root reaches
   * nothing.
   */
  test('the trunk is drawn through a row inside the tree and from the middle at the root', () => {
    mount();
    expect(wire('company').hasAttribute('data-trunk')).toBe(true);
    expect(wire('company').hasAttribute('data-root')).toBe(true);
    expect(wire('seat:dev').hasAttribute('data-trunk')).toBe(true);
    expect(wire('seat:dev').hasAttribute('data-root')).toBe(false);
    expect(rule(SHEET, '.crewlet-org-table__wire[data-root][data-trunk]::before')).toMatch(
      /inset-block-start:\s*50%/,
    );
  });

  /* Closed with Left, which is how a keyboard closes a row: Collapse all
     deliberately leaves the roots open, since a table with nothing in it is a
     table nobody can use. */
  test('a closed root hangs no trunk under it', () => {
    mount();
    fireEvent.keyDown(row('company'), { key: 'ArrowLeft' });
    expect(wire('company').hasAttribute('data-trunk')).toBe(false);
    expect(screen.queryByText('Engineering')).toBeNull();
  });

  /* A root row has nothing above it to branch off, so the stub a branch would
     leave beside the first row of the table is not drawn. */
  test('a root row draws no branch', () => {
    expect(rule(SHEET, '.crewlet-org-table__wire[data-root]::after')).toMatch(/content: none/);
  });

  /* The level is already on the row as `aria-level`, so the drawing of it says
     nothing a second time. */
  test('the wire is out of the accessibility tree', () => {
    mount();
    expect(wire('seat:dev').getAttribute('aria-hidden')).toBe('true');
    expect(row('seat:dev').getAttribute('aria-level')).toBe('3');
  });
});

/*
 * THE TWO RULES THAT REACH INTO THE GRID. This component draws over a
 * component it does not own, and the two places it has to reach are held to
 * the ARIA contract `TreeGrid` documents rather than to its class names, which
 * are private and change with nothing noticing.
 */
describe('what it takes from the grid', () => {
  /* A row here spends its first column on a mark, two lines of text and an
     indent that grows with the level, so the table asks the grid for more room
     than a plain one before it scrolls sideways. */
  test('it widens the grid before that grid starts to scroll sideways', () => {
    expect(rule(SHEET, '.crewlet-org-table')).toMatch(/--crewlet-tree-grid-min-width:\s*\d/);
    expect(rule(GRID_SHEET, '.crewlet-tree-grid__grid')).toMatch(
      /min-width:\s*var\(--crewlet-tree-grid-min-width,/,
    );
  });

  test('the grid really exposes the roles both stylesheet rules key on', () => {
    mount();
    expect(row('seat:dev').getAttribute('role')).toBe('row');
    expect(within(row('seat:dev')).getAllByRole('gridcell').length).toBe(COLUMNS.length);
    expect(rule(SHEET, ".crewlet-org-table [role='gridcell']:first-child")).toMatch(
      /padding-inline-start/,
    );
  });

  /* The indent this component takes back. If the grid stops indenting its own
     first cell, the rule here is a rule cancelling nothing and the wire is
     drawing an indent that is already there. */
  test("the grid's own first-cell indent, which this one takes back, is still there", () => {
    expect(rule(GRID_SHEET, '.crewlet-tree-grid__cell:first-child')).toMatch(
      /padding-inline-start:\s*calc\(/,
    );
  });
});

describe('a hue on a row', () => {
  test('reaches the branch arriving at it and the mark and name in it', () => {
    const { container } = mount();
    expect(wire('seat:dev').getAttribute('data-tone')).toBe('purple');
    expect(wire('unit:eng').getAttribute('data-tone')).toBeNull();
    expect(container.querySelector('.crewlet-org-label--row[data-tone="purple"]')).not.toBeNull();
    const toned = rule(SHEET, ".crewlet-org-label--row[data-tone='purple']");
    expect(toned).toMatch(/--crewlet-org-table-ink:\s*var\(--color-node-purple-ink\)/);
    expect(toned).toMatch(/--crewlet-org-table-wire:\s*var\(--color-node-purple-line\)/);
  });

  /*
   * AND NEVER THE CAPTION. The hue's accent clears 4.2:1 on the table's own
   * ground, which is over the floor for a drawing and under it for words, so
   * the word under the name stays in the neutral tertiary ink.
   */
  test('the caption is never painted by the hue', () => {
    // The table hands its hue to the shared label's MARK and NAME and to
    // nothing else; that the caption then stays the neutral tertiary ink is
    // measured in the label's own suite, in both themes and both layouts.
    expect(SHEET).toContain('.crewlet-org-label--row .crewlet-org-label__icon');
    expect(SHEET).toContain('.crewlet-org-label--row .crewlet-org-label__name');
    expect(SHEET).not.toContain('crewlet-org-label__caption');
  });
});

describe('the tree controls', () => {
  test('open and close every row, from a tab on the table edge', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.queryByText('Developer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByText('Developer')).toBeDefined();
  });

  test('a caller that wants none gets none', () => {
    mount({ controls: false });
    expect(screen.queryByRole('button', { name: 'Expand all' })).toBeNull();
  });

  /*
   * AND THEY DO NOT WEAR THE ADD'S DRAWING. The pair carried the plus and the
   * minus, so one mark meant "Expand all" at the table's top edge and "Add to
   * this row" on every row under it. The paths are read from what is rendered,
   * because an import says which component was asked for and not which drawing
   * arrived.
   */
  test('the pair is drawn as neither the add nor each other', () => {
    mount();
    const drawing = (name: string) =>
      screen.getByRole('button', { name }).querySelector('path')!.getAttribute('d');
    const add = within(row('unit:eng'))
      .getByRole('button', { name: 'Add to unit:eng' })
      .querySelector('path')!
      .getAttribute('d');
    expect(drawing('Expand all')).not.toBe(add);
    expect(drawing('Collapse all')).not.toBe(add);
    expect(drawing('Expand all')).not.toBe(drawing('Collapse all'));
  });

  /* The same three the grid offers, so a screen that focuses a node after an
     operation reaches it through this component as it does through the grid. */
  test('the handle reaches the grid', () => {
    const ref = createRef<TreeViewHandle>();
    mount({ ref });
    act(() => ref.current!.collapseAll());
    expect(screen.queryByText('Developer')).toBeNull();
    act(() => ref.current!.focusNode('unit:eng'));
    expect(document.activeElement).toBe(row('unit:eng'));
  });
});

describe('the add pill', () => {
  /*
   * IT IS THE CHART'S OWN PILL. The row used to draw a second one, with no
   * split, no divider and a boundary of its own; the gesture belongs to
   * `AddPill` and this component contributes the SLOT it opens in. So what is
   * asserted here is the composition and the slot, and the gesture itself is
   * that component's suite.
   */
  test('the row draws the package\'s one add pill, not a second one', () => {
    const { container } = mount();
    const add = container.querySelector('.crewlet-org-table__add');
    expect(add?.firstElementChild?.classList.contains('crewlet-add-pill')).toBe(true);
    expect(container.querySelector('.crewlet-org-table__pill')).toBeNull();
  });

  /*
   * THE PLUS IS NOT ONE OF THE ROW'S QUIET CONTROLS. Inside the strip it
   * inherited `opacity: 0`, so the control the console draws on every row at
   * rest could not be seen until the pointer was already on that row.
   */
  test('the add is a sibling of the strip, never inside it', () => {
    const { container } = mount();
    const add = container.querySelector('.crewlet-org-table__add')!;
    expect(add.closest('.crewlet-org-table__actions')).toBeNull();
    expect(add.parentElement?.getAttribute('role')).toBe('gridcell');
  });

  test('a press opens it and gives focus to the first kind it offers', async () => {
    mount();
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    const first = await screen.findByRole('button', { name: 'Add a unit' });
    await waitFor(() => expect(document.activeElement).toBe(first));
    expect(
      within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  test('picking a kind reports it and closes the pill', async () => {
    const { picked } = mount();
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add a seat' }));
    expect(picked).toHaveBeenCalledWith('unit:eng', 'seat');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add a seat' })).toBeNull());
  });

  /*
   * THE PRESS IS REPORTED TO THE GRID, which is the one thing the row adds to
   * the gesture: a treegrid has ONE tab stop, and the press moved focus into a
   * control inside a cell, so that cell has to become it. Without it a reader
   * who opened the pill and tabbed away came back somewhere else.
   */
  test('opening it tells the grid which cell now holds the focus', () => {
    const { container } = mount();
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    const cell = container.querySelector('.crewlet-org-table__add')!.parentElement!;
    expect(cell.getAttribute('aria-colindex')).toBe('2');
    expect(row('unit:eng').getAttribute('tabindex')).toBe('-1');
  });

  /* Closed, the kinds do not exist, which is what keeps them out of the tab
     order rather than a tabIndex that has to be kept in step with the state. */
  test('closed, it puts no kind in the tab order', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Add a unit' })).toBeNull();
    expect(
      within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });
});

/*
 * THE ROW'S CONTROLS ARE QUIET UNTIL THE ROW IS REACHED, and focus is one of
 * the three ways of reaching it: a control a keyboard can reach and nobody can
 * see is a control that fails the focus-visibility rule. jsdom has no layout,
 * so the three ways are read from the stylesheet.
 */
describe("a row's controls", () => {
  test('are revealed by the pointer, by focus and on the selected row', () => {
    for (const state of [':hover', ':focus-within', "[aria-selected='true']"]) {
      expect(
        SHEET.includes(`.crewlet-org-table [role='row']${state} .crewlet-org-table__actions`),
        state,
      ).toBe(true);
    }
    expect(rule(SHEET, '.crewlet-org-table__actions')).toMatch(/opacity:\s*0/);
  });

  /*
   * THE TRACK IS A NUMBER, NEVER `auto`, and the strip ENDS its cell. Every row
   * is its own grid, so an auto last track is as wide as that row's own
   * controls: the header holds none and measured 16px where a row measured
   * 108, which put every flexible column before it in a different place in the
   * header than in the rows.
   */
  test('the strip has a fixed track and ends its cell', () => {
    const frame = rule(SHEET, '.crewlet-org-table');
    expect(frame).toMatch(/--crewlet-org-table-actions: calc\(/);
    expect(frame).not.toMatch(/--crewlet-org-table-actions: auto/);
    expect(rule(SHEET, ".crewlet-org-table [role='gridcell']:last-child")).toMatch(
      /justify-content: flex-end/,
    );
  });

  /* A pointer that cannot hover never reaches a row, so on a touch screen the
     strip is simply drawn. Without this every control on the table is behind a
     state a phone has no way to enter. */
  test('are simply drawn where a pointer cannot hover', () => {
    expect(SHEET).toMatch(/@media \(hover: none\) \{\s*\.crewlet-org-table__actions \{\s*opacity: 1/);
  });
});

describe('a row name', () => {
  test('says its name and what kind of thing it is, and its mark says nothing', () => {
    const { container } = mount();
    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getAllByText('Unit').length).toBeGreaterThan(0);
    expect(container.querySelector('.crewlet-org-label__icon')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  /* The boundary a row standing for somebody outside the system wears, so it
     reads to somebody who cannot separate hues at all. */
  test('a dashed ring is a boundary rather than a hue', () => {
    const { container } = mount();
    // What the ring is DRAWN as is the shared label's, and measured there.
    expect(container.querySelector('.crewlet-org-label__icon--dashed')).not.toBeNull();
  });
});

/*
 * WHAT IS ACTUALLY DRAWN, read through the real cascade (apps/ui-tests
 * cascade.ts): the stylesheets go into the document with their length tokens
 * resolved, and every number below is what the cascade decides on the element
 * this component renders.
 *
 * WHY NOT THE FILE'S TEXT. Every number here was wrong at once, in a file that
 * said the right thing about each of them somewhere: a rule that reaches
 * nothing, a later rule that wins on source order and a base declaration that
 * ties with a modifier all read as correct in the source. jsdom resolves no
 * custom property and lays nothing out, so where a value is assembled from two
 * (the indent, the add's slot) each half is read from the cascade and the
 * arithmetic is done here.
 */
describe('what it draws', () => {
  let uninstall: (() => void) | null = null;
  const styled = () => {
    uninstall = installSheets(
      'OrgTable/OrgTable.css',
      // What a row SAYS is the shared label's, and the table points its ink at
      // it: both sheets have to be in the document for either to be measured.
      'OrgLabel/OrgLabel.css',
      'TreeGrid/TreeGrid.css',
      'AddPill/AddPill.css',
    );
  };
  afterEach(() => {
    uninstall?.();
    uninstall = null;
  });

  const table = (): HTMLElement => document.querySelector('.crewlet-org-table')!;

  /*
   * THE INDENT IS THE CONSOLE'S OWN 40px STEP. At half of it a seat four
   * levels down was offset 80px where the console offsets it 160, so the
   * indent that IS the answer to "where is this in the organization" read at
   * half strength. The width is the step times the row's own level, and jsdom
   * resolves neither var(), so the two are read separately and multiplied.
   */
  test('a row is indented one 40px step per level', () => {
    styled();
    mount();
    expect(px(table(), '--crewlet-org-table-indent')).toBe(40);
    expect(wire('seat:dev').style.getPropertyValue('--crewlet-org-table-depth')).toBe('2');
    const step = px(table(), '--crewlet-org-table-indent');
    const depth = Number(wire('seat:dev').style.getPropertyValue('--crewlet-org-table-depth'));
    expect(step * depth).toBe(80);
  });

  /*
   * A ROW IS TWO LINES TALL and stands on the tall row step. On the grid's own
   * 36px step a name over a caption had 1.8px of air above and below it, which
   * is what made these rows read as cramped beside the console's. The head's
   * row is not a row of the tree and keeps the shorter step.
   */
  test('a body row stands 48px and a column heading does not', () => {
    styled();
    mount();
    expect(px(row('unit:eng'), 'min-height')).toBe(48);
    const heading = screen.getAllByRole('row').find((one) => !one.hasAttribute('aria-level'))!;
    expect(px(heading, 'min-height')).toBe(36);
  });

  /*
   * THE PLUS IS AT ONE x ON EVERY ROW. The cell is end-aligned and the add
   * sits BEFORE the strip, so a row drawing fewer controls in the strip drags
   * the add along with it: measured on the running build, the company's row
   * draws no trash and no menu, its strip stood 28px against every other
   * row's 92, and the plus a reader scans down the table for was 64px to the
   * right of the one on the row beneath it. The strip keeps the room for the
   * three controls a row can draw whether or not it draws them.
   */
  test('the control strip keeps its room, so the add is at one place on every row', () => {
    styled();
    const { container } = mount();
    const strip = container.querySelector('.crewlet-org-table__actions')!;
    // Three control steps and the two gaps between them, resolved by the
    // cascade rather than written out: 28 * 3 + 4 * 2.
    expect(px(strip, 'min-width')).toBe(92);
    expect(getComputedStyle(strip).justifyContent).toBe('flex-end');
  });

  /*
   * THE NAME GROUP FILLS ITS CELL, which is what makes the name take the width
   * the fixed zones leave and the trailing slot sit at the column's end on
   * every row. At `0 1 auto` the group was as wide as its own name, so two
   * seats' live states never lined up.
   */
  test('the name group fills its cell and the name is what grows in it', () => {
    styled();
    const { container } = mount();
    const node = container.querySelector('.crewlet-org-label--row')!;
    expect(getComputedStyle(node).flexGrow).toBe('1');
    expect(getComputedStyle(container.querySelector('.crewlet-org-label__text')!).flexGrow).toBe(
      '1',
    );
  });

  /*
   * A ROW'S NAME CELL IS THE SHARED LABEL IN ITS ROW LAYOUT, which is what
   * every promise about what it says and how it is drawn now rests on:
   * `OrgLabel`'s own suite holds them, for this layout and the chart's at
   * once. What is left to hold here is that this cell really is that, in the
   * ROW layout: an alias that quietly drew the node layout would put centred
   * names down a column and every guard over there would still pass.
   *
   * A mark riding the caption keeping its size is one of the promises that
   * moved: it was the table's own rule and the chart never had it, and it now
   * covers both.
   */
  test('the name cell is the shared label, in the row layout', () => {
    styled();
    const { container } = mount();
    const cell = container.querySelector('.crewlet-org-label--row')!;
    expect(cell.querySelector('.crewlet-org-label__name')).not.toBeNull();
    // Ranged left, which is the row layout and not the chart's centring: a
    // column of centred names is a column nobody can scan.
    expect(getComputedStyle(cell.querySelector('.crewlet-org-label__text')!).textAlign).toBe(
      'start',
    );
  });

  /*
   * THE SLOT IS AS WIDE AS THE PILL IS OPEN. The pill used to open back over
   * the row and cover 50px of the Problems cell, which is the check's own
   * answer for that row; opening the other way it would have run off the end
   * of the row and out of the grid's scroller. So the row reserves it, and the
   * reservation is the pill's OWN measured section times the kinds it offers:
   * change one and this goes red rather than the pill quietly overhanging.
   */
  test('the row reserves exactly the width the open pill takes', async () => {
    styled();
    mount();
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    await screen.findByRole('button', { name: 'Add a unit' });
    const strip = document.querySelector('.crewlet-add-pill__sections')!;
    const sections = [...strip.querySelectorAll('.crewlet-add-pill__section')];
    expect(sections).toHaveLength(3);
    /* THE NUMBERS, not the expressions. A section is one pointer target, the
       slot is one per kind plus the pill's own boundary, and the slot is what
       the row reserved: a section moved onto another step, or a kind added
       without the count, takes this red. */
    const section = px(sections[0]!, 'width');
    const kinds = Number(
      getComputedStyle(table()).getPropertyValue('--crewlet-org-table-add-kinds').trim(),
    );
    expect(section).toBe(24);
    expect(kinds).toBe(sections.length);
    expect(px(document.querySelector('.crewlet-org-table__add')!, 'width')).toBe(
      section * kinds + 2,
    );
  });

  /*
   * AND IT SPLITS. The row's own pill had `animation-name: none` measured on
   * the live page: it appeared and vanished with no gesture at all, where the
   * console's table pill carries the same split as its chart's. One keyframe
   * pair, `AddPill`'s, reaching both surfaces.
   */
  test('the pill opens on the split the chart opens on', async () => {
    styled();
    mount();
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    await screen.findByRole('button', { name: 'Add a unit' });
    const strip = document.querySelector('.crewlet-add-pill__sections')!;
    expect(getComputedStyle(strip).animation).toMatch(/^crewlet-add-pill-open /);
  });
});

/*
 * AXE, over the table as it stands and with the add pill open, which is the
 * one state that puts controls on the page that were not there a moment ago.
 * It asserts the rules nobody here thought of, out of a table maintained by
 * people who do nothing else. Contrast is not among them: jsdom resolves no
 * custom property, so the hues on this table are measured from the stylesheet
 * instead (see the comment on the six hues in OrgTable.css).
 */
describe('axe', () => {
  const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

  async function violations(element: Element): Promise<string[]> {
    const result = await axe.run(element, { runOnly: { type: 'tag', values: WCAG } });
    return result.violations.map((one) => `${one.id}: ${one.nodes[0]?.failureSummary ?? ''}`);
  }

  test('the table has no violation, open pill included', async () => {
    const { container } = mount();
    expect(await violations(container)).toEqual([]);
    fireEvent.click(within(row('unit:eng')).getByRole('button', { name: 'Add to unit:eng' }));
    await screen.findByRole('button', { name: 'Add a unit' });
    expect(await violations(container)).toEqual([]);
  });
});
