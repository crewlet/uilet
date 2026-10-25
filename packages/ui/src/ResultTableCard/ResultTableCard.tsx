import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { DownloadButton } from '../DownloadButton/index.js';
import { StatusCard } from '../StatusCard/index.js';
import { Table, type TableColumnAlign } from '../Table/index.js';
import { cx } from '../utils/cx.js';

/** One download a result offers, fetched on the press: an export the server builds. */
export interface ResultTableDownload {
  /** The format, as the button says it: "CSV", "XLSX". */
  label: string;
  /** The name the file is offered under: "token-spend-this-week.csv". */
  filename: string;
  /** Fetches the file. A rejection reads as a failed download on the button. */
  file: () => Promise<Blob>;
}

export interface ResultTableCardLabels {
  /** The control that shows every row of a long result: "Show all 48". */
  showAll: (count: number) => string;
}

export const RESULT_TABLE_CARD_LABELS: ResultTableCardLabels = {
  showAll: (count) => `Show all ${count.toLocaleString()}`,
};

/** Results with more rows than this show the first `collapsedRows` and "Show all". */
export const RESULT_TABLE_MAX_ROWS = 20;

/** How many rows a long result shows until the reader asks for all of them. */
export const RESULT_TABLE_COLLAPSED_ROWS = 10;

export interface ResultTableCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** What the rows are: "Token spend by agent". Also the table's caption, said and not shown twice. */
  title: string;
  /** The window or scope the rows cover, under the title: "This week, from Monday". */
  window?: ReactNode;
  headers: ReactNode[];
  rows: ReactNode[][];
  /** Each column's edge: `end` for figures. */
  align?: readonly TableColumnAlign[] | undefined;
  /** The total row, under the rows it sums. */
  total?: readonly ReactNode[] | undefined;
  /** The exports the result offers, each fetched on its press. */
  downloads?: readonly ResultTableDownload[] | undefined;
  /**
   * A way to the page the rows come from ("Open in Spend"), at the foot's
   * end: the host's own link (a `ButtonLink` ghost small, or its router's).
   */
  link?: ReactNode;
  /** Over this many rows, the card shows `collapsedRows` and "Show all". 20 by default. */
  maxRows?: number | undefined;
  /** How many rows a long result shows at first. 10 by default. */
  collapsedRows?: number | undefined;
  /** What an empty result says. "No rows match." by default. */
  emptyMessage?: ReactNode;
  labels?: Partial<ResultTableCardLabels> | undefined;
}

/**
 * A result as a table in a card: its title and window, the rows with
 * tabular figures and a total row, and a foot with the exports and a way to
 * the page the rows come from.
 *
 * THE CARD IS THE FRAME. The table draws no edge of its own and its outer
 * cells take the card's inset, so every row lines up with the title. The
 * first column takes the room the figures leave and ends a long name in an
 * ellipsis; a host that cuts names gives the cell its own tooltip.
 *
 * A FOOT OF UTILITIES, so it starts on the card's text edge: the downloads
 * first (their ghost padding pulled out so the first glyph sits on that edge)
 * and the link at the far end.
 *
 * A LONG RESULT IS SHORTENED, never paged: over `maxRows` rows, the first
 * `collapsedRows` and "Show all 48", which shows the rest in place.
 */
export function ResultTableCard({
  title,
  window: span,
  headers,
  rows,
  align,
  total,
  downloads,
  link,
  maxRows = RESULT_TABLE_MAX_ROWS,
  collapsedRows = RESULT_TABLE_COLLAPSED_ROWS,
  emptyMessage = 'No rows match.',
  labels: overrides,
  className,
  ...rest
}: ResultTableCardProps) {
  const labels = overrides ? { ...RESULT_TABLE_CARD_LABELS, ...overrides } : RESULT_TABLE_CARD_LABELS;
  const [expanded, setExpanded] = useState(false);
  const long = rows.length > maxRows;
  const shown = long && !expanded ? rows.slice(0, collapsedRows) : rows;
  const hasLink = link !== undefined && link !== null && link !== false;
  const foot =
    (downloads && downloads.length > 0) || hasLink ? (
      <>
        {downloads?.map((download) => (
          <DownloadButton
            key={download.filename}
            label={download.label}
            filename={download.filename}
            file={download.file}
            className="crewlet-result-table-card__download"
          />
        ))}
        {hasLink ? <span className="crewlet-result-table-card__link">{link}</span> : null}
      </>
    ) : undefined;
  return (
    <StatusCard
      {...rest}
      title={title}
      subtitle={span}
      subtitlePlacement="below"
      bodyPadding="none"
      actions={foot}
      actionsAlign="start"
      className={cx('crewlet-result-table-card', className)}
    >
      <Table
        framed={false}
        caption={title}
        captionHidden
        headers={headers}
        data={shown}
        align={align}
        footer={total}
        emptyMessage={emptyMessage}
        actionButton={long && !expanded ? { label: labels.showAll(rows.length), onClick: () => setExpanded(true) } : undefined}
        className="crewlet-result-table-card__table"
      />
    </StatusCard>
  );
}
