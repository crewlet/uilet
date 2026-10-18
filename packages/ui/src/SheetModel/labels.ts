/**
 * Every string a sheet says, in one table both renderers read, so the React
 * grid and the artifact kit's custom element say the same words and a host
 * overrides them in one place.
 */

import type { SheetColumnType, SheetSyncState } from './types.js';

export interface SheetLabels {
  /** The row number column's header, read but not seen. */
  rowHeader: string;
  /** The add-row control. */
  addRow: string;
  /** An empty cell, read but not seen. */
  empty: string;
  checked: string;
  unchecked: string;
  /** A rating, read out: "3 of 5 stars". */
  rating: (value: number, max: number) => string;
  /** An option that was archived after a value chose it. */
  archived: (label: string) => string;
  /** A person value the host could not resolve to a name. */
  unknownPerson: string;
  /** A column type, for a header's description and a schema editor. */
  types: Record<SheetColumnType, string>;
  /** A pending cell, in its description (D23). */
  saving: string;
  /** The default refusal when the host gives no reason: the reader cannot edit. */
  forbidden: string;
  /** A refusal the engine gave no reason for. */
  couldNotSave: string;
  /** A value that does not fit its column. */
  notANumber: (column: string) => string;
  belowMin: (column: string, min: string) => string;
  aboveMax: (column: string, max: string) => string;
  tooLong: (column: string, max: number) => string;
  required: (column: string) => string;
  notAnOption: (column: string) => string;
  tooManyItems: (column: string, max: number) => string;
  notAPerson: (column: string) => string;
  notADate: (column: string) => string;
  notAUrl: (column: string) => string;
  notARating: (column: string, max: number) => string;
  notABoolean: (column: string) => string;
  /** A read-only cell a person tried to change. */
  readOnly: (column: string) => string;
  /** A remote write landed on the cell being edited. */
  conflict: (writer: string, value: string) => string;
  keepMine: string;
  useTheirs: (writer: string) => string;
  /** The writer of a conflicting change, when the host could not name them. */
  someone: string;
  /** A change mark's words: "Changed by Maya Ortiz, 10:42. Was 6.8." */
  changed: (by: string, at: string, previous: string | null) => string;
  /** The per-cell history control and its shortcut's description. */
  history: string;
  /** The sync strip. */
  sync: (state: SheetSyncState) => string;
  retry: string;
  /** The editor's filter box in an option list. */
  filter: string;
  /** An option list with nothing left to show. */
  noOptions: string;
  /** Clears a select or a person cell from its list. */
  clear: string;
  /** The keyboard help a grid is described by. */
  keyboardHelp: string;
  /** A sort, for the header's control. */
  sortBy: (column: string) => string;
}

const TYPE_NAMES: Record<SheetColumnType, string> = {
  text: 'Text',
  longtext: 'Long text',
  number: 'Number',
  checkbox: 'Checkbox',
  select: 'Select',
  multiselect: 'Multi-select',
  status: 'Status',
  person: 'Person',
  date: 'Date',
  url: 'URL',
  rating: 'Rating',
};

const changes = (count: number) => (count === 1 ? '1 change' : `${count} changes`);

export const SHEET_LABELS: SheetLabels = {
  rowHeader: 'Row',
  addRow: 'Add row',
  empty: 'Empty',
  checked: 'Checked',
  unchecked: 'Not checked',
  rating: (value, max) => `${value} of ${max} stars`,
  archived: (label) => `Archived: ${label}`,
  unknownPerson: 'Unknown person',
  types: TYPE_NAMES,
  saving: 'Saving',
  forbidden: 'You can view this sheet but not edit it.',
  couldNotSave: 'Could not save this change.',
  notANumber: (column) => `${column} must be a number.`,
  belowMin: (column, min) => `${column} must be at least ${min}.`,
  aboveMax: (column, max) => `${column} must be at most ${max}.`,
  tooLong: (column, max) => `${column} must be at most ${max} characters.`,
  required: (column) => `${column} is required.`,
  notAnOption: (column) => `${column} must be one of its options.`,
  tooManyItems: (column, max) => `${column} holds at most ${max} options.`,
  notAPerson: (column) => `${column} must be a person or an agent in this company.`,
  notADate: (column) => `${column} must be a date.`,
  notAUrl: (column) => `${column} must be a web address starting with https:// or http://.`,
  notARating: (column, max) => `${column} must be a whole number from 1 to ${max}.`,
  notABoolean: (column) => `${column} must be checked or not checked.`,
  readOnly: (column) => `${column} is read only.`,
  conflict: (writer, value) => `${writer} changed this to ${value} while you were editing.`,
  keepMine: 'Keep yours',
  useTheirs: (writer) => `Use ${writer}'s`,
  someone: 'Someone',
  changed: (by, at, previous) => `Changed by ${by}, ${at}.${previous === null ? '' : ` Was ${previous}.`}`,
  history: 'Cell history',
  sync: (state) => {
    if (state.offline) {
      return state.saving === 0 ? 'Offline.' : `Offline. ${changes(state.saving)} will sync when you reconnect.`;
    }
    if (state.failed !== undefined && state.failed > 0) return 'Could not save.';
    if (state.saving > 0) return `Saving ${changes(state.saving)}`;
    return 'Saved';
  },
  retry: 'Retry',
  filter: 'Filter options',
  noOptions: 'No matching options',
  clear: 'Clear',
  keyboardHelp:
    'Arrow keys move between cells. Enter or F2 edits a cell, Escape cancels, and typing replaces its value. Space toggles a checkbox. Control or Command with C and V copies and pastes. Control or Command with Alt and H opens the history of a cell.',
  sortBy: (column) => `Sort by ${column}`,
};

/** Labels with a caller's overrides applied, the one way both renderers merge them. */
export function sheetLabels(overrides?: Partial<SheetLabels>): SheetLabels {
  return { ...SHEET_LABELS, ...overrides, types: { ...SHEET_LABELS.types, ...overrides?.types } };
}
