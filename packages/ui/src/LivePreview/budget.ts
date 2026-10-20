/**
 * How many live previews draw at once: the budget a gallery's cards share.
 *
 * WHY A BUDGET. A live preview is real content drawn small: a page of prose,
 * a grid of cells, a slide, or a sandboxed frame running a page of its own. A
 * gallery of two hundred artifacts that drew every one would run two hundred
 * of them, most never seen. A preview asks for a slot when it comes near the
 * viewport and gives it back when it leaves; past the cap it waits, drawing
 * its stand-in, and is granted a slot the moment one is free, the oldest ask
 * first.
 *
 * Plain bookkeeping with no layout, so it is tested without a browser.
 */

/**
 * The most previews live at once by default, parked ones included. The
 * gallery lays its cards four across at 1440 and shows up to four rows of
 * them at once, sixteen cards, and the rows a preview starts before it is seen
 * bring about twenty-four near at a time (measured scrolling a gallery at
 * 1440 by 900). Thirty-two draws everything near and keeps about two rows the
 * reader just left, so scrolling back a row or two finds them drawn. Twelve,
 * sized for three across, left cards on screen waiting for slots and kept
 * nothing a reader had left.
 */
export const LIVE_PREVIEW_MAX = 32;

/**
 * The most of those that run a page of their own in a frame. A frame is a
 * page in another document, often in a process of its own, and by far the
 * dearest thing a preview draws; twelve is the number of pages a design's
 * canvas runs at once (`CANVAS_BOARD_MAX_LIVE`).
 */
export const LIVE_PREVIEW_MAX_FRAMES = 12;

/** One preview's hold on the budget, from its ask to its release. */
export interface LivePreviewSlot {
  /** Gives the slot back, or withdraws the ask if it was never granted. Calling it again does nothing. */
  release(): void;
  /**
   * The holder left the viewport but keeps what it drew: the slot stays held,
   * and may be reclaimed when another asks and none is free. `kept` says what
   * it drew survives a reclaim as a still copy, so it is reclaimed before a
   * holder whose stand-in would show. Before the grant, the ask is withdrawn,
   * since nothing was drawn to keep.
   */
  park(kept?: boolean): void;
  /** Back near the viewport: answers whether the slot is still held, and if so it is no longer reclaimable. */
  resume(): boolean;
}

export interface LivePreviewBudget {
  /** The most slots granted at once. */
  readonly max: number;
  /** The most of them held by content in a frame. */
  readonly maxFrames: number;
  /**
   * Asks for a slot. `grant` is called once, now or when a slot frees.
   * `reclaim` is called if the slot is taken back while parked, so the holder
   * tears its content down; a slot released or never parked is never
   * reclaimed. `frame` says the content runs a page in a frame, which counts
   * against `maxFrames` as well.
   */
  request(grant: () => void, reclaim?: () => void, frame?: boolean): LivePreviewSlot;
  /** Slots held now, parked ones included, for a test or a measurement. */
  live(): number;
  /** Slots held by content in a frame. */
  frames(): number;
  /** Slots held by previews that left the viewport. */
  parked(): number;
  /** Asks waiting now. */
  waiting(): number;
}

/**
 * Runs a grant later, and answers how to call it off. The budget hands out
 * at most one slot per call, so a burst of asks (a fast scroll bringing a
 * whole row near at once) mounts one preview per tick rather than all of them
 * in one long task.
 */
export type LivePreviewSchedule = (run: () => void) => () => void;

/** Grants now: for a test, and for a host that paces nothing. */
export const immediately: LivePreviewSchedule = (run) => {
  run();
  return () => {};
};

/**
 * One grant per animation frame, after the frame's own work: the default in a
 * browser, so mounting a row of previews never costs one frame more than one
 * preview does.
 */
export const perFrame: LivePreviewSchedule = (run) => {
  if (typeof requestAnimationFrame === 'undefined') return immediately(run);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(run, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
  };
};

interface Ask {
  grant: () => void;
  reclaim: (() => void) | undefined;
  /** Parked with a still copy to show: reclaiming it changes nothing a reader sees. */
  kept: boolean;
  /** Runs a page in a frame. */
  frame: boolean;
}

export function createLivePreviewBudget(
  max: number = LIVE_PREVIEW_MAX,
  schedule: LivePreviewSchedule = immediately,
  maxFrames: number = Math.min(max, LIVE_PREVIEW_MAX_FRAMES),
): LivePreviewBudget {
  const held = new Set<Ask>();
  // PARKED IN THE ORDER THEY LEFT: a Set keeps insertion order, so the first
  // is the one the reader left longest ago.
  const parked = new Set<Ask>();
  const queue: Ask[] = [];
  let pending: (() => void) | null = null;
  let frames = 0;

  const fits = (ask: Ask) => held.size < max && (!ask.frame || frames < maxFrames);

  // WHAT AN ASK WOULD TAKE BACK to fit: for a frame over the frames' cap, a
  // parked frame; otherwise any parked holder, one with a still copy first.
  // One on screen is never taken back for another.
  const victimFor = (ask: Ask): Ask | undefined => {
    if (ask.frame && frames >= maxFrames) {
      for (const p of parked) if (p.frame) return p;
      return undefined;
    }
    let chosen: Ask | undefined;
    for (const p of parked) {
      if (p.kept) return p;
      chosen ??= p;
    }
    return chosen;
  };

  // THE OLDEST ASK THAT CAN BE GRANTED, now or by taking a parked slot back:
  // a frame waiting on the frames' cap does not hold up a page behind it.
  const pick = (): { ask: Ask; victim: Ask | undefined } | null => {
    for (const ask of queue) {
      if (fits(ask)) return { ask, victim: undefined };
      const victim = victimFor(ask);
      if (victim) return { ask, victim };
    }
    return null;
  };

  const drop = (ask: Ask) => {
    parked.delete(ask);
    if (held.delete(ask) && ask.frame) frames--;
  };

  const next = () => {
    if (pending || !pick()) return;
    let ran = false;
    const cancel = schedule(() => {
      ran = true;
      pending = null;
      const chosen = pick();
      if (chosen) {
        if (chosen.victim) {
          drop(chosen.victim);
          chosen.victim.reclaim?.();
        }
        queue.splice(queue.indexOf(chosen.ask), 1);
        held.add(chosen.ask);
        if (chosen.ask.frame) frames++;
        chosen.ask.grant();
      }
      next();
    });
    if (!ran) pending = cancel;
  };
  const withdraw = (ask: Ask) => {
    const at = queue.indexOf(ask);
    if (at >= 0) queue.splice(at, 1);
    if (queue.length === 0 && pending) {
      pending();
      pending = null;
    }
  };
  return {
    max,
    maxFrames,
    request(grant, reclaim, frame = false) {
      const ask: Ask = { grant, reclaim, kept: false, frame };
      queue.push(ask);
      next();
      let done = false;
      const release = () => {
        if (done) return;
        done = true;
        if (held.has(ask)) {
          drop(ask);
          next();
        } else withdraw(ask);
      };
      return {
        release,
        park(kept = false) {
          if (done) return;
          if (!held.has(ask)) {
            release();
            return;
          }
          ask.kept = kept;
          parked.add(ask);
          next();
        },
        resume() {
          if (done || !held.has(ask)) return false;
          parked.delete(ask);
          return true;
        },
      };
    },
    live: () => held.size,
    frames: () => frames,
    parked: () => parked.size,
    waiting: () => queue.length,
  };
}
