/**
 * One label, two layouts: what a chart node and a table row both say.
 *
 * THE CASE THAT MATTERS MOST IS THE FIRST ONE. Two components drawing one
 * thing is how the two drifted apart in the first place, each gaining a fix
 * the other never got, so the guard against it coming back is that the two
 * layouts render the SAME element tree and differ only in the rules that reach
 * it. Everything else here is one of the seventeen declarations they are
 * allowed to disagree about, measured.
 *
 * MEASURED THROUGH THE REAL CASCADE (apps/ui-tests cascade.ts), never read off
 * the stylesheet: a guard that matches a string in a sheet passes while the
 * defect ships, because it cannot see a later rule that wins on source order
 * or a selector that matches nothing the component renders. The two exceptions
 * are the inks, and they say why where they stand.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { installCss, installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { OrgLabel } from './OrgLabel.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** The sheet in the document, with its lengths resolved. */
function styled() {
  uninstall?.();
  uninstall = installSheets('OrgLabel/OrgLabel.css');
}

/** The same, in one theme, so the cascade answers what is painted. */
function painted(theme: 'light' | 'dark') {
  uninstall?.();
  uninstall = installThemed(theme, 'OrgLabel/OrgLabel.css');
}

const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'OrgLabel.css'), 'utf8');

/** The declarations of the rule `selector` opens, without its comments. */
function rule(selector: string): string {
  const at = SHEET.indexOf(`${selector} {`);
  if (at < 0) return '';
  return SHEET.slice(at, SHEET.indexOf('}', at));
}

const part = (root: ParentNode, name: string) =>
  root.querySelector(`.crewlet-org-label__${name}`)!;

/*
 * THE WHOLE POINT OF THE COMPONENT.
 *
 * A chart node and a table row said the same four things about the same
 * organization in two components under two class prefixes, and the two
 * stylesheets agreed on 38 of the 62 declarations they set. Each had a fix the
 * other lacked: the node repainted a mark that published its own ink and the
 * row did not, and the row held every child of the caption to its size while
 * the node held only a bare glyph. Both are fixed for both surfaces by there
 * being one component, and the guard that it stays one is this.
 */
describe('one label under two layouts', () => {
  test('the two layouts render the same element tree', () => {
    const content = {
      icon: <svg />,
      name: 'Engineering',
      caption: 'Department',
      captionMarks: <svg className="mark" />,
      trailing: <span>idle</span>,
    } as const;
    const { container: node } = render(<OrgLabel {...content} />);
    const { container: row } = render(<OrgLabel layout="row" {...content} />);
    // The row wraps, because a table cell has nothing playing the part the
    // chart's own card plays. Inside that wrapper it is the same drawing.
    const wrapper = row.querySelector('.crewlet-org-label--row')!;
    expect(wrapper.innerHTML).toBe(node.innerHTML);
  });

  /*
   * AND THE NODE LAYOUT WRAPS NOTHING. `TreeCanvas`'s node appearance makes
   * the element the caller spreads `ctx.item` on the flex row that lays the
   * three zones out, so the zones have to be ITS children: a wrapper of this
   * component's own would leave the chart laying out one box with everything
   * inside it, and every node in the chart would be the same width.
   */
  test('a node renders the three zones and no box around them', () => {
    const { container } = render(<OrgLabel icon={<svg />} name="Eng" trailing={<span />} />);
    expect(container.querySelector('.crewlet-org-label')).toBeNull();
    expect([...container.children].map((el) => el.className)).toEqual([
      'crewlet-org-label__icon',
      'crewlet-org-label__text',
      'crewlet-org-label__trailing',
    ]);
  });

  /*
   * THE CLASS A CALLER PASSES LANDS ON THE OUTERMOST ELEMENT THE LAYOUT HAS,
   * which is the wrapper in a row and the text column in a node, where there
   * is no wrapper to put it on.
   */
  test('a caller class lands on the outermost element each layout has', () => {
    const { container: node } = render(<OrgLabel name="Eng" className="mine" />);
    expect(part(node, 'text').classList.contains('mine')).toBe(true);
    const { container: row } = render(<OrgLabel layout="row" name="Eng" className="mine" />);
    expect(row.firstElementChild!.classList.contains('mine')).toBe(true);
  });
});

