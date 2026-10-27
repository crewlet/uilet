import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * A small table of rows and columns, given as arrays.
 *
 * IT IS A REAL TABLE NOW. It used to be a grid of divs and spans, which reads
 * to a screen reader as a pile of text: no columns, no header association, and
 * no way to ask what column a cell is in. A reader arriving at "3" in the
 * fourth row learned nothing about which of four figures it was. The look is
 * unchanged, because the look was never the problem.
 *
 * WHEN TO USE IT, and when not to. This is the table you build from arrays you
 * already have: a comparison, a summary, a handful of rows inside a dialog.
 * Anything with sorting, pagination, column choices, row actions or live rows
 * is a DataTable, which has all of those and a column type to describe them
 * with.
 *
 * Cells are nodes, so a cell may hold a Tag, a link or a glyph. A caption
 * names the table for anybody who cannot see the heading above it; keep it if
 * the surrounding text does not already say what the rows are.
 */
export interface TableActionButton {
  label: ReactNode;
  onClick: () => void;
}

/** Which edge a column's cells stand against: `start` for words, `end` for figures. */
export type TableColumnAlign = 'start' | 'end';

interface TableBaseProps {
  headers: ReactNode[];
  /** One array per row, in the header's own order. Cells may be any node. */
  data: ReactNode[][];
  /**
   * Each column's edge, in the header's order: `end` for a column of figures,
   * so the numbers and their heading line up on the right. Left out, every
   * column starts.
   */
  align?: readonly TableColumnAlign[] | undefined;
  /**
   * A last row that sums the rows above it ("Total", "7,840,000", "100%"),
   * fenced from them by a rule and set at medium weight. Its first cell heads
   * the row, so a screen reader hears "Total" with each figure in it.
   */
  footer?: readonly ReactNode[] | undefined;
  /**
   * Draws the table's own frame (the edge, the corner and the panel ground).
   * `false` for a table that fills a card, which already has an edge: a card
   * never holds a second bordered box. Its outer cells then take the card's
   * own inset.
   */
  framed?: boolean | undefined;
  /**
   * What the table is about, rendered as its `<caption>`.
   *
   * `captionHidden` keeps it in the accessibility tree and takes it off the
   * screen, for a table whose heading is already visible right above it: a
   * name a screen reader can use, without saying the same words twice.
   */
  caption?: ReactNode;
  captionHidden?: boolean;
  emptyMessage?: ReactNode;
  actionButton?: TableActionButton | undefined;
  /**
   * How tall the rows may get before they scroll, as a CSS length.
   *
   * A table given one becomes its own vertical scroller and its header sticks,
   * so the column names stay on screen while the rows move under them. Without
   * it the table is as tall as its rows and the page is what scrolls, which is
   * the right answer for the handful of rows this component is for.
   */
  maxHeight?: string;
  className?: string;
}

/**
 * How the columns share the width. NOWRAP NEEDS COLUMNS SIZED BY THEIR WORDS:
 * under the grid's equal columns a cell held to one line runs into the next
 * one, so the type offers `nowrap` only with `columns="content"`, where the
 * column grows to hold it.
 */
type TableColumnsProps =
  | {
      /** `even` (the default): the grid's equal columns. */
      columns?: 'even' | undefined;
      nowrap?: undefined;
    }
  | {
      /**
       * `content`: each column takes the room its words ask for, as a result
       * read beside an answer wants. A sentence wraps between words, a token
       * longer than the table wraps anywhere rather than push the table
       * sideways, and the figures (`end` columns) never wrap.
       */
      columns: 'content';
      /**
       * Columns whose cells never wrap, by index: a short token such as a
       * task's key ("GOP-11"), which a line would otherwise break at its
       * hyphen.
       */
      nowrap?: readonly boolean[] | undefined;
    };

export type TableProps = TableBaseProps & TableColumnsProps;

export const Table = ({
  headers,
  data,
  caption,
  captionHidden = false,
  emptyMessage = 'No data available',
  actionButton,
  maxHeight,
  align,
  footer,
  framed = true,
  columns = 'even',
  nowrap,
  className = '',
}: TableProps) => {
  const columnCount = Math.max(1, headers.length);
  // HELD TO ONE LINE ONLY WHERE THE COLUMN CAN GROW TO HOLD IT: the type
  // offers nowrap with content columns alone, and a caller in plain
  // JavaScript, whom the type does not reach, is held to it here.
  const held = columns === 'content' ? nowrap : undefined;
  const edge = (index: number) =>
    cx(align?.[index] === 'end' && 'crewlet-table__cell--end', held?.[index] === true && 'crewlet-table__cell--nowrap') ||
    undefined;
  return (
    <div
      className={cx(
        'crewlet-table',
        !framed && 'crewlet-table--flush',
        columns === 'content' && 'crewlet-table--content',
        className,
      )}
    >
      {/*
        * The scroller, as a safety net rather than a reading mode: the table
        * lays out fixed and wraps anywhere, so its columns share the width
        * they are given instead of pushing past it. A table that regularly
        * needs sideways scrolling to be read is a DataTable, whose own
        * scroller carries the column model with it.
        *
        * The height is set as custom properties rather than as `maxHeight` and
        * `overflowY` directly, so the stylesheet keeps both halves of the rule
        * together: a max height with no scroller clips the rows it hides.
        */}
      <div
        className="crewlet-table__container"
        style={
          // Only the height: the stylesheet scrolls both axes unconditionally,
          // because with `overflow-x: auto` declared beside it a `visible`
          // vertical axis was never reachable. See Table.css.
          maxHeight ? ({ '--crewlet-table-max-height': maxHeight } as CSSProperties) : undefined
        }
      >
        <table className="crewlet-table__table">
          {caption != null && (
            captionHidden
              ? <caption><VisuallyHidden>{caption}</VisuallyHidden></caption>
              : <caption className="crewlet-table__caption">{caption}</caption>
          )}
          <thead>
            <tr className="crewlet-table__header">
              {headers.map((header, index) => (
                // The index is the key because a header is a position: the
                // columns of one table do not reorder between renders.
                <th key={index} scope="col" className={edge(index)}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="crewlet-table__row">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={edge(cellIndex)}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="crewlet-table__empty" colSpan={columnCount}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
          {footer && footer.length > 0 ? (
            <tfoot>
              <tr className="crewlet-table__footer">
                {footer.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className={edge(index)}>{cell}</th>
                  ) : (
                    <td key={index} className={edge(index)}>{cell}</td>
                  ),
                )}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {actionButton && (
        <button
          // A type, so a table inside a form does not submit it. The default
          // for a button with no type is `submit`, which is the one thing
          // this control never means.
          type="button"
          className="crewlet-table__action-btn"
          onClick={actionButton.onClick}
        >
          <span className="crewlet-table__action-text">{actionButton.label}</span>
        </button>
      )}
    </div>
  );
};
