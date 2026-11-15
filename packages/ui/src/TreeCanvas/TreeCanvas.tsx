/**
 * A hierarchy drawn as cards on a canvas, with the ARIA tree pattern over it.
 * The caller renders each card; pointer controls sit beside its treeitem, out
 * of the tab order, and a press on them lands focus on the treeitem.
 */

import {
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  CANVAS_COMPOSE_CONTEXT,
  CANVAS_FIT_MAX_ZOOM,
  Canvas,
  type CanvasGround,
  type CanvasHandle,
  type CanvasLabels,
  type CanvasRect,
  type CanvasSize,
  type CanvasView,
} from '../Canvas/index.js';
import { focusables } from '../Layer/index.js';
import {
  layoutConnectors,
  layoutForest,
  treeAncestors,
  treeExpandable,
  treeItemAction,
  treeLevel,
  treePosInSet,
  treeSetSize,
  treeStep,
  useLayoutAnchor,
  useMeasuredSizes,
  useTreeState,
  type ForestLayout,
  type LayoutGroup,
  type LayoutNode,
  type TreeConnectorShape,
  type TreeInput,
  type TreeItemAction,
  type LayoutRanks,
  type TreeModel,
  type TreeViewHandle,
} from '../Tree/index.js';
import { useEntrance, useReflow, useStillness } from './motion.js';
import { cx } from '../utils/cx.js';
import type { NodeHue } from '../utils/nodeHue.js';
import type { CanvasPoint } from '../Canvas/geometry.js';

/** A card of the layout: its id and the cards nested under it. */
export interface TreeCardInput {
  id: string;
  children: TreeCardInput[];
}

/**
 * The hue a card is tinted with, and the connector arriving at it: one of the
 * six an operator chooses an entity's hue from ([NodeHue]), so an agent's card
 * wears the same hue as its avatar and its row.
 */
export type TreeCardTone = NodeHue;

/**
 * The props that make an element the pointer-only strip of controls beside a
 * node: see `TreeCardContext.actions`.
 */
export interface TreeActionsProps {
  className: string;
  'aria-hidden': 'true';
  /** Set while a menu inside the strip is open, so the strip stays drawn. */
  'data-menu-open': 'true' | undefined;
  onMouseDown(event: MouseEvent<HTMLElement>): void;
}

/** The props that make an element the treeitem of a node. */
export interface TreeItemProps {
  role: 'treeitem';
  tabIndex: number;
  'aria-level': number;
  'aria-setsize': number;
  'aria-posinset': number;
  'aria-expanded': boolean | undefined;
  'aria-selected': boolean;
  /**
   * The label of the group box the node's card is drawn in, for the card's
   * own node: see `TreeCanvasProps.groups`. Unset for every other node.
   */
  'aria-describedby': string | undefined;
  'data-tree-id': string;
  ref: (el: HTMLElement | null) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}

/** What a card needs from the tree it is drawn in. */
export interface TreeCardContext {
  /** The props that make an element the treeitem of `id`. Spread them. */
  item(id: string): TreeItemProps;
  expanded(id: string): boolean;
  expandable(id: string): boolean;
  toggle(id: string): void;
  /** Makes `id` the current node without moving focus, as a pointer action on its card does. */
  activate(id: string): void;
  /**
   * The props of a node's pointer-only strip of controls: its class, hidden
   * from assistive technology, a press landing on the node. Put that element
   * IMMEDIATELY AFTER the node's treeitem: the reveal is keyed on it.
   */
  actions(id: string): TreeActionsProps;
  /**
   * The props that make a press anywhere in a pointer-only strip land on `id`
   * rather than on the button it hit. Wrap the strip in them.
   */
  press(id: string): { onMouseDown(event: MouseEvent<HTMLElement>): void };
  menuOpen(id: string): boolean;
  setMenuOpen(id: string, open: boolean): void;
}

/**
 * What a screen can ask of a tree drawn on a canvas: a tree view's handle plus
 * the two moves only a view with a viewport can make.
 */
export interface TreeCanvasHandle extends TreeViewHandle {
  /**
   * Open every collapsed ancestor of a node, focus it, and bring it into view:
   * a node out of view comes to the middle at the reader's zoom, one partly in
   * view moves the least distance, and one in view does not move.
   */
  focusNode(id: string): void;
  /**
   * Ease onto one node's own card with room around it, remembering the view it
   * left, for a surface opened about that node. Ignored before it is laid out.
   */
  focusRegion(id: string): void;
  /** Give back the view [focusRegion] left. */
  restoreView(): void;
}

/**
 * A node being composed: a ghost card for its form, grafted into the card
 * forest under `parent` but never into `nodes`, so no real node's level, set
 * size or key moves. It is drawn outside the tree element.
 */
export interface TreeComposing {
  /**
   * The ghost card's own id. It must not be an id of `nodes`: there it would be
   * a node that set sizes count and arrow keys land on.
   */
  id: string;
  /** The card it hangs under, which is the node the new one is being added to. */
  parent: string;
  /**
   * The accessible name of the ghost, such as "Add to Engineering": focus moves
   * into it, so the name says what is being made and where.
   */
  label: string;
  /** What is drawn inside the ghost: the form that makes the node. */
  render: () => ReactNode;
  /** Escape inside the ghost. Cancelling is the caller's: it owns the form. */
  onCancel: () => void;
}

