/**
 * The one peek in an application, mounted by its frame, and the order a list
 * publishes for it to step through.
 *
 * # Why the frame and not the screen
 *
 * A rail rendered by whichever screen wanted one meant exactly one screen had
 * one. Mounted by the frame it is the opposite: no screen renders a peek and
 * every screen has one. A list opens it by naming what it points at, and an
 * address that names a peek opens the same thing on arrival.
 *
 * # Stepping belongs to the list, not to the rail
 *
 * Previous and Next walk the rows the reader is actually looking at (sorted,
 * filtered and paged as they left them), and only the list knows that order.
 * So a list PUBLISHES its order with `usePeekNeighbours` and the rail steps
 * through it; a list that publishes nothing gets a rail with no stepper
 * rather than one that steps through something else.
 *
 * The order is a list of TOKENS, the host's own identity for an object (kind
 * and id, say), rather than the rows themselves: the rail needs identity and
 * nothing else, and handing it rows would make every list's row type part of
 * the frame's contract.
 */

import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PeekRail, type PeekRailProps } from './PeekRail.js';

/** What a list publishes: the order it draws, and what its rows' own pages carry. */
export interface PeekOrder {
  tokens: readonly string[];
  /**
   * The query a page opened from this list carries, such as the list's own
   * filter, which is what lets an object's page say "3 of 18" and step to the
   * next. Only an object IN the list carries it.
   */
  query?: Readonly<Record<string, string>> | undefined;
}

interface Neighbours extends PeekOrder {
  publish: (order: PeekOrder) => void;
}

const NeighbourContext = createContext<Neighbours | null>(null);

const NOTHING: PeekOrder = { tokens: [] };

/** Holds the order the list on screen published. Mounted once, around the frame. */
export function PeekNeighbours({ children }: { children: ReactNode }) {
  const [published, publish] = useState<PeekOrder>(NOTHING);
  const value = useMemo(() => ({ ...published, publish }), [published]);
  return <NeighbourContext.Provider value={value}>{children}</NeighbourContext.Provider>;
}

/** The order the list on screen published; empty where none did. */
export function usePeekOrder(): PeekOrder {
  const host = useContext(NeighbourContext);
  return host ? { tokens: host.tokens, query: host.query } : NOTHING;
}

/**
 * Publish the order Previous and Next should walk.
 *
 * KEYED ON THE TOKENS rather than on the array, because a list rebuilds its
 * rows on every push: an effect depending on the array itself would republish
 * several times a second and re-render the rail with it. The list that
 * published last owns the stepper, and unmounting clears it, so a rail opened
 * from the next screen does not step through the last one's rows.
 */
export function usePeekNeighbours(tokens: readonly string[], query?: Readonly<Record<string, string>>): void {
  const publish = useContext(NeighbourContext)?.publish;
  const key = tokens.join('\u0000');
  const queryKey = query ? new URLSearchParams(query as Record<string, string>).toString() : '';
  useEffect(() => {
    if (!publish) return undefined;
    const order: PeekOrder = {
      tokens: key === '' ? [] : key.split('\u0000'),
      ...(queryKey === '' ? null : { query: Object.fromEntries(new URLSearchParams(queryKey)) }),
    };
    publish(order);
    return () => publish(NOTHING);
  }, [key, queryKey, publish]);
}

/**
 * The step Previous and Next take from `current` through the published
 * order, or undefined where there is nothing to step through: no list
 * published an order, `current` is not in it, or it is the only row.
 *
 * A STEP MOVES THE PEEK, it does not open another: the host's `move` should
 * REPLACE its address entry, so four objects walked through one open rail are
 * one place the reader has been and Back leaves the list.
 *
 * Exported for a list whose own widget takes the keys (a tree that reads every
 * printable key as type-ahead), so there is one stepper and one order.
 */
export function usePeekStep(
  current: string | null,
  move: (token: string) => void,
): ((delta: -1 | 1) => void) | undefined {
  const { tokens } = usePeekOrder();
  if (current === null) return undefined;
  const at = tokens.indexOf(current);
  if (at < 0 || tokens.length < 2) return undefined;
  return (delta) => {
    const next = tokens[Math.max(0, Math.min(tokens.length - 1, at + delta))];
    if (next !== undefined && next !== current) move(next);
  };
}

export interface PeekHostProps
  extends Omit<PeekRailProps, 'label' | 'onStep' | 'openHref' | 'onClose' | 'children'> {
  /** The token of the object the peek is open on, read from the host's address; null when closed. */
  current: string | null;
  /**
   * The body for an object, or undefined where this build has none for its
   * kind (a hand-edited or out-of-date address), which closes the rail rather
   * than opening it empty.
   */
  render: (token: string) => ReactNode | undefined;
  /** Names the rail for an object: "Task detail". */
  label: (token: string) => string;
  /** Closes the peek: the host removes it from its address. */
  onClose: () => void;
  /** Moves the peek to another object: the host REPLACES its address entry. */
  onMove: (token: string) => void;
  /**
   * The object's own page for the Open link, with the query of the list it
   * was opened from when it is in that list; undefined for no Open (an object
   * whose page is the list under the rail).
   */
  openHref?: ((token: string, query: Readonly<Record<string, string>> | undefined) => string | undefined) | undefined;
  /** Wraps the body, keyed on the object, in the host's own error boundary. */
  boundary?: ((token: string, body: ReactNode) => ReactNode) | undefined;
}

export function PeekHost({ current, render, label, onClose, onMove, openHref, boundary, ...rail }: PeekHostProps) {
  const order = usePeekOrder();
  const step = usePeekStep(current, onMove);
  const body = current === null ? undefined : render(current);
  const missing = current !== null && body === undefined;

  useEffect(() => {
    if (missing) onClose();
  }, [missing, onClose]);
  if (current === null || body === undefined) return null;

  // THE OPEN LINK CARRIES THE LIST only for an object IN it: a peek opened on
  // something else (a mention, a pasted address) has no place in that list.
  const query = order.tokens.includes(current) ? order.query : undefined;

  return (
    <PeekRail {...rail} label={label(current)} onClose={onClose} onStep={step} openHref={openHref?.(current, query)}>
      {/* KEYED ON THE OBJECT: stepping from one object to the next changes one
          token, and without a key React would reconcile ONE body, so an open
          disclosure or a chosen tab would describe the last object until
          something cleared it. */}
      <Fragment key={current}>{boundary ? boundary(current, body) : body}</Fragment>
    </PeekRail>
  );
}
