import type { ReactNode } from 'react';
import { Avatar, type AvatarKind, type AvatarSizeStep } from '../Avatar/index.js';
import { EmptyValue } from '../EmptyValue/index.js';
import { Link } from '../Link/index.js';
import { RelativeTime, type TimeValue } from '../RelativeTime/index.js';
import { Tag } from '../Tag/index.js';
import { Text } from '../Text/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';
import type { Tone } from '../utils/tone.js';

/*
 * The read-only cells every table draws.
 *
 * ONE COMPONENT PER KIND OF VALUE, because the same value must look the same
 * wherever it appears: an absent number wears the same mark in every column, a
 * date reads relative in every table, and a person is a badge and a name on
 * every screen rather than a handle on one and a display name on the next.
 *
 * NOTHING HERE FETCHES, FORMATS A DOMAIN OR DECIDES WHAT A VALUE MEANS. A cell
 * renders what it is handed: the host formats a figure (`format`), names a
 * status's tone and word, and builds a link's address. What a cell adds over
 * writing the value directly is what a formatter cannot: an ABSENT value is an
 * [EmptyValue] that says what kind of absence it is, an identifier stays on
 * one line with its whole value on hover, and a figure takes tabular digits so
 * a column of them lines up.
 *
 * PREFIXED `Table`, because the editable cells of a sheet already own the bare
 * names (`NumberCell`, `DateCell`, `StatusCell`, `TextCell` in SheetGrid), and
 * a read-only table cell and a sheet cell that edits in place are different
 * components that must not be confused at an import.
 */

export interface TableKeyCellProps {
  /** The identifier: a key, a handle, an id. Its whole value is the cell's title. */
  value: string | null | undefined;
  /** What the cell prints where that is shorter than the value: an id cut to its head. */
  text?: string | undefined;
  /** Where the identifier goes. Without it the cell is plain text. */
  href?: string | undefined;
  /** What an absent identifier means, read in place of the dash. */
  emptyLabel?: string | undefined;
}

/**
 * An identifier, monospaced, on ONE line, cut with its whole value on the
 * title. An identifier is one token with no space to break at, so wrapping it
 * at whatever character the column ran out on stood the row two lines tall and
 * printed a key nobody could search for.
 */
export function TableKeyCell({ value, text, href, emptyLabel = 'Not set' }: TableKeyCellProps) {
  if (!value) return <EmptyValue label={emptyLabel} />;
  if (href !== undefined) {
    return (
      <Link href={href} size="inherit" className="crewlet-table-cell__key" title={value}>
        {text ?? value}
      </Link>
    );
  }
  return (
    <span className="crewlet-table-cell__key" title={value}>
      {text ?? value}
    </span>
  );
}

export interface TableNumberCellProps {
  value: number | null | undefined;
  /**
   * How the figure is spelled. The host's own formatter, so a cell never
   * spells a figure differently from the rest of the screen. Defaults to the
   * locale's grouping.
   */
  format?: ((value: number) => string) | undefined;
  /** Printed after the figure: " ms", "%". */
  suffix?: string | undefined;
  title?: string | undefined;
  /** What an absent figure means. Absent is not zero. */
  emptyLabel?: string | undefined;
}

const groupFigure = (value: number) => value.toLocaleString();

/**
 * A figure, tabular, and a marked absence when there is none.
 *
 * ABSENT IS NOT ZERO, which is the whole reason the cell exists: "nothing is
 * recorded" and "nothing was spent" are different facts, and a column that
 * draws both as `0` makes the first invisible. A duration or a token count is
 * this cell with the host's formatter.
 */
export function TableNumberCell({
  value,
  format = groupFigure,
  suffix,
  title,
  emptyLabel = 'Nothing recorded',
}: TableNumberCellProps) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <EmptyValue label={emptyLabel} />;
  return (
    <span className="crewlet-table-cell__number" title={title}>
      {format(value)}
      {suffix}
    </span>
  );
}

export interface TableDateCellProps {
  value: TimeValue | null | undefined;
  /** Overrides the shared clock, for a story or a suite. */
  now?: number | undefined;
  /** What an absent instant means: "Never", "Not scheduled". */
  emptyLabel?: string | undefined;
}

/**
 * An instant, relative in the cell and exact on hover: a table scanned for
 * "what moved today" is read in relative time, and the exact instant is what
 * somebody needs once they have found the row. It is [RelativeTime], kept on
 * one line in the quiet ink a date column takes.
 */
export function TableDateCell({ value, now, emptyLabel = 'Never' }: TableDateCellProps) {
  if (value === null || value === undefined || value === '') return <EmptyValue label={emptyLabel} />;
  return <RelativeTime value={value} now={now} emptyLabel={emptyLabel} className="crewlet-table-cell__date" />;
}

