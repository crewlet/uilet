/**
 * The honest instant edit (D23), as bookkeeping a host keeps beside its data.
 *
 * A sheet draws the reader's value straight away, MARKED AS PENDING, and makes
 * it solid when the engine confirms it. A refusal reverts the cell (the host's
 * data never took the value) and says why on the cell. What is drawn solid is
 * what the engine holds; the pending mark is the one place the sheet draws
 * something the engine has not confirmed, and it says so.
 *
 * The host's data layer keeps the values; this keeps which cells are waiting
 * and which were refused, so every host (the dashboard's native sheet, the
 * artifact kit) draws the same states from the same rules.
 */

import type { SheetLabels } from './labels.js';
import type { SheetChange, SheetRow, SheetSyncState, SheetValue } from './types.js';

/** The refusal codes the runtime answers a write with (`crewlet.data`). Unknown codes are generic failures. */
export type SheetRefusalCode =
  | 'invalid_value'
  | 'superseded'
  | 'conflict'
  | 'not_found'
  | 'forbidden'
  | 'collection_full'
  | 'too_large'
  | 'rate_limited'
  | 'rebase_window_exceeded'
  | 'capability_not_declared'
  | 'unavailable';

/**
 * What a refusal says on the cell. A permission refusal says the reader cannot
 * edit, in the sheet's own words, whatever the detail; every other refusal
 * says the engine's detail when there is one.
 */
export function refusalText(code: string, detail: string | undefined, labels: SheetLabels): string {
  if (code === 'forbidden' || code === 'capability_not_declared') return labels.forbidden;
  const said = detail?.trim();
  return said ? said : labels.couldNotSave;
}

/** How a write ended, as the host learned it. */
export type SheetSettle = { ok: true } | { ok: false; message: string };

const key = (rowId: string, field: string) => `${rowId}\u0000${field}`;

/**
 * Which cells are waiting on the engine and which were refused.
 *
 * Several edits of one cell can be in flight at once (a quick double toggle),
 * so a cell is pending until every one of them has settled. A refusal stays on
 * its cell until the reader edits that cell again or it is dismissed.
 */
export class SheetPendingEdits {
  private readonly waiting = new Map<string, number>();
  private readonly refusals = new Map<string, string>();
  private readonly listeners = new Set<() => void>();
  private failed = 0;

  /** Marks a cell pending, and hands back the one function that settles this edit. Calling it twice does nothing. */
  begin(rowId: string, field: string): (outcome: SheetSettle) => void {
    const at = key(rowId, field);
    this.refusals.delete(at);
    this.waiting.set(at, (this.waiting.get(at) ?? 0) + 1);
    this.emit();
    let settled = false;
    return (outcome) => {
      if (settled) return;
      settled = true;
      const left = (this.waiting.get(at) ?? 1) - 1;
      if (left <= 0) this.waiting.delete(at);
      else this.waiting.set(at, left);
      if (!outcome.ok) {
        this.refusals.set(at, outcome.message);
        this.failed += 1;
      }
      this.emit();
    };
  }

  isPending(rowId: string, field: string): boolean {
    return this.waiting.has(key(rowId, field));
  }

  refusal(rowId: string, field: string): string | undefined {
    return this.refusals.get(key(rowId, field));
  }

  /** Clears a cell's refusal, once its reason has been read or acted on. */
  dismiss(rowId: string, field: string): void {
    if (this.refusals.delete(key(rowId, field))) this.emit();
  }

  /** Edits sent and not yet settled, for the sync strip. */
  get saving(): number {
    let count = 0;
    for (const value of this.waiting.values()) count += value;
    return count;
  }

  /** Clears every refusal at once: the strip's Dismiss. */
  dismissAll(): void {
    if (this.refusals.size === 0) return;
    this.refusals.clear();
    this.emit();
  }

  /**
   * The sync strip's state. A refusal is not a failure to retry (the engine
   * decided it), but it is counted, so the strip holds "not saved" until the
   * reader dismisses it rather than going back to "Saved".
   */
  sync(offline = false): SheetSyncState {
    return { saving: this.saving, offline, refused: this.refusals.size };
  }

  /** Every refusal since the last `resetFailures`, for a host that reports them. */
  get failures(): number {
    return this.failed;
  }

  resetFailures(): void {
    this.failed = 0;
  }

  /** The host's rows with each one's pending and refused cells attached. */
  decorate(rows: readonly SheetRow[]): SheetRow[] {
    if (this.waiting.size === 0 && this.refusals.size === 0) return [...rows];
    return rows.map((row) => {
      const pending: string[] = [];
      const refused: Record<string, string> = {};
      for (const at of this.waiting.keys()) {
        const [rowId, field] = at.split('\u0000') as [string, string];
        if (rowId === row.id) pending.push(field);
      }
      for (const [at, message] of this.refusals) {
        const [rowId, field] = at.split('\u0000') as [string, string];
        if (rowId === row.id) refused[field] = message;
      }
      if (pending.length === 0 && Object.keys(refused).length === 0) return row;
      return {
        ...row,
        pending: [...(row.pending ?? []), ...pending],
        refused: { ...row.refused, ...refused },
      };
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** A change mark's time, in the reader's locale: "10:42". */
export function changeTime(at: SheetChange['at'], locale?: string): string {
  const when = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(when.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(when);
}

/** A change mark's words: "Changed by Maya Ortiz, 10:42. Was 6.8." `previous` is the formatted old value. */
export function changeText(change: SheetChange, labels: SheetLabels, previous: string | null, locale?: string): string {
  return labels.changed(change.by, changeTime(change.at, locale), previous);
}

/** Whether a value counts as a "was" worth saying: a change mark says nothing of an empty previous value. */
export const hasPrevious = (change: SheetChange): change is SheetChange & { previous: SheetValue } => change.previous !== undefined;
