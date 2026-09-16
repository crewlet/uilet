/**
 * What a node of an org chart and a row of an org table both say.
 *
 * ONE COMPONENT, BECAUSE IT WAS ALWAYS ONE THING. A chart node and a table row
 * state the same four facts about the same organization: a mark for what kind
 * of thing this is, its name, the word under the name saying that kind out
 * loud, and the slot a push arrives in. They were written twice, under two
 * class prefixes, and measured declaration by declaration the two stylesheets
 * agreed on 38 of the 62 declarations they set across the six elements they
 * both draw. Seventeen of the 24 that differed are one difference restated: A
 * CHART NODE IS A BOX AS WIDE AS ITS OWN NAME AND A TABLE ROW IS A LINE IN A
 * COLUMN. So the layout is the parameter and nothing else is. The other seven
 * were the same rule written two ways, which is where both defects lived.
 *
 * WHAT THE LAYOUT DECIDES, and the whole of it:
 *   - the name and its caption are CENTRED in a node and RANGED LEFT in a row,
 *     because a node is read as a box and a column is read down its leading
 *     edge: names centred in a column are a column nobody can scan;
 *   - the mark's zone is a large control step in a node and a small one in a
 *     row, and the mark inside it takes the step that half-fills or
 *     three-quarter-fills whichever zone it is in;
 *   - the push slot keeps a FIXED room in a node, because a node is
 *     `width: max-content` and a slot that grew with its content would relay
 *     the whole chart, and is content-sized in a row, where the grid already
 *     decides the column;
 *   - the ink comes from whatever publishes it: a chart card publishes its own
 *     tone, and the table publishes the row's (`OrgTable.css`).
 *
 * THE NODE LAYOUT RENDERS NO WRAPPER, and cannot. `TreeCanvas`'s `node`
 * appearance makes the element the caller spreads `ctx.item` on the flex row
 * that lays the three zones out, so the zones have to be ITS children: a
 * wrapper of this component's own would leave the chart laying out one box
 * with everything inside it. The row layout does render one, because a table
 * cell has nothing playing that part and because the row's tone has to be
 * carried somewhere. That is why the base rules in `OrgLabel.css` are the
 * NODE's and `--row` overrides them, rather than a neutral base and a modifier
 * each: there is no element in a node layout for a modifier to sit on.
 *
 * TWO ALIASES KEEP THE OLD NAMES. `OrgNodeLabel` and `OrgTableName` are this
 * component with the layout filled in, so no call site changed when the two
 * became one.
 */

