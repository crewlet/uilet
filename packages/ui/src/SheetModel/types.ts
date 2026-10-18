/**
 * The shapes an editable sheet is drawn from.
 *
 * They mirror the engine's datastore schema (`artifacts.Column`,
 * `artifacts.Option`) closely enough that a host maps a collection's schema
 * onto them field for field, and loosely enough that a page can declare a
 * sheet by hand. Values travel as the JSON the datastore holds: a sheet
 * normalises what it is given (`normalizeValue`) rather than trusting it.
 */

import type { NodeHue } from '../utils/nodeHue.js';

/** Every column type a sheet draws and edits: the engine's `artifacts.ColumnTypes`, in its order. */
export const SHEET_COLUMN_TYPES = [
  'text',
  'longtext',
  'number',
  'checkbox',
  'select',
  'multiselect',
  'status',
  'person',
  'date',
  'url',
  'rating',
] as const;

export type SheetColumnType = (typeof SHEET_COLUMN_TYPES)[number];

/** Whether a value read off the wire names a column type this build draws. */
export const isSheetColumnType = (value: unknown): value is SheetColumnType =>
  typeof value === 'string' && (SHEET_COLUMN_TYPES as readonly string[]).includes(value);

/** A status option's category, which decides its tone when its colour names none. */
export type SheetStatusCategory = 'todo' | 'in_progress' | 'done' | 'blocked';

/** One option of a select, multi-select or status column. Ids are stable; labels and colours may change. */
export interface SheetOption {
  id: string;
  label: string;
  /** A design-token hue or tone name (`amber`, `neutral`, `success`), never a literal colour. */
  color?: string | undefined;
  category?: SheetStatusCategory | undefined;
  /** An archived option still draws the values that name it ("Archived: Gold") and is offered to nobody. */
  archived?: boolean | undefined;
}

/** How a number column writes its values. */
export type SheetNumberStyle = 'plain' | 'percent' | 'currency';

/** One column of a sheet. */
export interface SheetColumn {
  /** The document field the column edits. */
  field: string;
  /** The column's name, in the header and in every cell's accessible description. */
  label: string;
  type: SheetColumnType;
  /** Width in px. Each type has a default. */
  width?: number | undefined;
  /** Stays in view while the sheet scrolls sideways. Frozen columns are the leading ones. */
  frozen?: boolean | undefined;
  readOnly?: boolean | undefined;
  /** Clearing a required cell is refused on the cell. */
  required?: boolean | undefined;
  options?: readonly SheetOption[] | undefined;
  /** Number: the least value; rating: unused. */
  min?: number | undefined;
  /** Number: the greatest value; rating: the number of stars (1 to 10, 5 by default). */
  max?: number | undefined;
  /** Number: decimals drawn and kept. */
  precision?: number | undefined;
  numberStyle?: SheetNumberStyle | undefined;
  /** An ISO 4217 code, for `numberStyle: 'currency'`. */
  currency?: string | undefined;
  /** Text and long text: the most characters a value may hold. */
  maxLength?: number | undefined;
  /** Multi-select: the most options a value may hold. */
  maxItems?: number | undefined;
  /** Date: the value carries a time of day, as RFC 3339 UTC, rather than a calendar date. */
  time?: boolean | undefined;
}

/** A person or an agent a person cell can name, as the host resolved them. */
export interface SheetPerson {
  /** The value a person cell stores: the seat handle or principal reference. */
  id: string;
  name: string;
  kind: 'human' | 'agent';
  hue?: NodeHue | undefined;
  character?: string | undefined;
  src?: string | undefined;
}

/** What a cell holds once normalised. */
export type SheetValue = string | number | boolean | readonly string[] | null;

/** Who last changed a cell, for its change mark. */
export interface SheetChange {
  /** The writer's display name. */
  by: string;
  at: string | number | Date;
  /** The value before the change, when it is worth saying. */
  previous?: SheetValue | undefined;
}

/** One row of a sheet. */
export interface SheetRow {
  /** The document id. */
  id: string;
  /** The document's fields, as the datastore holds them. */
  values: Readonly<Record<string, unknown>>;
  /** Fields with an edit the engine has not confirmed yet: drawn as Saving (D23). */
  pending?: readonly string[] | undefined;
  /** Fields whose last edit the engine refused, with the reason said on the cell. */
  refused?: Readonly<Record<string, string>> | undefined;
  /** Fields changed since the reader last looked, with who changed them. */
  changed?: Readonly<Record<string, SheetChange>> | undefined;
}

/** One cell edit a sheet asks its host to make. */
export interface SheetEdit {
  rowId: string;
  field: string;
  value: SheetValue;
}

/** A collaborator on a cell. */
export interface SheetCellPresence {
  rowId: string;
  field: string;
  /** The collaborator's session or seat, unique among the entries for one cell. */
  id: string;
  name: string;
  kind: 'human' | 'agent';
  hue: NodeHue;
  /** Editing the cell rather than looking at it. */
  editing?: boolean | undefined;
  idle?: boolean | undefined;
}

/** A sort a sheet is drawn in. */
export interface SheetSort {
  field: string;
  direction: 'ascending' | 'descending';
}

/** Where a host's writes stand, for the sheet's sync strip. */
export interface SheetSyncState {
  /** Edits sent and not yet confirmed. */
  saving: number;
  /** The connection is down; `saving` edits wait for it. */
  offline?: boolean | undefined;
  /** Edits that could not be saved and can be retried. */
  failed?: number | undefined;
}