/**
 * A box drawn round a run of sibling cards, with a label along its top: a unit
 * round the seats in it, say. See `TreeCanvasProps.groups`.
 */
export interface TreeCanvasGroup {
  /** The group's own id. Unique among the groups, and never a card's id. */
  id: string;
  /**
   * What the box is called, such as "Engineering · Core". Drawn along its top
   * in the tertiary ink, and read as the description of every member card.
   */
  label: string;
  /**
   * A short key ahead of the label, such as a project key chip: "ENG
   * Engineering · Core". Drawn and described with the label.
   */
  lead?: ReactNode | undefined;
  /**
   * The cards it encloses: ids `cards` returns, consecutive children of one
   * card (or roots). Undrawn members are left out, a group with none is not
   * drawn, and anything else is refused (see [LayoutGroup]).
   */
  memberIds: readonly string[];
}

/** The id of the probe the gaps between cards are measured from. */
/**
 * The zoom below which a branch's add mark waits for a zoom in: under it a
 * full pointer target no longer fits between two ranks. The card's own menu still adds.
 */
export const TREE_ADD_MARK_MIN_ZOOM = 0.4;

const GAP_PROBE = 'crewlet:tree-canvas-gap';

/**
 * The id of the probe the space around the whole chart is measured from: a
 * spacing token so density scales it, and a layout value rather than scroller
 * padding because the canvas clips.
 */
const MARGIN_PROBE = 'crewlet:tree-canvas-margin';

/**
 * The id of the probe a group box's padding is measured from: width beside
 * the outermost members, height under them. The same step as the label's
 * inset, so a group's label starts on its first card's edge.
 */
const GROUP_PAD_PROBE = 'crewlet:tree-canvas-group-pad';

/**
 * The id a group's header is measured under: measured rather than a token,
 * since it is a line of text at the reader's font size plus the caller's chip.
 */
const groupHeadKey = (id: string) => `crewlet:tree-canvas-group:${id}`;

