/**
 * An organization as an indented, editable table of rows: the console's own
 * org table, drawn on the package's treegrid.
 *
 * WHY IT IS NOT JUST A TABLE. A list screen's table answers questions about
 * rows that have nothing to do with each other, so it sorts, filters and pages
 * them. An org table answers one question a sort would destroy: WHERE IS THIS
 * IN THE ORGANIZATION. The hierarchy is the order, the indent is the answer,
 * and the wires drawn down the gutter are what let a reader follow a seat back
 * to the unit it sits in without reading a path on every line.
 *
 * WHAT IT ADDS TO `TreeGrid`, WHICH IS ALL OF THE BEHAVIOUR. The rows, the
 * keys, the cells, the focus model, the add row and the layer the menus open
 * in are that component's, unchanged; this one is the DRAWING the console org
 * chart's table already had and no consumer could reach: the tree's wires, the
 * icon and the two-line name group, the strip of row controls that stays quiet
 * until the row is reached, the slot the chart's own `AddPill` splits open in,
 * and the Expand all and Collapse all tab attached to the table's top edge.
 *
 * A HUE MARKS A ROW, IT DOES NOT CLASSIFY IT. `tone` tints the branch arriving
 * at a row and the mark and name in it with one of the six node hues, the same
 * palette and the same rule as a tinted `TreeCanvas` card: a hue is what an
 * operator or a chart puts on one node so it can be found again, never a
 * taxonomy a reader has to decode, so nothing is claimed by two rows sharing
 * one and no legend is owed.
 */

import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { KeyboardArrowDownGlyph, KeyboardArrowUpGlyph } from '@crewlethq/icons/glyphs';
import { AddPill, type AddPillProps } from '../AddPill/index.js';
import { IconButton } from '../IconButton/index.js';
import { OrgLabel, type OrgLabelContent } from '../OrgLabel/index.js';
import { createTreeModel, type TreeViewHandle } from '../Tree/index.js';
import {
  TreeGrid,
  type TreeGridContext,
  type TreeGridLabels,
  type TreeGridProps,
} from '../TreeGrid/index.js';
import type { TreeCardTone } from '../TreeCanvas/TreeCanvas.js';
import { cx } from '../utils/cx.js';

/**
 * The hue a row is marked with. The SAME six a `TreeCanvas` card is tinted
 * with, named by that component, so one drawing of one organization cannot
 * paint a seat two colours across its chart and its table.
 */
export type OrgTableTone = TreeCardTone;

/** Every string the table renders on its own, over `TreeGrid`'s. */
export interface OrgTableLabels extends TreeGridLabels {
  expandAll: string;
  collapseAll: string;
}

const LABELS: Pick<OrgTableLabels, 'expandAll' | 'collapseAll'> = {
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
};

export interface OrgTableProps extends Omit<TreeGridProps, 'className' | 'labels' | 'ref'> {
  /**
   * The hue this row is marked with, or nothing for a neutral row. Asked per
   * row, because a chart derives it from the node's own identity.
   */
  tone?: ((id: string) => OrgTableTone | undefined) | undefined;
  /**
   * The Expand all and Collapse all tab above the table. On by default,
   * because a hierarchy a reader cannot open or close in one press is one they
   * walk a level at a time.
   */
  controls?: boolean | undefined;
  labels?: Partial<OrgTableLabels> | undefined;
  ref?: Ref<TreeViewHandle> | undefined;
  className?: string | undefined;
}

export function OrgTable({
  rows,
  renderCell,
  tone,
  controls = true,
  labels,
  ref,
  className,
  ...rest
}: OrgTableProps) {
  const text = { ...LABELS, ...labels };
  /*
   * THE DEPTH COMES FROM THE SAME MODEL THE GRID BUILDS, over the same forest,
   * so a wire is never drawn at a level the grid does not put the row at. It
   * is the tree model's own arithmetic rather than a second walk of the rows
   * here, which is the walk that would disagree.
   */
  const depths = useMemo(() => createTreeModel(rows).depth, [rows]);

  const grid = useRef<TreeViewHandle | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      focusNode: (id: string) => grid.current?.focusNode(id),
      expandAll: () => grid.current?.expandAll(),
      collapseAll: () => grid.current?.collapseAll(),
    }),
    [],
  );

  /*
   * THE WIRES ARE DRAWN INSIDE THE FIRST CELL, before whatever the caller puts
   * there. They are the indent as well as the drawing: one element whose width
   * IS the row's level, so the gutter it reserves and the branch it draws
   * across that gutter can never be two different widths.
   */
  const cell = useCallback(
    (id: string, column: number, context: TreeGridContext): ReactNode => {
      if (column !== 1) return renderCell(id, column, context);
      const depth = depths.get(id) ?? 0;
      return (
        <>
          <OrgTableWire
            depth={depth}
            tone={tone?.(id)}
            // A root row's trunk starts at its own middle and runs down into
            // the rows below, so nothing is drawn above the first row and
            // nothing hangs off a root with nothing under it.
            trunk={depth > 0 || (context.expandable(id) && context.expanded(id))}
          />
          {renderCell(id, column, context)}
        </>
      );
    },
    [depths, renderCell, tone],
  );

  return (
    <div className={cx('crewlet-org-table', className)}>
      {controls && (
        /*
         * THE CHEVRONS THE ROWS THEMSELVES TURN, pointed at every row at once.
         * They wore the plus and the minus, which is the drawing the add on
         * every row under them wears: one mark meant "Expand all" at the
         * table's top edge and "Add to this row" nine times below it. Down is
         * what an open row's own chevron points at, so the pair reads as the
         * state it puts the whole table into.
         */
        <div className="crewlet-org-table__controls">
          <IconButton
            size="sm"
            label={text.expandAll}
            title={text.expandAll}
            icon={<KeyboardArrowDownGlyph />}
            onClick={() => grid.current?.expandAll()}
          />
          <IconButton
            size="sm"
            label={text.collapseAll}
            title={text.collapseAll}
            icon={<KeyboardArrowUpGlyph />}
            onClick={() => grid.current?.collapseAll()}
          />
        </div>
      )}
      <TreeGrid
        {...rest}
        ref={grid}
        rows={rows}
        renderCell={cell}
        labels={labels}
        className="crewlet-org-table__grid"
      />
    </div>
  );
}

