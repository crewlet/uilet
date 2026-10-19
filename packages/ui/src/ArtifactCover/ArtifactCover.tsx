import type { ReactNode } from 'react';
import { Document } from '../Document/index.js';
import { cx } from '../utils/cx.js';

/**
 * The native covers a gallery card draws in `ArtifactCard.preview`, one per
 * kind whose content can be drawn small (D64): never a screenshot, always the
 * artifact's own content drawn by the design system at card size. A card
 * whose kind has no cover keeps its glyph.
 *
 * DECORATIVE. The card is one link named by its title and described by its
 * facts, and its preview is hidden from assistive tech, so a cover carries no
 * names, roles or focusable parts of its own.
 */

export interface DocCoverProps {
  /**
   * The opening of the doc, rendered by the host's own Markdown renderer as
   * the plain elements `Document` styles. It is clipped to the card, so a
   * host passes a few lines rather than the whole document.
   */
  children: ReactNode;
  className?: string | undefined;
}

/** A doc's cover: its opening, set as a small page that fades out at the card's edge. */
export function DocCover({ children, className }: DocCoverProps) {
  return (
    <span className={cx('crewlet-doc-cover', className)}>
      <Document className="crewlet-doc-cover__page" size="sm" measure="none">
        {children}
      </Document>
    </span>
  );
}

export interface SheetCoverProps {
  /** The first columns' names. */
  columns: readonly string[];
  /** The first rows, each a cell's text per column. */
  rows: readonly (readonly string[])[];
  className?: string | undefined;
}

/** The columns and rows a sheet cover draws at most; past them a card has no room. */
export const SHEET_COVER_COLUMNS = 4;
export const SHEET_COVER_ROWS = 5;

/** A sheet's cover: its first columns and rows as a small grid. */
export function SheetCover({ columns, rows, className }: SheetCoverProps) {
  const shown = columns.slice(0, SHEET_COVER_COLUMNS);
  return (
    <span className={cx('crewlet-sheet-cover', className)} style={{ ['--crewlet-sheet-cover-columns' as string]: Math.max(shown.length, 1) }}>
      {shown.map((c, i) => (
        <span key={`h${i}`} className="crewlet-sheet-cover__cell crewlet-sheet-cover__cell--head">
          {c}
        </span>
      ))}
      {rows.slice(0, SHEET_COVER_ROWS).map((row, r) =>
        shown.map((_, i) => (
          <span key={`${r}-${i}`} className="crewlet-sheet-cover__cell">
            {row[i] ?? ''}
          </span>
        )),
      )}
    </span>
  );
}