export interface TreeCanvasProps {
  /** The accessible name of the chart, such as "Structure chart". */
  label: string;
  /**
   * The hierarchy as the tree pattern reads it: every node, nested. Keep it
   * stable across renders (a `useMemo`): a fresh array rebuilds the model and
   * the layout.
   */
  nodes: readonly TreeInput[];
  /**
   * Which cards the layout draws and how they nest (a node drawn as a row is
   * not a card). Asked again when the model or expansion changes; keep it
   * stable, since the layout it feeds is this component's costliest work.
   */
  cards: (model: TreeModel, expanded: ReadonlySet<string>) => TreeCardInput[];
  /** The card a node is drawn in: itself, or the card holding its row. Stable, as `cards` is. */
  cardOf: (id: string) => string;
  /** Draws one card. Everything it needs from the tree is the second argument. */
  renderCard: (id: string, card: TreeCardContext) => ReactNode;
  /**
   * What hangs under a card, such as the control that adds a child. It is part
   * of the card, so the layout reserves its room, kept whether or not it is
   * drawn; return nothing for a card that takes none.
   */
  renderUnder?: ((id: string, card: TreeCardContext) => ReactNode) | undefined;
  /**
   * The hue a card is tinted with and the connector arriving at it: one answer
   * for both, so they cannot disagree. Unset or empty, both are neutral.
   */
  cardTone?: ((id: string) => TreeCardTone | undefined) | undefined;
  /**
   * A card pushed back, such as a seat a status filter leaves out: drawn in
   * grey at full contrast, so the cards that are not stand out. Asked per card.
   */
  cardDimmed?: ((id: string) => boolean) | undefined;
  /**
   * How a card is drawn: `card` (the default), a panel of one width with its
   * lines stacked; or `node`, an org chart node as wide as its name, one rank
   * tall, with actions down its right edge and the add hanging under it.
   */
  appearance?: 'card' | 'node' | undefined;
  /**
   * Where a card's top edge sits: under its own parent (`per-parent`) or on a
   * band per depth (`shared`). Unset, `node` charts share bands and `card`
   * charts do not. See [LayoutRanks].
   */
  ranks?: LayoutRanks | undefined;
  /**
   * The shape of the connectors: `elbow` (the default), `straight`, `step` or
   * `curve`. See [layoutConnectors], which states what each shape costs.
   */
  connector?: TreeConnectorShape | undefined;
  /**
   * Boxes drawn round runs of sibling cards, each labelled along its top (see
   * [TreeCanvasGroup]). Keep it stable, as `nodes` is: it is a layout input.
   */
  groups?: readonly TreeCanvasGroup[] | undefined;
  /**
   * Carries out Enter (activate) or Delete and Backspace (remove) on a node;
   * return false when it has no such action, so the key travels on. The Menu
   * key opens the node's menu itself (see `hasNodeMenu`).
   */
  onNodeKey?: ((id: string, action: Exclude<TreeItemAction, 'menu'>) => boolean) | undefined;
  /**
   * Any other key the caller claims on a node, such as Alt+arrow to move it,
   * asked first; return true when handled. The same contract as
   * `TreeGridProps.onRowKeyDown`.
   */
  onNodeKeyDown?: ((id: string, event: KeyboardEvent<HTMLElement>) => boolean) | undefined;
  /** Whether a node has a menu the ContextMenu key and Shift+F10 can open. */
  hasNodeMenu?: ((id: string) => boolean) | undefined;
  /** The selected node, drawn as `aria-selected` on its treeitem. */
  selectedId?: string | null | undefined;
  /**
   * Selection follows focus. Called with every node focus reaches, so a caller
   * that selects only some of them (a group heading is no node of the data)
   * filters here.
   */
  onSelect?: ((id: string) => void) | undefined;
  /**
   * The node the operator just acted on, which a relayout keeps still on
   * screen. Without one the node holding focus is kept still instead.
   */
  anchorNode?: string | null | undefined;
  /** Drawn over the canvas without the transform, such as a note about the chart. */
  overlay?: ReactNode | undefined;
  /** Which corner the canvas's controls sit in. A chart's own corner is the top right. */
  controlsPlacement?: 'top-right' | 'bottom-right' | undefined;
  /** Anything else in the canvas's control bar: see [CanvasProps.controlsExtra]. */
  controlsExtra?: ReactNode | undefined;
  /** Bars stacked under the canvas's control bar: see [CanvasProps.controlsBelow]. */
  controlsBelow?: ReactNode | undefined;
  /** A bar in the corner opposite the control bar: see [CanvasProps.controlsStart]. */
  controlsStart?: ReactNode | undefined;
  /** A bar across the canvas from the control bar, such as a status legend: see [CanvasProps.overlayEnd]. */
  overlayEnd?: ReactNode | undefined;
  /** A note under the canvas's controls, about a key or a state: see [CanvasProps.hint]. */
  hint?: ReactNode | undefined;
  /**
   * Pushes the chart back, for a surface opened over it about one of its
   * nodes. See [CanvasProps.dimmed]; pair it with `focusRegion` on the handle,
   * which says WHICH node the surface is about.
   */
  dimmed?: boolean | undefined;
  /** What the field under the chart is drawn as: see [CanvasProps.ground]. */
  ground?: CanvasGround | undefined;
  /**
   * A node being composed in the chart rather than in a surface over it: see
   * [TreeComposing]. Null, and the chart is the data and nothing else.
   */
  composing?: TreeComposing | null | undefined;
  /** The canvas control labels, for another language. */
  labels?: Partial<CanvasLabels> | undefined;
  /**
   * The smallest zoom a fit may take: see [CanvasProps.minZoom]. A chart that
   * must always open whole, however wide, names a floor under the canvas's own.
   */
  minZoom?: number | undefined;
  /** The open nodes, when the caller holds them, to keep them across a visit: see [TreeStateOptions.expanded]. */
  expanded?: ReadonlySet<string> | undefined;
  /** The open nodes a toggle, or an expand or collapse of everything, has just produced. */
  onExpandedChange?: ((expanded: ReadonlySet<string>) => void) | undefined;
  /** Where the view is going, after a fit, a zoom or a pan: see [CanvasProps.onViewChange]. */
  onViewChange?: ((view: CanvasView, viewport: CanvasSize) => void) | undefined;
  /**
   * Fits the whole chart again whenever this value changes, once the layout it
   * asks for is placed: a branch opened, the arrangement switched, a filter
   * chosen. A reader's own zoom or pan holds until it next changes.
   */
  fitKey?: string | number | undefined;
  /** The view to open on instead of the fit: see [CanvasProps.initialView]. */
  initialView?: CanvasView | undefined;
  /** A resize refits a view still at its fit: see [CanvasProps.refitOnResize]. */
  refitOnResize?: boolean | undefined;
  ref?: Ref<TreeCanvasHandle> | undefined;
  className?: string | undefined;
}

