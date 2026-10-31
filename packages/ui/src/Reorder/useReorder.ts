import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { announce } from '../Announcer/index.js';
import { prefersReducedMotion } from '../MediaMatch/index.js';

/**
 * How the arrow keys map to a move.
 *
 * - `vertical`: Up moves an item one place earlier, Down one place later. A
 *   list.
 * - `grid`: Left and Up move it one place earlier, Right and Down one place
 *   later. A wrapping row of cards, where the reading order is the order and
 *   "the card above" is not a position the list holds.
 */
export type ReorderAxis = 'vertical' | 'grid';

export interface ReorderLabels {
  /** What the handle does, and its NAME: "Move Projects". */
  handle: (name: string) => string;
  /** The instruction a handle is described by, for a reader who cannot drag. */
  hint: string;
  /** Said after every move, by any means: "Projects moved to position 2 of 6." */
  moved: (name: string, position: number, total: number) => string;
}

export const DEFAULT_REORDER_LABELS: ReorderLabels = {
  handle: (name) => `Move ${name}`,
  hint: 'Drag to move, or press the arrow keys.',
  moved: (name, position, total) => `${name} moved to position ${position} of ${total}.`,
};

/** Several ordered lists, by the id of the container each one is drawn in. */
export type ReorderLists<K extends string> = Readonly<Record<string, readonly K[]>>;

export interface UseReorderListsOptions<K extends string> {
  /** Every list as it stands. The hook never owns them. */
  lists: ReorderLists<K>;
  /** A finished move: a drop, an arrow key or a call to `move`. */
  onReorder: (next: Record<string, K[]>) => void;
  /** What a reader calls an item, for the handle's name and the announcement. */
  nameOf: (key: K) => string;
  /**
   * Whether an item may be dropped into a list. Left out, every item goes
   * anywhere. A page refuses a group inside a group here.
   */
  accepts?: ((key: K, list: string) => boolean) | undefined;
  axis?: ReorderAxis | undefined;
  labels?: Partial<ReorderLabels> | undefined;
}

