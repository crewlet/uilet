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
 * The most previews live at once by default. A gallery at 1440 shows two or
 * three rows of three cards with a row of margin either side, so twelve keeps
 * everything a reader can scroll to in a moment live, and is the number of
 * pages a design's canvas already runs at once (`CANVAS_BOARD_MAX_LIVE`).
 */
export const LIVE_PREVIEW_MAX = 12;

export interface LivePreviewBudget {
  /** The most slots granted at once. */
  readonly max: number;
  /**
   * Asks for a slot. `grant` is called once, now or when a slot frees. The
   * answer gives the slot back, or withdraws the ask if it was never granted;
   * calling it again does nothing.
   */
  request(grant: () => void): () => void;
  /** Slots held now, for a test or a measurement. */
  live(): number;
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

export function createLivePreviewBudget(max: number = LIVE_PREVIEW_MAX, schedule: LivePreviewSchedule = immediately): LivePreviewBudget {
  const held = new Set<object>();
  const queue: { ticket: object; grant: () => void }[] = [];
  let pending: (() => void) | null = null;
  const next = () => {
    if (pending || held.size >= max || queue.length === 0) return;
    let ran = false;
    const cancel = schedule(() => {
      ran = true;
      pending = null;
      const ask = queue.shift();
      if (ask && held.size < max) {
        held.add(ask.ticket);
        ask.grant();
      } else if (ask) {
        queue.unshift(ask);
      }
      next();
    });
    if (!ran) pending = cancel;
  };
  return {
    max,
    request(grant) {
      const ticket = {};
      queue.push({ ticket, grant });
      next();
      let done = false;
      return () => {
        if (done) return;
        done = true;
        if (held.delete(ticket)) {
          next();
          return;
        }
        const at = queue.findIndex((a) => a.ticket === ticket);
        if (at >= 0) queue.splice(at, 1);
        if (queue.length === 0 && pending) {
          pending();
          pending = null;
        }
      };
    },
    live: () => held.size,
    waiting: () => queue.length,
  };
}
