/**
 * The mappings between what the runtime and a page's markup say and what the
 * sheet draws: schema columns and `<crewlet-column>` attributes to sheet
 * columns, viewers to the people a person cell names, peers to presence.
 *
 * Plain functions with no React and no document, so each rule is tested on
 * its own and the element and the component stay thin.
 */

import { assignPresenceHues, type PresenceMember } from '@crewlethq/ui/PresenceModel';
import {
  isSheetColumnType,
  parseOptionList,
  type SheetCellPresence,
  type SheetColumn,
  type SheetOption,
  type SheetPerson,
  type SheetSort,
  type SheetStatusCategory,
} from '@crewlethq/ui/SheetModel';
import { isNodeHue, type NodeHue } from '@crewlethq/ui/utils';
import type { KitPeer, KitSchema, KitSchemaColumn, KitViewer } from './runtime.js';

const CATEGORIES: readonly string[] = ['todo', 'in_progress', 'done', 'blocked'];

function options(column: KitSchemaColumn): SheetOption[] | undefined {
  if (!column.options) return undefined;
  return column.options.map((option) => {
    const out: SheetOption = { id: option.id, label: option.label };
    if (option.color) out.color = option.color;
    if (option.category && CATEGORIES.includes(option.category)) out.category = option.category as SheetStatusCategory;
    if (option.archived) out.archived = true;
    return out;
  });
}

/**
 * A collection's schema as sheet columns. A hidden column is not drawn; the
 * primary column is frozen; a type this build does not know (a newer engine's)
 * is preserved as read-only text rather than dropped, as ADR-0006 asks.
 */
export function columnsFromSchema(schema: KitSchema | null): SheetColumn[] {
  const out: SheetColumn[] = [];
  for (const column of schema?.columns ?? []) {
    if (column.hidden) continue;
    const type = column.type;
    const known = isSheetColumnType(type);
    const mapped: SheetColumn = { field: column.key, label: column.label || column.key, type: known ? type : 'text' };
    if (!known) mapped.readOnly = true;
    if (column.primary) mapped.frozen = true;
    if (column.required) mapped.required = true;
    if (column.min !== undefined) mapped.min = column.min;
    if (column.max !== undefined) mapped.max = column.max;
    if (column.max_length !== undefined) mapped.maxLength = column.max_length;
    if (column.max_items !== undefined) mapped.maxItems = column.max_items;
    const choices = options(column);
    if (choices) mapped.options = choices;
    out.push(mapped);
  }
  return out;
}

/** A number column's `format` attribute: `plain`, `0.0`, `percent`, `0.0%`, `currency:EUR`. */
export function applyNumberFormat(column: SheetColumn, format: string): void {
  const text = format.trim();
  if (text === '' || text === 'plain') return;
  const currency = /^currency:([A-Za-z]{3})$/.exec(text);
  if (currency) {
    column.numberStyle = 'currency';
    column.currency = currency[1]!.toUpperCase();
    return;
  }
  if (text === 'percent') {
    column.numberStyle = 'percent';
    return;
  }
  const pattern = /^0(?:\.(0+))?(%)?$/.exec(text);
  if (pattern) {
    column.precision = pattern[1]?.length ?? 0;
    if (pattern[2]) column.numberStyle = 'percent';
  }
}

const number = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** The attributes a `<crewlet-column>` reads, so the element can observe exactly them. */
export const COLUMN_ATTRIBUTES = [
  'field',
  'type',
  'label',
  'format',
  'options',
  'width',
  'readonly',
  'required',
  'frozen',
  'min',
  'max',
  'max-length',
  'max-items',
  'time',
] as const;