export interface ReorderHandleProps {
  draggable: true;
  'aria-label': string;
  'aria-describedby': string;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface ReorderItemProps {
  ref: (node: HTMLElement | null) => void;
  'data-reorder': 'dragging' | 'idle';
  /** Set on the item another list's drag would land before, or after when it is the last. */
  'data-reorder-target'?: 'before' | 'after' | undefined;
  /**
   * Which way the target's marker runs: `vertical` beside an item that shares
   * its row, `horizontal` above or below one that spans the row.
   */
  'data-reorder-line'?: 'vertical' | 'horizontal' | undefined;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface ReorderContainerProps {
  'data-reorder-over'?: 'true' | undefined;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface ReorderListsState<K extends string> {
  /** The lists to DRAW: the caller's, or the preview while a drag is held. */
  lists: Readonly<Record<string, readonly K[]>>;
  /** The item being dragged, if any. */
  dragging: K | null;
  /** Spread on the control an item is moved BY. */
  handleProps: (key: K) => ReorderHandleProps;
  /** Spread on the element that holds the item, the one a drag passes over. */
  itemProps: (key: K) => ReorderItemProps;
  /**
   * Spread on the element a list is drawn in. A drop in the gap between two
   * items keeps the preview, and a drag over an EMPTY stretch of another list
   * (an empty group, the space after its last item) moves the item to its end.
   */
  listProps: (list: string) => ReorderContainerProps;
  /** Move an item by a number of places within its own list, clamped to the ends. */
  move: (key: K, by: number) => void;
  /** Move an item to the end of another list, by command (a menu's "Move to"). */
  moveTo: (key: K, list: string) => void;
  /** The id of the hidden instruction every handle is described by. */
  hintId: string;
  /** The instruction itself, for the caller to render once (`VisuallyHidden`). */
  hint: string;
}

export interface UseReorderOptions<K extends string> {
  keys: readonly K[];
  onReorder: (next: K[]) => void;
  nameOf: (key: K) => string;
  axis?: ReorderAxis | undefined;
  labels?: Partial<ReorderLabels> | undefined;
}

export interface Reorder<K extends string> {
  order: readonly K[];
  dragging: K | null;
  handleProps: (key: K) => ReorderHandleProps;
  itemProps: (key: K) => ReorderItemProps;
  containerProps: ReorderContainerProps;
  move: (key: K, by: number) => void;
  hintId: string;
  hint: string;
}

/** `keys` with `key` taken out and put back at `to`. */
export function moveKey<K>(keys: readonly K[], key: K, to: number): K[] {
  const next = keys.filter((k) => k !== key);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, key);
  return next;
}

/** The list holding `key`, or null. */
function listOf<K extends string>(lists: ReorderLists<K>, key: K): string | null {
  for (const [id, keys] of Object.entries(lists)) if (keys.includes(key)) return id;
  return null;
}

/** `lists` with `key` moved into `list` at `index`. */
function place<K extends string>(lists: ReorderLists<K>, key: K, list: string, index: number): Record<string, K[]> {
  const next: Record<string, K[]> = {};
  for (const [id, keys] of Object.entries(lists)) next[id] = keys.filter((k) => k !== key);
  const target = next[list] ?? [];
  target.splice(Math.max(0, Math.min(index, target.length)), 0, key);
  next[list] = target;
  return next;
}

/**
 * How long a move holds before the next: the items' glide (180ms) and one
 * frame more, or a frame when nothing glides.
 */
const SETTLE_MS = 200;
const settleMs = () => (prefersReducedMotion() ? 20 : SETTLE_MS);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Whether an item is ordered against its neighbours by rows: every item of a
 * vertical list, and in a grid one that spans most of its row, where "before
 * it" is above it and not to its left.
 */
function byRows(node: HTMLElement, axis: ReorderAxis): boolean {
  if (axis === 'vertical') return true;
  const row = node.parentElement?.getBoundingClientRect();
  return row !== undefined && node.getBoundingClientRect().width > row.width * 0.75;
}

/** Which way a landing marker beside `node` runs. */
const lineOf = (node: HTMLElement, axis: ReorderAxis): 'vertical' | 'horizontal' =>
  byRows(node, axis) ? 'horizontal' : 'vertical';

/** Whether (x, y) falls in the earlier half of `node`, read along the way it is ordered. */
function inEarlierHalf(node: HTMLElement, axis: ReorderAxis, x: number, y: number): boolean {
  const r = node.getBoundingClientRect();
  return byRows(node, axis) ? y < r.top + r.height / 2 : x < r.left + r.width / 2;
}

/** The last item of a list that is not `except`. */
function lastOf<K>(keys: readonly K[] | undefined, except: K | null): K | undefined {
  const rest = (keys ?? []).filter((k) => k !== except);
  return rest[rest.length - 1];
}

const sameLists = <K extends string>(a: ReorderLists<K>, b: ReorderLists<K>): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const PREVIOUS: Record<ReorderAxis, readonly string[]> = {
  vertical: ['ArrowUp'],
  grid: ['ArrowUp', 'ArrowLeft'],
};
const NEXT: Record<ReorderAxis, readonly string[]> = {
  vertical: ['ArrowDown'],
  grid: ['ArrowDown', 'ArrowRight'],
};

/**
 * Reordering items within and between lists, by drag, by keyboard and by
 * command, as one operation: the cards of a page and the cards inside each
 * of its groups.
 *
 * ONE IMPLEMENTATION, because there were three. DataTable's column settings,
 * the dashboard's priority list and its board each carried their own drag
 * handlers, and only one of them could be reached from a keyboard. This hook
 * is that one's rules, given to every list that can be put in order.
 *
 * THE HANDLE IS A CONTROL. It is what an item is dragged BY, it has a name
 * ("Move Projects"), it takes focus, and the arrow keys move the item from
 * there. Moving into another list by keyboard is `moveTo`, which a caller
 * offers as a command ("Move to group"), because "the next list" is not a
 * direction an arrow key names.
 *
 * THE CALLER OWNS THE LISTS. While a drag is held the hook draws a PREVIEW
 * within the item's own list and MARKS where it would land in another one
 * (`data-reorder-target` on the item it would precede, `data-reorder-over`
 * on the list); a drop reports the new lists once, and a drag that ends
 * anywhere else (Escape, outside every list) leaves them as they were.
 *
 * EVERY MOVE IS SAID, through the page's `Announcer`, and ITEMS GLIDE to
 * their new place (a FLIP transform) unless the reader asked for reduced
 * motion.
 */
export function useReorderLists<K extends string>({
  lists,
  onReorder,
  nameOf,
  accepts,
  axis = 'vertical',
  labels: labelOverrides,
}: UseReorderListsOptions<K>): ReorderListsState<K> {
  const labels = { ...DEFAULT_REORDER_LABELS, ...labelOverrides };
  const hintId = `${useId()}-reorder-hint`;
  const [dragging, setDragging] = useState<K | null>(null);
  const [preview, setPreview] = useState<Record<string, K[]> | null>(null);
  // Where the item would land in ANOTHER list. Moving it there while the drag
  // is held would unmount the element being dragged (it is drawn by another
  // parent), and a browser ends a drag whose source has left the document
  // without telling anybody. So another list shows where it will land, and
  // the move is made on the drop.
  const [target, setTarget] = useState<{ list: string; before: K | null; line: 'vertical' | 'horizontal' } | null>(
    null,
  );
  const shown: ReorderLists<K> = preview ?? lists;

  // FLIP: where each item was drawn before the lists changed.
  const nodes = useRef(new Map<K, HTMLElement>());
  const before = useRef(new Map<K, DOMRect>());
  const measure = useCallback(() => {
    before.current = new Map();
    for (const [key, node] of nodes.current) {
      // A glide still running is ended first, so what is measured is where
      // the item IS, not a frame of its way there.
      for (const a of node.getAnimations?.() ?? []) a.finish();
      before.current.set(key, node.getBoundingClientRect());
    }
  }, []);
  const shape = JSON.stringify(shown);
  useLayoutEffect(() => {
    const last = before.current;
    before.current = new Map();
    if (last.size === 0) return;
    if (typeof window === 'undefined' || prefersReducedMotion()) return;
    for (const [key, node] of nodes.current) {
      const was = last.get(key);
      if (!was) continue;
      const now = node.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (dx === 0 && dy === 0) continue;
      node.animate?.([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 180,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
      });
    }
  }, [shape]);

  // The caller's overrides are a fresh object every render; a ref keeps the
  // callbacks below stable without reading a stale sentence.
  const said = useRef(labels.moved);
  said.current = labels.moved;
  const commit = useCallback(
    (next: Record<string, K[]>, moved: K) => {
      onReorder(next);
      const list = listOf(next, moved);
      const keys = list ? (next[list] ?? []) : [];
      announce(said.current(nameOf(moved), keys.indexOf(moved) + 1, keys.length));
    },
    [onReorder, nameOf],
  );

  const move = useCallback(
    (key: K, by: number) => {
      const list = listOf(lists, key);
      if (list === null) return;
      const keys = lists[list] ?? [];
      const at = keys.indexOf(key);
      const to = Math.max(0, Math.min(keys.length - 1, at + by));
      if (to === at) return;
      measure();
      commit(place(lists, key, list, to), key);
    },
    [lists, measure, commit],
  );

  const moveTo = useCallback(
    (key: K, list: string) => {
      if (listOf(lists, key) === list) return;
      if (accepts && !accepts(key, list)) return;
      measure();
      commit(place(lists, key, list, (lists[list] ?? []).length), key);
    },
    [lists, accepts, measure, commit],
  );

  // WHEN THE NEXT MOVE MAY BE MADE. A move slides the items around it, and
  // for the length of that glide the item under the pointer is one in
  // motion: answered at once, the pointer that caused a move caused the move
  // back, every frame. See [SETTLE_MS].
  const settled = useRef(0);

  /**
   * Where an item dropped at (x, y) would land in `list`: before the first
   * item that follows the point in reading order, or at the end. Read from
   * where the items are, so it does not change as the pointer crosses the gap
   * between two of them. An item that spans its row is passed at its middle
   * from top to bottom, so the upper half of a full-width group lands above it.
   */
  const insertionPoint = (list: string, moved: K, x: number, y: number) => {
    let last: HTMLElement | undefined;
    for (const k of preview?.[list] ?? []) {
      if (k === moved) continue;
      const node = nodes.current.get(k);
      if (!node) continue;
      last = node;
      const r = node.getBoundingClientRect();
      if (y < r.top || (y <= r.bottom && inEarlierHalf(node, axis, x, y))) {
        return { list, before: k, line: lineOf(node, axis) };
      }
    }
    return { list, before: null, line: last ? lineOf(last, axis) : 'vertical' };
  };
  /** Marks where the drag would land in another list, when that changed. */
  const aim = (list: string, moved: K, x: number, y: number) => {
    const next = insertionPoint(list, moved, x, y);
    if (target?.list !== next.list || target.before !== next.before || target.line !== next.line) setTarget(next);
  };

  const reset = () => {
    setDragging(null);
    setPreview(null);
    setTarget(null);
    settled.current = 0;
  };

  /** The drop, wherever it lands: the preview, or the other list's marked place. */
  const drop = (event: DragEvent<HTMLElement>) => {
    if (dragging === null || !preview) return;
    event.preventDefault();
    event.stopPropagation();
    const moved = dragging;
    let next: Record<string, K[]> = preview;
    if (target) {
      const keys = (preview[target.list] ?? []).filter((k) => k !== moved);
      const at = target.before === null ? keys.length : keys.indexOf(target.before);
      next = place(preview, moved, target.list, at < 0 ? keys.length : at);
    }
    reset();
    if (!sameLists(next, lists)) {
      measure();
      commit(next, moved);
    }
  };

  const handleProps = (key: K): ReorderHandleProps => ({
    draggable: true,
    'aria-label': labels.handle(nameOf(key)),
    'aria-describedby': hintId,
    onDragStart: (event) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = 'move';
      // Firefox starts no drag without data.
      event.dataTransfer.setData('text/plain', nameOf(key));
      // Drag the whole item, not the handle the pointer happens to be on.
      const node = nodes.current.get(key);
      if (node) event.dataTransfer.setDragImage(node, 24, 16);
      setDragging(key);
      setPreview(Object.fromEntries(Object.entries(lists).map(([id, keys]) => [id, [...keys]])));
    },
    // Whatever ended the drag, the preview goes: a drop has already committed.
    onDragEnd: reset,
    onKeyDown: (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const by = PREVIOUS[axis].includes(event.key) ? -1 : NEXT[axis].includes(event.key) ? 1 : 0;
      if (by === 0) return;
      event.preventDefault();
      event.stopPropagation();
      move(key, by);
    },
  });

  /** The marker an item carries when another list's drag would land beside it. */
  const markerOf = (key: K): Pick<ReorderItemProps, 'data-reorder-target' | 'data-reorder-line'> => {
    if (!target) return {};
    const edge =
      target.before === key
        ? 'before'
        : target.before === null && lastOf(preview?.[target.list], dragging) === key
          ? 'after'
          : undefined;
    return edge ? { 'data-reorder-target': edge, 'data-reorder-line': target.line } : {};
  };

  const itemProps = (key: K): ReorderItemProps => ({
    ref: (node) => {
      if (node) nodes.current.set(key, node);
      else nodes.current.delete(key);
    },
    'data-reorder': dragging === key ? 'dragging' : 'idle',
    ...markerOf(key),
    onDragOver: (event) => {
      if (dragging === null || !preview) return;
      const list = listOf(preview, key);
      if (list === null) return;
      if (accepts && !accepts(dragging, list)) return;
      // The innermost item under the pointer decides: a card inside a group
      // is passed over before the group it sits in.
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      if (key === dragging) return;
      if (listOf(preview, dragging) !== list) {
        aim(list, dragging, event.clientX, event.clientY);
        return;
      }
      if (target) setTarget(null);
      if (now() < settled.current) return;
      const keys = preview[list] ?? [];
      const from = keys.indexOf(dragging);
      const to = keys.indexOf(key);
      if (from === to) return;
      // PAST THE MIDDLE, IN THE DIRECTION OF TRAVEL. An item takes another's
      // place only once the pointer has crossed that item's middle on the way
      // through it: forward past it, back before it. Two items of different
      // sizes otherwise trade places on every event, because the one moved
      // away is still under the pointer.
      const early = inEarlierHalf(event.currentTarget, axis, event.clientX, event.clientY);
      if (from < to && early) return;
      if (from > to && !early) return;
      measure();
      setPreview(place(preview, dragging, list, to));
      settled.current = now() + settleMs();
    },
    onDrop: drop,
  });

  const listProps = (list: string): ReorderContainerProps => ({
    // Lit only when the item would move INTO this list: reordering within a
    // list is already shown by the items moving.
    'data-reorder-over': dragging !== null && target?.list === list ? 'true' : undefined,
    onDragOver: (event) => {
      if (dragging === null || !preview) return;
      if (accepts && !accepts(dragging, list)) return;
      event.preventDefault();
      event.stopPropagation();
      // Reached only over the list's own empty stretch (an item stops the
      // event first): the item would land where the point falls among them.
      if (listOf(preview, dragging) === list) {
        if (target) setTarget(null);
        return;
      }
      aim(list, dragging, event.clientX, event.clientY);
    },
    onDrop: drop,
  });

  return { lists: shown, dragging, handleProps, itemProps, listProps, move, moveTo, hintId, hint: labels.hint };
}

const ONLY = 'list';

/**
 * One list's reordering: `useReorderLists` over a single list, for the
 * common case of a settings panel or a shelf.
 */
export function useReorder<K extends string>({
  keys,
  onReorder,
  nameOf,
  axis,
  labels,
}: UseReorderOptions<K>): Reorder<K> {
  const lists = useMemo(() => ({ [ONLY]: keys }), [keys]);
  const report = useCallback((next: Record<string, K[]>) => onReorder(next[ONLY] ?? []), [onReorder]);
  const r = useReorderLists({ lists, onReorder: report, nameOf, axis, labels });
  return {
    order: r.lists[ONLY] ?? [],
    dragging: r.dragging,
    handleProps: r.handleProps,
    itemProps: r.itemProps,
    containerProps: r.listProps(ONLY),
    move: r.move,
    hintId: r.hintId,
    hint: r.hint,
  };
}