export function TreeCanvas({
  label,
  nodes,
  cards,
  cardOf,
  renderCard,
  renderUnder,
  cardTone,
  appearance = 'card',
  ranks,
  connector = 'elbow',
  groups,
  onNodeKey,
  onNodeKeyDown,
  hasNodeMenu,
  selectedId = null,
  onSelect,
  anchorNode = null,
  overlay,
  controlsPlacement,
  controlsExtra,
  controlsBelow,
  controlsStart,
  overlayEnd,
  hint,
  dimmed = false,
  ground,
  composing = null,
  labels,
  minZoom,
  expanded: held,
  onExpandedChange,
  onViewChange,
  fitKey,
  initialView,
  refitOnResize,
  cardDimmed,
  ref,
  className,
}: TreeCanvasProps) {
  const tree = useTreeState(nodes, selectedId, { expanded: held, onExpandedChange });
  const { model, expanded, active, setActive, toggle } = tree;
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // ---- the node being composed ----------------------------------------------
  /*
   * Read as two strings: the caller rebuilds the object every render, and a
   * changed ghost identity would rebuild the memoised card forest and layout.
   */
  const composeId = composing?.id ?? null;
  const composeParent = composing?.parent ?? null;
  /** The ghost the chart has eased onto, until the composition ends. */
  const eased = useRef<string | null>(null);
  /** The node focus goes back to when it does. */
  const returnTo = useRef<string | null>(null);
  /** Set while a composition holds a view the canvas has been asked to remember. */
  const remembered = useRef(false);
  /**
   * Set from the commit a composition ends on until the layout that places
   * what it left, which is where the view is given back. A focus asked for in
   * between waits for it, so its reveal starts from the view given back.
   */
  const restoring = useRef(false);
  /** Set when the ghost has been eased onto and the form has yet to be focused. */
  const takeFocus = useRef(false);
  const composeEl = useRef<HTMLDivElement | null>(null);

  // ---- measuring and layout -------------------------------------------------
  const { measure, sizes, measured } = useMeasuredSizes();
  const cardForest = useMemo(() => {
    const forest = cards(model, expanded);
    if (composeId === null || composeParent === null) return forest;
    // AFTER THE PARENT'S EXISTING CHILDREN, which is where an add puts the
    // node it makes, so the ghost stands in the place the new node will take
    // rather than in a place the chart will move it out of a moment later.
    const graft = (card: TreeCardInput): TreeCardInput =>
      card.id === composeParent
        ? { ...card, children: [...card.children, { id: composeId, children: [] }] }
        : { ...card, children: card.children.map(graft) };
    return forest.map(graft);
  }, [cards, model, expanded, composeId, composeParent]);
  const cardIds = useMemo(() => {
    const out: string[] = [];
    const walk = (card: TreeCardInput) => {
      out.push(card.id);
      card.children.forEach(walk);
    };
    cardForest.forEach(walk);
    return out;
  }, [cardForest]);

  /*
   * THE GROUPS THAT ARE DRAWN RIGHT NOW: each with the members that are cards
   * this frame. A unit whose parent is closed has no card on the chart, and a
   * box round nothing is a box round the empty place where it was.
   */
  const shownGroups = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    const drawnCards = new Set(cardIds);
    return groups
      .map((group) => ({ group, members: group.memberIds.filter((id) => drawnCards.has(id)) }))
      .filter((one) => one.members.length > 0);
  }, [groups, cardIds]);

  const spacing = ranks ?? (appearance === 'node' ? 'shared' : 'per-parent');
  const previousLayout = useRef<ForestLayout | null>(null);
  const probes = useMemo(() => {
    const out = [GAP_PROBE, MARGIN_PROBE];
    if (shownGroups.length > 0) out.push(GROUP_PAD_PROBE, ...shownGroups.map(({ group }) => groupHeadKey(group.id)));
    return out;
  }, [shownGroups]);
  // Whether the layout is the one for the cards this render asks for, rather than the last one held.
  const placed = measured([...cardIds, ...probes]);
  const layout = useMemo(() => {
    if (!measured([...cardIds, ...probes])) return previousLayout.current;
    const size = (id: string) => sizes.get(id)!;
    const gap = size(GAP_PROBE);
    const pad = shownGroups.length > 0 ? size(GROUP_PAD_PROBE) : null;
    const boxes: LayoutGroup[] = shownGroups.map(({ group, members }) => ({
      id: group.id,
      members,
      inset: { x: pad!.width, top: size(groupHeadKey(group.id)).height, bottom: pad!.height },
    }));
    const toLayout = (card: TreeCardInput): LayoutNode => ({
      id: card.id,
      width: size(card.id).width,
      height: size(card.id).height,
      children: card.children.map(toLayout),
    });
    return layoutForest(cardForest.map(toLayout), {
      gapX: gap.width,
      gapY: gap.height,
      ranks: spacing,
      margin: size(MARGIN_PROBE).width,
      groups: boxes,
    });
  }, [cardForest, cardIds, measured, sizes, spacing, shownGroups, probes]);
  previousLayout.current = layout;

  // What is drawn this frame (on its way to the layout during a relayout), and
  // which cards have arrived; the anchor and every reveal work on the target.
  const still = useStillness();
  const drawn = useReflow(layout, still) ?? layout;
  const arrived = useEntrance(layout, still);

  const positions = useMemo(
    () =>
      layout ? new Map<string, CanvasPoint>(layout.nodes.map((one) => [one.id, { x: one.x, y: one.y }])) : null,
    [layout],
  );

  const canvas = useRef<CanvasHandle>(null);

  /* THE ZOOM IS WRITTEN ON THE ROOT, not rendered, so a pan or a zoom costs no
     render of the chart: it keeps a branch's add mark a full target at any zoom. */
  const root = useRef<HTMLDivElement>(null);
  const viewChanged = useCallback(
    (view: CanvasView, viewport: CanvasSize) => {
      const el = root.current;
      if (el) {
        el.style.setProperty('--crewlet-tree-canvas-zoom', String(view.k));
        el.toggleAttribute('data-zoomed-out', view.k < TREE_ADD_MARK_MIN_ZOOM);
      }
      onViewChange?.(view, viewport);
    },
    [onViewChange],
  );
  const shownPositions = useRef<ReadonlyMap<string, CanvasPoint> | null>(null);
  // The node acted on (`anchorNode`, else the focused node) stays where it
  // was; a node new to this relayout keeps its nearest ancestor's card still.
  const anchorId = useMemo(() => {
    const was = shownPositions.current;
    if (!was) return null;
    for (const candidate of [anchorNode, active]) {
      if (!candidate || !model.parent.has(candidate)) continue;
      for (const id of [candidate, ...treeAncestors(model, candidate).reverse()]) {
        const card = cardOf(id);
        if (was.has(card)) return card;
      }
    }
    return null;
  }, [anchorNode, active, model, cardOf]);
  useLayoutAnchor(positions, anchorId, (before, after) => canvas.current?.anchor(before, after));
  useLayoutEffect(() => {
    shownPositions.current = positions;
  }, [positions]);

  /*
   * The view a composition left is given back on the layout that places what
   * it left (an add's new card is measured a frame later), and before the fit
   * key and focus effects, so those act from the view given back.
   */
  useLayoutEffect(() => {
    if (composeId !== null) {
      // A new composition before the last one's view came back: it is still
      // remembered, and this one gives it back when it ends.
      restoring.current = false;
      return;
    }
    if (remembered.current) {
      remembered.current = false;
      restoring.current = true;
    }
    if (!restoring.current || !placed || !layout) return;
    restoring.current = false;
    canvas.current?.restoreView();
  }, [composeId, placed, layout]);

  /* A NEW FIT KEY FITS AGAIN once the layout it asks for is placed, after the
     anchor above. The first placement is the canvas's own fit, or its initial view. */
  const fittedFor = useRef(fitKey);
  const placedOnce = useRef(false);
  useLayoutEffect(() => {
    if (!placed || !layout) return;
    if (!placedOnce.current) {
      placedOnce.current = true;
      fittedFor.current = fitKey;
      return;
    }
    if (fitKey === fittedFor.current) return;
    fittedFor.current = fitKey;
    canvas.current?.fit();
  }, [fitKey, layout, placed]);

  // ---- focus -----------------------------------------------------------------
  const items = useRef(new Map<string, HTMLElement>());
  const itemRefs = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const refFor = (id: string) => {
    let callback = itemRefs.current.get(id);
    if (!callback) {
      callback = (el) => {
        if (el) items.current.set(id, el);
        else if (items.current.get(id)?.isConnected === false) items.current.delete(id);
      };
      itemRefs.current.set(id, callback);
    }
    return callback;
  };

  /*
   * A focus not carried out yet, and how a node it lands on wholly outside the
   * view is brought in: to the nearest edge for a step of the tree's own keys,
   * to the middle for a caller sending the reader there ([TreeCanvasHandle]).
   */
  const pendingFocus = useRef<{ id: string; outside: 'edge' | 'centre' } | null>(null);
  const focusNow = useCallback(
    (id: string, outside: 'edge' | 'centre'): boolean => {
      const el = items.current.get(id);
      const placed = layout?.byId.get(cardOf(id));
      /*
       * Not until the card is drawn: a card new to the chart is drawn hidden
       * until `drawn` catches up, and `focus()` inside a hidden element moves
       * nothing.
       */
      if (!el || !el.isConnected || !placed || !drawn?.byId.has(cardOf(id))) return false;
      el.focus({ preventScroll: true });
      // A row's rectangle is the card's, moved down to the row: `offsetTop` is
      // a layout value, unaffected by the canvas's transform.
      const card = el.closest<HTMLElement>('.crewlet-tree-canvas__card');
      const top = card ? offsetWithin(el, card) : 0;
      const rect: CanvasRect = {
        x: placed.x,
        y: placed.y + top,
        width: placed.width,
        height: el.offsetHeight > 0 && top > 0 ? el.offsetHeight : placed.height,
      };
      canvas.current?.reveal(rect, outside);
      return true;
    },
    [layout, drawn, cardOf],
  );

  const focusNode = useCallback(
    (id: string, outside: 'edge' | 'centre' = 'edge') => {
      if (!model.parent.has(id)) return;
      const opened = tree.open(id);
      setActive(id);
      if (opened || restoring.current || !focusNow(id, outside)) pendingFocus.current = { id, outside };
    },
    [model, tree, setActive, focusNow],
  );

  // A node that was not on screen yet (inside a card just opened, or a card
  // not measured yet) takes focus as soon as it is laid out, and once the view
  // a composition left has been given back.
  useLayoutEffect(() => {
    const want = pendingFocus.current;
    if (want !== null && !restoring.current && focusNow(want.id, want.outside)) pendingFocus.current = null;
  });

  // Read through a ref, so the handle itself is stable: a caller that keeps it
  // in state would otherwise be re-rendered by every layout this view runs.
  const focusRef = useRef(focusNode);
  focusRef.current = focusNode;
  // The LAYOUT a region is read from, through a ref for the same reason: the
  // handle is stable for the view's lifetime and the layout is not.
  const placedRef = useRef(layout);
  placedRef.current = layout;
  const cardOfRef = useRef(cardOf);
  cardOfRef.current = cardOf;
  const { expandAll, collapseAll } = tree;
  useImperativeHandle(
    ref,
    () => ({
      // A CALLER SENDS THE READER SOMEWHERE: see [TreeCanvasHandle.focusNode].
      focusNode: (id: string) => focusRef.current(id, 'centre'),
      expandAll,
      collapseAll,
      focusRegion: (id: string) => {
        const placed = placedRef.current?.byId.get(cardOfRef.current(id));
        if (placed) canvas.current?.focusRegion(placed);
      },
      restoreView: () => canvas.current?.restoreView(),
    }),
    [expandAll, collapseAll],
  );

  // ---- what the chart does about a node being composed -----------------------
  /*
   * A ghost under a closed parent opens it once per composition, so a reader
   * who closes it again is not overruled; the state is read through a ref so
   * the effect does not rerun on it.
   */
  const treeNow = useRef({ model, expanded, toggle, open: tree.open });
  treeNow.current = { model, expanded, toggle, open: tree.open };
  useLayoutEffect(() => {
    if (composeParent === null) return;
    const { model: shown, expanded: shows, toggle: flip, open: reveal } = treeNow.current;
    reveal(composeParent);
    if (treeExpandable(shown, composeParent) && !shows.has(composeParent)) flip(composeParent);
  }, [composeParent]);

  const composeRef = useCallback(
    (el: HTMLDivElement | null) => {
      composeEl.current = el;
      if (composeId !== null) measure(composeId)(el);
    },
    [measure, composeId],
  );

  /*
   * The ease waits for the ghost to be placed (measured a frame after it is
   * added), and runs once per composition (`eased`), so a later layout never
   * snaps back a chart the reader has panned.
   */
  const placedCards = layout?.byId;
  useLayoutEffect(() => {
    const was = eased.current;
    if (composeId !== null) {
      /*
       * Remembered on the composition's first commit, before the ghost widens
       * the chart and the canvas shifts the view to keep its content reachable.
       */
      canvas.current?.rememberView();
      remembered.current = true;
      /*
       * The form is wanted from the moment the composition opens, so the
       * effect below alone decides when focus lands, in every ordering.
       */
      takeFocus.current = takeFocus.current || eased.current !== composeId;
      const box = placedCards?.get(composeId);
      if (!box || was === composeId) return;
      eased.current = composeId;
      returnTo.current = composeParent;
      // NEVER BLOWN UP PAST ITS OWN SIZE: the ghost holds a form, drawn at
      // the size its controls were designed at, so the ease brings the reader
      // to it rather than magnifying it.
      canvas.current?.focusRegion(box, CANVAS_COMPOSE_CONTEXT, CANVAS_FIT_MAX_ZOOM);
      /*
       * And cancels any pending focus (such as the node the add hangs from),
       * which would otherwise land a commit later and pull the reader out of
       * the form.
       */
      pendingFocus.current = null;
      return;
    }
    if (was === null) return;
    const back = returnTo.current;
    eased.current = null;
    returnTo.current = null;
    /*
     * Focus goes back at once and without a reveal (so not `focusNode`): the
     * view is given back separately, and a reveal's pan would override it.
     */
    if (back !== null) {
      setActive(back);
      items.current.get(back)?.focus({ preventScroll: true });
    }
  }, [composeId, composeParent, placedCards, setActive]);

  /*
   * The form takes focus once laid out: an unplaced card is drawn hidden and
   * `focus()` inside it does nothing, so this effect has no dependency array
   * and retries after every layout; a form holding focus is left alone.
   */
  useLayoutEffect(() => {
    if (!takeFocus.current) return;
    const ghost = composeEl.current;
    if (!ghost) {
      takeFocus.current = false;
      return;
    }
    /*
     * The first control in the box, or the ghost itself: a form's `autoFocus`
     * fired while the card was hidden, so a caller wanting a particular field
     * focuses it from its own effect once the form is on screen.
     */
    (focusables(ghost)[0] ?? ghost).focus({ preventScroll: true });
    /*
     * Asked again until it lands: in a browser the DOM can hold the card a
     * commit after the layout does (jsdom commits both together).
     */
    takeFocus.current = !ghost.contains(document.activeElement);
  });

  // SELECTION FOLLOWS FOCUS: the caller decides which ids it keeps.
  const select = (id: string) => onSelect?.(id);
  const moveTo = (id: string | null) => {
    if (id === null) return;
    select(id);
    focusNode(id);
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    /*
     * Escape leaves the composition from anywhere in the chart, including a
     * node behind the ghost, where the press that opened it can leave focus.
     */
    if (event.key === 'Escape' && composing !== null) {
      event.preventDefault();
      event.stopPropagation();
      composing.onCancel();
      return;
    }
    const id = target.getAttribute('data-tree-id');
    if (id === null || !model.parent.has(id)) return;
    if (onNodeKeyDown?.(id, event)) {
      event.preventDefault();
      return;
    }
    const action = treeItemAction(event);
    if (action === 'menu') {
      if (hasNodeMenu?.(id)) {
        event.preventDefault();
        setMenuFor(id);
      }
      return;
    }
    if (action !== null) {
      if (onNodeKey?.(id, action)) event.preventDefault();
      return;
    }
    const step = treeStep(tree, id, event);
    if (step === undefined) return;
    event.preventDefault();
    if (step === null) return;
    if ('toggle' in step) toggle(step.toggle);
    else moveTo(step.focus);
  }

  const cardPress = (id: string) => ({
    onMouseDown: (event: MouseEvent<HTMLElement>) => {
      // The press must not focus the button it landed on: see the module doc.
      event.preventDefault();
      select(id);
      setActive(id);
      items.current.get(id)?.focus({ preventScroll: true });
    },
  });

  /*
   * A member card is described by its group's label (the box is hidden). Ids
   * come from the chart's id and the group's position, since a group's own id
   * need not be a valid id reference.
   */
  const uid = useId();
  const headIds = useMemo(
    () => new Map(shownGroups.map(({ group }, i) => [group.id, `${uid}-group-${i}`])),
    [shownGroups, uid],
  );
  const describedBy = useMemo(() => {
    const out = new Map<string, string>();
    for (const { group, members } of shownGroups) for (const id of members) out.set(id, headIds.get(group.id)!);
    return out;
  }, [shownGroups, headIds]);

  const card: TreeCardContext = {
    item: (id) => ({
      role: 'treeitem',
      tabIndex: id === active ? 0 : -1,
      'aria-level': treeLevel(model, id),
      'aria-setsize': treeSetSize(model, id),
      'aria-posinset': treePosInSet(model, id),
      'aria-expanded': treeExpandable(model, id) ? expanded.has(id) : undefined,
      'aria-selected': id === selectedId,
      'aria-describedby': describedBy.get(id),
      'data-tree-id': id,
      ref: refFor(id),
      onClick: (event) => {
        select(id);
        setActive(id);
        (event.currentTarget as HTMLElement).focus({ preventScroll: true });
      },
      onDoubleClick: () => onNodeKey?.(id, 'activate'),
    }),
    expanded: (id) => expanded.has(id),
    expandable: (id) => treeExpandable(model, id),
    toggle,
    activate: (id) => setActive(id),
    actions: (id) => ({
      className: 'crewlet-tree-canvas__actions',
      'aria-hidden': 'true',
      'data-menu-open': menuFor === id ? 'true' : undefined,
      ...cardPress(id),
    }),
    press: cardPress,
    menuOpen: (id) => menuFor === id,
    setMenuOpen: (id, open) => {
      if (open) setActive(id);
      setMenuFor((was) => (open ? id : was === id ? null : was));
    },
  };

  const links = useMemo(() => (drawn ? layoutConnectors(drawn, connector) : []), [drawn, connector]);

  /*
   * The zoom ceiling comes from the widest real card: the ghost holds a form,
   * is wider than any node and stays only for one add.
   */
  const widestCard = useMemo(() => {
    let widest = 0;
    for (const one of layout?.nodes ?? []) {
      if (one.id !== composeId) widest = Math.max(widest, one.width);
    }
    return widest > 0 ? widest : undefined;
  }, [layout, composeId]);

  return (
    <div
      ref={root}
      className={cx(
        'crewlet-tree-canvas',
        appearance === 'node' && 'crewlet-tree-canvas--node',
        className,
      )}
    >
      <Canvas
        label={label}
        content={layout?.bounds ?? null}
        ref={canvas}
        overlay={overlay}
        /*
         * `node` charts keep their controls top right, where a chart's toolbar
         * sits; a chart of panels keeps the canvas's own default.
         */
        controlsPlacement={controlsPlacement ?? (appearance === 'node' ? 'top-right' : undefined)}
        controlsExtra={controlsExtra}
        controlsBelow={controlsBelow}
        controlsStart={controlsStart}
        overlayEnd={overlayEnd}
        hint={hint}
        dimmed={dimmed}
        ground={ground}
        /*
         * HOW FAR IN THE ZOOM GOES is the widest card: a reader pressing Zoom
         * in is asking to look at ONE node, and this component is the only
         * thing that knows how wide one is, because it measured them.
         */
        largestItemWidth={widestCard}
        labels={labels}
        minZoom={minZoom}
        onViewChange={viewChanged}
        initialView={initialView}
        refitOnResize={refitOnResize}
      >
        <div className="crewlet-tree-canvas__gap" ref={measure(GAP_PROBE)} aria-hidden="true" />
        <div className="crewlet-tree-canvas__margin" ref={measure(MARGIN_PROBE)} aria-hidden="true" />
        {shownGroups.length > 0 && (
          <div className="crewlet-tree-canvas__group-pad" ref={measure(GROUP_PAD_PROBE)} aria-hidden="true" />
        )}
        {/* THE BOXES ARE UNDER EVERYTHING, the branches included: a branch
            leaving a member's parent runs over the box it drops into. */}
        {shownGroups.map(({ group, members }) => {
          const placed = drawn?.groups?.find((one) => one.id === group.id);
          return (
            <div
              key={group.id}
              className="crewlet-tree-canvas__group"
              aria-hidden="true"
              data-group-id={group.id}
              data-enter={enterOf(members, arrived)}
              style={placedStyle(placed, true)}
            />
          );
        })}
        {drawn && (
          <svg
            className="crewlet-tree-canvas__links"
            width={drawn.bounds.width}
            height={drawn.bounds.height}
            aria-hidden="true"
          >
            {/* A BRANCH ARRIVES WITH THE CARD IT ARRIVES AT, and not before:
                a line reaching a card that is not drawn yet is a chart with
                loose ends while it is coming in. */}
            {links.map((link) => (
              <path
                key={link.id}
                d={link.d}
                data-tone={link.id === composeId ? undefined : cardTone?.(link.id)}
                // The branch into the ghost is dashed and drawn in before the
                // card, from the same path arithmetic as every other branch.
                data-composing={link.id === composeId ? 'true' : undefined}
                data-enter={
                  arrived === null ? undefined : arrived.has(link.id) ? 'shown' : 'waiting'
                }
              />
            ))}
          </svg>
        )}
        {/* Labels sit over the branches and under the cards, so a branch
            passes behind the words; each also measures the room above its
            members. */}
        {shownGroups.map(({ group, members }) => {
          const placed = drawn?.groups?.find((one) => one.id === group.id);
          return (
            <div
              key={group.id}
              id={headIds.get(group.id)}
              ref={measure(groupHeadKey(group.id))}
              className="crewlet-tree-canvas__group-head"
              aria-hidden="true"
              data-enter={enterOf(members, arrived)}
              style={placedStyle(placed, false)}
            >
              {/* The space is real, so a member's description reads "ENG
                  Engineering · Core"; a flex row draws no whitespace node. */}
              {group.lead === undefined || group.lead === null ? null : (
                <>
                  <span className="crewlet-tree-canvas__group-lead">{group.lead}</span>{' '}
                </>
              )}
              <span className="crewlet-tree-canvas__group-label">{group.label}</span>
            </div>
          );
        })}
        {/* The tree itself takes no tab stop: the ITEMS carry the roving one,
            as the tree pattern asks, and the container only listens so one
            handler serves every item. */}
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- see above */}
        <div role="tree" aria-label={label} className="crewlet-tree-canvas__tree" onKeyDown={onKeyDown}>
          {cardIds
            .filter((id) => id !== composeId)
            .map((id) => {
              const placed = drawn?.byId.get(id);
              return (
                <div
                  key={id}
                  role="none"
                  ref={measure(id)}
                  className="crewlet-tree-canvas__card"
                  data-tone={cardTone?.(id)}
                  data-dimmed={cardDimmed?.(id) ? '' : undefined}
                  // A CARD WAITING ITS TURN IS STILL MEASURED, so it is drawn at
                  // zero rather than removed from the flow: the layout the
                  // entrance is played over is the layout the chart ends at.
                  data-enter={arrived === null ? undefined : arrived.has(id) ? 'shown' : 'waiting'}
                  style={
                    placed
                      ? { transform: `translate(${placed.x}px, ${placed.y}px)` }
                      : { visibility: 'hidden' }
                  }
                >
                  {renderCard(id, card)}
                  {renderUnder ? <UnderSlot id={id} card={card} render={renderUnder} /> : null}
                </div>
              );
            })}
        </div>
        {/*
          Outside the tree, in the same world: a `tree` may hold only items, so
          the ghost's form is a sibling placed by the same layout and transform.
        */}
        {composing !== null && (
          /* The region catches Escape from every field; it is not a control.
             Its -1 lets focus be put on it before the form draws a control. */
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
          <div
            ref={composeRef}
            // A REGION WITH A NAME, and one focus can be put on before the
            // form inside it has drawn a control: the caller's first field
            // takes it where there is one, and this where there is not.
            role="group"
            aria-label={composing.label}
            tabIndex={-1}
            className="crewlet-tree-canvas__card crewlet-tree-canvas__card--composing"
            data-composing="true"
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              // Stopped here rather than let through: the canvas under it
              // takes keys of its own, and Escape in a form means this form.
              event.stopPropagation();
              composing.onCancel();
            }}
            /*
             * Drawn where the chart draws this frame, and at its target as
             * soon as the layout has one: a new card is not tweened, and a
             * hidden ghost would drop the form's focus.
             */
            style={(() => {
              const placed =
                composeId === null
                  ? undefined
                  : (drawn?.byId.get(composeId) ?? placedCards?.get(composeId));
              return placed
                ? { transform: `translate(${placed.x}px, ${placed.y}px)` }
                : { visibility: 'hidden' as const };
            })()}
          >
            {composing.render()}
          </div>
        )}
      </Canvas>
    </div>
  );
}

