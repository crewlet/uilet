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
import { channels, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
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
   * node that silently stopped drawing a seat's badge, a large mark or a push
   * slot, with nothing in either suite to say so.
   */
  test('hands the shared label every answer it was given', () => {
    const { container } = render(
      <OrgNodeLabel
        icon={<svg />}
        iconSize="lg"
        name="Ada"
        caption="Agent seat"
        captionMarks={<svg className="mark" />}
        trailing={<span>idle</span>}
        className="mine"
      />,
    );
    expect(container.querySelector('.crewlet-org-label__icon--lg')).not.toBeNull();
    expect(container.querySelector('.crewlet-org-label__kind')!.textContent).toBe('Agent seat');
    expect(container.querySelector('.crewlet-org-label__caption .mark')).not.toBeNull();
    expect(container.querySelector('.crewlet-org-label__trailing')!.textContent).toBe('idle');
    expect(container.querySelector('.crewlet-org-label__text')!.classList.contains('mine')).toBe(
      true,
    );
  });

  /*
   * A SEAT'S NODE LEADS WITH ITS BADGE, in the node's own layout: its kind is
   * the outline, a squircle for an agent and a circle for a person, and the
   * node draws no second cue for it.
   */
  test("leads a seat's node with its badge, its kind as the outline", () => {
    const { container } = render(
      <>
        <OrgNodeLabel name="CTO" caption="Agent" avatar={{ name: 'CTO', kind: 'agent' }} />
        <OrgNodeLabel name="Jane Founder" caption="Human" avatar={{ name: 'Jane Founder', kind: 'human' }} />
      </>,
    );
    const badges = [...container.querySelectorAll('.crewlet-org-label__icon .crewlet-avatar')];
    expect(badges.map((badge) => badge.className.match(/crewlet-avatar--(agent|human)/)?.[1])).toEqual([
      'agent',
      'human',
    ]);
    // The node layout's badge, the approved org chart's 26px: the sm step.
    for (const badge of badges) expect(badge.className).toContain('crewlet-avatar--sm');
    expect(container.innerHTML).not.toContain('dashed');
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
  test('with nothing set it is an empty slot: no ground, a dashed edge, the quieter ink', () => {
    for (const theme of ['dark', 'light'] as const) {
      drawn(theme);
      cleanup();
      const { container } = render(<OrgNodeLead empty>Lead</OrgNodeLead>);
      const pill = container.querySelector('.crewlet-org-node-lead__pill--empty');
      expect(pill, theme).not.toBeNull();
      const style = getComputedStyle(pill!);
      expect(['transparent', 'rgba(0, 0, 0, 0)'], theme).toContain(style.backgroundColor);
      expect(style.borderTopStyle, theme).toBe('dashed');
      expect(style.borderTopWidth, theme).toBe('1px');
      expect(channels(style.borderTopColor), theme).toEqual(channels(themes[theme].color.border.hover));
      expect(channels(style.color), theme).toEqual(channels(themes[theme].color.text.tertiary));
    }
  });

  /*
   * NEVER A FRAME ROUND A VALUE. The node it sits in is already framed, and a
   * frame 4px inside that one round a set lead (or a rule across the top of
   * the strip) is two lines round one thing, so a set lead is told apart by
   * its ground. Only an empty slot keeps an edge, and that edge is dashed.
   */
  test('a set lead draws no line of its own: neither a rule over the strip nor a frame round the pill', () => {
    drawn();
    const { container } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
    expect(getComputedStyle(container.querySelector('.crewlet-org-node-lead')!).borderTopWidth).not.toBe(
      '1px',
    );
    expect(getComputedStyle(container.querySelector('.crewlet-org-node-lead__pill')!).borderTopStyle).not.toBe(
      'dashed',
    );
    expect(SHEET).not.toContain('.crewlet-org-node-lead::before');
    expect(rule('.crewlet-org-node-lead__pill')).not.toMatch(/border(-style)?:/);
    expect(rule('.crewlet-org-node-lead__pill--empty')).toContain('border: 1px dashed');
  });

  /*
   * THE WHOLE PILL IS THE CONTROL, AND THE WHOLE PILL LIGHTS. A menu's trigger
   * arrives inside the menu's own anchor, which left the control the width of
   * its word and its ghost hover a patch round that word in the middle of the
   * pill. The wrapper fills the pill, the control paints no ground of its own,
   * and the pill takes the hover step while the control is reached or open.
   */
  test('a control in the pill fills it through its wrapper, and the pill is what lights', () => {
    drawn();
    const { container } = render(
      <OrgNodeLead empty>
        <span className="anchor">
          <button type="button" className="crewlet-btn crewlet-btn--ghost">
            Lead
          </button>
        </span>
      </OrgNodeLead>,
    );
    const anchor = container.querySelector('.anchor')!;
    expect(getComputedStyle(anchor).display).toBe('flex');
    expect(getComputedStyle(anchor).flexGrow).toBe('1');
    expect(rule('.crewlet-org-node-lead__pill > :has(> .crewlet-btn)')).toContain('flex: 1');
    const quiet = rule(
      ".crewlet-org-node-lead__pill\n  .crewlet-btn:is(:hover, :active):not(:disabled):not([aria-disabled='true'])",
    );
    expect(quiet).toContain('background: none');
    const lit = rule(".crewlet-org-node-lead__pill:has(.crewlet-btn[aria-expanded='true'])");
    expect(lit).toContain('var(--color-surface-hover)');
    expect(SHEET).toContain(
      ".crewlet-org-node-lead__pill:has(.crewlet-btn:hover:not(:disabled):not([aria-disabled='true'])),",
    );
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
   * THE CLEAR DOES NOT MOVE THE NAME. In the row it pushed "Lead: Ada" half its
   * own width off the pill's middle; drawn over the pill's end, with the same
   * room kept at both ends of the lead's control, the name is centred on the
   * whole pill and stops short of the clear.
   */
  test('the clear is drawn over the pill end, and the name stays centred on the whole pill', () => {
    drawn();
    const { container } = render(
      <OrgNodeLead clear={<button type="button" className="crewlet-icon-btn" aria-label="Clear" />}>
        <span className="anchor">
          <button type="button" className="crewlet-btn crewlet-btn--ghost">
            Lead: Ada
          </button>
        </span>
      </OrgNodeLead>,
    );
    expect(getComputedStyle(container.querySelector('.crewlet-org-node-lead__clear')!).position).toBe('absolute');
    const control = rule(
      '.crewlet-org-node-lead__pill:has(> .crewlet-org-node-lead__clear)\n  .crewlet-btn:not(.crewlet-org-node-lead__clear *)',
    );
    expect(control).toContain('padding-inline: var(--spacing-4)');
  });

  /*
   * POINTED AT, THE CLEAR PAINTS NO GROUND. A ghost control fills its whole
   * 24px target on hover, which drew a circle twice the disc's size round a
   * 12px mark; the clear brightens instead.
   */
  test('the clear fills nothing when it is pointed at or pressed', () => {
    expect(
      rule(
        ".crewlet-org-node-lead__clear\n  :is(.crewlet-btn, .crewlet-icon-btn):is(:hover, :active):not(:disabled):not([aria-disabled='true'])",
      ),
    ).toContain('background: none');
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
      // THE PILL'S OWN RAISED STEP, in both themes, so the disc is drawn by its
      // ring. The console chart's white 0.08 is the card's own value on a light
      // theme: a disc drawn by its ground would vanish on half the deployments.
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
   * THE PILL IS A RAISED GROUND AROUND A VALUE, on the step a chip with no
   * boundary of its own takes, which the palette suite holds off the card on
   * both themes: found by its ground, on the one fact a unit's node states.
   */
  test('the pill is raised rather than framed, and its words carry weight', () => {
    for (const theme of ['dark', 'light'] as const) {
      drawn(theme);
      cleanup();
      const { container } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
      const pill = getComputedStyle(container.querySelector('.crewlet-org-node-lead__pill')!);
      expect(channels(pill.backgroundColor), theme).toEqual(channels(themes[theme].color.surface.elevated));
      expect(pill.fontWeight, theme).toBe(font.weight.medium);
    }
    drawn();
    cleanup();
    const { container } = render(<OrgNodeLead>Lead: Ada</OrgNodeLead>);
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
