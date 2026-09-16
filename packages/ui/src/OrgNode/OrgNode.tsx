/**
 * What an org chart node carries, beyond what it says.
 *
 * THE CHART DRAWS THE NODE, THIS DRAWS WHAT HANGS OFF IT. `TreeCanvas` owns
 * the node's frame, its zones, the tone it may be tinted with, the actions
 * column and the control under it. What a node SAYS, which is the part a table
 * row says in the same words, is `OrgLabel`: the mark, the name, the caption
 * under it and the slot a push arrives in were written once for each surface
 * and are written once for both now, with `OrgNodeLabel` below the name a
 * chart caller keeps using.
 *
 * WHAT IS LEFT HERE IS WHAT ONLY A NODE HAS. A row of a table has no disclosure
 * on its leading edge, because a grid indents instead, and no strip along its
 * bottom edge stating who leads the unit, because a column already says that
 * on its own. Both are drawn as SIBLINGS of what the chart spreads `ctx.item`
 * on rather than inside it, which is why each is a component rather than a
 * slot: a tree's items hold nothing focusable.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { OrgLabel, type OrgLabelContent } from '../OrgLabel/index.js';

/**
 * What a node says, which is what a ROW of the table beside it says too:
 * `OrgLabel`, with the layout filled in.
 *
 * KEPT AS A NAME OF ITS OWN because a chart node is what a caller of this
 * folder is drawing, and `OrgLabel layout="node"` at every call site would be
 * the parameter repeated rather than a component named after its job. It adds
 * nothing and takes nothing away: the props are the shared ones exactly.
 */
export type OrgNodeLabelProps = OrgLabelContent;

/** The icon, name and caption of an org chart node. */
export function OrgNodeLabel(props: OrgNodeLabelProps) {
  return <OrgLabel layout="node" {...props} />;
}

export interface OrgNodeDisclosureProps extends HTMLAttributes<HTMLDivElement> {
  /** The control itself, named and carrying `tabIndex={-1}`. */
  children: ReactNode;
}

/**
 * The control that opens and closes what hangs under a node, on its LEADING
 * EDGE.
 *
 * NOT ON THE BRANCH, which is the one place it must never be. What hangs under
 * a node is the control that ADDS a child, on the node's own axis, and it is
 * the only thing there: a second control beside it is two controls fighting
 * for one place, and an add pill that splits open covers whatever was next to
 * it. So a chart that can collapse puts the disclosure where every hierarchy a
 * reader has used puts one, at the start of the row, and the branch keeps the
 * add alone.
 *
 * BESIDE THE TREEITEM, NOT INSIDE IT, which is why this is a component of its
 * own rather than a slot on the label. A tree's items hold nothing focusable:
 * a control inside one is a control the tree pattern cannot navigate to and a
 * screen reader reading element by element meets as a stray button. Drawn as
 * part of the label it was inside the element the chart spreads `ctx.item` on,
 * however it was marked. Render it as a SIBLING of that element, exactly where
 * `ctx.actions` goes, and the chart's node appearance places it on the card's
 * boundary from there; it hides itself, as that strip does.
 *
 * IT COSTS A READER NOTHING. Expansion is on the treeitem ITSELF, as
 * `aria-expanded` and the Right and Left arrows, so what is hidden here is a
 * DUPLICATE of something already reachable rather than a way in. Name the
 * control anyway: "Collapse Engineering" is the tooltip a pointer gets.
 *
 * AND A PRESS IN IT BELONGS TO THE NODE. Every other control a chart draws
 * hands its press to the treeitem, so that what holds focus afterwards is
 * always a node a screen reader can announce and the arrows can move from; a
 * disclosure that kept the focus on itself would leave it on an element the
 * tree cannot navigate to and no reader can hear. This takes the chart's own
 * press props and spreads them, which is exactly how the strip under a card
 * takes them: the component owns what cannot be forgotten (the class, the
 * hiding) and the caller passes the one thing only the chart knows, which id
 * this is.
 */
export function OrgNodeDisclosure({ children, className, ...rest }: OrgNodeDisclosureProps) {
  return (
    <div {...rest} className={cx('crewlet-org-node__leading', className)} aria-hidden="true">
      {children}
    </div>
  );
}

export interface OrgNodeLeadProps {
  /**
   * Nothing is set, so the pill is drawn as the outline of one: a unit with no
   * lead is a fact about the organization and a blank strip says nothing.
   */
  empty?: boolean | undefined;
  /**
   * The clear control, drawn inside the pill's right end.
   *
   * ONE PRESS to say this unit has no lead, which is what the console chart's
   * own X does. It is quiet until the node is reached, like every other
   * control on a node, and it is reached by FOCUS as well as by the pointer:
   * the chart's own reveal rule covers it (`TreeCanvas.css`). Pass a named
   * control, never a bare glyph: "Clear the lead of Engineering" is what a
   * reader who cannot see which node this is hears.
   */
  clear?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * A unit's lead, along the bottom edge of its node.
 *
 * IT STAYS DRAWN, where the controls that edit the node do not: who leads a
 * unit is a FACT ABOUT THE ORGANIZATION rather than a tool for changing it,
 * and a chart that hid it until the pointer arrived would be a chart you could
 * not read the leads off. Separated from the name above by a hairline, so the
 * node reads as a thing with a lead rather than as two lines of text.
 */
export function OrgNodeLead({ empty = false, clear, children, className }: OrgNodeLeadProps) {
  return (
    <div className={cx('crewlet-org-node-lead', className)}>
      <span
        className={cx('crewlet-org-node-lead__pill', empty && 'crewlet-org-node-lead__pill--empty')}
      >
        {children}
        {clear === undefined ? null : (
          <span className="crewlet-org-node-lead__clear">
            {/* THE DISC IS DRAWN AND THE BUTTON IS HIT. The console chart draws
                a small disc with a ground and a boundary of its own and a glyph
                barely a third of it; at the pointer target's size that disc
                would be a button as tall as the strip it sits in. Drawn as an
                element rather than as the control's own pseudo, because what a
                node is painted with is a promise this package measures, and a
                pseudo element is the one drawing no cascade can report. */}
            <span className="crewlet-org-node-lead__disc" aria-hidden="true" />
            {clear}
          </span>
        )}
      </span>
    </div>
  );
}