/**
 * What hangs under a card, in the strip measured with it. A component so a
 * card whose caller returns nothing draws and reserves no strip.
 */
function UnderSlot({
  id,
  card,
  render,
}: {
  id: string;
  card: TreeCardContext;
  render: (id: string, card: TreeCardContext) => ReactNode;
}) {
  const content = render(id, card);
  if (content === null || content === undefined || content === false) return null;
  return (
    <div className="crewlet-tree-canvas__under" aria-hidden="true" {...card.press(id)}>
      {content}
    </div>
  );
}

/**
 * Whether a group has arrived: with its first member, since a box round cards
 * that are not drawn yet is a frame round nothing.
 */
function enterOf(members: readonly string[], arrived: ReadonlySet<string> | null): 'shown' | 'waiting' | undefined {
  if (arrived === null) return undefined;
  return members.some((id) => arrived.has(id)) ? 'shown' : 'waiting';
}

/**
 * Where a group's box or header is drawn: at the box's corner, the box as
 * large as the layout made it and the header as wide. Unplaced, it is drawn
 * hidden, as a card is, and still measured.
 */
function placedStyle(placed: CanvasRect | undefined, box: boolean): CSSProperties {
  if (!placed) return { visibility: 'hidden' };
  return {
    transform: `translate(${placed.x}px, ${placed.y}px)`,
    width: `${placed.width}px`,
    ...(box ? { height: `${placed.height}px` } : {}),
  };
}

/** How far down `el` sits inside `container`, in layout pixels. */
function offsetWithin(el: HTMLElement, container: HTMLElement): number {
  let top = 0;
  for (let at: HTMLElement | null = el; at && at !== container; at = at.offsetParent as HTMLElement | null) {
    top += at.offsetTop;
  }
  return top;
}