import type { ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import type { TreeCardTone } from '../TreeCanvas/index.js';

/**
 * Which of the two things this label is: a card in a chart, or a line in a
 * grid of them.
 */
export type OrgLabelLayout = 'node' | 'row';

/** What both layouts say, in the order they say it. */
export interface OrgLabelContent {
  /** The mark in the leading zone: a glyph, a brand mark, an image. */
  icon?: ReactNode | undefined;
  /**
   * A ring around that mark.
   *
   * `dashed` is the boundary something standing for somebody outside the
   * system wears, the same mark a dashed card and a dashed row carry. The
   * BOUNDARY says it rather than a hue, so it reads to somebody who cannot
   * separate hues at all.
   */
  iconRing?: 'none' | 'dashed' | undefined;
  /**
   * How big the mark is drawn in its zone, as a proportion of the zone rather
   * than as a size: `md` half-fills it, `lg` fills three quarters.
   *
   * `md` is what a container takes (a company, a unit, a group) and `lg` is
   * for the mark that stands for the THING the chart is about, so a reader
   * tells one from the other at the far end of a chart without reading either
   * caption. The zone itself does not change either way, so this moves
   * nothing: only what is drawn inside it.
   */
  iconSize?: 'md' | 'lg' | undefined;
  /** The name, which takes the width the two fixed zones leave and truncates. */
  name: ReactNode;
  /** What kind of thing this is: "Department", "Human seat", "Crewlet agent". */
  caption?: ReactNode | undefined;
  /**
   * Fixed-size marks riding the caption line, each one a glyph with an
   * accessible name of its own. Anything that would change size belongs in
   * `trailing`, which has a slot kept for it.
   */
  captionMarks?: ReactNode | undefined;
  /**
   * The slot on the name's line for what arrives from a push: a live state, a
   * count.
   *
   * ASKING FOR IT IS WHAT RESERVES THE ROOM, in a node. The slot is a fixed
   * width there, so what a push delivers cannot change the node's measured
   * size; a node that can never carry one passes nothing here and is drawn
   * with no slot at all, which is the console chart's own node.
   */
  trailing?: ReactNode | undefined;
  /**
   * Added to the outermost element this layout HAS: the row's own wrapper, and
   * in a node the text column, which is the outermost element a layout that
   * renders no wrapper can offer.
   */
  className?: string | undefined;
}

export interface OrgLabelNodeProps extends OrgLabelContent {
  layout?: 'node' | undefined;
  /**
   * Refused on a node, because a node has no element to carry it. A chart card
   * publishes its own tone to everything inside it (`TreeCanvas.css`), which
   * is where a node's ink comes from; there is nothing here to tone.
   */
  tone?: never | undefined;
}

export interface OrgLabelRowProps extends OrgLabelContent {
  layout: 'row';
  /** The row's hue, which its mark and its name are drawn in. */
  tone?: TreeCardTone | undefined;
}

export type OrgLabelProps = OrgLabelNodeProps | OrgLabelRowProps;

/** The mark, the name and the caption of an org chart node or an org table row. */
export function OrgLabel(props: OrgLabelProps) {
  const { layout = 'node', icon, iconRing = 'none', iconSize = 'md', className } = props;
  const zone = (
    <span
      className={cx(
        'crewlet-org-label__icon',
        iconRing === 'dashed' && 'crewlet-org-label__icon--dashed',
        iconSize === 'lg' && 'crewlet-org-label__icon--lg',
      )}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
  if (layout === 'row') {
    return (
      <span className={cx('crewlet-org-label', 'crewlet-org-label--row', className)} data-tone={props.tone}>
        {zone}
        <Words {...props} />
        <Slot trailing={props.trailing} />
      </span>
    );
  }
  /*
   * A FRAGMENT, on purpose: see the note at the top. The three zones are the
   * children of whatever the chart laid out, and `className` goes on the text
   * column because that is the outermost element there is.
   */
  return (
    <>
      {zone}
      <Words {...props} className={className} />
      <Slot trailing={props.trailing} />
    </>
  );
}

/**
 * The name and, under it, what kind of thing this is.
 *
 * TWO LINES, AND THE SECOND IS THE KIND. Both surfaces are read by scanning
 * names, and a reader who cannot tell a unit from a seat from the mark alone
 * (every reader, the first time) has the word right there. It is also where
 * the wiring marks ride, as glyphs rather than words: one rank is all there
 * is, and a badge reading "Placed by unit reference" in full would be the
 * whole of it.
 */
function Words({
  name,
  caption,
  captionMarks,
  className,
}: Pick<OrgLabelContent, 'name' | 'caption' | 'captionMarks' | 'className'>) {
  return (
    <span className={cx('crewlet-org-label__text', className)}>
      <span className="crewlet-org-label__name">{name}</span>
      {(caption !== undefined || captionMarks !== undefined) && (
        <span className="crewlet-org-label__caption">
          {caption !== undefined && <span className="crewlet-org-label__kind">{caption}</span>}
          {captionMarks}
        </span>
      )}
    </span>
  );
}

/**
 * The slot a push arrives in, drawn only where one was asked for.
 *
 * NOTHING ASKED FOR IS NO SLOT AT ALL, rather than an empty one: that is the
 * console chart's own node, and it is the difference between a node with room
 * kept for a live state and a node that can never have one.
 */
function Slot({ trailing }: Pick<OrgLabelContent, 'trailing'>) {
  if (trailing === undefined) return null;
  return <span className="crewlet-org-label__trailing">{trailing}</span>;
}
