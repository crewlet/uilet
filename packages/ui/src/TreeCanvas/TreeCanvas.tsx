/**
 * A hierarchy drawn as cards on a canvas, with the ARIA tree pattern over it.
 *
 * WHAT IT OWNS AND WHAT IT DOES NOT. It owns the layout, the connectors, the
 * keyboard pattern, focus and the per node menu state. It draws no card: the
 * caller renders each one and is handed the props that make an element a
 * treeitem, so a card can be anything from a name to a stack of rows without
 * this component knowing what a seat, a unit or a company is.
 *
 * THE KEYBOARD PATTERN IS A TREE, AND ITS ITEMS HOLD NOTHING FOCUSABLE. Each
 * card's header and each row inside a card is a `treeitem` with its level,
 * position and expansion, and focus moves among them by a roving tab stop:
 * arrows walk the visible order, Right and Left open, close and climb, Home
 * and End jump, and typing finds a node by name. A treeitem's own keys act on
 * it: Enter activates, Delete or Backspace removes, the ContextMenu key or
 * Shift+F10 opens its menu. The buttons a pointer uses (expand, add, more)
 * sit BESIDE the treeitem in a strip hidden from assistive technology and out
 * of the tab order, because a control inside a treeitem is a control a screen
 * reader cannot reach and a keyboard user would Tab through by the hundred;
 * the menu they open is the same one the ContextMenu key opens. A press on
 * that strip never leaves focus in it: the treeitem takes the focus, so what
 * holds it is always a node a screen reader can announce and the arrows can
 * move from. `ctx.actions` is what a caller spreads on such a strip.
 *
 * THE POINTER'S CONTROLS ARE QUIET UNTIL THE CARD IS REACHED, and that is why
 * they are the component's to place rather than the caller's. The actions strip
 * is drawn OVER the end of the card and the add control hangs UNDER it
 * (`renderUnder`), both appearing on hover, on focus and on the selected card;
 * so a name has the card's whole width rather than the half left beside three
 * buttons nobody is pointing at, and the chart at rest is cards and connectors
 * rather than a field of chrome. The room each takes is reserved whether or not
 * it is drawn, because a chart that grew under the pointer would move the card
 * somebody was aiming at out from under them.
 *
 * FOCUS NEVER SCROLLS BEHIND THE TRANSFORM'S BACK. A node is focused with
 * `preventScroll` and then revealed by panning the canvas, and a node inside a
 * collapsed card has its ancestors opened first. The caller decides which node
 * is focused after an operation, an undo or a redo, through the handle.
 *
 * THE LAYOUT IS MEASURED. Every card is rendered at the card width variable
 * and measured, the gaps between cards and the space around the whole chart
 * are read from probes drawn with spacing tokens (so density scales them with
 * everything else), and the layout places them: under each parent, or on a
 * band per depth, which is what an org chart is and what the `node`
 * appearance takes (`ranks`). A relayout keeps the node the operator acted on
 * still on screen. Nothing else is an input to the layout: a badge whose text
 * changes inside a slot that keeps its size lays nothing out again.
 *
 * AND IT MOVES. A chart arrives rank by rank rather than all at once, and a
 * relayout TWEENS every card from where it was to where it is, connectors and
 * all, so adding a seat is visibly the same chart rearranging rather than a
 * new one. Both are `motion.ts`, both are off under `prefers-reduced-motion`,
 * and neither changes what is drawn in the end or what any of it is called.
 *
 * A NODE IS ADDED IN THE CHART, NOT IN A DIALOG OVER IT. `composing` names a
 * GHOST: a card the layout knows about and the data does not, drawn where the
 * new node will be, holding the form that makes it. The chart makes room for
 * it, draws the branch into it, eases onto it and gives the reader their view
 * back when it goes. It is in `cards` and NOT in `nodes`, which is the whole
 * of why the tree is untouched by it: no level, no position, no set size and
 * no key of any real node moves, and no arrow key, type ahead or selection can
 * land on something that is not there yet. See [TreeComposing].
 *
 * Ported from the engine dashboard's org builder canvas, with the generic half
 * of its suite.
 */

import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  CANVAS_COMPOSE_CONTEXT,
  CANVAS_FIT_MAX_ZOOM,
  Canvas,
  type CanvasHandle,
  type CanvasLabels,
  type CanvasRect,
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
import type { CanvasPoint } from '../Canvas/geometry.js';

