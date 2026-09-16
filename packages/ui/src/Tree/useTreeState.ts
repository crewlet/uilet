/**
 * A collapsible tree's state, and what a key press asks of it.
 *
 * ONE COPY FOR BOTH PATTERNS. A chart drawn as a `tree` and an outline drawn
 * as a `treegrid` keep the same expansion and roving focus rules over the same
 * visible order model; only their roles, their focus and their cells differ.
 * That shared half lives here.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createTreeModel,
  isTypeAheadKey,
  treeAllExpandable,
  treeAncestors,
  treeCollapseOrAscend,
  treeExpandOrDescend,
  treeFirst,
  treeLast,
  treeNext,
  treePrevious,
  treeTypeAhead,
  treeVisible,
  typeAheadBuffer,
  type TreeInput,
  type TreeModel,
  type TypeAheadState,
} from './model.js';

/** The slice of a keyboard event these functions read, so a plain object works too. */
export interface TreeKeyEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface TreeState {
  readonly model: TreeModel;
  readonly expanded: ReadonlySet<string>;
  /** Every visible node, in order. */
  readonly rows: readonly string[];
  /** The roving tab stop: always a visible node, or `null` for an empty tree. */
  readonly active: string | null;
  setActive(id: string): void;
  toggle(id: string): void;
  expandAll(): void;
  /** Collapses everything but the tops, so the tree keeps something to stand on. */
  collapseAll(): void;
  /** Opens every collapsed ancestor of `id`; true when any was closed. */
  open(id: string): boolean;
  /**
   * The node typing `key` at `now` finds after `from`: `null` when nothing
   * matches, `undefined` when the key is not a type ahead key at all.
   */
  typed(event: TreeKeyEvent, from: string, now: number): string | null | undefined;
}

/**
 * What is collapsed, which node holds the tab stop, and type ahead.
 *
 * COLLAPSED, NOT EXPANDED, IS WHAT IS KEPT: a node nobody has closed is open,
 * which is also what a node an operation just added should be. The tab stop is
 * the node last focused, else the selection, else the first node, and is moved
 * to the nearest visible ancestor when its own node is hidden or gone, so the
 * tree always has exactly one way in.
 */
export function useTreeState(forest: readonly TreeInput[], selected: string | null): TreeState {
  const model = useMemo(() => createTreeModel(forest), [forest]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const expanded = useMemo(() => {
    const out = treeAllExpandable(model);
    for (const id of collapsed) out.delete(id);
    return out;
  }, [model, collapsed]);
  const rows = useMemo(() => treeVisible(model, expanded), [model, expanded]);

  const [wanted, setActive] = useState<string | null>(null);
  const active = useMemo(() => {
    const id = wanted ?? selected;
    if (id !== null && model.parent.has(id)) {
      if (rows.includes(id)) return id;
      const shown = treeAncestors(model, id)
        .reverse()
        .find((ancestor) => rows.includes(ancestor));
      if (shown) return shown;
    }
    return treeFirst(model);
  }, [wanted, selected, model, rows]);

  const toggle = useCallback((id: string) => {
    setCollapsed((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const current = useRef({ model, collapsed });
  current.current = { model, collapsed };

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    const { model: shown } = current.current;
    const next = treeAllExpandable(shown);
    shown.roots.forEach((root) => next.delete(root));
    setCollapsed(next);
  }, []);

  const open = useCallback((id: string) => {
    const { model: shown, collapsed: closed } = current.current;
    const hidden = treeAncestors(shown, id).filter((ancestor) => closed.has(ancestor));
    if (hidden.length === 0) return false;
    setCollapsed((was) => {
      const next = new Set(was);
      hidden.forEach((ancestor) => next.delete(ancestor));
      return next;
    });
    return true;
  }, []);

  const buffer = useRef<TypeAheadState>({ text: '', at: 0 });
  const typed = (event: TreeKeyEvent, from: string, now: number) => {
    if (!isTypeAheadKey(event, buffer.current, now)) return undefined;
    buffer.current = typeAheadBuffer(buffer.current, event.key, now);
    return treeTypeAhead(model, expanded, from, buffer.current.text);
  };

  return { model, expanded, rows, active, setActive, toggle, expandAll, collapseAll, open, typed };
}

/** What a navigation key asks of a tree: focus a node, or open or close one. */
export type TreeStep = { readonly focus: string } | { readonly toggle: string };

/**
 * What a navigation key pressed on `id` asks for: a step, `null` for a key
 * that is the tree's but leads nowhere (Up on the first node), or `undefined`
 * for a key that is not the tree's at all, which the caller leaves alone.
 *
 * Down and Up walk the visible order; Right opens a closed node or enters an
 * open one; Left closes an open node or climbs to the parent; Home and End
 * jump; a printable key types ahead. A chord with Ctrl, Command or Alt is
 * never the tree's.
 */
export function treeStep(
  tree: TreeState,
  id: string,
  event: TreeKeyEvent & { timeStamp: number },
): TreeStep | null | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined;
  const { model, expanded } = tree;
  const focus = (next: string | null): TreeStep | null => (next === null ? null : { focus: next });
  switch (event.key) {
    case 'ArrowDown':
      return focus(treeNext(model, expanded, id));
    case 'ArrowUp':
      return focus(treePrevious(model, expanded, id));
    case 'ArrowRight': {
      const step = treeExpandOrDescend(model, expanded, id);
      if (step === null) return null;
      return 'expand' in step ? { toggle: step.expand } : { focus: step.focus };
    }
    case 'ArrowLeft': {
      const step = treeCollapseOrAscend(model, expanded, id);
      if (step === null) return null;
      return 'collapse' in step ? { toggle: step.collapse } : { focus: step.focus };
    }
    case 'Home':
      return focus(treeFirst(model));
    case 'End':
      return focus(treeLast(model, expanded));
    default: {
      const found = tree.typed(event, id, event.timeStamp);
      return found === undefined ? undefined : focus(found);
    }
  }
}

/**
 * What a key press asks of the ITEM it landed on, as opposed to of the tree.
 *
 * `activate` is the item's primary action (a row's editor, a card's form),
 * `remove` deletes it, and `menu` opens its own menu, which the widget handles
 * itself because it owns which menu is open. Shift+F10 is the menu too: the
 * ContextMenu key is missing from several keyboards and every platform that
 * lacks it offers that chord instead.
 *
 * Shift with Enter, Delete or Backspace is NOT the item's: those are a text
 * selection's or an application's, and an item that claimed them would delete
 * a node while somebody was extending a selection over it.
 */
export type TreeItemAction = 'activate' | 'remove' | 'menu';

export function treeItemAction(event: TreeKeyEvent): TreeItemAction | null {
  if (event.key === 'F10' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return 'menu';
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.key === 'ContextMenu') return 'menu';
  if (event.shiftKey) return null;
  if (event.key === 'Enter') return 'activate';
  if (event.key === 'Delete' || event.key === 'Backspace') return 'remove';
  return null;
}

/** What a screen can ask of a tree view it holds a ref to. */
export interface TreeViewHandle {
  /** Open every collapsed ancestor of a node, focus it, and bring it into view. */
  focusNode(id: string): void;
  expandAll(): void;
  /** Collapse everything but the tops, so the tree keeps something to stand on. */
  collapseAll(): void;
}
