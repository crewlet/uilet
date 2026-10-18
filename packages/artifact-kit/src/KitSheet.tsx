/**
 * A sheet bound to the page's runtime: the same `SheetGrid` the dashboard
 * draws for a native sheet, fed by `crewlet.data`, `crewlet.presence` and
 * `crewlet.identity`, so a page's `<crewlet-sheet>` looks and behaves exactly
 * like the native sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Callout } from '@crewlethq/ui/Callout';
import { PresenceStack } from '@crewlethq/ui/PresenceStack';
import { SheetGrid, type SheetCellRef } from '@crewlethq/ui/SheetGrid';
import {
  SHEET_LABELS,
  SheetPendingEdits,
  refusalText,
  type SheetColumn,
  type SheetEdit,
  type SheetPerson,
  type SheetRow,
  type SheetSort,
} from '@crewlethq/ui/SheetModel';
import type { NodeHue } from '@crewlethq/ui/utils';
import { cellPresence, columnsFromSchema, freezeLeading, memberHues, personFromPerson, rosterFromMembers } from './bind.js';
import { newDocId, type Json, type KitError, type KitFocus, type KitMember, type KitRuntime, type KitViewer, type KitWriteOutcome } from './runtime.js';

export interface KitSheetLabels {
  /** The page declared no `db` capability, so there is nothing to draw. */
  noData: string;
  /** The collection has no schema and the page declared no columns. */
  noColumns: (collection: string) => string;
  /** The collection's rows could not be read, by the refusal's code. */
  loadFailed: (collection: string, code: string) => string;
  /** An undo or a redo the engine refused because somebody changed the field since. */
  stepOvertaken: (step: 'undo' | 'redo') => string;
  /** A new row the engine refused. */
  addRowFailed: (reason: string) => string;
}

export const KIT_SHEET_LABELS: KitSheetLabels = {
  noData: 'This page did not declare the db capability, so the sheet cannot load.',
  noColumns: (collection) => `The ${collection} collection has no columns yet.`,
  loadFailed: (collection, code) =>
    code === 'forbidden'
      ? `You do not have access to the ${collection} collection.`
      : code === 'not_found'
        ? `There is no ${collection} collection in this artifact.`
        : `The ${collection} collection could not be loaded. Reload the page to try again.`,
  stepOvertaken: (step) => `Somebody changed this after you, so the ${step} was skipped.`,
  addRowFailed: (reason) => `Could not add a row. ${reason}`,
};

/** A failure the sheet can still draw around, said to the page's developer rather than dropped. */
function warn(what: string, error: unknown): void {
  console.warn(`[crewlet artifact-kit] ${what}`, error);
}

export interface KitSheetProps {
  runtime: KitRuntime;
  collection: string;
  /** Columns the page declared; the collection's schema when there are none. */
  columns: readonly SheetColumn[] | null;
  sort: SheetSort | null;
  /** How many leading columns stay in view. */
  frozen?: number | undefined;
  readOnly?: boolean | undefined;
  /** The grid's accessible name; the schema's title, then the collection's name, when absent. */
  label?: string | undefined;
  height?: number | undefined;
}

/** What one settled write says on its cells, or null for a write the engine took. */
function outcomeMessage(outcome: KitWriteOutcome): string | null {
  if (outcome.verdict === 'applied' || outcome.verdict === 'pending') return null;
  return refusalText(outcome.verdict, outcome.reason, SHEET_LABELS);
}

/** What a rejected call says: nothing about it was decided, or the version did not declare it. */
function rejectionMessage(error: unknown): string {
  const code = typeof (error as Partial<KitError> | null)?.code === 'string' ? (error as KitError).code : '';
  const message = error instanceof Error ? error.message : undefined;
  return refusalText(code, message, SHEET_LABELS);
}