/** One `<crewlet-column>` as a sheet column, or null for one with no field. An unknown type is drawn as read-only text. */
export function columnFromAttributes(read: (name: (typeof COLUMN_ATTRIBUTES)[number]) => string | null): SheetColumn | null {
  const field = read('field')?.trim();
  if (!field) return null;
  const type = read('type')?.trim() ?? 'text';
  const known = isSheetColumnType(type);
  const column: SheetColumn = { field, label: read('label')?.trim() || field, type: known ? type : 'text' };
  if (!known || read('readonly') !== null) column.readOnly = true;
  if (read('required') !== null) column.required = true;
  if (read('frozen') !== null) column.frozen = true;
  if (read('time') !== null) column.time = true;
  const width = number(read('width'));
  if (width !== undefined) column.width = width;
  const min = number(read('min'));
  if (min !== undefined) column.min = min;
  const max = number(read('max'));
  if (max !== undefined) column.max = max;
  const maxLength = number(read('max-length'));
  if (maxLength !== undefined) column.maxLength = maxLength;
  const maxItems = number(read('max-items'));
  if (maxItems !== undefined) column.maxItems = maxItems;
  const list = read('options');
  if (list) column.options = parseOptionList(list);
  const format = read('format');
  if (format && column.type === 'number') applyNumberFormat(column, format);
  return column;
}

/** The sheet's `sort` attribute: `score` ascending, `-score` descending. */
export function parseSort(text: string | null): SheetSort | null {
  const value = text?.trim();
  if (!value) return null;
  return value.startsWith('-') ? { field: value.slice(1), direction: 'descending' } : { field: value, direction: 'ascending' };
}

/** The leading `count` columns frozen, as the sheet's `frozen` attribute asks. */
export function freezeLeading(columns: readonly SheetColumn[], count: number | undefined): SheetColumn[] {
  if (count === undefined) return [...columns];
  return columns.map((column, index) => (index < count ? { ...column, frozen: true } : column));
}

const hueOf = (value: string | undefined): NodeHue | undefined => (value !== undefined && isNodeHue(value) ? value : undefined);

/** A viewer as a person cell draws them. */
export function personFromViewer(viewer: KitViewer): SheetPerson {
  const person: SheetPerson = { id: viewer.id, name: viewer.displayName, kind: viewer.kind };
  const hue = hueOf(viewer.avatar?.hue);
  if (hue) person.hue = hue;
  if (viewer.avatar?.character) person.character = viewer.avatar.character;
  return person;
}

/** Peers the reader can see, without the reader's own sessions and without anybody away. */
function present(peers: readonly KitPeer[], self: string | null): KitPeer[] {
  return peers.filter((peer) => peer.status !== 'away' && peer.viewer.id !== self);
}

/** Each present peer's hue: the runtime's when it names a node hue, else one assigned in join order. */
export function peerHues(peers: readonly KitPeer[], held: ReadonlyMap<string, NodeHue>): Map<string, NodeHue> {
  return assignPresenceHues(
    peers.map((peer) => ({ id: peer.session, kind: peer.viewer.kind, hue: hueOf(peer.color) ?? hueOf(peer.viewer.avatar?.hue) })),
    held,
  );
}

/** The peers on cells of this sheet's collection, as the grid draws them. */
export function cellPresence(peers: readonly KitPeer[], collection: string, self: string | null, hues: ReadonlyMap<string, NodeHue>): SheetCellPresence[] {
  const out: SheetCellPresence[] = [];
  for (const peer of present(peers, self)) {
    const editing = peer.state.editing;
    const focus = editing ?? peer.state.focus;
    if (!focus || focus.collection !== collection || !focus.doc || !focus.field) continue;
    out.push({
      rowId: focus.doc,
      field: focus.field,
      id: peer.session,
      name: peer.viewer.displayName,
      kind: peer.viewer.kind,
      hue: hues.get(peer.session) ?? 'purple',
      editing: Boolean(editing),
      idle: peer.status === 'idle',
    });
  }
  return out;
}

/** Everybody present on the page, for the sheet's presence stack. */
export function rosterFromPeers(peers: readonly KitPeer[], self: string | null, hues: ReadonlyMap<string, NodeHue>): PresenceMember[] {
  return present(peers, self).map((peer) => {
    const member: PresenceMember = {
      id: peer.session,
      seat: peer.viewer.id,
      name: peer.viewer.displayName,
      kind: peer.viewer.kind,
      activity: peer.state.editing ? 'editing' : peer.status === 'idle' ? 'idle' : 'viewing',
    };
    const hue = hues.get(peer.session);
    if (hue) member.hue = hue;
    if (peer.viewer.avatar?.character) member.character = peer.viewer.avatar.character;
    return member;
  });
}