describe('what a label says', () => {
  test('its name and what kind of thing it is, in either layout', () => {
    render(<OrgLabel icon={<span />} name="Engineering" caption="Department" />);
    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getByText('Department')).toBeDefined();
    cleanup();
    render(<OrgLabel layout="row" icon={<span />} name="Ada" caption="Human seat" />);
    expect(screen.getByText('Ada')).toBeDefined();
    expect(screen.getByText('Human seat')).toBeDefined();
  });

  /*
   * THE MARK SAYS NOTHING. The name is printed right beside it, so a reader
   * who cannot see the mark would otherwise hear "Engineering, Engineering".
   */
  test('the mark is out of the accessibility tree in either layout', () => {
    for (const layout of ['node', 'row'] as const) {
      cleanup();
      const { container } = render(<OrgLabel layout={layout} icon={<span />} name="Eng" />);
      expect(part(container, 'icon').getAttribute('aria-hidden')).toBe('true');
    }
  });

  /* Nothing asked for is no slot at all, rather than an empty one: that is the
     console chart's own node, and the difference between a node with room kept
     for a live state and a node that can never have one. */
  test('a label with no push slot asked for is drawn with none', () => {
    const { container } = render(<OrgLabel name="Eng" />);
    expect(container.querySelector('.crewlet-org-label__trailing')).toBeNull();
    const { container: asked } = render(<OrgLabel name="Eng" trailing={null} />);
    expect(asked.querySelector('.crewlet-org-label__trailing')).not.toBeNull();
  });
});

/*
 * THE SEVENTEEN DECLARATIONS THE TWO LAYOUTS ARE ALLOWED TO DISAGREE ABOUT, and
 * they are all one disagreement restated: a chart node is a box as wide as its
 * own name, and a table row is a line in a column.
 */
describe('what the layout decides', () => {
  /*
   * CENTRED IN A NODE, RANGED LEFT IN A ROW. Names centred in a column are a
   * column nobody can scan; a name ranged left in a node starts under the
   * mark's right edge and leaves a short one looking like a label with an
   * empty half.
   */
  test('a node centres its name and a row ranges it left', () => {
    styled();
    const { container: node } = render(<OrgLabel name="Eng" caption="Unit" />);
    expect(getComputedStyle(part(node, 'text')).textAlign).toBe('center');
    expect(getComputedStyle(part(node, 'text')).alignItems).toBe('center');
    // AND DOWN THE COLUMN TOO. The text column is a column of two lines inside
    // a rank the mark's zone stretches to fill, so a name with no caption under
    // it sits against the top of the node unless this centres it.
    expect(getComputedStyle(part(node, 'text')).justifyContent).toBe('center');
    expect(getComputedStyle(part(node, 'caption')).justifyContent).toBe('center');

    const { container: row } = render(<OrgLabel layout="row" name="Ada" caption="Human seat" />);
    expect(getComputedStyle(part(row, 'text')).textAlign).toBe('start');
    expect(getComputedStyle(part(row, 'text')).alignItems).toBe('stretch');
    expect(getComputedStyle(part(row, 'text')).justifyContent).toBe('flex-start');
    expect(getComputedStyle(part(row, 'caption')).justifyContent).toBe('flex-start');
  });

  /*
   * A MARK THE SIZE OF WHAT IT STANDS FOR, in whichever zone it is in. The
   * console chart draws a container at half its icon zone and the THING the
   * chart is about at three quarters of it, which is what lets a reader tell an
   * agent seat from a unit at the far end of a chart without reading either
   * caption. A row's zone is half a node's, and the same two proportions of it.
   */
  test('the mark half-fills or three-quarter-fills whichever zone it is in', () => {
    styled();
    const mark = (layout: 'node' | 'row', size: 'md' | 'lg') => {
      cleanup();
      const { container } = render(
        <OrgLabel layout={layout} name="Eng" icon={<svg />} iconSize={size} />,
      );
      return px(part(container, 'icon'), 'font-size');
    };
    // The node's zone is 44px: half of it is the 20px step and three quarters
    // is the 32px one.
    expect(mark('node', 'md')).toBe(20);
    expect(mark('node', 'lg')).toBe(32);
    // The row's is a small control step, 28px: 16 and 20 are the same pair of
    // proportions of it.
    expect(mark('row', 'md')).toBe(16);
    expect(mark('row', 'lg')).toBe(20);
  });

  test('the node zone is the large control step and the row zone the small one', () => {
    styled();
    const { container: node } = render(<OrgLabel name="Eng" icon={<svg />} />);
    expect(px(part(node, 'icon'), 'width')).toBe(44);
    // A node's zone is as tall as the card's first rank, which is what centres
    // a mark against a name that has a caption under it. A row is one rank, so
    // there is no second line to centre against and the wrapper's own centring
    // is what places it.
    expect(getComputedStyle(part(node, 'icon')).alignSelf).toBe('stretch');
    const { container: row } = render(<OrgLabel layout="row" name="Ada" icon={<svg />} />);
    expect(getComputedStyle(part(row, 'icon')).alignSelf).toBe('auto');
    expect(getComputedStyle(part(row, 'icon')).width).not.toBe(
      getComputedStyle(part(node, 'icon')).width,
    );
  });

  /*
   * THE PUSH SLOT KEEPS A FIXED ROOM IN A NODE. A node is `width: max-content`
   * and the chart relays whenever a measurement changes, so a slot that grew
   * with its content made the card 35px wider the moment a badge arrived, and a
   * state changing only its word ("idle" to "working") moved the node too. A
   * row sits in a grid that has already decided the column.
   */
  test('the push slot is a fixed room in a node and content-sized in a row', () => {
    styled();
    const slot = (layout: 'node' | 'row', trailing: React.ReactNode) => {
      const { container } = render(<OrgLabel layout={layout} name="Eng" trailing={trailing} />);
      return part(container, 'trailing');
    };
    const empty = slot('node', null);
    const two = slot(
      'node',
      <>
        <span>working on something long</span>
        <span>3 problems</span>
      </>,
    );
    // One control step of room and its own separation either side, whatever a
    // push delivered.
    for (const one of [empty, two]) expect(px(one, 'width')).toBe(56);
    for (const one of [empty, two]) expect(getComputedStyle(one).overflow).toBe('hidden');
    // AND IT IS SEPARATED FROM THE NAME. The row it sits in has no gap of its
    // own, so without this the name's box ended exactly where the badge's began.
    expect(px(empty, 'padding-left')).toBe(8);
    expect(px(empty, 'padding-right')).toBe(4);

    const inRow = slot('row', <span>idle</span>);
    expect(px(inRow, 'width')).toBe(0);
    expect(px(inRow, 'padding-left')).toBe(0);
    expect(getComputedStyle(inRow).overflow).toBe('visible');
  });

  /*
   * A NAME IS CAPPED BY ITSELF IN A NODE AND BY ITS CELL IN A ROW. A node is as
   * wide as its own name up to the chart's ceiling, so the name is capped at
   * the width it was given; a row's column is already a fixed width, and a cap
   * of its own would stop the name using the room the grid handed it.
   */
  test('a node caps its name at the width it was given and a row does not', () => {
    styled();
    const { container: node } = render(<OrgLabel name="Eng" />);
    expect(getComputedStyle(part(node, 'name')).maxWidth).toBe('100%');
    const { container: row } = render(<OrgLabel layout="row" name="Ada" />);
    expect(getComputedStyle(part(row, 'name')).maxWidth).toBe('none');
  });
});

