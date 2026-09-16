/**
 * What an org chart node says, and the two promises it makes about SIZE.
 *
 * A chart lays its nodes out by measuring them, so anything on a node that can
 * arrive from a push has to sit in a slot whose room is kept whether or not it
 * holds something, and the name has to be one line whatever it says. jsdom has
 * no layout, so the rules that hold both are read from the stylesheet and the
 * structure that carries them from the render.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { font, themes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { OrgNodeDisclosure, OrgNodeLabel, OrgNodeLead } from './OrgNode.js';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** The sheet in the dark theme, so the cascade answers what is painted. */
function drawn(theme: 'light' | 'dark' = 'dark') {
  uninstall?.();
  uninstall = installThemed(theme, 'OrgNode/OrgNode.css');
}

/** A colour the cascade reports, as the three channels. */
function channels(value: string): { r: number; g: number; b: number } {
  const hex = parseHex(value.trim());
  if (hex) return hex;
  const parts = /rgba?\(([^)]+)\)/
    .exec(value)?.[1]
    ?.split(',')
    .map((one) => Number.parseFloat(one));
  if (!parts || parts.length < 3) throw new Error(`not a colour: ${value}`);
  return { r: parts[0]!, g: parts[1]!, b: parts[2]! };
}

const SHEET = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'OrgNode.css'), 'utf8');

/** The declarations of the rule `selector` opens, without its comments. */
function rule(selector: string): string {
  const at = SHEET.indexOf(`${selector} {`);
  if (at < 0) return '';
  return SHEET.slice(at, SHEET.indexOf('}', at));
}

/*
 * WHAT A NODE SAYS IS `OrgLabel`, and its own suite holds every promise about
 * it, for both layouts at once. What is left to hold here is that this name
 * still reaches it in the NODE layout: an alias that quietly drew a row would
 * put centred names into a column, or ranged-left ones into a chart, and every
 * guard over there would still pass.
 */
describe('the node label', () => {
  test('is the shared label in its node layout', () => {
    const { container } = render(<OrgNodeLabel icon={<svg />} name="Engineering" caption="Unit" />);
    expect(screen.getByText('Engineering')).toBeDefined();
    // No wrapper, which is the node layout and not the row's: the chart lays
    // the three zones out itself, so they have to be its own children.
    expect(container.querySelector('.crewlet-org-label--row')).toBeNull();
    expect([...container.children].map((el) => el.className)).toEqual([
      'crewlet-org-label__icon',
      'crewlet-org-label__text',
    ]);
  });

  /*
   * AND IT PASSES EVERYTHING ON. A thin alias that dropped a prop would be a
   * node that silently stopped drawing a ring, a large mark or a push slot,
   * with nothing in either suite to say so.
   */
  test('hands the shared label every answer it was given', () => {
    const { container } = render(
      <OrgNodeLabel
        icon={<svg />}
        iconRing="dashed"
        iconSize="lg"
        name="Ada"
        caption="Agent seat"
        captionMarks={<svg className="mark" />}
        trailing={<span>idle</span>}
        className="mine"
      />,
    );
    expect(container.querySelector('.crewlet-org-label__icon--dashed')).not.toBeNull();
    expect(container.querySelector('.crewlet-org-label__icon--lg')).not.toBeNull();
    expect(container.querySelector('.crewlet-org-label__kind')!.textContent).toBe('Agent seat');
    expect(container.querySelector('.crewlet-org-label__caption .mark')).not.toBeNull();
    expect(container.querySelector('.crewlet-org-label__trailing')!.textContent).toBe('idle');
    expect(container.querySelector('.crewlet-org-label__text')!.classList.contains('mine')).toBe(
      true,
    );
  });
});