/**
 * One row's share of the tree's wires, which is also its indent.
 *
 * ONE TRUNK, AND A BRANCH PER ROW. The trunk is a segment down the gutter on
 * every row inside the tree, so the segments stack into the single line the
 * console chart's table draws; the branch runs from it to the row's own mark,
 * and is as long as the row is deep. Hidden from assistive technology, because
 * the level it draws is already on the row as `aria-level`.
 */
function OrgTableWire({
  depth,
  tone,
  trunk,
}: {
  depth: number;
  tone: OrgTableTone | undefined;
  trunk: boolean;
}) {
  return (
    <span
      className="crewlet-org-table__wire"
      aria-hidden="true"
      data-trunk={trunk ? '' : undefined}
      data-root={depth === 0 ? '' : undefined}
      data-tone={tone}
      style={{ '--crewlet-org-table-depth': depth } as CSSProperties}
    />
  );
}

/**
 * A row's mark, name and what kind of thing it is: the org table's name cell.
 *
 * THE SAME THING A CHART NODE SAYS, in the row layout: `OrgLabel`, with the
 * layout filled in. The two were written separately and agreed on 38 of the 62
 * declarations they set; what they disagreed about is that a chart node is a
 * box as wide as its own name where a column of rows is read down its leading
 * edge, which is now the layout parameter rather than a second component.
 *
 * KEPT AS A NAME OF ITS OWN because a table's name cell is what a caller of
 * this folder is drawing. It adds nothing and takes nothing away beyond the
 * row's `tone`, which only a row has: a chart card publishes its own.
 */
export interface OrgTableNameProps extends OrgLabelContent {
  tone?: OrgTableTone | undefined;
}

export function OrgTableName({ tone, ...content }: OrgTableNameProps) {
  return <OrgLabel layout="row" {...content} {...(tone ? { tone } : {})} />;
}

/**
 * The strip of controls at the end of a row.
 *
 * QUIET UNTIL THE ROW IS REACHED, which is the console table's own behaviour:
 * what a reader sees first is the organization rather than the tools for
 * editing it. Reached by the pointer, by focus, and on the selected row, so
 * nothing here is pointer-only and nothing is a control a keyboard meets
 * invisible.
 */
export function OrgTableActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <span className={cx('crewlet-org-table__actions', className)}>{children}</span>;
}

export interface OrgTableAddProps extends AddPillProps {
  /** Says a press opened it, so the grid's one tab stop follows focus here. */
  onOpen?: (() => void) | undefined;
}

/**
 * The split add pill on a row: `AddPill`, in the slot the row reserves for it.
 *
 * THE GESTURE IS NOT DRAWN TWICE. This was a second implementation of the
 * same control once, with its own plus, its own strip and its own idea of what
 * a section is, and the two disagreed about all of it: the row's pill had no
 * split animation at all, no divider between its kinds, a different boundary
 * and a different colour from the one on the chart. The console drives both of
 * its own pills from one state machine for that reason. This is that, so a
 * change to the split reaches the chart and the table together.
 *
 * WHAT IT ADDS IS THE ROW, AND ONLY THE ROW: a slot as wide as the pill is
 * open, so the split happens inside the track and covers no value beside it,
 * and a press reported to the grid, so the one tab stop a treegrid has follows
 * the focus the press moved. `onClickCapture` rather than a callback the pill
 * would have to carry: the press is on its way down to a control that stops
 * it, and the grid only has to know that it happened.
 */
export function OrgTableAdd({ onOpen, className, ...pill }: OrgTableAddProps) {
  return (
    <span className={cx('crewlet-org-table__add', className)} onClickCapture={() => onOpen?.()}>
      <AddPill {...pill} />
    </span>
  );
}