/*
 * THE TWO FIXES THE SPLIT COST, EACH OF WHICH ONE SURFACE HAD AND THE OTHER
 * DID NOT. Both hold for both layouts now, which is the part of this change
 * that is a bug fix rather than a consolidation.
 */
describe('what each surface used to be missing', () => {
  /*
   * THE ZONE IS ONE INK, and the mark takes it whatever it arrived painted in.
   * A mark may publish its own hue as a `color` on its own root (the Crewlet
   * figure does, from the brand token), and `currentcolor` under that root then
   * resolves to THAT: forced by fill alone the zone's ink was overridden by
   * exactly the value it was replacing. The chart had the `color: inherit` that
   * makes the fill rule true and the TABLE never did.
   */
  test('a mark that publishes its own ink is repainted, in either layout', () => {
    for (const layout of ['node', 'row'] as const) {
      painted('dark');
      // The figure's own stylesheet, which lives in the icons package and sets
      // the brand hue on the mark's own root.
      const own = installCss('.crewlet-figure { color: #7c56ff; }');
      const { container } = render(
        <OrgLabel
          layout={layout}
          icon={
            <svg className="crewlet-figure">
              <path d="M0 0h1v1H0z" />
            </svg>
          }
          name="Ada"
        />,
      );
      const svg = container.querySelector('.crewlet-org-label__icon svg')!;
      expect(getComputedStyle(svg).color, layout).not.toBe('rgb(124, 86, 255)');
      own();
      cleanup();
    }
  });

  /*
   * EVERY CHILD OF THE CAPTION BUT THE WORD KEEPS ITS SIZE, so a label is the
   * same height with three marks as with none. A mark arrives as a bare glyph
   * or as a glyph inside a span that names it for a reader who cannot see it,
   * and the chart's rule sized only the bare one: a named mark shrank with the
   * strip around it. The word is the one child that may shrink, because it is
   * the one that truncates.
   */
  test('every child of the caption but the word keeps its size, in either layout', () => {
    styled();
    for (const layout of ['node', 'row'] as const) {
      const { container } = render(
        <OrgLabel
          layout={layout}
          name="Ada"
          caption="Agent seat"
          captionMarks={
            <>
              <span className="named">
                <svg />
              </span>
              <svg className="bare" />
            </>
          }
        />,
      );
      const caption = part(container, 'caption');
      expect(getComputedStyle(caption.querySelector('.named')!).flexShrink, layout).toBe('0');
      expect(getComputedStyle(caption.querySelector('.bare')!).flexShrink, layout).toBe('0');
      expect(getComputedStyle(part(container, 'kind')).flexShrink, layout).toBe('1');
      cleanup();
    }
  });
});

