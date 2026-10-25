/**
 * Which grid on screen the keyboard drives.
 *
 * A grid whose rows are links takes no focus of its own, so an application
 * binds its row keys (step down, step up, open) on the window and hands them
 * to a grid through `handleRef`. With two or three grids on one screen (and a
 * grid inside a peek beside a grid on the page), exactly one of them may take
 * a key: the one the reader last pointed at, and with no gesture yet, the
 * first one mounted that has rows. A grid showing its empty state drives
 * nothing.
 *
 * MODULE STATE RATHER THAN A CONTEXT, because the grids that must agree are
 * often in different subtrees (the page's and the peek's), and a provider
 * around both would be the application's frame, which knows nothing about
 * grids. Every grid re-renders when whose keystroke it is changes, through
 * one subscription.
 *
 * The keys themselves stay the application's: it binds them in its own
 * keymap, gated on `driving`, so they are checked against every other key it
 * binds rather than registered behind its back.
 */

import { useCallback, useEffect, useId, useSyncExternalStore } from 'react';
import type { DataGridBand } from './DataGrid.js';

const drivable: string[] = [];
let touched: string | null = null;
let revision = 0;
const watchers = new Set<() => void>();

/** Wake every grid: whose keystroke the next one is has changed. */
function announce(): void {
  revision += 1;
  for (const watcher of watchers) watcher();
}

function watch(watcher: () => void): () => void {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

function current(): number {
  return revision;
}

function isDriving(id: string): boolean {
  if (touched !== null) return touched === id;
  return drivable[0] === id;
}

/** How many rows a grid draws, its bands' rows included, however deeply grouped. */
export function countDataGridRows<T>(rows: readonly T[] | undefined, bands: readonly DataGridBand<T>[] | undefined): number {
  const inBand = (band: DataGridBand<T>): number =>
    band.bands ? band.bands.reduce((n, sub) => n + inBand(sub), 0) : band.rows.length;
  return bands ? bands.reduce((n, band) => n + inBand(band), 0) : (rows?.length ?? 0);
}

export interface DataGridDriving {
  /** Whether this grid takes the row keys now. */
  driving: boolean;
  /**
   * Make this grid the one the keys drive: pass it as the grid's
   * `onPointerDown`, so a pointer gesture on a grid is the reader saying
   * which one they are in.
   */
  claim: () => void;
}

/**
 * Take part in deciding which grid the keyboard drives.
 *
 * `drivable` is whether this grid has rows to step through: pass
 * `countDataGridRows(rows, bands) > 0`. A grid that cannot drive registers
 * nothing, and one the reader touched and then left takes nothing with it.
 */
export function useDataGridDriving(drivableNow: boolean): DataGridDriving {
  const id = useId();
  // A gesture that changes nothing on screen still has to re-render every
  // grid, for them to agree about whose keystroke the next one is.
  useSyncExternalStore(watch, current, current);

  useEffect(() => {
    if (!drivableNow) return undefined;
    drivable.push(id);
    announce();
    return () => {
      const at = drivable.indexOf(id);
      if (at >= 0) drivable.splice(at, 1);
      if (touched === id) touched = null;
      announce();
    };
  }, [id, drivableNow]);

  const claim = useCallback(() => {
    if (touched === id) return;
    touched = id;
    announce();
  }, [id]);

  return { driving: drivableNow && isDriving(id), claim };
}

/**
 * Whether ANY grid on screen holds the row keys: for a screen that binds the
 * same keys to something of its own (a record page stepping through the list
 * it was opened from), which must stand aside while a grid takes them.
 */
export function useAnyDataGridDriving(): boolean {
  useSyncExternalStore(watch, current, current);
  return drivable.length > 0;
}