export interface TableEntityCellProps {
  /** Who or what the row names. Absent, the cell is a marked absence. */
  name: string | null | undefined;
  /** Drawn as `Avatar` draws it: a squircle for an agent, a circle for a person. */
  kind?: AvatarKind | undefined;
  /**
   * A badge of the host's own in place of the initials badge, such as a
   * `PrincipalAvatar` carrying an agent's character. It is drawn as
   * decoration, because the name is printed beside it.
   */
  badge?: ReactNode;
  /**
   * Where the name goes. Leave it out inside a row that is itself a link: an
   * anchor inside an anchor is markup no browser agrees about.
   */
  href?: string | undefined;
  /** The hover text, where the name is not the whole story. */
  title?: string | undefined;
  size?: AvatarSizeStep | undefined;
  emptyLabel?: string | undefined;
}

/**
 * A seat, a person or a team: the identity badge and the name, optionally a
 * link to its page.
 *
 * ONE BADGE FOR ONE IDENTITY, the kit's `Avatar`, so the same person reads the
 * same in every table. The badge is decorative, because the name is printed
 * beside it: without that the row reads "Ada Lovelace avatar, Ada Lovelace".
 */
export function TableEntityCell({
  name,
  kind = 'agent',
  badge,
  href,
  title,
  size = 'xs',
  emptyLabel = 'Nobody',
}: TableEntityCellProps) {
  if (!name) return <EmptyValue label={emptyLabel} />;
  const inner = (
    <>
      <span className="crewlet-table-cell__badge" aria-hidden="true">
        {badge ?? <Avatar name={name} size={size} kind={kind} decorative />}
      </span>
      <span className="crewlet-table-cell__truncate">{name}</span>
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} variant="subtle" size="inherit" className="crewlet-table-cell__entity" title={title ?? name}>
        {inner}
      </Link>
    );
  }
  return (
    <span className="crewlet-table-cell__entity" title={title ?? name}>
      {inner}
    </span>
  );
}

export interface TableStatusCellProps {
  /** The state's word, always printed: a glyph is never the only carrier. */
  label: string;
  /**
   * The state's mark: a character such as a filled or a hollow circle, or a
   * glyph. Hidden from assistive technology, since the word says it.
   */
  glyph: ReactNode;
  tone?: Tone | undefined;
  title?: string | undefined;
}

/**
 * A state's mark with its word, never colour alone.
 *
 * THE MARK IS THE CALLER'S, which is what sets it apart from `StatusDot`: half
 * of what a status column says is a HOLLOW counterpart (filled against hollow
 * for "running the active revision" against "nothing reported"), and a filled
 * dot has no unfilled state. The tone colours the mark and never the word.
 */
export function TableStatusCell({ label, glyph, tone = 'neutral', title }: TableStatusCellProps) {
  return (
    <span className={cx('crewlet-table-cell__status', `crewlet-table-cell__status--${tone}`)} title={title ?? label}>
      <span className="crewlet-table-cell__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="crewlet-table-cell__truncate">{label}</span>
    </span>
  );
}

export interface TableTagsCellLabels {
  /** The count of tags past `max`, read in full: "2 more tags". */
  more: (count: number) => string;
}

export const TABLE_TAGS_CELL_LABELS: TableTagsCellLabels = {
  more: (count) => (count === 1 ? '1 more tag' : `${count.toLocaleString()} more tags`),
};

export interface TableTagsCellProps {
  tags: readonly string[] | null | undefined;
  /** How many tags are drawn before the rest are counted. Three by default. */
  max?: number | undefined;
  emptyLabel?: string | undefined;
  labels?: Partial<TableTagsCellLabels> | undefined;
}

/**
 * Tags, capped with a count rather than wrapping a row to three lines. Neutral
 * and outlined: a tag names a thing, and identity takes no colour. The tags
 * past the cap are named on the count's title and counted in words for a
 * screen reader.
 */
export function TableTagsCell({ tags, max = 3, emptyLabel = 'No tags', labels: overrides }: TableTagsCellProps) {
  const list = tags ?? [];
  if (list.length === 0) return <EmptyValue label={emptyLabel} />;
  const labels: TableTagsCellLabels = overrides ? { ...TABLE_TAGS_CELL_LABELS, ...overrides } : TABLE_TAGS_CELL_LABELS;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <span className="crewlet-table-cell__tags">
      {shown.map((tag) => (
        <Tag key={tag} appearance="outline" size="xs">
          {tag}
        </Tag>
      ))}
      {rest > 0 && (
        <span className="crewlet-table-cell__more" title={list.slice(max).join(', ')}>
          <span aria-hidden="true">+{rest}</span>
          <VisuallyHidden>{labels.more(rest)}</VisuallyHidden>
        </span>
      )}
    </span>
  );
}

