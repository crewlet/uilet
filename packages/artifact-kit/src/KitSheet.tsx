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
import { cellPresence, columnsFromSchema, freezeLeading, peerHues, personFromViewer, rosterFromPeers } from './bind.js';
import type { Json, KitPeer, KitRuntime, KitViewer, KitWriteOutcome } from './runtime.js';

export interface KitSheetLabels {
  /** The page declared no `data` capability, so there is nothing to draw. */
  noData: string;
  /** The collection has no schema and the page declared no columns. */
  noColumns: (collection: string) => string;
  /** An undo or a redo the engine refused because somebody changed the field since. */
  undoSkipped: (detail: string | undefined) => string;
  /** A new row the engine refused. */
  addRowFailed: (reason: string) => string;
}

export const KIT_SHEET_LABELS: KitSheetLabels = {
  noData: 'This page did not declare the data capability, so the sheet cannot load.',
  noColumns: (collection) => `The ${collection} collection has no columns yet.`,
  undoSkipped: (detail) => (detail ? `${detail} Undo skipped.` : 'Somebody changed this after you. Undo skipped.'),
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

const writable = (outcome: KitWriteOutcome) => outcome.outcome === 'applied' || outcome.outcome === 'pending';

/** What one settled write says on its cells, or null for a write the engine took. */
function outcomeMessage(outcome: KitWriteOutcome): string | null {
  if (writable(outcome)) return null;
  if (outcome.outcome === 'refused') return refusalText(outcome.code, outcome.detail, SHEET_LABELS);
  return SHEET_LABELS.couldNotSave;
}

export function KitSheet({ runtime, collection, columns: declared, sort: initialSort, frozen, readOnly = false, label, height }: KitSheetProps) {
  const hasData = runtime.capabilities.has('data');
  const hasPresence = runtime.capabilities.has('presence');
  const hasIdentity = runtime.capabilities.has('identity');
  const store = useMemo(() => runtime.data.collection(collection), [runtime, collection]);

  const [schemaColumns, setSchemaColumns] = useState<SheetColumn[] | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [docs, setDocs] = useState<SheetRow[]>([]);
  const [sort, setSort] = useState<SheetSort | null>(initialSort);
  const [me, setMe] = useState<KitViewer | null>(null);
  const [people, setPeople] = useState<SheetPerson[]>([]);
  const [peers, setPeers] = useState<KitPeer[]>([]);
  const [offline, setOffline] = useState(false);
  const [failedCreate, setFailedCreate] = useState(0);
  const [notice, setNotice] = useState({ text: '', n: 0 });
  const say = useCallback((text: string) => setNotice((current) => ({ text, n: current.n + 1 })), []);
  const [, redraw] = useState(0);
  const held = useRef<Map<string, NodeHue>>(new Map());
  const edits = useMemo(() => new SheetPendingEdits(), []);

  useEffect(() => setSort(initialSort), [initialSort]);
  useEffect(() => edits.subscribe(() => redraw((n) => n + 1)), [edits]);

  // The schema, when the page declared no columns of its own.
  useEffect(() => {
    if (!hasData) return undefined;
    let live = true;
    store
      .schema()
      .then((schema) => {
        if (!live) return;
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
  }, [store, declared, hasData, collection]);

  // The rows, live: the initial result, then every change.
  useEffect(() => {
    if (!hasData) return undefined;
    return store.subscribe(null, (view) => {
      setDocs(view.docs.map((doc) => ({ id: doc.id, values: doc.data })));
    });
  }, [store, hasData]);

  // Who the reader is, and the people a person cell may name.
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
        if (live) setPeople(list.map(personFromViewer));
      })
      .catch((error: unknown) => warn('the people a person cell offers could not be listed', error));
    return () => {
      live = false;
    };
  }, [runtime, hasIdentity]);

  const columns = useMemo(() => freezeLeading(declared ?? schemaColumns ?? [], frozen), [declared, schemaColumns, frozen]);

  // A person a cell names who is not among the people offered (a seat that
  // left the picker's first fifty) is looked up, so the cell still says who.
  const missing = useMemo(() => {
    const known = new Set(people.map((person) => person.id));
    const ids = new Set<string>();
    for (const column of columns) {
      if (column.type !== 'person') continue;
      for (const row of docs) {
        const value = row.values[column.field];
        if (typeof value === 'string' && !known.has(value)) ids.add(value);
      }
    }
    return [...ids].sort();
  }, [columns, docs, people]);
  const missingKey = missing.join('\u0000');
  useEffect(() => {
    if (!hasIdentity || missing.length === 0) return undefined;
    let live = true;
    runtime.identity
      .lookup(missing)
      .then((found) => {
        if (!live) return;
        const added = Object.values(found).filter((viewer): viewer is KitViewer => viewer !== null).map(personFromViewer);
        if (added.length > 0) setPeople((before) => [...before, ...added.filter((person) => !before.some((other) => other.id === person.id))]);
      })
      .catch((error: unknown) => warn('the people named in person cells could not be looked up', error));
    return () => {
      live = false;
    };
    // The lookup runs when the set of unknown ids changes, which the key says.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, hasIdentity, missingKey]);

  // Presence: who else is here and where.
  useEffect(() => {
    if (!hasPresence) return undefined;
    return runtime.presence.subscribe((next) => setPeers(next));
  }, [runtime, hasPresence]);

  useEffect(() => {
    if (!runtime.connection) return undefined;
    setOffline(runtime.connection.state === 'offline');
    return runtime.connection.subscribe((state) => setOffline(state === 'offline'));
  }, [runtime]);

  const hues = useMemo(() => {
    const next = peerHues(peers, held.current);
    held.current = next;
    return next;
  }, [peers]);
  const selfId = me?.id ?? null;
  const onCells = useMemo(() => cellPresence(peers, collection, selfId, hues), [peers, collection, selfId, hues]);
  const roster = useMemo(() => rosterFromPeers(peers, selfId, hues), [peers, selfId, hues]);

  const write = useCallback(
    (batch: readonly SheetEdit[]) => {
      const settles = batch.map((edit) => edits.begin(edit.rowId, edit.field));
      const settleAll = (message: string | null) => {
        for (const settle of settles) settle(message === null ? { ok: true } : { ok: false, message });
      };
      const patch = (edit: SheetEdit): Record<string, Json> => ({ [edit.field]: edit.value as Json });
      let sent: Promise<KitWriteOutcome>;
      if (batch.length === 1) {
        const [edit] = batch as [SheetEdit];
        sent = store.update(edit.rowId, patch(edit));
      } else {
        // One record, all or nothing: a paste lands whole or not at all.
        const many = runtime.data.batch();
        for (const edit of batch) many.update(collection, edit.rowId, patch(edit));
        sent = many.commit();
      }
      sent.then(
        (outcome) => settleAll(outcomeMessage(outcome)),
        (error: unknown) => settleAll(error instanceof Error && error.message ? error.message : SHEET_LABELS.couldNotSave),
      );
    },
    [collection, edits, runtime, store],
  );

  const addRow = useCallback(() => {
    store.create({}).then(
      (outcome) => {
        const message = outcomeMessage(outcome);
        setFailedCreate((count) => (message === null ? 0 : count + 1));
        if (message !== null) say(KIT_SHEET_LABELS.addRowFailed(message));
      },
      (error: unknown) => {
        setFailedCreate((count) => count + 1);
        say(KIT_SHEET_LABELS.addRowFailed(error instanceof Error && error.message ? error.message : SHEET_LABELS.couldNotSave));
      },
    );
  }, [store, say]);

  /** Undo and redo are the runtime's, per tab; a step somebody overtook is skipped and said. */
  const step = useCallback(
    (run: () => Promise<unknown>) => {
      run().then(
        (outcome) => {
          const refused = outcome as KitWriteOutcome | null;
          if (refused && refused.outcome === 'refused') say(KIT_SHEET_LABELS.undoSkipped(refused.detail));
        },
        (error: unknown) => say(error instanceof Error && error.message ? error.message : SHEET_LABELS.couldNotSave),
      );
    },
    [say],
  );

  const focus = useCallback(
    (cell: SheetCellRef | null) => {
      if (hasPresence) runtime.presence.set({ focus: cell ? { collection, doc: cell.rowId, field: cell.field } : null });
    },
    [runtime, hasPresence, collection],
  );
  const editing = useCallback(
    (cell: SheetCellRef | null) => {
      if (hasPresence) runtime.presence.set({ editing: cell ? { collection, doc: cell.rowId, field: cell.field } : null });
    },
    [runtime, hasPresence, collection],
  );

  if (!hasData) return <Callout variant="warning">{KIT_SHEET_LABELS.noData}</Callout>;
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
        onUndo={() => step(() => runtime.data.undo())}
        onRedo={() => step(() => runtime.data.redo())}
        presence={onCells}
        sort={sort}
        onSortChange={setSort}
        sync={sync}
        onRetry={failedCreate > 0 ? addRow : undefined}
        height={height}
        fit="content"
      />
      {notice.text ? (
        <Callout key={notice.n} variant="warning" live="polite">
          {notice.text}
        </Callout>
      ) : null}
    </div>
  );
}
