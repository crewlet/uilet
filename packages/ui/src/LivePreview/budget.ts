/**
 * How many live previews render at once: the budget a gallery's cards share.
 *
 * A PREVIEW RENDERS ONCE. Real content (a page of prose, a grid of cells, a
 * slide, a board of figures) is mounted near the viewport, reads what it
 * needs, draws, and is then kept as a still copy with nothing live behind it.
 * What costs is the RENDER: the reads, the mount and the layout, all at once
 * as a row of cards scrolls near. So the budget bounds how many render at the
 * same moment (`max`), and a slot is given back the moment its content has
 * drawn; past the cap an ask waits, drawing its stand-in, and is granted the
 * moment a render finishes, the oldest ask first.
 *
 * A FRAME IS THE EXCEPTION. A page in a frame lives in another document and
 * cannot be copied, so a framed preview that has drawn keeps its page, and a
 * page running in a frame is by far the dearest thing a preview holds. Frames
 * kept are capped apart (`maxFrames`): a kept frame that leaves the viewport
 * is parked, and taken back (`reclaim`) only when a frame coming near needs
 * its place, the one the reader left longest ago first. One on screen is
 * never taken back for another.
 *
 * Plain bookkeeping with no layout, so it is tested without a browser.
 */

/**
 * The most previews rendering at once. Six is the number of connections a
 * browser opens to one host over HTTP/1.1, which is how a preview's reads
 * (an outline, a board and its datasets, a frame's ticket) reach their
 * server: a seventh render would only queue its reads behind the first six,
 * while holding its mount and layout open beside them.
 */
export const LIVE_PREVIEW_MAX = 6;

/**
 * The most frames kept at once. A frame is a page in another document, often
 * in a process of its own; twelve is the number of pages a design's canvas
 * runs at once (`CANVAS_BOARD_MAX_LIVE`).
 */
export const LIVE_PREVIEW_MAX_FRAMES = 12;

/** One preview's hold on the budget, from its ask to its release. */
export interface LivePreviewSlot {
  /** Gives back everything it holds, or withdraws the ask if it was never granted. Calling it again does nothing. */
  release(): void;
  /**
   * The content has drawn: its render slot is given back. A frame keeps its
   * place among the frames until it is released or reclaimed; anything else
   * holds nothing more, as if released.
   */
  drawn(): void;
  /**
   * A kept frame left the viewport: it stays, and may be reclaimed when a
   * frame coming near needs its place. Before the grant the ask is
   * withdrawn, since nothing was drawn. A render that is not a frame runs on
   * to its end wherever it is, so for one this does nothing.
   */
  park(): void;
  /** Back near the viewport: answers whether the slot is still held, and if so it is no longer reclaimable. */
  resume(): boolean;
}

export interface LivePreviewBudget {
  /** The most renders at once. */
  readonly max: number;
  /** The most frames kept at once. */
  readonly maxFrames: number;
  /**
   * Asks for a slot. `grant` is called once, now or when a slot frees.
   * `reclaim` is called if a parked frame is taken back, so the holder tears
   * its page down; nothing else is ever reclaimed. `frame` says the content
   * runs a page in a frame, which counts against `maxFrames` for as long as
   * it is kept.
   */
  request(grant: () => void, reclaim?: () => void, frame?: boolean): LivePreviewSlot;
  /** Renders in progress, for a test or a measurement. */
  live(): number;
  /** Frames kept, rendering or drawn. */
  frames(): number;
  /** Kept frames that left the viewport. */
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
  /** Runs a page in a frame. */
  frame: boolean;
}

export function createLivePreviewBudget(
  max: number = LIVE_PREVIEW_MAX,
  schedule: LivePreviewSchedule = immediately,
  maxFrames: number = LIVE_PREVIEW_MAX_FRAMES,
): LivePreviewBudget {
  const rendering = new Set<Ask>();
  const frames = new Set<Ask>();
  // PARKED IN THE ORDER THEY LEFT: a Set keeps insertion order, so the first
  // is the frame the reader left longest ago.
  const parked = new Set<Ask>();
  const queue: Ask[] = [];
  let pending: (() => void) | null = null;

  // THE OLDEST ASK THAT CAN BE GRANTED, taking a parked frame back when a
  // frame needs its place. Every ask needs a render slot, so with none free
  // nothing is granted; a frame waiting on the frames' cap holds up no page
  // behind it.
  const pick = (): { ask: Ask; victim: Ask | undefined } | null => {
    if (rendering.size >= max) return null;
    for (const ask of queue) {
      if (!ask.frame || frames.size < maxFrames) return { ask, victim: undefined };
      const victim: Ask | undefined = parked.values().next().value;
      if (victim) return { ask, victim };
    }
    return null;
  };

  const drop = (ask: Ask) => {
    rendering.delete(ask);
    frames.delete(ask);
    parked.delete(ask);
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
        rendering.add(chosen.ask);
        if (chosen.ask.frame) frames.add(chosen.ask);
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
      const ask: Ask = { grant, reclaim, frame };
      queue.push(ask);
      next();
      let done = false;
      const held = () => rendering.has(ask) || frames.has(ask);
      const release = () => {
        if (done) return;
        done = true;
        if (held()) {
          drop(ask);
          next();
        } else withdraw(ask);
      };
      return {
        release,
        drawn() {
          if (done || !rendering.has(ask)) return;
          if (!ask.frame) {
            release();
            return;
          }
          rendering.delete(ask);
          next();
        },
        park() {
          if (done) return;
          if (!held()) {
            release();
            return;
          }
          if (!ask.frame) return;
          parked.add(ask);
          next();
        },
        resume() {
          if (done || !held()) return false;
          parked.delete(ask);
          return true;
        },
      };
    },
    live: () => rendering.size,
    frames: () => frames.size,
    parked: () => parked.size,
    waiting: () => queue.length,
  };
}