/** A card of the layout: its id and the cards nested under it. */
export interface TreeCardInput {
  id: string;
  children: TreeCardInput[];
}

/**
 * The six hues a card can be tinted with, and the connector arriving at it.
 *
 * DECORATIVE AND PER ENTITY, never a series: two cards sharing a hue say
 * nothing, so the palette is not measured for separability and the chart owes
 * no legend (`--color-node-*` in the tokens package says the same). It is what
 * an operator picks for one agent so they can find it again, and what a chart
 * with no such choice derives from a stable identity.
 *
 * A NAMED SET RATHER THAN A COLOUR. A caller that could hand in any colour
 * would hand in a literal, and the fill, the border, the halo and the ink of a
 * tinted card are four measured steps of one hue rather than one value with
 * three alphas applied by whoever drew it last.
 */
export type TreeCardTone = 'purple' | 'cyan' | 'green' | 'amber' | 'rose' | 'blue';

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
   * The whole of a node's pointer-only strip of controls: its class, its
   * removal from the accessibility tree and the press that lands on the node.
   * Spread it on the element holding the expand, add and more buttons, and put
   * that element IMMEDIATELY AFTER the node's own treeitem.
   *
   * WHY THE COMPONENT OWNS IT. The strip is drawn OVER the end of the card and
   * is quiet until the card is reached, so the node's name has the card's whole
   * width to say itself in rather than the half left over beside three buttons
   * nobody is pointing at. Where it sits, when it appears and what covers what
   * are the chart's decisions, not the caller's: left to the caller the strip
   * was a permanent column and every name in the chart was truncated to fit
   * beside it. The immediate-sibling rule is what the reveal is keyed on, which
   * is why it is stated here and not merely implied.
   *
   * `press` is the same landing behaviour on its own, for a pointer-only region
   * that is NOT this strip (a chip drawn along a card's bottom edge, say).
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
 * What a screen can ask of a tree drawn on a CANVAS: everything a tree view
 * answers, and the two things only a view with a viewport under it can.
 *
 * Separate from [TreeViewHandle] rather than added to it, because the other
 * view of one hierarchy is a grid of rows with no viewport to move: a handle
 * that promised these there would be a promise kept by doing nothing.
 */
export interface TreeCanvasHandle extends TreeViewHandle {
  /**
   * Ease onto one node's own card, remembering the view it left.
   *
   * For a surface opened ABOUT that node: the view moves to it with room
   * around it, so the decision being made has the part of the chart it is
   * about behind it. A node whose card has not been laid out yet is ignored.
   */
  focusRegion(id: string): void;
  /** Give back the view [focusRegion] left. */
  restoreView(): void;
}

/**
 * A node being COMPOSED: the ghost card a new node's form is drawn in, before
 * there is a node to draw.
 *
 * THE PHANTOM IS THE LAYOUT'S AND NOT THE DATA'S. A chart that asked for a
 * child's name in a dialog over itself said nothing about WHERE that child
 * would go, which is the one thing a chart is for. So the card is grafted into
 * the CARD forest, under `parent` and after its existing children, exactly
 * where the new node will land; `nodes` is untouched, and that is what keeps
 * every real node's level, position in set, set size and key the same while a
 * node is being composed. A screen reader is never told a unit has seven
 * children while six exist. Nothing focusable by the tree's own keys is in it,
 * either: the arrows, type ahead and the selection walk `nodes`, so they walk
 * past a ghost that is not in them.
 *
 * IT IS DRAWN OUTSIDE THE TREE ELEMENT for the same reason. A form is not a
 * `treeitem` and a `tree` may hold nothing else, so the ghost is a sibling of
 * the tree in the same transformed world: the layout places it, and what is
 * inside it is an ordinary region of the page that a screen reader reads and
 * Tab walks.
 *
 * WHAT THE CHART DOES ABOUT IT. It opens `parent` if it is closed, eases onto
 * the ghost with the room a form needs rather than the room a label needs
 * ([CANVAS_COMPOSE_CONTEXT]), moves focus to the first control inside it, and
 * on Escape calls `onCancel`. When it goes, the view the reader left is given
 * back and focus returns to `parent`. Under `prefers-reduced-motion` every
 * part of that still happens; only the animations do not.
 */
export interface TreeComposing {
  /**
   * The ghost card's own id.
   *
   * IT MUST NOT BE AN ID OF `nodes`. A ghost in the node forest is a node, and
   * then everything this arrangement exists to avoid is back: a set size that
   * counts it, an arrow key that lands on it and a selection that can hold it.
   */
  id: string;
  /** The card it hangs under, which is the node the new one is being added to. */
  parent: string;
  /**
   * The accessible name of the ghost, such as "Add to Engineering".
   *
   * THE GHOST IS A NAMED REGION rather than an anonymous box with a form in
   * it, because focus is moved into it: a reader who arrives at a field with
   * nothing around it has been told what to type and not what they are making
   * or where it is going. The name says both, and it is the only thing about
   * the ghost this component cannot work out for itself.
   */
  label: string;
  /** What is drawn inside the ghost: the form that makes the node. */
  render: () => ReactNode;
  /** Escape inside the ghost. Cancelling is the caller's: it owns the form. */
  onCancel: () => void;
}

/** The id of the probe the gaps between cards are measured from. */
const GAP_PROBE = 'crewlet:tree-canvas-gap';

/**
 * The id of the probe the space around the whole chart is measured from.
 *
 * ITS OWN PROBE rather than a number, for the reason the gaps have one: the
 * margin is a spacing token, so density scales it with everything else, and a
 * constant in TypeScript could not. It is a LAYOUT value and not padding on
 * the scroller, because the canvas clips: drawn as padding, the outermost
 * card's halo, its focus ring and the control under it are cut off at the
 * frame exactly when a reader has panned to that card.
 */
const MARGIN_PROBE = 'crewlet:tree-canvas-margin';

export interface TreeCanvasProps {
  /** The accessible name of the chart, such as "Structure chart". */
  label: string;
  /**
   * The hierarchy as the tree pattern reads it: every node, nested.
   *
   * Keep it stable across renders (a `useMemo` over what it is derived from).
   * A fresh array each render rebuilds the model, and with it the visible
   * order and the layout, on every push a parent takes.
   */
  nodes: readonly TreeInput[];
  /**
   * Which CARDS the layout draws, and how they nest. A node drawn as a row
   * inside another node's card is not a card of its own, so this is not always
   * the node forest: it is asked again whenever the model or the expansion
   * changes, and is given both.
   *
   * Keep it stable too, for the reason `nodes` is: it is asked again whenever
   * it changes identity, and the tidy layout it feeds is the most expensive
   * thing this component does.
   */
  cards: (model: TreeModel, expanded: ReadonlySet<string>) => TreeCardInput[];
  /** The card a node is drawn in: itself, or the card holding its row. Stable, as `cards` is. */
  cardOf: (id: string) => string;
  /** Draws one card. Everything it needs from the tree is the second argument. */
  renderCard: (id: string, card: TreeCardContext) => ReactNode;
  /**
   * What hangs UNDER a card, on the branch its children come off: the control
   * that adds one, normally. Return nothing for a card that takes none.
   *
   * IT IS A SLOT RATHER THAN SOMETHING THE CALLER DRAWS ITSELF because of where
   * it has to be. A control below the card is below the card's MEASURED bottom,
   * which is where the layout puts the next rank and where the connectors
   * start, so a caller drawing it itself either has it overlap its own
   * children or has to tell the layout a height that is not the card's. Drawn
   * here it is part of the card, so the space is reserved by the same
   * measurement that reserves the name's, and every connector already leaves
   * from below it.
   *
   * THE ROOM IS KEPT WHETHER OR NOT IT IS DRAWN. It is quiet until the card is
   * reached, like the actions strip, and a chart that grew a rank taller under
   * the pointer would move the card somebody was aiming at out from under them.
   */
  renderUnder?: ((id: string, card: TreeCardContext) => ReactNode) | undefined;
  /**
   * Whether a card is drawn with the dashed edge.
   *
   * It is the mark a card carries when it stands for somebody outside the
   * system: a person rather than an agent, a seat nobody holds. The BOUNDARY
   * says it rather than a hue, so it reads to a reader who cannot separate the
   * hue at all, and the card's frame is this component's to draw so the mark
   * is too. Unset, every card takes the solid edge.
   */
  cardOutline?: ((id: string) => boolean) | undefined;
  /**
   * The hue a card is tinted with, and the connector arriving at it.
   *
   * ONE ANSWER FOR BOTH, because they are one statement. A tinted card reached
   * by a branch in the chart's neutral ink reads as somebody else's branch
   * ending on it, and two functions would be two places for that to come
   * apart. Unset, or answered with nothing, a card is the chart's own neutral
   * surface and the branch is the chart's own ink.
   */
  cardTone?: ((id: string) => TreeCardTone | undefined) | undefined;
  /**
   * How a card is drawn.
   *
   * `card` (the default) is a panel: one width for every card in the chart, its
   * lines stacked with room around them, and the pointer's controls over its
   * top right corner. It is what a chart of a few dozen nodes reads best as.
   *
   * `node` is an org chart NODE: as wide as its own name between a fixed icon
   * zone and a fixed actions column, one rank tall, its two lines centred
   * between them, with the actions as a column down its right edge and the add
   * hanging under its bottom edge. Denser, and it is the drawing the console's
   * own org chart uses, which this package is matched to. A chart of a hundred
   * nodes fits on a screen in it; a card that has more to say than a name and a
   * caption does not belong in it.
   */
  appearance?: 'card' | 'node' | undefined;
  /**
   * Where a card's top edge sits: under its own parent (`per-parent`) or on a
   * band shared by every card of its depth (`shared`). See [LayoutRanks].
   *
   * Unset, it follows the appearance, because the two are one decision about
   * what the chart IS. A chart of panels is a hierarchy of things with
   * contents, where a short card's children riding up beside a tall
   * neighbour's is tidier; a chart of org chart NODES is an organization,
   * where a rank is a row a reader scans across and two units of one company
   * sit on one line whether or not one of them carries a lead.
   */
  ranks?: LayoutRanks | undefined;
  /**
   * The shape of the connectors: a rounded step (the default) or the single
   * cubic the console's org chart draws. See [layoutConnectors], which states
   * what each shape costs.
   */
  connector?: TreeConnectorShape | undefined;
  /**
   * Carries out Enter (activate) or Delete and Backspace (remove) on a node.
   * Return false when the node has no such action, so the key travels on.
   *
   * The Menu key is not here: which menu is open is this component's state, so
   * it opens the node's own menu itself when `hasNodeMenu` says there is one.
   */
  onNodeKey?: ((id: string, action: Exclude<TreeItemAction, 'menu'>) => boolean) | undefined;
  /**
   * Any other key the caller claims on a node, such as Alt with an arrow to
   * move it among its siblings. Asked FIRST, while the node itself holds
   * focus; return true when it was handled, and the chart swallows the key.
   *
   * The same contract the grid of rows keeps (`TreeGridProps.onRowKeyDown`),
   * because the two are two views of one hierarchy and a key that moves a node
   * in one has to move it in the other.
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
  /** A note under the canvas's controls, about a key or a state: see [CanvasProps.hint]. */
  hint?: ReactNode | undefined;
  /**
   * Pushes the chart back, for a surface opened over it about one of its
   * nodes. See [CanvasProps.dimmed]; pair it with `focusRegion` on the handle,
   * which says WHICH node the surface is about.
   */
  dimmed?: boolean | undefined;
  /**
   * A node being composed in the chart rather than in a surface over it: see
   * [TreeComposing]. Null, and the chart is the data and nothing else.
   */
  composing?: TreeComposing | null | undefined;
  /** The canvas control labels, for another language. */
  labels?: Partial<CanvasLabels> | undefined;
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
  cardOutline,
  cardTone,
  appearance = 'card',
  ranks,
  connector = 'step',
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
  hint,
  dimmed = false,
  composing = null,
  labels,
  ref,
  className,
}: TreeCanvasProps) {
  const tree = useTreeState(nodes, selectedId);
  const { model, expanded, active, setActive, toggle } = tree;
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // ---- the node being composed ----------------------------------------------
  /*
   * READ AS TWO STRINGS rather than as the object, because the object is
   * built by the caller on every render and the card forest is memoised on it:
   * the layout is the most expensive thing this component does, and a ghost
   * whose identity changed each render would rebuild it each render. What the
   * caller hands in that is NOT stable (the form, the cancel) is used where it
   * is handed in, never as a dependency.
   */
  const composeId = composing?.id ?? null;
  const composeParent = composing?.parent ?? null;
  /** The ghost the chart has eased onto, until the view has been given back. */
  const eased = useRef<string | null>(null);
  /** The node focus goes back to when it is. */
  const returnTo = useRef<string | null>(null);
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

  const spacing = ranks ?? (appearance === 'node' ? 'shared' : 'per-parent');
  const previousLayout = useRef<ForestLayout | null>(null);
  const layout = useMemo(() => {
    if (!measured([...cardIds, GAP_PROBE, MARGIN_PROBE])) return previousLayout.current;
    const size = (id: string) => sizes.get(id)!;
    const gap = size(GAP_PROBE);
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
    });
  }, [cardForest, cardIds, measured, sizes, spacing]);
  previousLayout.current = layout;

  // WHAT IS DRAWN THIS FRAME, which during a relayout is on its way to the
  // layout above rather than at it, and which cards have arrived at all. The
  // canvas's anchor and everything that reveals a node work on the TARGET,
  // because where a node is going is where a reader is being taken.
  const still = useStillness();
  const drawn = useReflow(layout, still) ?? layout;
  const arrived = useEntrance(layout, still);

  const positions = useMemo(
    () =>
      layout ? new Map<string, CanvasPoint>(layout.nodes.map((one) => [one.id, { x: one.x, y: one.y }])) : null,
    [layout],
  );

  const canvas = useRef<CanvasHandle>(null);
  const shownPositions = useRef<ReadonlyMap<string, CanvasPoint> | null>(null);
  // THE NODE THE OPERATOR ACTED ON stays where it was: the node named by
  // `anchorNode`, else the node with focus. A node that did not exist before
  // the relayout (one just added) has no position to keep, so its nearest
  // ancestor's card is kept still instead.
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

  const pendingFocus = useRef<string | null>(null);
  const focusNow = useCallback(
    (id: string): boolean => {
      const el = items.current.get(id);
      const placed = layout?.byId.get(cardOf(id));
      if (!el || !el.isConnected || !placed) return false;
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
      canvas.current?.reveal(rect);
      return true;
    },
    [layout, cardOf],
  );

  const focusNode = useCallback(
    (id: string) => {
      if (!model.parent.has(id)) return;
      const opened = tree.open(id);
      setActive(id);
      if (opened || !focusNow(id)) pendingFocus.current = id;
    },
    [model, tree, setActive, focusNow],
  );

  // A node that was not on screen yet (inside a card just opened, or a card
  // not measured yet) takes focus as soon as it is laid out.
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id !== null && focusNow(id)) pendingFocus.current = null;
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
      focusNode: (id: string) => focusRef.current(id),
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
   * A GHOST UNDER A CLOSED PARENT IS A GHOST NOBODY CAN SEE. Opening the
   * parent is the chart's to do, and it is done ONCE per composition rather
   * than on every render: a reader who closes the parent while composing has
   * closed it, and an effect that re-opened it would be arguing with them.
   * The state it reads is read through a ref for exactly that: naming it as a
   * dependency is what would make the effect run again on every change to it.
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
   * THE EASE WAITS FOR THE GHOST TO BE PLACED. A card that has not been
   * measured has no rectangle to ease onto, and the measurement is a frame
   * away from the render that added it, so this runs on the layout rather than
   * on the prop. `eased` is what stops it running again on every later layout:
   * a chart the reader has since panned must not snap back because a card
   * somewhere else was measured again.
   */
  const placedCards = layout?.byId;
  useLayoutEffect(() => {
    const was = eased.current;
    if (composeId !== null) {
      /*
       * THE VIEW IS REMEMBERED ON THE FIRST COMMIT OF THE COMPOSITION, before
       * the ghost has been measured and so before it has changed the content
       * at all. A ghost widens the chart, and a canvas answers content that
       * changed shape by keeping what it holds reachable: waited for, the view
       * "the reader left" was already the one that move had produced, and an
       * add that was cancelled put the reader back 198px sideways from where
       * they had been (measured on the engine's own builder).
       */
      canvas.current?.rememberView();
      /*
       * THE FORM IS WANTED FROM THE MOMENT THE COMPOSITION OPENS, which is
       * before the ghost has been measured and so before it can be focused at
       * all. Asking here rather than once the card is placed is what makes the
       * effect below the only thing deciding WHEN it lands, in every ordering:
       * gated on placement, the request was made on a commit where it always
       * happened to succeed in jsdom and never did in a browser.
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
       * AND NOTHING ELSE IS STILL TRYING TO TAKE IT. A focus the chart could
       * not carry out yet is retried on EVERY commit until it lands (a node
       * inside a card the measurement pass had not reached), and the press
       * that opens a composition asks for one: the node the add hangs from.
       * Left pending, it landed one commit after the form had been focused
       * and took the reader back out of it. Opening a composition is a
       * deliberate move INTO the form, so it cancels what was pending.
       */
      pendingFocus.current = null;
      return;
    }
    if (was === null) return;
    const back = returnTo.current;
    eased.current = null;
    returnTo.current = null;
    canvas.current?.restoreView();
    /*
     * FOCUS GOES BACK WITHOUT A REVEAL, which is why this is not `focusNode`.
     * Focusing a node also pans the chart the least distance that brings it
     * into view, and that is exactly the wrong thing one line after the view
     * the reader left has been given back: on a chart wider than its pane the
     * reveal won, and the reader was put somewhere they had never been. The
     * restored view is the one they were standing on, so whatever they were
     * looking at is already on screen.
     */
    if (back !== null) {
      setActive(back);
      items.current.get(back)?.focus({ preventScroll: true });
    }
  }, [composeId, composeParent, placedCards, setActive]);

  /*
   * THE FORM TAKES FOCUS AS SOON AS IT IS LAID OUT, which is the same promise
   * the effect above makes for a node and for the same reason.
   *
   * A CARD THE LAYOUT HAS NOT PLACED IS DRAWN HIDDEN, and `focus()` on
   * anything inside an invisible element does nothing at all: the call returns
   * having moved nothing, silently. The ghost is unplaced on the tick it first
   * renders, so a single attempt made then is an attempt that cannot land, and
   * `visibility` INHERITS, so the form itself carries no style of its own to
   * say why. With the chart's motion on the entrance produced further commits
   * and one of them landed it; asked for less motion there were none, and the
   * form opened with the cursor on the node behind it and Escape reaching
   * nothing. A frame boundary does not help either, because a frame does not
   * change an inherited value and fires before the layout effect that places
   * the card.
   *
   * So it is retried from an effect with NO dependency array, which runs after
   * every layout, and it lands on the first one where the card is placed. In
   * both motion modes.
   *
   * THE FIRST CONTROL IN IT, and the ghost itself where the caller has drawn
   * something with none: a form that opened without taking focus is a form a
   * keyboard reader has to hunt for, in a chart whose own tab stop is
   * somewhere else entirely. A form already holding focus is left alone, so
   * nothing fights a reader who has moved within it.
   */
  useLayoutEffect(() => {
    if (!takeFocus.current) return;
    const ghost = composeEl.current;
    if (!ghost) {
      takeFocus.current = false;
      return;
    }
    /*
     * THE FIRST CONTROL IN THE BOX, and the ghost itself where the caller drew
     * something with none.
     *
     * NOT WHATEVER THE FORM ASKED FOR, because by here there is nothing left
     * of the request. A form says which field a reader came to fill in with
     * `autoFocus`; React acts on that by calling `focus()` at mount and drops
     * the attribute, and the card is still unplaced and therefore hidden at
     * mount, so the call does nothing and the intent is gone. A caller that
     * needs a particular field focuses it from its own effect once the form is
     * on screen, and this leaves it there.
     */
    (focusables(ghost)[0] ?? ghost).focus({ preventScroll: true });
    /*
     * AND IT IS ASKED AGAIN UNTIL IT LANDS. The request is spent only by
     * succeeding, because the commit on which the LAYOUT first holds the card
     * is not always the commit on which the DOM does: measured in a browser,
     * the attempt made there returned having moved nothing and the next commit
     * was the one that worked. jsdom commits the two together, so this line is
     * guarded by the browser rather than by the suite; the case below covers
     * everything about the request that jsdom can see.
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
     * ESCAPE LEAVES THE COMPOSITION, from anywhere in the chart rather than
     * only from inside the ghost. A node being composed is a MODE the chart is
     * in, and Escape is how a reader leaves a mode; the form's own handler
     * covers the reader who is typing in it, and this covers the one whose
     * focus is on a node behind it, which is where a press on the control that
     * opened the composition can leave it.
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

  const card: TreeCardContext = {
    item: (id) => ({
      role: 'treeitem',
      tabIndex: id === active ? 0 : -1,
      'aria-level': treeLevel(model, id),
      'aria-setsize': treeSetSize(model, id),
      'aria-posinset': treePosInSet(model, id),
      'aria-expanded': treeExpandable(model, id) ? expanded.has(id) : undefined,
      'aria-selected': id === selectedId,
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
   * HOW FAR THE ZOOM GOES IS A FACT ABOUT THE CHART, so the ghost is not in
   * it: it is wider than any node (it holds a form), it is there for as long
   * as one add takes, and counted it would quietly lower the ceiling of a
   * chart the reader goes on using afterwards.
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
         * A CHART'S OWN CORNER IS THE TOP RIGHT, and the `node` appearance is
         * drawn to a chart that puts its toolbar there. A chart of panels
         * keeps the canvas's own default, where the content is read downward
         * and the bottom right is the corner a reader has already left.
         */
        controlsPlacement={controlsPlacement ?? (appearance === 'node' ? 'top-right' : undefined)}
        controlsExtra={controlsExtra}
        controlsBelow={controlsBelow}
        hint={hint}
        dimmed={dimmed}
        /*
         * HOW FAR IN THE ZOOM GOES is the widest card: a reader pressing Zoom
         * in is asking to look at ONE node, and this component is the only
         * thing that knows how wide one is, because it measured them.
         */
        largestItemWidth={widestCard}
        labels={labels}
      >
        <div className="crewlet-tree-canvas__gap" ref={measure(GAP_PROBE)} aria-hidden="true" />
        <div className="crewlet-tree-canvas__margin" ref={measure(MARGIN_PROBE)} aria-hidden="true" />
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
                // THE BRANCH INTO THE GHOST IS A GHOST BRANCH: dashed, and
                // drawn in before the card it arrives at. It is the same path
                // shape every other branch takes, from the same arithmetic, so
                // what is being proposed is drawn in the chart's own language.
                data-composing={link.id === composeId ? 'true' : undefined}
                data-enter={
                  arrived === null ? undefined : arrived.has(link.id) ? 'shown' : 'waiting'
                }
              />
            ))}
          </svg>
        )}
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
                  className={cx(
                    'crewlet-tree-canvas__card',
                    cardOutline?.(id) && 'crewlet-tree-canvas__card--outline',
                  )}
                  data-tone={cardTone?.(id)}
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
          OUTSIDE THE TREE, IN THE SAME WORLD. A `tree` holds `treeitem`s and
          groups of them; the ghost holds a form. Drawn as a sibling it is
          placed by the same layout, travels with the same transform and is
          measured by the same observer, while what is inside it is an ordinary
          part of the page rather than something a screen reader has to make
          sense of as a tree item. It takes the tab stop a form needs, and it
          is the one card in the chart that does.
        */}
        {composing !== null && (
          /* THE REGION LISTENS; IT IS NOT A CONTROL. Escape belongs to the
             whole form rather than to whichever field the reader happened to
             be in, so one handler on the boundary catches it from all of them,
             which is the same arrangement the tree above makes for its items.
             It takes no tab stop of its own: the -1 is there so focus can be
             PUT on it before the form has drawn a control. */
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
             * DRAWN where the chart is drawing this frame, exactly as every
             * other card, and AT ITS TARGET the moment the layout knows one.
             *
             * The frame being drawn is a commit behind the layout while a
             * relayout travels, and a ghost is a card that was not there
             * before, so for that one commit it had no drawn position and was
             * hidden. That is also the commit the form is focused on: a hidden
             * subtree holds nothing focusable, so focus fell back to the
             * ghost's own box and a reader arrived at a form with the cursor
             * nowhere. A new card is not tweened anyway (`motion.ts`), so its
             * target is where it belongs from the first frame.
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
 * What hangs under a card, in the strip the layout measures along with it.
 *
 * A COMPONENT RATHER THAN A CALL INLINE, so that a card whose caller returns
 * nothing draws no strip at all and reserves no room for one. Drawn
 * unconditionally, every leaf of the chart would carry an empty band and the
 * ranks would stand a strip apart for a control none of them has.
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

/** How far down `el` sits inside `container`, in layout pixels. */
function offsetWithin(el: HTMLElement, container: HTMLElement): number {
  let top = 0;
  for (let at: HTMLElement | null = el; at && at !== container; at = at.offsetParent as HTMLElement | null) {
    top += at.offsetTop;
  }
  return top;
}