describe('the marks and the words', () => {
  /*
   * THE DASHED RING is the boundary something standing for somebody outside the
   * system wears, around the mark rather than instead of it. A boundary rather
   * than a hue, so it reads to somebody who cannot separate hues at all.
   */
  test('the dashed ring is drawn as a boundary, not as a colour', () => {
    const { container } = render(<OrgLabel name="Ada" iconRing="dashed" />);
    expect(container.querySelector('.crewlet-org-label__icon--dashed')).not.toBeNull();
    expect(rule('.crewlet-org-label__icon--dashed::before')).toContain('border: 1px dashed');
    const { container: none } = render(<OrgLabel name="Ada" />);
    expect(none.querySelector('.crewlet-org-label__icon--dashed')).toBeNull();
  });

  /*
   * A NAME THAT WRAPPED WOULD BE A TALLER NODE, and a taller node is a new
   * layout for the whole chart; in a table it would make one row two ranks and
   * push the table's rhythm off. It truncates instead, in both.
   */
  test('the name is one line and truncates, in either layout', () => {
    styled();
    for (const layout of ['node', 'row'] as const) {
      const { container } = render(<OrgLabel layout={layout} name="A very long name indeed" />);
      const name = getComputedStyle(part(container, 'name'));
      expect(name.whiteSpace, layout).toBe('nowrap');
      expect(name.textOverflow, layout).toBe('ellipsis');
      expect(name.overflow, layout).toBe('hidden');
      cleanup();
    }
  });

  /*
   * THE CAPTION RECEDES BY INK, and it is the NEUTRAL ink on a toned node and a
   * toned row alike: the hue's own step measures 4.2:1 on both grounds, over
   * the floor for a drawing and under it for a word. Drawn in the hue, the one
   * word that names what a thing IS was drawn in two colours across the two
   * surfaces of one page.
   */
  test('the caption is the neutral tertiary ink in both themes and both layouts', () => {
    for (const theme of ['dark', 'light'] as const) {
      for (const layout of ['node', 'row'] as const) {
        painted(theme);
        const { container } = render(
          <OrgLabel layout={layout} name="Eng" caption="Department" />,
        );
        expect(getComputedStyle(part(container, 'caption')).color, `${theme}/${layout}`).toBe(
          rgb(themes[theme].color.text.tertiary),
        );
        cleanup();
      }
    }
  });

  /*
   * ONE ANSWER REACHES THE WORDS. A node's name reads the variable its chart
   * card publishes, so the hue on the card, its edge, its halo and its branch
   * is the hue its name is written in; a row's reads the one the table
   * publishes (`OrgTable.css`, beside the rules that produce it).
   *
   * READ FROM THE SHEET, which is the one thing here that is. jsdom resolves no
   * custom property, so a declaration naming one is dropped and the cascade
   * reports nothing at all: there is no computed answer to ask for. Both names
   * are held to being DECLARED somewhere the component renders by the cases
   * above, which measure the elements these rules select.
   */
  test('a name takes the ink its own surface publishes', () => {
    expect(rule('.crewlet-org-label__name')).toContain(
      'color: var(--crewlet-tree-canvas-card-ink, var(--color-text-primary))',
    );
    const table = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../OrgTable/OrgTable.css'),
      'utf8',
    );
    expect(table).toContain('color: var(--crewlet-org-table-ink)');
    expect(table).toContain('color: var(--crewlet-org-table-accent)');
  });
});

/** A theme colour as the cascade reports it. */
function rgb(value: string): string {
  const hex = parseHex(value.trim());
  if (!hex) return value;
  return `rgb(${hex.r}, ${hex.g}, ${hex.b})`;
}