export function KitSheet({ runtime, collection, columns: declared, sort: initialSort, frozen, readOnly = false, label, height }: KitSheetProps) {
  const hasData = runtime.capabilities.has('db');
  const hasPresence = runtime.capabilities.has('presence');
  const hasIdentity = runtime.capabilities.has('identity');
  const store = useMemo(() => runtime.data.collection(collection), [runtime, collection]);

  const [schemaColumns, setSchemaColumns] = useState<SheetColumn[] | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [docs, setDocs] = useState<SheetRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sort, setSort] = useState<SheetSort | null>(initialSort);
  const [me, setMe] = useState<KitViewer | null>(null);
  const [people, setPeople] = useState<SheetPerson[]>([]);
  const [members, setMembers] = useState<KitMember[]>([]);
  const [offline, setOffline] = useState(false);
  const [failedCreate, setFailedCreate] = useState(0);
  const [notice, setNotice] = useState({ text: '', n: 0 });
  const say = useCallback((text: string) => setNotice((current) => ({ text, n: current.n + 1 })), []);
  const [, redraw] = useState(0);
  const held = useRef<Map<string, NodeHue>>(new Map());
  const edits = useMemo(() => new SheetPendingEdits(), []);

  useEffect(() => setSort(initialSort), [initialSort]);
  useEffect(() => edits.subscribe(() => redraw((n) => n + 1)), [edits]);

  // The collection's title, and its columns when the page declared none.
  useEffect(() => {
    if (!hasData) return undefined;
    let live = true;
    runtime.data
      .schema()
      .then((collections) => {
        if (!live) return;
        const schema = collections.find((entry) => entry.name === collection) ?? null;
        setTitle(schema?.title);
        if (!declared) setSchemaColumns(columnsFromSchema(schema));
      })
      .catch((error: unknown) => {
        warn(`the schema of ${collection} could not be read`, error);
        if (live && !declared) setSchemaColumns([]);
      });
    return () => {
      live = false;
    };
  }, [runtime, declared, hasData, collection]);

  // The rows, live: the documents, then every change. A refused subscription
  // is said in place of the grid, never drawn as an empty collection.
  useEffect(() => {
    if (!hasData) return undefined;
    setLoadError(null);
    return store.subscribe(
      (next) => setDocs(next.map((doc) => ({ id: doc.id, values: doc.data }))),
      (error) => setLoadError(KIT_SHEET_LABELS.loadFailed(collection, error.code)),
    );
  }, [store, hasData, collection]);

  // Who the reader is, and the people a person cell may name. Every seat of
  // the company is offered, so a cell naming a seat the list lacks names one
  // that has left, which the grid draws as the native sheet does.
  useEffect(() => {
    if (!hasIdentity) return undefined;
    let live = true;
    runtime.identity
      .me()
      .then((viewer) => {
        if (live) setMe(viewer);
      })
      .catch((error: unknown) => warn('the reader could not be identified', error));
    runtime.identity
      .people()
      .then((list) => {
        if (live) setPeople(list.map(personFromPerson));
      })
      .catch((error: unknown) => warn('the people a person cell offers could not be listed', error));
    return () => {
      live = false;
    };
  }, [runtime, hasIdentity]);

  const columns = useMemo(() => freezeLeading(declared ?? schemaColumns ?? [], frozen), [declared, schemaColumns, frozen]);

  // Presence: who else is here and where, as the room stands now and as it moves.
  useEffect(() => {
    if (!hasPresence) return undefined;
    setMembers(runtime.presence.roster().members);
    return runtime.presence.subscribe((roster) => setMembers(roster.members));
  }, [runtime, hasPresence]);

  useEffect(() => {
    if (!runtime.connection) return undefined;
    setOffline(runtime.connection.state === 'offline');
    return runtime.connection.subscribe((state) => setOffline(state === 'offline'));
  }, [runtime]);

  const hues = useMemo(() => {
    const next = memberHues(members, held.current);
    held.current = next;
    return next;
  }, [members]);
  const selfSeat = me?.seat ?? null;
  const onCells = useMemo(() => cellPresence(members, collection, selfSeat, hues), [members, collection, selfSeat, hues]);
  const roster = useMemo(() => rosterFromMembers(members, selfSeat, hues), [members, selfSeat, hues]);

  const write = useCallback(
    (batch: readonly SheetEdit[]) => {
      const settles = batch.map((edit) => edits.begin(edit.rowId, edit.field));
      const settleAll = (message: string | null) => {
        for (const settle of settles) settle(message === null ? { ok: true } : { ok: false, message });
      };
      const fields = (edit: SheetEdit): Record<string, Json> => ({ [edit.field]: edit.value as Json });
      let sent: Promise<KitWriteOutcome>;
      if (batch.length === 1) {
        const [edit] = batch as [SheetEdit];
        sent = store.merge(edit.rowId, fields(edit));
      } else {
        // One write, all or nothing: a paste lands whole or not at all.
        const many = runtime.data.batch();
        for (const edit of batch) many.merge(collection, edit.rowId, fields(edit));
        sent = many.commit();
      }
      sent.then(
        (outcome) => settleAll(outcomeMessage(outcome)),
        (error: unknown) => settleAll(rejectionMessage(error)),
      );
    },
    [collection, edits, runtime, store],
  );

  const addRow = useCallback(() => {
    store.set(newDocId(), {}).then(
      (outcome) => {
        const message = outcomeMessage(outcome);
        setFailedCreate((count) => (message === null ? 0 : count + 1));
        if (message !== null) say(KIT_SHEET_LABELS.addRowFailed(message));
      },
      (error: unknown) => {
        setFailedCreate((count) => count + 1);
        say(KIT_SHEET_LABELS.addRowFailed(rejectionMessage(error)));
      },
    );
  }, [store, say]);

  /** Undo and redo are the runtime's: the page's own writes, on this tab. A step somebody overtook is skipped and said. */
  const step = useCallback(
    (which: 'undo' | 'redo') => {
      runtime.data[which]().then(
        (outcome) => {
          if (outcome === null || outcome.verdict === 'applied' || outcome.verdict === 'pending') return;
          say(outcome.verdict === 'conflict' ? KIT_SHEET_LABELS.stepOvertaken(which) : refusalText(outcome.verdict, outcome.reason, SHEET_LABELS));
        },
        (error: unknown) => say(rejectionMessage(error)),
      );
    },
    [runtime, say],
  );

  // WHERE THE READER IS, said as one focus and one activity, which is how the
  // room holds a member: the cell they are editing, else the cell they are on.
  const place = useRef<{ active: SheetCellRef | null; editing: SheetCellRef | null }>({ active: null, editing: null });
  const publish = useCallback(() => {
    if (!hasPresence) return;
    const { active, editing } = place.current;
    const cell = editing ?? active;
    const focus: KitFocus = cell ? { collection, doc: cell.rowId, field: cell.field } : {};
    runtime.presence.set({ activity: editing ? 'editing' : 'viewing', focus });
  }, [runtime, hasPresence, collection]);
  const focus = useCallback(
    (cell: SheetCellRef | null) => {
      place.current.active = cell;
      publish();
    },
    [publish],
  );
  const editing = useCallback(
    (cell: SheetCellRef | null) => {
      place.current.editing = cell;
      publish();
    },
    [publish],
  );

  if (!hasData) return <Callout variant="warning">{KIT_SHEET_LABELS.noData}</Callout>;
  if (loadError !== null) return <Callout variant="warning">{loadError}</Callout>;
  if (columns.length === 0 && (declared !== null || schemaColumns !== null)) {
    return <Callout variant="neutral">{KIT_SHEET_LABELS.noColumns(collection)}</Callout>;
  }

  const viewOnly = readOnly || me?.role === 'viewer';
  const sync = { ...edits.sync(offline), failed: failedCreate };

  return (
    <div className="crewlet-kit-sheet">
      {roster.length > 0 ? (
        <div className="crewlet-kit-sheet__presence">
          <PresenceStack members={roster} />
        </div>
      ) : null}
      <SheetGrid
        label={label ?? title ?? collection}
        columns={columns}
        rows={edits.decorate(docs)}
        people={people}
        mode={viewOnly ? 'read' : 'edit'}
        onEdit={viewOnly ? undefined : write}
        onAddRow={viewOnly ? undefined : addRow}
        onActiveCellChange={focus}
        onEditingChange={editing}
        onUndo={() => step('undo')}
        onRedo={() => step('redo')}
        presence={onCells}
        sort={sort}
        onSortChange={setSort}
        sync={sync}
        onRetry={failedCreate > 0 ? addRow : undefined}
        height={height}
      />
      {notice.text ? (
        <Callout key={notice.n} variant="warning" live="polite">
          {notice.text}
        </Callout>
      ) : null}
    </div>
  );
}