export type TableTextCellProps = { children: ReactNode } & (
  | {
      /**
       * A mark every row of the column wears, such as the column's own glyph.
       * The header carries the meaning, so it is drawn as decoration.
       */
      icon?: ReactNode;
      mark?: never;
    }
  | {
      icon?: never;
      /**
       * A mark that varies per row and states a fact of its own (a bug, an
       * epic), so it brings its own accessible name and is read.
       */
      mark: ReactNode;
    }
);

/**
 * Plain text with an optional leading mark, cut on one line.
 *
 * TWO SPELLINGS OF ONE SLOT, because a column's mark and a row's mark are
 * different facts: `icon` is the column's and is hidden, `mark` is the row's
 * and is read. Exactly one of the two, enforced by the type: a cell given both
 * would draw the column's answer over the row's.
 */
export function TableTextCell({ children, icon, mark }: TableTextCellProps) {
  return (
    <span className="crewlet-table-cell__text">
      {mark ??
        (icon !== undefined && icon !== null ? (
          <span className="crewlet-table-cell__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null)}
      <span className="crewlet-table-cell__truncate">{children}</span>
    </span>
  );
}

/** Which of a two-line cell's lines is a literal, set in the mono face. */
export type TableTwoLineCellMono = 'value' | 'detail' | 'both';

export type TableTwoLineCellProps = {
  /** The value, in the cell's own register: a name, a key, a short state. */
  value: ReactNode;
  /**
   * The quieter line under it, a caption in the secondary ink: where it runs,
   * the id it resolves to, when it last answered. Left out, the cell is the
   * value's one line, at the same place a row of two-line cells puts it.
   */
  detail?: ReactNode;
  /**
   * Which line is a literal (a command, an id, a key), set in the mono face:
   * in the sans face `--` and `=` read as prose.
   */
  mono?: TableTwoLineCellMono | undefined;
  /**
   * The whole cell's hover text, where the two lines are not the whole story
   * (a model's CLI, key and id in one line). Given, neither line adds its own.
   */
  title?: string | undefined;
  /**
   * Whether a cut line carries its whole words as its title (`Text`'s
   * `titleWhenCut`). On by default. Off where something else already shows
   * them, a `Tooltip` around the cell.
   */
  titleWhenCut?: boolean | undefined;
} & (
  | {
      /**
       * A mark every row of the column wears, centred against the two lines.
       * The header carries the meaning, so it is drawn as decoration.
       */
      icon?: ReactNode;
      mark?: never;
    }
  | {
      icon?: never;
      /**
       * A mark that varies per row and states a fact of its own (a vendor, the
       * CLI a model runs on), centred against the two lines. It brings its own
       * accessible name and is read.
       */
      mark: ReactNode;
    }
);

/**
 * A value over a quieter line, each cut on one line: a name over where it
 * runs, a key over the id it resolves to, a short state over when it began.
 *
 * TWO LINES IN TWO REGISTERS, ALWAYS THE SAME TWO, so every two-line cell in a
 * table reads alike: the value in the cell's own register (it inherits the
 * grid's size and ink), the line under it a caption in the secondary ink. A
 * row of them is as tall as two lines whatever they hold, because each line
 * is cut with an ellipsis rather than wrapped, and its whole words are on its
 * title while it is cut (`Text`'s `truncate`).
 *
 * A MARK STANDS CENTRED AGAINST BOTH LINES, the way a vendor's mark stands
 * beside a service's name and host. In a grid's stacked rows the lines, not
 * the mark, give the row its baseline, so a column's label stands on the
 * value's line (DataGrid.css).
 */
export function TableTwoLineCell({
  value,
  detail,
  mono,
  title,
  titleWhenCut = true,
  icon,
  mark,
}: TableTwoLineCellProps) {
  const ownTitles = titleWhenCut && title === undefined;
  const hasDetail = detail !== undefined && detail !== null && detail !== false && detail !== '';
  const leading =
    mark ??
    (icon !== undefined && icon !== null ? (
      <span className="crewlet-table-cell__icon" aria-hidden="true">
        {icon}
      </span>
    ) : null);
  // An empty mark or icon (`cond ? <Glyph /> : null`) draws no leading slot,
  // so the lines are the whole cell and carry its title.
  const leads = leading !== null && leading !== undefined && leading !== false;
  const lines = (
    <span className="crewlet-table-cell__lines" title={leads ? undefined : title}>
      <Text variant="inherit" truncate mono={mono === 'value' || mono === 'both'} titleWhenCut={ownTitles}>
        {value}
      </Text>
      {hasDetail ? (
        <Text
          variant="caption"
          tone="secondary"
          truncate
          mono={mono === 'detail' || mono === 'both'}
          titleWhenCut={ownTitles}
        >
          {detail}
        </Text>
      ) : null}
    </span>
  );
  if (!leads) return lines;
  return (
    <span className="crewlet-table-cell__two-line" title={title}>
      {leading}
      {lines}
    </span>
  );
}
