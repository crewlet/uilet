/**
 * A design drawn as a schematic: every artboard's rectangle where the canvas
 * places it, the cover board marked and titled, the notes as faint blocks.
 *
 * A COVER DRAWN, NEVER A SCREENSHOT. A gallery card shows where a design's
 * boards sit without running a single page: it is drawn from the canvas's
 * numbers alone (a design's outline), so a gallery of fifty designs frames
 * nothing, and the drawing follows the reader's theme.
 */

import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx.js';

/** A rectangle of the schematic, in the canvas's own pixels. */
export interface CanvasSchematicRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One board of the schematic. */
export interface CanvasSchematicBoard extends CanvasSchematicRect {
  id: string;
  title?: string | undefined;
}

export interface CanvasSchematicProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The accessible description of the drawing, such as "Launch page, 4 boards". */
  label: string;
  boards: readonly CanvasSchematicBoard[];
  notes?: readonly CanvasSchematicRect[] | undefined;
  /** The board drawn as the cover, and titled. */
  cover?: string | undefined;
}

/** Room around the drawing, as a share of its larger side. */
const MARGIN = 0.06;

export function CanvasSchematic({
  label,
  boards,
  notes = [],
  cover,
  className,
  ...rest
}: CanvasSchematicProps) {
  const all = [...boards, ...notes];
  const minX = Math.min(...all.map((r) => r.x));
  const minY = Math.min(...all.map((r) => r.y));
  const maxX = Math.max(...all.map((r) => r.x + r.w));
  const maxY = Math.max(...all.map((r) => r.y + r.h));
  const side = Math.max(maxX - minX, maxY - minY, 1);
  const pad = side * MARGIN;
  const viewBox =
    all.length === 0
      ? '0 0 1 1'
      : `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
  const coverBoard = boards.find((b) => b.id === cover);
  return (
    <div className={cx('crewlet-canvas-schematic', className)} {...rest}>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
        {notes.map((n, i) => (
          <rect
            key={`note-${i}`}
            className="crewlet-canvas-schematic__note"
            x={n.x}
            y={n.y}
            width={n.w}
            height={n.h}
          />
        ))}
        {boards.map((b) => (
          <rect
            key={b.id}
            className="crewlet-canvas-schematic__board"
            data-cover={b.id === cover || undefined}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {coverBoard?.title && (
          <text
            className="crewlet-canvas-schematic__title"
            x={coverBoard.x + coverBoard.w * 0.08}
            y={coverBoard.y + coverBoard.h * 0.5}
            fontSize={Math.min(coverBoard.h * 0.16, side * 0.06)}
            dominantBaseline="middle"
          >
            {coverBoard.title}
          </text>
        )}
      </svg>
    </div>
  );
}
