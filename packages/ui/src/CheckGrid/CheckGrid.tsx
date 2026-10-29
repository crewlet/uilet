import { useId, type ReactNode } from 'react';
import { Checkbox } from '../Checkbox/index.js';
import { cx } from '../utils/cx.js';

/** A row of the grid: who or what the boxes on it are about. */
export interface CheckGridRow {
  value: string;
  /** The row's name, drawn at its start and read as the first half of each box's name. */
  label: string;
  /** A picture before the name: an avatar, a glyph. Decorative; the name says it. */
  media?: ReactNode;
}

/** A column of the grid: what a box in it switches on. */
export interface CheckGridColumn {
  value: string;
  /** The column's name, drawn over it (beside each box where the grid stacks) and read as the second half of each box's name. */
  label: string;
  /** A picture before the column's name in its header. Decorative; the name says it. */
  media?: ReactNode;
  /**
   * Why a box in this column cannot be ticked, where it cannot. A box left
   * unticked in it is disabled and described by this reason, which the grid
   * draws once under itself; a box already ticked (or partly) stays enabled,
   * so what is on can always be taken off.
   */
  disabledReason?: string | undefined;
}

/** What one box shows: on, off, or partly on (some of what it stands for). */
export type CheckGridState = 'checked' | 'unchecked' | 'mixed';

export interface CheckGridProps {
  /** Names the whole grid for a screen reader: "Jobs per seat". */
  label: string;
  rows: readonly CheckGridRow[];
  columns: readonly CheckGridColumn[];
  /** The state of the box where `row` meets `column`. */
  stateOf: (row: string, column: string) => CheckGridState;
  /** A box pressed: `checked` is what it asks for. */
  onChange: (row: string, column: string, checked: boolean) => void;
  className?: string | undefined;
}

/** The most columns the grid stands side by side for; a grid with more always stacks. */
const MOST_COLUMNS = 6;

/**
 * Checkboxes where rows meet columns: which seats run which jobs, which
 * people hold which access.
 *
 * ONE MARKUP FOR EVERY WIDTH, laid out by the grid's own width (a container
 * query), never the window's. Where every column fits, a header row names the
 * columns and each row's boxes stand under them. Where they do not, each row
 * stacks: its name, then its boxes, each with its column's name beside it. No
 * column is ever cut off behind a scroll the reader cannot see.
 *
 * EVERY BOX IS NAMED BY ITS ROW AND ITS COLUMN ("Backend Engineer Coding"),
 * read from the two labels drawn, so the name always holds the words a reader
 * sees. Each row is a group named by its row, and the header row is hidden
 * from assistive technology, since each box already says its column. The
 * boxes are native checkboxes in reading order: Tab moves row by row, Space
 * ticks.
 */
export function CheckGrid({ label, rows, columns, stateOf, onChange, className }: CheckGridProps) {
  const base = useId();
  const rowId = (r: number) => `${base}-row-${r}`;
  const noteId = (c: number) => `${base}-note-${c}`;
  const layout = columns.length > MOST_COLUMNS ? 'many' : String(columns.length);
  const notes = columns.flatMap((column, c) => (column.disabledReason ? [{ column, c }] : []));
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('crewlet-check-grid', `crewlet-check-grid--${layout}`, className)}
      style={{ ['--crewlet-check-grid-columns' as string]: columns.length }}
    >
      <div className="crewlet-check-grid__table">
        <div className="crewlet-check-grid__head" aria-hidden="true">
          <span />
          {columns.map((column) => (
            <span key={column.value} className="crewlet-check-grid__column">
              {column.media ? <span className="crewlet-check-grid__media">{column.media}</span> : null}
              {column.label}
            </span>
          ))}
        </div>
        {rows.map((row, r) => (
          <div key={row.value} role="group" aria-labelledby={rowId(r)} className="crewlet-check-grid__row">
            <span className="crewlet-check-grid__name">
              {row.media ? <span className="crewlet-check-grid__media">{row.media}</span> : null}
              <span id={rowId(r)}>{row.label}</span>
            </span>
            {columns.map((column, c) => {
              const state = stateOf(row.value, column.value);
              const refused = column.disabledReason !== undefined && state === 'unchecked';
              const box = `${base}-box-${r}-${c}`;
              return (
                <Checkbox
                  key={column.value}
                  id={box}
                  size="sm"
                  className="crewlet-check-grid__box"
                  label={column.label}
                  aria-labelledby={`${rowId(r)} ${box}-label`}
                  aria-describedby={refused ? noteId(c) : undefined}
                  checked={state === 'checked'}
                  indeterminate={state === 'mixed'}
                  disabled={refused}
                  onCheckedChange={(next) => onChange(row.value, column.value, next)}
                />
              );
            })}
          </div>
        ))}
      </div>
      {notes.length > 0 ? (
        <ul className="crewlet-check-grid__notes">
          {notes.map(({ column, c }) => (
            <li key={column.value} id={noteId(c)}>
              {column.label}: {column.disabledReason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
