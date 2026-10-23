import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx.js';
import { StatusDot } from '../StatusDot/index.js';

/** The words the three columns are named by, for assistive technology and the optional header row. */
export interface SettingsTableColumns {
  setting?: string | undefined;
  value?: string | undefined;
  source?: string | undefined;
}

export interface SettingsTableProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Draws the column names as a header row. Off by default: a page that
   * stacks one table per group (a card each) would repeat the same three
   * words over every card. The names are always exposed to assistive
   * technology, drawn or not.
   */
  header?: boolean | undefined;
  /** The column names. Defaults to Setting, Value and Source. */
  columns?: SettingsTableColumns | undefined;
  children?: ReactNode;
}

const COLUMNS: Required<SettingsTableColumns> = { setting: 'Setting', value: 'Value', source: 'Source' };

/**
 * A read-only table of settings: what each is called, the value in force and
 * where that value comes from.
 *
 * ONE COLUMN GRID FOR EVERY TABLE ON A PAGE. The tracks are fractions of the
 * table's own width (`--crewlet-settings-table-columns`), never the width of
 * the longest label, so a page that stacks a table per group in cards of one
 * width puts every value and every source on one vertical line down the page.
 * A term column sized to its own longest term started the values at a
 * different place in every card, and a fixed one left them floating a third
 * of the way across a wide card with the rest of the row empty.
 *
 * THE SOURCE IS QUIET UNLESS IT IS NEWS. A value that is the default says so
 * in the tertiary ink, as a word rather than a tag: a tag on every row is
 * noise that teaches a reader to skip the column. A value that differs from
 * its default (`changed`) carries a mark before its source, which is the one
 * row in the table a reader scanning it came to find.
 *
 * A TABLE, BECAUSE IT IS ONE. Every row carries the same three fields, so it
 * is announced as a table with its column names, and each setting's name is
 * the row's header. The roles are written out rather than taken from table
 * elements because the row folds into two lines on a narrow table, and a
 * table element that changes its display loses its semantics in some
 * browsers.
 */
export function SettingsTable({ header = false, columns, className, children, ...rest }: SettingsTableProps) {
  const names = { ...COLUMNS, ...columns };
  return (
    <div {...rest} role="table" className={cx('crewlet-settings-table', className)}>
      <div
        role="rowgroup"
        className={cx('crewlet-settings-table__head', !header && 'crewlet-settings-table__head--hidden')}
      >
        <div role="row" className="crewlet-settings-table__row">
          <span role="columnheader" className="crewlet-settings-table__name">
            {names.setting}
          </span>
          <span role="columnheader" className="crewlet-settings-table__name">
            {names.value}
          </span>
          <span role="columnheader" className="crewlet-settings-table__name">
            {names.source}
          </span>
        </div>
      </div>
      <div role="rowgroup" className="crewlet-settings-table__body">
        {children}
      </div>
    </div>
  );
}

export interface SettingsTableRowProps extends HTMLAttributes<HTMLDivElement> {
  /** What the setting is called, in a reader's words. */
  label: ReactNode;
  /**
   * The setting's address in the document it is written in
   * (`turn_engine.max_iterations`), drawn quietly under its name in the
   * monospace face. For the reader who will go and change it there.
   */
  settingKey?: string | undefined;
  /** The value in force, in its own unit. Drawn in tabular figures. */
  children?: ReactNode;
  /** Where the value comes from: "Default", "Set in the company document". */
  source?: ReactNode;
  /** The value differs from its default: the source carries a mark. */
  changed?: boolean | undefined;
}

/** One setting: its name (and key), its value and its source. */
export function SettingsTableRow({
  label,
  settingKey,
  source,
  changed = false,
  className,
  children,
  ...rest
}: SettingsTableRowProps) {
  return (
    <div
      {...rest}
      role="row"
      data-changed={changed ? '' : undefined}
      className={cx('crewlet-settings-table__row', className)}
    >
      <span role="rowheader" className="crewlet-settings-table__setting">
        <span className="crewlet-settings-table__label">{label}</span>
        {settingKey === undefined ? null : <code className="crewlet-settings-table__key">{settingKey}</code>}
      </span>
      <span role="cell" className="crewlet-settings-table__value">
        {children}
      </span>
      <span
        role="cell"
        className={cx('crewlet-settings-table__source', changed && 'crewlet-settings-table__source--changed')}
      >
        {changed ? <StatusDot tone="brand" /> : null}
        {source}
      </span>
    </div>
  );
}

SettingsTable.Row = SettingsTableRow;