describe('a lead', () => {
  test('says who leads the unit', () => {
    render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
    expect(screen.getByText('Lead: Ada')).toBeDefined();
  });

  /*
   * A UNIT WITH NO LEAD HAS A PLACE FOR ONE. The empty pill is what invites
   * the reader to set it; a blank strip along the bottom edge says nothing at
   * all and reads as a rendering fault.
   */
  test('with nothing set it is drawn as the outline of a pill', () => {
    const { container } = render(<OrgNodeLead empty>Lead</OrgNodeLead>);
    const pill = container.querySelector('.crewlet-org-node-lead__pill--empty');
    expect(pill).not.toBeNull();
    expect(rule('.crewlet-org-node-lead__pill--empty')).toContain('border-style: dashed');
  });

  /*
   * IT IS SEPARATED FROM THE NAME ABOVE, so the node reads as a thing with a
   * lead rather than as two lines of text that happen to be in one box.
   */
  test('a hairline divides it from the name above, inset at both ends', () => {
    drawn();
    const { container } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
    const strip = container.querySelector('.crewlet-org-node-lead')!;
    // Drawn rather than bordered, because every hairline inside a node of the
    // console chart is inset by the node's own 4px and a border cannot be
    // shorter than the box it is on.
    expect(getComputedStyle(strip).borderTopWidth).not.toBe('1px');
    const drawnRule = rule('.crewlet-org-node-lead::before');
    expect(drawnRule).toContain('left: var(--spacing-1)');
    expect(drawnRule).toContain('right: var(--spacing-1)');
    expect(drawnRule).toContain('height: 1px');
  });

  /*
   * ONE PRESS TO CLEAR IT. The menu that sets a lead can also unset one, so a
   * unit whose lead is wrong was two presses and a list away from having none;
   * the console chart draws a small X inside the pill for exactly this.
   */
  test('the clear control is drawn inside the pill, and only when one is given', () => {
    drawn();
    const { container: none } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
    expect(none.querySelector('.crewlet-org-node-lead__clear')).toBeNull();

    const { container } = render(
      <OrgNodeLead clear={<button type="button" aria-label="Clear the lead of Engineering" />}>
        Lead: Ada
      </OrgNodeLead>,
    );
    const clear = container.querySelector('.crewlet-org-node-lead__clear')!;
    expect(clear.closest('.crewlet-org-node-lead__pill')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Clear the lead of Engineering' })).toBeDefined();
  });

  /*
   * DRAWN SMALL, HIT FULL SIZE. The strip is half a rank, which is under the
   * pointer-target floor on its own, so the target is grown past the pill's
   * edge into the node's bottom padding.
   */
  test('the clear control is a pointer target whatever it is drawn at', () => {
    drawn();
    const { container } = render(
      <OrgNodeLead clear={<button type="button" className="crewlet-icon-btn" aria-label="Clear" />}>
        Lead: Ada
      </OrgNodeLead>,
    );
    const button = container.querySelector('.crewlet-org-node-lead__clear .crewlet-icon-btn')!;
    expect(px(button, 'width')).toBe(24);
    expect(px(button, 'height')).toBe(24);
    expect(px(button, 'min-height')).toBe(24);
  });

  /*
   * AND WHAT IS DRAWN IS A DISC A THIRD OF THE TARGET'S SIZE, with a ground
   * and a boundary of its own and a glyph barely a third of that again, which
   * is the console chart's drawing: a four-unit disc inside an eighteen-unit
   * strip. Drawn as an ELEMENT rather than as the control's own pseudo,
   * because what a node is painted with is a promise this package measures and
   * no cascade reports a pseudo element's paint.
   */
  test('the clear is drawn as a small disc with a glyph inside it', () => {
    for (const theme of ['dark', 'light'] as const) {
      drawn(theme);
      cleanup();
      const { container } = render(
        <OrgNodeLead
          clear={
            <button type="button" className="crewlet-icon-btn" aria-label="Clear">
              <svg />
            </button>
          }
        >
          Lead: Ada
        </OrgNodeLead>,
      );
      const disc = container.querySelector('.crewlet-org-node-lead__disc')!;
      expect(px(disc, 'width'), theme).toBe(12);
      expect(px(disc, 'height'), theme).toBe(12);
      expect(getComputedStyle(disc).pointerEvents, theme).toBe('none');
      // A STEP PAST THE CARD, in both themes. The console chart draws this at
      // white 0.08, which over its dark card is a disc a reader can see and on
      // a light one is the card's own value: the disc would vanish on half the
      // deployments. The step past the card is that relationship in both.
      expect(channels(getComputedStyle(disc).backgroundColor), theme).toEqual(
        channels(themes[theme].color.surface.elevated),
      );
      expect(channels(getComputedStyle(disc).borderTopColor), theme).toEqual(
        channels(themes[theme].color.border.hover),
      );
      expect(px(container.querySelector('.crewlet-org-node-lead__clear svg')!, 'width'), theme).toBe(
        8,
      );
    }
  });

  /*
   * THE PILL IS A BOUNDARY AROUND A VALUE, at the step the console chart draws
   * it: every other line inside a node there is the separator's, and this one
   * is heavier. At the separator's own alpha the pill was a rectangle a reader
   * had to look for, on the one fact a unit's node states.
   */
  test('the pill is bounded at the hover step and its words carry weight', () => {
    drawn();
    const { container } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
    const pill = getComputedStyle(container.querySelector('.crewlet-org-node-lead__pill')!);
    expect(channels(pill.borderTopColor)).toEqual(channels(themes.dark.color.border.hover));
    expect(pill.fontWeight).toBe(font.weight.medium);
    // Half a rank, which is the strip the console chart draws: 14 units of its
    // own 18, taken up by the ratio between its 10px name and this scale's.
    expect(px(container.querySelector('.crewlet-org-node-lead__pill')!, 'min-height')).toBe(20);
  });
});

/*
 * THE DISCLOSURE. A chart that can collapse owes a reader a control for it,
 * and the one place it must never be is the branch, where the add already is:
 * an add pill splitting open covers whatever was beside it. So it goes at the
 * START of the node, which is where every outline, file tree and nested table
 * a reader has met puts one.
 */
/*
 * A CHART NODE, in the shape a chart draws: the disclosure is a SIBLING of the
 * treeitem, never a child of it, which is the whole reason it is a component
 * rather than a slot on the label.
 */
const chartNode = (selected: boolean) => (
  <div className="crewlet-tree-canvas crewlet-tree-canvas--node">
    <div className="crewlet-tree-canvas__card">
      <div role="treeitem" aria-selected={selected}>
        <OrgNodeLabel icon={<span />} name="Engineering" />
      </div>
      <OrgNodeDisclosure>
        <button type="button" className="crewlet-icon-btn" tabIndex={-1} aria-label="Collapse it" />
      </OrgNodeDisclosure>
    </div>
  </div>
);

describe('the disclosure', () => {
  /*
   * HIDDEN FROM ASSISTIVE TECHNOLOGY, and a component of its own so it can be
   * rendered BESIDE the treeitem rather than inside it. A tree's items hold
   * nothing focusable: a control in one is a control the tree pattern cannot
   * navigate to and a screen reader reading element by element meets as a
   * stray button. It costs a reader nothing, because expansion is on the
   * treeitem itself as `aria-expanded` and the arrow keys, so what is hidden
   * is a duplicate rather than a way in.
   */
  test('hides itself, the way every other control on a node does', () => {
    const { container } = render(
      <OrgNodeDisclosure>
        <button type="button" tabIndex={-1} aria-label="Collapse Engineering" />
      </OrgNodeDisclosure>,
    );
    const slot = container.querySelector('.crewlet-org-node__leading')!;
    expect(slot.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Collapse Engineering' })).toBeNull();
  });

  /*
   * A PRESS IN IT BELONGS TO THE NODE, so the chart's own press props reach
   * this element the way they reach the strip under a card: the component owns
   * what cannot be forgotten and the caller passes the one thing only the
   * chart knows. Left to each call site to remember on whatever it happened to
   * put inside, a press would leave focus on an element the tree cannot
   * navigate to and no reader can hear.
   */
  test("the chart's press reaches it, and cannot un-hide it", () => {
    const onMouseDown = vi.fn();
    const { container } = render(
      <OrgNodeDisclosure
        onMouseDown={onMouseDown}
        {...({ 'aria-hidden': 'false' } as Record<string, string>)}
      >
        <button type="button" tabIndex={-1} aria-label="Collapse Engineering" />
      </OrgNodeDisclosure>,
    );
    const slot = container.querySelector('.crewlet-org-node__leading')!;
    fireEvent.mouseDown(slot);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    // The hiding is the component's and a spread cannot take it away.
    expect(slot.getAttribute('aria-hidden')).toBe('true');
  });

  /*
   * AND THE LABEL TAKES NO SLOT FOR IT. Drawn as part of the label it was
   * inside the element a chart spreads `ctx.item` on, whatever it was marked
   * with, which is the structural half of the rule above.
   */
  test('is not a slot on the label, which renders inside the treeitem', () => {
    const { container } = render(<OrgNodeLabel icon={<span />} name="Engineering" />);
    expect(container.querySelector('.crewlet-org-node__leading')).toBeNull();
  });

  /*
   * ON A CHART NODE IT STRADDLES THE CARD'S LEADING BOUNDARY AND IS OUT OF THE
   * FLOW, exactly as the add straddles the bottom one. So a node that can be
   * expanded is the same width, the same height and in the same place as one
   * that cannot, and nothing here can relay the chart; and the zones across a
   * node stay the two the console chart draws, rather than becoming three with
   * an empty one on every seat.
   *
   * CENTRED ON THE NODE'S FIRST RANK, for the reason the actions column stops
   * there: a node may carry a strip along its bottom edge stating a fact, and
   * a control centred over the pair would sit beside the fact rather than
   * beside the name it acts on.
   */
  test('a chart node draws it on the card boundary, out of the flow', () => {
    uninstall?.();
    uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css', 'OrgNode/OrgNode.css');
    const { container } = render(chartNode(false));
    const slot = container.querySelector('.crewlet-org-node__leading')!;
    const style = getComputedStyle(slot);
    expect(style.position).toBe('absolute');
    expect(style.left).toBe('0px');
    // Half a rank down from the card's own top, and pulled back by half its
    // own size, so it is centred on the name's row and on the boundary.
    expect(px(slot, 'top')).toBe(24);
    expect(style.transform).toBe('translate(-50%, -50%)');
  });

  /*
   * AND IT IS QUIET UNTIL THE NODE IS REACHED, with the actions column and the
   * lead's own clear: a chart of a hundred nodes is not a hundred chevrons
   * drawn over a picture of an organization. Selection is the reveal a suite
   * with no pointer can take; hover and focus are the same rule.
   */
  test('it is quiet at rest and drawn when the node is reached', () => {
    uninstall?.();
    uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css', 'OrgNode/OrgNode.css');
    const { container } = render(chartNode(false));
    const slot = () => container.querySelector('.crewlet-org-node__leading')!;
    expect(getComputedStyle(slot()).opacity).toBe('0');
    expect(getComputedStyle(slot()).pointerEvents).toBe('none');
    cleanup();

    const { container: reached } = render(chartNode(true));
    const shown = reached.querySelector('.crewlet-org-node__leading')!;
    expect(getComputedStyle(shown).opacity).toBe('1');
    expect(getComputedStyle(shown).pointerEvents).toBe('auto');
  });

  /*
   * AND WHAT IS DRAWN IS A DISC AT THE POINTER TARGET'S OWN SIZE, on the
   * node's own ground: the boundary it straddles stops at its edge rather than
   * running through the chevron. It is only ever seen on a node already
   * reached, so there is no resting chart for it to be quiet on.
   */
  test('the disclosure is a whole target, on the node ground', () => {
    uninstall?.();
    uninstall = installThemed('dark', 'TreeCanvas/TreeCanvas.css', 'OrgNode/OrgNode.css');
    const { container } = render(chartNode(true));
    const button = container.querySelector('.crewlet-org-node__leading .crewlet-icon-btn')!;
    expect(px(button, 'width')).toBe(24);
    expect(px(button, 'height')).toBe(24);
    expect(channels(getComputedStyle(button).backgroundColor)).toEqual(
      channels(themes.dark.color.surface.background),
    );
    const { r, g, b } = channels(themes.dark.color.surface.subtle);
    expect(getComputedStyle(button).backgroundImage).toContain(`rgb(${r}, ${g}, ${b})`);
  });
});
