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

export interface TableProps {
  headers: ReactNode[];
  /** One array per row, in the header's own order. Cells may be any node. */
  data: ReactNode[][];
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
  actionButton?: TableActionButton;
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

export const Table = ({
  headers,
  data,
  caption,
  captionHidden = false,
  emptyMessage = 'No data available',
  actionButton,
  maxHeight,
  className = '',
}: TableProps) => {
  const columnCount = Math.max(1, headers.length);
  return (
    <div className={cx('crewlet-table', className)}>
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
          maxHeight
            ? ({ '--crewlet-table-max-height': maxHeight, '--crewlet-table-overflow-y': 'auto' } as CSSProperties)
            : undefined
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
                <th key={index} scope="col">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="crewlet-table__row">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
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
