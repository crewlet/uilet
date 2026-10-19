import type { HTMLAttributes } from 'react';
import { ArtifactKindGlyph } from '../ArtifactCard/index.js';
import { cx } from '../utils/cx.js';

/** One headline figure a cover draws. */
export interface DashboardCoverStat {
  /** The widget's title: "Open tasks". */
  label: string;
  /**
   * The figure as THIS reader sees it, already formatted. Unset when the
   * gallery does not hold it, and then the cover draws `source` in its place,
   * never a placeholder number.
   */
  value?: string | undefined;
  /** The title of the dataset the figure is drawn from. */
  source?: string | undefined;
}

/** What one widget of the board is, for the schematic. */
export type DashboardCoverWidgetKind = 'stat' | 'chart' | 'table' | 'note';

/** One widget of the board, for the schematic: its width in grid columns and what it is. */
export interface DashboardCoverWidget {
  /** Columns of a twelve-column grid, 1 to 12. */
  w: number;
  kind: DashboardCoverWidgetKind;
}

export interface DashboardCoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The board's first headline figures. At most three are drawn. */
  stats?: readonly DashboardCoverStat[] | undefined;
  /** The board's first widgets, drawn as a schematic when there are no stats. */
  layout?: readonly DashboardCoverWidget[] | undefined;
}

/** The figures a card has room for, at its smallest. */
const MAX_STATS = 3;

/** The schematic's widgets: about two rows of a board at card size. */
const MAX_SCHEMATIC = 8;

const GRID_COLUMNS = 12;

/** The frame every native cover shares (ArtifactCover.css), then this cover's own block. */
const COVER = 'crewlet-artifact-cover crewlet-dashboard-cover';

/**
 * A dashboard artifact's cover in a gallery, passed as `ArtifactCard`'s
 * `preview`: drawn natively, never a screenshot.
 *
 * THE READER'S NUMBERS OR NONE. A dashboard's figures are decided per reader,
 * so a cover that baked in one reader's numbers would show every other reader
 * figures they may not be allowed to see. A stat the gallery holds for this
 * reader draws its value; one it does not draws its label and the title of
 * the dataset it cites, so the card still says what the board measures.
 *
 * Without stats, a schematic of the board's first widgets on its twelve
 * columns says what shape the board is. With neither, the kind's glyph.
 *
 * DECORATIVE where `ArtifactCard` draws it: the card hides its preview from
 * assistive technology, because the card's own title and facts are what a
 * screen reader reads. Drawn on its own, the stats remain readable text.
 */
export function DashboardCover({ stats = [], layout = [], className, ...rest }: DashboardCoverProps) {
  const shown = stats.slice(0, MAX_STATS);
  if (shown.length > 0) {
    return (
      <div {...rest} className={cx(COVER, 'crewlet-dashboard-cover--stats', className)}>
        {shown.map((stat, index) => (
          <div key={`${index}:${stat.label}`} className="crewlet-dashboard-cover__stat">
            <span className="crewlet-dashboard-cover__label">{stat.label}</span>
            {stat.value !== undefined && stat.value !== '' ? (
              <span className="crewlet-dashboard-cover__value">{stat.value}</span>
            ) : stat.source ? (
              <span className="crewlet-dashboard-cover__source">{stat.source}</span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  const blocks = layout.slice(0, MAX_SCHEMATIC);
  if (blocks.length > 0) {
    return (
      <div {...rest} className={cx(COVER, 'crewlet-dashboard-cover--layout', className)}>
        {blocks.map((block, index) => (
          <span
            key={index}
            className={cx('crewlet-dashboard-cover__block', `crewlet-dashboard-cover__block--${block.kind}`)}
            style={{ gridColumn: `span ${clampColumns(block.w)}` }}
          >
            {block.kind === 'chart' ? (
              <>
                <span className="crewlet-dashboard-cover__bar" />
                <span className="crewlet-dashboard-cover__bar" />
                <span className="crewlet-dashboard-cover__bar" />
                <span className="crewlet-dashboard-cover__bar" />
              </>
            ) : block.kind === 'table' || block.kind === 'note' ? (
              <>
                <span className="crewlet-dashboard-cover__line" />
                <span className="crewlet-dashboard-cover__line" />
                <span className="crewlet-dashboard-cover__line" />
              </>
            ) : (
              <span className="crewlet-dashboard-cover__figure" />
            )}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div {...rest} className={cx(COVER, 'crewlet-dashboard-cover--empty', className)}>
      <ArtifactKindGlyph kind="dashboard" size={32} />
    </div>
  );
}

/** A width held to the grid, so a malformed width never breaks the schematic. */
function clampColumns(w: number): number {
  if (!Number.isFinite(w)) return GRID_COLUMNS;
  return Math.min(GRID_COLUMNS, Math.max(1, Math.round(w)));
}
